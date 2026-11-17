package cn.inkheap.module.digitallife.service;

import java.util.Map;

/**
 * 数字生命后台会话管理服务。
 */
public interface ChatAdminService {

    /**
     * 会话列表：按 (userId, sessionId) 聚合，展示最近时间 / 消息数 / IP / 首条提问。
     *
     * @param page     页码
     * @param pageSize 每页条数
     * @param ip       IP 模糊搜索（可选）
     * @return {items,total,page,pageSize}
     */
    Map<String, Object> listSessions(int page, int pageSize, String ip);

    /**
     * 会话详情：全部消息（时间正序，最多 500 条）。
     *
     * @param userId    用户 id
     * @param sessionId 会话 id
     * @return {items}
     */
    Map<String, Object> getSessionMessages(String userId, String sessionId);
}
