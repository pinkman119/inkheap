package cn.inkheap.module.digitallife.service;

/**
 * 摘要生成服务：调用后台已启用的通用模型，多模型按 sortOrder 依次尝试。
 */
public interface SummaryService {

    /**
     * 生成文章摘要（80~150 字技术博客风格）。
     *
     * @param content 正文
     * @param title   标题（可为空）
     * @return 摘要文本
     */
    String generate(String content, String title);

    /**
     * 生成小记摘要（50~120 字旅行随笔 / 相册风格）。
     *
     * @param content 正文
     * @param title   标题（可为空）
     * @return 摘要文本
     */
    String generateNote(String content, String title);
}
