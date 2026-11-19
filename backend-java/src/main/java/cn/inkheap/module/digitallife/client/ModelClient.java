package cn.inkheap.module.digitallife.client;

import cn.inkheap.common.util.JsonUtils;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.MetadataMode;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.reactive.JdkClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.function.Consumer;

/**
 * OpenAI 兼容客户端（chat / embeddings），底层交给 Spring AI 的 OpenAiChatModel / OpenAiEmbeddingModel。
 * - 模型实例按调用参数（baseUrl + apiKey + model）动态构建，不走 starter 自动配置，因此支持库里增删改的模型
 * - 统一 15s 连接超时、120s 读超时
 * - 非 2xx 时解析 error.message 抛出，供上层映射为业务错误
 * - 流式输出逐段回调（内部由 Spring AI 的 Flux&lt;ChatResponse&gt; 驱动，不再手写 SSE 解析）
 */
@Slf4j
@Component
public class ModelClient {

    /** 连接超时：建连阶段（DNS / TLS 握手） */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(15);

    /** 读超时：单次请求等待模型返回的最长时间 */
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(120);

    /** 采样温度：数值越高回复越发散 */
    private static final double TEMPERATURE = 0.7d;

    /** 单次回复最大 token 数 */
    private static final int MAX_TOKENS = 2048;

    /** 向量维度：与 dl_vectors.embedding 的 VECTOR(1024) 保持一致 */
    private static final int EMBEDDING_DIMENSIONS = 1024;

    /** 对话路径：baseUrl 已含 /v1（或各家等价前缀），这里只补后半段 */
    private static final String CHAT_PATH = "/chat/completions";

    /** 向量路径：同上，只补后半段 */
    private static final String EMBEDDINGS_PATH = "/embeddings";

    /**
     * 非流式对话（连通性测试 / 摘要生成）。
     *
     * @param baseUrl  模型服务基址（已含 /v1 等前缀）
     * @param apiKey   明文 API Key
     * @param model    模型标识，如 gpt-4o-mini、glm-4-plus
     * @param messages role/content 形式的消息列表（system / user / assistant）
     * @return 模型回复文本；响应为空时返回空串
     * @throws ModelException 请求失败、鉴权失败或返回内容无法解析
     */
    public String chat(String baseUrl, String apiKey, String model, List<Map<String, String>> messages) {
        try {
            ChatResponse response = chatModel(baseUrl, apiKey, model).call(prompt(messages));
            return textOf(response);
        } catch (Exception e) {
            throw asModelException(e);
        }
    }

    /**
     * 流式对话：逐段回调文本，读完返回。
     *
     * @param onDelta 每收到一段增量文本回调一次，由调用方负责拼接与推送前端
     * @throws ModelException 建连失败、服务端报错或流读取中断；中途失败时已回调的文本不会回滚
     */
    public void streamChat(String baseUrl, String apiKey, String model,
                           List<Map<String, String>> messages, Consumer<String> onDelta) {
        try {
            Flux<ChatResponse> flux = chatModel(baseUrl, apiKey, model).stream(prompt(messages));
            for (ChatResponse response : flux.timeout(READ_TIMEOUT).toIterable()) {
                String text = textOf(response);
                if (!text.isEmpty()) {
                    onDelta.accept(text);
                }
            }
        } catch (Exception e) {
            throw asModelException(e);
        }
    }

    /**
     * 文本向量化（固定 1024 维）。
     *
     * @param inputs 待向量化文本，支持批量
     * @return 与 inputs 顺序一致的向量列表；响应异常时返回空列表
     * @throws ModelException 请求失败或鉴权失败
     */
    public List<float[]> embed(String baseUrl, String apiKey, String model, List<String> inputs) {
        try {
            OpenAiEmbeddingOptions options = OpenAiEmbeddingOptions.builder()
                    .model(model)
                    .dimensions(EMBEDDING_DIMENSIONS)
                    .encodingFormat("float")
                    .build();
            OpenAiEmbeddingModel embeddingModel = new OpenAiEmbeddingModel(
                    api(baseUrl, apiKey), MetadataMode.EMBED, options);
            EmbeddingResponse response = embeddingModel.embedForResponse(inputs);
            List<float[]> vectors = new ArrayList<>(inputs.size());
            if (response == null || response.getResults() == null) {
                return vectors;
            }
            for (Embedding embedding : response.getResults()) {
                vectors.add(embedding.getOutput());
            }
            return vectors;
        } catch (Exception e) {
            throw asModelException(e);
        }
    }

