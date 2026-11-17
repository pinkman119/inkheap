package cn.inkheap.common.advice;

import cn.inkheap.common.response.BaseResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * D2：把 BaseResponse 解包，只输出 data 字段，保持前端「裸对象」契约不变。
 * 只对声明返回 BaseResponse 的 Controller 方法生效，SSE / RSS / 代理等直写响应的接口不受影响。
 */
@RestControllerAdvice
public class ResponseUnwrapAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return BaseResponse.class.isAssignableFrom(returnType.getParameterType());
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request,
                                  ServerHttpResponse response) {
        if (body instanceof BaseResponse<?> baseResponse) {
            return baseResponse.getData();
        }
        return body;
    }
}
