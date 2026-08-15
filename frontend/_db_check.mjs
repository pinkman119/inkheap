import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const purify = DOMPurify(new JSDOM('').window)

function normalizeYuqueImages(src) {
  return src
    .replace(/<!--\s*这是一张图片[^>]*-->\s*!\[([^\]]*)\]\(([^)\s]+)\)/g, '\n\n![$1]($2)\n\n')
    .replace(/<!--\s*这是一张图片[^>]*-->\s*\n+(\s*!\[[^\]]*\]\([^)\s]+\))/g, '\n\n$1\n\n')
}

function renderMarkdown(source) {
  if (!source) return ''
  const normalized = normalizeYuqueImages(source)
  const rawHtml = marked.parse(normalized)
  return purify.sanitize(rawHtml, { ADD_ATTR: ['target'] })
}

const src = `# 1 垃圾的产生
![](https://cdn.nlark.com/yuque/0/2023/webp/23025892/1694003703734-08fb72b2-371c-4099-87f2-9d379f4618b2.webp)
**示例代码**

1. 首先创建一个Object对象，并将对象挂载到window的test指针上，然后将Uint16Array对象挂载到test的属性a上：`

console.log('RAW_HTML:')
console.log(marked.parse(src))
console.log('FINAL:')
console.log(renderMarkdown(src))
