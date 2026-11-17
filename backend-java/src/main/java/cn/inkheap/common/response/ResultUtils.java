package cn.inkheap.common.response;

import cn.inkheap.common.exception.ErrorCode;

/**
 * 响应构造工具。
 */
public class ResultUtils {

    private ResultUtils() {
    }

    public static <T> BaseResponse<T> ok(T data) {
        return new BaseResponse<>(ErrorCode.SUCCESS.getCode(), "ok", data);
    }

    public static BaseResponse<Void> ok() {
        return new BaseResponse<>(ErrorCode.SUCCESS.getCode(), "ok", null);
    }

    public static <T> BaseResponse<T> error(String msg) {
        return new BaseResponse<>(ErrorCode.SYSTEM_ERROR.getCode(), msg, null);
    }

    public static <T> BaseResponse<T> error(int code, String msg) {
        return new BaseResponse<>(code, msg, null);
    }

    public static <T> BaseResponse<T> error(ErrorCode errorCode) {
        return new BaseResponse<>(errorCode.getCode(), errorCode.getMessage(), null);
    }
}
