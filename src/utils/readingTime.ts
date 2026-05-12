import type { Locale } from '@/i18n/ui';

const EN_WPM = 200;
const JA_CPM = 500;

function stripMarkdown(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, '')   // fenced code blocks
    .replace(/`[^`\n]+`/g, '')         // inline code
    .replace(/^---[\s\S]*?\n---/m, '') // frontmatter (defensive; usually pre-stripped)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // links → keep text
    .replace(/[#>*_~`]/g, '');         // markdown syntax noise
}

export function readingTime(body: string, lang: Locale): number {
  const text = stripMarkdown(body).trim();
  if (!text) return 1;

  if (lang === 'ja') {
    const charCount = [...text].filter((c) => !/\s/.test(c)).length;
    return Math.max(1, Math.ceil(charCount / JA_CPM));
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / EN_WPM));
}
