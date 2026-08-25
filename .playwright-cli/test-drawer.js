async (page) => {
  const out = {};
  // 1. 点击 2026-08-11（3 条事件，含 3 个成就）
  await page.click('button[title^="2026-8-11"]');
  await page.waitForTimeout(700);
  out['抽屉可见'] = await page.locator('.day-drawer').isVisible();
  out['日期'] = await page.locator('.drawer-date').textContent().catch(() => '(无)');
  out['事件数'] = await page.locator('.drawer-item').count();
  out['成就徽章数'] = await page.locator('.drawer-badge').count();
  out['年轮条目数(2026)'] = await page.locator('.ring-item').count();
  await page.screenshot({ path: '.playwright-cli/shot-drawer.png' });

  // 2. 下一天 8-12（无事件）
  await page.click('.drawer-nav-btn[title="下一天"]');
  await page.waitForTimeout(400);
  out['下一天日期'] = await page.locator('.drawer-date').textContent().catch(() => '(无)');
  out['下一天空态'] = await page.locator('.drawer-empty').isVisible().catch(() => false);

  // 3. ESC 关闭
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  out['ESC关闭'] = !(await page.locator('.day-drawer').isVisible().catch(() => false));

  // 4. 空白天块（2026-6-1）也能打开抽屉
  await page.click('button[title="2026-6-1 · 0 件事"]');
  await page.waitForTimeout(400);
  out['空白天打开抽屉'] = await page.locator('.day-drawer').isVisible().catch(() => false);
  out['空白天无记录'] = await page.locator('.drawer-empty').isVisible().catch(() => false);

  // 5. 年份按钮数量（应为 2020-2026 共 7 个）
  out['年份按钮数'] = await page.locator('.cal-year-btn').count();

  await page.keyboard.press('Escape');
  return JSON.stringify(out, null, 2);
}
