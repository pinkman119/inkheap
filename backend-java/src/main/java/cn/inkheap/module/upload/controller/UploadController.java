package cn.inkheap.module.upload.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.upload.model.vo.FileVO;
import cn.inkheap.module.upload.service.UploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * 图片上传接口（后台）。
 */
@Tag(name = "上传")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/upload")
public class UploadController {

    @Resource
    private UploadService uploadService;

    @Operation(summary = "上传图片", description = "表单字段名 file，5MB 上限，仅 png/jpeg/gif/webp；声明返回 BaseResponse<FileVO>，实际响应体为 FileVO")
    @PostMapping
    @Log(module = LogModuleEnum.UPLOAD, description = "上传图片")
    public BaseResponse<FileVO> upload(@RequestParam("file") MultipartFile file) {
        return ResultUtils.ok(uploadService.persist(file));
    }

    @Operation(summary = "删除图片", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.UPLOAD, description = "删除图片")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        uploadService.remove(id);
        Map<String, Object> result = new HashMap<>(1);
        result.put("success", true);
        return ResultUtils.ok(result);
    }
}
