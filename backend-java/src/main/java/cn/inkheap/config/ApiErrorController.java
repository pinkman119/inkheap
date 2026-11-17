package cn.inkheap.config;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 统一 /error 输出为 {"statusCode":x,"message":"..."}，与前端错误读取方式一致
 * （Spring 默认的 {timestamp,status,error,path} 结构会让前端拿不到 message）。
 */
@Hidden
@RestController
public class ApiErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<Map<String, Object>> handleError(HttpServletRequest request) {
        Object statusCode = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = statusCode == null ? 500 : Integer.parseInt(String.valueOf(statusCode));
        HttpStatus httpStatus = HttpStatus.resolve(status);
        String message = switch (status) {
            case 404 -> "接口不存在";
            case 405 -> "请求方法不支持";
            case 401 -> "Unauthorized";
            case 403 -> "无权限";
            default -> "系统错误";
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", status);
        body.put("message", message);
        return ResponseEntity.status(httpStatus == null ? HttpStatus.INTERNAL_SERVER_ERROR : httpStatus).body(body);
    }
}
