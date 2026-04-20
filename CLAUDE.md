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

Symptom when one of these is on: Lighthouse / DevTools Console shows `Executing inline script violates … Content Security Policy` with source `(index):4` or similar, even though every repo-authored inline script is correctly hashed. Verify with `curl -s https://ernestmandelfonds.org/ | grep -c '<script'` — should return 4 (3 inline + 1 JSON-LD), not 5+.

## Typography

### Small-caps letter-spacing
When using `font-variant: small-caps`, always set `letter-spacing` in the range **0.05em – 0.12em** (Butterick's Practical Typography). The site standard is `0.08em`. Applies to: `h3` global style, the `.small-caps` utility, and any element using `[font-variant:small-caps]`.
