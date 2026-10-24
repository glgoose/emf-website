// Bronvermeldingen volgens CMOS 18 (notes and bibliography) met citeproc-js.
// In markdown staat `[@citekey]` of `[@citekey, 143]`, meerdere gescheiden door `;`.
// Binnen een bestaande voetnoot wordt het citaat daar ingevuld; in de lopende
// tekst wordt het een nieuwe voetnoot (een leesteken erna schuift voor het
// cijfer). Een tweede vermelding krijgt vanzelf de verkorte vorm. De bronnen
// staan in src/data/bibliography.json (CSL-JSON, bij te werken met
// `npm run bib`); een onbekende citekey laat de build falen.
import CSL from 'citeproc';
import { readFileSync } from 'node:fs';

const DIR = new URL('../data/', import.meta.url);
const read = (p) => readFileSync(new URL(p, DIR), 'utf8');
const LOCALES = { nl: 'nl-NL', en: 'en-US', fr: 'fr-FR' };

// Correcties op de standaardtermen van CSL, als <locale> in de stijl, zodat de
// bestanden in src/data/csl/ ongewijzigd uit de CSL-repo komen.
const OVERRIDES = `<locale xml:lang="nl"><terms>
  <term name="page-range-delimiter">–</term>
  <term name="recipient" form="verb">aan</term>
  <term name="container-author" form="verb">door</term>
  <term name="editor" form="verb-short">red.</term>
  <term name="translator" form="verb-short">vert.</term>
</terms></locale>
<locale xml:lang="fr"><terms>
  <term name="in">dans</term>
</terms></locale>`;
const STYLE = read('csl/chicago-notes-bibliography.csl').replace(/(<\/info>)/, `$1\n${OVERRIDES}`);
const ITEMS = Object.fromEntries(JSON.parse(read('bibliography.json')).map((r) => [r.id, r]));

const CITE = /\[(@[^\]\n]+)\]/g;
const parseCite = (s) =>
  s.split(';').map((part) => {
    const m = part.trim().match(/^@([\w:.-]+)(?:,\s*(.+))?$/);
    if (!m) throw new Error(`remarkCite: onleesbaar citaat "[${s}]"`);
    if (!ITEMS[m[1]]) throw new Error(`remarkCite: citekey @${m[1]} staat niet in src/data/bibliography.json`);
    return { id: m[1], ...(m[2] && { locator: m[2], label: 'page' }) };
  });

export default function remarkCite() {
  return (tree, file) => {
    const lang = LOCALES[file.data?.astro?.frontmatter?.lang ?? 'nl'] ?? 'nl-NL';
    const defs = new Map(tree.children.filter((n) => n.type === 'footnoteDefinition').map((n) => [n.identifier, n]));
    const seen = new Set(), clusters = [], added = [];
    let note = 0;

    const cluster = (items, noteIndex, inNote) => {
      const node = { type: 'html', value: '' };
      clusters.push({ id: `c${clusters.length}`, items, noteIndex, inNote, node });
      return node;
    };

    // Documentvolgorde aanhouden: een voetnoot wordt doorlopen op de plek van
    // zijn eerste verwijzing, zodat noteIndex klopt voor ibid./verkorte vormen.
    const walk = (parent, noteIndex) => {
      for (let i = 0; i < parent.children.length; i++) {
        const n = parent.children[i];
        if (n.type === 'footnoteDefinition') continue;
        if (n.type === 'footnoteReference') {
          if (seen.has(n.identifier)) continue;
          seen.add(n.identifier);
          note++;
          const def = defs.get(n.identifier);
          if (def) walk(def, note);
          continue;
        }
        if (n.type !== 'text' || !n.value.includes('[@')) {
          if (n.children) walk(n, noteIndex);
          continue;
        }
        const out = [], v = n.value;
        let last = 0, m;
        CITE.lastIndex = 0;
        while ((m = CITE.exec(v))) {
          const items = parseCite(m[1]);
          const before = v.slice(last, m.index);
          let end = m.index + m[0].length;
          if (noteIndex) {
            out.push({ type: 'text', value: before }, cluster(items, noteIndex, true));
          } else {
            const punct = v.slice(end).match(/^[.,;:!?]+/)?.[0] ?? '';
            end += punct.length;
            note++;
            const id = `cite-${note}`;
            added.push({ type: 'footnoteDefinition', identifier: id, label: id,
              children: [{ type: 'paragraph', children: [cluster(items, note, false)] }] });
            out.push({ type: 'text', value: before.replace(/\s+$/, '') + punct },
              { type: 'footnoteReference', identifier: id, label: id });
          }
          last = CITE.lastIndex = end;
        }
        out.push({ type: 'text', value: v.slice(last) });
        parent.children.splice(i, 1, ...out);
        i += out.length - 1;
      }
    };
    walk(tree, 0);
    if (!clusters.length) return;

    const engine = new CSL.Engine(
      { retrieveLocale: (l) => read(`csl/locales-${LOCALES[l.slice(0, 2)] ?? l}.xml`), retrieveItem: (id) => ITEMS[id] },
      STYLE, lang, true);
    engine.setOutputFormat('html');
    // URL's en DOI's als klikbare link.
    engine.opt.development_extensions.wrap_url_and_doi = true;
    const done = [], html = {};
    for (const c of clusters) {
      const [, res] = engine.processCitationCluster(
        { citationID: c.id, citationItems: c.items, properties: { noteIndex: c.noteIndex } }, done, []);
      done.push([c.id, c.noteIndex]);
      for (const [idx, s] of res) html[clusters[idx].id] = s;
    }
    // Binnen een voetnoot zet de auteur zelf het leesteken na het citaat.
    for (const c of clusters) c.node.value = c.inNote ? html[c.id].replace(/\.$/, '') : html[c.id];
    tree.children.push(...added);
  };
}
