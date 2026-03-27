// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Static output mode — all pages prerendered to HTML.
// API routes (newsletter subscribe, event registration) live in
// /functions/ and are deployed as Cloudflare Pages Functions.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  }
});
