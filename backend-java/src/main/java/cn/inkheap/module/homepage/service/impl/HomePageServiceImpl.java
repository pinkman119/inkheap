package cn.inkheap.module.homepage.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.common.util.SvgSanitizer;
import cn.inkheap.module.homepage.entity.HomePage;
import cn.inkheap.module.homepage.mapper.HomePageMapper;
import cn.inkheap.module.homepage.model.dto.UpdateHomePageRequest;
import cn.inkheap.module.homepage.model.vo.HomePageVO;
import cn.inkheap.module.homepage.service.HomePageService;
import cn.inkheap.module.upload.service.UploadService;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class HomePageServiceImpl extends ServiceImpl<HomePageMapper, HomePage> implements HomePageService {

    private static final String HOME_ID = "home";

    private static final int LABEL_MAX = 60;

    private static final int URL_MAX = 500;

    private static final int SOCIAL_MAX = 12;

    /** 与前端 footer-icons.js 保持一致的预设图标 key */
    private static final Set<String> ICON_KEYS = Set.of(
            "github", "yuque", "twitter", "mail", "send", "message", "at", "phone", "rss",
            "link", "globe", "book", "code", "edit", "image", "camera", "video", "music",
            "star", "heart");

    private static final List<Map<String, Object>> DEFAULT_SOCIAL_LINKS = List.of(
            socialLink("yuque", "https://www.yuque.com", "yuque"),
            socialLink("github", "https://github.com", "github"));

    @Resource
    private UploadService uploadService;

    @Override
    public HomePageVO findOne() {
        // 1、查询单例记录
        HomePage record = this.getById(HOME_ID);

        // 2、无记录时返回默认占位，保证前台不崩
        if (record == null) {
            return HomePageVO.builder()
                    .id(HOME_ID)
                    .siteName("INKHEAP")
                    .personTitle("")
                    .codeContent("")
                    .workPersonTitle("")
                    .workCodeContent("")
                    .lifePersonTitle("")
                    .lifeCodeContent("")
                    .socialLinks(DEFAULT_SOCIAL_LINKS)
                    .build();
        }

        return getVo(record);
    }

    @Override
    public HomePageVO update(UpdateHomePageRequest request) {
        // 1、读取现有记录
        HomePage existing = this.getById(HOME_ID);
        String socialLinksJson = request.getSocialLinks() == null
                ? null
                : JsonUtils.toJson(normalizeSocialLinks(request.getSocialLinks()));

        // 2、头像被替换/移除时清理旧文件
        if (existing != null && request.getAvatar() != null
                && !StrUtil.equals(request.getAvatar(), existing.getAvatar())) {
            uploadService.removeByUrl(existing.getAvatar());
        }

        // 3、无记录则创建，有记录则只更新非空字段
        if (existing == null) {
            HomePage created = HomePage.builder()
                    .id(HOME_ID)
                    .siteName(request.getSiteName() == null ? "INKHEAP" : request.getSiteName())
                    .personTitle(request.getPersonTitle() == null ? "" : request.getPersonTitle())
                    .codeContent(request.getCodeContent() == null ? "" : request.getCodeContent())
                    .workPersonTitle(request.getWorkPersonTitle() == null ? "" : request.getWorkPersonTitle())
                    .workCodeContent(request.getWorkCodeContent() == null ? "" : request.getWorkCodeContent())
                    .lifePersonTitle(request.getLifePersonTitle() == null ? "" : request.getLifePersonTitle())
                    .lifeCodeContent(request.getLifeCodeContent() == null ? "" : request.getLifeCodeContent())
                    .avatar(request.getAvatar())
                    .socialLinks(socialLinksJson == null ? JsonUtils.toJson(DEFAULT_SOCIAL_LINKS) : socialLinksJson)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            this.save(created);
            return getVo(created);
        }

        HomePage update = HomePage.builder()
                .id(HOME_ID)
                .siteName(request.getSiteName())
                .personTitle(request.getPersonTitle())
                .codeContent(request.getCodeContent())
                .workPersonTitle(request.getWorkPersonTitle())
                .workCodeContent(request.getWorkCodeContent())
                .lifePersonTitle(request.getLifePersonTitle())
                .lifeCodeContent(request.getLifeCodeContent())
                .avatar(request.getAvatar())
                .socialLinks(socialLinksJson)
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);

        return findOne();
    }

    @Override
    public HomePageVO getVo(HomePage entity) {
        HomePageVO vo = new HomePageVO();
        BeanUtil.copyProperties(entity, vo, "socialLinks");
        vo.setSocialLinks(parseSocialLinks(entity.getSocialLinks()));
        return vo;
    }

    @Override
    public List<HomePageVO> getVoList(List<HomePage> entities) {
        List<HomePageVO> list = new ArrayList<>();
        for (HomePage entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    private List<Map<String, Object>> parseSocialLinks(String raw) {
        List<Map<String, Object>> parsed = JsonUtils.parseMapList(raw);
        if (parsed.isEmpty()) {
            return new ArrayList<>();
        }
        return normalizeSocialLinks(parsed);
    }

    private List<Map<String, Object>> normalizeSocialLinks(List<Map<String, Object>> source) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> item : source) {
            if (item == null) {
                continue;
            }
            String label = StrUtil.nullToEmpty(StrUtil.toStringOrNull(item.get("label")));
            String url = StrUtil.nullToEmpty(StrUtil.toStringOrNull(item.get("url")));
            if (label.isEmpty() && url.isEmpty()) {
                continue;
            }
            String icon = StrUtil.nullToEmpty(StrUtil.toStringOrNull(item.get("icon")));
            String svg = SvgSanitizer.sanitize(StrUtil.toStringOrNull(item.get("svg")));
            Map<String, Object> link = new LinkedHashMap<>();
            link.put("label", StrUtil.maxLength(label.trim(), LABEL_MAX - 1));
            link.put("url", StrUtil.maxLength(url.trim(), URL_MAX - 1));
            link.put("icon", ICON_KEYS.contains(icon) ? icon : "");
            link.put("svg", svg == null ? "" : svg);
            result.add(link);
            if (result.size() >= SOCIAL_MAX) {
                break;
            }
        }
        return result;
    }

    private static Map<String, Object> socialLink(String label, String url, String icon) {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("label", label);
        link.put("url", url);
        link.put("icon", icon);
        link.put("svg", "");
        return link;
    }
}
