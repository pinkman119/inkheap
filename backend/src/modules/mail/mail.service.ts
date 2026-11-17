import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/** SMTP 配置（环境变量）：未配置时邮件接口 fail-fast */
interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** HTML 转义：邮件正文包含密码（用户可控内容），防止注入破坏模板结构 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 超长内容截断（评论最多 2000 字，邮件里只保留前 maxLen 字） */
function clip(str: string, maxLen: number): string {
  const s = String(str || '');
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

/* ===== 站点主题色（与前端 tokens.css 对齐，邮件内联样式无法用 CSS 变量） ===== */
const C = {
  accent: '#2d8264', // --accent
  accentLight: '#e9f4ef', // --accent-light
  accentBorder: '#a8cdbd', // color-mix(accent 35%) 的实色近似
  rule: 'rgba(45, 130, 100, 0.2)', // 信纸横线
  page: '#fafafa', // --bg-body
  card: '#ffffff', // --bg-card
  border: '#e8e8e8', // --border
  text: '#1a1a1a', // --text-primary
  text2: '#666666', // --text-secondary
  text3: '#999999', // --text-tertiary
};
const FONT_SERIF = "'Noto Serif SC','Source Han Serif SC','STSong','SimSun',serif";
const FONT_MONO = "'JetBrains Mono','SFMono-Regular',Consolas,monospace";

/** 中文日期：与联系我页面 letter-date 同款格式 */
function letterDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`;
}

/**
 * 「一封手写的信」邮件模板：复刻联系我页面的信件设计——
 * 绿色 kicker 胶囊 + mono 日期 / serif 信纸（段落横线）/ 虚线分隔右对齐落款。
 * 邮件客户端兼容：table 布局 + 全内联样式；信纸横线用段落 border-bottom（Outlook 可用）。
 */
function buildLetterEmail(options: {
  salutation: string; // 称呼（「朋友」/用户昵称），accent 色加粗展示
  lines: Array<{ text: string; strong?: boolean }>; // 信纸正文段（每段一条横线）
  emphasis?: string; // 信纸上的大字内容（验证码/密码）
  emphasisDesc?: string; // 大字内容下方的说明段
  /** 快速跳转按钮（评论回复通知等场景）：胶囊按钮 + 下方明文链接兜底 */
  link?: { url: string; label: string };
  footnote: string[]; // 底部小字提示
}): string {
  const paperLines = options.lines
    .map(
      (l) =>
        `<p style="margin:0;padding:0 2px 14px;font-family:${FONT_SERIF};font-size:16px;line-height:32px;color:${C.text};border-bottom:1px solid ${C.rule};">${l.text}</p>`,
    )
    .join('\n          ');

  const emphasisBlock = options.emphasis
    ? `<p style="margin:10px 0 0;padding:0 2px 14px;font-family:${FONT_MONO};font-size:30px;font-weight:700;letter-spacing:6px;color:${C.accent};border-bottom:1px solid ${C.rule};">${escapeHtml(options.emphasis)}</p>`
    : '';

  const emphasisDesc = options.emphasisDesc
    ? `<p style="margin:0;padding:0 2px 14px;font-family:${FONT_SERIF};font-size:15px;line-height:32px;color:${C.text2};border-bottom:1px solid ${C.rule};">${options.emphasisDesc}</p>`
    : '';

  // 跳转按钮：居中胶囊 accent 按钮；部分客户端不渲染按钮样式时，下方明文链接兜底
  const linkBlock = options.link
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0 6px;">
                    <a href="${escapeHtml(options.link.url)}" style="display:inline-block;font-family:${FONT_SERIF};font-size:15px;font-weight:600;text-decoration:none;color:#ffffff;background-color:${C.accent};border-radius:100px;padding:12px 36px;">${escapeHtml(options.link.label)}</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 8px;font-family:${FONT_MONO};font-size:11.5px;line-height:1.8;color:${C.text3};word-break:break-all;">${escapeHtml(options.link.url)}</td>
                </tr>
              </table>`
    : '';

  const footnotes = options.footnote
    .map((t) => `<p style="margin:0 0 4px;">${t}</p>`)
    .join('\n          ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<body style="margin:0;padding:0;background-color:${C.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};">
    <tr>
      <td align="center" style="padding:36px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:${C.card};border:1px solid ${C.border};border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);">

          <!-- 信头：kicker 胶囊 + 日期 -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <span style="display:inline-block;font-family:${FONT_MONO};font-size:12px;font-weight:500;letter-spacing:2px;color:${C.accent};border:1px solid ${C.accentBorder};border-radius:100px;padding:4px 12px;background-color:${C.accentLight};">INKHEAP · 来信</span>
                  </td>
                  <td align="right" style="font-family:${FONT_MONO};font-size:12.5px;color:${C.text3};">${letterDate()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 信纸：serif + 横线 -->
          <tr>
            <td style="padding:22px 40px 8px;">
              <p style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:19px;font-weight:600;color:${C.text};">亲爱的 <b style="color:${C.accent};">${escapeHtml(options.salutation)}</b>：</p>
          ${paperLines}
          ${emphasisBlock}
          ${emphasisDesc}
          ${linkBlock}
            </td>
          </tr>

          <!-- 落款：虚线分隔，右对齐 -->
          <tr>
            <td style="padding:16px 40px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="right" style="border-top:1px dashed ${C.border};padding-top:16px;font-family:${FONT_SERIF};font-size:16px;color:${C.text};">
                    墨堆&ensp;<span style="font-family:${FONT_MONO};font-size:12.5px;letter-spacing:2px;color:${C.text3};">INKHEAP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 底部提示 -->
          <tr>
            <td style="padding:14px 40px 28px;font-family:${FONT_MONO};font-size:12px;line-height:1.9;color:${C.text3};">
          ${footnotes}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 邮件发送服务：nodemailer + 「一封手写的信」模板（注册验证码 / 密码找回 / 评论回复通知）。
 * - SMTP 环境变量缺失时发送即抛 503（ServiceUnavailableException），不静默吞掉
 * - 用户可控内容（评论原话/回复、昵称）均经 escapeHtml 转义后嵌入模板
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  /** 读取 SMTP 配置；缺失返回 null */
  private getConfig(): SmtpConfig | null {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      return null;
    }
    return {
      host,
      port: Number(process.env.SMTP_PORT) || 465,
      user,
      pass,
      from: process.env.SMTP_FROM || '墨堆 <noreply@inkheap.com>',
    };
  }

  private getTransporter(config: SmtpConfig): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        // 465 走隐式 SSL；587 等 STARTTLS 由 nodemailer 自动协商
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      });
    }
    return this.transporter;
  }

  /** 发送前校验配置：未配置直接抛 503（fail-fast） */
  private ensureConfig(): SmtpConfig {
    const config = this.getConfig();
    if (!config) {
      throw new ServiceUnavailableException('邮件服务未配置（SMTP_HOST/SMTP_USER/SMTP_PASS），请联系站长');
    }
    return config;
  }

  /** 注册验证码邮件 */
  async sendRegisterCode(toEmail: string, code: string): Promise<void> {
    const config = this.ensureConfig();
    const html = buildLetterEmail({
      salutation: '朋友',
      lines: [
        { text: '你正在注册「墨堆」的访客账号。注册成功后，就可以和数字生命聊天，也可以在知识库与小记下写信般的评论了。' },
        { text: '这封信里装着你的注册验证码：' },
      ],
      emphasis: code,
      emphasisDesc: '验证码 5 分钟内有效，请回到注册窗口输入。',
      footnote: [
        '如非本人操作，请忽略本邮件，无需任何操作。',
        '此信由墨堆自动寄出，请勿直接回复。',
      ],
    });
    const text =
      `【墨堆 · 一封来信】\n\n亲爱的朋友：\n\n` +
      `你正在注册「墨堆」的访客账号。\n注册验证码：${code}\n` +
      `验证码 5 分钟内有效。如非本人操作，请忽略本邮件。\n\n—— 墨堆 INKHEAP`;
    await this.send(config, { toEmail, subject: '墨堆来信 · 注册验证码', text, html });
  }

  /** 密码找回邮件：明文密码（AES-256-GCM 解密后），信纸大字展示 */
  async sendPassword(toEmail: string, nickname: string, password: string): Promise<void> {
    const config = this.ensureConfig();
    const html = buildLetterEmail({
      salutation: nickname,
      lines: [
        { text: '你在「墨堆」发起了密码找回。别担心，你的密码一直替你收在这封信里：' },
      ],
      emphasis: password,
      emphasisDesc: '请回到登录窗口，用这串密码登录；登录后请妥善保管。',
      footnote: [
        '如非本人操作，请尽快联系站长处理。',
        '此信由墨堆自动寄出，请勿直接回复。',
      ],
    });
    const text =
      `【墨堆 · 一封来信】\n\n亲爱的 ${nickname}：\n\n` +
      `你在「墨堆」发起了密码找回。\n你的密码：${password}\n` +
      `如非本人操作，请尽快联系站长。\n\n—— 墨堆 INKHEAP`;
    await this.send(config, { toEmail, subject: '墨堆来信 · 密码找回', text, html });
  }

  /** 评论回复通知邮件：被回复人原话 + 回复内容 + 跳转对应页面的链接（知识库/小记/邻居留言板） */
  async sendCommentReply(options: {
    toEmail: string;
    /** 被回复人昵称（收件人） */
    toNickname: string;
    /** 回复人昵称 */
    replierNickname: string;
    /** 被回复的原评论内容 */
    originalContent: string;
    /** 本次回复的内容 */
    replyContent: string;
    /** 评论所在位置描述，如「知识库《xxx》」/「小记《xxx》」/「邻居留言板」 */
    pageDesc: string;
    /** 跳转到对应页面的完整链接 */
    pageUrl: string;
  }): Promise<void> {
    const config = this.ensureConfig();
    const quote = (text: string) =>
      `「${escapeHtml(clip(text, 800)).replace(/\n/g, '<br>')}」`;
    const html = buildLetterEmail({
      salutation: options.toNickname,
      lines: [
        { text: `你在「墨堆」${escapeHtml(options.pageDesc)}的评论收到了一条新回复。你当时写道：` },
        { text: quote(options.originalContent) },
        { text: `${escapeHtml(options.replierNickname)} 回复了你：` },
        { text: quote(options.replyContent) },
      ],
      link: { url: options.pageUrl, label: '去墨堆查看 →' },
      footnote: [
        '点击上面的按钮，可以跳转到对应页面继续这段对话。',
        '此信由墨堆自动寄出，请勿直接回复。',
      ],
    });
    const text =
      `【墨堆 · 一封来信】\n\n亲爱的 ${options.toNickname}：\n\n` +
      `你在「墨堆」${options.pageDesc}的评论收到了一条新回复。\n` +
      `你的原话：${clip(options.originalContent, 200)}\n` +
      `${options.replierNickname} 回复：${clip(options.replyContent, 200)}\n` +
      `查看：${options.pageUrl}\n\n—— 墨堆 INKHEAP`;
    await this.send(config, {
      toEmail: options.toEmail,
      subject: '墨堆来信 · 你的评论有新回复',
      text,
      html,
    });
  }

  private async send(
    config: SmtpConfig,
    payload: { toEmail: string; subject: string; text: string; html: string },
  ): Promise<void> {
    try {
      await this.getTransporter(config).sendMail({
        from: config.from,
        to: payload.toEmail,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      this.logger.log(`邮件已发送: ${payload.subject} -> ${payload.toEmail}`);
    } catch (e: any) {
      this.logger.error(`邮件发送失败: ${payload.subject} -> ${payload.toEmail}: ${e?.message ?? e}`);
      throw new ServiceUnavailableException('邮件发送失败，请稍后再试');
    }
  }
}
