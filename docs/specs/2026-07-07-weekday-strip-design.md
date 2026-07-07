# Wochentags-Leiste im Training-Tab — Design Spec

**Datum:** 2026-07-07
**Status:** Genehmigt, bereit für Implementierungsplan

## Problem

Der Training-Tab zeigt aktuell nur eine Info-Zeile für den heutigen Rotationsstatus (Trainingstag A/B, Ausdauertag, Ruhetag). Julius möchte auf einen Blick sehen können, was an anderen Tagen der aktuellen Woche laut Rotation ansteht — ohne dafür extra zu warten oder nachzurechnen.

## Ziel

Eine Reihe kleiner runder Tages-Buttons (Mo–So der aktuellen Kalenderwoche) oberhalb der bestehenden Badge-Zeile im Training-Tab. Klick auf einen Tag zeigt dessen Rotationsstatus (nur als Badge-Text, keine Übungsdetails) an. Workout-Auswahl (die 3 Karten) und "Letzte Einheiten" bleiben davon unberührt — die Leiste ist eine reine Vorschau des Wochenplans, keine Einschränkung, was gestartet werden kann.

## Nicht-Ziele

- Keine Navigation zu anderen Kalenderwochen (nur die aktuelle Woche, fix Mo–So).
- Keine volle Übungslisten-Vorschau beim Tageswechsel — nur der Badge-Text ändert sich.
- Die Auswahl beeinflusst nicht, welches Workout startbar ist (weiterhin alle 3 jederzeit).
- Keine Persistenz der Auswahl — jedes Öffnen des Tabs setzt auf den heutigen Tag zurück.

## Architektur

### `app/js/rotation.js` — Generalisierung

Neue Methode `getForDate(date)`, die die bestehende Logik (bisher fest an `new Date()` gebunden) für ein beliebiges `Date`-Objekt berechnet:

```js
getForDate(date) {
  const dow = date.getDay();
  if (dow === 6) return { typ: 'ausdauer', label: 'Ausdauertag', badgeClass: 'badge-ausdauer' };
  if (![1, 3, 5].includes(dow)) return { typ: 'ruhetag', label: 'Ruhetag', badgeClass: 'badge-ruhetag' };

  const diffMs = date - this.START;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const isWeek1 = diffWeeks % 2 === 0;
  const idx = dow === 1 ? 0 : dow === 3 ? 1 : 2;
  const muster = isWeek1 ? ['A', 'B', 'A'] : ['B', 'A', 'B'];
  const typ = muster[idx];
  return { typ, label: `Trainingstag ${typ}`, badgeClass: 'badge-training' };
},

getToday() {
  return this.getForDate(new Date());
},
```

`getDatenKey()` bleibt unverändert. Datumswerte, die für die Wochentage der Leiste konstruiert werden, werden auf Mitternacht normalisiert (`setHours(0,0,0,0)`), damit die Wochenparitäts-Berechnung konsistent bleibt.

### `app/js/training.js` — Tagesleiste + State

- Neuer State `this.selectedDate` — wird bei jedem `render()` auf `new Date()` (heute) zurückgesetzt.
- Hilfsfunktion berechnet den Montag der aktuellen Woche aus `selectedDate` und daraus alle 7 Tage (Mo–So).
- Die Leiste wird in einem eigenen Container `<div id="day-nav">` gerendert, der Badge-Zeile direkt darüber/darunter ebenfalls in diesem Container.
- Klick auf einen Tag-Button: `selectedDate` aktualisieren, nur `#day-nav` neu rendern (kein voller `render()`-Aufruf) — Workout-Picker und Historie bleiben unangetastet im DOM.
- Visuelle Unterscheidung: der **ausgewählte** Tag ist farblich hervorgehoben (gefüllter Kreis mit `--accent`); **heute** bekommt zusätzlich einen kleinen Punkt darunter, sichtbar auch wenn ein anderer Tag ausgewählt ist.

## Datenfluss

1. `Training.render()` → `this.selectedDate = new Date()` → `_renderDayNav()` rendert Leiste + Badge für `Rotation.getForDate(this.selectedDate)`.
2. Klick auf Tag-Button → `this.selectedDate` = das Datum dieses Buttons → `_renderDayNav()` erneut aufgerufen (nur dieser Container wird ersetzt).
3. Workout-Picker (`Data.workouts`) und "Letzte Einheiten" (`Sheets.getAll('Training_Log')`) bleiben komplett unabhängig von `selectedDate`.

## Betroffene Dateien

- `app/js/rotation.js` — `getForDate(date)` neu, `getToday()` wird Wrapper.
- `app/js/training.js` — `selectedDate`-State, `_renderDayNav()`, Wochentag-Berechnung, Klick-Handler.
- `app/styles.css` — neue Klassen für die Tages-Buttons (kleine runde Buttons + "heute"-Punkt-Indikator).
