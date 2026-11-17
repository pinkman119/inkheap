package cn.inkheap.module.friendlink.model.dto;

import lombok.Data;

/**
 * 友链新增 / 更新请求。
 */
@Data
public class FriendLinkRequest {

    private String name;

    private String url;

    private String avatar;

    private String desc;

    private String tag;

    private String group;

    private String message;

    private Integer mode;

    private String status;

    private Boolean isSelf;

    private Integer sortOrder;

    private String applicationId;
}
