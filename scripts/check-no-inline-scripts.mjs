// Faalt als dist/ een inline <script> bevat. De CSP in public/_headers staat
// alleen script-src 'self' toe, dus een inline script zou stil niets doen.
// Oplossing voor een hit: het script in een bestand zetten (assetsInlineLimit: 0
// in astro.config.mjs zorgt dat Astro hoisted scripts als bestand uitlevert).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const NON_EXECUTABLE = /^(application\/(ld\+)?json|importmap|speculationrules)$/;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith('.html')) yield p;
  }
}

const hits = [];
for (const file of htmlFiles(root)) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    if (type && NON_EXECUTABLE.test(type)) continue;
    hits.push(`${file}: ${m[2].trim().slice(0, 70)}`);
  }
}

if (hits.length) {
  console.error(`Inline <script> gevonden (${hits.length}), geblokkeerd door de CSP:`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log('Geen inline scripts in dist/.');
