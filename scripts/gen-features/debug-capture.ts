import { createServer } from 'vite';
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const server = await createServer({ root: __dirname, configFile: resolve(__dirname, 'vite.config.ts') });
await server.listen(5200);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(`
  localStorage.setItem('theme', 'light');
  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { label: 'main' },
      windows: [{ label: 'main' }],
      webviews: [{ label: 'main' }],
    },
    invoke: function() { return Promise.reject(new Error('tauri-shim')); },
    transformCallback: function() { return Math.random(); },
    convertFileSrc: function(p) { return p; },
  };
  console.log('init-script ran, __TAURI_INTERNALS__ set:', !!window.__TAURI_INTERNALS__);
`);
page.on('console', m => { if (m.type() !== 'debug') console.log('BROWSER:', m.type(), m.text().slice(0, 200)); });
page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0, 300)));
page.on('response', r => { if (r.status() >= 400) console.log('HTTP ERR:', r.status(), r.url().slice(0, 120)); });
await page.goto('http://localhost:5200/?s=instant-history&app=kurippa');
await page.waitForTimeout(8000);
const ready = await page.$('[data-scenario-ready]');
console.log('data-scenario-ready found:', !!ready);
const html = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 500));
console.log('root innerHTML:', html);
await browser.close();
await server.close();
