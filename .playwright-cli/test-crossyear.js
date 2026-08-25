async (page) => {
  const out = {};
  // 跨年联动：切到 2020 年，点 12-31 的热力块，再点"下一天"→ 应到 2021-01-01 且网格年份联动
  await page.click('.cal-year-btn:has-text("2020")');
  await page.waitForTimeout(300);
  await page.click('button[title^="2020-12-31"]');
  await page.waitForTimeout(500);
  out['起点'] = await page.locator('.drawer-date').textContent().catch(() => '(无)');
  await page.click('.drawer-nav-btn[title="下一天"]');
  await page.waitForTimeout(500);
  out['跨年后日期'] = await page.locator('.drawer-date').textContent().catch(() => '(无)');
  out['网格联动到2021'] = await page.locator('.cal-year-btn.active:has-text("2021")').isVisible().catch(() => false);
  // 边界：2020-01-01 的"上一天"应禁用
  await page.click('.cal-year-btn:has-text("2020")');
  await page.waitForTimeout(300);
  await page.click('button[title^="2020-1-1"]');
  await page.waitForTimeout(500);
  out['年初上一天禁用'] = await page.locator('.drawer-nav-btn[title="上一天"]').isDisabled().catch(() => null);
  await page.keyboard.press('Escape');
  return JSON.stringify(out, null, 2);
}
