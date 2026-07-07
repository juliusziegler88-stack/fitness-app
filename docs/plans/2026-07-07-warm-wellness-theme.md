# Warm Wellness Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das bestehende dunkle Theme wird vollständig durch ein warmes, helles Theme ("Warm Wellness") ersetzt — reine Farbwert-Änderung, keine Struktur-/Layout-Änderung.

**Architecture:** Alle Farben hängen zentral an den `:root`-CSS-Variablen in `app/styles.css`; zwei JS-Dateien (`heute.js`, `fortschritt.js`) tragen zusätzlich hartkodierte Hex-Farben für Ring-/Chart-Darstellungen, die separat aktualisiert werden müssen. PWA-Metadaten (`manifest.json`, `index.html`) und die Service-Worker-Cache-Version runden es ab.

**Tech Stack:** Vanilla CSS/JS, kein Build-Schritt. Kein Test-Framework — Verifikation erfolgt visuell im Browser über den lokalen Server (`http://localhost:8080/`), analog zum Workout-Picker-Feature.

## Global Constraints

- Spec: `docs/specs/2026-07-07-warm-wellness-theme-design.md` — jede Farbzuordnung darin muss exakt übernommen werden (keine eigenen Farbentscheidungen).
- Kein Hell/Dunkel-Umschalter — das dunkle Theme wird vollständig ersetzt, keine bedingte Logik.
- App-Icons bleiben unverändert.
- Keine Struktur-/Layout-Änderungen — nur Farbwerte in den unten genannten Dateien.
- Nach jeder Änderung an CSS/JS/manifest: die Service-Worker-Cache-Version muss am Ende einmalig hochgezählt werden (Task 4), sonst liefern bereits besuchte Browser weiterhin altes Theme aus (siehe Erfahrung aus dem Workout-Picker-Feature).

---

### Task 1: Root-Farbvariablen in `app/styles.css`

**Files:**
- Modify: `app/styles.css:1-11` (`:root`-Block)
- Modify: `app/styles.css:99` (`.btn-primary`)
- Modify: `app/styles.css:198` (`.meal-check.done::after`)
- Modify: `app/styles.css:231-234` (`.superset-group`, kein Wert-Fix nötig, `--border` existiert nach diesem Task)
- Modify: `app/styles.css:276` (`#toast`)

**Interfaces:**
- Produces: `--border` als neue CSS-Variable (vorher nirgends definiert — `.superset-group` referenzierte sie bereits, ohne dass sie existierte).

- [ ] **Step 1: `:root`-Block ersetzen**

In `app/styles.css`, Zeilen 1–11 ersetzen durch:

```css
:root {
  --bg: #FBF7F0;
  --card: #FFFFFF;
  --card2: #F4EDE2;
  --accent: #6B8F71;
  --accent-dim: #E4E9DE;
  --text: #2B2620;
  --text-muted: #8A8175;
  --danger: #C1503F;
  --border: #F0E7D8;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 2: Hartkodierte `#0f0f0f`-Textfarben durch `var(--text)` ersetzen**

Drei Stellen in derselben Datei:

```css
/* Zeile 99, vorher: .btn-primary { background: var(--accent); color: #0f0f0f; } */
.btn-primary { background: var(--accent); color: var(--text); }
```

```css
/* Zeile 198, vorher: .meal-check.done::after { content: "✓"; color: #0f0f0f; font-size: 13px; font-weight: 700; } */
.meal-check.done::after { content: "✓"; color: var(--text); font-size: 13px; font-weight: 700; }
```

```css
/* Zeile 276, vorher: color: #0f0f0f; (innerhalb von #toast { ... }) */
color: var(--text);
```

- [ ] **Step 3: Visuell im Browser verifizieren**

Lokalen Server starten (falls nicht schon aktiv):
```bash
cd app && python3 -m http.server 8080
```
`http://localhost:8080/` öffnen (harter Reload). Erwartet: Hintergrund ist cremefarben, Karten weiß, Buttons/Badges in Salbeigrün, Text dunkelbraun statt hellgrau. Der "✓"-Haken bei abgehakten Mahlzeiten und der Toast-Text sind gut lesbar (dunkel auf hellem/grünem Grund, nicht mehr fast unsichtbar).

- [ ] **Step 4: Commit**

```bash
git add app/styles.css && git commit -m "feat: apply warm wellness color tokens to root variables"
```

---

### Task 2: Makro-Ring-Farben in `app/js/heute.js`

**Files:**
- Modify: `app/js/heute.js:52-57` (`_renderRings()`, `items`-Array)

**Interfaces:**
- Consumes: keine neuen Abhängigkeiten.

- [ ] **Step 1: Farbwerte im `items`-Array ersetzen**

In `app/js/heute.js`, `_renderRings()` (aktuell Zeilen 52–57), das Array ersetzen durch:

```js
    const items = [
      { key: 'kcal',    label: 'kcal',    color: '#6B8F71' },
      { key: 'protein', label: 'Protein', color: '#C9963F' },
      { key: 'carbs',   label: 'Carbs',   color: '#B5652F' },
      { key: 'fett',    label: 'Fett',    color: '#A56B7A' }
    ];
```

