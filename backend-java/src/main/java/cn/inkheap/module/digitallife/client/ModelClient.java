package cn.inkheap.module.digitallife.client;

import cn.inkheap.common.util.JsonUtils;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * OpenAI 兼容客户端（chat / embeddings），按 provider 拼端点。
 * - 统一 15s 连接超时、120s 读超时
 * - 非 2xx 时解析 error.message 抛出，供上层映射为业务错误
 * - 流式输出逐段回调（SSE data: 行）
 */
@Slf4j
@Component
public class ModelClient {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(15);

    private static final Duration READ_TIMEOUT = Duration.ofSeconds(120);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            .build();

    /**
     * 非流式对话（连通性测试 / 摘要生成）。
     */
    public String chat(String baseUrl, String apiKey, String model, List<Map<String, String>> messages) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", messages);
        payload.put("temperature", 0.7);
        payload.put("max_tokens", 2048);
        payload.put("stream", false);

        HttpResponse<String> response = post(baseUrl + "/chat/completions", apiKey, payload, HttpResponse.BodyHandlers.ofString());
        JsonNode root = readJson(response.body());
        JsonNode content = root.path("choices").path(0).path("message").path("content");
        return content.isMissingNode() ? "" : content.asText("");
    }

    /**
     * 流式对话：逐段回调文本，读完返回。
     */
    public void streamChat(String baseUrl, String apiKey, String model,
                           List<Map<String, String>> messages, Consumer<String> onDelta) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", messages);
        payload.put("temperature", 0.7);
        payload.put("max_tokens", 2048);
        payload.put("stream", true);

        HttpResponse<InputStream> response = post(baseUrl + "/chat/completions", apiKey, payload,
                HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream inputStream = response.body();
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || !trimmed.startsWith("data:")) {
                    continue;
                }
                String data = trimmed.substring(5).trim();
                if ("[DONE]".equals(data)) {
                    break;
                }
                JsonNode node = readJson(data);
                JsonNode delta = node.path("choices").path(0).path("delta").path("content");
                if (!delta.isMissingNode() && !delta.isNull()) {
                    String text = delta.asText("");
                    if (!text.isEmpty()) {
                        onDelta.accept(text);
                    }
                }
            }
        } catch (Exception e) {
            throw new ModelException("流式读取失败：" + e.getMessage(), e);
        }
    }

    /**
     * 文本向量化（固定 1024 维，encoding_format=float）。
     */
    public List<float[]> embed(String baseUrl, String apiKey, String model, List<String> inputs) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("input", inputs);
        payload.put("dimensions", 1024);
        payload.put("encoding_format", "float");

        HttpResponse<String> response = post(baseUrl + "/embeddings", apiKey, payload,
                HttpResponse.BodyHandlers.ofString());
        JsonNode root = readJson(response.body());
        JsonNode data = root.path("data");
        List<float[]> vectors = new ArrayList<>(inputs.size());
        if (data.isArray()) {
            for (JsonNode item : data) {
                JsonNode embedding = item.path("embedding");
                float[] vector = new float[embedding.size()];
                for (int i = 0; i < embedding.size(); i++) {
                    vector[i] = (float) embedding.get(i).asDouble();
                }
                vectors.add(vector);
            }
        }
        return vectors;
    }

    private <T> HttpResponse<T> post(String url, String apiKey, Object payload,
                                     HttpResponse.BodyHandler<T> handler) {
        try {
            String body = JsonUtils.mapper().writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(READ_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<T> response = httpClient.send(request, handler);
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = "HTTP " + response.statusCode();
                if (response.body() instanceof String text) {
                    message = extractError(text, message);
                }
                throw new ModelException(message);
            }
            return response;
        } catch (ModelException e) {
            throw e;
        } catch (Exception e) {
            throw new ModelException(e.getMessage() == null ? "请求模型失败" : e.getMessage(), e);
        }
    }

    private String extractError(String body, String fallback) {
        try {
            JsonNode root = readJson(body);
            JsonNode error = root.path("error");
            if (error.isObject()) {
                String message = error.path("message").asText("");
                return message.isEmpty() ? fallback : message;
            }
            String message = root.path("message").asText("");
            return message.isEmpty() ? fallback : message;
        } catch (Exception e) {
            return fallback;
        }
    }

    private JsonNode readJson(String text) {
        try {
            return JsonUtils.mapper().readTree(text == null ? "{}" : text);
        } catch (Exception e) {
            throw new ModelException("模型返回内容解析失败");
        }
    }

    /**
     * 模型调用异常（消息可直接展示给前端）。
     */
    public static class ModelException extends RuntimeException {

        public ModelException(String message) {
            super(message);
        }

        public ModelException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
