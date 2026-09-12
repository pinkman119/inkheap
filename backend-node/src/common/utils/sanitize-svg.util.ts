/**
 * 自定义图标 SVG 清洗。
 *
 * 后台录入的 SVG 会以前端 v-html 直接渲染，需在此剔除脚本、外链实体与事件属性，
 * 仅保留绘图内容；若清洗后不是完整的一对 <svg> 标签，则视为无效并返回 null。
 */
export function sanitizeSvg(svg?: string | null): string | null {
  if (!svg) return null;
  const cleaned = svg
    .replace(
      /<\s*(script|iframe|object|embed|link|style|foreignObject)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    .replace(/<\s*(script|iframe|object|embed|link|style|foreignObject)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
  return /<svg[\s\S]*<\/svg>/i.test(cleaned) ? cleaned : null;
}
