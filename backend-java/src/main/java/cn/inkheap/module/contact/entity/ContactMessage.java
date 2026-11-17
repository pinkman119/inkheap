package cn.inkheap.module.contact.entity;

import com.mybatisflex.annotation.Column;
import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 联系我来信（contact_messages）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("contact_messages")
public class ContactMessage {

    @Id(keyType = KeyType.None)
    private String id;

    private String name;

    private String email;

    private String phone;

    private String subject;

    private String message;

    @Column("read")
    private Boolean read;

    private String contact;

    private Instant createdAt;

    private Instant updatedAt;
}
