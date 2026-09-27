import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { mdInline } from "./lib/mdInline";
import { newsTypeSlugs } from "./lib/newsTypes";
import { defaultLocale, locales } from "./i18n/config";

// Sveltia schrijft '' of null voor lege optionele velden.
const emptyToUndefined = <T extends z.ZodType>(schema: T) =>
  z.preprocess(v => (v === "" || v === null ? undefined : v), schema);

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
    wheelchair_accessible: z.boolean().default(false),
    description: z.string(),
    speakers: z.array(z.object({
      name: z.string(),
      bio: z.union([z.string().transform(mdInline), z.array(z.string().transform(mdInline))]).optional(),
    })).optional(),
    programme: z.array(z.object({
      time: z.string(),
      end_time: z.string().optional(),
      title: z.string().transform(mdInline),
      language: z.string().nullish(),
    })).optional(),
    organizer_note: z.string().transform(mdInline).optional(),
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
    title: z.string().transform(mdInline),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    summary: z.string(),
    author: z.string().optional(),
    source_event: z.object({
      slug: z.string(),
      label: z.string().transform(mdInline),
      note: z.string(),
    }).optional(),
    lead_images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
    })).optional(),
    lead_credit: z.string().transform(mdInline).optional(),
    context_note: z.string().transform(mdInline).optional(),
    draft: z.boolean().nullish().transform(v => v ?? false),
    redirect_from: z.array(z.string()).optional(),

    // Meertaligheid, zie docs/adr/0001-i18n.md. De taal moet overeenkomen met de
    // map (posts/<slug>.md = nl, posts/en/<slug>.md = en); dat controleert
    // src/lib/posts.ts, want het schema ziet het bestandspad niet.
    lang: z.enum(locales).default(defaultLocale),
    // Id van het origineel (pad onder src/content/posts zonder .md, bv.
    // "anton-jager-mandel-zoete-wraak" of "en/peter-drucker-three-periods-queer-marxism").
    // Leeg = dit bestand is zelf een origineel, in welke taal ook.
    translation_of: emptyToUndefined(z.string().optional()),
    machine_translated: emptyToUndefined(z.boolean().optional()),
    translator: emptyToUndefined(z.string().optional()),
  }).superRefine((data, ctx) => {
    if (data.translation_of) {
      if (data.machine_translated === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["machine_translated"],
          message: "Verplicht op een vertaling (translation_of is gezet): true of false.",
        });
      }
    } else {
      for (const field of ["machine_translated", "translator"] as const) {
        if (data[field] !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} hoort alleen op een vertaling; zet ook translation_of.`,
          });
        }
      }
    }
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
