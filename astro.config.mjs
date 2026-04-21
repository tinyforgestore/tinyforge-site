import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://tinyforge.store',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    routing: { prefixDefaultLocale: false },
  },
  redirects: {
    '/l/kurippa': 'https://tinyforgestore.lemonsqueezy.com/checkout/buy/c4c7e746-ca85-492d-a4b9-cad7e749279f',
  },
});
