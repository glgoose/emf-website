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

## Typography

### Small-caps letter-spacing
When using `font-variant: small-caps`, always set `letter-spacing` in the range **0.05em – 0.12em** (Butterick's Practical Typography). The site standard is `0.08em`. Applies to: `h3` global style, the `.small-caps` utility, and any element using `[font-variant:small-caps]`.
