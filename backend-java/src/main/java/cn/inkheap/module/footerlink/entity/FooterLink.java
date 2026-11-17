package cn.inkheap.module.footerlink.entity;

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
 * 页脚链接（footer_links）：type = nav / ext / social。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("footer_links")
public class FooterLink {

    @Id(keyType = KeyType.None)
    private String id;

    @Column("type")
    private String type;

    private Integer mode;

    private String label;

    private String url;

    private String icon;

    private String svg;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;
}
