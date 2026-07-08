# Sonstige Aktivität Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine neue Kategorie "Sonstige Aktivität" im "Training nachtragen"-Formular, bei der man die Sportart frei eintippt (z.B. "Fußball") — nicht im Live-Workout-Picker sichtbar.

**Architecture:** Neuer `Data.workouts`-Eintrag mit `typ: 'sonstiges'` und `nurNachtragen: true`. `training.js` filtert `nurNachtragen`-Einträge aus dem Live-Picker heraus. `nachtrag.js` bekommt einen dritten Formular-Zweig (Textfeld statt Übungsliste/Fließtext) und speichert den eingetippten Wert in die bei Cardio bisher ungenutzte "Übung"-Spalte von `Training_Log`.

**Tech Stack:** Vanilla JS, kein Build. Kein Test-Framework — manuell im Browser verifiziert.

## Global Constraints

- Spec: `docs/specs/2026-07-09-sonstige-aktivitaet-design.md`.
- Kein Dauer-Feld, kein Timer, keine Live-Session-Unterstützung für `sonstiges`.
- `Training_Log`-Zeilenformat bleibt `[Datum, Einheit, Übung, Gewicht, Sätze, Wdh]`. Für `sonstiges`: `Einheit` = `'sonstiges'` (fix), `Übung` = eingetippte Sportart, `Gewicht`/`Sätze`/`Wdh` bleiben leer.
- Speichern ohne eingetippte Sportart ist blockiert (Toast "Bitte Sportart eingeben", kein Sheets-Request).
- Nach Abschluss: Service-Worker-Cache-Version in `app/sw.js` hochzählen (aktuell `fitness-v8` → `fitness-v9`).

---

### Task 1: `app/js/data.js` — neuer Workout-Eintrag

**Files:**
- Modify: `app/js/data.js:247-251` (`window.Data.workouts`)

**Interfaces:**
- Produces: `Data.workouts`-Eintrag `{ id: 'sonstiges', name: 'Sonstige Aktivität', typ: 'sonstiges', nurNachtragen: true }`, den Task 2 und Task 3 konsumieren.

- [ ] **Step 1: Eintrag ergänzen**

In `app/js/data.js`, `window.Data.workouts` um einen vierten Eintrag erweitern:

```js
window.Data.workouts = [
  { id: 'A', name: 'Ganzkörper A', typ: 'kraft', plan: window.Data.plaene.A },
  { id: 'B', name: 'Ganzkörper B', typ: 'kraft', plan: window.Data.plaene.B },
  { id: 'running', name: 'Running', typ: 'cardio', text: 'Mindestens 30–45 min kontinuierliche Ausdauer: Laufen, Fahrrad, Rudergerät oder Schwimmen. Intensität: moderate Herzfrequenz (Zone 2), du kannst noch sprechen.' },
  { id: 'sonstiges', name: 'Sonstige Aktivität', typ: 'sonstiges', nurNachtragen: true }
];
```

- [ ] **Step 2: Verifizieren**

```bash
node -e "
delete require.cache[require.resolve('./app/js/data.js')];
global.window = {};
require('./app/js/data.js');
const w = window.Data.workouts.find(w => w.id === 'sonstiges');
if (!w || w.typ !== 'sonstiges' || w.nurNachtragen !== true) throw new Error('sonstiges-Eintrag fehlt oder falsch: ' + JSON.stringify(w));
console.log('OK:', JSON.stringify(w));
"
```

Expected: `OK: {"id":"sonstiges","name":"Sonstige Aktivität","typ":"sonstiges","nurNachtragen":true}`

- [ ] **Step 3: Commit**

```bash
git add app/js/data.js && git commit -m "feat: add sonstige aktivität workout entry"
```

---

### Task 2: `app/js/nachtrag.js` — Formular + Speichern für `sonstiges`

**Files:**
- Modify: `app/js/nachtrag.js` (`render()` Label-Zeile, `renderForm()`, `_save()`)

**Interfaces:**
- Consumes: `Data.workouts`-Eintrag aus Task 1 (`typ: 'sonstiges'`).
- Produces: unverändertes `Nachtrag.render()`-Interface, keine neuen öffentlichen Methoden.

