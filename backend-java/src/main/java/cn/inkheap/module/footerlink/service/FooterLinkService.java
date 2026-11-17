package cn.inkheap.module.footerlink.service;

import cn.inkheap.module.footerlink.entity.FooterLink;
import cn.inkheap.module.footerlink.model.dto.FooterLinkQueryRequest;
import cn.inkheap.module.footerlink.model.dto.FooterLinkRequest;
import cn.inkheap.module.footerlink.model.dto.MoveFooterLinkRequest;

import java.util.List;

/**
 * 页脚链接服务。
 */
public interface FooterLinkService {

    /**
     * 链接列表（后台与公开接口共用），默认按 type + sortOrder + createdAt 排序。
     *
     * @param request 查询请求
     * @return 链接列表
     */
    List<FooterLink> findAll(FooterLinkQueryRequest request);

    /**
     * 按 id 查询，不存在抛 404「链接不存在」。
     *
     * @param id 主键
     * @return 链接
     */
    FooterLink findOne(String id);

    /**
     * 新增链接：sortOrder 未传时取同类型 MAX+1。
     *
     * @param request 请求
     * @return 新链接
     */
    FooterLink create(FooterLinkRequest request);

    /**
     * 更新链接（svg 入库前清洗，清空时置 null）。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的链接
     */
    FooterLink update(String id, FooterLinkRequest request);

    /**
     * 删除链接。
     *
     * @param id 主键
     * @return 结果消息
     */
    java.util.Map<String, Object> remove(String id);

    /**
     * 上移 / 下移：与同类型相邻记录交换 sortOrder。
     *
     * @param request 移动请求
     * @return 更新后的链接
     */
    FooterLink move(MoveFooterLinkRequest request);

    /**
     * 实体转 VO（当前实体字段即可直接输出，保留方法以满足规范）。
     *
     * @param entity 实体
     * @return 实体副本
     */
    FooterLink getVo(FooterLink entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return 列表
     */
    List<FooterLink> getVoList(List<FooterLink> entities);

    /**
     * 构建页脚链接查询条件：类型 / 模式 / 文案与排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    com.mybatisflex.core.query.QueryWrapper getQueryWrapper(FooterLinkQueryRequest request);
}
