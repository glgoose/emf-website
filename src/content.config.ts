import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    time: z.string(),
    location: z.string(),
    address: z.string(),
    description: z.string(),
    registration_open: z.boolean().default(false),
    registration_deadline: z.coerce.date().optional(),
    capacity: z.number().optional(),
    baserow_table_id: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
  }),
});

export const collections = { events, posts };
