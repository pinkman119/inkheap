const { chromium } = require('C:/Users/admin/Desktop/inkheap/frontend/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  // 拦截简历接口模拟失败
  await page.route('**/api/public/resume', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
  )
  await page.goto('http://localhost:5173/#/resume', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(1500)
  const heroName = await page.$eval('.hero-name', (el) => el.textContent).catch(() => 'N/A')
  const tip = await page.$eval('.load-tip', (el) => el.textContent).catch(() => 'N/A')
  console.log('FALLBACK heroName:', heroName)
  console.log('FALLBACK tip:', tip)
  console.log('FALLBACK OK:', heroName === '林知墨' && tip.includes('加载失败'))
  console.log('=== ERRORS ===')
  console.log(errors.filter((e) => !e.includes('Failed to load resource')).length ? JSON.stringify(errors, null, 2) : 'none')
  await browser.close()
})()
