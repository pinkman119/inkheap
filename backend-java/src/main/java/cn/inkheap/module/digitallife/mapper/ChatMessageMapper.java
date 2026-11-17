package cn.inkheap.module.digitallife.mapper;

import cn.inkheap.module.digitallife.entity.ChatMessage;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface ChatMessageMapper extends BaseMapper<ChatMessage> {

    /**
     * 按 (user_id, session_id) 聚合会话：消息数与最近时间。
     */
    @Select("SELECT user_id AS \"userId\", session_id AS \"sessionId\", count(*) AS \"messageCount\", "
            + "max(created_at) AS \"lastMessageAt\" FROM chat_messages "
            + "GROUP BY user_id, session_id ORDER BY max(created_at) DESC")
    List<Map<String, Object>> groupSessions();

    /**
     * IP 模糊搜索命中的会话组合。
     */
    @Select("SELECT DISTINCT user_id AS \"userId\", session_id AS \"sessionId\" FROM chat_messages "
            + "WHERE ip ILIKE #{keyword}")
    List<Map<String, Object>> searchByIp(@Param("keyword") String keyword);

    /**
     * 取指定会话中最早一条带 IP 的消息（用于后台展示来源地址）。
     */
    @Select("SELECT user_id AS \"userId\", session_id AS \"sessionId\", ip AS \"ip\" FROM chat_messages "
            + "WHERE ip IS NOT NULL AND user_id = #{userId} "
            + "AND ((#{sessionId} IS NULL AND session_id IS NULL) OR session_id = #{sessionId}) "
            + "ORDER BY created_at ASC LIMIT 1")
    Map<String, Object> earliestIp(@Param("userId") String userId, @Param("sessionId") String sessionId);

    /**
     * 取指定会话的第一条用户消息（列表预览）。
     */
    @Select("SELECT content FROM chat_messages WHERE role = 'user' AND user_id = #{userId} "
            + "AND ((#{sessionId} IS NULL AND session_id IS NULL) OR session_id = #{sessionId}) "
            + "ORDER BY created_at ASC LIMIT 1")
    String firstUserMessage(@Param("userId") String userId, @Param("sessionId") String sessionId);
}
