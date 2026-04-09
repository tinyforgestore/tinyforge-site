export const locales = ['en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const CONTACT_EMAIL = 'hello@tinyforge.store';

export const ui = {
  en: {
    'nav.home.href': '/',
    'nav.about': 'About',
    'nav.about.href': '/about',
    'nav.lang': '日本語',
    'nav.lang.href': '/ja/',
    'hero.eyebrow': 'Independent software studio',
    'hero.tagline': 'Small, focused desktop utilities. No subscriptions, no cloud accounts — just software that works and stays yours.',
    'products.eyebrow': 'Products',
    'coming_soon.badge': 'Coming soon',
    'coming_soon.heading': "Something's being forged.",
    'coming_soon.body': "We're working on a set of small, precise desktop tools. Built with care, priced fairly, yours forever.",
    'coming_soon.cta': 'Learn about the studio',
    'product.status.coming_soon': 'Coming soon',
    'product.status.released': 'Released',
    'product.status.discontinued': 'Discontinued',
    'footer.copyright': '© 2026 TinyForge',
  },
  ja: {
    'nav.home.href': '/ja/',
    'nav.about': 'について',
    'nav.about.href': '/about',
    'nav.lang': 'English',
    'nav.lang.href': '/',
    'hero.eyebrow': '独立系ソフトウェアスタジオ',
    'hero.tagline': '小さく、的を絞ったデスクトップツール。サブスクなし、クラウドアカウントなし — 動いて、あなたのものであり続けるソフトウェア。',
    'products.eyebrow': 'プロダクト',
    'coming_soon.badge': '近日公開',
    'coming_soon.heading': '今、鍛えています。',
    'coming_soon.body': '小さく、精密なデスクトップツールを開発中です。丁寧に作り、適切な価格で、永続的にあなたのものに。',
    'coming_soon.cta': 'スタジオについて',
    'product.status.coming_soon': '近日公開',
    'product.status.released': 'リリース済み',
    'product.status.discontinued': '提供終了',
    'footer.copyright': '© 2026 TinyForge',
  },
} as const;

export type UIKey = keyof typeof ui[typeof defaultLocale];
export type ProductStatusKey = 'product.status.coming_soon' | 'product.status.released' | 'product.status.discontinued';

export function useTranslations(lang: Locale) {
  return function t(key: UIKey): string {
    return (ui[lang] as Record<string, string>)[key] ?? ui[defaultLocale][key];
  };
}
