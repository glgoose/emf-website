# Copilot instructions for `ernestmandelfonds-website`

## Build, test, and lint commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start Astro dev server (hosted on LAN because of `--host`) |
| `npm run build` | Build static site into `dist/` |
| `npm run preview` | Preview the built site locally |
| `npm run astro -- check` | Astro type/content checks |

There is currently **no dedicated test runner** and **no lint script** in `package.json`, so there is no single-test command available yet.

## High-level architecture

- This is an **Astro static site**. Pages and routes live in `src/pages`, shared shell is `src/layouts/BaseLayout.astro`, and UI pieces are in `src/components`.
- Content is driven by **Astro content collections** in `src/content.config.ts`. Active content folders are `src/content/events` and `src/content/publicaties`.
- The activiteiten flow is content-driven:
  - `src/pages/activiteiten/index.astro` lists upcoming/past events from the `events` collection.
  - `src/pages/activiteiten/[slug].astro` generates static detail pages via `getStaticPaths()` and renders markdown with `render(event)`.
- Form submissions (`NewsletterForm.astro`, `RegistrationForm.astro`) post to `/api/subscribe` and `/api/register`.
  - `src/pages/api/*.ts` handles local Astro dev requests.
  - `functions/api/*.ts` are Cloudflare Pages Functions used in production.
  - Production email delivery is via MailChannels.
- Deployment target is **Cloudflare Pages** (`wrangler.toml`, `pages_build_output_dir = "dist"`), with optional `EMAIL_TO` secret override.

## Key codebase conventions

- Keep `/api/register` and `/api/subscribe` logic in sync across both implementations:
  - `src/pages/api/*` (dev route behavior)
  - `functions/api/*` (Cloudflare production behavior)
- API response contract is consistent: success returns `{ ok: true }`; failures return `{ error: "..." }` with appropriate HTTP status.
- Event slugs come from markdown filenames in `src/content/events/*.md` and are linked as `/activiteiten/{slug}`.
- Dates are formatted in Dutch locale (`nl-BE`) and event past/future comparisons normalize “today” to midnight before filtering.
- Page composition convention:
  - All pages use `BaseLayout`.
  - Left column content is passed through `<Fragment slot="aside">`.
  - Use `SidebarHeading` or `SidebarNav` for aside navigation patterns.
- UI/content language is Dutch; preserve existing copy tone and locale-aware formatting.
- `public/admin/config.yml` exists for Sveltia CMS but still contains placeholder repo values and content mappings that may lag behind current Astro collections; verify alignment before editing CMS behavior.
