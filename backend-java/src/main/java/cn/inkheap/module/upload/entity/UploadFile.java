package cn.inkheap.module.upload.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 上传文件登记（files）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("files")
public class UploadFile {

    @Id(keyType = KeyType.None)
    private String id;

    private String filename;

    private String originalName;

    private String url;

    private String mimeType;

    private Integer size;

    private String relativePath;

    private Instant createdAt;
}
