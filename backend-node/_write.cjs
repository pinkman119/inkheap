const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const content = `# 1 垃圾的产生
![](https://cdn.nlark.com/yuque/0/2023/webp/23025892/1694003703734-08fb72b2-371c-4099-87f2-9d379f4618b2.webp)
**示例代码**

1. 首先创建一个Object对象，并将对象挂载到window的test指针上，然后将Uint16Array对象挂载到test的属性a上：`
;(async () => {
  try {
    await p.article.updateMany({ where: { slug: 'TEST' }, data: { content } })
    console.log('RESTORED TEST to plain img syntax')
  } catch (e) { console.log('ERR', e.message) }
  finally { await p.$disconnect() }
})()