- [ ] **Step 1: Picker-Label um dritten Fall erweitern**

In `app/js/nachtrag.js`, `render()`, die Label-Zeile ersetzen:

```js
// vorher:
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : 'Cardio'}</div>
// nachher:
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : w.typ === 'cardio' ? 'Cardio' : 'Beliebige Sportart'}</div>
```

- [ ] **Step 2: `renderForm()` um Sportart-Textfeld erweitern**

`renderForm()` komplett ersetzen durch:

```js
  renderForm(workout) {
    const el = document.getElementById('tab-training');
    const isKraft = workout.typ === 'kraft';
    const isSonstiges = workout.typ === 'sonstiges';
    const yesterday = new Date(Date.now() - 86400000);
    const defaultDate = yesterday.toISOString().slice(0, 10);

    const alleUebungen = isKraft
      ? workout.plan.flatMap(ss => ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core'))
      : [];

    el.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px">${workout.name} nachtragen</h2>
        <div class="log-input-label">Datum</div>
        <input type="date" id="nachtrag-datum" value="${defaultDate}" style="margin-bottom:14px">
        ${isKraft
          ? workout.plan.map(ss => {
              const uebungen = ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core');
              if (!uebungen.length) return '';
              return `
                <div style="margin-bottom:14px">
                  <div class="section-title">${ss.name}</div>
                  ${uebungen.map(u => this._renderExerciseRow(u)).join('')}
                </div>
              `;
            }).join('')
          : isSonstiges
            ? `<div class="log-input-label">Sportart</div>
               <input type="text" id="nachtrag-sportart" placeholder="z.B. Fußball, Tennis, Schwimmen...">`
            : `<p style="color:var(--text-muted);line-height:1.6">${workout.text}</p>`
        }
      </div>
      <button class="btn btn-primary" id="btn-nachtrag-save">✓ Speichern</button>
      <button class="btn btn-ghost" id="btn-nachtrag-cancel" style="margin-top:8px">Zurück</button>
    `;

    document.getElementById('btn-nachtrag-save').addEventListener('click', () => this._save(workout, alleUebungen));
    document.getElementById('btn-nachtrag-cancel').addEventListener('click', () => this.render());
  },
```

- [ ] **Step 3: `_save()` um Sportart-Validierung und -Speicherung erweitern**

`_save()` komplett ersetzen durch:

```js
  async _save(workout, alleUebungen) {
    const [y, m, d] = document.getElementById('nachtrag-datum').value.split('-').map(Number);
    const datum = new Date(y, m - 1, d).toLocaleDateString('de-DE');

    let sportart = '';
    if (workout.typ === 'sonstiges') {
      sportart = document.getElementById('nachtrag-sportart').value.trim();
      if (!sportart) { App.showToast('Bitte Sportart eingeben'); return; }
    }

    const rows = workout.typ === 'kraft'
      ? alleUebungen.map(u => {
          const id = u.replace(/\s/g, '_');
          const kg = document.getElementById(`nachtrag-kg_${id}`)?.value || '0';
          const saetze = document.getElementById(`nachtrag-saetze_${id}`)?.value || '0';
          const reps = document.getElementById(`nachtrag-reps_${id}`)?.value || '0';
          return [datum, workout.id, u, kg, saetze, reps];
        })
      : [[datum, workout.id, sportart, '', '', '']];

    let offline = false;
    for (const row of rows) {
      try { await Sheets.appendSafe('Training_Log', row); }
      catch (e) { offline = true; }
    }

    App.showToast(offline ? 'Offline – wird automatisch nachgesendet ✓' : 'Einheit gespeichert ✓');
    Training.render();
  }
```

Hinweis: Für `running` bleibt `sportart` `''` (unverändert vom bisherigen Verhalten), für `sonstiges` ist es der eingetippte Wert.

- [ ] **Step 4: Manuell im Browser verifizieren**

`cd app && python3 -m http.server 8080`, `http://localhost:8080/` hart neu laden. Training-Tab → "+ Training nachtragen":
- Picker zeigt 4 Karten, "Sonstige Aktivität" mit Unterzeile "Beliebige Sportart".
- Anklicken → Formular mit Datumsfeld (vorbelegt: gestern) + Textfeld "Sportart", kein Gewicht/Sätze/Wdh.
- "Speichern" ohne Texteingabe → Toast "Bitte Sportart eingeben", Formular bleibt offen (kein Redirect).
- "Fußball" eintippen, Datum gestern, "Speichern" → Toast "Einheit gespeichert ✓", zurück zur normalen Trainingsansicht.

