// With `build.format: 'file'` Astro.url.pathname is the output file
// (`/activiteiten.html`, `/index.html`) during the build. Map it back to the
// public URL, which has no extension and no trailing slash.
export function pagePath(url: URL): string {
  const path = url.pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '');
  return path || '/';
}
