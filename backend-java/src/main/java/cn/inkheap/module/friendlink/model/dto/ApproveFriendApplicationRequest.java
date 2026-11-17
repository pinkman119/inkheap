package cn.inkheap.module.friendlink.model.dto;

import lombok.Data;

/**
 * 友链申请通过请求（字段为空时沿用申请内容）。
 */
@Data
public class ApproveFriendApplicationRequest {

    private String name;

    private String url;

    private String avatar;

    private String desc;

    private String tag;

    private String group;

    private Integer mode;

    private Integer sortOrder;
}
