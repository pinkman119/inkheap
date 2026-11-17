package cn.inkheap.module.comment.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.auth.CurrentUser;
import cn.inkheap.common.auth.CurrentUserParam;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.RoleEnum;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.comment.model.dto.CommentQueryRequest;
import cn.inkheap.module.comment.model.dto.CreateCommentRequest;
import cn.inkheap.module.comment.model.vo.CommentItemVO;
import cn.inkheap.module.comment.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 前台评论接口：GET 公开可读，POST 需访客登录（返回 200）。
 */
@Tag(name = "评论（前台）")
@RestController
@RequestMapping(ApiPrefix.V1)
public class CommentPublicController {

    @Resource
    private CommentService commentService;

    @Operation(summary = "评论列表", description = "声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize}（无 totalPages）")
    @GetMapping("public/comments")
    public BaseResponse<PageVO<CommentItemVO>> list(CommentQueryRequest request) {
        return ResultUtils.ok(commentService.list(request));
    }

    @Operation(summary = "发表评论/回复", description = "需访客登录，返回 200；声明返回 BaseResponse<CommentItemVO>，实际响应体为 CommentItemVO")
    @Auth(allow = RoleEnum.USER)
    @PostMapping("user/comments")
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<CommentItemVO> create(@CurrentUserParam CurrentUser currentUser,
                                              @RequestBody CreateCommentRequest request,
                                              HttpServletRequest httpRequest) {
        String scheme = httpRequest.getHeader("X-Forwarded-Proto");
        if (scheme == null || scheme.isBlank()) {
            scheme = httpRequest.getScheme();
        }
        String host = httpRequest.getHeader("Host");
        String baseUrl = scheme + "://" + (host == null ? "" : host);
        return ResultUtils.ok(commentService.create(currentUser.getId(), request, baseUrl));
    }
}
