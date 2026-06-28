import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const postsDir = join(root, 'src/content/posts');
const postFiles = readdirSync(postsDir).filter((file) => file.endsWith('.md'));

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function frontmatterValue(content, key) {
  return content.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1];
}

function sourceFiles(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(astro|ts|js|mjs)$/.test(entry.name) ? [path] : [];
  });
}

describe('typed news routing', () => {
  it('requires each news item to have a supported type', () => {
    const allowedTypes = new Set(['lezing', 'recensie', 'verslag']);

    for (const file of postFiles) {
      const content = readFileSync(join(postsDir, file), 'utf8');
      assert.ok(allowedTypes.has(frontmatterValue(content, 'type')), `${file} needs type lezing, recensie, or verslag`);
    }
  });

  it('uses top-level typed routes and removes news detail route', () => {
    assert.ok(existsSync(join(root, 'src/pages/[type]/[slug].astro')), 'typed detail route should exist');
    assert.ok(existsSync(join(root, 'src/pages/[type]/index.astro')), 'typed overview route should exist');
    assert.equal(existsSync(join(root, 'src/pages/nieuws/[slug].astro')), false, 'old news detail route should be removed');
  });

  it('links news items through their type instead of /nieuws/:slug', () => {
    const newsListPage = read('src/components/NewsListPage.astro');
    const activitiesDetail = read('src/pages/activiteiten/[slug].astro');

    assert.match(newsListPage, /href=\{newsItemHref\((lead|item)\)\}/);
    assert.match(activitiesDetail, /href:\s*newsItemHref\(post\)/);
    assert.doesNotMatch(newsListPage, /href=\{`\/nieuws\/\$\{/);
    assert.doesNotMatch(activitiesDetail, /href=\{`\/nieuws\/\$\{/);
  });

  it('keeps CMS news entries in the Astro news content folder with a type selector', () => {
    const cmsConfig = read('public/admin/config.yml');

    assert.match(cmsConfig, /name: news[\s\S]*?folder: src\/content\/posts/);
    assert.match(cmsConfig, /name: type[\s\S]*?Lezing[\s\S]*?Recensie[\s\S]*?Verslag/);
  });

  it('reads news items from the real Astro posts collection', () => {
    const filesUsingNewsCollection = sourceFiles('src')
      .filter(file => read(file).includes("getCollection('news')") || read(file).includes('getCollection("news")'));

    assert.deepEqual(filesUsingNewsCollection, []);
    assert.doesNotMatch(read('src/content.config.ts'), /news:\s*posts/);
  });

  it('shows only used type links in the news type navigation', () => {
    const newsNav = read('src/data/newsNav.ts');

    assert.match(newsNav, /usedTypes\.has\(type\.slug\)/);
    assert.doesNotMatch(newsNav, /label:\s*'alles'/);
  });

  it('builds news filter navigation from all news items, not the filtered page items', () => {
    const newsNav = read('src/data/newsNav.ts');
    const newsListPage = read('src/components/NewsListPage.astro');
    const allNewsPage = read('src/pages/nieuws/index.astro');
    const typeIndexPage = read('src/pages/[type]/index.astro');

    assert.match(newsNav, /currentType\?:/);
    assert.match(allNewsPage, /navItems=\{newsNavItems\(allNews\)\}/);
    assert.match(typeIndexPage, /navItems=\{newsNavItems\(allNews,\s*type\.slug\)\}/);
    assert.match(newsListPage, /navItems:\s*NavItem\[\]/);
    assert.doesNotMatch(newsListPage, /newsNavItems\(items\)/);
  });

  it('shows item type labels only on the full news overview', () => {
    const newsListPage = read('src/components/NewsListPage.astro');

    assert.match(newsListPage, /const showItemTypes = currentType === 'all'/);
    assert.match(newsListPage, /newsTypeLabel\(lead\.data\.type\)/);
    assert.match(newsListPage, /newsTypeLabel\(item\.data\.type\)/);
  });

  it('limits the homepage latest news section to two items', () => {
    const homepage = read('src/pages/index.astro');

    assert.match(homepage, /\.slice\(0,\s*2\)/);
  });

  it('preserves proper nouns in news detail titles', () => {
    const sidebarHeading = read('src/components/SidebarHeading.astro');

    assert.doesNotMatch(sidebarHeading, /<h1[^>]*\blowercase\b/);
  });

  it('keeps news detail title wrapping on word boundaries unless a word overflows', () => {
    const sidebarHeading = read('src/components/SidebarHeading.astro');

    assert.match(sidebarHeading, /\[hyphens:manual\]/);
    assert.match(sidebarHeading, /\[overflow-wrap:break-word\]/);
    assert.match(sidebarHeading, /\[word-break:normal\]/);
    assert.doesNotMatch(sidebarHeading, /\[hyphens:auto\]/);
    assert.doesNotMatch(sidebarHeading, /\[overflow-wrap:anywhere\]/);
  });

  it('keeps the desktop sidebar back link attached to the title start', () => {
    const sidebarHeading = read('src/components/SidebarHeading.astro');
    const sidebarBackLink = read('src/components/SidebarBackLink.astro');

    assert.match(
      sidebarHeading,
      /<span class="sidebar-back-anchor-group[^"]*">\s*<SidebarBackLink href=\{backHref\} variant="desktop" \/><span set:html=\{title\} \/>/m,
    );
    assert.match(sidebarBackLink, /margin-left:\s*-1\.65em/);
    assert.match(sidebarBackLink, /margin-right:\s*0\.45em/);
    assert.match(sidebarBackLink, /white-space:\s*nowrap/);
    assert.doesNotMatch(sidebarBackLink, /position:\s*absolute/);
  });

  it('strips editorial soft hyphens from metadata text', () => {
    const formatDateTime = read('src/lib/formatDateTime.ts');

    assert.match(formatDateTime, /&shy;\|\\u00ad/);
  });

  it('uses a manual soft hyphen for the overlong sidebar title compound', () => {
    const ecosocialistReport = read('src/content/posts/boekvoorstelling-manifest-ecosocialistische-revolutie.md');

    assert.match(ecosocialistReport, /title:\s*"Boek&shy;voorstelling:/);
    assert.match(ecosocialistReport, /eco&shy;socialistische revolutie/);
  });

  it('preserves proper nouns in secondary news listing titles', () => {
    const newsListPage = read('src/components/NewsListPage.astro');

    assert.match(newsListPage, /<h3[^>]*\bnormal-case\b/);
  });

  it('renders inline markdown in related activity post links as HTML', () => {
    const activitiesDetail = read('src/pages/activiteiten/[slug].astro');

    assert.match(activitiesDetail, /set:html=\{post\.title\}/);
    assert.doesNotMatch(activitiesDetail, /<em>\{post\.title\}<\/em>/);
  });

  it('links verslag source activities inline instead of showing the source event aside', () => {
    const newsDetail = read('src/pages/[type]/[slug].astro');
    const moragieReport = read('src/content/posts/de-nieuwe-jaren-dertig-zullen-andere-zijn.md');
    const ecosocialistReport = read('src/content/posts/boekvoorstelling-manifest-ecosocialistische-revolutie.md');

    assert.match(newsDetail, /source_event && item\.data\.type !== 'verslag'/);
    assert.match(moragieReport, /source_event:\n\s+slug: "studiedag-verrechtsing"/);
    assert.match(moragieReport, /\[studiedag over verrechtsing\]\(\/activiteiten\/studiedag-verrechtsing\/\)/);
    assert.match(ecosocialistReport, /source_event:\n\s+slug: "ecosocialistisch-manifest"/);
    assert.doesNotMatch(ecosocialistReport, /\]\(\/activiteiten\/ecosocialistisch-manifest\/\)/);
  });

  it('uses the SAP Rood body text for the ecosocialist manifesto report', () => {
    const ecosocialistReport = read('src/content/posts/boekvoorstelling-manifest-ecosocialistische-revolutie.md');

    assert.match(
      ecosocialistReport,
      /De kersverse vzw Ernest Mandelfonds stelde op zaterdag 10 mei 2025 in de Antwerpse boekhandel De Groene Waterman een interessant nieuw boek voor\./,
    );
    assert.match(ecosocialistReport, /### Productivisme en de ‘jonge’ Marx/);
    assert.match(ecosocialistReport, /### Constructief-kritische vragen/);
    assert.match(ecosocialistReport, /### Slotwoord/);
  });

  it('does not enlarge the first paragraph of news articles', () => {
    const globalStyles = read('src/styles/global.css');

    assert.doesNotMatch(globalStyles, /\.news-article\s*>\s*p:first-child/);
  });

  it('redirects the existing old news detail URLs to typed canonical URLs', () => {
    const redirects = read('public/_redirects');

    assert.match(redirects, /\/nieuws\/mandel-zoete-wraak-geschiedenis\s+\/lezing\/mandel-zoete-wraak-geschiedenis\s+301/);
    assert.match(redirects, /\/nieuws\/mandels-orthodox-open-romantisch-marxisme\s+\/lezing\/mandels-orthodox-open-romantisch-marxisme\s+301/);
  });
});
