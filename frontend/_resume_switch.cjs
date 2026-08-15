const { chromium } = require('C:/Users/admin/Desktop/inkheap/frontend/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('dialog', (d) => d.accept('UI切换测试版'))

  // 登录
  await page.goto('http://localhost:5173/#/admin/login', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(600)
  await page.fill('#username', 'admin')
  await page.fill('#password', 'admin123')
  await page.click('.btn-login')
  await page.waitForTimeout(1500)

  // 进入简历管理
  await page.goto('http://localhost:5173/#/admin/resume', { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(2000)

  // 新建版本（触发 prompt，dialog handler 自动 accept 'UI切换测试版'）
  await page.click('text=新建版本')
  await page.waitForTimeout(2000)
  const verNames = await page.$$eval('.version-name', (els) => els.map((e) => e.textContent))
  console.log('VERSIONS AFTER CREATE:', JSON.stringify(verNames))

  // 找到新版本并点击「设为生效」
  const items = await page.$$('.version-item')
  for (const item of items) {
    const name = await item.$eval('.version-name', (e) => e.textContent)
    if (name === 'UI切换测试版') {
      await item.click()
      await page.waitForTimeout(800)
      const setBtn = await item.$('.mini-btn:has-text("设为生效")')
      if (setBtn) {
        await setBtn.click()
        await page.waitForTimeout(1500)
      }
      break
    }
  }
  const activeAfter = await page.$$eval('.active-tag', (els) => els.map((e) => e.textContent))
  console.log('ACTIVE AFTER SWITCH:', JSON.stringify(activeAfter))
  await page.screenshot({ path: 'test_resume_switch_admin.png', fullPage: false })

  // 前台应展示新版本（空 profile 显示为空 hero）
  await page.goto('http://localhost:5173/#/resume', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(1500)
  const heroName = await page.$eval('.hero-name', (el) => el.textContent).catch(() => '(empty)')
  console.log('FRONTEND HERO AFTER SWITCH:', JSON.stringify(heroName))

  // 切回默认版本
  await page.goto('http://localhost:5173/#/admin/resume', { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(2000)
  const items2 = await page.$$('.version-item')
  for (const item of items2) {
    const name = await item.$eval('.version-name', (e) => e.textContent)
    if (name === '默认版本') {
      await item.click()
      await page.waitForTimeout(800)
      const setBtn = await item.$('.mini-btn:has-text("设为生效")')
      if (setBtn) {
        await setBtn.click()
        await page.waitForTimeout(1500)
      }
      break
    }
  }
  const activeFinal = await page.$$eval('.active-tag', (els) => els.map((e) => e.textContent))
  console.log('ACTIVE FINAL:', JSON.stringify(activeFinal))

  // 删除 UI切换测试版
  for (const item of items2) {
    const name = await item.$eval('.version-name', (e) => e.textContent)
    if (name === 'UI切换测试版') {
      await item.click()
      await page.waitForTimeout(600)
      const delBtn = await item.$('.mini-btn:has-text("删除")')
      if (delBtn) {
        await delBtn.click()
        await page.waitForTimeout(1200)
      }
      break
    }
  }
  const verFinal = await page.$$eval('.version-name', (els) => els.map((e) => e.textContent))
  console.log('VERSIONS FINAL:', JSON.stringify(verFinal))
  await page.screenshot({ path: 'test_resume_final.png', fullPage: false })

  console.log('=== ERRORS ===')
  console.log(errors.length ? JSON.stringify(errors, null, 2) : 'none')
  await browser.close()
})()
