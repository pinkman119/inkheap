package cn.inkheap.module.digitallife.mapper;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

/**
 * dl_vectors 原生 SQL 访问：embedding 以字符串字面量传入并 ?::vector 强转，避免额外 TypeHandler。
 */
@Mapper
public interface VectorMapper {

    @Delete("DELETE FROM dl_vectors WHERE ref_type = #{refType} AND ref_id = #{refId}")
    int deleteByRef(@Param("refType") String refType, @Param("refId") String refId);

    @Insert("INSERT INTO dl_vectors (ref_type, ref_id, chunk_index, content, embedding) "
            + "VALUES (#{refType}, #{refId}, #{chunkIndex}, #{content}, #{embedding}::vector)")
    int insert(@Param("refType") String refType,
               @Param("refId") String refId,
               @Param("chunkIndex") int chunkIndex,
               @Param("content") String content,
               @Param("embedding") String embedding);

    @Select("SELECT count(*) FROM dl_vectors WHERE ref_type = #{refType} AND ref_id = #{refId}")
    long countByRef(@Param("refType") String refType, @Param("refId") String refId);

    @Select("SELECT content AS \"content\", ref_type AS \"refType\", ref_id AS \"refId\", "
            + "chunk_index AS \"chunkIndex\", (embedding <=> #{embedding}::vector) AS \"distance\" "
            + "FROM dl_vectors "
            + "WHERE (#{refTypes}::text IS NULL OR ref_type = ANY(string_to_array(#{refTypes}::text, ','))) "
            + "ORDER BY embedding <=> #{embedding}::vector LIMIT #{topK}")
    List<Map<String, Object>> search(@Param("embedding") String embedding,
                                     @Param("topK") int topK,
                                     @Param("refTypes") String refTypes);
}
