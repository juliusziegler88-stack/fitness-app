# Warm Wellness Light Theme — Design Spec

**Datum:** 2026-07-07
**Status:** Genehmigt, bereit für Implementierungsplan

## Problem

Die App nutzt aktuell ein dunkles Theme (`--bg: #0f0f0f`). Julius möchte weg vom Dunkelmodus hin zu einer helleren, wärmeren Optik.

## Ziel

Das dunkle Theme wird vollständig durch ein neues, warmes helles Theme ("Warm Wellness") ersetzt — kein Umschalter, keine Beibehaltung des dunklen Modus als Option.

## Farb-Tokens

Ersetzt die bestehenden `:root`-Variablen in `app/styles.css`:

| Variable | Alt | Neu | Verwendung |
|---|---|---|---|
| `--bg` | `#0f0f0f` | `#FBF7F0` | Seitenhintergrund (cremefarben) |
| `--card` | `#1a1a2e` | `#FFFFFF` | Karten-Hintergrund |
| `--card2` | `#16213e` | `#F4EDE2` | Sekundärer Karten-/Eingabefeld-Hintergrund |
| `--accent` | `#52b788` | `#6B8F71` | Primärfarbe (Salbeigrün) |
| `--accent-dim` | `#2d6a4f` | `#E4E9DE` | Gedämpfte Akzentfläche (z.B. aktive Badges/Chips) |
| `--text` | `#e0e0e0` | `#2B2620` | Haupttextfarbe |
| `--text-muted` | `#888` | `#8A8175` | Sekundärtext |
| `--danger` | `#e05252` | `#C1503F` | Fehler-/Warnfarbe |
| `--border` | *(nie definiert)* | `#F0E7D8` | **Neu** — behebt einen bestehenden Bug: `.superset-group` nutzt bereits `var(--border)`, das aber nie in `:root` definiert war |

`--safe-bottom` bleibt unverändert (kein Farbwert).

## Makro-Ring-Farben (4 Ringe: kcal, Protein, Carbs, Fett)

In `app/js/heute.js`, `_renderRings()`, das `items`-Array:

| Ring | Alt | Neu |
|---|---|---|
| kcal | `#52b788` | `#6B8F71` (= `--accent`, Salbeigrün) |
| Protein | `#52a8e0` | `#C9963F` (Senfgelb) |
| Carbs | `#e0b852` | `#B5652F` (Terrakotta) |
| Fett | `#e08852` | `#A56B7A` (gedecktes Rosé) |

## Fortschritts-Charts (`app/js/fortschritt.js`)

- `_renderGewichtChart`: `borderColor`/`pointBackgroundColor` von `#52b788` → `#6B8F71`; `backgroundColor` von `rgba(82,183,136,0.1)` → `rgba(107,143,113,0.1)` (gleiche Formel, neue RGB-Werte für Sage).
- `_renderKraftChart`: `borderColor`/`pointBackgroundColor` von `#52a8e0` → `#C9963F`; `backgroundColor` von `rgba(82,168,224,0.1)` → `rgba(201,150,63,0.1)`.
- `_chartOptions()`: `ticks.color` von `#888` → `#8A8175` (= `--text-muted`); `grid.color` von `#2a2a3e` (dunkles Navy, auf hellem Grund unsichtbar/falsch) → `#F0E7D8` (= `--border`).

## Hartkodierte Textfarben in `app/styles.css`

Zwei Stellen nutzen `#0f0f0f` (Text auf Akzentfarbe) fest verdrahtet statt einer Variable:
- `.btn-primary { color: #0f0f0f; }` → `color: var(--text);`
- `#toast { color: #0f0f0f; }` → `color: var(--text);`

Damit folgen beide automatisch der neuen Textfarbe, statt weiterhin einen Restwert aus dem alten Dark-Theme zu tragen.

## PWA-Metadaten

- `app/manifest.json`: `background_color` und `theme_color` von `#0f0f0f` → `#FBF7F0`.
- `app/index.html`: `<meta name="theme-color" content="#0f0f0f">` → `content="#FBF7F0"`; `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` → `content="default"` (sonst zeigt iOS eine helle/unsichtbare Statusleiste auf hellem Hintergrund).

## Service Worker

`app/sw.js`: `CACHE`-Version von `fitness-v3` auf `fitness-v4` hochzählen — sonst liefern bereits besuchte Browser (wie beim Workout-Picker-Feature erlebt) weiterhin das alte dunkle Theme aus dem Cache aus.

## Nicht-Ziele

- Kein Hell/Dunkel-Umschalter — das dunkle Theme wird vollständig ersetzt, nicht optional gemacht.
- App-Icons (`icons/icon-192.png`, `icons/icon-512.png`) bleiben unverändert (dunkler Hintergrund) — das Homescreen-Icon ist bewusst von der In-App-Farbgebung getrennt.
- Keine Struktur-/Layout-Änderungen — nur Farbwerte.

## Betroffene Dateien (Übersicht)

- `app/styles.css` — Root-Variablen + 2 hartkodierte Textfarben
- `app/js/heute.js` — 4 Ring-Farben
- `app/js/fortschritt.js` — Chart-Farben + Achsen-/Gitterfarben
- `app/manifest.json` — PWA-Hintergrund-/Themefarbe
- `app/index.html` — theme-color Meta-Tag + Statusleisten-Stil
- `app/sw.js` — Cache-Version hochzählen
