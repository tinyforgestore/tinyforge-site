import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://tinyforge.store',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    routing: { prefixDefaultLocale: false },
  },
});
