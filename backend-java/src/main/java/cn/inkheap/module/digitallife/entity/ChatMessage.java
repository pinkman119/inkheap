package cn.inkheap.module.digitallife.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 数字生命会话消息（chat_messages）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("chat_messages")
public class ChatMessage {

    @Id(keyType = KeyType.None)
    private String id;

    private String userId;

    private String sessionId;

    private String role;

    private String content;

    private String ip;

    private Instant createdAt;
}
