# Ernest Mandelfonds website

## Deployment

### Content-Security-Policy — One Source Rule

CSP header is set in `public/_headers`. Do **not** add a Content-Security-Policy rule in Cloudflare Rules — two sources = duplicate headers = CSP breakage.

When inline scripts change (e.g. new `<script>` block in a component), rebuild and recompute the sha256 hashes needed for `script-src` in `_headers`:

```bash
python3 -c "
import base64, hashlib, re
from pathlib import Path
for html in Path('dist').rglob('*.html'):
    content = html.read_text()
    for s in re.findall(r'<script(?:\s[^>]*)?>(.+?)</script>', content, re.DOTALL):
        if not s.startswith('{'):
            h = base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()
            print(f'sha256-{h}  {s[:60].strip()}')
" | sort -u
```

Keep `script-src` hash-only — do **not** add `'unsafe-inline'`. Per CSP3, `'unsafe-inline'` is ignored whenever a hash or nonce is present, so it's dead weight that confuses debugging (browser console complains about it).

**Conditionally-rendered scripts are a blind spot.** Rebuilding after a *code* change to a `<script>` block isn't enough — a component with an inline script that only renders under certain content conditions (e.g. `RegistrationForm.astro`, shown only when `registration_open && !isPast`) can have its hash silently missing from `_headers` if no page in the last hash-recompute had that condition true. Symptom: the button/feature looks present in the HTML but does nothing — no CSP console error is obvious unless you check devtools. Rule: after publishing content that activates a previously-dormant component (a new event with `registration_open: true`, a toggled CTA, etc.), rebuild and recompute hashes even if you didn't touch any script code, and manually click the feature on the live URL — don't just trust a clean local build.

### Cloudflare must not inject inline scripts

Hash-based CSP breaks if Cloudflare rewrites the HTML to add a `<script>` with rotating content. Keep these **OFF** in the CF dashboard for zone `ernestmandelfonds.org`:

- **Security → Bots → Bot Fight Mode** — injects `window.__CF$cv$params={r:'<req-id>',t:'<ts>'}` + `/cdn-cgi/challenge-platform/scripts/jsd/main.js` loader. `r` and `t` rotate every request, so no static sha256 hash can match.
- **Speed → Optimization → Rocket Loader** — wraps scripts in an inline bootstrapper.
- **Scrape Shield → Email Address Obfuscation** — redundant with `src/components/Email.astro`, and some variants add an inline helper.

Symptom when one of these is on: Lighthouse / DevTools Console shows `Executing inline script violates … Content Security Policy` with source `(index):4` or similar, even though every repo-authored inline script is correctly hashed. Verify with `curl -s https://ernestmandelfonds.org/ | grep -c '<script'` — should return 3 (2 inline + 1 JSON-LD), not 4+.

