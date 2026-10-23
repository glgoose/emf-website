// Kop-ID's zoals Astro ze maakt (github-slugger), maar een streepje tussen twee
// tekens wordt een koppelteken: `1990s–2008` geeft `…-1990s-2008`, niet
// `…-1990s2008`, en `Préhistoire : socialisme` geeft één koppelteken. Astro laat een kop met een bestaand `id` ongemoeid.
import GithubSlugger from 'github-slugger';

const HEADING = /^h[1-6]$/;
const text = (node) => node.type === 'text' || node.type === 'raw' ? node.value : (node.children ?? []).map(text).join('');

export default function rehypeHeadingIds() {
  return (tree) => {
    const slugger = new GithubSlugger();
    const visit = (node) => {
      if (node.type === 'element' && HEADING.test(node.tagName)) {
        if (typeof node.properties.id !== 'string') {
          node.properties.id = slugger.slug(text(node).replace(/(\S)[–—](?=\S)/g, '$1-')).replace(/-{2,}/g, '-');
        }
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
