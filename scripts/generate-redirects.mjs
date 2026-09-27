// Vult het gegenereerde blok in public/_redirects aan uit `redirect_from` in
// src/content/posts frontmatter. Handmatige regels buiten het blok blijven staan.
// Draait als "prebuild" (zie package.json), voor elke `npm run build`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
// TypeScript rechtstreeks in Node (type stripping, Node >= 22.18, zie engines).
import { defaultLocale, prefixedLocales } from '../src/i18n/config.ts';
import { postPath } from '../src/lib/postRoutes.ts';

const POSTS_DIR = join(import.meta.dirname, '..', 'src', 'content', 'posts');
const REDIRECTS_PATH = join(import.meta.dirname, '..', 'public', '_redirects');

const START_MARKER = '# --- gegenereerd uit redirect_from (src/content/posts), niet handmatig bewerken ---';
const END_MARKER = '# --- einde gegenereerd blok ---';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

// Posts in de standaardtaal staan direct in POSTS_DIR, andere talen in
// POSTS_DIR/<locale>/ (zie docs/adr/0001-i18n.md). Het doelpad komt uit
// dezelfde postPath als de routes, zodat /en/lecture/… hier ook klopt.
function listPostFiles() {
  const files = [];
  for (const entry of readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({ locale: defaultLocale, filename: entry.name, path: join(POSTS_DIR, entry.name) });
    } else if (entry.isDirectory() && prefixedLocales.includes(entry.name)) {
      for (const filename of readdirSync(join(POSTS_DIR, entry.name))) {
        if (filename.endsWith('.md')) {
          files.push({ locale: entry.name, filename, path: join(POSTS_DIR, entry.name, filename) });
        }
      }
    }
  }
  return files;
}

function collectRedirects() {
  const lines = [];
  for (const { locale, filename, path } of listPostFiles()) {
    const slug = filename.slice(0, -3);
    const content = readFileSync(path, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter?.redirect_from?.length) continue;
    const target = postPath(locale, frontmatter.type, slug);
    for (const oldPath of frontmatter.redirect_from) {
      lines.push(`${oldPath} ${target} 301`);
    }
  }
  return lines.sort();
}

function updateRedirectsFile(generatedLines) {
  const existing = readFileSync(REDIRECTS_PATH, 'utf-8');
  const block = [START_MARKER, ...generatedLines, END_MARKER].join('\n');

  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  let next;
  if (startIdx !== -1 && endIdx !== -1) {
    next = existing.slice(0, startIdx) + block + existing.slice(endIdx + END_MARKER.length);
  } else {
    const separator = existing.trim().length > 0 ? '\n\n' : '';
    next = block + separator + existing;
  }
  writeFileSync(REDIRECTS_PATH, next.trimStart());
}

const redirects = collectRedirects();
updateRedirectsFile(redirects);
console.log(`_redirects: ${redirects.length} gegenereerde redirect(s) uit redirect_from`);
