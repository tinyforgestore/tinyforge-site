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
    'about.eyebrow': 'About',
    'about.body.1': 'TinyForge is an independent software studio focused on building small, precise desktop utilities. Every tool we ship solves a real problem — nothing more, nothing less.',
    'about.body.2': 'We believe software should be straightforward to own. No subscriptions. No accounts required. No data sent to the cloud. You buy it, you keep it, it runs on your machine.',
    'about.meta.contact': 'Contact',
  },
  ja: {
    'nav.home.href': '/ja/',
    'nav.about': 'について',
    'nav.about.href': '/ja/about',
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
    'about.eyebrow': 'について',
    'about.body.1': 'TinyForgeは、小さく、精密なデスクトップツールの開発に特化した独立系ソフトウェアスタジオです。私たちがリリースするツールは、現実の問題を解決します — それ以上でも、それ以下でもなく。',
    'about.body.2': 'ソフトウェアは、シンプルに所有できるべきだと考えています。サブスクリプションなし。アカウント不要。クラウドへのデータ送信なし。購入したら、あなたのもの。あなたのマシンで動き続けます。',
    'about.meta.contact': 'お問い合わせ',
  },
} as const;

export type UIKey = keyof typeof ui[typeof defaultLocale];
export type ProductStatusKey = 'product.status.coming_soon' | 'product.status.released' | 'product.status.discontinued';

export function useTranslations(lang: Locale) {
  return function t(key: UIKey): string {
    return (ui[lang] as Record<string, string>)[key] ?? ui[defaultLocale][key];
  };
}
