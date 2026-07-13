const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 3000));
  
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log("BODY LENGTH:", bodyHtml.length);
  console.log("BODY PREVIEW:", bodyHtml.substring(0, 1000));
  
  await browser.close();
})();
