package cn.inkheap.module.visit.mapper;

import cn.inkheap.module.visit.entity.SiteVisit;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.Instant;

@Mapper
public interface SiteVisitMapper extends BaseMapper<SiteVisit> {

    /**
     * 幂等自增：当天存在则 count+1，不存在则新建（单条 SQL 内完成，天然无竞态）。
     */
    @Insert("INSERT INTO site_visits (id, day, count, created_at, updated_at) "
            + "VALUES (#{id}, #{day}, 1, now(), now()) "
            + "ON CONFLICT (day) DO UPDATE SET count = site_visits.count + 1, updated_at = now()")
    int upsertIncrement(@Param("id") String id, @Param("day") Instant day);
}
