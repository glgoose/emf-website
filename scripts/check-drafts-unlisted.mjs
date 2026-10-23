// Faalt als een concept (draft: true) ergens anders dan op zijn eigen URL opduikt.
// Concepten staan unlisted op de live site (docs/adr/0002-concepten-unlisted.md):
// geen link vanaf een gepubliceerde pagina, niet in de sitemap, wel noindex.
// Een conceptpagina herkent dit script aan `data-draft` (DraftBanner.astro).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? 'dist';
const SITE = 'https://ernestmandelfonds.org';

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(p);
    else yield p;
  }
}

const pages = [...files(root)].filter(f => f.endsWith('.html'));
const pathOf = file => '/' + relative(root, file).replace(/\.html$/, '').replace(/^index$/, '');
const html = new Map(pages.map(f => [f, readFileSync(f, 'utf8')]));
const drafts = pages.filter(f => /<aside data-draft/.test(html.get(f))).map(f => [f, pathOf(f)]);
const draftPaths = new Set(drafts.map(([, path]) => path));

const hits = [];
for (const [file, path] of drafts) {
  if (!/<meta name="robots" content="noindex/.test(html.get(file))) hits.push(`${path}: geen noindex`);
}
for (const file of pages) {
  if (draftPaths.has(pathOf(file))) continue;
  for (const [, href] of html.get(file).matchAll(/href="([^"#?]+)/g)) {
    const path = href.startsWith(SITE) ? href.slice(SITE.length) : href;
    if (draftPaths.has(path)) hits.push(`${pathOf(file)} linkt naar concept ${path}`);
  }
}
for (const file of [...files(root)].filter(f => /sitemap-.*\.xml$/.test(f))) {
  for (const [, loc] of readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (draftPaths.has(loc.slice(SITE.length))) hits.push(`${relative(root, file)} bevat concept ${loc}`);
  }
}

if (hits.length) {
  console.error(`Concept zichtbaar buiten zijn eigen URL (${hits.length}):`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log(`Concepten unlisted (${drafts.length}): ${[...draftPaths].join(', ') || 'geen'}.`);
