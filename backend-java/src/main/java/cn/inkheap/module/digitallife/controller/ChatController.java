package cn.inkheap.module.digitallife.controller;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.auth.CurrentUser;
import cn.inkheap.common.auth.CurrentUserParam;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.RoleEnum;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.module.digitallife.model.dto.ChatRequest;
import cn.inkheap.module.digitallife.service.ChatService;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.RateLimitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 数字生命前台聊天接口（SSE：delta / done / error）。
 * 开流前的错误（400 空内容 / 429 限流 / 409 无可用模型）仍返回 JSON。
 */
@Tag(name = "数字生命（前台）")
@Auth(allow = RoleEnum.USER)
@RestController
@RequestMapping(ApiPrefix.USER + "/digital-life")
public class ChatController {

    private static final long SSE_TIMEOUT_MS = 5 * 60 * 1000L;

    @Resource
    private ChatService chatService;

    @Resource
    private RateLimitService rateLimitService;

    @Resource
    private ModelConfigService modelConfigService;

    @Resource
    @Qualifier("inkheapExecutor")
    private ThreadPoolTaskExecutor executor;

    @Operation(summary = "可选通用模型", description = "声明返回 BaseResponse<Map>，实际响应体为 {items}")
    @GetMapping("models")
    public BaseResponse<Map<String, Object>> getModels() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", modelConfigService.listGeneralModels());
        return ResultUtils.ok(result);
    }

    @Operation(summary = "历史消息", description = "最近 100 条，时间正序；声明返回 BaseResponse<Map>，实际响应体为 {items}")
    @GetMapping("messages")
    public BaseResponse<Map<String, Object>> getMessages(@CurrentUserParam CurrentUser currentUser,
                                                         @RequestParam(required = false) String sessionId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", chatService.getHistory(currentUser.getId(), sessionId, 100));
        return ResultUtils.ok(result);
    }

    @Operation(summary = "SSE 流式对话", description = "事件名 delta / done / error；开流前错误返回 JSON（400 / 429 带 retryAfterSeconds / 409）")
    @PostMapping("chat")
    public Object chat(@CurrentUserParam CurrentUser currentUser,
                       @RequestBody ChatRequest request,
                       HttpServletRequest httpRequest) {
        String content = StrUtil.nullToEmpty(request.getContent()).trim();

        // 1、空内容：400 JSON（不进入 SSE）
        // todo 问题内容合规性检查
        if (content.isEmpty()) {
            throw BusinessException.badRequest("消息内容不能为空");
        }

        // 2、令牌桶限流：超限直接 429 JSON（带 retryAfterSeconds）
        RateLimitService.RateLimitResult limit = rateLimitService.consume(currentUser.getId());
        if (!limit.allowed()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("statusCode", 429);
            body.put("message", "提问过于频繁，请等待 " + limit.retryAfterSeconds() + " 秒后再试");
            body.put("retryAfterSeconds", limit.retryAfterSeconds());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
        }

        // 3、模型预检查：无可用模型时 409 JSON（必须在开流之前）
        modelConfigService.ensureActiveModel(request.getModelId());

        // 4、开启 SSE 流并在异步线程中生成
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        String clientIp = IpUtils.getClientIp(httpRequest);
        String sessionId = StrUtil.emptyToNull(request.getSessionId());

        executor.execute(() -> {
            try {
                chatService.run(currentUser.getId(), sessionId, content,
                        new ChatService.ChatOptions(
                                request.getModelId(),
                                clientIp,
                                text -> send(emitter, "delta", Map.of("text", text)),
                                (messageId, full) -> {
                                    send(emitter, "done", Map.of("messageId", messageId, "content", full));
                                    emitter.complete();
                                },
                                message -> {
                                    send(emitter, "error", Map.of("message", message));
                                    emitter.complete();
                                }));
            } catch (Exception e) {
                send(emitter, "error", Map.of("message",
                        e.getMessage() == null ? "生成回复失败，请稍后再试" : e.getMessage()));
                emitter.complete();
            }
        });

        return emitter;
    }

    /**
     * 写入 SSE 事件；客户端断开时忽略异常（避免日志噪音）。
     */
    private void send(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(JsonUtils.toJson(data), MediaType.APPLICATION_JSON));
        } catch (Exception e) {
            // 客户端已断开：忽略
        }
    }
}
