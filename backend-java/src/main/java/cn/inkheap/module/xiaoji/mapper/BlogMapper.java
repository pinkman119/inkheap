package cn.inkheap.module.xiaoji.mapper;

import cn.inkheap.module.xiaoji.entity.Blog;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface BlogMapper extends BaseMapper<Blog> {

    /**
     * 清空小记地点（足迹解绑 / 重新绑定他人时使用）。
     */
    @Update("UPDATE blogs SET location = NULL WHERE id = #{id}")
    int clearLocation(@Param("id") String id);
}
