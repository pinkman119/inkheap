package cn.inkheap.module.contact.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.module.contact.entity.ContactMessage;
import cn.inkheap.module.contact.mapper.ContactMessageMapper;
import cn.inkheap.module.contact.model.dto.ContactCreateRequest;
import cn.inkheap.module.contact.model.dto.ContactQueryRequest;
import cn.inkheap.module.contact.model.dto.SetReadManyRequest;
import cn.inkheap.module.contact.service.ContactService;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ContactServiceImpl extends ServiceImpl<ContactMessageMapper, ContactMessage> implements ContactService {

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> CONTACT_SORT_FIELDS = Set.of("createdAt", "read");

    /** 空结果哨兵：条件必然不成立时使用，避免拼出 IN () 语法错误 */
    private static final String NONE_VALUE = "__none__";

    @Override
    public ContactMessage create(ContactCreateRequest request) {
        // 1、组装来信（Builder 一次性构造）
        ContactMessage message = ContactMessage.builder()
                .id(IdUtil.randomUUID())
                .name(StrUtil.emptyToNull(request.getName()))
                .email(StrUtil.emptyToNull(request.getEmail()))
                .phone(StrUtil.emptyToNull(request.getPhone()))
                .subject(StrUtil.emptyToNull(request.getSubject()))
                .contact(StrUtil.emptyToNull(request.getContact()))
                .message(request.getMessage())
                .read(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        // 2、入库
        this.save(message);
        return message;
    }

    @Override
    public PageVO<ContactMessage> findAll(ContactQueryRequest request) {
        int page = request.pageOrDefault();
        int pageSize = request.pageSizeOrDefault();

        // 1、查询条件统一由 getQueryWrapper 构建
        QueryWrapper wrapper = getQueryWrapper(request);

        // 2、按创建时间倒序分页（该接口不返回 totalPages）
        Page<ContactMessage> result = this.page(Page.of(page, pageSize), wrapper);

        return PageVO.ofNoTotalPages(result.getRecords(), result.getTotalRow(), page, pageSize);
    }

    @Override
    public ContactMessage findOne(String id) {
        ContactMessage message = this.getById(id);
        if (message == null) {
            throw BusinessException.notFound("来信不存在");
        }
        return message;
    }

    @Override
    public ContactMessage setRead(String id, boolean read) {
        // 1、确认存在
        findOne(id);

        // 2、更新已读状态
        ContactMessage update = ContactMessage.builder()
                .id(id)
                .read(read)
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);

        return findOne(id);
    }

    @Override
    public Map<String, Object> setReadMany(SetReadManyRequest request) {
        List<String> ids = request.getIds() == null ? new ArrayList<>() : request.getIds();
        boolean read = request.getRead() == null || request.getRead();

        Map<String, Object> result = new LinkedHashMap<>();
        if (ids.isEmpty()) {
            result.put("count", 0);
            return result;
        }

        // 1、批量更新（对应 Prisma updateMany 的 {count} 语义）
        ContactMessage update = ContactMessage.builder()
                .read(read)
                .updatedAt(Instant.now())
                .build();
        int count = this.getMapper().updateByQuery(update,
                QueryWrapper.create().in(ContactMessage::getId, ids));

        result.put("count", count);
        return result;
    }

    @Override
    public ContactMessage remove(String id) {
        // 1、确认存在
        ContactMessage message = findOne(id);

        // 2、删除并返回被删对象（与原实现一致）
        this.removeById(id);
        return message;
    }

    @Override
    public Map<String, Long> stats() {
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("total", this.count());
        result.put("unread", this.count(QueryWrapper.create().eq(ContactMessage::getRead, false)));
        return result;
    }

    @Override
    public ContactMessage getVo(ContactMessage entity) {
        if (entity == null) {
            return null;
        }
        ContactMessage copy = new ContactMessage();
        BeanUtil.copyProperties(entity, copy);
        return copy;
    }

    @Override
    public List<ContactMessage> getVoList(List<ContactMessage> entities) {
        List<ContactMessage> list = new ArrayList<>();
        for (ContactMessage entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public QueryWrapper getQueryWrapper(ContactQueryRequest request) {
        // 1、主键 + 已读状态筛选
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(ContactMessage::getId, request.getId(), StrUtil.isNotBlank(request.getId()));
        if ("read".equals(request.getRead())) {
            wrapper.eq(ContactMessage::getRead, true);
        } else if ("unread".equals(request.getRead())) {
            wrapper.eq(ContactMessage::getRead, false);
        }

        // 2、关键词：先查出命中的 id 再走 in，避免 OR 条件与外层条件优先级冲突
        if (StrUtil.isNotBlank(request.getKeyword())) {
            List<String> ids = this.getMapper().searchIds("%" + request.getKeyword().trim() + "%");
            wrapper.in(ContactMessage::getId, ids.isEmpty() ? List.of(NONE_VALUE) : ids);
        }

        // 3、排序：sortField 命中白名单时按其排序，否则按创建时间倒序
        String sortColumn = request.resolveSortColumn(CONTACT_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(ContactMessage::getCreatedAt, false);
        }
        return wrapper;
    }
}
