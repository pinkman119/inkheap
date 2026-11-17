package cn.inkheap.common.util;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Markdown 相关工具：后端唯一的 Markdown 处理代码（仅 RSS 摘要需要「反向剥除」）。
 */
public class MarkdownUtils {

    private static final Pattern CODE_FENCE = Pattern.compile("```[\\s\\S]*?```");
    private static final Pattern INLINE_CODE = Pattern.compile("`([^`]*)`");
    private static final Pattern IMAGE = Pattern.compile("!\\[([^\\]]*)\\]\\([^)]*\\)");
    private static final Pattern LINK = Pattern.compile("\\[([^\\]]*)\\]\\([^)]*\\)");
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final Pattern HEADING = Pattern.compile("^[ \\t]{0,3}#{1,6}[ \\t]+", Pattern.MULTILINE);
    private static final Pattern QUOTE = Pattern.compile("^[ \\t]*>[ \\t]?", Pattern.MULTILINE);
    private static final Pattern LIST_MARK = Pattern.compile("^[ \\t]*[-*+][ \\t]+", Pattern.MULTILINE);
    private static final Pattern EMPHASIS = Pattern.compile("[*_~]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private MarkdownUtils() {
    }

    /**
     * 剥除 Markdown 语法，得到可读纯文本（顺序与原 Node 实现一致）。
     */
    public static String strip(String raw) {
        if (raw == null) {
            return "";
        }
        String text = CODE_FENCE.matcher(raw).replaceAll(" ");
        text = INLINE_CODE.matcher(text).replaceAll("$1");
        text = IMAGE.matcher(text).replaceAll("$1");
        text = LINK.matcher(text).replaceAll("$1");
        text = HTML_TAG.matcher(text).replaceAll(" ");
        text = HEADING.matcher(text).replaceAll("");
        text = QUOTE.matcher(text).replaceAll("");
        text = LIST_MARK.matcher(text).replaceAll("");
        text = EMPHASIS.matcher(text).replaceAll("");
        text = WHITESPACE.matcher(text).replaceAll(" ");
        return text.trim();
    }

    /**
     * 按 Unicode 码点截断，附省略号。
     */
    public static String truncate(String text, int limit) {
        if (text == null) {
            return "";
        }
        List<String> codePoints = new ArrayList<>(text.codePointCount(0, text.length()));
        text.codePoints().forEach(cp -> codePoints.add(new String(Character.toChars(cp))));
        if (codePoints.size() <= limit) {
            return text;
        }
        return String.join("", codePoints.subList(0, limit)) + "…";
    }
}
