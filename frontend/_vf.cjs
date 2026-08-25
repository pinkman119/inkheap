const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('http://localhost:5173/#/contact', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const cols = [...document.querySelectorAll('.footer-nav__col')].map((col) => {
      const h = col.querySelector('h4')?.textContent.trim();
      const links = [...col.querySelectorAll('a.footer-link')].map((a) => ({
        label: a.textContent.trim(),
        href: a.getAttribute('href'),
      }));
      return { col: h, links };
    });
    return cols;
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
