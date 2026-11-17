package cn.inkheap.common.util;

import cn.hutool.core.util.StrUtil;

import java.util.regex.Pattern;

/**
 * 自定义图标 SVG 清洗：剔除脚本、外链实体与事件属性，仅保留绘图内容；
 * 清洗后若不是完整的一对 &lt;svg&gt; 标签则视为无效返回 null（对齐 sanitize-svg.util.ts）。
 */
public class SvgSanitizer {

    private static final String DANGEROUS_TAGS =
            "(script|iframe|object|embed|link|style|foreignObject)";

    private static final Pattern TAG_PAIR = Pattern.compile(
            "<\\s*" + DANGEROUS_TAGS + "\\b[\\s\\S]*?<\\s*/\\s*\\1\\s*>", Pattern.CASE_INSENSITIVE);

    private static final Pattern SINGLE_TAG = Pattern.compile(
            "<\\s*" + DANGEROUS_TAGS + "\\b[^>]*>", Pattern.CASE_INSENSITIVE);

    private static final Pattern EVENT_ATTR = Pattern.compile(
            "\\son\\w+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", Pattern.CASE_INSENSITIVE);

    private static final Pattern JAVASCRIPT = Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE);

    private static final Pattern SVG_ROOT = Pattern.compile("<svg[\\s\\S]*</svg>", Pattern.CASE_INSENSITIVE);

    private SvgSanitizer() {
    }

    public static String sanitize(String svg) {
        if (StrUtil.isBlank(svg)) {
            return null;
        }
        String cleaned = TAG_PAIR.matcher(svg).replaceAll("");
        cleaned = SINGLE_TAG.matcher(cleaned).replaceAll("");
        cleaned = EVENT_ATTR.matcher(cleaned).replaceAll("");
        cleaned = JAVASCRIPT.matcher(cleaned).replaceAll("");
        cleaned = cleaned.trim();
        return SVG_ROOT.matcher(cleaned).find() ? cleaned : null;
    }
}
