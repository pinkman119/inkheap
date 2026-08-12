import { marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'

marked.use(gfmHeadingId())
marked.use({ gfm: true, breaks: false })

const html = marked.parse('## 为什么需要规格文件\n\n测试文字 **加粗文字** 内容。\n\n### 三个核心对象\n\n#### Spec（规格）\n\n更多**粗体**测试。')

console.log(html)
console.log('\n=== Heading outputs:')
const headingRegex = /<h[234][^>]*>[\s\S]*?<\/h[234]>/g
let match
while ((match = headingRegex.exec(html)) !== null) {
  console.log(match[0])
}
