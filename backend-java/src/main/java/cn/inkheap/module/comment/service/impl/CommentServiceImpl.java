package cn.inkheap.module.comment.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.comment.entity.Comment;
import cn.inkheap.module.comment.mapper.CommentMapper;
import cn.inkheap.module.comment.model.dto.CommentQueryRequest;
import cn.inkheap.module.comment.model.dto.CreateCommentRequest;
import cn.inkheap.module.comment.model.vo.AdminCommentVO;
import cn.inkheap.module.comment.model.vo.CommentAuthorVO;
import cn.inkheap.module.comment.model.vo.CommentItemVO;
import cn.inkheap.module.comment.service.CommentService;
import cn.inkheap.module.emailauth.entity.EmailUser;
import cn.inkheap.module.emailauth.mapper.EmailUserMapper;
import cn.inkheap.module.mail.service.MailService;
import cn.inkheap.module.siteconfig.service.SiteConfigService;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.mapper.BlogMapper;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    /** 邻居留言板的固定评论目标 ID（页面级唯一留言板，无数据库实体） */
    private static final String FRIENDS_BOARD_TARGET_ID = "00000000-0000-4000-8000-0000000000fd";

    private static final long SUBMIT_WINDOW_MS = 60 * 1000L;

    private static final int SUBMIT_LIMIT = 5;

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> COMMENT_SORT_FIELDS = Set.of("createdAt");

    private final CommentMapper commentMapper;

    private final EmailUserMapper emailUserMapper;

    private final ArticleMapper articleMapper;

    private final BlogMapper blogMapper;

    private final MailService mailService;

    private final SiteConfigService siteConfigService;

    @jakarta.annotation.Resource
    @org.springframework.beans.factory.annotation.Qualifier("inkheapExecutor")
    private org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor executor;

    /** 发表频率限制：userId -> 最近一分钟内的提交时间戳 */
    private final Map<String, List<Long>> submitLog = new ConcurrentHashMap<>();

    @Override
    public PageVO<CommentItemVO> list(CommentQueryRequest request) {
        int current = request.pageOrDefault();
        int size = Math.min(50, request.pageSizeOrDefault());

        // 1、查顶层评论（倒序），条件统一由 getQueryWrapper 构建
        request.setTopLevel(true);
        Page<Comment> topPage = commentMapper.paginate(current, size, getQueryWrapper(request));

        if (topPage.getRecords().isEmpty()) {
            return PageVO.ofNoTotalPages(new ArrayList<>(), topPage.getTotalRow(), current, size);
        }

        // 2、批量取这些顶层下的全部回复（正序）
        List<String> topIds = topPage.getRecords().stream().map(Comment::getId).toList();
        List<Comment> replies = commentMapper.selectListByQuery(QueryWrapper.create()
                .in(Comment::getParentId, topIds)
                .orderBy(Comment::getCreatedAt, true));

        // 3、组装两层结构
        return PageVO.ofNoTotalPages(assemble(topPage.getRecords(), replies),
                topPage.getTotalRow(), current, size);
    }

    @Override
    public CommentItemVO create(String userId, CreateCommentRequest request, String baseUrl) {
        // 1、内容校验 + 频率限制（每用户每分钟 5 条）
        String content = StrUtil.trim(request.getContent());
        if (StrUtil.isBlank(content)) {
            throw BusinessException.badRequest("评论内容不能为空");
        }
        checkSubmitLimit(userId);

        // 2、校验评论目标存在且已发布
        ensureTarget(request.getTargetType(), request.getTargetId());

        // 3、解析父评论与被回复人
        String parentId = null;
        String replyToUserId = null;
        Comment replied = null;
        if (StrUtil.isNotBlank(request.getParentId())) {
            Comment parent = commentMapper.selectOneById(request.getParentId());
            if (parent == null) {
                throw BusinessException.badRequest("父评论不存在");
            }
            // 一层盖楼：父评论必须是顶层
            if (parent.getParentId() != null) {
                throw BusinessException.badRequest("不支持多层回复");
            }
            if (!StrUtil.equals(parent.getTargetType(), request.getTargetType())
                    || !StrUtil.equals(parent.getTargetId(), request.getTargetId())) {
                throw BusinessException.badRequest("父评论与评论目标不一致");
            }
            parentId = parent.getId();
            replied = parent;

            if (StrUtil.isNotBlank(request.getReplyToId()) && !request.getReplyToId().equals(parent.getId())) {
                Comment target = commentMapper.selectOneById(request.getReplyToId());
                if (target == null
                        || !StrUtil.equals(target.getTargetType(), request.getTargetType())
                        || !StrUtil.equals(target.getTargetId(), request.getTargetId())
                        || (target.getParentId() != null && !target.getParentId().equals(parent.getId()))) {
                    throw BusinessException.badRequest("被回复评论不合法");
                }
                replied = target;
            }
            replyToUserId = replied.getUserId();
        }

        // 4、构建实体并入库（Builder 一次性构造）
        Comment comment = Comment.builder()
                .id(IdUtil.randomUUID())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .userId(userId)
                .content(content)
                .parentId(parentId)
                .replyToUserId(replyToUserId)
                .createdAt(Instant.now())
                .build();
        commentMapper.insert(comment);

        // 5、组装返回（前端发表后无需二次拉取即可渲染）
        EmailUser author = emailUserMapper.selectOneById(userId);
        CommentItemVO item = CommentItemVO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .author(toAuthor(author, userId))
                .replyToNickname(resolveNickname(replyToUserId))
                .build();

        // 6、回复他人（不含自己）时异步发邮件通知，失败不影响评论结果
        if (StrUtil.isNotBlank(replyToUserId) && !replyToUserId.equals(userId) && replied != null) {
            final String replierNickname = author == null ? "未知用户" : author.getNickname();
            final String originalContent = replied.getContent();
            final String targetUserId = replyToUserId;
            final String finalTargetType = request.getTargetType();
            final String finalTargetId = request.getTargetId();
            final String finalBaseUrl = baseUrl;
            executor.execute(() -> notifyReplyByEmail(replierNickname, content, originalContent,
                    targetUserId, finalTargetType, finalTargetId, finalBaseUrl));
        }
        return item;
    }

    @Override
    public QueryWrapper getQueryWrapper(CommentQueryRequest request) {
        // 1、基础条件：id / 目标 / 用户
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(Comment::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .eq(Comment::getTargetType, request.getTargetType(), StrUtil.isNotBlank(request.getTargetType()))
                .eq(Comment::getTargetId, request.getTargetId(), StrUtil.isNotBlank(request.getTargetId()))
                .eq(Comment::getUserId, request.getUserId(), StrUtil.isNotBlank(request.getUserId()));

        // 2、父子层级：指定 parentId 查回复；topLevel 只查顶层评论
        if (StrUtil.isNotBlank(request.getParentId())) {
            wrapper.eq(Comment::getParentId, request.getParentId());
        } else if (Boolean.TRUE.equals(request.getTopLevel())) {
            wrapper.isNull(Comment::getParentId);
        }

        // 3、排序：sortField 命中白名单时按其排序，否则按创建时间倒序
        String sortColumn = request.resolveSortColumn(COMMENT_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(Comment::getCreatedAt, false);
        }
        return wrapper;
    }

    @Override
    public PageVO<AdminCommentVO> adminList(CommentQueryRequest request) {
        int current = request.pageOrDefault();
        int size = Math.min(100, request.pageSizeOrDefault());

        // 1、条件筛选 + 分页（统一走 getQueryWrapper）
        Page<Comment> result = commentMapper.paginate(current, size, getQueryWrapper(request));
        List<Comment> comments = result.getRecords();
        if (comments.isEmpty()) {
            return PageVO.ofNoTotalPages(new ArrayList<>(), result.getTotalRow(), current, size);
        }

        // 2、批量解析评论人与来源
        Set<String> userIds = new LinkedHashSet<>();
        comments.forEach(comment -> userIds.add(comment.getUserId()));
        Map<String, EmailUser> userMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            emailUserMapper.selectListByQuery(QueryWrapper.create().in(EmailUser::getId, userIds))
                    .forEach(user -> userMap.put(user.getId(), user));
        }
        Map<String, String[]> sourceMap = resolveSources(comments);

        // 3、组装列表项
        List<AdminCommentVO> items = new ArrayList<>(comments.size());
        for (Comment comment : comments) {
            // 1、来源信息与评论人信息
            String[] source = "friends".equals(comment.getTargetType())
                    ? new String[]{"邻居留言板", "friends"}
                    : sourceMap.get(comment.getTargetType() + ":" + comment.getTargetId());
            EmailUser user = userMap.get(comment.getUserId());

            // 2、构建列表项
            items.add(AdminCommentVO.builder()
                    .id(comment.getId())
                    .content(comment.getContent())
                    .targetType(comment.getTargetType())
                    .targetId(comment.getTargetId())
                    .sourceTitle(source == null ? null : source[0])
                    .sourceSlug(source == null ? null : source[1])
                    .nickname(user == null ? "未知用户" : user.getNickname())
                    .email(user == null ? "" : StrUtil.nullToEmpty(user.getEmail()))
                    .avatarUrl(user == null ? null : user.getAvatarUrl())
                    .isReply(comment.getParentId() != null)
                    .replyToUserId(comment.getReplyToUserId())
                    .createdAt(comment.getCreatedAt())
                    .build());
        }
        return PageVO.ofNoTotalPages(items, result.getTotalRow(), current, size);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> adminDelete(String id) {
        // 1、确认评论存在
        Comment comment = commentMapper.selectOneById(id);
        if (comment == null) {
            throw BusinessException.badRequest("评论不存在");
        }

        // 2、顶层评论连带删除全部回复
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deleted", true);
        if (comment.getParentId() == null) {
            int cascaded = commentMapper.deleteByQuery(QueryWrapper.create().eq(Comment::getParentId, id));
            commentMapper.deleteById(id);
            log.info("删除顶层评论 {}（连带 {} 条回复）", id, cascaded);
            result.put("cascaded", cascaded);
            return result;
        }

        // 3、回复评论只删自身
        commentMapper.deleteById(id);
        result.put("cascaded", 0);
        return result;
    }

    private List<CommentItemVO> assemble(List<Comment> tops, List<Comment> replies) {
        // 1、收集所有需要解析的用户 id（评论人 + 被回复人）
        Set<String> userIds = new LinkedHashSet<>();
        tops.forEach(comment -> {
            userIds.add(comment.getUserId());
            if (comment.getReplyToUserId() != null) {
                userIds.add(comment.getReplyToUserId());
            }
        });
        replies.forEach(comment -> {
            userIds.add(comment.getUserId());
            if (comment.getReplyToUserId() != null) {
                userIds.add(comment.getReplyToUserId());
            }
        });
        Map<String, EmailUser> userMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            emailUserMapper.selectListByQuery(QueryWrapper.create().in(EmailUser::getId, userIds))
                    .forEach(user -> userMap.put(user.getId(), user));
        }

        // 2、按父评论分组回复
        Map<String, List<CommentItemVO>> replyMap = new LinkedHashMap<>();
        for (Comment reply : replies) {
            CommentItemVO item = toItem(reply, userMap);
            replyMap.computeIfAbsent(reply.getParentId(), key -> new ArrayList<>()).add(item);
        }

        // 3、组装顶层
        List<CommentItemVO> result = new ArrayList<>(tops.size());
        for (Comment top : tops) {
            CommentItemVO item = toItem(top, userMap);
            item.setReplies(replyMap.getOrDefault(top.getId(), new ArrayList<>()));
            result.add(item);
        }
        return result;
    }

    private CommentItemVO toItem(Comment comment, Map<String, EmailUser> userMap) {
        // 1、被回复人昵称：仅二层评论有
        String replyToNickname = null;
        if (comment.getReplyToUserId() != null) {
            EmailUser replyTo = userMap.get(comment.getReplyToUserId());
            replyToNickname = replyTo == null ? "未知用户" : replyTo.getNickname();
        }

        // 2、构建前台评论项
        return CommentItemVO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .author(toAuthor(userMap.get(comment.getUserId()), comment.getUserId()))
                .replyToNickname(replyToNickname)
                .build();
    }

    private CommentAuthorVO toAuthor(EmailUser user, String fallbackId) {
        if (user == null) {
            return new CommentAuthorVO(fallbackId, "未知用户", null, null);
        }
        return new CommentAuthorVO(user.getId(), user.getNickname(), user.getHomepageUrl(), user.getAvatarUrl());
    }

    private String resolveNickname(String userId) {
        if (StrUtil.isBlank(userId)) {
            return null;
        }
        EmailUser user = emailUserMapper.selectOneById(userId);
        return user == null ? null : user.getNickname();
    }

    private void checkSubmitLimit(String userId) {
        long now = System.currentTimeMillis();
        List<Long> log = submitLog.computeIfAbsent(userId, key -> new ArrayList<>());
        synchronized (log) {
            log.removeIf(timestamp -> now - timestamp >= SUBMIT_WINDOW_MS);
            if (log.size() >= SUBMIT_LIMIT) {
                throw BusinessException.tooManyRequests("评论过于频繁，请稍后再试");
            }
            log.add(now);
        }
    }

    private void ensureTarget(String targetType, String targetId) {
        if ("friends".equals(targetType)) {
            if (!FRIENDS_BOARD_TARGET_ID.equals(targetId)) {
                throw BusinessException.badRequest("评论目标类型不合法");
            }
            return;
        }
        if ("article".equals(targetType)) {
            Article article = articleMapper.selectOneById(targetId);
            if (article == null || !Boolean.TRUE.equals(article.getPublished())) {
                throw BusinessException.badRequest("评论对象不存在或未发布");
            }
            return;
        }
        Blog note = blogMapper.selectOneById(targetId);
        if (note == null || !Boolean.TRUE.equals(note.getPublished())) {
            throw BusinessException.badRequest("评论对象不存在或未发布");
        }
    }

    private Map<String, String[]> resolveSources(List<Comment> comments) {
        Set<String> articleIds = new LinkedHashSet<>();
        Set<String> noteIds = new LinkedHashSet<>();
        comments.forEach(comment -> {
            if ("article".equals(comment.getTargetType())) {
                articleIds.add(comment.getTargetId());
            } else if ("note".equals(comment.getTargetType())) {
                noteIds.add(comment.getTargetId());
            }
        });

        Map<String, String[]> sourceMap = new HashMap<>();
        if (!articleIds.isEmpty()) {
            articleMapper.selectListByQuery(QueryWrapper.create()
                            .select(Article::getId, Article::getTitle, Article::getSlug)
                            .in(Article::getId, articleIds))
                    .forEach(article -> sourceMap.put("article:" + article.getId(),
                            new String[]{article.getTitle(), article.getSlug()}));
        }
        if (!noteIds.isEmpty()) {
            blogMapper.selectListByQuery(QueryWrapper.create()
                            .select(Blog::getId, Blog::getTitle, Blog::getSlug)
                            .in(Blog::getId, noteIds))
                    .forEach(note -> sourceMap.put("note:" + note.getId(),
                            new String[]{note.getTitle(), note.getSlug()}));
        }
        return sourceMap;
    }

    /**
     * 回复通知：失败只记日志，不影响评论流程。
     */
    private void notifyReplyByEmail(String replierNickname, String replyContent, String originalContent,
                                    String replyToUserId, String targetType, String targetId, String baseUrl) {
        try {
            EmailUser recipient = emailUserMapper.selectOneById(replyToUserId);
            if (recipient == null) {
                return;
            }
            String[] page = resolveTargetPage(targetType, targetId, baseUrl);
            if (page == null) {
                return;
            }
            mailService.sendCommentReply(recipient.getEmail(), recipient.getNickname(), replierNickname,
                    originalContent, replyContent, page[0], page[1]);
            log.info("评论回复通知已发送 -> {}", recipient.getEmail());
        } catch (Exception e) {
            log.warn("评论回复通知发送失败（评论流程不受影响）: {}", e.getMessage());
        }
    }

    private String[] resolveTargetPage(String targetType, String targetId, String baseUrl) {
        String site = StrUtil.nullToEmpty(siteConfigService.findOne().getSiteUrl());
        if (site.isEmpty()) {
            site = StrUtil.nullToEmpty(baseUrl);
        }
        site = site.replaceAll("/+$", "");

        if ("friends".equals(targetType)) {
            return new String[]{"邻居留言板", site + "/#/friends"};
        }
        if ("article".equals(targetType)) {
            Article article = articleMapper.selectOneById(targetId);
            if (article == null) {
                return null;
            }
            return new String[]{"知识库《" + article.getTitle() + "》", site + "/#/articles/" + article.getSlug()};
        }
        Blog note = blogMapper.selectOneById(targetId);
        if (note == null) {
            return null;
        }
        return new String[]{"小记《" + note.getTitle() + "》", site + "/#/xiaoji/" + note.getSlug()};
    }
}
