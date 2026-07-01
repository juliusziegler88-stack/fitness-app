# Fitness App – Design Spec
**Datum:** 1. Juli 2026  
**Nutzer:** Julius Ziegler

---

## Überblick

Persönliche PWA (Progressive Web App) die Trainingsplan und Ernährungsplan kombiniert. Gehostet auf GitHub Pages, installierbar auf iPhone-Homescreen, sieht und fühlt sich wie eine native App an. Daten werden in Google Sheets gespeichert und sind auf allen Geräten synchron.

---

## Technische Grundlagen

| | |
|---|---|
| **Plattform** | PWA – installierbar auf iPhone & Mac |
| **Hosting** | GitHub Pages (kostenlos, öffentliche URL) |
| **Datenspeicherung** | Google Sheets via Google Sheets API |
| **Offline-Fähigkeit** | Ja – App funktioniert ohne Internet (Service Worker) |
| **Design** | Dark mode, dunkel & clean |
| **Sprache** | Deutsch |

---

## Navigation

Bottom Navigation Bar mit vier festen Tabs:

```
[ Heute ]  [ Training ]  [ Ernährung ]  [ Fortschritt ]
```

---

## Tab 1: Heute (Dashboard)

Startbildschirm beim Öffnen der App. Erkennt automatisch den Tagestyp anhand von Datum und A/B-Rotation.

**Inhalte:**
- Datum + Tagestyp oben (z. B. *"Dienstag · Trainingstag A"*)
- Vier Makro-Ringe (Kalorien, Protein, Carbs, Fett) — füllen sich wenn Mahlzeiten eingetragen werden, leuchten grün bei Zielerreichung
- Mahlzeiten-Checkliste: Frühstück · Mittagessen · After Workout · Abendessen — abhakbar, Klick öffnet Rezeptvorschläge für diese Mahlzeit
- Schnellzugriff-Button zu heutiger Trainingseinheit

**Makroziele nach Tagestyp (automatisch geladen):**

| Tagestyp | Kalorien | Protein | Carbs | Fett |
|---|---|---|---|---|
| Trainingstag A/B | ~2.350 kcal | 160 g | ~290 g | 60 g |
| Ausdauertag (Sa) | ~2.300 kcal | 160 g | ~275 g | 60 g |
| Ruhetag | ~2.100 kcal | 160 g | ~210 g | 60 g |

---

## Tab 2: Training

Gym-Begleiter für aktive Trainingseinheiten.

**Inhalte:**
- Heutige Einheit angezeigt (Ganzkörper A / B / Ausdauer / Ruhetag) mit allen Übungen und Supersets
- *"Einheit starten"* Button → wechselt in Log-Modus
- **Log-Modus:** Pro Übung: Gewicht (kg), Sätze, Wiederholungen eintragen. Daneben steht immer das Ergebnis der letzten Session zum Vergleich
- *"Einheit abschließen"* speichert alles in Google Sheets
- Letzte 5 Sessions als Liste darunter (Datum + Typ)

**Trainingsplan A (Supersets):**
1. Schrägbankdrücken KH + Einarmiges KH Rudern — 4 Sätze
2. Kniebeuge LH + KH Romanian Deadlift — 4 Sätze
3. Schulterdrücken KH + Klimmzüge — 3 Sätze
4. Overhead Trizepsdrücken KH + Bizepscurl KH — 3 Sätze
5. Core + 10 min Conditioning

**Trainingsplan B (Supersets):**
1. Flachbankdrücken KH + Vorgebeugtes Rudern LH — 4 Sätze
2. Kreuzheben LH + Bulgarische Kniebeuge KH — 4 Sätze
3. Seitheben KH + Reverse Fly KH — 3 Sätze
4. Bizepscurl KH (alternierend) + Dips — 3 Sätze
5. Core + 10 min Conditioning

---

## Tab 3: Ernährung

Rezept-Nachschlagen und Makro-Tracking in einer Ansicht.

**Inhalte:**
- Makro-Tagesbalken oben (Protein / Carbs / Fett / Kalorien) — zeigen aktuellen Stand vs. Tagesziel
- Mahlzeit-Filter: *Frühstück · Mittagessen · After Workout · Abendessen* (Ruhetag: ohne After Workout)
- Rezept-Karten: Name + Makros auf einen Blick, antippen → klappt auf mit Zutaten und Zubereitung
- *"Gegessen"* Button auf jeder Karte → trägt Makros automatisch in den Tages-Tracker ein

**Rezepte je Tagestyp:** Trainingstag / Ausdauertag / Ruhetag, je 2–3 Rezepte pro Mahlzeit-Kategorie (aus Ernährungsplan.docx)

---

## Tab 4: Fortschritt

Langzeit-Übersicht über Körper und Trainingsleistung.

**Inhalte:**
- **Körpergewicht:** *"Gewicht eintragen"* Button (kein täglicher Druck — nur eintragen wenn Waage im Gym verfügbar), Linienchart des Verlaufs
- **Trainingsgewichte:** Übung auswählen → Chart zeigt Gewichtsentwicklung über Sessions
- **Wochenübersicht:** Einheiten diese Woche vs. Ziel (3–4x), als Balken
- **Streak:** Wochen in Folge mit erreichtem Trainingsziel

---

## Google Sheets Struktur

Drei Tabellen in einer Google-Tabelle:

| Tabelle | Spalten |
|---|---|
| **Training_Log** | Datum, Einheit (A/B/Ausdauer), Übung, Gewicht (kg), Sätze, Reps |
| **Ernaehrungs_Log** | Datum, Mahlzeit, Rezept, Kalorien, Protein (g), Carbs (g), Fett (g) |
| **Koerper** | Datum, Gewicht (kg) |

Einmalige Einrichtung: Google-Konto verknüpfen via OAuth. Danach vollautomatisch.

---

## Design-Richtlinien

- **Hintergrund:** #0f0f0f (fast schwarz)
- **Karten:** #1a1a2e (dunkelblau-schwarz)
- **Akzentfarbe:** #2d6a4f (dunkelgrün) → leuchtet heller bei Zielerreichung
- **Schrift:** System-Font (San Francisco auf iPhone), weiß / hellgrau
- **Navigation:** Feste Bottom Bar, aktiver Tab grün hervorgehoben
- **Eingabefelder:** Groß, gut tippbar mit einer Hand
