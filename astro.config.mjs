// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

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

  vite: {
    plugins: [tailwindcss()],
  },

  experimental: {
    contentIntellisense: true,
  },

  integrations: [
    sitemap({
      filter: page => !['/vragen', '/questions', '/admin'].some(prefix => page.includes(prefix)),
    }),
  ],
});