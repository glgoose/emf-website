import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { mdInline } from "./lib/mdInline";

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
    registration_deadline: z.coerce.date().optional(),
    capacity: z.number().optional(),
    baserow_table_id: z.string().optional(),
    cover: z.string().optional(),
    cover_filter: z.string().optional(),
    price: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
  }),
});

const publicaties = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/publicaties" }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    cover: z.string(),
    year: z.coerce.date().optional(),
    link: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { events, posts, publicaties };
