import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { isPostVisible } from '@/utils/blogFilter';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((p) => p.id.startsWith('en/') && isPostVisible(p, true))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'TinyForge Blog',
    description: 'Notes from the TinyForge studio.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id.replace(/^en\//, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')}/`,
    })),
  });
}
