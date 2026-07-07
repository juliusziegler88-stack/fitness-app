# Workout-Picker mit Timer & Checkliste — Design Spec

**Datum:** 2026-07-07
**Status:** Genehmigt, bereit für Implementierungsplan

## Problem

Der Training-Tab zeigt aktuell nur das Workout, das laut A/B-Rotation für den heutigen Wochentag vorgesehen ist. An Ruhe- und Ausdauertagen ist es nicht möglich, ein Kraft-Workout zu starten oder nachzuholen (z.B. wenn ein Trainingstag verpasst wurde). Zusätzlich gibt es keinen Timer und keine Möglichkeit, einzelne Übungen während der Einheit abzuhaken.

## Ziel

- Jeden Tag (unabhängig vom Rotationstyp) kann jedes verfügbare Workout gestartet werden.
- Die Rotationsanzeige oben bleibt als reine Info bestehen ("was heute ansteht"), steuert aber nicht mehr, was startbar ist.
- Beim Start eines Workouts läuft ein Timer, der App-Neustarts/Tab-Wechsel übersteht.
- Übungen können einzeln abgehakt werden, zusätzlich zur bestehenden Gewicht/Sätze/Wdh-Eingabe.
- Nicht gespeicherte Trainings-Einträge (offline) gehen nicht mehr verloren, sondern werden automatisch nachgesendet.

## Nicht-Ziele

- Die A/B-Rotationslogik selbst (`rotation.js`) wird nicht verändert — sie bleibt starr am Datum, unabhängig davon, welches Workout tatsächlich gemacht wird.
- Kein Nachhol-Tracking, das die Rotation für Folgetage verschiebt.
- Kein Absichern der Gewicht/Sätze/Wdh-Eingabefelder in `localStorage` (nur der Session-State selbst wird persistiert).

## Architektur

### Neue Datei: `app/js/workout-session.js`

Kapselt die aktive Trainings-Session: Vorschau-Übergang, Timer, Checkbox-Status, Speichern, Persistenz.

### Geänderte Datei: `app/js/data.js`

Neue Struktur `Data.workouts`, referenziert bestehende `Data.plaene`:

```js
Data.workouts = [
  { id: 'A', name: 'Ganzkörper A', typ: 'kraft', plan: Data.plaene.A },
  { id: 'B', name: 'Ganzkörper B', typ: 'kraft', plan: Data.plaene.B },
  { id: 'running', name: 'Running', typ: 'cardio',
    text: 'Mindestens 30–45 min kontinuierliche Ausdauer: Laufen, Fahrrad, Rudergerät oder Schwimmen. Intensität: moderate Herzfrequenz (Zone 2), du kannst noch sprechen.' }
]
```

### Geänderte Datei: `app/js/training.js`

Rendert 4 Zustände statt der bisherigen Early-Returns nach Rotationstyp:

1. **Info-Zeile** (immer sichtbar): Badge/Text aus `Rotation.getToday()` — rein informativ.
2. **Picker** (immer sichtbar, darunter): Karten für jedes `Data.workouts`-Element, anklickbar unabhängig vom Rotationstyp.
3. **Vorschau**: nach Klick auf ein Workout — volle Übungsliste (Kraft) oder Text-Block (Running) + "Beginnen"-Button.
4. **Aktive Session**: delegiert an `WorkoutSession` — Timer, Checkboxen, Eingabefelder, "Abschließen"/"Fertig"-Button.

### Geänderte Datei: `app/js/sheets.js`

Gemeinsame Offline-Warteschlange für alle Sheets (Training_Log, Ernaehrungs_Log, Koerper).

## Datenfluss

### Session-State (`localStorage` Key `fitness_active_session`)

```js
{
  workoutId: 'A',              // Referenz auf Data.workouts[].id
  startedAt: 1720350000000,    // Timestamp beim "Beginnen"-Klick
  checked: { "Schrägbankdrücken KH": true }  // pro Übungsname, nur Kraft-Workouts
}
```

- Wird beim Klick auf "Beginnen" angelegt.
- Beim Öffnen des Training-Tabs prüft `WorkoutSession.init()` diesen Key: existiert er, wird direkt in Zustand 4 (Aktive Session) gesprungen, Timer läuft ab `startedAt` weiter, Checkboxen werden wiederhergestellt.
- Checkbox-Klicks schreiben sofort zurück in `localStorage`.
- Timer-Anzeige: `setInterval` (1s), zeigt `Date.now() - startedAt` als `mm:ss`/`hh:mm:ss`.
- Wird bei "Abschließen"/"Fertig"/"Abbrechen" gelöscht.

### Speichern (Kraft-Workout, "Abschließen")

- Format unverändert: `[Datum, Einheit, Übung, Gewicht, Sätze, Wdh]`.
- **Einheit = `workoutId` des gewählten Workouts** (nicht mehr `Rotation.getToday().typ`) — dadurch ist ein Nachhol-Log im Sheet nicht von einem regulären unterscheidbar, was gewünscht ist.
- Gewicht/Sätze/Wdh kommen wie bisher aus den Eingabefeldern zum Zeitpunkt des Abschließens (nicht persistiert).

### Speichern (Running, "Fertig")

- Schlanker Eintrag: `[Datum, 'running', '', '', '', '']` — taucht in der History auf, ohne Übungsdetails.

### Offline-Warteschlange (`localStorage` Key `fitness_pending_rows`)

- Schlägt `Sheets.append()` fehl, wird `{sheet, row}` zusätzlich in `fitness_pending_rows` (Array) abgelegt.
- Beim App-Start und bei jedem `window.addEventListener('online', ...)` versucht die App, alle wartenden Einträge nachzusenden; bei Erfolg werden sie aus der Liste entfernt.
- Gilt generisch für alle drei Sheets, implementiert als gemeinsamer Helper in `sheets.js` (nicht nur für Training).
- Toast-Text ändert sich von "bitte später synchronisieren" zu "Offline – wird automatisch nachgesendet ✓".

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| Speichern schlägt offline fehl | Zeile landet in `fitness_pending_rows`, Toast informiert über automatisches Nachsenden |
| App wird während aktiver Session geschlossen | Session-State bleibt in `localStorage`, wird beim nächsten Öffnen wiederhergestellt |
| Nutzer bricht Session ab | `fitness_active_session` wird gelöscht, zurück zum Picker, keine Sheets-Schreibung |
| Mehrere Geräte gleichzeitig aktiv | Kein Konfliktmanagement nötig — Sheets-API ist Append-only, keine Überschreibung möglich |

## Betroffene Dateien (Übersicht)

- `app/js/data.js` — neue `Data.workouts`-Struktur
- `app/js/training.js` — Umbau auf 4 Zustände, kein Early-Return mehr nach Rotationstyp
- `app/js/workout-session.js` — **neu**, Timer/Checkbox/Persistenz/Speichern
- `app/js/sheets.js` — generische Offline-Warteschlange
- `app/js/rotation.js` — unverändert (nur Info-Anzeige)
- `app/styles.css` — ggf. neue Klassen für Picker-Karten, Timer-Anzeige, Checkbox-Zeilen
