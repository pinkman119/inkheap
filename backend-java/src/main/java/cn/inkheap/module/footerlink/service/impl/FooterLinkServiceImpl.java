package cn.inkheap.module.footerlink.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.SvgSanitizer;
import cn.inkheap.module.footerlink.entity.FooterLink;
import cn.inkheap.module.footerlink.mapper.FooterLinkMapper;
import cn.inkheap.module.footerlink.model.dto.FooterLinkQueryRequest;
import cn.inkheap.module.footerlink.model.dto.FooterLinkRequest;
import cn.inkheap.module.footerlink.model.dto.MoveFooterLinkRequest;
import cn.inkheap.module.footerlink.service.FooterLinkService;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class FooterLinkServiceImpl extends ServiceImpl<FooterLinkMapper, FooterLink> implements FooterLinkService {

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> FOOTER_LINK_SORT_FIELDS =
            Set.of("type", "sortOrder", "createdAt", "label");

    @Override
    public List<FooterLink> findAll(FooterLinkQueryRequest request) {
        // 1、查询条件统一由 getQueryWrapper 构建（默认 type + sortOrder + createdAt 排序）
        return this.list(getQueryWrapper(request));
    }

    @Override
    public FooterLink findOne(String id) {
        FooterLink link = this.getById(id);
        if (link == null) {
            throw BusinessException.notFound("链接不存在");
        }
        return link;
    }

    @Override
    public FooterLink create(FooterLinkRequest request) {
        // 1、sortOrder 未传时取同类型最大值 + 1
        Integer sortOrder = request.getSortOrder();
        if (sortOrder == null) {
            QueryWrapper wrapper = QueryWrapper.create()
                    .eq(FooterLink::getType, request.getType())
                    .orderBy(FooterLink::getSortOrder, false)
                    .limit(1);
            FooterLink last = this.getOne(wrapper);
            sortOrder = (last == null || last.getSortOrder() == null ? -1 : last.getSortOrder()) + 1;
        }

        // 2、构建实体并入库（svg 清洗，空值置 null）
        FooterLink link = FooterLink.builder()
                .id(IdUtil.randomUUID())
                .type(request.getType())
                .mode(request.getMode() == null ? 0 : request.getMode())
                .label(request.getLabel())
                .url(request.getUrl())
                .icon(StrUtil.emptyToNull(request.getIcon()))
                .svg(SvgSanitizer.sanitize(request.getSvg()))
                .sortOrder(sortOrder)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        this.save(link);
        return link;
    }

    @Override
    public FooterLink update(String id, FooterLinkRequest request) {
        // 1、确认记录存在
        FooterLink existing = findOne(id);

        // 2、逐个字段覆盖（未传字段保持原值；icon/svg 允许显式清空）
        FooterLink update = new FooterLink();
        BeanUtil.copyProperties(existing, update);
        if (request.getType() != null) {
            update.setType(request.getType());
        }
        if (request.getMode() != null) {
            update.setMode(request.getMode());
        }
        if (request.getLabel() != null) {
            update.setLabel(request.getLabel());
        }
        if (request.getUrl() != null) {
            update.setUrl(request.getUrl());
        }
        if (request.getIcon() != null) {
            update.setIcon(StrUtil.emptyToNull(request.getIcon()));
        }
        if (request.getSvg() != null) {
            update.setSvg(SvgSanitizer.sanitize(request.getSvg()));
        }
        if (request.getSortOrder() != null) {
            update.setSortOrder(request.getSortOrder());
        }
        update.setUpdatedAt(Instant.now());

        // 3、全字段写回（含 null），保证清空图标能生效
        this.updateById(update, false);
        return this.getById(id);
    }

    @Override
    public Map<String, Object> remove(String id) {
        findOne(id);
        this.removeById(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "删除成功");
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FooterLink move(MoveFooterLinkRequest request) {
        // 1、取当前记录与同类型相邻记录
        FooterLink current = findOne(request.getId());
        boolean up = "up".equals(request.getDirection());
        QueryWrapper siblingWrapper = QueryWrapper.create()
                .eq(FooterLink::getType, current.getType())
                .ne(FooterLink::getId, current.getId())
                .orderBy(FooterLink::getSortOrder, !up)
                .limit(1);
        if (up) {
            siblingWrapper.lt(FooterLink::getSortOrder, current.getSortOrder());
        } else {
            siblingWrapper.gt(FooterLink::getSortOrder, current.getSortOrder());
        }
        FooterLink sibling = this.getOne(siblingWrapper);
        if (sibling == null) {
            throw BusinessException.badRequest(up ? "已经是最前面了" : "已经是最后面了");
        }

        // 2、交换 sortOrder
        Integer currentOrder = current.getSortOrder();
        Integer siblingOrder = sibling.getSortOrder();

        FooterLink updateCurrent = FooterLink.builder()
                .id(current.getId())
                .sortOrder(siblingOrder)
                .updatedAt(Instant.now())
                .build();
        this.updateById(updateCurrent);

        FooterLink updateSibling = FooterLink.builder()
                .id(sibling.getId())
                .sortOrder(currentOrder)
                .updatedAt(Instant.now())
                .build();
        this.updateById(updateSibling);

        return this.getById(current.getId());
    }

    @Override
    public FooterLink getVo(FooterLink entity) {
        if (entity == null) {
            return null;
        }
        FooterLink copy = new FooterLink();
        BeanUtil.copyProperties(entity, copy);
        return copy;
    }

    @Override
    public List<FooterLink> getVoList(List<FooterLink> entities) {
        List<FooterLink> list = new ArrayList<>();
        for (FooterLink entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public QueryWrapper getQueryWrapper(FooterLinkQueryRequest request) {
        // 1、基础条件：id 精确、类型与模式精确、文案模糊
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(FooterLink::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .eq(FooterLink::getType, request.getType(), StrUtil.isNotBlank(request.getType()))
                .eq(FooterLink::getMode, request.getMode(), request.getMode() != null)
                .like(FooterLink::getLabel, request.getLabel(), StrUtil.isNotBlank(request.getLabel()));

        // 2、排序：sortField 命中白名单时按其排序，否则 type + sortOrder + createdAt 升序
        String sortColumn = request.resolveSortColumn(FOOTER_LINK_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(FooterLink::getType, true)
                    .orderBy(FooterLink::getSortOrder, true)
                    .orderBy(FooterLink::getCreatedAt, true);
        }
        return wrapper;
    }
}
