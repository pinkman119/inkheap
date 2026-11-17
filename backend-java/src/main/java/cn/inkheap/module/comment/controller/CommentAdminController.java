package cn.inkheap.module.comment.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.comment.model.dto.CommentQueryRequest;
import cn.inkheap.module.comment.model.vo.AdminCommentVO;
import cn.inkheap.module.comment.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 后台评论管理接口。
 */
@Tag(name = "评论（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/comments")
public class CommentAdminController {

    @Resource
    private CommentService commentService;

    @Operation(summary = "评论列表", description = "声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize}")
    @GetMapping
    public BaseResponse<PageVO<AdminCommentVO>> list(CommentQueryRequest request) {
        return ResultUtils.ok(commentService.adminList(request));
    }

    @Operation(summary = "删除评论", description = "顶层连带删除回复，返回 200；声明返回 BaseResponse<Map>，实际响应体为 {deleted,cascaded}")
    @DeleteMapping("{id}")
    @ResponseStatus(HttpStatus.OK)
    @Log(module = LogModuleEnum.COMMENT, description = "删除评论")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(commentService.adminDelete(id));
    }
}
