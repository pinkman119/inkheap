package cn.inkheap.module.contact.service;

import cn.inkheap.common.response.PageVO;
import cn.inkheap.module.contact.entity.ContactMessage;
import cn.inkheap.module.contact.model.dto.ContactCreateRequest;
import cn.inkheap.module.contact.model.dto.ContactQueryRequest;
import cn.inkheap.module.contact.model.dto.SetReadManyRequest;

import java.util.List;
import java.util.Map;

/**
 * 联系我来信服务。
 */
public interface ContactService {

    /**
     * 前台提交一条来信。
     *
     * @param request 请求
     * @return 新来信
     */
    ContactMessage create(ContactCreateRequest request);

    /**
     * 后台分页查询（返回 {items,total,page,pageSize}，不含 totalPages）。
     *
     * @param request 查询参数
     * @return 分页结果
     */
    PageVO<ContactMessage> findAll(ContactQueryRequest request);

    /**
     * 按 id 查询，不存在抛 404「来信不存在」。
     *
     * @param id 主键
     * @return 来信
     */
    ContactMessage findOne(String id);

    /**
     * 标记单条已读 / 未读。
     *
     * @param id   主键
     * @param read 目标状态
     * @return 更新后的来信
     */
    ContactMessage setRead(String id, boolean read);

    /**
     * 批量标记已读。
     *
     * @param request 请求
     * @return 受影响条数
     */
    Map<String, Object> setReadMany(SetReadManyRequest request);

    /**
     * 删除来信。
     *
     * @param id 主键
     * @return 被删除的来信
     */
    ContactMessage remove(String id);

    /**
     * 统计：总数 / 未读数。
     *
     * @return 统计结果
     */
    Map<String, Long> stats();

    /**
     * 实体转 VO（字段可直接输出，保留方法以满足规范）。
     *
     * @param entity 实体
     * @return 实体副本
     */
    ContactMessage getVo(ContactMessage entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return 列表
     */
    List<ContactMessage> getVoList(List<ContactMessage> entities);

    /**
     * 构建来信查询条件：已读状态、关键词、排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    com.mybatisflex.core.query.QueryWrapper getQueryWrapper(ContactQueryRequest request);
}
