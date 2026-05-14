import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['dev', 'tips']).default('dev'),
    author: z.string().default('TinyForge'),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
    mirrors: z
      .object({
        devto: z.string().url().optional(),
        zenn: z.string().url().optional(),
        substack: z.string().url().optional(),
      })
      .optional(),
  }),
});

export const collections = { blog };
