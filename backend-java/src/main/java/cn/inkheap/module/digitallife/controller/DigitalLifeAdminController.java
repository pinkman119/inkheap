package cn.inkheap.module.digitallife.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.entity.DlPersona;
import cn.inkheap.module.digitallife.model.dto.DlModelRequest;
import cn.inkheap.module.digitallife.model.dto.PersonaUpdateRequest;
import cn.inkheap.module.digitallife.model.dto.TrainingQueryRequest;
import cn.inkheap.module.digitallife.model.vo.DlModelVO;
import cn.inkheap.module.digitallife.model.vo.TrainingListVO;
import cn.inkheap.module.digitallife.service.ChatAdminService;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.PersonaService;
import cn.inkheap.module.digitallife.service.TrainingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 数字生命后台管理接口（模型 / 人格 / 训练 / 会话）。
 */
@Tag(name = "数字生命（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/digital-life")
public class DigitalLifeAdminController {

    @Resource
    private ModelConfigService modelConfigService;

    @Resource
    private PersonaService personaService;

    @Resource
    private TrainingService trainingService;

    @Resource
    private ChatAdminService chatAdminService;

    @Operation(summary = "会话列表", description = "声明返回 BaseResponse<Map>，实际响应体为 {items,total,page,pageSize}")
    @GetMapping("sessions")
    public BaseResponse<Map<String, Object>> listSessions(@RequestParam(defaultValue = "1") String page,
                                                          @RequestParam(defaultValue = "20") String pageSize,
                                                          @RequestParam(required = false) String ip) {
        return ResultUtils.ok(chatAdminService.listSessions(Integer.parseInt(page), Integer.parseInt(pageSize), ip));
    }

    @Operation(summary = "会话详情", description = "声明返回 BaseResponse<Map>，实际响应体为 {items}")
    @GetMapping("sessions/messages")
    public BaseResponse<Map<String, Object>> sessionMessages(@RequestParam String userId,
                                                             @RequestParam(required = false) String sessionId) {
        return ResultUtils.ok(chatAdminService.getSessionMessages(userId, sessionId));
    }

    @Operation(summary = "模型列表", description = "声明返回 BaseResponse<List<DlModelVO>>，实际响应体为裸数组")
    @GetMapping("models")
    public BaseResponse<List<DlModelVO>> listModels() {
        return ResultUtils.ok(modelConfigService.list());
    }

    @Operation(summary = "新增模型", description = "声明返回 BaseResponse<Map>，实际响应体为 {id,success}")
    @PostMapping("models")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "新增数字生命模型")
    public BaseResponse<Map<String, Object>> createModel(@RequestBody DlModelRequest request) {
        return ResultUtils.ok(modelConfigService.create(request));
    }

    @Operation(summary = "删除模型", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("models/{id}")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "删除数字生命模型")
    public BaseResponse<Map<String, Object>> deleteModel(@PathVariable String id) {
        return ResultUtils.ok(modelConfigService.remove(id));
    }

    @Operation(summary = "更新模型", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @PutMapping("models/{id}")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "更新数字生命模型")
    public BaseResponse<Map<String, Object>> updateModel(@PathVariable String id,
                                                         @RequestBody DlModelRequest request) {
        return ResultUtils.ok(modelConfigService.update(id, request));
    }

    @Operation(summary = "启用/停用模型", description = "声明返回 BaseResponse<Map>，实际响应体为 {id,enabled,warning?}")
    @PutMapping("models/{id}/toggle")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "切换数字生命模型状态")
    public BaseResponse<Map<String, Object>> toggleModel(@PathVariable String id) {
        return ResultUtils.ok(modelConfigService.toggle(id));
    }

    @Operation(summary = "测试模型连通性", description = "声明返回 BaseResponse<Map>，实际响应体为 {success,message,latencyMs?}")
    @PostMapping("models/{id}/test")
    public BaseResponse<Map<String, Object>> testModel(@PathVariable String id) {
        return ResultUtils.ok(modelConfigService.test(id));
    }

    @Operation(summary = "人格列表", description = "声明返回 BaseResponse<List<DlPersona>>，实际响应体为裸数组")
    @GetMapping("personas")
    public BaseResponse<List<DlPersona>> listPersonas() {
        return ResultUtils.ok(personaService.list());
    }

    @Operation(summary = "人格详情", description = "声明返回 BaseResponse<DlPersona>，实际响应体为 DlPersona")
    @GetMapping("personas/{id}")
    public BaseResponse<DlPersona> getPersona(@PathVariable String id) {
        return ResultUtils.ok(personaService.detail(id));
    }

    @Operation(summary = "更新人格", description = "声明返回 BaseResponse<DlPersona>，实际响应体为 DlPersona")
    @PutMapping("personas/{id}")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "更新数字生命人格")
    public BaseResponse<DlPersona> updatePersona(@PathVariable String id,
                                                 @RequestBody PersonaUpdateRequest request) {
        return ResultUtils.ok(personaService.update(id, request));
    }

    @Operation(summary = "可训练内容列表", description = "声明返回 BaseResponse<TrainingListVO>，实际响应体为 {items,total,page,pageSize,totalPages,refType,refTypeLabel}")
    @GetMapping("training/{refType}")
    public BaseResponse<TrainingListVO> listTraining(@PathVariable String refType, TrainingQueryRequest request) {
        assertRefType(refType);
        return ResultUtils.ok(trainingService.list(refType, request));
    }

    @Operation(summary = "训练单条数据", description = "声明返回 BaseResponse<Map>，实际响应体为 {success,refType,refId,trainType,chunkCount}")
    @PostMapping("training/{refType}/{refId}/train")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "训练单条数据")
    public BaseResponse<Map<String, Object>> trainOne(@PathVariable String refType,
                                                      @PathVariable String refId,
                                                      @RequestBody(required = false) Map<String, Object> body) {
        assertRefType(refType);
        String embeddingModelId = body == null ? null : (String) body.get("embeddingModelId");
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("success", true);
        result.putAll(trainingService.trainOne(refType, refId, embeddingModelId));
        return ResultUtils.ok(result);
    }

    @Operation(summary = "移除训练", description = "声明返回 BaseResponse<Map>，实际响应体为 {success,refType,refId,trainType}")
    @PostMapping("training/{refType}/{refId}/remove")
    @Log(module = LogModuleEnum.DIGITAL_LIFE, description = "移除训练")
    public BaseResponse<Map<String, Object>> removeOne(@PathVariable String refType, @PathVariable String refId) {
        assertRefType(refType);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("success", true);
        result.putAll(trainingService.removeOne(refType, refId));
        return ResultUtils.ok(result);
    }

    private void assertRefType(String refType) {
        if (!RefTypes.isValid(refType)) {
            throw BusinessException.badRequest("无效的数据源类型：" + refType);
        }
    }
}
