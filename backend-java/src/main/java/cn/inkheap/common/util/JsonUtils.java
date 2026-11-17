package cn.inkheap.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * JSON 工具：库里以 TEXT 存储的 JSON 字段（tags / photos / socialLinks / resume.content）统一在此解析。
 */
@Slf4j
public class JsonUtils {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonUtils() {
    }

    public static ObjectMapper mapper() {
        return MAPPER;
    }

    public static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            log.warn("JSON 序列化失败: {}", e.getMessage());
            return "[]";
        }
    }

    /**
     * 解析字符串数组，异常或非数组时返回空列表。
     */
    public static List<String> parseStringList(String raw) {
        if (raw == null || raw.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<Object> list = MAPPER.readValue(raw, new TypeReference<List<Object>>() {
            });
            List<String> result = new ArrayList<>(list.size());
            for (Object item : list) {
                if (item instanceof String text && !text.isEmpty()) {
                    result.add(text);
                }
            }
            return result;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * 解析对象数组（photos / socialLinks），异常时返回空列表。
     */
    public static List<Map<String, Object>> parseMapList(String raw) {
        if (raw == null || raw.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<Object> list = MAPPER.readValue(raw, new TypeReference<List<Object>>() {
            });
            List<Map<String, Object>> result = new ArrayList<>(list.size());
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    Map<String, Object> normalized = new LinkedHashMap<>();
                    map.forEach((k, v) -> normalized.put(String.valueOf(k), v));
                    result.add(normalized);
                }
            }
            return result;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * 解析 JSON 对象（resume.content），异常时返回空对象。
     */
    public static Map<String, Object> parseMap(String raw) {
        if (raw == null || raw.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return MAPPER.readValue(raw, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }
}
