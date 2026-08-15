const F = 'C:/Users/admin/Desktop/inkheap/frontend/node_modules'
const { PrismaClient } = require('@prisma/client')
const { JSDOM } = require(F + '/jsdom')
const { marked } = require(F + '/marked')
const DOMPurify = require(F + '/dompurify')
const purify = DOMPurify(new JSDOM('').window)

function normalizeYuqueImages(src) {
  return src
    .replace(/<!--\s*这是一张图片[^>]*-->\s*!\[([^\]]*)\]\(([^)\s]+)\)/g, '\n\n![$1]($2)\n\n')
    .replace(/<!--\s*这是一张图片[^>]*-->\s*\n+(\s*!\[[^\]]*\]\([^)\s]+\))/g, '\n\n$1\n\n')
}
function renderMarkdown(source) {
  if (!source) return ''
  return purify.sanitize(marked.parse(normalizeYuqueImages(source)), { ADD_ATTR: ['target'] })
}

const p = new PrismaClient()
;(async () => {
  try {
    const a = await p.article.findFirst({ where: { slug: { contains: 'rag' } } })
    const content = a.content
    const i = content.indexOf('这是一张图片')
    console.log('FULL IMG BLOCK:', JSON.stringify(content.slice(i - 5, i + 130)))
    console.log('RENDERED HAS IMG:', renderMarkdown(content).includes('<img'))
    const html = renderMarkdown(content)
    const m = html.match(/<img[^>]*src="([^"]+)"/)
    console.log('FIRST IMG SRC:', m ? m[1] : '(none)')
  } catch (e) {
    console.log('ERR', e.message)
  } finally {
    await p.$disconnect()
  }
})()
