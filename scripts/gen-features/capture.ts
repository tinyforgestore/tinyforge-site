import { chromium } from 'playwright';
import { createServer } from 'vite';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = process.env.APP;
if (!app) {
  console.error('Error: APP environment variable is required (e.g. APP=kurippa)');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(app)) {
  console.error('Error: APP must be alphanumeric (a-z, 0-9, hyphens only)');
  process.exit(1);
}
const repo = process.env.REPO ?? app;
const appSrc = resolve(__dirname, '../../..', repo, 'src');
if (!existsSync(appSrc)) {
  console.error(`Error: App source not found at ${appSrc}`);
  process.exit(1);
}
const heroshots = (process.env.HEROSHOTS ?? '').split(',').filter(Boolean);
for (const id of heroshots) {
  if (!/^[a-z0-9-]+$/.test(id)) {
    console.error(`Error: HEROSHOTS id "${id}" must be alphanumeric (a-z, 0-9, hyphens only)`);
    process.exit(1);
  }
}
const highlight = process.env.HIGHLIGHT ?? '';
if (highlight && !/^[a-z0-9-]+$/.test(highlight)) {
  console.error('Error: HIGHLIGHT must be alphanumeric (a-z, 0-9, hyphens only)');
  process.exit(1);
}
if (highlight && heroshots.length > 0 && !heroshots.includes(highlight)) {
  console.error(`Error: HIGHLIGHT "${highlight}" must be one of the HEROSHOTS ids`);
  process.exit(1);
}
const siteRoot = resolve(__dirname, '../..');
const scenariosDir = resolve(__dirname, `scenarios/${app}`);
const outputDir = resolve(siteRoot, `public/screenshots/${app}/features`);
const productsPath = resolve(siteRoot, 'src/data/products.json');
const appEntryPath = resolve(__dirname, 'app-entry.generated.ts');

function generateAppEntry() {
  // Find all .css.ts files in appSrc that contain globalFontFace or globalStyle
  const cssEntries: string[] = [];

  function scanDir(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.css.ts')) {
        const content = readFileSync(full, 'utf-8');
        if (content.includes('globalFontFace') || content.includes('globalStyle')) {
          cssEntries.push(full);
        }
      }
    }
  }

  scanDir(appSrc);

  if (cssEntries.length === 0) {
    writeFileSync(appEntryPath, '// no global styles found\n');
    console.log('app-entry.generated.ts: no global CSS entries found');
    return;
  }

  const imports = cssEntries
    .map(f => `import '${relative(__dirname, f).replace(/\\/g, '/')}';`)
    .join('\n');
  writeFileSync(appEntryPath, imports + '\n');
  console.log(`app-entry.generated.ts: imported ${cssEntries.length} global CSS file(s)`);
}

async function main() {
  generateAppEntry();
  if (!existsSync(scenariosDir)) {
    console.error(`No scenarios found at ${scenariosDir}`);
    process.exit(1);
  }

  let server: any;
  let browser: any;
  try {
    server = await createServer({
      root: __dirname,
      configFile: resolve(__dirname, 'vite.config.ts'),
    });
    await server.listen(5199);
    console.log('Vite server running on http://localhost:5199');

    browser = await chromium.launch();
    const captured: string[] = [];

    // Get scenario ids from files
    const scenarioFiles = readdirSync(scenariosDir).filter(f => f.endsWith('.tsx'));
    const scenarioIds = scenarioFiles
      .map(f => f.replace('.tsx', ''))
      .filter(id => /^[a-z0-9-]+$/.test(id));

    // Ensure output dir exists
    mkdirSync(outputDir, { recursive: true });

    for (const id of scenarioIds) {
      const page = await browser.newPage();
      // Pass as a string so tsx doesn't inject __name or other helpers that break in the browser.
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
      `);
      const url = `http://localhost:5199/?s=${id}&app=${app}`;
      await page.goto(url);

      // Wait for scenario to mount
      await page.waitForSelector('[data-scenario-ready]', { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Screenshot the scenario element
      const el = await page.$('[data-scenario-ready]');
      if (!el) { console.warn(`No [data-scenario-ready] found for ${id}`); continue; }

      const outPath = resolve(outputDir, `${id}.png`);
      await el.screenshot({ path: outPath });
      captured.push(id);
      console.log(`Captured: ${id} → ${outPath}`);
      await page.close();
    }

    await browser.close();
    browser = undefined;

    // Patch products.json
    patchProducts(captured, app, heroshots, highlight);
    console.log('products.json patched.');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
  }
}

function patchProducts(captured: string[], appId: string, heroshotIds: string[], highlightId: string) {
  if (captured.length === 0 && heroshotIds.length === 0) {
    console.warn('Nothing captured — skipping products.json update.');
    return;
  }

  const products = JSON.parse(readFileSync(productsPath, 'utf-8'));
  const product = products.find((p: any) => p.id === appId);
  if (!product) { console.warn(`Product ${appId} not found in products.json`); return; }

  // Update featureSection screenshot paths
  for (const section of product.featureSections ?? []) {
    if (captured.includes(section.id)) {
      section.screenshot = `/screenshots/${appId}/features/${section.id}.png`;
    }
  }

  // Update heroshots — ensure highlight is at index 1 (center slot in ProductPage.astro)
  if (heroshotIds.length > 0) {
    let orderedIds = [...heroshotIds];
    if (highlightId && orderedIds.includes(highlightId) && orderedIds[1] !== highlightId) {
      orderedIds = orderedIds.filter(id => id !== highlightId);
      orderedIds.splice(1, 0, highlightId);
    }
    product.showcase = product.showcase ?? {};
    product.showcase.heroshots = orderedIds.map(id => {
      const section = product.featureSections?.find((f: any) => f.id === id);
      if (!section) console.warn(`Warning: heroshot id "${id}" has no matching featureSection`);
      const entry: any = {
        src: `/screenshots/${appId}/features/${id}.png`,
        alt: section?.headline ?? { en: id, ja: id },
      };
      if (highlightId && id === highlightId) entry.highlight = true;
      return entry;
    });
  }

  const tmp = productsPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(products, null, 2) + '\n');
  renameSync(tmp, productsPath);
}

main().catch(e => { console.error(e); process.exit(1); });
