package cn.inkheap.module.friendlink.mapper;

import cn.inkheap.module.friendlink.entity.FriendLink;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface FriendLinkMapper extends BaseMapper<FriendLink> {

    /**
     * 后台关键词搜索（name / url / desc / group / tag 的 OR 条件）。
     */
    @Select("SELECT id FROM friend_links WHERE name ILIKE #{keyword} OR url ILIKE #{keyword} "
            + "OR \"desc\" ILIKE #{keyword} OR \"group\" ILIKE #{keyword} OR tag ILIKE #{keyword}")
    List<String> searchIds(@Param("keyword") String keyword);
}