- [ ] **Step 2: Visuell im Browser verifizieren**

`http://localhost:8080/` öffnen, Heute-Tab. Erwartet: Die vier Makro-Ringe zeigen Salbeigrün/Senfgelb/Terrakotta/Rosé statt der alten Grün/Blau/Gelb/Orange-Kombination.

- [ ] **Step 3: Commit**

```bash
git add app/js/heute.js && git commit -m "feat: update macro ring colors to warm wellness palette"
```

---

### Task 3: Chart-Farben in `app/js/fortschritt.js`

**Files:**
- Modify: `app/js/fortschritt.js:105-113` (`_renderGewichtChart`, `datasets`-Block)
- Modify: `app/js/fortschritt.js:134-142` (`_renderKraftChart`, `datasets`-Block)
- Modify: `app/js/fortschritt.js:215-224` (`_chartOptions`)

**Interfaces:**
- Consumes: keine neuen Abhängigkeiten. Chart.js-Instanz-API bleibt unverändert, nur Farbwerte.

- [ ] **Step 1: `_renderGewichtChart` — Farben ersetzen**

In `app/js/fortschritt.js`, im `datasets`-Objekt von `_renderGewichtChart`:

```js
        datasets: [{
          label: 'Gewicht (kg)',
          data,
          borderColor: '#6B8F71',
          backgroundColor: 'rgba(107,143,113,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#6B8F71'
        }]
```

- [ ] **Step 2: `_renderKraftChart` — Farben ersetzen**

Im `datasets`-Objekt von `_renderKraftChart`:

```js
        datasets: [{
          label: `${uebung} (kg)`,
          data,
          borderColor: '#C9963F',
          backgroundColor: 'rgba(201,150,63,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#C9963F'
        }]
```

- [ ] **Step 3: `_chartOptions()` — Achsen-/Gitterfarben ersetzen**

```js
  _chartOptions(unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8A8175', maxTicksLimit: 6 }, grid: { color: '#F0E7D8' } },
        y: { ticks: { color: '#8A8175', callback: v => `${v} ${unit}` }, grid: { color: '#F0E7D8' } }
      }
    };
  },
```

- [ ] **Step 4: Visuell im Browser verifizieren**

`http://localhost:8080/` öffnen, Fortschritt-Tab (Google-Login nötig, um Chart-Daten zu sehen — falls das Sheets-Berechtigungsproblem aus `CLAUDE.md` noch besteht, reicht die Prüfung, dass die Chart-Achsen/Gitterlinien auf hellem Grund sichtbar sind, auch ohne geladene Datenpunkte). Erwartet: Achsenbeschriftung und Gitterlinien sind dezent sichtbar (nicht mehr dunkelblau/unsichtbar), Linienfarben passen zur neuen Palette.

- [ ] **Step 5: Commit**

```bash
git add app/js/fortschritt.js && git commit -m "feat: update progress chart colors to warm wellness palette"
```

---

### Task 4: PWA-Metadaten & Service-Worker-Cache-Version

**Files:**
- Modify: `app/manifest.json`
- Modify: `app/index.html` (Meta-Tags)
- Modify: `app/sw.js` (Cache-Version)

**Interfaces:**
- Keine — reine Konfigurationswerte.

- [ ] **Step 1: `manifest.json` aktualisieren**

In `app/manifest.json`:

```json
  "background_color": "#FBF7F0",
  "theme_color": "#FBF7F0",
```

(ersetzt die bisherigen `"#0f0f0f"`-Werte in beiden Feldern)

- [ ] **Step 2: `index.html` Meta-Tags aktualisieren**

In `app/index.html`:

```html
<meta name="theme-color" content="#FBF7F0">
```

```html
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

(ersetzt `content="#0f0f0f"` bzw. `content="black-translucent"`)

- [ ] **Step 3: Service-Worker-Cache-Version hochzählen**

In `app/sw.js`, Zeile 1:

```js
const CACHE = 'fitness-v4';
```

(ersetzt `'fitness-v3'` — stellt sicher, dass bereits besuchte Browser das neue Theme laden statt den alten Cache zu behalten)

- [ ] **Step 4: Visuell im Browser verifizieren**

`http://localhost:8080/` in einem Browser öffnen, der die App vorher schon besucht hatte (nicht privat/inkognito) — hart neu laden, danach ein zweites Mal neu laden (Service-Worker-Update braucht zwei Ladevorgänge, siehe Erfahrung aus dem Workout-Picker-Feature). Erwartet: Neues helles Theme erscheint, kein altes dunkles Theme mehr sichtbar. Auf dem iPhone (falls zur Hand): App zum Homescreen hinzufügen/öffnen prüfen, ob die Statusleiste oben dunklen Text auf hellem Grund zeigt (nicht mehr weiß-auf-hell/unsichtbar).

- [ ] **Step 5: Commit**

```bash
git add app/manifest.json app/index.html app/sw.js && git commit -m "feat: update PWA theme metadata and bump cache version for warm wellness theme"
```
