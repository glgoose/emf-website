# Vertaling: twijfels en keuzes

Oordeelsvragen bij vertaalde lezingen (zie `.claude/skills/vertaal-lezing/SKILL.md`). Per geval de post-id,
de taal, het fragment en waarom het een keuze was.

## 2026-09-28: slugs van vertaalde titels met apostrof

**Posts:** `fr/marcia-poelman-nous-revons-toujours-d-une`, `fr/anton-jager-mandel-douce-revanche-l-histoire`,
`en/alex-de-jong-mandel-s-orthodox-open-romantic` (fr, en)

**Fragment:** `*Nous rêvons toujours d'une autre plage*`, `Mandel et la douce revanche de l'histoire`,
`Mandel's Orthodox, Open and Romantic Marxism`

**Probleem:** `toAsciiSlugWords()` in `src/lib/slugify.ts` verving de apostrof door een spatie, dus `d'une` werd
twee woorden (`d`, `une`), `l'histoire` werd `l` + `histoire` en `Mandel's` werd `mandel` + `s`. Geen van die
fragmenten stond in de stopwoordlijst, dus ze namen een van de vijf kernwoordplaatsen in. Gevolg:

| Taal | Oude slug | Wat misging |
|---|---|---|
| fr | `marcia-poelman-nous-revons-toujours-d-une` | stopt voor `autre plage`, de woorden die de titel dragen |
| fr | `anton-jager-mandel-douce-revanche-l-histoire` | los fragment `-l-` |
| en | `alex-de-jong-mandel-s-orthodox-open-romantic` | los fragment `-s-`, en `marxism` viel weg |

**Oplossing in `src/lib/slugify.ts`:**

- Weglatingen per taal verwijderen voor het splitsen: fr `c' d' j' l' m' n' s' t' qu' jusqu' lorsqu' puisqu'
  quoiqu'` aan het woordbegin, en het Engelse bezittelijke `'s`. Alleen aan de woordgrens, zodat `aujourd'hui`
  heel blijft (`aujourdhui`).
- Overgebleven apostroffen (ook de typografische `'`) worden weggelaten in plaats van een spatie: `don't` wordt
  `dont`, niet `don-t`.
- Stopwoorden aangevuld volgens het slug-schema in `CLAUDE.md` (geen lidwoorden en voegwoorden): fr `un`,
  `une`, `des`, `ou`; en `a`, `an`, `or`; nl `of`.
- `&shy;` en het zachte afbreekteken worden weggelaten; andere HTML-entiteiten worden een spatie. Zonder dat
  werd `Boek&shy;voorstelling` tot `boek-shy-voorstelling`.

Getest tegen alle titels in de collectie en een paar Franse titels met weglatingen (`L'État et la révolution`
geeft `etat-revolution`, `Qu'est-ce que le fascisme aujourd'hui ?` geeft `est-ce-que-fascisme-aujourdhui`).
De slugs van `fr/alex-de-jong-marxisme-orthodoxe-ouvert-romantique-mandel` en de twee andere Engelse lezingen
blijven gelijk. Bestaande nl-slugs veranderen niet, want slugs staan in de bestandsnaam en worden niet
herberekend.

**Hernoemd** (met `redirect_from` naar het oude, gepubliceerde pad, één hop, gecontroleerd met
`wrangler pages dev dist`):

- `/fr/conference/marcia-poelman-nous-revons-toujours-d-une` → `/fr/conference/marcia-poelman-nous-revons-toujours-autre-plage`
- `/fr/conference/anton-jager-mandel-douce-revanche-l-histoire` → `/fr/conference/anton-jager-mandel-douce-revanche-histoire`
- `/en/lecture/alex-de-jong-mandel-s-orthodox-open-romantic` → `/en/lecture/alex-de-jong-mandel-orthodox-open-romantic-marxism`

De vertaalde titels zelf zijn in orde en ongewijzigd.

## 2026-09-28: type-woord `conference` voor lezing (fr)

**Waar:** `src/lib/newsTypes.ts`, `slugs.fr` van `lezing`; URL `/fr/conference/<slug>`

**Verdict: behouden.**

- *Conférence* is in het Frans het gewone woord voor een voordracht voor publiek: *donner une conférence*, *un
  conférencier*, *cycle de conférences*. De betekenis "congres" bestaat ook, maar in een pad onder `/fr/` en
  naast een auteursnaam leest een Franstalige lezer het als "voordracht".
- Het alternatief dat het dichtst bij het Engels ligt, `lecture`, is in het Frans een valse vriend: het
  betekent "lezing" in de zin van "het lezen" (*la lecture d'un texte*). Voor Marcia's tekst, een pamflet dat
  werd voorgelezen, zou dat zelfs de verkeerde lezing uitlokken.
- `intervention` (bijdrage op een studiedag, gangbaar in activistische en academische kringen) past bij de
  studiedag-teksten maar is als categorienaam vager. `expose` doet schools aan, `discours` is een toespraak.
- Accenten weglaten in URL's is gewoon in het Frans (Le Monde: `/2026/09/27/feminicide-dans-le-cher-...-place-en-detention-provisoire`),
  dus `conference` leest niet als een tikfout. Het ASCII-beleid in `CLAUDE.md` blijft staan.

Kanttekening: ook het nl `lezing` dekt zowel een uitgeschreven voordracht als een voorgelezen tekst; het
Franse woord erft die rekbaarheid en voegt geen nieuwe dubbelzinnigheid toe.

**Later dezelfde dag:** posts staan nu in elke taal op `/<slug>`, zonder taalprefix en zonder type-woord
(beslissing 11 in `docs/adr/0001-i18n.md`). `conference` komt dus niet meer in een URL voor; het verdict
hierboven geldt alleen nog als het type-woord ooit terugkeert. De hernoemde paden hierboven verwijzen nu in
één hop naar `/marcia-poelman-nous-revons-toujours-autre-plage`, `/anton-jager-mandel-douce-revanche-histoire`
en `/alex-de-jong-mandel-orthodox-open-romantic-marxism`.

## 2026-09-28: slugs ingekort tot het kernbeeld

Na de overstap naar `/<slug>` gekozen door de redactie:

| Taal | Oud | Nieuw |
|---|---|---|
| nl | `/anton-jager-mandel-zoete-wraak` | `/anton-jager-mandel-zoete-wraak-geschiedenis` |
| en | `/marcia-poelman-we-still-dream-another-beach` | `/marcia-poelman-another-beach` |
| fr | `/marcia-poelman-nous-revons-toujours-autre-plage` | `/marcia-poelman-autre-plage` |

Logica: auteur voorop, dan het kernbeeld van de titel. Werkwoorden en bijwoorden (*we still dream*, *nous
rêvons toujours*) vallen weg, een vaste uitdrukking (*de zoete wraak van de geschiedenis*) blijft heel. Zo
volgen de drie talen van één werk hetzelfde beeld (`ander-strand`, `another-beach`, `autre-plage`). Vanaf
nu bevestigt de gebruiker elke slug vóór de eerste publicatie. Alle oude paden staan in `redirect_from`.
