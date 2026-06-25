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
    assert.match(manifest, /original_url:\s*https:\/\/fourth\.international\/en\/world-congresses\/874\/699/);
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
