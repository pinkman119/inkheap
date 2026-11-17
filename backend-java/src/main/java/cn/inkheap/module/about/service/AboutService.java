package cn.inkheap.module.about.service;

import cn.inkheap.module.about.entity.AboutEvent;
import cn.inkheap.module.about.entity.AboutFootprint;
import cn.inkheap.module.about.entity.AboutProfile;
import cn.inkheap.module.about.entity.AboutTravel;
import cn.inkheap.module.about.model.dto.EventRequest;
import cn.inkheap.module.about.model.dto.FootprintRequest;
import cn.inkheap.module.about.model.dto.ToggleEventRingRequest;
import cn.inkheap.module.about.model.dto.TravelRequest;
import cn.inkheap.module.about.model.dto.UpdateAboutProfileRequest;
import cn.inkheap.module.about.model.vo.AboutEventVO;
import cn.inkheap.module.about.model.vo.AboutFootprintVO;

import java.util.List;
import java.util.Map;

/**
 * 关于我服务。
 */
public interface AboutService {

    /**
     * 个人资料（无记录时返回默认占位）。
     *
     * @return 资料
     */
    AboutProfile getProfile();

    /**
     * 更新个人资料，并触发训练失效。
     *
     * @param request 请求
     * @return 更新后的资料
     */
    AboutProfile updateProfile(UpdateAboutProfileRequest request);

    /**
     * 足迹列表（LEFT JOIN 小记，返回 blog{slug,title}）。
     *
     * @return 足迹列表
     */
    List<AboutFootprintVO> findFootprints();

    /**
     * 新增足迹（elevation 默认「—」）。
     *
     * @param request 请求
     * @return 新足迹
     */
    AboutFootprintVO createFootprint(FootprintRequest request);

    /**
     * 更新足迹：place 变化且已绑定小记时同步小记 location，并触发训练失效。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的足迹
     */
    AboutFootprintVO updateFootprint(String id, FootprintRequest request);

    /**
     * 删除足迹：已绑定小记时清空其 location，并清除向量。
     *
     * @param id 主键
     * @return 结果
     */
    Map<String, Object> removeFootprint(String id);

    /**
     * 旅行卡片列表。
     *
     * @return 列表
     */
    List<AboutTravel> findTravels();

    /**
     * 新增旅行卡片。
     *
     * @param request 请求
     * @return 新卡片
     */
    AboutTravel createTravel(TravelRequest request);

    /**
     * 更新旅行卡片并触发训练失效。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的卡片
     */
    AboutTravel updateTravel(String id, TravelRequest request);

    /**
     * 删除旅行卡片并清除向量。
     *
     * @param id 主键
     * @return 结果
     */
    Map<String, Object> removeTravel(String id);

    /**
     * 事件列表（date 输出 YYYY-MM-DD）。
     *
     * @return 列表
     */
    List<AboutEventVO> findEvents();

    /**
     * 新增事件。
     *
     * @param request 请求
     * @return 新事件
     */
    AboutEventVO createEvent(EventRequest request);

    /**
     * 更新事件并触发训练失效。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的事件
     */
    AboutEventVO updateEvent(String id, EventRequest request);

    /**
     * 切换成就标记（不改动正文，不触发训练失效）。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的事件
     */
    AboutEventVO toggleEventRing(String id, ToggleEventRingRequest request);

    /**
     * 删除事件并清除向量。
     *
     * @param id 主键
     * @return 结果
     */
    Map<String, Object> removeEvent(String id);

    /**
     * 足迹实体转 VO。
     *
     * @param entity 实体
     * @return VO
     */
    AboutFootprintVO getVo(AboutFootprint entity);

    /**
     * 足迹实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return VO 列表
     */
    List<AboutFootprintVO> getVoList(List<AboutFootprint> entities);

    /**
     * 事件实体转 VO（date 格式化为 YYYY-MM-DD）。
     *
     * @param entity 实体
     * @return VO
     */
    AboutEventVO getVo(AboutEvent entity);
}
