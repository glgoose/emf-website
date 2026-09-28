# Ernest Mandelfonds website

## Deployment

### Publiceren = pushen

`git push` naar `main` deployt de site: `.github/workflows/deploy.yml` bouwt en draait `wrangler pages deploy` (productie, plus een `concepten`-preview met `SHOW_DRAFTS`). Draai **niet** ook `npm run deploy`, dat is een dubbele deploy. Cloudflare toont "Git Provider: No" omdat de koppeling via GitHub Actions loopt, niet via Cloudflare zelf. Volg een run met `gh run watch`, of controleer met `gh run list --limit 3`. De workflow draait ook dagelijks om 02:15 en bouwt dan alleen opnieuw als er gisteren een activiteit was. Browsers cachen `/js/*` vier uur (`max-age=14400`), dus test na een deploy met Cmd+Shift+R.

### Open punt: van Pages naar Workers

Cloudflare stuurt nieuwe projecten naar Workers (met static assets) en Pages is in onderhoud. Te onderzoeken vóór een migratie, en wat het voor CI/CD betekent:

- Deploy-commando: `wrangler pages deploy dist` wordt `wrangler deploy` met een `wrangler.jsonc` (`assets.directory: ./dist`). Beide stappen in `deploy.yml` moeten mee.
- `functions/` (Pages Functions, `functions/api`) bestaat niet meer in Workers: routes moeten een Worker-entrypoint worden.
- `public/_headers` en `public/_redirects` blijven werken voor static assets, maar de limieten en regelvolgorde verschillen. Controleer de CSP-hashes en de gegenereerde redirects (`scripts/generate-redirects.mjs`).
- De `concepten`-preview draait nu als Pages-branch (`--branch concepten`). Workers heeft daarvoor versies of een tweede Worker met eigen URL nodig, en dan verandert de preview-URL.
- Domeinen `ernestmandelfonds.org` en `www` moeten van het Pages-project naar de Worker. Let op de Redirect Rule voor `www` en de instellingen voor JS Detections, Bot Fight Mode en Rocket Loader (zie CSP).
- Het API-token heeft Workers-rechten nodig (nu Pages). De secrets `CLOUDFLARE_API_TOKEN` en `CLOUDFLARE_ACCOUNT_ID` blijven.
- Eerst doen: de Cloudflare-docs over Pages naar Workers migreren lezen en een proefdeploy op een aparte Worker draaien, zonder het domein te verplaatsen.

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

- **Slug-schema (posts)**: `/<voornaam-achternaam>-<kern>` (direct op de root, geen type-woord of taalprefix, in elke taal) — volledige auteursnaam voorop (bij 3+
  auteurs alleen de eerste achternaam, geen auteur: alleen kernwoorden), dan 2-5 kernwoorden uit de
  titel zonder lidwoorden/voegwoorden, kleine letters, ASCII (diacritics weg), koppeltekens. Zachte
  grens 50 tekens, harde grens 60. Logica in `src/lib/slugify.ts`. Geen datum in de URL.
  De kernwoorden zijn een redactionele keuze, geen automatische uitkomst: `buildSlug()` geeft een voorstel,
  kort dat in tot het kernbeeld van de titel (`marcia-poelman-another-beach`, niet `…-we-still-dream-another-beach`),
  maar houd een vaste uitdrukking heel (`anton-jager-mandel-zoete-wraak-geschiedenis`, niet `…-zoete-wraak`).
  **Vraag de gebruiker de slug te bevestigen vóór de eerste publicatie** (nieuwe post of vertaling). De
  build controleert de vorm: auteursdeel voorop, alleen `[a-z0-9-]`, max 60 tekens (`validate()` in
  `src/lib/posts.ts`).
  **Een slug is bevroren na publicatie** — wijzigen kan alleen via `redirect_from` (frontmatter-veld op
  posts, array van oude paden). `scripts/generate-redirects.mjs` draait als `prebuild` en vult het
  gegenereerde blok in `public/_redirects` aan uit alle `redirect_from`-waarden; verwijder een redirect
  nooit (Google: minstens een jaar bewaren) en laat een ketting altijd naar de eindbestemming wijzen,
  niet naar een tussenstop. Activiteiten (`/activiteiten/<slug>`) volgen dit schema niet: geen auteur,
  jaartal alleen bij een terugkerend evenement.
