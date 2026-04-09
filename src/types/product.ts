export type { Locale } from '../i18n/ui';

export type ProductStatus = 'coming_soon' | 'released' | 'discontinued';

export interface ProductI18n {
  name: string;
  tagline: string;
  description: string | null;
}

export interface Product {
  id: string;
  status: ProductStatus;
  platforms: ('mac' | 'windows' | 'linux')[];
  price: { amount: number; currency: string } | null;
  url: string | null;
  icon: string | null;
  screenshots: string[] | null;
  releasedAt: string | null;
  i18n: Partial<Record<Locale, ProductI18n>>;
}
