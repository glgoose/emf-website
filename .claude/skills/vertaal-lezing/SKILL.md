---
name: vertaal-lezing
description: Vertaal een lezing (post met type "lezing") naar een of meer doeltalen (en, fr), als volwaardig bestand in src/content/posts/<lang>/. Gebruik bij "vertaal <lezing> naar en/fr" of /vertaal-lezing.
model: opus
---

# Vertaal-lezing

Vertaalt één lezing naar één of meer doeltalen. Zie `docs/adr/0001-i18n.md` voor het volledige
datamodel; deze skill past het toe, ze herhaalt het niet.

## Aanroep

```
/vertaal-lezing <post-id> <talen>
```

- `<post-id>`: pad onder `src/content/posts` zonder `.md` en zonder taalprefix voor het origineel
  (bv. `anton-jager-mandel-zoete-wraak-geschiedenis`, of `en/peter-drucker-three-periods-queer-marxism` als het
  origineel zelf al niet-Nederlands is).
- `<talen>`: kommagescheiden doeltalen uit `src/i18n/config.ts` (`en`, `fr`), nooit de brontaal zelf.

Voorbeeld: `/vertaal-lezing anton-jager-mandel-zoete-wraak-geschiedenis en,fr`

## Voorwaarden

- Het bronbestand heeft `type: "lezing"` en is zelf een origineel (`translation_of` niet gezet). Een
  vertaling vertalen kan niet — vertaal het origineel opnieuw.
- Voor elke doeltaal: geen bestaand bestand met `translation_of: <post-id>` en die taal. Bestaat het
  wel en heeft het `machine_translated: false` (nagelezen of handmatig vertaald), dan **stoppen en
  melden**, nooit overschrijven. Bestaat het met `machine_translated: true`, dan mag het opnieuw.

## Uitvoer

Eén bestand per doeltaal: `src/content/posts/<taal>/<vertaalde-slug>.md`.

### Frontmatter

Alle velden van het origineel overnemen en waar nodig vertalen:

| veld | actie |
|---|---|
| `title` | vertalen |
| `type` | ongewijzigd (`lezing`, de interne sleutel; het URL-woord komt uit `newsTypes.ts`) |
| `subtitle` | vertalen indien aanwezig |
| `date` | ongewijzigd |
| `summary` | vertalen |
| `author` | ongewijzigd (eigennaam) |
| `source_event.slug` | ongewijzigd (verwijst naar de nl-activiteit; er zijn geen vertaalde activiteiten) |
| `source_event.label` | vertalen |
| `source_event.note` | vertalen |
| `lead_images[].src` | ongewijzigd |
| `lead_images[].alt` | vertalen |
| `lead_credit` | vertalen indien aanwezig |
| `context_note` | vertalen indien aanwezig |
| `draft` | overnemen van het origineel |
| `redirect_from` | **niet overnemen** — een nieuwe vertaling is nooit ergens anders gepubliceerd geweest |
| `lang` | de doeltaal |
| `translation_of` | de `<post-id>` van het origineel |
| `machine_translated` | `true` (deze skill draait onbegeleid; zet `false` alleen als de gebruiker expliciet vraagt om het als nagelezen te markeren) |
| `translator` | alleen zetten als de gebruiker een naam opgeeft |

### Slug

Bereken een voorstel met `src/lib/slugify.ts`, met de kernwoorden van de **vertaalde titel** in de
doeltaal (`buildSlug(authors, translatedTitle, doeltaal)`), niet de nl-kernwoorden vertaald woord voor
woord. Dat is een voorstel, geen besluit: kort het in tot het kernbeeld van de titel (`marcia-poelman-another-beach`,
niet `…-we-still-dream-another-beach`) en **vraag de gebruiker de slug te bevestigen voordat de vertaling
gepubliceerd wordt** (`draft: false`). Na publicatie is een slug bevroren. Leg het resultaat één keer
vast in de bestandsnaam en nergens anders. Bij een lengtewaarschuwing
(`overSoftLimit`) gewoon doorgaan — de harde grens (60) faalt met een throw, dan de titelkeuze in de
kernwoorden aanpassen (minder woorden), nooit de auteursnaam inkorten.

### Lichaam (markdown)

- Structuur (koppen, alinea's, `---` scheidingen, `<p class="image-credit footnote">`-voetnoten,
  cursief/vet) exact overnemen; alleen de tekst erin vertalen.
- Voetnootverwijzingen en -nummering ongewijzigd.
- Een citaat dat in de brontekst al een vertaling is (bv. een Nederlandse vertaling van een Engels
  citaat van Marx of Trotski): niet opnieuw vertalen naar de doeltaal alsof het Nederlands is. Zoek of
  er een gangbare gepubliceerde vertaling van dat citaat in de doeltaal bestaat (het origineel, als de
  doeltaal toevallig de brontaal van het citaat is; anders een erkende vertaling) en gebruik die, met
  een voetnoot of inline vermelding van de bron als die er nog niet was. Is er geen bekende gepubliceerde
  vertaling, vertaal dan vanuit de Nederlandse tekst en noteer het geval in `docs/vertaling-twijfels.md`
  (zie hieronder).
- Eigennamen (personen, organisaties) niet vertalen. Titels van werken (boeken, artikelen) niet
  vertalen tenzij er een gangbare gepubliceerde vertaling van die titel bestaat in de doeltaal (bv. een
  boektitel die al in het Engels is uitgegeven) — gebruik dan die titel, niet een eigen vertaling.
- Links: intern naar een andere post/activiteit alleen aanpassen als er een versie van die pagina in
  de doeltaal bestaat (via `translation_of` op te zoeken); anders de nl-link laten staan. Externe links
  ongewijzigd.

### Na het schrijven

- `npm run build` (met `SHOW_DRAFTS=true` als de lezing `draft: true` is) om te zien of het bestand
  door de validatie in `src/lib/posts.ts` en het zod-schema komt.
- Bij twijfel over een term, citaat of feit (zie hierboven, of iets anders): een regel toevoegen aan
  `docs/vertaling-twijfels.md` (aanmaken als het nog niet bestaat) met de post-id, de taal, het
  fragment, en waarom het twijfelachtig is. Geen inhoud aanpassen die niet gevraagd is — twijfels
  worden gemeld, niet stilzwijgend opgelost.