    /**
     * 按调用参数构建对话模型，温度与 max_tokens 取全局默认值。
     *
     * @return 与该 baseUrl / apiKey / model 绑定的模型实例（每次调用新建，避免密钥常驻内存）
     */
    private OpenAiChatModel chatModel(String baseUrl, String apiKey, String model) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(model)
                .temperature(TEMPERATURE)
                .maxTokens(MAX_TOKENS)
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(api(baseUrl, apiKey))
                .defaultOptions(options)
                .build();
    }

    /**
     * 按 baseUrl + apiKey 构建 OpenAI 协议入口。
     * 非流式走 RestClient（15s 连接 / 120s 读超时），流式走 WebClient + JDK HttpClient 连接器。
     *
     * @param apiKey 为空时按空串处理，让服务端返回 401，便于连通性测试暴露「未配置 Key」
     */
    private OpenAiApi api(String baseUrl, String apiKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) CONNECT_TIMEOUT.toMillis());
        requestFactory.setReadTimeout((int) READ_TIMEOUT.toMillis());

        // 流式走 WebClient：用 JDK HttpClient 连接器，避免额外引入 reactor-netty
        JdkClientHttpConnector connector = new JdkClientHttpConnector(
                java.net.http.HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        connector.setReadTimeout(READ_TIMEOUT);

        return OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey == null ? "" : apiKey)
                // 复用库里 baseUrl 已含 /v1 的约定，路径与旧实现保持一致
                .completionsPath(CHAT_PATH)
                .embeddingsPath(EMBEDDINGS_PATH)
                .restClientBuilder(RestClient.builder().requestFactory(requestFactory))
                .webClientBuilder(WebClient.builder().clientConnector(connector))
                .build();
    }

    /**
     * 把 role/content 的 Map 消息转换成 Spring AI 的强类型 Message。
     * role 缺省或无法识别时按 user 处理，保证调用方能继续下发。
     */
    private Prompt prompt(List<Map<String, String>> messages) {
        List<Message> instructions = new ArrayList<>(messages.size());
        for (Map<String, String> message : messages) {
            String role = message.getOrDefault("role", "user");
            String content = message.getOrDefault("content", "");
            switch (role) {
                case "system" -> instructions.add(new SystemMessage(content));
                case "assistant" -> instructions.add(new AssistantMessage(content));
                default -> instructions.add(new UserMessage(content));
            }
        }
        return new Prompt(instructions);
    }

    /**
     * 安全取出响应文本：流式结束帧、以及只带 usage 的帧里 result / output 可能为 null，
     * 统一返回空串，避免调用方到处判空。
     */
    private String textOf(ChatResponse response) {
        if (response == null || response.getResult() == null) {
            return "";
        }
        AssistantMessage output = response.getResult().getOutput();
        if (output == null || output.getText() == null) {
            return "";
        }
        return output.getText();
    }

    /**
     * 把 Spring AI 抛出的异常统一成 {@link ModelException}，消息尽量保留服务端 error.message。
     *
     * @param throwable 原始异常（可能被线程池或 Reactor 包了一层）
     * @return 可直接展示给前端的模型调用异常
     */
    private ModelException asModelException(Throwable throwable) {
        Throwable cause = unwrap(throwable);
        if (cause instanceof ModelException modelException) {
            return modelException;
        }
        String message = extractMessage(cause);
        if (message == null || message.isBlank()) {
            message = "请求模型失败";
        }
        return new ModelException(message, cause);
    }

    /**
     * 拆掉线程池与 Reactor 的包装异常，取到原始异常。
     *
     * @return 最内层的真实异常；没有包装时原样返回
     */
    private Throwable unwrap(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null && current.getCause() != current && isWrapper(current)) {
            current = current.getCause();
        }
        return current;
    }

    /**
     * 包装类异常：线程池包装、以及 Reactor 消费 Flux 时抛出的 ReactiveException。
     */
    private boolean isWrapper(Throwable throwable) {
        return throwable instanceof CompletionException
                || throwable instanceof ExecutionException
                || throwable.getClass().getName().startsWith("reactor.core.Exceptions");
    }

    /**
     * 提取可展示的异常消息：HTTP 4xx/5xx 优先取服务端 error.message，其余直接用异常自带消息。
     *
     * @return 异常消息，可能为 null（由调用方兜底）
     */
    private String extractMessage(Throwable cause) {
        if (cause instanceof RestClientResponseException rest) {
            return extractError(rest.getResponseBodyAsString(), "HTTP " + rest.getStatusCode().value());
        }
        if (cause instanceof WebClientResponseException web) {
            return extractError(web.getResponseBodyAsString(), "HTTP " + web.getStatusCode().value());
        }
        return cause.getMessage();
    }

    /**
     * 从错误响应体中解析 error.message。
     *
     * @param fallback 解析不出时使用的兜底文案（通常是 HTTP 状态码）
     */
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

    /**
     * 解析 JSON，非法内容统一抛 {@link ModelException}。
     *
     * @param text 原始响应体，null 按空对象处理
     */
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

        /**
         * 只有可展示消息，没有底层异常。
         */
        public ModelException(String message) {
            super(message);
        }

        /**
         * 保留原始异常便于排查（鉴权失败、网络中断等）。
         */
        public ModelException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
