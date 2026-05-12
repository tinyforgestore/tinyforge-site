import type { CollectionEntry } from 'astro:content';

/**
 * Returns true if the post should be visible in the current build.
 *
 * Hidden when:
 * - in production AND marked as draft, OR
 * - in production AND pubDate is in the future at build time.
 *
 * In dev (`isProd === false`), all posts are visible regardless of draft/pubDate
 * so authors can preview unpublished work locally.
 */
export function isPostVisible(
  post: CollectionEntry<'blog'>,
  isProd: boolean,
  now: number = Date.now()
): boolean {
  if (!isProd) return true;
  if (post.data.draft) return false;
  if (post.data.pubDate.valueOf() > now) return false;
  return true;
}
