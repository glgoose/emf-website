// Werkt src/data/bibliography.json bij uit Zotero (Better BibTeX moet draaien).
// Neemt elke `[@citekey]` uit src/content en vraagt die op als CSL-JSON. Een
// citekey die niet in Zotero staat blijft zoals hij in het bestand stond, en
// wordt gemeld. De build zelf leest alleen het bestand, niet Zotero.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'src/data/bibliography.json';
const DROP = ['abstract', 'note', 'keyword', 'source', 'accessed', 'call-number', 'license', 'number-of-pages', 'citation-key', 'ISBN', 'ISSN', 'language'];

const keys = new Set();
const scan = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (p.endsWith('.md')) for (const [, c] of readFileSync(p, 'utf8').matchAll(/\[(@[^\]\n]+)\]/g))
      for (const [, k] of c.matchAll(/@([\w:.-]+)/g)) keys.add(k);
  }
};
scan('src/content');

const old = Object.fromEntries(JSON.parse(readFileSync(FILE, 'utf8')).map((r) => [r.id, r]));
// Better BibTeX weigert de hele export als één citekey ontbreekt ("not found: a, b");
// dan opnieuw zonder die citekeys.
const exportKeys = async (list) => {
  if (!list.length) return [];
  const res = await fetch('http://127.0.0.1:23119/better-bibtex/json-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'item.export', params: [list, 'Better CSL JSON'], id: 1 }),
  }).catch(() => { throw new Error('Zotero met Better BibTeX draait niet (127.0.0.1:23119)'); });
  const { result, error } = await res.json();
  const absent = error?.message.match(/not found: (.+)/)?.[1].split(/,\s*/);
  if (absent) return exportKeys(list.filter((k) => !absent.includes(k)));
  if (error) throw new Error(`Better BibTeX: ${error.message}`);
  return typeof result === 'string' ? JSON.parse(result) : result;
};
const fresh = Object.fromEntries((await exportKeys([...keys]))
  .map((r) => [r.id, Object.fromEntries(Object.entries(r).filter(([k]) => !DROP.includes(k)))]));

const missing = [...keys].filter((k) => !fresh[k]);
const out = [...keys].sort().map((k) => fresh[k] ?? old[k]).filter(Boolean);
writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.length} bronnen geschreven naar ${FILE}`);
for (const k of missing) console.log(`niet in Zotero, ${old[k] ? 'oude versie behouden' : 'ONTBREEKT'}: @${k}`);
