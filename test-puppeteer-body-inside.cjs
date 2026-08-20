const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Click on the splash screen to skip it
  await page.evaluate(() => {
    document.body.click();
    const splash = document.querySelector('.fixed.inset-0.cursor-pointer');
    if (splash) splash.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // click bypass button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const bypassBtn = buttons.find(b => b.textContent.includes('Acesso de Teste Rápido'));
    if (bypassBtn) bypassBtn.click();
  });

  await new Promise(r => setTimeout(r, 2000));
  
  const rootHtml = await page.evaluate(() => document.getElementById("root").innerHTML);
  console.log("ROOT HTML (INSIDE):");
  console.log(rootHtml.substring(0, 500) + '...');
  
  await browser.close();
})();
