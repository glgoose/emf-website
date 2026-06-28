import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('publication detail pages', () => {
  it('has a markdown detail page for every publication listed on the overview', () => {
    const overview = read('src/pages/publicaties.astro');
    const slugs = [...overview.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);

    assert.ok(slugs.length > 0, 'overview should list publications');

    for (const slug of slugs) {
      assert.ok(
        existsSync(join(root, `src/content/publicaties/${slug}.md`)),
        `${slug} should have a publication detail markdown file`,
      );
    }
  });

  it('keeps the ecosocialist manifesto publication metadata complete', () => {
    const manifest = read('src/content/publicaties/ecosocialistisch-manifest.md');
    const overview = read('src/pages/publicaties.astro');

    assert.match(manifest, /title:\s*Manifest voor een ecosocialistische revolutie/);
    assert.match(overview, /title:\s*'Manifest voor een ecosocialistische revolutie'/);
    assert.match(manifest, /publication_date:\s*2025-05-10/);
    assert.match(manifest, /pages:\s*64/);
    assert.match(manifest, /isbn:\s*"?9789083549705"?/);
    assert.match(manifest, /original_title:\s*Manifesto for an Ecosocialist Revolution/);
    assert.match(manifest, /original_year:\s*2025/);
    assert.match(manifest, /original_url:\s*https:\/\/resistancebooks\.org\/product\/manifesto-for-an-ecosocialist-revolution\//);
    assert.doesNotMatch(manifest, /original_note:/);
    assert.match(manifest, /In mei 2025 nam het 18e wereldcongres van de Vierde Internationale een \[\*Ecosocialistisch manifest\*\]/);
  });

  it('does not hardcode cover credits across all publication detail pages', () => {
    const detailPage = read('src/pages/publicaties/[slug].astro');
    const introduction = read('src/content/publicaties/inleiding-tot-het-marxisme.md');
    const manifest = read('src/content/publicaties/ecosocialistisch-manifest.md');

    assert.match(detailPage, /cover_credit/);
    assert.match(introduction, /cover_credit:[\s\S]*?Xú Hàorán/);
    assert.doesNotMatch(manifest, /cover_credit:/);
  });

  it('links original publication title and year without an underline', () => {
    const detailPage = read('src/pages/publicaties/[slug].astro');

    assert.match(detailPage, /href=\{original_url\}/);
    assert.match(detailPage, /class="original-link"/);
    assert.match(detailPage, /\.publication-meta \.original-link[\s\S]*?text-decoration:\s*none/);
  });
});

describe('news title markdown', () => {
  it('renders inline markdown in post titles without passing HTML to metadata titles', () => {
    const config = read('src/content.config.ts');
    const detailPage = read('src/pages/[type]/[slug].astro');
    const overview = read('src/components/NewsListPage.astro');
    const homepage = read('src/pages/index.astro');
    const post = read('src/content/posts/boekvoorstelling-manifest-ecosocialistische-revolutie.md');

    assert.match(post, /title:\s*"Boek&shy;voorstelling: \*Manifest voor een eco&shy;socialistische revolutie\*"/);
    assert.match(config, /title:\s*z\.string\(\)\.transform\(mdInline\)/);
    assert.match(detailPage, /const plainTitle = stripHtml\(title\)/);
    assert.match(detailPage, /<BaseLayout title=\{plainTitle\}/);
    assert.match(overview, /set:html=\{lead\.data\.title\}/);
    assert.match(overview, /set:html=\{item\.data\.title\}/);
    assert.match(homepage, /set:html=\{post\.data\.title\}/);
  });
});
