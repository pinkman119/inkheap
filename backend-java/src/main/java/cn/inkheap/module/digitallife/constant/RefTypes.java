package cn.inkheap.module.digitallife.constant;

import java.util.List;

/**
 * 数字生命可训练的数据源类型（与 Node 端 RefType 一一对应）。
 */
public class RefTypes {

    private RefTypes() {
    }

    public static final String ARTICLE = "article";

    public static final String BLOG = "blog";

    public static final String RESUME = "resume";

    public static final String ABOUT_PROFILE = "about_profile";

    public static final String ABOUT_FOOTPRINT = "about_footprint";

    public static final String ABOUT_TRAVEL = "about_travel";

    public static final String ABOUT_EVENT = "about_event";

    public static final List<String> ALL = List.of(
            ARTICLE, BLOG, RESUME, ABOUT_PROFILE, ABOUT_FOOTPRINT, ABOUT_TRAVEL, ABOUT_EVENT);

    public static boolean isValid(String refType) {
        return ALL.contains(refType);
    }
}
