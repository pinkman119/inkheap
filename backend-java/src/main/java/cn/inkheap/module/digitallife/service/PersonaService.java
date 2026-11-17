package cn.inkheap.module.digitallife.service;

import cn.inkheap.module.digitallife.entity.DlPersona;
import cn.inkheap.module.digitallife.model.dto.PersonaUpdateRequest;

import java.util.List;

/**
 * 数字生命人格服务。
 */
public interface PersonaService {

    /**
     * 人格列表（按 sortOrder）。
     *
     * @return 列表
     */
    List<DlPersona> list();

    /**
     * 人格详情，不存在抛 404「人格不存在」。
     *
     * @param id 主键
     * @return 人格
     */
    DlPersona detail(String id);

    /**
     * 更新人格（8 个字段逐个覆盖）。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的人格
     */
    DlPersona update(String id, PersonaUpdateRequest request);

    /**
     * 聊天使用的当前人格（sortOrder 最小；无人格返回 null）。
     *
     * @return 人格
     */
    DlPersona getActivePersona();
}
