// @ts-check
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";
import { defaultLocale, localeMeta, locales } from "./src/i18n/config.ts";

// Hreflang voor de sitemap, gelezen uit de gebouwde HTML. De sitemap-integratie
// koppelt talen alleen bij een identiek pad (`/x` <-> `/en/x`), maar vertaalde
// posts hebben een vertaald type-woord en een vertaalde slug. De
// `<link rel="alternate" hreflang>` in BaseLayout is de enige bron; de sitemap
// neemt die over. Zie docs/adr/0001-i18n.md.
const DIST = join(process.cwd(), "dist");
const ALTERNATE_LINK = /<link\b[^>]*\brel="alternate"[^>]*>/g;
/** @param {string} url */
function hreflangLinksFromHtml(url) {
  const path = new URL(url).pathname.replace(/\/$/, "");
  const file = join(DIST, path === "" ? "index.html" : `${path}.html`);
  if (!existsSync(file)) return undefined;
  const html = readFileSync(file, "utf-8");
  const links = [...html.matchAll(ALTERNATE_LINK)].flatMap(([tag]) => {
    const lang = tag.match(/\bhreflang="([^"]+)"/)?.[1];
    const href = tag.match(/\bhref="([^"]+)"/)?.[1];
    return lang && href ? [{ lang, url: href }] : [];
  });
  return links.length > 1 ? links : undefined;
}

// https://astro.build/config
// Static output mode — all pages prerendered to HTML.
// API routes (newsletter subscribe, event registration) live in
// /functions/ and are deployed as Cloudflare Pages Functions.
export default defineConfig({
  site: 'https://ernestmandelfonds.org',

  // URLs without trailing slash: pages build to `foo.html`, which Cloudflare
  // Pages serves at `/foo` (and 308s `/foo/` there). `never` makes the dev
  // server reject a slashed link, so a miss shows up before deploy.
  trailingSlash: 'never',

  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },

  // nl op de root, andere talen onder /<locale>/. Talen komen uit
  // src/i18n/config.ts. Zie docs/adr/0001-i18n.md.
  i18n: {
    defaultLocale,
    locales: [...locales],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  experimental: {
    contentIntellisense: true,
  },

  integrations: [
    sitemap({
      filter: page => !['/vragen', '/questions', '/admin'].some(prefix => page.includes(prefix)),
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map(locale => [locale, localeMeta[locale].lang])),
      },
      serialize(item) {
        const links = hreflangLinksFromHtml(item.url);
        return links ? { ...item, links } : item;
      },
    }),
  ],
});
