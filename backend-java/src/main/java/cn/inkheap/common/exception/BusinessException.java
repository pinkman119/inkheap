package cn.inkheap.common.exception;

import lombok.Getter;

/**
 * 自定义业务异常。
 */
@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = ErrorCode.BIZ_ERROR.getCode();
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.code = errorCode.getCode();
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(ErrorCode.PARAM_ERROR, message);
    }

    public static BusinessException unauthorized(String message) {
        return new BusinessException(ErrorCode.NOT_LOGIN, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCode.NO_AUTH, message);
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(ErrorCode.NOT_FOUND, message);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(ErrorCode.CONFLICT, message);
    }

    public static BusinessException tooManyRequests(String message) {
        return new BusinessException(ErrorCode.TOO_MANY_REQUESTS, message);
    }

    public static BusinessException serverError(String message) {
        return new BusinessException(ErrorCode.SYSTEM_ERROR, message);
    }
}
