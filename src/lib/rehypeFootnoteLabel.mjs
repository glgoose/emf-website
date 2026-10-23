// Voetnotenkop ("Footnotes" in remark-rehype) in de taal van de pagina. De
// `footnoteLabel`-optie van remark-rehype is globaal, dus een kleine
// rehype-plugin die `lang` uit de frontmatter leest. Houd in de pas met
// `post.notes` in src/i18n/ui.ts.
const LABELS = { nl: 'Noten', en: 'Notes', fr: 'Notes' };

export default function rehypeFootnoteLabel() {
  return (tree, file) => {
    const lang = file.data?.astro?.frontmatter?.lang ?? 'nl';
    const label = LABELS[lang] ?? LABELS.nl;
    const visit = (node) => {
      if (node.type === 'element' && node.properties?.id === 'footnote-label') {
        node.children = [{ type: 'text', value: label }];
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
