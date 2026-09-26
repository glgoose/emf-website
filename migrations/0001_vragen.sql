-- Vragen uit de zaal, per event (event_slug = bestandsnaam in src/content/events zonder .md)
CREATE TABLE vragen (
  id                  INTEGER PRIMARY KEY,
  event_slug          TEXT    NOT NULL,
  tekst               TEXT    NOT NULL,
  naam                TEXT,                      -- NULL = anoniem
  voor_wie            TEXT,                      -- NULL = Allen, anders exacte sprekersnaam
  status              TEXT    NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'nu', 'beantwoord', 'verborgen')),
  aangemaakt_op       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status_gewijzigd_op TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_vragen_event_status ON vragen (event_slug, status);
CREATE INDEX idx_vragen_event_id     ON vragen (event_slug, id);

-- Eén rij per event, +1 bij elke schrijfactie. Pollers vragen eerst alleen dit getal op.
CREATE TABLE vragen_versie (
  event_slug TEXT    PRIMARY KEY,
  versie     INTEGER NOT NULL
);
