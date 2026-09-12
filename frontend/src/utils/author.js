/**
 * 解析文章作者的展示名与跳转链接。
 *
 * 规则：
 * - 作者名：文章配置的 author，留空时回退站点名（后台「首页管理」的 siteName）
 * - 跳转链接：文章配置的 authorUrl，留空时默认跳转站点首页 '/'
 * - 以 '/' 或 '#' 开头的视为站内地址；其余视为站外，缺协议时自动补 https://
 * - isExternal 为 true 表示渲染时应新窗口打开
 */
export function resolveAuthor(author, authorUrl, fallbackName = '') {
  const name = (author || '').trim() || fallbackName
  let href = (authorUrl || '').trim()

  if (!href) return { name, href: '/', isExternal: false }
  if (href.startsWith('/') || href.startsWith('#')) {
    return { name, href, isExternal: false }
  }
  // 未写协议（如 example.com / www.example.com）时补全为 https
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) href = `https://${href}`
  return { name, href, isExternal: true }
}
