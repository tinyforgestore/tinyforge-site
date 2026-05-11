import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { LeafDirective } from 'mdast-util-directive';
import type { VFile } from 'vfile';

type Locale = 'en' | 'ja';

interface ProductCopy {
  name: string;
  description: { en: string; ja: string };
  href: { en: string; ja: string };
}

const PRODUCTS: Record<string, ProductCopy> = {
  kurippa: {
    name: 'Kurippa',
    description: {
      en: 'Clipboard manager for power users.',
      ja: 'パワーユーザー向けクリップボードマネージャー。',
    },
    href: {
      en: '/products/kurippa',
      ja: '/ja/products/kurippa',
    },
  },
  vaultz: {
    name: 'Vaultz',
    description: {
      en: 'Local-first password manager.',
      ja: 'ローカルファーストパスワードマネージャー。',
    },
    href: {
      en: '/products/vaultz',
      ja: '/ja/products/vaultz',
    },
  },
};

const LABELS = {
  eyebrow: { en: 'From the author', ja: '著者から' },
  cta: { en: 'Learn more →', ja: '詳しく見る →' },
};

function localeFromPath(path: string | undefined): Locale {
  if (path && /\/blog\/ja\//.test(path)) return 'ja';
  return 'en';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(productKey: string, product: ProductCopy, lang: Locale): string {
  const name = escapeHtml(product.name);
  const desc = escapeHtml(product.description[lang]);
  const href = escapeHtml(product.href[lang]);
  const eyebrow = escapeHtml(LABELS.eyebrow[lang]);
  const cta = escapeHtml(LABELS.cta[lang]);
  const dataProduct = escapeHtml(productKey);

  return [
    `<aside class="callout-promo" data-product="${dataProduct}">`,
    `  <div class="callout-promo__inner">`,
    `    <span class="callout-promo__eyebrow">${eyebrow}</span>`,
    `    <h4 class="callout-promo__title">${name}</h4>`,
    `    <p class="callout-promo__desc">${desc}</p>`,
    `    <a class="callout-promo__cta" href="${href}">${cta}</a>`,
    `  </div>`,
    `</aside>`,
  ].join('\n');
}

export default function calloutPromo() {
  return (tree: Root, file: VFile) => {
    const lang = localeFromPath(file.path);

    visit(tree, (node) => {
      if (node.type !== 'leafDirective') return;
      const directive = node as LeafDirective;
      if (directive.name !== 'callout') return;

      const key = directive.attributes?.product;
      if (!key || !PRODUCTS[key]) {
        console.warn(
          `[callout-promo] unknown product '${key ?? '<missing>'}' in ${file.path ?? '<unknown file>'}`
        );
        return;
      }

      const html = buildHtml(key, PRODUCTS[key], lang);
      // Mutate the directive node into a raw html node in place.
      const mutable = directive as unknown as { type: string; value: string; children?: unknown; attributes?: unknown; name?: unknown };
      mutable.type = 'html';
      mutable.value = html;
      delete mutable.children;
      delete mutable.attributes;
      delete mutable.name;
    });
  };
}
