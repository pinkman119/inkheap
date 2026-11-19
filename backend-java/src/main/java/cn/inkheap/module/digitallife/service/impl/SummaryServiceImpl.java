package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.module.digitallife.client.ChatModelRouter;
import cn.inkheap.module.digitallife.client.ModelClient;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.SummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 摘要生成：多模型按 sortOrder 依次尝试，任一成功即返回。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SummaryServiceImpl implements SummaryService {

    private static final String ARTICLE_PROMPT = String.join("\n",
            "你是一名资深中文编辑，擅长为技术博客撰写摘要。",
            "请阅读用户提供的文章正文（Markdown 格式），生成一段简洁、准确的摘要。",
            "要求：",
            "1. 使用中文，长度控制在 80~150 字；",
            "2. 概括文章的核心主题与关键结论，不要逐段复述，也不要加入正文没有的信息；",
            "3. 输出为一段纯文本：不要换行、不要 Markdown 标记、不要引号，",
            "   也不要出现「摘要」「本文」「总结」等标题式前缀；",
            "4. 只输出摘要本身，不要任何解释或额外说明。");

    private static final String NOTE_PROMPT = String.join("\n",
            "你是一名资深中文编辑，擅长为旅行随笔与相册小记撰写摘要。",
            "请阅读用户提供的小记正文（Markdown 格式），生成一段简洁、有画面感的摘要。",
            "要求：",
            "1. 使用中文，长度控制在 50~120 字；",
            "2. 概括小记的核心内容与情绪基调，不要逐段复述，也不要加入正文没有的信息；",
            "3. 输出为一段纯文本：不要换行、不要 Markdown 标记、不要引号，",
            "   也不要出现「摘要」「本文」「总结」等标题式前缀；",
            "4. 只输出摘要本身，不要任何解释或额外说明。");

    private static final int CONTENT_LIMIT = 8000;

    private final ModelConfigService modelConfigService;

    private final ChatModelRouter chatModelRouter;

    @Override
    public String generate(String content, String title) {
        return generateWith(content, title, ARTICLE_PROMPT, "文章标题：", "文章正文：");
    }

    @Override
    public String generateNote(String content, String title) {
        return generateWith(content, title, NOTE_PROMPT, "小记标题：", "小记正文：");
    }

    private String generateWith(String content, String title, String systemPrompt,
                                String titleLabel, String contentLabel) {
        // 1、正文校验与截断（控制 token 消耗）
        String body = StrUtil.nullToEmpty(content).trim();
        if (body.isEmpty()) {
            throw BusinessException.badRequest("正文内容为空，无法生成摘要");
        }
        String excerpt = body.length() > CONTENT_LIMIT ? body.substring(0, CONTENT_LIMIT) : body;

        // 2、组装 messages
        StringBuilder human = new StringBuilder();
        if (StrUtil.isNotBlank(title)) {
            human.append(titleLabel).append(title.trim()).append("\n");
        }
        human.append(contentLabel).append("\n").append(excerpt);
        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", human.toString()));

        // 3、按 sortOrder 依次尝试；全部失败（或无可用模型）时转 500
        List<ModelConfigService.ActiveModel> models = modelConfigService.getActiveModels(null);
        try {
            return chatModelRouter.chat(models, messages, this::normalize);
        } catch (ModelClient.ModelException e) {
            throw BusinessException.serverError("生成摘要失败：" + e.getMessage());
        }
    }

    private String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replaceAll("^\\s*[#>*\\-\\s]*\\s*(摘要|总结|导语|简介)\\s*[:：]?\\s*", "")
                .replaceAll("[\"'“”‘’]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
