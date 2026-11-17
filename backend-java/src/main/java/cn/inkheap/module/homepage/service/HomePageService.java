package cn.inkheap.module.homepage.service;

import cn.inkheap.module.homepage.entity.HomePage;
import cn.inkheap.module.homepage.model.dto.UpdateHomePageRequest;
import cn.inkheap.module.homepage.model.vo.HomePageVO;

import java.util.List;

/**
 * 首页配置服务。
 */
public interface HomePageService {

    /**
     * 获取首页配置（公开接口）。记录不存在时返回默认占位，保证前台不崩。
     *
     * @return 首页配置
     */
    HomePageVO findOne();

    /**
     * 更新首页配置（后台）。记录不存在时自动创建；头像变化时清理旧文件。
     *
     * @param request 更新请求
     * @return 更新后的配置
     */
    HomePageVO update(UpdateHomePageRequest request);

    /**
     * 实体转 VO（socialLinks JSON 还原为数组）。
     *
     * @param entity 实体
     * @return VO
     */
    HomePageVO getVo(HomePage entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return VO 列表
     */
    List<HomePageVO> getVoList(List<HomePage> entities);
}
