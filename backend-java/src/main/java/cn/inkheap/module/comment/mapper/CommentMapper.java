package cn.inkheap.module.comment.mapper;

import cn.inkheap.module.comment.entity.Comment;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface CommentMapper extends BaseMapper<Comment> {

    /**
     * 按用户统计评论数（看板用户列表用）。
     */
    @Select("SELECT user_id, count(*) AS cnt FROM comments GROUP BY user_id")
    List<Map<String, Object>> countGroupByUser();

    /**
     * 按用户统计聊天消息数（看板用户列表用）。
     */
    @Select("SELECT user_id, count(*) AS cnt FROM chat_messages GROUP BY user_id")
    List<Map<String, Object>> countChatGroupByUser();
}
