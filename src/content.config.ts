import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { mdInline } from "./lib/mdInline";
import { newsTypeSlugs } from "./lib/newsTypes";

const eventTypes = [
  "boekvoorstelling",
  "studiedag",
  "leesgroep",
  "lezing",
  "rondleiding",
  "panelgesprek",
] as const;

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z.object({
    type: z.enum(eventTypes),
    title: z.string().transform(mdInline),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    time: z.string(),
    end_time: z.string().optional(),
    location: z.string().nullish(),
    address: z.string().nullish(),
    description: z.string(),
    speakers: z.array(z.object({
      name: z.string(),
      bio: z.union([z.string().transform(mdInline), z.array(z.string().transform(mdInline))]).optional(),
    })).optional(),
    organizer_note: z.string().optional(),
    registration_open: z.boolean().default(false),
    registration_deadline: z.preprocess(v => (v === '' || v == null) ? undefined : v, z.coerce.date().optional()),
    capacity: z.union([z.number(), z.null()]).optional().transform(v => v ?? undefined),
    baserow_table_id: z.string().optional(),
    cover: z.string().optional(),
    cover_filter: z.string().optional(),
    price: z.string().optional(),
    publication_link: z.object({
      href: z.string(),
      label: z.string(),
    }).optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    type: z.enum(newsTypeSlugs),
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    author: z.string().optional(),
    source_event: z.object({
      slug: z.string(),
      label: z.string(),
      note: z.string(),
    }).optional(),
  }),
});

const publicaties = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/publicaties" }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    cover: z.string(),
    publication_date: z.coerce.date().optional(),
    month_label: z.string().optional(),
    pages: z.number().optional(),
    edition: z.string().optional(),
    isbn: z.string().optional(),
    original_title: z.string().optional(),
    original_year: z.number().optional(),
    original_url: z.string().url().optional(),
    original_note: z.string().optional(),
    collaboration: z.object({
      label: z.string(),
      url: z.string().url(),
    }).optional(),
    formats: z.array(z.object({
      id: z.string(),
      label: z.string(),
      detail: z.string().optional(),
      price: z.string().optional(),
      order_url: z.string().url(),
      active: z.boolean().optional(),
    })).default([]),
    retailer: z.object({
      label: z.string(),
      url: z.string().url(),
    }).optional(),
    cover_credit: z.object({
      label: z.string(),
      url: z.string().url().optional(),
    }).optional(),
    table_of_contents: z.array(z.object({
      title: z.string(),
      page: z.union([z.number(), z.string()]),
    })).default([]),
    link: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { events, posts, publicaties };
