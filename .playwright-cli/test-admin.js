async (page) => {
  const out = {};
  // 登录后台
  await page.goto('http://localhost:5173/#/admin/login');
  await page.waitForTimeout(800);
  await page.fill('input[type="text"], input[name="username"], #username', 'admin').catch(async () => {
    const inputs = page.locator('input');
    await inputs.nth(0).fill('admin');
    await page.locator('input[type="password"]').fill('admin123');
  });
  // 兜底：若上面 catch 分支没执行填密码，这里再补
  const pwd = page.locator('input[type="password"]');
  if (await pwd.count() > 0 && !(await pwd.first().inputValue())) {
    await pwd.first().fill('admin123');
  }
  await page.click('button:has-text("登录"), button[type="submit"]');
  await page.waitForTimeout(1500);

  // 进事件日历管理页
  await page.goto('http://localhost:5173/#/admin/about/events');
  await page.waitForTimeout(1500);
  out['年份选项数'] = await page.locator('.filter-select option').count();
  out['年份选项'] = await page.locator('.filter-select option').allTextContents().catch(() => []);
  out['当前年份选中'] = await page.locator('.filter-select').inputValue().catch(() => '(?)');
  out['事件卡片数'] = await page.locator('.event-card').count();
  out['成就chip数'] = await page.locator('.ring-chip').count();
  out['设为成就按钮存在'] = await page.locator('.ring-toggle').first().isVisible().catch(() => false);
  out['菜单含年轮项'] = await page.locator('.sidenav__label:has-text("年轮")').count();
  out['菜单含事件日历项'] = await page.locator('.sidenav__label:has-text("事件日历")').count();

  // 切换 2022 年筛选，验证列表变化（2022 有 7 条事件）
  await page.selectOption('.filter-select', '2022');
  await page.waitForTimeout(600);
  out['2022年卡片数'] = await page.locator('.event-card').count();
  return JSON.stringify(out, null, 2);
}
