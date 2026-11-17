package cn.inkheap.module.friendlink.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.module.friendlink.entity.FriendApplication;
import cn.inkheap.module.friendlink.entity.FriendLink;
import cn.inkheap.module.friendlink.mapper.FriendApplicationMapper;
import cn.inkheap.module.friendlink.mapper.FriendLinkMapper;
import cn.inkheap.module.friendlink.model.dto.ApproveFriendApplicationRequest;
import cn.inkheap.module.friendlink.model.dto.FriendApplicationCreateRequest;
import cn.inkheap.module.friendlink.model.dto.FriendLinkQueryRequest;
import cn.inkheap.module.friendlink.model.dto.FriendLinkRequest;
import cn.inkheap.module.friendlink.service.FriendLinkService;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FriendLinkServiceImpl extends ServiceImpl<FriendLinkMapper, FriendLink> implements FriendLinkService {

    private static final int MODE_ALL = 0;

    private static final int MODE_WORK = 1;

    private static final int MODE_LIFE = 2;

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> FRIEND_LINK_SORT_FIELDS =
            Set.of("sortOrder", "createdAt", "updatedAt", "name");

    /** 空结果哨兵：条件必然不成立时使用，避免拼出 IN () 语法错误 */
    private static final String NONE_VALUE = "__none__";

    private final FriendApplicationMapper applicationMapper;

    @Override
    public List<FriendLink> findAll(FriendLinkQueryRequest request) {
        // 1、查询条件统一由 getQueryWrapper 构建
        return this.list(getQueryWrapper(request));
    }

    @Override
    public QueryWrapper getQueryWrapper(FriendLinkQueryRequest request) {
        // 1、主键 + 状态筛选（all 不过滤）
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(FriendLink::getId, request.getId(), StrUtil.isNotBlank(request.getId()));
        if (StrUtil.isNotBlank(request.getStatus()) && !"all".equals(request.getStatus())) {
            wrapper.eq(FriendLink::getStatus, request.getStatus());
        }

        // 2、模式：work → 0/1，life → 0/2，数字则精确匹配，all 不过滤
        String mode = request.getMode();
        if (StrUtil.isNotBlank(mode) && !"all".equals(mode)) {
            if ("work".equals(mode)) {
                wrapper.in(FriendLink::getMode, List.of(MODE_ALL, MODE_WORK));
            } else if ("life".equals(mode)) {
                wrapper.in(FriendLink::getMode, List.of(MODE_ALL, MODE_LIFE));
            } else if (mode.matches("\\d+")) {
                wrapper.eq(FriendLink::getMode, Integer.parseInt(mode));
            }
        }

        // 3、关键词：先查出命中的 id 再走 in，避免 OR 条件与外层条件优先级冲突
        if (StrUtil.isNotBlank(request.getKeyword())) {
            List<String> ids = this.getMapper().searchIds("%" + request.getKeyword().trim() + "%");
            wrapper.in(FriendLink::getId, ids.isEmpty() ? List.of(NONE_VALUE) : ids);
        }

        // 4、排序：sortField 命中白名单时按其排序，否则 sortOrder + createdAt 升序
        String sortColumn = request.resolveSortColumn(FRIEND_LINK_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(FriendLink::getSortOrder, true).orderBy(FriendLink::getCreatedAt, true);
        }
        return wrapper;
    }

    @Override
    public FriendLink findOne(String id) {
        FriendLink link = this.getById(id);
        if (link == null) {
            throw BusinessException.notFound("友链不存在");
        }
        return link;
    }

    @Override
    public List<FriendLink> findPublic(String mode) {
        // 1、复用统一查询条件：work → 0/1，life → 0/2
        FriendLinkQueryRequest request = new FriendLinkQueryRequest();
        request.setMode(StrUtil.blankToDefault(mode, "all"));
        return this.list(getQueryWrapper(request));
    }

    @Override
    public FriendLink create(FriendLinkRequest request) {
        // 1、sortOrder 未传时取当前最大值 + 1
        Integer sortOrder = request.getSortOrder();
        if (sortOrder == null) {
            FriendLink last = this.getOne(QueryWrapper.create()
                    .orderBy(FriendLink::getSortOrder, false).limit(1));
            sortOrder = (last == null || last.getSortOrder() == null ? -1 : last.getSortOrder()) + 1;
        }

        // 2、构建实体并入库（Builder 一次性构造）
        FriendLink link = FriendLink.builder()
                .id(IdUtil.randomUUID())
                .name(request.getName())
                .url(request.getUrl())
                .avatar(StrUtil.emptyToNull(request.getAvatar()))
                .desc(StrUtil.emptyToNull(request.getDesc()))
                .tag(StrUtil.emptyToNull(request.getTag()))
                .group(StrUtil.emptyToNull(request.getGroup()))
                .message(StrUtil.emptyToNull(request.getMessage()))
                .mode(request.getMode() == null ? MODE_ALL : request.getMode())
                .status(StrUtil.isBlank(request.getStatus()) ? "active" : request.getStatus())
                .isSelf(request.getIsSelf() != null && request.getIsSelf())
                .applicationId(StrUtil.emptyToNull(request.getApplicationId()))
                .sortOrder(sortOrder)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        this.save(link);

        return link;
    }

    @Override
    public FriendLink update(String id, FriendLinkRequest request) {
        // 1、确认存在并取出原值
        FriendLink existing = findOne(id);

        // 2、逐个字段覆盖（空字符串表示清空可选字段）
        FriendLink update = new FriendLink();
        update.setId(id);
        update.setName(request.getName());
        update.setUrl(request.getUrl());
        if (request.getAvatar() != null) {
            update.setAvatar(StrUtil.emptyToNull(request.getAvatar()));
        }
        if (request.getDesc() != null) {
            update.setDesc(StrUtil.emptyToNull(request.getDesc()));
        }
        if (request.getTag() != null) {
            update.setTag(StrUtil.emptyToNull(request.getTag()));
        }
        if (request.getGroup() != null) {
            update.setGroup(StrUtil.emptyToNull(request.getGroup()));
        }
        if (request.getMessage() != null) {
            update.setMessage(StrUtil.emptyToNull(request.getMessage()));
        }
        update.setMode(request.getMode());
        update.setStatus(request.getStatus());
        update.setIsSelf(request.getIsSelf());
        update.setSortOrder(request.getSortOrder());
        update.setUpdatedAt(Instant.now());
        this.updateById(update, false);

        return findOne(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> remove(String id) {
        // 1、确认存在
        FriendLink link = findOne(id);

        // 2、删除友链
        this.removeById(id);

        // 3、来源申请退回待审核，允许重新通过
        if (StrUtil.isNotBlank(link.getApplicationId())) {
            FriendApplication application = FriendApplication.builder()
                    .id(link.getApplicationId())
                    .status("pending")
                    .linkId(null)
                    .handledAt(null)
                    .updatedAt(Instant.now())
                    .build();
            applicationMapper.update(application, false);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "删除成功");
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FriendLink move(String id, String direction) {
        // 1、取当前记录与相邻记录
        FriendLink current = findOne(id);
        boolean up = "up".equals(direction);
        QueryWrapper siblingWrapper = QueryWrapper.create()
                .ne(FriendLink::getId, current.getId())
                .orderBy(FriendLink::getSortOrder, !up)
                .limit(1);
        if (up) {
            siblingWrapper.lt(FriendLink::getSortOrder, current.getSortOrder());
        } else {
            siblingWrapper.gt(FriendLink::getSortOrder, current.getSortOrder());
        }
        FriendLink sibling = this.getOne(siblingWrapper);
        if (sibling == null) {
            throw BusinessException.badRequest(up ? "已经是最前面了" : "已经是最后面了");
        }

        // 2、交换 sortOrder
        FriendLink updateCurrent = FriendLink.builder()
                .id(current.getId())
                .sortOrder(sibling.getSortOrder())
                .updatedAt(Instant.now())
                .build();
        this.updateById(updateCurrent);

        FriendLink updateSibling = FriendLink.builder()
                .id(sibling.getId())
                .sortOrder(current.getSortOrder())
                .updatedAt(Instant.now())
                .build();
        this.updateById(updateSibling);

        return findOne(current.getId());
    }

    @Override
    public FriendApplication apply(FriendApplicationCreateRequest request) {
        FriendApplication application = FriendApplication.builder()
                .id(IdUtil.randomUUID())
                .name(request.getName())
                .email(request.getEmail())
                .url(request.getUrl())
                .avatar(StrUtil.emptyToNull(request.getAvatar()))
                .type(StrUtil.isBlank(request.getType()) ? "其他" : request.getType())
                .message(StrUtil.emptyToNull(request.getMessage()))
                .status("pending")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        applicationMapper.insert(application);
        return application;
    }

    @Override
    public List<Map<String, Object>> findPublicApplications() {
        // 1、只返回公开字段（邮箱、备注不外泄）
        List<FriendApplication> applications = applicationMapper.selectListByQuery(
                QueryWrapper.create().orderBy(FriendApplication::getCreatedAt, false));
        List<Map<String, Object>> result = new ArrayList<>(applications.size());
        for (FriendApplication application : applications) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", application.getId());
            item.put("name", application.getName());
            item.put("url", application.getUrl());
            item.put("avatar", application.getAvatar());
            item.put("type", application.getType());
            item.put("message", application.getMessage());
            item.put("status", application.getStatus());
            item.put("linkId", application.getLinkId());
            item.put("createdAt", application.getCreatedAt());
            result.add(item);
        }
        return result;
    }

    @Override
    public List<FriendApplication> findApplications(String keyword, String status) {
        QueryWrapper wrapper = QueryWrapper.create().orderBy(FriendApplication::getCreatedAt, false);
        if (StrUtil.isNotBlank(status) && !"all".equals(status)) {
            wrapper.eq(FriendApplication::getStatus, status);
        }
        if (StrUtil.isNotBlank(keyword)) {
            List<String> ids = applicationMapper.searchIds("%" + keyword.trim() + "%");
            if (ids.isEmpty()) {
                return new ArrayList<>();
            }
            wrapper.in(FriendApplication::getId, ids);
        }
        return applicationMapper.selectListByQuery(wrapper);
    }

    @Override
    public FriendApplication findApplication(String id) {
        FriendApplication application = applicationMapper.selectOneById(id);
        if (application == null) {
            throw BusinessException.notFound("申请不存在");
        }
        return application;
    }

    @Override
    public Map<String, Long> applicationStats() {
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("total", applicationMapper.selectCountByQuery(QueryWrapper.create()));
        result.put("pending", applicationMapper.selectCountByQuery(
                QueryWrapper.create().eq(FriendApplication::getStatus, "pending")));
        result.put("approved", applicationMapper.selectCountByQuery(
                QueryWrapper.create().eq(FriendApplication::getStatus, "approved")));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FriendApplication approve(String id, ApproveFriendApplicationRequest request) {
        // 1、读取申请
        FriendApplication application = findApplication(id);
        ApproveFriendApplicationRequest dto = request == null ? new ApproveFriendApplicationRequest() : request;

        // 2、sortOrder 未指定时追加到末尾
        Integer sortOrder = dto.getSortOrder();
        if (sortOrder == null) {
            FriendLink last = this.getOne(QueryWrapper.create()
                    .orderBy(FriendLink::getSortOrder, false).limit(1));
            sortOrder = (last == null || last.getSortOrder() == null ? -1 : last.getSortOrder()) + 1;
        }

        // 3、申请置为已通过
        FriendApplication updateApplication = FriendApplication.builder()
                .id(application.getId())
                .status("approved")
                .handledAt(Instant.now())
                .remark("")
                .updatedAt(Instant.now())
                .build();
        applicationMapper.update(updateApplication, false);

        // 4、按 applicationId upsert 友链（保证同一申请不重复建链）
        FriendLink existing = this.getOne(QueryWrapper.create()
                .eq(FriendLink::getApplicationId, application.getId()).limit(1));
        FriendLink link = new FriendLink();
        link.setName(StrUtil.isNotBlank(dto.getName()) ? dto.getName() : application.getName());
        link.setUrl(StrUtil.isNotBlank(dto.getUrl()) ? dto.getUrl() : application.getUrl());
        link.setAvatar(StrUtil.isNotBlank(dto.getAvatar()) ? dto.getAvatar()
                : StrUtil.emptyToNull(application.getAvatar()));
        link.setDesc(StrUtil.emptyToNull(dto.getDesc()));
        link.setTag(StrUtil.isNotBlank(dto.getTag()) ? dto.getTag()
                : StrUtil.emptyToNull(application.getType()));
        link.setGroup(StrUtil.isNotBlank(dto.getGroup()) ? dto.getGroup()
                : StrUtil.emptyToNull(application.getType()));
        link.setMessage(StrUtil.emptyToNull(application.getMessage()));
        link.setMode(dto.getMode() == null ? MODE_ALL : dto.getMode());
        link.setStatus("active");
        link.setSortOrder(sortOrder);
        link.setUpdatedAt(Instant.now());

        if (existing == null) {
            link.setId(IdUtil.randomUUID());
            link.setApplicationId(application.getId());
            link.setIsSelf(false);
            link.setCreatedAt(Instant.now());
            this.save(link);
        } else {
            link.setId(existing.getId());
            this.updateById(link, false);
        }

        // 5、回写 linkId
        FriendApplication writeBack = FriendApplication.builder()
                .id(application.getId())
                .linkId(link.getId())
                .updatedAt(Instant.now())
                .build();
        applicationMapper.update(writeBack);

        return findApplication(application.getId());
    }

    @Override
    public FriendApplication reject(String id, String remark) {
        // 1、确认存在
        findApplication(id);

        // 2、置为已拒绝并记录原因
        FriendApplication update = FriendApplication.builder()
                .id(id)
                .status("rejected")
                .remark(StrUtil.emptyToNull(remark))
                .handledAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        applicationMapper.update(update, false);

        return findApplication(id);
    }

    @Override
    public Map<String, Object> removeApplication(String id) {
        // 1、确认存在
        findApplication(id);

        // 2、删除
        applicationMapper.deleteById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "删除成功");
        return result;
    }
}
