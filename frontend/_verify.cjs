const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('http://localhost:5173/#/contact', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const headerNav = [...document.querySelectorAll('.nav-links a')].map((a) => a.textContent.trim());
    const activeInHeader = [...document.querySelectorAll('.nav-links a.active')].map((a) => a.textContent.trim());
    const footerLinks = [...document.querySelectorAll('.footer-link')].map((a) => a.textContent.trim());
    return {
      headerNav,
      headerHasContact: headerNav.includes('联系我'),
      activeInHeader,
      footerHasContact: footerLinks.includes('联系我'),
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
