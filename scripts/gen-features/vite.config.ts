import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const APP = process.env.APP;
if (!APP) throw new Error('APP environment variable is required');

// REPO allows the repo name to differ from the product id in products.json.
// e.g. APP=vaultz REPO=password-manager
const REPO = process.env.REPO ?? APP;
const appRoot = resolve(__dirname, '../../..', REPO);
const appSrc = resolve(appRoot, 'src');
const appNodeModules = resolve(appRoot, 'node_modules');

if (!existsSync(appSrc)) throw new Error(`App source not found at ${appSrc}`);

// Alias common app packages so main.tsx and scenario files can import them
// even though they are not installed in gen-features/node_modules.
const appPkgAliases: Record<string, string> = {};
for (const pkg of ['react', 'react-dom', 'react-router-dom', '@radix-ui/themes', 'lucide-react', 'clsx']) {
  const pkgPath = pkg.startsWith('@')
    ? resolve(appNodeModules, pkg.split('/')[0], pkg.split('/')[1])
    : resolve(appNodeModules, pkg);
  if (existsSync(pkgPath)) appPkgAliases[pkg] = pkgPath;
}
// React subpath exports needed by JSX transform
for (const sub of ['react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client']) {
  const parts = sub.split('/');
  const pkgPath = resolve(appNodeModules, ...parts);
  if (existsSync(pkgPath)) appPkgAliases[sub] = pkgPath;
}
// @tauri-apps/* subpaths (e.g. @tauri-apps/api/core → api/core.js)
for (const pkg of ['@tauri-apps/plugin-store', '@tauri-apps/plugin-log', '@tauri-apps/plugin-opener']) {
  const pkgPath = resolve(appNodeModules, '@tauri-apps', pkg.split('/')[1]);
  if (existsSync(pkgPath)) appPkgAliases[pkg] = pkgPath;
}
// @fontsource-variable/* fonts (e.g. inter, jetbrains-mono)
for (const font of ['inter', 'jetbrains-mono']) {
  const pkgPath = resolve(appNodeModules, '@fontsource-variable', font);
  if (existsSync(pkgPath)) appPkgAliases[`@fontsource-variable/${font}`] = pkgPath;
}

// App-specific hook mocks (keyed by APP value)
const appHookMocks: Record<string, Record<string, string>> = {
  kurippa: {
    '@/hooks/useLicense': resolve(__dirname, 'mocks/useLicense.ts'),
  },
};

// Serve static assets from appRoot for paths like /src/assets/ that app CSS references.
const STATIC_ASSET_EXTS = new Set(['.ttf', '.woff', '.woff2', '.otf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);

// Serve static assets (fonts, images) from appRoot for paths the app CSS references.
// Only intercepts known asset extensions so JS module requests pass through to Vite.
const serveAppStaticPlugin = {
  name: 'serve-app-static',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url: string = req.url?.split('?')[0] ?? '';
      const ext = url.includes('.') ? url.slice(url.lastIndexOf('.')).toLowerCase() : '';
      if (!STATIC_ASSET_EXTS.has(ext)) { next(); return; }
      const candidate = join(appRoot, url.slice(1));
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        createReadStream(candidate).pipe(res);
      } else {
        next();
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), serveAppStaticPlugin],
  resolve: {
    alias: [
      // @tauri-apps/api subpaths: @tauri-apps/api/core → <appNodeModules>/@tauri-apps/api/core.js
      { find: /^@tauri-apps\/api\/(.+)$/, replacement: `${appNodeModules}/@tauri-apps/api/$1.js` },
      // App-specific hook mocks must come before the generic '@' alias so they match first
      ...Object.entries(appHookMocks[APP] ?? {}).map(([find, replacement]) => ({ find, replacement })),
      { find: '@', replacement: appSrc },
      ...Object.entries(appPkgAliases).map(([find, replacement]) => ({ find, replacement })),
    ],
  },
  server: {
    port: 5199,
    strictPort: true,
    fs: {
      allow: [appRoot, __dirname],
    },
  },
  root: __dirname,
});
