package cn.inkheap.module.upload.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.TimeUtils;
import cn.inkheap.config.AppProperties;
import cn.inkheap.module.upload.entity.UploadFile;
import cn.inkheap.module.upload.mapper.UploadFileMapper;
import cn.inkheap.module.upload.model.vo.FileVO;
import cn.inkheap.module.upload.service.UploadService;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class UploadServiceImpl extends ServiceImpl<UploadFileMapper, UploadFile> implements UploadService {

    @Resource
    private AppProperties appProperties;

    @Override
    public FileVO persist(MultipartFile file) {
        // 1、校验文件与类型
        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("未接收到文件");
        }
        String mimeType = file.getContentType();
        if (mimeType == null || !List.of("image/png", "image/jpeg", "image/gif", "image/webp").contains(mimeType)) {
            throw BusinessException.badRequest("仅支持图片文件（png/jpeg/gif/webp）");
        }

        // 2、计算存储路径：日期分桶 + uuid 文件名
        LocalDate today = LocalDate.now(TimeUtils.ZONE_SHANGHAI);
        String dateDir = today.toString();
        String storedName = buildStoredName(file.getOriginalFilename());
        String relativePath = dateDir + "/" + storedName;
        Path root = Paths.get(appProperties.getUploadDir()).toAbsolutePath().normalize();
        Path target = root.resolve(relativePath);

        // 3、落盘：先建日期目录，再写文件
        try {
            Files.createDirectories(root.resolve(dateDir));
            file.transferTo(target.toFile());
        } catch (IOException e) {
            log.error("上传文件落盘失败: {}", target, e);
            throw BusinessException.serverError("文件保存失败");
        }

        // 5、登记 files 表
        UploadFile record = UploadFile.builder()
                .id(IdUtil.randomUUID())
                .filename(storedName)
                .originalName(file.getOriginalFilename())
                .url("/files/" + relativePath)
                .mimeType(mimeType)
                .size((int) file.getSize())
                .relativePath(relativePath)
                .createdAt(Instant.now())
                .build();
        this.save(record);

        return getVo(record);
    }

    @Override
    public void remove(String id) {
        // 1、查记录
        UploadFile record = this.getById(id);
        if (record == null) {
            throw BusinessException.notFound("文件记录不存在");
        }

        // 2、删磁盘文件（不存在或删除失败都不阻断删库）
        Path root = Paths.get(appProperties.getUploadDir()).toAbsolutePath().normalize();
        try {
            Files.deleteIfExists(root.resolve(record.getRelativePath()));
        } catch (IOException e) {
            log.warn("删除磁盘文件失败: {}", record.getRelativePath(), e);
        }

        // 3、删记录
        this.removeById(id);
    }

    @Override
    public void removeByUrl(String url) {
        if (StrUtil.isBlank(url)) {
            return;
        }
        UploadFile record = this.getOne(QueryWrapper.create().eq(UploadFile::getUrl, url));
        if (record == null) {
            return;
        }
        remove(record.getId());
    }

    @Override
    public FileVO getVo(UploadFile entity) {
        if (entity == null) {
            return null;
        }
        return FileVO.builder()
                .id(entity.getId())
                .url(entity.getUrl())
                .filename(entity.getFilename())
                .size(entity.getSize() == null ? 0L : entity.getSize().longValue())
                .build();
    }

    @Override
    public List<FileVO> getVoList(List<UploadFile> entities) {
        List<FileVO> list = new ArrayList<>();
        for (UploadFile entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    /**
     * 由原始文件名推导存储名：uuid + 原扩展名。
     */
    private String buildStoredName(String originalName) {
        String name = StrUtil.nullToEmpty(originalName);
        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot) : "";
        return IdUtil.fastSimpleUUID() + ext;
    }
}
