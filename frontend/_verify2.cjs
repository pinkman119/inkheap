const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const paths = ['/contact', '/xiaoji', '/about', '/articles', '/resume', '/', '/digital-life'];
  for (const path of paths) {
    await p.goto('http://localhost:5173/#' + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const active = [...document.querySelectorAll('.nav-links a.active')].map((a) => a.textContent.trim());
      const u = document.querySelector('.nav-underline');
      return { active, underlineWidth: u ? Math.round(u.getBoundingClientRect().width) : null };
    });
    console.log(path.padEnd(14), JSON.stringify(r));
  }
  await b.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
