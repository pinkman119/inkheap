package cn.inkheap.module.upload.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 上传结果：{id,url,filename,size}。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileVO {

    private String id;

    private String url;

    private String filename;

    private Long size;
}
