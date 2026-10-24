# Ernest Mandelfonds website

## Deployment

### Content-Security-Policy: one source rule

CSP is set in `public/_headers` only, never in Cloudflare Rules (two sources give duplicate headers). `script-src` is `'self'`, with no inline scripts and no hashes: `assetsInlineLimit: 0` makes Astro emit every component `<script>` as a file, and `npm run build` fails via `scripts/check-no-inline-scripts.mjs` on an inline script. Fix a hit by moving the script to a file, never by loosening the CSP.

## Previewing web changes

When changing pages, layouts, styles, or other user-visible website UI, always offer the user a Codex app preview option so they can view the page from the conversation. Do not only verify through a local browser or screenshots that remain inaccessible to the user.

### Cloudflare must not inject inline scripts

The CSP (`script-src 'self'`) breaks if Cloudflare rewrites the HTML to add an inline `<script>`. Keep these **OFF** in the CF dashboard for zone `ernestmandelfonds.org`:

- **Security → Bots → Bot Fight Mode**: injects `window.__CF$cv$params={r:'<req-id>',t:'<ts>'}` + `/cdn-cgi/challenge-platform/scripts/jsd/main.js` loader. `r` and `t` rotate every request, so it would be blocked.
- **Speed → Optimization → Rocket Loader**: wraps scripts in an inline bootstrapper.
- **Scrape Shield → Email Address Obfuscation**: redundant with `src/components/Email.astro`, and some variants add an inline helper.

Symptom when one of these is on: Lighthouse / DevTools Console shows `Executing inline script violates … Content Security Policy` with source `(index):4` or similar, even though the repo itself ships no inline scripts. Verify with `curl -s https://ernestmandelfonds.org/ | grep -c '<script'`: it should only count the JSON-LD block and `src=` scripts, no inline ones.

**JS Detections caveat (Free plan).** On Free plans the dashboard *also* runs Bot Management's "JavaScript Detections" which injects the same rotating-hash inline script even when Bot Fight Mode is toggled Off. The UI toggle is greyed-out on Free, but the Bot Management API accepts `enable_js: false`:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/bot_management" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"enable_js":false}'
```

Requires a token with **Zone:Read** + **Zone:Bot Management:Edit** on the specific zone. Verify with `curl .../bot_management` — expect `"enable_js": false`.

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

## Typography

### Accent color restraint

Do not use red as a default UI or editorial accent. The EMF red is reserved for identity-level moments where emphasis genuinely needs the brand color. For article furniture such as context notes, blockquotes, dividers, labels, metadata, and secondary navigation states, prefer grayscale treatment first: black, #555/#666 text, soft #ddd/#e8e8e8 rules, spacing, weight, or indentation. Introduce red only when the user explicitly asks for it or when the element is part of a deliberate brand mark.

### Small-caps letter-spacing
When using `font-variant: small-caps`, always set `letter-spacing` in the range **0.05em – 0.12em** (Butterick's Practical Typography). The site standard is `0.08em`. Applies to: `h3` global style, the `.small-caps` utility, and any element using `[font-variant:small-caps]`.
