# ADR 0002: Concepten unlisted op de live site

- Status: aanvaard
- Datum: 2026-10-24
- Geldt voor: posts-collectie (`src/content/posts`), veld `draft`

## Context

Een artikel gaat eerst door een review in Word of Google Docs. Daarna komt het op de site, en de
auteur of redactie krijgt een link om te zien hoe het er op de website uitziet. Die link hoeft niet
afgeschermd te zijn, alleen niet vindbaar: wie de URL kent, mag het lezen.

Tot nu toe bouwde `deploy.yml` de site twee keer: productie zonder concepten, en met `SHOW_DRAFTS=true`
een tweede kopie op `concepten.ernestmandelfonds-website.pages.dev`. Daar stonden concepten op een andere
URL dan na publicatie, op een ander domein, en alleen na een push naar `main`.

## Beslissing

1. Een post met `draft: true` wordt in productie gebouwd op zijn definitieve URL (`/<slug>`), met
   `<meta name="robots" content="noindex">` en een melding bovenaan in de taal van de post (`DraftBanner`).
2. Concepten staan niet in de overzichten (`getListedPosts`) en niet in de sitemap. Een gepubliceerde
   taalversie linkt niet naar een concepttaalversie (`getVersions`). Alleen `npm run dev` toont concepten
   in de overzichten, met het woord "concept" (`DraftTag`).
3. Publiceren = `draft: false`. De URL blijft dezelfde, dus de gedeelde link wordt de echte link.
4. De `concepten`-build en -deploy verdwijnen uit `deploy.yml`. `SHOW_DRAFTS` bestaat niet meer.
5. `scripts/check-drafts-unlisted.mjs` (postbuild) faalt als een pagina naar een concept linkt, een concept
   in de sitemap staat of een concept geen noindex heeft. Een conceptpagina herkent het aan `data-draft`.

## Gevolgen

- Een concept is te raden: de slug volgt het schema auteur plus kernwoorden. Aanvaard, want het doel is
  niet-vindbaar, niet geheim.
- Een conceptlink zonder slugwijziging kan na publicatie gewoon blijven circuleren. Verandert de slug vóór
  publicatie, dan is de oude conceptlink dood; geen `redirect_from` nodig, want hij was nooit openbaar.
- Een concept dat in Sveltia wordt opgeslagen, staat na de deploy van `main` online (ongeveer een minuut).

## Afgewezen

- **Aparte conceptensite** (`--branch concepten`, de vorige werkwijze): tweede build, tweede URL die na
  publicatie verandert, ander domein.
- **Cloudflare Access op previews**: de lezer moet inloggen met een mailpincode, terwijl een link sturen
  volstaat. Vraagt ook Zero Trust activeren met betaalgegevens.
- **Preview per branch** (aparte workflow, `--branch <naam>`): meer CI voor een zeldzaam geval.
- **Onraadbare URL** (`/concept/<code>`): weer twee URL's; alleen nodig als raden een probleem wordt.
