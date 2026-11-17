package cn.inkheap.module.mail.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.config.AppProperties;
import cn.inkheap.module.mail.service.MailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * 「一封手写的信」邮件模板实现（绿色 kicker + serif 信纸 + 右对齐落款），
 * 用户可控内容一律 HTML 转义。SMTP 未配置时 fail-fast 抛 503。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private static final String ACCENT = "#2d8264";
    private static final String ACCENT_LIGHT = "#e9f4ef";
    private static final String ACCENT_BORDER = "#a8cdbd";
    private static final String RULE = "rgba(45, 130, 100, 0.2)";
    private static final String PAGE_BG = "#fafafa";
    private static final String CARD_BG = "#ffffff";
    private static final String BORDER = "#e8e8e8";
    private static final String TEXT = "#1a1a1a";
    private static final String TEXT2 = "#666666";
    private static final String TEXT3 = "#999999";
    private static final String FONT_SERIF = "'Noto Serif SC','Source Han Serif SC','STSong','SimSun',serif";
    private static final String FONT_MONO = "'JetBrains Mono','SFMono-Regular',Consolas,monospace";

    private final JavaMailSender mailSender;

    private final AppProperties appProperties;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUser;

    @Override
    public void sendRegisterCode(String toEmail, String code) {
        ensureConfigured();
        String html = buildLetter("朋友",
                new String[]{
                        "你正在注册「墨堆」的访客账号。注册成功后，就可以和数字生命聊天，也可以在知识库与小记下写信般的评论了。",
                        "这封信里装着你的注册验证码："
                }, code, "验证码 5 分钟内有效，请回到注册窗口输入。", null,
                new String[]{"如非本人操作，请忽略本邮件，无需任何操作。", "此信由墨堆自动寄出，请勿直接回复。"});
        String text = "【墨堆 · 一封来信】\n\n亲爱的朋友：\n\n你正在注册「墨堆」的访客账号。\n注册验证码：" + code
                + "\n验证码 5 分钟内有效。如非本人操作，请忽略本邮件。\n\n—— 墨堆 INKHEAP";
        send(toEmail, "墨堆来信 · 注册验证码", text, html);
    }

    @Override
    public void sendPassword(String toEmail, String nickname, String password) {
        ensureConfigured();
        String html = buildLetter(nickname,
                new String[]{"你在「墨堆」发起了密码找回。别担心，你的密码一直替你收在这封信里："},
                password, "请回到登录窗口，用这串密码登录；登录后请妥善保管。", null,
                new String[]{"如非本人操作，请尽快联系站长处理。", "此信由墨堆自动寄出，请勿直接回复。"});
        String text = "【墨堆 · 一封来信】\n\n亲爱的 " + nickname + "：\n\n你在「墨堆」发起了密码找回。\n你的密码："
                + password + "\n如非本人操作，请尽快联系站长。\n\n—— 墨堆 INKHEAP";
        send(toEmail, "墨堆来信 · 密码找回", text, html);
    }

    @Override
    public void sendCommentReply(String toEmail, String toNickname, String replierNickname,
                                 String originalContent, String replyContent, String pageDesc, String pageUrl) {
        ensureConfigured();
        String html = buildLetter(toNickname,
                new String[]{
                        "你在「墨堆」" + escapeHtml(pageDesc) + "的评论收到了一条新回复。你当时写道：",
                        quote(originalContent),
                        escapeHtml(replierNickname) + " 回复了你：",
                        quote(replyContent)
                }, null, null, new String[]{pageUrl, "去墨堆查看 →"},
                new String[]{"点击上面的按钮，可以跳转到对应页面继续这段对话。", "此信由墨堆自动寄出，请勿直接回复。"});
        String text = "【墨堆 · 一封来信】\n\n亲爱的 " + toNickname + "：\n\n你在「墨堆」" + pageDesc
                + "的评论收到了一条新回复。\n你的原话：" + clip(originalContent, 200) + "\n"
                + replierNickname + " 回复：" + clip(replyContent, 200) + "\n查看：" + pageUrl
                + "\n\n—— 墨堆 INKHEAP";
        send(toEmail, "墨堆来信 · 你的评论有新回复", text, html);
    }

    private void ensureConfigured() {
        if (StrUtil.isBlank(mailHost) || StrUtil.isBlank(mailUser) || StrUtil.isBlank(mailUser)) {
            throw new BusinessException(50300, "邮件服务未配置（SMTP_HOST/SMTP_USER/SMTP_PASS），请联系站长");
        }
    }

    private void send(String toEmail, String subject, String text, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(appProperties.getMailFrom());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSender.send(message);
            log.info("邮件已发送: {} -> {}", subject, toEmail);
        } catch (Exception e) {
            log.error("邮件发送失败: {} -> {}", subject, toEmail, e);
            throw new BusinessException(50300, "邮件发送失败，请稍后再试");
        }
    }

    private String quote(String content) {
        return "「" + escapeHtml(clip(content, 800)).replace("\n", "<br>") + "」";
    }

    private String clip(String raw, int maxLength) {
        String value = StrUtil.nullToEmpty(raw);
        return value.length() > maxLength ? value.substring(0, maxLength) + "…" : value;
    }

    private String escapeHtml(String raw) {
        return StrUtil.nullToEmpty(raw)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    /**
     * 组装信件模板：kicker + serif 信纸（每段一条横线）+ 大字内容 + 跳转按钮 + 右对齐落款。
     */
    private String buildLetter(String salutation, String[] lines, String emphasis, String emphasisDesc,
                               String[] link, String[] footnotes) {
        StringBuilder paper = new StringBuilder();
        if (lines != null) {
            for (String line : lines) {
                paper.append("<p style=\"margin:0;padding:0 2px 14px;font-family:").append(FONT_SERIF)
                        .append(";font-size:16px;line-height:32px;color:").append(TEXT)
                        .append(";border-bottom:1px solid ").append(RULE).append(";\">")
                        .append(line).append("</p>\n");
            }
        }
        if (StrUtil.isNotBlank(emphasis)) {
            paper.append("<p style=\"margin:10px 0 0;padding:0 2px 14px;font-family:").append(FONT_MONO)
                    .append(";font-size:30px;font-weight:700;letter-spacing:6px;color:").append(ACCENT)
                    .append(";border-bottom:1px solid ").append(RULE).append(";\">")
                    .append(escapeHtml(emphasis)).append("</p>\n");
        }
        if (StrUtil.isNotBlank(emphasisDesc)) {
            paper.append("<p style=\"margin:0;padding:0 2px 14px;font-family:").append(FONT_SERIF)
                    .append(";font-size:15px;line-height:32px;color:").append(TEXT2)
                    .append(";border-bottom:1px solid ").append(RULE).append(";\">")
                    .append(emphasisDesc).append("</p>\n");
        }

        StringBuilder linkBlock = new StringBuilder();
        if (link != null && link.length == 2) {
            linkBlock.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">")
                    .append("<tr><td align=\"center\" style=\"padding:20px 0 6px;\">")
                    .append("<a href=\"").append(escapeHtml(link[0]))
                    .append("\" style=\"display:inline-block;font-family:").append(FONT_SERIF)
                    .append(";font-size:15px;font-weight:600;text-decoration:none;color:#ffffff;background-color:")
                    .append(ACCENT).append(";border-radius:100px;padding:12px 36px;\">")
                    .append(escapeHtml(link[1])).append("</a></td></tr>")
                    .append("<tr><td align=\"center\" style=\"padding:0 0 8px;font-family:").append(FONT_MONO)
                    .append(";font-size:11.5px;line-height:1.8;color:").append(TEXT3)
                    .append(";word-break:break-all;\">").append(escapeHtml(link[0])).append("</td></tr></table>");
        }

        StringBuilder footnoteBlock = new StringBuilder();
        if (footnotes != null) {
            for (String footnote : footnotes) {
                footnoteBlock.append("<p style=\"margin:0 0 4px;\">").append(footnote).append("</p>");
            }
        }

        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy年MM月dd日"));
        return "<!DOCTYPE html><html lang=\"zh-CN\"><body style=\"margin:0;padding:0;background-color:"
                + PAGE_BG + ";\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\""
                + " style=\"background-color:" + PAGE_BG + ";\"><tr><td align=\"center\" style=\"padding:36px 12px;\">"
                + "<table role=\"presentation\" width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;"
                + "width:100%;background-color:" + CARD_BG + ";border:1px solid " + BORDER
                + ";border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);\">"
                + "<tr><td style=\"padding:28px 40px 0;\"><table role=\"presentation\" width=\"100%\"><tr>"
                + "<td align=\"left\"><span style=\"display:inline-block;font-family:" + FONT_MONO
                + ";font-size:12px;font-weight:500;letter-spacing:2px;color:" + ACCENT + ";border:1px solid "
                + ACCENT_BORDER + ";border-radius:100px;padding:4px 12px;background-color:" + ACCENT_LIGHT
                + ";\">INKHEAP · 来信</span></td>"
                + "<td align=\"right\" style=\"font-family:" + FONT_MONO + ";font-size:12.5px;color:" + TEXT3 + ";\">"
                + today + "</td></tr></table></td></tr>"
                + "<tr><td style=\"padding:22px 40px 8px;\">"
                + "<p style=\"margin:0 0 18px;font-family:" + FONT_SERIF + ";font-size:19px;font-weight:600;color:"
                + TEXT + ";\">亲爱的 <b style=\"color:" + ACCENT + ";\">" + escapeHtml(salutation) + "</b>：</p>"
                + paper + linkBlock + "</td></tr>"
                + "<tr><td style=\"padding:16px 40px 8px;\"><table role=\"presentation\" width=\"100%\"><tr>"
                + "<td align=\"right\" style=\"border-top:1px dashed " + BORDER + ";padding-top:16px;font-family:"
                + FONT_SERIF + ";font-size:16px;color:" + TEXT + ";\">墨堆&ensp;<span style=\"font-family:"
                + FONT_MONO + ";font-size:12.5px;letter-spacing:2px;color:" + TEXT3 + ";\">INKHEAP</span>"
                + "</td></tr></table></td></tr>"
                + "<tr><td style=\"padding:14px 40px 28px;font-family:" + FONT_MONO + ";font-size:12px;line-height:1.9;"
                + "color:" + TEXT3 + ";\">" + footnoteBlock + "</td></tr>"
                + "</table></td></tr></table></body></html>";
    }
}
