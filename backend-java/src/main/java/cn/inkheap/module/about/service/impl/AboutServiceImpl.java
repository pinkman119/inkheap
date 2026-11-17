package cn.inkheap.module.about.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.TimeUtils;
import cn.inkheap.module.about.entity.AboutEvent;
import cn.inkheap.module.about.entity.AboutFootprint;
import cn.inkheap.module.about.entity.AboutProfile;
import cn.inkheap.module.about.entity.AboutTravel;
import cn.inkheap.module.about.mapper.AboutEventMapper;
import cn.inkheap.module.about.mapper.AboutFootprintMapper;
import cn.inkheap.module.about.mapper.AboutProfileMapper;
import cn.inkheap.module.about.mapper.AboutTravelMapper;
import cn.inkheap.module.about.model.dto.EventRequest;
import cn.inkheap.module.about.model.dto.FootprintRequest;
import cn.inkheap.module.about.model.dto.ToggleEventRingRequest;
import cn.inkheap.module.about.model.dto.TravelRequest;
import cn.inkheap.module.about.model.dto.UpdateAboutProfileRequest;
import cn.inkheap.module.about.model.vo.AboutEventVO;
import cn.inkheap.module.about.model.vo.AboutFootprintVO;
import cn.inkheap.module.about.model.vo.BlogBriefVO;
import cn.inkheap.module.about.service.AboutService;
import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.service.TrainingService;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.mapper.BlogMapper;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AboutServiceImpl implements AboutService {

    private static final String PROFILE_ID = "about";

    private final AboutProfileMapper aboutProfileMapper;

    private final AboutFootprintMapper aboutFootprintMapper;

    private final AboutTravelMapper aboutTravelMapper;

    private final AboutEventMapper aboutEventMapper;

    private final BlogMapper blogMapper;

    private final TrainingService trainingService;

    @Override
    public AboutProfile getProfile() {
        // 1、查询单例记录
        AboutProfile profile = aboutProfileMapper.selectOneById(PROFILE_ID);

        // 2、无记录返回默认占位
        if (profile == null) {
            return AboutProfile.builder()
                    .id(PROFILE_ID)
                    .kicker("About Me")
                    .lede("")
                    .evaluationQuote("")
                    .evaluationBy("")
                    .build();
        }
        return profile;
    }

    @Override
    public AboutProfile updateProfile(UpdateAboutProfileRequest request) {
        // 1、读取现有记录
        AboutProfile existing = aboutProfileMapper.selectOneById(PROFILE_ID);

        // 2、不存在则创建
        if (existing == null) {
            AboutProfile created = AboutProfile.builder()
                    .id(PROFILE_ID)
                    .kicker(request.getKicker() == null ? "About Me" : request.getKicker())
                    .lede(request.getLede() == null ? "" : request.getLede())
                    .evaluationQuote(request.getEvaluationQuote() == null ? "" : request.getEvaluationQuote())
                    .evaluationBy(request.getEvaluationBy() == null ? "" : request.getEvaluationBy())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .trainType(0)
                    .build();
            aboutProfileMapper.insert(created);
            return getProfile();
        }

        // 3、仅更新传入字段
        AboutProfile update = AboutProfile.builder()
                .id(PROFILE_ID)
                .kicker(request.getKicker())
                .lede(request.getLede())
                .evaluationQuote(request.getEvaluationQuote())
                .evaluationBy(request.getEvaluationBy())
                .updatedAt(Instant.now())
                .build();
        aboutProfileMapper.update(update);

        // 4、数字生命：已训练资料被编辑 → 删向量
        trainingService.invalidateIfTrained(RefTypes.ABOUT_PROFILE, PROFILE_ID);

        return getProfile();
    }

    @Override
    public List<AboutFootprintVO> findFootprints() {
        // 1、按 sortOrder + createdAt 升序查询足迹
        List<AboutFootprint> footprints = aboutFootprintMapper.selectListByQuery(QueryWrapper.create()
                .orderBy(AboutFootprint::getSortOrder, true)
                .orderBy(AboutFootprint::getCreatedAt, true));

        // 2、批量查绑定的小记，组装 blog{slug,title}
        Set<String> blogIds = new LinkedHashSet<>();
        footprints.forEach(item -> {
            if (StrUtil.isNotBlank(item.getBlogId())) {
                blogIds.add(item.getBlogId());
            }
        });
        Map<String, Blog> blogMap = new HashMap<>();
        if (!blogIds.isEmpty()) {
            List<Blog> blogs = blogMapper.selectListByQuery(QueryWrapper.create()
                    .select(Blog::getId, Blog::getSlug, Blog::getTitle)
                    .in(Blog::getId, blogIds));
            blogs.forEach(blog -> blogMap.put(blog.getId(), blog));
        }

        List<AboutFootprintVO> result = new ArrayList<>(footprints.size());
        for (AboutFootprint footprint : footprints) {
            AboutFootprintVO vo = getVo(footprint);
            Blog blog = footprint.getBlogId() == null ? null : blogMap.get(footprint.getBlogId());
            if (blog != null) {
                vo.setBlog(new BlogBriefVO(blog.getSlug(), blog.getTitle()));
            }
            result.add(vo);
        }
        return result;
    }

    @Override
    public AboutFootprintVO createFootprint(FootprintRequest request) {
        AboutFootprint footprint = AboutFootprint.builder()
                .id(IdUtil.randomUUID())
                .province(request.getProvince())
                .place(request.getPlace())
                .time(request.getTime())
                .location(request.getLocation())
                .elevation(StrUtil.isBlank(request.getElevation()) ? "—" : request.getElevation())
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .trainType(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        aboutFootprintMapper.insert(footprint);
        return getVo(footprint);
    }

    @Override
    public AboutFootprintVO updateFootprint(String id, FootprintRequest request) {
        // 1、确认存在
        AboutFootprint existing = aboutFootprintMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("足迹记录不存在");
        }

        // 2、仅更新传入字段
        AboutFootprint update = AboutFootprint.builder()
                .id(id)
                .province(request.getProvince())
                .place(request.getPlace())
                .time(request.getTime())
                .location(request.getLocation())
                .elevation(request.getElevation())
                .sortOrder(request.getSortOrder())
                .updatedAt(Instant.now())
                .build();
        aboutFootprintMapper.update(update);

        // 3、已绑定小记时同步地点名
        if (StrUtil.isNotBlank(existing.getBlogId()) && request.getPlace() != null) {
            Blog blogUpdate = Blog.builder()
                    .id(existing.getBlogId())
                    .location(request.getPlace())
                    .build();
            blogMapper.update(blogUpdate);
        }

        // 4、数字生命：已训练足迹被编辑 → 删向量
        trainingService.invalidateIfTrained(RefTypes.ABOUT_FOOTPRINT, id);

        return getVo(aboutFootprintMapper.selectOneById(id));
    }

    @Override
    public Map<String, Object> removeFootprint(String id) {
        // 1、确认存在
        AboutFootprint existing = aboutFootprintMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("足迹记录不存在");
        }

        // 2、已绑定小记时清掉地点
        if (StrUtil.isNotBlank(existing.getBlogId())) {
            blogMapper.clearLocation(existing.getBlogId());
        }

        // 3、清向量 + 删记录
        trainingService.invalidateByRef(RefTypes.ABOUT_FOOTPRINT, id);
        aboutFootprintMapper.deleteById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public List<AboutTravel> findTravels() {
        return aboutTravelMapper.selectListByQuery(QueryWrapper.create()
                .orderBy(AboutTravel::getSortOrder, true)
                .orderBy(AboutTravel::getCreatedAt, true));
    }

    @Override
    public AboutTravel createTravel(TravelRequest request) {
        AboutTravel travel = AboutTravel.builder()
                .id(IdUtil.randomUUID())
                .glyph(request.getGlyph())
                .place(request.getPlace())
                .meta(request.getMeta())
                .note(request.getNote())
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .trainType(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        aboutTravelMapper.insert(travel);
        return travel;
    }

    @Override
    public AboutTravel updateTravel(String id, TravelRequest request) {
        // 1、确认存在
        AboutTravel existing = aboutTravelMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("旅行记录不存在");
        }

        // 2、仅更新传入字段
        AboutTravel update = AboutTravel.builder()
                .id(id)
                .glyph(request.getGlyph())
                .place(request.getPlace())
                .meta(request.getMeta())
                .note(request.getNote())
                .sortOrder(request.getSortOrder())
                .updatedAt(Instant.now())
                .build();
        aboutTravelMapper.update(update);

        // 3、数字生命：已训练数据被编辑 → 删向量
        trainingService.invalidateIfTrained(RefTypes.ABOUT_TRAVEL, id);

        return aboutTravelMapper.selectOneById(id);
    }

    @Override
    public Map<String, Object> removeTravel(String id) {
        // 1、确认存在
        AboutTravel existing = aboutTravelMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("旅行记录不存在");
        }

        // 2、清向量 + 删记录
        trainingService.invalidateByRef(RefTypes.ABOUT_TRAVEL, id);
        aboutTravelMapper.deleteById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public List<AboutEventVO> findEvents() {
        List<AboutEvent> events = aboutEventMapper.selectListByQuery(QueryWrapper.create()
                .orderBy(AboutEvent::getSortOrder, true)
                .orderBy(AboutEvent::getDate, true)
                .orderBy(AboutEvent::getCreatedAt, true));
        List<AboutEventVO> result = new ArrayList<>(events.size());
        events.forEach(event -> result.add(getVo(event)));
        return result;
    }

    @Override
    public AboutEventVO createEvent(EventRequest request) {
        AboutEvent event = AboutEvent.builder()
                .id(IdUtil.randomUUID())
                .date(TimeUtils.parseDate(request.getDate()))
                .title(request.getTitle())
                .desc(request.getDesc())
                .isRing(request.getIsRing() != null && request.getIsRing())
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .trainType(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        aboutEventMapper.insert(event);
        return getVo(event);
    }

    @Override
    public AboutEventVO updateEvent(String id, EventRequest request) {
        // 1、确认存在
        AboutEvent existing = aboutEventMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("事件记录不存在");
        }

        // 2、仅更新传入字段
        AboutEvent update = AboutEvent.builder()
                .id(id)
                .date(request.getDate() == null ? null : TimeUtils.parseDate(request.getDate()))
                .title(request.getTitle())
                .desc(request.getDesc())
                .isRing(request.getIsRing())
                .sortOrder(request.getSortOrder())
                .updatedAt(Instant.now())
                .build();
        aboutEventMapper.update(update);

        // 3、数字生命：已训练数据被编辑 → 删向量
        trainingService.invalidateIfTrained(RefTypes.ABOUT_EVENT, id);

        return getVo(aboutEventMapper.selectOneById(id));
    }

    @Override
    public AboutEventVO toggleEventRing(String id, ToggleEventRingRequest request) {
        // 1、确认存在
        AboutEvent existing = aboutEventMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("事件记录不存在");
        }

        // 2、仅切换 isRing（不改正文，不触发训练失效）
        AboutEvent update = AboutEvent.builder()
                .id(id)
                .isRing(request.getIsRing())
                .updatedAt(Instant.now())
                .build();
        aboutEventMapper.update(update);

        return getVo(aboutEventMapper.selectOneById(id));
    }

    @Override
    public Map<String, Object> removeEvent(String id) {
        // 1、确认存在
        AboutEvent existing = aboutEventMapper.selectOneById(id);
        if (existing == null) {
            throw BusinessException.notFound("事件记录不存在");
        }

        // 2、清向量 + 删记录
        trainingService.invalidateByRef(RefTypes.ABOUT_EVENT, id);
        aboutEventMapper.deleteById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public AboutFootprintVO getVo(AboutFootprint entity) {
        if (entity == null) {
            return null;
        }
        AboutFootprintVO vo = new AboutFootprintVO();
        BeanUtil.copyProperties(entity, vo, "blog");
        return vo;
    }

    @Override
    public List<AboutFootprintVO> getVoList(List<AboutFootprint> entities) {
        List<AboutFootprintVO> list = new ArrayList<>();
        for (AboutFootprint entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public AboutEventVO getVo(AboutEvent entity) {
        if (entity == null) {
            return null;
        }
        AboutEventVO vo = new AboutEventVO();
        BeanUtil.copyProperties(entity, vo, "date");
        vo.setDate(TimeUtils.formatDate(entity.getDate()));
        return vo;
    }
}
