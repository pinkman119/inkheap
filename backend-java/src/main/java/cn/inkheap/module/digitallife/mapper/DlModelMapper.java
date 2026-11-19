package cn.inkheap.module.digitallife.mapper;

import cn.inkheap.module.digitallife.entity.DlModel;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.Instant;

@Mapper
public interface DlModelMapper extends BaseMapper<DlModel> {

    /**
     * 清空模型已保存的 API Key（update 实体时 null 字段会被忽略，只能显式置空）。
     */
    @Update("UPDATE dl_models SET api_key_enc = NULL, updated_at = #{updatedAt} WHERE id = #{id}")
    int clearApiKey(@Param("id") String id, @Param("updatedAt") Instant updatedAt);
}
