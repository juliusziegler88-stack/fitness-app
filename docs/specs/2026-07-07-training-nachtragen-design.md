# Training nachtragen — Design Spec

**Datum:** 2026-07-07
**Status:** Genehmigt, bereit für Implementierungsplan

## Problem

Jeder Trainings-Eintrag wird aktuell zwingend mit dem heutigen Datum gespeichert (`new Date().toLocaleDateString('de-DE')` in `WorkoutSession._finish`). Vergisst Julius, ein Training direkt einzutragen, kann er es nicht nachträglich mit dem korrekten (vergangenen) Datum erfassen.

## Ziel

Ein neuer, einfacherer Weg im Training-Tab, um ein Workout **ohne Timer** rückwirkend mit frei wählbarem Datum einzutragen.

## Nicht-Ziele

- Kein Timer, kein Live-Abhaken während des Nachtragens — das Training ist ja bereits vorbei.
- Keine "Letztes Mal"-Platzhalter-Werte im Nachtrag-Formular (bewusste Vereinfachung, siehe Diskussion).
- Keine Änderung an bereits gespeicherten Einträgen (nur neue Einträge mit wählbarem Datum) — Bearbeiten/Löschen bestehender Zeilen ist out of scope.
- Kein Datumslimit in die Zukunft/Vergangenheit — ein natives `<input type="date">` reicht, keine eigene Kalender-Komponente.

## Architektur

### `app/js/training.js` — Einstiegspunkt

Unterhalb von `#workout-picker` (nach den 3 Karten, vor "Letzte Einheiten") ein neuer Link:

```html
<div class="section-title" style="cursor:pointer" id="btn-nachtragen">+ Training nachtragen</div>
```

Klick → `Nachtrag.renderPicker()` (neues Modul, siehe unten) übernimmt das Rendering von `#tab-training`.

### Neues Modul `app/js/nachtrag.js`

Zwei Ansichten, beide ersetzen `#tab-training`:

1. **`renderPicker()`** — dieselben 3 `Data.workouts`-Karten wie der Haupt-Picker, aber Überschrift "Welches Workout nachtragen?" und ein "Zurück"-Button zu `Training.render()`.
2. **`renderForm(workout)`** — Formular:
   - `<input type="date">`, vorbelegt mit **gestern** (`new Date(Date.now() - 86400000)`), Format `YYYY-MM-DD` für den Input, beim Speichern umgewandelt ins bestehende `DD.MM.YYYY`-Format (`toLocaleDateString('de-DE')`).
   - Bei `workout.typ === 'kraft'`: Übungsliste aus `workout.plan` (gleiche Filterung wie bestehend: `!u.includes('Conditioning') && u !== 'Core'`), pro Übung nur Gewicht/Sätze/Wdh-Inputs (kein Checkbox, kein "Letztes Mal"-Text, leere Felder mit einfachen Standard-Placeholdern wie `0`/`3`/`8`, analog zum ursprünglichen Verhalten vor der "Letztes Mal"-Funktion).
   - Bei `workout.typ === 'cardio'`: nur der Text-Block (`workout.text`) zur Info, kein Eingabefeld.
   - Button "Speichern" → baut die Zeilen (gleiche Spaltenreihenfolge wie `WorkoutSession._finish`: `[Datum, Einheit, Übung, Gewicht, Sätze, Wdh]`, `Einheit` = `workout.id`) mit dem gewählten Datum, ruft `Sheets.appendSafe('Training_Log', row)` pro Zeile auf (gleiche Offline-Behandlung wie beim Live-Flow: bei Fehler `Sheets.appendSafe` fängt/queued automatisch), zeigt denselben Toast-Mechanismus ("Einheit gespeichert ✓" / "Offline – wird automatisch nachgesendet ✓"), dann zurück zu `Training.render()`.
   - "Zurück"-Button → `Nachtrag.renderPicker()`.

## Datenfluss

`Nachtrag.renderForm(workout)` → Nutzer trägt Datum + Werte ein → "Speichern" → für jede Übung (oder einmalig bei cardio) `Sheets.appendSafe('Training_Log', [gewaehltesDatum, workout.id, uebung, kg, saetze, reps])` → Toast → `Training.render()`.

Kein Zusammenhang mit `WorkoutSession`/`localStorage`-Session-State — der Nachtrag-Flow ist komplett zustandslos (kein Timer, keine Persistenz zwischen Reloads nötig, da das Formular in einem Rutsch ausgefüllt und abgeschickt wird).

## Betroffene Dateien

- `app/js/training.js` — Link "+ Training nachtragen" in der Picker-Ansicht, Script-Tag-Registrierung für `nachtrag.js` in `app/index.html`.
- `app/js/nachtrag.js` — **neu**, Picker + Formular + Speichern.
- `app/index.html` — neuer `<script>`-Tag für `nachtrag.js`.
- `app/sw.js` — Cache-Version hochzählen.
