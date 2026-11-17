package cn.inkheap.module.digitallife.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 模型列表项：只给 hasApiKey / apiKeyMasked，不返回 Key 明文或密文。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DlModelVO {

    private String id;

    private String name;

    private String provider;

    private String modelId;

    private String modelType;

    private Boolean enabled;

    private Integer sortOrder;

    private Boolean hasApiKey;

    private String apiKeyMasked;
}
