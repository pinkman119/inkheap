package cn.inkheap.module.friendlink.mapper;

import cn.inkheap.module.friendlink.entity.FriendApplication;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface FriendApplicationMapper extends BaseMapper<FriendApplication> {

    /**
     * 后台关键词搜索（name / email / url / message 的 OR 条件）。
     */
    @Select("SELECT id FROM friend_applications WHERE name ILIKE #{keyword} OR email ILIKE #{keyword} "
            + "OR url ILIKE #{keyword} OR message ILIKE #{keyword}")
    List<String> searchIds(@Param("keyword") String keyword);
}
