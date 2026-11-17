package cn.inkheap.module.view.mapper;

import cn.inkheap.module.view.entity.ContentView;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.Instant;

@Mapper
public interface ContentViewMapper extends BaseMapper<ContentView> {

    /**
     * 幂等写入阅读明细：命中 4 列唯一索引时什么也不做，返回受影响行数（1 = 首次计入，0 = 今天已计过）。
     */
    @Insert("INSERT INTO content_views (id, target_type, target_id, ip, day, created_at) "
            + "VALUES (#{id}, #{targetType}, #{targetId}, #{ip}, #{day}, #{createdAt}) "
            + "ON CONFLICT (target_type, target_id, ip, day) DO NOTHING")
    int insertIfAbsent(@Param("id") String id,
                       @Param("targetType") String targetType,
                       @Param("targetId") String targetId,
                       @Param("ip") String ip,
                       @Param("day") Instant day,
                       @Param("createdAt") Instant createdAt);
}
