const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Click on the splash screen to skip it
  await page.evaluate(() => {
    document.body.click();
    const splash = document.querySelector('.fixed.inset-0.cursor-pointer');
    if (splash) splash.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log("BODY LENGTH:", bodyHtml.length);
  const errorLog = await page.evaluate(() => document.getElementById("error-log")?.textContent);
  console.log("ERROR LOG:", errorLog);
  
  await browser.close();
})();