Expected: Kein Fehler in der Konsole, Verhalten wie beschrieben.

- [ ] **Step 5: Commit**

```bash
git add app/js/nachtrag.js && git commit -m "feat: support sonstige aktivität in nachtragen form"
```

---

### Task 3: `app/js/training.js` — Live-Picker filtern, History-Label anpassen

**Files:**
- Modify: `app/js/training.js:18-19` (`render()`, `#workout-picker`)
- Modify: `app/js/training.js:95-114` (`_renderHistory()`)

**Interfaces:**
- Consumes: `Data.workouts`-Eintrag aus Task 1 (`nurNachtragen: true`), `Training_Log`-Zeilenformat aus Task 2 (`Übung`-Spalte trägt bei `sonstiges` die Sportart).

- [ ] **Step 1: Live-Picker filtern**

In `app/js/training.js`, `render()`, die Zeile:

```js
// vorher:
      <div id="workout-picker">
        ${Data.workouts.map(w => `
// nachher:
      <div id="workout-picker">
        ${Data.workouts.filter(w => !w.nurNachtragen).map(w => `
```

- [ ] **Step 2: `_renderHistory()` — Sportart statt generischem Label bei `sonstiges`**

`_renderHistory()` komplett ersetzen durch:

```js
  async _renderHistory() {
    const el = document.getElementById('history-container');
    if (!el) return;
    if (!Auth.isSignedIn()) { el.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Anmelden um History zu sehen</p>'; return; }
    try {
      const rows = await Sheets.getAll('Training_Log');
      const tage = [...new Set(rows.map(r => r[0]))].reverse().slice(0, 5);
      el.innerHTML = tage.map(d => {
        const row = rows.find(r => r[0] === d);
        const einheit = row?.[1] || '';
        const workout = Data.workouts.find(w => w.id === einheit);
        const label = einheit === 'sonstiges' ? (row?.[2] || workout.name) : (workout ? workout.name : einheit);
        return `
          <div class="card" style="padding:12px;margin-bottom:8px">
            <span style="font-weight:600">${d}</span>
            <span class="day-badge badge-training" style="margin-left:8px;font-size:11px">${label}</span>
          </div>
        `;
      }).join('') || '<p style="color:var(--text-muted);font-size:14px">Noch keine Einheiten eingetragen</p>';
    } catch (e) { el.innerHTML = ''; }
  }
```

- [ ] **Step 3: Manuell im Browser verifizieren**

`http://localhost:8080/` neu laden, Training-Tab:
- Normaler Workout-Picker zeigt weiterhin nur 3 Karten (Ganzkörper A, Ganzkörper B, Running) — "Sonstige Aktivität" fehlt hier.
- Nach dem in Task 2 gespeicherten "Fußball"-Eintrag: "Letzte Einheiten" zeigt für den entsprechenden Tag "Fußball" statt "Sonstige Aktivität".

Expected: Kein Fehler in der Konsole, Verhalten wie beschrieben.

- [ ] **Step 4: Commit**

```bash
git add app/js/training.js && git commit -m "feat: hide sonstige aktivität from live picker, show sportart in history"
```

---

### Task 4: Service-Worker-Cache-Version hochzählen

**Files:**
- Modify: `app/sw.js`

- [ ] **Step 1: Cache-Version hochzählen**

In `app/sw.js`:

```js
const CACHE = 'fitness-v9';
```

(Keine neue Datei im `ASSETS`-Precache nötig — `js/nachtrag.js`, `js/data.js` und `js/training.js` sind bereits gelistet.)

- [ ] **Step 2: Commit**

```bash
git add app/sw.js && git commit -m "chore: bump service worker cache version for sonstige aktivität feature"
```
