const { chromium } = require('C:/Users/admin/Desktop/inkheap/frontend/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('http://localhost:5173/#/articles/TEST', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(3500)
  const imgs = await page.$$eval('.content img', els => els.map(e => ({
    src: e.getAttribute('src'), naturalW: e.naturalWidth, displayed: getComputedStyle(e).display,
  })))
  console.log('IMGS:', JSON.stringify(imgs, null, 2))
  console.log('ERRORS:', JSON.stringify(errors))
  await browser.close()
})()
