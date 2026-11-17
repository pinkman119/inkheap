package cn.inkheap.module.about.mapper;

import cn.inkheap.module.about.entity.AboutFootprint;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface AboutFootprintMapper extends BaseMapper<AboutFootprint> {

    /**
     * 解绑某篇小记名下的足迹（keepId 为空表示全部解绑）。
     */
    @Update("UPDATE about_footprints SET blog_id = NULL WHERE blog_id = #{blogId} "
            + "AND (#{keepId} IS NULL OR id <> #{keepId})")
    int unbindByBlog(@Param("blogId") String blogId, @Param("keepId") String keepId);

    /**
     * 建立足迹 ↔ 小记绑定。
     */
    @Update("UPDATE about_footprints SET blog_id = #{blogId} WHERE id = #{footprintId}")
    int bindBlog(@Param("footprintId") String footprintId, @Param("blogId") String blogId);
}
