const { chromium } = require('C:/Users/admin/Desktop/inkheap/frontend/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  const failed404 = []
  let pageUrlAtError = ''
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => {
    pageUrlAtError = page.url()
    errors.push(`PAGEERROR@${pageUrlAtError}: ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`)
  })
  page.on('requestfailed', (r) => {
    failed404.push(`${r.url()} (${r.failure()?.errorText})`)
  })
  page.on('response', (r) => {
    if (r.status() === 404) failed404.push(`${r.status()} ${r.url()}`)
  })

  // 1. 登录
  await page.goto('http://localhost:5173/#/admin/login', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(600)
  await page.fill('#username', 'admin')
  await page.fill('#password', 'admin123')
  await page.click('.btn-login')
  await page.waitForTimeout(1500)
  const token = await page.evaluate(() => localStorage.getItem('admin_token'))
  console.log('LOGIN token:', token ? token.slice(0, 20) + '...' : 'NULL')

  // 2. 后台简历管理页
  await page.goto('http://localhost:5173/#/admin/resume', { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(2500)
  const verCount = await page.$$eval('.version-item', (els) => els.length).catch(() => 0)
  const activeTag = await page.$$eval('.active-tag', (els) => els.map((e) => e.textContent)).catch(() => [])
  const previewName = await page.$eval('.preview-scroll .hero-name', (el) => el.textContent).catch(() => 'N/A')
  console.log('=== ADMIN RESUME PAGE ===')
  console.log('versions:', verCount, 'activeTags:', JSON.stringify(activeTag))
  console.log('previewHeroName:', previewName)
  await page.screenshot({ path: 'test_resume_admin.png', fullPage: false })

  // 3. 前台简历页
  await page.goto('http://localhost:5173/#/resume', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(1500)
  const heroName = await page.$eval('.hero-name', (el) => el.textContent).catch(() => 'N/A')
  console.log('=== FRONTEND RESUME PAGE ===')
  console.log('heroName:', heroName)
  await page.screenshot({ path: 'test_resume_front.png', fullPage: true })

  console.log('=== 404/FAILED ===')
  console.log(failed404.length ? failed404.join('\n') : 'none')
  console.log('=== ERRORS ===')
  console.log(errors.length ? JSON.stringify(errors, null, 2) : 'none')
  await browser.close()
})()
