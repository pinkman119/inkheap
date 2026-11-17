/**
 * 页脚「社交图标」可用预设图标。
 *
 * 说明：前端持有一份同名同序的可视化图标库（frontend/src/utils/footer-icons.js），
 * 此处仅用于服务端入参校验，两侧 key 必须保持一致。
 */
export const FOOTER_ICON_KEYS = [
  // 品牌图标（自带配色，hover 时转为跟随文字的剪影）
  'github',
  'yuque',
  'twitter',
  // 线性图标（跟随 currentColor，自适应浅色 / 深色主题）
  'mail',
  'send',
  'message',
  'at',
  'phone',
  'rss',
  'link',
  'globe',
  'book',
  'code',
  'edit',
  'image',
  'camera',
  'video',
  'music',
  'star',
  'heart',
] as const;

/** 页脚链接类型：nav = 导航（站内路由），ext = 扩展（外链），social = 社交图标 */
export const FOOTER_LINK_TYPES = ['nav', 'ext', 'social'] as const;
