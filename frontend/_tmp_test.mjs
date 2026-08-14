import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const purify = DOMPurify(new JSDOM('').window)
const src = '<!-- 这是一张图片，ocr 内容为：OBJECT A WINDOW ARRAY WINDOW TEST A OBJECT 佳 -->\n\n![](https://cdn.nlark.com/yuque/0/2023/webp/23025892/1694003703734-08fb72b2-371c-4099-87f2-9d379f4618b2.webp)'
const html = marked.parse(src)
console.log('RAW:', html)
console.log('PURIFIED:', purify.sanitize(html, { ADD_ATTR: ['target'] }))
