import type { Locale } from '@/i18n/ui';

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export function formatPlatforms(platforms: string[], lang: Locale): string {
  const labels = platforms.map((p) => PLATFORM_LABELS[p] ?? p);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];

  if (lang === 'ja') {
    if (labels.length === 2) return labels.join('と');
    return labels.join('、');
  }

  // en: "A and B" for 2; "A, B and C" for 3+ (no Oxford comma, matches existing copy).
  if (labels.length === 2) return labels.join(' and ');
  return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
}

export function renderDescription(template: string, platforms: string[], lang: Locale): string {
  return template.replace('{platforms}', formatPlatforms(platforms, lang));
}
