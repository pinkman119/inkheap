package cn.inkheap.module.resume.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.service.TrainingService;
import cn.inkheap.module.resume.entity.Resume;
import cn.inkheap.module.resume.mapper.ResumeMapper;
import cn.inkheap.module.resume.model.dto.ResumeQueryRequest;
import cn.inkheap.module.resume.model.dto.ResumeRequest;
import cn.inkheap.module.resume.model.vo.ResumeListVO;
import cn.inkheap.module.resume.model.vo.ResumeVO;
import cn.inkheap.module.resume.service.ResumeService;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ResumeServiceImpl extends ServiceImpl<ResumeMapper, Resume> implements ResumeService {

    private static final String DEFAULT_RESUME_NAME = "默认版本";

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> RESUME_SORT_FIELDS =
            Set.of("updatedAt", "createdAt", "isActive", "name");

    private final TrainingService trainingService;

    @Override
    public ResumeVO findActive() {
        // 1、查询生效版本
        Resume active = this.getOne(QueryWrapper.create().eq(Resume::getIsActive, true).limit(1));

        // 2、无生效版本时返回占位数据，保证前台不崩
        if (active == null) {
            return ResumeVO.builder()
                    .id(null)
                    .name(DEFAULT_RESUME_NAME)
                    .isActive(true)
                    .content(new LinkedHashMap<>())
                    .build();
        }
        return getVo(active);
    }

    @Override
    public List<ResumeListVO> listVersions(ResumeQueryRequest request) {
        // 1、按「生效优先 + 更新时间倒序」查询（条件统一由 getQueryWrapper 构建）
        List<Resume> list = this.list(getQueryWrapper(request));

        // 2、转列表 VO（不含 content）
        List<ResumeListVO> result = new ArrayList<>(list.size());
        for (Resume resume : list) {
            ResumeListVO vo = new ResumeListVO();
            BeanUtil.copyProperties(resume, vo);
            result.add(vo);
        }
        return result;
    }

    @Override
    public ResumeVO findById(String id) {
        Resume resume = this.getById(id);
        if (resume == null) {
            throw BusinessException.notFound("简历版本不存在");
        }
        return getVo(resume);
    }

    @Override
    public ResumeVO create(ResumeRequest request) {
        // 1、首个版本自动激活
        long total = this.count();
        Resume resume = Resume.builder()
                .id(IdUtil.randomUUID())
                .name(request.getName() == null ? DEFAULT_RESUME_NAME : request.getName())
                .content(JsonUtils.toJson(request.getContent() == null ? new LinkedHashMap<>() : request.getContent()))
                .isActive(request.getIsActive() != null ? request.getIsActive() : total == 0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .trainType(0)
                .build();
        this.save(resume);

        return findById(resume.getId());
    }

    @Override
    public ResumeVO update(String id, ResumeRequest request) {
        // 1、确认版本存在
        Resume existing = this.getById(id);
        if (existing == null) {
            throw BusinessException.notFound("简历版本不存在");
        }

        // 2、更新名称/内容
        Resume update = Resume.builder()
                .id(id)
                .name(request.getName() == null ? null : request.getName())
                .content(request.getContent() == null ? null : JsonUtils.toJson(request.getContent()))
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);

        // 3、数字生命：已训练版本被编辑 → 删向量 + trainType 归零
        trainingService.invalidateIfTrained(RefTypes.RESUME, id);

        return findById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResumeVO activate(String id) {
        // 1、确认目标版本存在
        Resume target = this.getById(id);
        if (target == null) {
            throw BusinessException.notFound("简历版本不存在");
        }

        // 2、旧生效版本若已训练 → 删向量（仅生效版本可存在于向量库）
        Resume prevActive = this.getOne(QueryWrapper.create().eq(Resume::getIsActive, true).limit(1));
        if (prevActive != null && !prevActive.getId().equals(id)) {
            trainingService.invalidateIfTrained(RefTypes.RESUME, prevActive.getId());
        }

        // 3、事务内全部置 false 再置 true
        Resume reset = Resume.builder()
                .isActive(false)
                .updatedAt(Instant.now())
                .build();
        this.update(reset, QueryWrapper.create().eq(Resume::getIsActive, true));

        Resume activate = Resume.builder()
                .id(id)
                .isActive(true)
                .updatedAt(Instant.now())
                .build();
        this.updateById(activate);

        return findById(id);
    }

    @Override
    public Map<String, Object> remove(String id) {
        // 1、确认版本存在
        Resume target = this.getById(id);
        if (target == null) {
            throw BusinessException.notFound("简历版本不存在");
        }

        // 2、唯一生效版本禁止删除
        if (Boolean.TRUE.equals(target.getIsActive())) {
            long activeCount = this.count(QueryWrapper.create().eq(Resume::getIsActive, true));
            if (activeCount <= 1) {
                throw BusinessException.badRequest("不能删除当前唯一的生效版本，请先切换其他版本为生效");
            }
        }

        // 3、清向量 + 删记录
        trainingService.invalidateByRef(RefTypes.RESUME, id);
        this.removeById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public ResumeVO getVo(Resume entity) {
        if (entity == null) {
            return null;
        }
        ResumeVO vo = new ResumeVO();
        BeanUtil.copyProperties(entity, vo, "content");
        vo.setContent(JsonUtils.parseMap(entity.getContent()));
        return vo;
    }

    @Override
    public List<ResumeVO> getVoList(List<Resume> entities) {
        List<ResumeVO> list = new ArrayList<>();
        for (Resume entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public QueryWrapper getQueryWrapper(ResumeQueryRequest request) {
        // 1、基础条件：id 精确、名称模糊、是否生效
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(Resume::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .like(Resume::getName, request.getName(), StrUtil.isNotBlank(request.getName()))
                .eq(Resume::getIsActive, request.getIsActive(), request.getIsActive() != null);

        // 2、排序：sortField 命中白名单时按其排序，否则生效优先 + 更新时间倒序
        String sortColumn = request.resolveSortColumn(RESUME_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(Resume::getIsActive, false).orderBy(Resume::getUpdatedAt, false);
        }
        return wrapper;
    }
}
