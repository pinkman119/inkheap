package cn.inkheap.module.contact.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.contact.entity.ContactMessage;
import cn.inkheap.module.contact.model.dto.ContactQueryRequest;
import cn.inkheap.module.contact.model.dto.SetReadManyRequest;
import cn.inkheap.module.contact.model.dto.SetReadRequest;
import cn.inkheap.module.contact.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 联系我来信管理接口（后台）。PUT / PUT 批量 / DELETE 均返回 200。
 */
@Tag(name = "联系我（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/contact")
public class ContactAdminController {

    @Resource
    private ContactService contactService;

    @Operation(summary = "来信列表", description = "声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize}（无 totalPages）")
    @GetMapping
    public BaseResponse<PageVO<ContactMessage>> findAll(ContactQueryRequest request) {
        return ResultUtils.ok(contactService.findAll(request));
    }

    @Operation(summary = "来信统计", description = "声明返回 BaseResponse<Map>，实际响应体为 {total,unread}")
    @GetMapping("stats")
    public BaseResponse<Map<String, Long>> stats() {
        return ResultUtils.ok(contactService.stats());
    }

    @Operation(summary = "标记已读/未读", description = "返回 200；声明返回 BaseResponse<ContactMessage>，实际响应体为 ContactMessage")
    @PutMapping("{id}/read")
    @ResponseStatus(HttpStatus.OK)
    @Log(module = LogModuleEnum.CONTACT, description = "标记来信已读状态")
    public BaseResponse<ContactMessage> setRead(@PathVariable String id,
                                                @RequestBody(required = false) SetReadRequest request) {
        boolean read = request == null || request.getRead() == null || request.getRead();
        return ResultUtils.ok(contactService.setRead(id, read));
    }

    @Operation(summary = "批量标记已读", description = "返回 200；声明返回 BaseResponse<Map>，实际响应体为 {count}")
    @PutMapping("read-many")
    @ResponseStatus(HttpStatus.OK)
    @Log(module = LogModuleEnum.CONTACT, description = "批量标记来信已读")
    public BaseResponse<Map<String, Object>> setReadMany(@RequestBody SetReadManyRequest request) {
        return ResultUtils.ok(contactService.setReadMany(request));
    }

    @Operation(summary = "删除来信", description = "返回 200 与被删除的来信；声明返回 BaseResponse<ContactMessage>，实际响应体为 ContactMessage")
    @DeleteMapping("{id}")
    @ResponseStatus(HttpStatus.OK)
    @Log(module = LogModuleEnum.CONTACT, description = "删除来信")
    public BaseResponse<ContactMessage> remove(@PathVariable String id) {
        return ResultUtils.ok(contactService.remove(id));
    }
}
