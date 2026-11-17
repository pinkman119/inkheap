package cn.inkheap.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 错误响应码。code 同时承担「HTTP 状态码映射」的职责：
 * GlobalExceptionHandler 会把 40000/40100/40101/40400/40900/42900/50000 映射到对应 HTTP 状态。
 */
@Getter
public enum ErrorCode {

    SUCCESS(0, "成功", HttpStatus.OK),
    PARAM_ERROR(40000, "参数错误", HttpStatus.BAD_REQUEST),
    NOT_LOGIN(40100, "未登录", HttpStatus.UNAUTHORIZED),
    NO_AUTH(40101, "无权限", HttpStatus.FORBIDDEN),
    NOT_FOUND(40400, "请求资源不存在", HttpStatus.NOT_FOUND),
    CONFLICT(40900, "资源冲突", HttpStatus.CONFLICT),
    TOO_MANY_REQUESTS(42900, "请求过于频繁", HttpStatus.TOO_MANY_REQUESTS),
    SYSTEM_ERROR(50000, "服务器内部错误", HttpStatus.INTERNAL_SERVER_ERROR),
    BIZ_ERROR(50001, "业务逻辑错误", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;

    private final String message;

    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    /**
     * 按业务码反查 HTTP 状态：4xxxx 取前三位，5xxxx 归 500。
     */
    public static HttpStatus toHttpStatus(int code) {
        for (ErrorCode errorCode : values()) {
            if (errorCode.code == code) {
                return errorCode.httpStatus;
            }
        }
        if (code >= 40000 && code < 50000) {
            int status = code / 100;
            HttpStatus resolved = HttpStatus.resolve(status);
            return resolved == null ? HttpStatus.BAD_REQUEST : resolved;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
