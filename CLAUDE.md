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

### Small-caps letter-spacing
When using `font-variant: small-caps`, always set `letter-spacing` in the range **0.05em – 0.12em** (Butterick's Practical Typography). The site standard is `0.08em`. Applies to: `h3` global style, the `.small-caps` utility, and any element using `[font-variant:small-caps]`.
