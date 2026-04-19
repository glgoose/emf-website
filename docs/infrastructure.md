# Infrastructure

## Current stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro v6 (static output) |
| Styling | Tailwind CSS v4 |
| CMS | Sveltia CMS (git-based, no server) |
| Hosting | Cloudflare Pages (free tier) |
| API functions | Cloudflare Pages Functions (`/functions/`) |
| Email | MailChannels via Cloudflare (free) |
| Git | GitHub |
| CI/CD | Cloudflare Pages git integration (auto-build on push to `main`) |
| Domain | OVH (DNS via Cloudflare nameservers) |

## Deploy flow

```
git push → GitHub → CF Pages webhook → npm run build → dist/ deployed
                                    ↳ /functions/ deployed as Workers
```

Sveltia CMS editors commit via browser UI → same flow triggered.

## Manual deploy (CLI)

```bash
npm run deploy
```

Runs `astro build` then `wrangler pages deploy dist --project-name ernestmandelfonds-website`.

## Vendor lock-in assessment

### Domain
Domain registered at OVH — no lock-in. Nameservers point to Cloudflare but can be changed back at OVH in minutes.

### Hosting (Cloudflare Pages)
Escape cost: change 2 DNS records. Low.

### API functions — the real CF tie-in
Current functions (`/functions/`) use:
- **CF Workers runtime** — handles requests
- **MailChannels** — free transactional email, CF-only

#### Migration options

| Option | Effort | Notes |
|--------|--------|-------|
| Netlify / Vercel Functions | Low (~1h rewrite) | Standard Node.js serverless |
| Self-hosted VPS (Hono or Express) | Medium | Full control, ~€3–5/mo |
| Listmonk + Baserow (self-hosted) | Medium | **Preferred path** — replaces functions entirely with dedicated open-source tools, no runtime rewrite |

**Preferred long-term path:** Listmonk (newsletter) + Baserow (events) are already planned in `wrangler.toml`. Once active, the CF functions become obsolete — no runtime migration needed.

**To reduce runtime lock-in now:** rewrite functions with [Hono](https://hono.dev/) — runs unchanged on CF Workers, Node, Deno, and Bun. Same code, any runtime.

---

## Future migration path: Forgejo + Woodpecker CI

Goal: fully self-hostable, open-source stack.

- **Forgejo** — self-hosted Gitea fork; replaces GitHub  
  - Forgejo and Gitea share the same API; tools that work with one work with the other
- **Woodpecker CI** — self-hosted CI/CD; replaces CF Pages git integration  
  - Integrates natively with Forgejo via webhooks
  - Pipeline runs `npm run build && npx wrangler pages deploy dist` on push
- **Sveltia CMS** — has experimental Gitea backend support (covers Forgejo)

Migration steps when ready:
1. Stand up Forgejo instance
2. Mirror/push repo from GitHub to Forgejo
3. Install Woodpecker CI, connect to Forgejo
4. Add `.woodpecker.yml` pipeline file
5. Update Sveltia CMS config backend from `github` to `gitea` (+ instance URL)
6. Revoke CF Pages git integration; Woodpecker takes over

### Woodpecker pipeline (`.woodpecker.yml`) skeleton

```yaml
steps:
  - name: build-and-deploy
    image: node:22
    environment:
      CLOUDFLARE_API_TOKEN:
        from_secret: cloudflare_api_token
      CLOUDFLARE_ACCOUNT_ID:
        from_secret: cloudflare_account_id
    commands:
      - npm ci
      - npm run build
      - npx wrangler pages deploy dist --project-name ernestmandelfonds-website
    when:
      branch: main
```
