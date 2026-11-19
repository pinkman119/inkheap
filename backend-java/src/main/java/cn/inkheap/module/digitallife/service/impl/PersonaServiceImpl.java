package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.module.digitallife.constant.DigitalLifeDefaults;
import cn.inkheap.module.digitallife.entity.DlPersona;
import cn.inkheap.module.digitallife.mapper.DlPersonaMapper;
import cn.inkheap.module.digitallife.model.dto.PersonaUpdateRequest;
import cn.inkheap.module.digitallife.service.PersonaService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonaServiceImpl implements PersonaService {

    private final DlPersonaMapper dlPersonaMapper;

    @Override
    public List<DlPersona> list() {
        List<DlPersona> personas = selectAll();
        if (personas.isEmpty()) {
            // 无人格数据时写入默认种子，保证管理端「人格编写」页至少有一个可编辑人格
            getActivePersona();
            personas = selectAll();
        }
        return personas;
    }

    private List<DlPersona> selectAll() {
        return dlPersonaMapper.selectListByQuery(QueryWrapper.create().orderBy(DlPersona::getSortOrder, true));
    }

    @Override
    public DlPersona detail(String id) {
        DlPersona persona = dlPersonaMapper.selectOneById(id);
        if (persona == null) {
            throw BusinessException.notFound("人格不存在");
        }
        return persona;
    }

    @Override
    public DlPersona update(String id, PersonaUpdateRequest request) {
        // 1、确认存在
        detail(id);

        // 2、逐个字段覆盖（description / basicInfo 保留原文空白）
        DlPersona update = DlPersona.builder()
                .id(id)
                .name(request.getName() == null ? null : request.getName().trim())
                .greeting(request.getGreeting() == null ? null : request.getGreeting().trim())
                .description(request.getDescription())
                .basicInfo(request.getBasicInfo())
                .styleHint(request.getStyleHint() == null ? null : request.getStyleHint().trim())
                .accentColor(request.getAccentColor() == null ? null : request.getAccentColor().trim())
                .avatarEmoji(request.getAvatarEmoji() == null ? null : request.getAvatarEmoji().trim())
                .personalityType(request.getPersonalityType() == null ? null : request.getPersonalityType().trim())
                .updatedAt(Instant.now())
                .build();
        // ignoreNulls = true：只更新请求里带了的字段，避免把 sortOrder / createdAt 等未赋值字段写成 null
        dlPersonaMapper.update(update, true);

        return detail(id);
    }

    @Override
    public DlPersona getActivePersona() {
        DlPersona persona = dlPersonaMapper.selectOneByQuery(QueryWrapper.create()
                .orderBy(DlPersona::getSortOrder, true)
                .limit(1));
        if (persona != null) {
            return persona;
        }

        // 无人格数据时写入默认种子（与原实现的 seedIfEmpty 一致）
        DlPersona seed = DlPersona.builder()
                .id(cn.hutool.core.util.IdUtil.randomUUID())
                .name(DigitalLifeDefaults.DEFAULT_PERSONA_NAME)
                .greeting(DigitalLifeDefaults.DEFAULT_PERSONA_GREETING)
                .description("")
                .basicInfo(DigitalLifeDefaults.DEFAULT_PERSONA_BASIC_INFO)
                .styleHint(DigitalLifeDefaults.DEFAULT_PERSONA_STYLE_HINT)
                .accentColor("#2d8264")
                .avatarEmoji("🐾")
                .personalityType("ENFJ")
                .sortOrder(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        dlPersonaMapper.insert(seed);
        return seed;
    }
}