**JS Detections caveat (Free plan).** On Free plans the dashboard *also* runs Bot Management's "JavaScript Detections" which injects the same rotating-hash inline script even when Bot Fight Mode is toggled Off. The UI toggle is greyed-out on Free, but the Bot Management API accepts `enable_js: false`:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/bot_management" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"enable_js":false}'
```

Requires a token with **Zone:Read** + **Zone:Bot Management:Edit** on the specific zone. Verify with `curl .../bot_management` — expect `"enable_js": false`.

## SEO

- **Sitemap filter**: `astro.config.mjs` excludes `/vragen`, `/questions` and `/admin` from `@astrojs/sitemap` because those are already `X-Robots-Tag: noindex` in `_headers`. Add any new noindex route to that same `filter` array, not just to `_headers`.
- **URLs zonder trailing slash**: `trailingSlash: 'never'` + `build.format: 'file'` in `astro.config.mjs`, gekozen omdat `/vragen` korter typt en mooier oogt. Schrijf interne links, markdown-links en `href:`-velden in frontmatter zonder slotslash. Tijdens de build is `Astro.url.pathname` het outputbestand (`/activiteiten.html`), gebruik daarom altijd `pagePath(Astro.url)` uit `src/lib/pagePath.ts` voor canonical, `og:url` en nav-state. Check na een build: `grep -rhoE 'href="/[^"#?]+/"' dist | sort -u` moet leeg zijn. Uitzondering: `/admin/` (Sveltia, statisch in `public/admin/`).
- **Eén host**: `www.` → apex is een Cloudflare Redirect Rule ("www naar apex", phase `http_request_dynamic_redirect`, 301, query string behouden), niet `_redirects`, want dat kan niet op host matchen. Oude `.html`-URLs van de vorige site staan als 301 in `public/_redirects`. Check: `curl -sI https://www.ernestmandelfonds.org/contact` moet 301 naar de apex geven.
- **Titel-eerst**: op posts (`src/pages/[type]/[slug].astro`) staat de auteur voor de titel (`${author}: ${plainTitle}`) omdat mensen op de auteursnaam zoeken, niet op het artikel. `ogTitle`/`twitter:title` volgen automatisch uit `BaseLayout`'s `title` prop.
- **JSON-LD heeft geen CSP-hash nodig**: `<script type="application/ld+json">` staat buiten `script-src` en hoeft niet in de sha256-lijst in `_headers`. Alleen `<script>`-blokken zonder `type` of met `type="text/javascript"` tellen mee voor de CSP-hashcheck hierboven.

## Fonts

### Metric-adjusted fallback (`EB Garamond Fallback`)

`src/styles/global.css` contains a hand-calculated `@font-face` for Georgia that minimises CLS when EB Garamond swaps in (`font-display: swap`). Values derived from actual font metrics using fonttools:

| Descriptor | Value | Source |
|---|---|---|
| `size-adjust` | 120.02% | `EB Garamond xAvgCharWidth/UPM ÷ Georgia xAvgCharWidth/UPM` |
| `ascent-override` | 100.70% | `EB Garamond sTypoAscender / UPM` |
| `descent-override` | 29.80% | `EB Garamond sTypoDescender / UPM` |
| `line-gap-override` | 0% | Removes Georgia's 198/2048 line gap |

**If a new web font is added:** replace this manual approach with [Fontaine](https://github.com/unjs/fontaine) as a Vite plugin — it automates metric calculation for all fonts at build time. Add to `astro.config.mjs`:

```ts
import { fontaine } from 'vite-plugin-fontaine';

export default defineConfig({
  vite: { plugins: [fontaine()] },
});
```

## Posts collection

### `source_event` attribution line

When a post's text was voorgedragen/voorgesteld at one of our own events, add `source_event` frontmatter instead of writing the attribution by hand in the markdown body:

```yaml
source_event:
  slug: "fight-the-cis-tem"
  label: "studiedag *Fight the cis‑tem!*"
  note: "Marcia Poelman droeg deze tekst voor op de"
```

`src/pages/[type]/[slug].astro` auto-renders this as a small italic line above the article body, linking to `/activiteiten/${source_event.slug}`. It only renders when `type !== "verslag"` — so a `"verslag"` post never shows it, and any other type (`"lezing"`, `"recensie"`) does. Pick the type with this gating in mind, not just for the URL segment it produces.

## Typography

### Accent color restraint

Do not use red as a default UI or editorial accent. The EMF red is reserved for identity-level moments where emphasis genuinely needs the brand color. For article furniture such as context notes, blockquotes, dividers, labels, metadata, and secondary navigation states, prefer grayscale treatment first: black, #555/#666 text, soft #ddd/#e8e8e8 rules, spacing, weight, or indentation. Introduce red only when the user explicitly asks for it or when the element is part of a deliberate brand mark.

### Small-caps letter-spacing
When using `font-variant: small-caps`, always set `letter-spacing` in the range **0.05em – 0.12em** (Butterick's Practical Typography). The site standard is `0.08em`. Applies to: `h3` global style, the `.small-caps` utility, and any element using `[font-variant:small-caps]`.