- **Meertaligheid (lezingen)**: nl op de root, vertalingen in `src/content/posts/<lang>/<slug>.md` met
  `lang`, `translation_of` (id van het origineel) en `machine_translated`; URL `/<slug>`, net als
  het origineel. Een slug is uniek over alle talen en mag niet samenvallen met een overzicht (`/lezing`) of een
  vaste pagina in `src/pages` (de build faalt anders). Talen in `src/i18n/config.ts`, UI-teksten in
  `src/i18n/ui.ts`, paden altijd via `postHref`/`postPath` uit `src/lib/postRoutes.ts`. Een origineel mag
  elke taal hebben (Drucker is Engels). Keuzes en afwijzingen: `docs/adr/0001-i18n.md`.
- **Sitemap filter**: `astro.config.mjs` excludes `/vragen`, `/questions` and `/admin` from `@astrojs/sitemap` because those are already `X-Robots-Tag: noindex` in `_headers`. Add any new noindex route to that same `filter` array, not just to `_headers`.
- **URLs zonder trailing slash**: `trailingSlash: 'never'` + `build.format: 'file'` in `astro.config.mjs`, gekozen omdat `/vragen` korter typt en mooier oogt. Schrijf interne links, markdown-links en `href:`-velden in frontmatter zonder slotslash. Tijdens de build is `Astro.url.pathname` het outputbestand (`/activiteiten.html`), gebruik daarom altijd `pagePath(Astro.url)` uit `src/lib/pagePath.ts` voor canonical, `og:url` en nav-state. Check na een build: `grep -rhoE 'href="/[^"#?]+/"' dist | sort -u` moet leeg zijn. Uitzondering: `/admin/` (Sveltia, statisch in `public/admin/`).
- **Eén host**: `www.` → apex is een Cloudflare Redirect Rule ("www naar apex", phase `http_request_dynamic_redirect`, 301, query string behouden), niet `_redirects`, want dat kan niet op host matchen. Oude `.html`-URLs van de vorige site staan als 301 in `public/_redirects`. Check: `curl -sI https://www.ernestmandelfonds.org/contact` moet 301 naar de apex geven.
- **Titel-eerst**: op posts (`src/components/PostPage.astro`) staat de auteur voor de titel (`${author}: ${plainTitle}`) omdat mensen op de auteursnaam zoeken, niet op het artikel. `ogTitle`/`twitter:title` volgen automatisch uit `BaseLayout`'s `title` prop.
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

`src/components/PostPage.astro` auto-renders this as a small italic line above the article body, linking to `/activiteiten/${source_event.slug}`. It only renders when `type !== "verslag"` — so a `"verslag"` post never shows it, and any other type (`"lezing"`, `"recensie"`) does. Pick the type with this gating in mind, not for the URL: posts live at `/<slug>` whatever their type.

## Typography

### Accent color restraint

Do not use red as a default UI or editorial accent. The EMF red is reserved for identity-level moments where emphasis genuinely needs the brand color. For article furniture such as context notes, blockquotes, dividers, labels, metadata, and secondary navigation states, prefer grayscale treatment first: black, #555/#666 text, soft #ddd/#e8e8e8 rules, spacing, weight, or indentation. Introduce red only when the user explicitly asks for it or when the element is part of a deliberate brand mark.

### Small-caps letter-spacing
When using `font-variant: small-caps`, always set `letter-spacing` in the range **0.05em – 0.12em** (Butterick's Practical Typography). The site standard is `0.08em`. Applies to: `h3` global style, the `.small-caps` utility, and any element using `[font-variant:small-caps]`.
