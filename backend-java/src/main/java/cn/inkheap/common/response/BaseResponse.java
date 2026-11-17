package cn.inkheap.common.response;

import cn.inkheap.common.exception.ErrorCode;
import lombok.Data;

import java.io.Serializable;

/**
 * 统一响应结构。真实 HTTP 响应体由 ResponseUnwrapAdvice 解包为 data 字段，
 * 以保持与原 Node 服务完全一致的前端契约。
 */
@Data
public class BaseResponse<T> implements Serializable {

    private int code;

    private String msg;

    private T data;

    public BaseResponse(int code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public BaseResponse(int code, T data) {
        this(code, "", data);
    }

    public BaseResponse(ErrorCode errorCode) {
        this(errorCode.getCode(), errorCode.getMessage(), null);
    }
}
