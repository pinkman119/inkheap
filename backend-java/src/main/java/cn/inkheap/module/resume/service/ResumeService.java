package cn.inkheap.module.resume.service;

import cn.inkheap.module.resume.entity.Resume;
import cn.inkheap.module.resume.model.dto.ResumeQueryRequest;
import cn.inkheap.module.resume.model.dto.ResumeRequest;
import cn.inkheap.module.resume.model.vo.ResumeListVO;
import cn.inkheap.module.resume.model.vo.ResumeVO;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.List;
import java.util.Map;

/**
 * 简历版本服务。
 */
public interface ResumeService {

    /**
     * 当前生效版本（前台展示）；无生效版本时返回含默认内容的占位数据。
     *
     * @return 简历详情
     */
    ResumeVO findActive();

    /**
     * 版本列表（不含完整 content），默认生效版本在前。
     *
     * @param request 查询请求
     * @return 列表
     */
    List<ResumeListVO> listVersions(ResumeQueryRequest request);

    /**
     * 版本详情（含完整 content）。
     *
     * @param id 主键
     * @return 详情
     */
    ResumeVO findById(String id);

    /**
     * 新建版本：首个版本自动激活。
     *
     * @param request 请求
     * @return 新版本详情
     */
    ResumeVO create(ResumeRequest request);

    /**
     * 更新版本名称/内容，并触发训练失效。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的详情
     */
    ResumeVO update(String id, ResumeRequest request);

    /**
     * 切换生效版本（事务内全置 false 再置 true）。
     *
     * @param id 主键
     * @return 生效版本详情
     */
    ResumeVO activate(String id);

    /**
     * 删除版本：唯一生效版本不可删除。
     *
     * @param id 主键
     * @return 结果
     */
    Map<String, Object> remove(String id);

    /**
     * 实体转 VO（content JSON 解析为对象）。
     *
     * @param entity 实体
     * @return 详情
     */
    ResumeVO getVo(Resume entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return 列表
     */
    List<ResumeVO> getVoList(List<Resume> entities);

    /**
     * 构建简历查询条件：id / 名称 / 是否生效与排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(ResumeQueryRequest request);
}
