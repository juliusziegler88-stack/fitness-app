# Sonstige Aktivität beim Nachtragen — Design

## Kontext

Der Workout-Picker (live) und das "Training nachtragen"-Formular kennen bisher nur feste Workouts: Ganzkörper A/B (Kraft) und Running (Cardio). Julius macht gelegentlich andere sportliche Aktivitäten (z.B. Fußball), die sich in keine dieser Kategorien einordnen lassen und bisher gar nicht erfassbar sind.

## Ziel

Eine neue Kategorie "Sonstige Aktivität", über die man frei eintippen kann, was man gemacht hat (z.B. "Fußball"). Nur zum Nachtragen nutzbar, nicht im Live-Workout-Picker.

## Datenmodell

Neuer Eintrag in `app/js/data.js` → `Data.workouts`:

```js
{ id: 'sonstiges', name: 'Sonstige Aktivität', typ: 'sonstiges', nurNachtragen: true }
```

`nurNachtragen: true` markiert Einträge, die im Live-Picker nicht auftauchen sollen.

## UI-Verhalten

**`app/js/training.js` (Live-Picker):**
Der Workout-Picker filtert Einträge mit `nurNachtragen === true` heraus:
```js
Data.workouts.filter(w => !w.nurNachtragen)
```

**`app/js/nachtrag.js` (Nachtragen-Picker):**
Zeigt weiterhin alle `Data.workouts` — inklusive "Sonstige Aktivität". Die Typ-Unterzeile (`Krafttraining`/`Cardio`) wird um einen dritten Fall ergänzt: `typ === 'sonstiges'` → "Beliebige Sportart".

**Formular (`renderForm`) bei `typ === 'sonstiges'`:**
Statt Übungsliste (Kraft) oder Fließtext (Cardio) ein Textfeld:
```html
<div class="log-input-label">Sportart</div>
<input type="text" id="nachtrag-sportart" placeholder="z.B. Fußball, Tennis, Schwimmen...">
```
Kein Dauer-Feld, kein Gewicht/Sätze/Wdh.

**Speichern (`_save`):**
Dritter Zweig neben `kraft`/sonst:
```js
workout.typ === 'sonstiges'
  ? [[datum, workout.id, sportartValue, '', '', '']]
  : ...
```
`sportartValue` = getrimmter Wert von `#nachtrag-sportart`. Ist er leer, wird **nicht** gespeichert — stattdessen Toast "Bitte Sportart eingeben" und Abbruch (kein Sheets-Request).

Damit landet die eingetippte Sportart in der bisher bei Cardio ungenutzten Spalte "Übung" von `Training_Log` (Spalte C). Kein Schema-Change am Sheet nötig.

## History-Anzeige

`Training._renderHistory()` in `app/js/training.js` zeigt pro Tag aktuell `workout.name` (z.B. "Sonstige Aktivität" für jeden `sonstiges`-Eintrag, unabhängig von der Sportart). Anpassung: Für Zeilen mit `Einheit === 'sonstiges'` wird stattdessen der Wert aus Spalte C (Übung, also die eingetippte Sportart) als Label verwendet, damit z.B. "Fußball" statt des generischen Namens erscheint.

## Sonstiges

- Service-Worker-Cache-Version in `app/sw.js` hochzählen (JS-Dateien ändern sich).
- Kein neuer Sheet-Tab, keine neue Spalte — nutzt bestehende `Training_Log`-Struktur.
- Keine Live-Session-Unterstützung (kein Timer, kein "Beginnen"-Flow) für diese Kategorie — bewusst nur Nachtragen, siehe Ziel.

## Testplan

Manuell lokal (`python3 -m http.server 8080` in `app/`):
1. Live-Picker im Training-Tab öffnen → "Sonstige Aktivität" darf **nicht** auftauchen.
2. "Training nachtragen" öffnen → "Sonstige Aktivität" **muss** auftauchen, mit Textfeld für Sportart.
3. Speichern ohne Sportart-Eingabe → Toast "Bitte Sportart eingeben", kein Sheets-Write.
4. Speichern mit "Fußball" und Datum gestern → Erfolgs-Toast, Zeile landet in `Training_Log` mit `sonstiges` in Spalte B und "Fußball" in Spalte C.
5. Zurück im Training-Tab → "Letzte Einheiten" zeigt für diesen Tag "Fußball" statt "Sonstige Aktivität".
