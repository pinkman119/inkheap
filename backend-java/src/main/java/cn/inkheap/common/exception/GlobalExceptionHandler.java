package cn.inkheap.common.exception;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 全局异常处理：输出与原 Node 服务一致的 {statusCode,message}，并映射到正确的 HTTP 状态码。
 * 前端 useApi 只读 message，且依赖 res.status === 401 做登出跳转。
 */
@Hidden
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> businessExceptionHandler(BusinessException e, HttpServletRequest request) {
        log.warn("业务异常 [{} {}] code={} message={}", request.getMethod(), request.getRequestURI(), e.getCode(), e.getMessage());
        return build(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> methodArgumentNotValidHandler(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError == null ? "参数错误" : fieldError.getDefaultMessage();
        return build(ErrorCode.PARAM_ERROR.getCode(), message);
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<Map<String, Object>> bindExceptionHandler(BindException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError == null ? "参数错误" : fieldError.getDefaultMessage();
        return build(ErrorCode.PARAM_ERROR.getCode(), message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> constraintViolationHandler(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .findFirst()
                .map(ConstraintViolation::getMessage)
                .orElse("参数错误");
        return build(ErrorCode.PARAM_ERROR.getCode(), message);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> missingParamHandler(MissingServletRequestParameterException e) {
        return build(ErrorCode.PARAM_ERROR.getCode(), "缺少参数：" + e.getParameterName());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> typeMismatchHandler(MethodArgumentTypeMismatchException e) {
        return build(ErrorCode.PARAM_ERROR.getCode(), "参数格式错误：" + e.getName());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> notReadableHandler(HttpMessageNotReadableException e) {
        return build(ErrorCode.PARAM_ERROR.getCode(), "请求体格式错误");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> uploadSizeHandler(MaxUploadSizeExceededException e) {
        return build(ErrorCode.PARAM_ERROR.getCode(), "文件过大，最大支持 5MB");
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, Object>> noHandlerHandler(NoHandlerFoundException e) {
        return build(ErrorCode.NOT_FOUND.getCode(), "接口不存在：" + e.getRequestURL());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> methodNotSupportedHandler(HttpRequestMethodNotSupportedException e) {
        return build(ErrorCode.NOT_FOUND.getCode(), "请求方法不支持：" + e.getMethod());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> runtimeExceptionHandler(RuntimeException e, HttpServletRequest request) {
        log.error("运行时异常 [{} {}]", request.getMethod(), request.getRequestURI(), e);
        return build(ErrorCode.SYSTEM_ERROR.getCode(), "系统错误");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> exceptionHandler(Exception e, HttpServletRequest request) {
        log.error("未知异常 [{} {}]", request.getMethod(), request.getRequestURI(), e);
        return build(ErrorCode.SYSTEM_ERROR.getCode(), "系统错误");
    }

    /**
     * 统一错误体：{"statusCode":404,"message":"..."}。
     */
    private ResponseEntity<Map<String, Object>> build(int code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        HttpStatus status = ErrorCode.toHttpStatus(code);
        body.put("statusCode", status.value());
        body.put("message", message == null ? "" : message);
        return ResponseEntity.status(status).body(body);
    }
}
