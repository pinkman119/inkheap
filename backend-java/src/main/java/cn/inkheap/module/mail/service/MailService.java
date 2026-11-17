package cn.inkheap.module.mail.service;

/**
 * 邮件服务：注册验证码 / 密码找回 / 评论回复通知。SMTP 未配置时发送即抛 503。
 */
public interface MailService {

    /**
     * 注册验证码邮件。
     *
     * @param toEmail 收件人
     * @param code    验证码
     */
    void sendRegisterCode(String toEmail, String code);

    /**
     * 密码找回邮件（发送明文密码）。
     *
     * @param toEmail  收件人
     * @param nickname 昵称
     * @param password 明文密码
     */
    void sendPassword(String toEmail, String nickname, String password);

    /**
     * 评论回复通知邮件。
     *
     * @param toEmail         收件人
     * @param toNickname      收件人昵称
     * @param replierNickname 回复人昵称
     * @param originalContent 被回复的评论内容
     * @param replyContent    本次回复内容
     * @param pageDesc        页面描述
     * @param pageUrl         跳转链接
     */
    void sendCommentReply(String toEmail, String toNickname, String replierNickname,
                          String originalContent, String replyContent, String pageDesc, String pageUrl);
}
