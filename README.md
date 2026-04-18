# ernestmandelfonds.be

Website for vzw Ernest Mandelfonds — ecosocialistisch studiecentrum en politiek vormingsorgaan.

Built with [Astro](https://astro.build), [Tailwind CSS v4](https://tailwindcss.com), and deployed on [Cloudflare Pages](https://pages.cloudflare.com).

## Stack

- **Astro v5** — static site generator
- **Tailwind CSS v4** — utility-first CSS
- **Sveltia CMS** — git-based CMS at `/admin`
- **Cloudflare Pages Functions** — serverless API endpoints (`functions/api/`)
- **MailChannels** — transactional email (works automatically on Cloudflare Pages, no extra account needed)

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start dev server at `localhost:4321`        |
| `npm run build`   | Build to `./dist/`                          |
| `npm run preview` | Preview the production build locally        |
| `npm run visual:test:update` | Create/update Playwright visual snapshots |
| `npm run visual:test` | Run Playwright visual regression checks |
| `npm run visual:report` | Open Playwright HTML report |

### Front-end guardrails

- Visual regressions should be checked in **both Chromium and WebKit (Safari engine)**.
- Heading `#` anchor behavior should stay centralized in:
  - `src/layouts/BaseLayout.astro` (anchor injection / hash handling)
  - `src/styles/global.css` (anchor visibility, color, and hover behavior)

## API endpoints

| Endpoint         | Function                                                               |
| :--------------- | :--------------------------------------------------------------------- |
| `POST /api/register`  | Event registration — sends email to `info@ernestmandelfonds.org` |
| `POST /api/subscribe` | Newsletter sign-up — sends email to `info@ernestmandelfonds.org`  |

In local dev, both endpoints just log to the console (MailChannels only works on CF Pages).

## Deployment

Connect the GitHub repo in the Cloudflare Pages dashboard, or deploy manually:

```sh
npm run build
npx wrangler pages deploy dist --project-name ernestmandelfonds-website
```

Optional secret (overrides the default email recipient):

```sh
npx wrangler pages secret put EMAIL_TO --project-name ernestmandelfonds-website
```

## Content

Content lives in `src/content/`:

- `events/` — activiteiten (`.md` files)
- `posts/` — nieuws & publicaties (`.md` files)

The CMS at `/admin` (Sveltia CMS) can edit these files via GitHub.
