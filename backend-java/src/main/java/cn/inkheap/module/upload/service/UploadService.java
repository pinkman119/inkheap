package cn.inkheap.module.upload.service;

import cn.inkheap.module.upload.entity.UploadFile;
import cn.inkheap.module.upload.model.vo.FileVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 上传文件服务。
 */
public interface UploadService {

    /**
     * 落盘并登记一次上传：files/&lt;yyyy-MM-dd&gt;/&lt;uuid&gt;&lt;ext&gt;。
     *
     * @param file 上传文件
     * @return 文件信息
     */
    FileVO persist(MultipartFile file);

    /**
     * 按记录 id 删除（先删磁盘再删库，文件不存在不报错）。
     *
     * @param id 文件 id
     */
    void remove(String id);

    /**
     * 按 URL 删除（替换头像等场景，无记录时静默跳过）。
     *
     * @param url 文件访问地址
     */
    void removeByUrl(String url);

    /**
     * 实体转 VO。
     *
     * @param entity 实体
     * @return VO
     */
    FileVO getVo(UploadFile entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return VO 列表
     */
    List<FileVO> getVoList(List<UploadFile> entities);
}
