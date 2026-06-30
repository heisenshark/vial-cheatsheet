import puppeteer from 'puppeteer';
import path from 'path';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  try {
    const fileInput = await page.$('input[type=file]');
    // Create a dummy vil file
    const fs = await import('fs');
    fs.writeFileSync('dummy.vil', JSON.stringify({ layout: [[["KC_A"]]] }));
    await fileInput.uploadFile(path.resolve('dummy.vil'));
    
    await new Promise(r => setTimeout(r, 1000));
    console.log('Upload successful');
  } catch(e) {
    console.log('Error uploading:', e);
  }
  
  await browser.close();
})();
