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

  it('shows item type labels only on the full news overview', () => {
    const newsListPage = read('src/components/NewsListPage.astro');

    assert.match(newsListPage, /const showItemTypes = currentType === 'all'/);
    assert.match(newsListPage, /newsTypeLabel\(lead\.data\.type\)/);
    assert.match(newsListPage, /newsTypeLabel\(item\.data\.type\)/);
  });

  it('preserves proper nouns in news detail titles', () => {
    const sidebarHeading = read('src/components/SidebarHeading.astro');

    assert.doesNotMatch(sidebarHeading, /<h1[^>]*\blowercase\b/);
  });

  it('preserves proper nouns in secondary news listing titles', () => {
    const newsListPage = read('src/components/NewsListPage.astro');

    assert.match(newsListPage, /<h3[^>]*\bnormal-case\b/);
  });

  it('redirects the existing old news detail URLs to typed canonical URLs', () => {
    const redirects = read('public/_redirects');

    assert.match(redirects, /\/nieuws\/mandel-zoete-wraak-geschiedenis\s+\/lezing\/mandel-zoete-wraak-geschiedenis\s+301/);
    assert.match(redirects, /\/nieuws\/mandels-orthodox-open-romantisch-marxisme\s+\/lezing\/mandels-orthodox-open-romantisch-marxisme\s+301/);
  });
});
