package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.module.digitallife.entity.ChatMessage;
import cn.inkheap.module.digitallife.mapper.ChatMessageMapper;
import cn.inkheap.module.digitallife.service.ChatAdminService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatAdminServiceImpl implements ChatAdminService {

    private final ChatMessageMapper chatMessageMapper;

    @Override
    public Map<String, Object> listSessions(int page, int pageSize, String ip) {
        int current = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));
        String ipKeyword = StrUtil.nullToEmpty(ip).trim().toLowerCase();

        // 1、按 (userId, sessionId) 聚合会话
        List<Map<String, Object>> groups = chatMessageMapper.groupSessions();

        // 2、IP 过滤：先找出命中的会话组合
        if (!ipKeyword.isEmpty()) {
            List<Map<String, Object>> matched = chatMessageMapper.searchByIp("%" + ipKeyword + "%");
            if (matched.isEmpty()) {
                return emptyResult(current, size);
            }
            Set<String> keys = new LinkedHashSet<>();
            for (Map<String, Object> row : matched) {
                keys.add(keyOf(row.get("userId"), row.get("sessionId")));
            }
            List<Map<String, Object>> filtered = new ArrayList<>();
            for (Map<String, Object> group : groups) {
                if (keys.contains(keyOf(group.get("userId"), group.get("sessionId")))) {
                    filtered.add(group);
                }
            }
            groups = filtered;
        }

        // 3、分页
        int total = groups.size();
        int from = Math.min((current - 1) * size, total);
        int to = Math.min(from + size, total);
        List<Map<String, Object>> pageGroups = groups.subList(from, to);

        // 4、补充展示 IP 与首条提问
        List<Map<String, Object>> items = new ArrayList<>(pageGroups.size());
        for (Map<String, Object> group : pageGroups) {
            String userId = String.valueOf(group.get("userId"));
            String sessionId = group.get("sessionId") == null ? null : String.valueOf(group.get("sessionId"));

            Map<String, Object> ipRow = chatMessageMapper.earliestIp(userId, sessionId);
            String firstMessage = chatMessageMapper.firstUserMessage(userId, sessionId);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("userId", userId);
            item.put("sessionId", sessionId);
            item.put("ip", ipRow == null ? null : ipRow.get("ip"));
            item.put("messageCount", group.get("messageCount"));
            item.put("lastMessageAt", group.get("lastMessageAt"));
            item.put("firstMessage", firstMessage);
            items.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("total", total);
        result.put("page", current);
        result.put("pageSize", size);
        return result;
    }

    @Override
    public Map<String, Object> getSessionMessages(String userId, String sessionId) {
        List<ChatMessage> messages = chatMessageMapper.selectListByQuery(QueryWrapper.create()
                .eq(ChatMessage::getUserId, userId)
                .eq(ChatMessage::getSessionId, sessionId)
                .orderBy(ChatMessage::getCreatedAt, true)
                .limit(500));

        List<Map<String, Object>> items = new ArrayList<>(messages.size());
        for (ChatMessage message : messages) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", message.getId());
            item.put("role", message.getRole());
            item.put("content", message.getContent());
            item.put("createdAt", message.getCreatedAt());
            items.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        return result;
    }

    private Map<String, Object> emptyResult(int page, int pageSize) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", new ArrayList<>());
        result.put("total", 0);
        result.put("page", page);
        result.put("pageSize", pageSize);
        return result;
    }

    private String keyOf(Object userId, Object sessionId) {
        return userId + "|" + (sessionId == null ? "" : sessionId);
    }
}
