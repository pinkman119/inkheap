package cn.inkheap.module.contact.mapper;

import cn.inkheap.module.contact.entity.ContactMessage;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ContactMessageMapper extends BaseMapper<ContactMessage> {

    /**
     * 关键词搜索（name / email / subject / message 的 OR 条件）。
     */
    @Select("SELECT id FROM contact_messages WHERE name ILIKE #{keyword} OR email ILIKE #{keyword} "
            + "OR subject ILIKE #{keyword} OR message ILIKE #{keyword}")
    List<String> searchIds(@Param("keyword") String keyword);
}
