# Training nachtragen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein neuer, timerloser Weg im Training-Tab, um ein Workout rückwirkend mit frei wählbarem Datum in `Training_Log` einzutragen.

**Architecture:** Neues, zustandsloses Modul `app/js/nachtrag.js` (kein `localStorage`, kein Timer) mit eigenem Picker + Formular. `training.js` bekommt einen Einstiegs-Link, der zu `Nachtrag.render()` wechselt.

**Tech Stack:** Vanilla JS, kein Build. Kein Test-Framework — DOM-Rendering manuell im Browser verifiziert, `_save`s Datumskonvertierung per Node-Snippet.

## Global Constraints

- Spec: `docs/specs/2026-07-07-training-nachtragen-design.md`.
- Kein Timer, kein Checkbox-Abhaken, keine "Letztes Mal"-Platzhalter im Nachtrag-Formular.
- Datumsformat muss exakt zum bestehenden Format passen: `new Date(...).toLocaleDateString('de-DE')` — **ohne führende Nullen** (z.B. `7.7.2026`, nicht `07.07.2026`), sonst werden Einträge desselben Tages in der History/Wochenzählung nicht als gleicher Tag erkannt (String-Vergleich, kein Datums-Parsing).
- `Training_Log`-Zeilenformat bleibt `[Datum, Einheit, Übung, Gewicht, Sätze, Wdh]`, `Einheit` = `workout.id`.
- Nach Abschluss: Service-Worker-Cache-Version in `app/sw.js` hochzählen (von `fitness-v6` auf `fitness-v7`).

---

### Task 1: `app/js/nachtrag.js` — Picker + Formular + Speichern

**Files:**
- Create: `app/js/nachtrag.js`
- Modify: `app/index.html` (Script-Tag registrieren, nach `js/workout-session.js`, vor `js/heute.js`)

**Interfaces:**
- Consumes: `Data.workouts` (Task 1 des Workout-Picker-Features, bereits gemerged), `Sheets.appendSafe` (bereits gemerged), `App.showToast` (bestehend), `Training.render()` (bestehend).
- Produces: `Nachtrag.render()` — einziger öffentlicher Einstiegspunkt, den `training.js` (Task 2) aufruft.

- [ ] **Step 1: `app/js/nachtrag.js` anlegen**

```js
window.Nachtrag = {
  render() {
    const el = document.getElementById('tab-training');
    el.innerHTML = `
      <div class="section-title">Welches Workout nachtragen?</div>
      <div id="nachtrag-picker">
        ${Data.workouts.map(w => `
          <div class="card" style="cursor:pointer" data-workout="${w.id}">
            <div style="font-weight:600;font-size:16px">${w.name}</div>
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : 'Cardio'}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-ghost" id="btn-nachtrag-back" style="margin-top:8px">Zurück</button>
    `;

    document.querySelectorAll('#nachtrag-picker [data-workout]').forEach(card => {
      card.addEventListener('click', () => {
        const workout = Data.workouts.find(w => w.id === card.dataset.workout);
        this.renderForm(workout);
      });
    });

    document.getElementById('btn-nachtrag-back').addEventListener('click', () => Training.render());
  },

  renderForm(workout) {
    const el = document.getElementById('tab-training');
    const isKraft = workout.typ === 'kraft';
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
          : `<p style="color:var(--text-muted);line-height:1.6">${workout.text}</p>`
        }
      </div>
      <button class="btn btn-primary" id="btn-nachtrag-save">✓ Speichern</button>
      <button class="btn btn-ghost" id="btn-nachtrag-cancel" style="margin-top:8px">Zurück</button>
    `;

    document.getElementById('btn-nachtrag-save').addEventListener('click', () => this._save(workout, alleUebungen));
    document.getElementById('btn-nachtrag-cancel').addEventListener('click', () => this.render());
  },

  _renderExerciseRow(uebung) {
    const id = uebung.replace(/\s/g, '_');
    return `
      <div class="exercise-row">
        <div class="exercise-name">${uebung}</div>
        <div class="log-inputs">
          <div>
            <div class="log-input-label">Gewicht (kg)</div>
            <input type="number" id="nachtrag-kg_${id}" placeholder="0" min="0" step="2.5">
          </div>
          <div>
            <div class="log-input-label">Sätze</div>
            <input type="number" id="nachtrag-saetze_${id}" placeholder="3" min="1" max="10">
          </div>
          <div>
            <div class="log-input-label">Wdh</div>
            <input type="number" id="nachtrag-reps_${id}" placeholder="8" min="1" max="30">
          </div>
        </div>
      </div>
    `;
  },

  async _save(workout, alleUebungen) {
    const [y, m, d] = document.getElementById('nachtrag-datum').value.split('-').map(Number);
    const datum = new Date(y, m - 1, d).toLocaleDateString('de-DE');

    const rows = workout.typ === 'kraft'
      ? alleUebungen.map(u => {
          const id = u.replace(/\s/g, '_');
          const kg = document.getElementById(`nachtrag-kg_${id}`)?.value || '0';
          const saetze = document.getElementById(`nachtrag-saetze_${id}`)?.value || '0';
          const reps = document.getElementById(`nachtrag-reps_${id}`)?.value || '0';
          return [datum, workout.id, u, kg, saetze, reps];
        })
      : [[datum, workout.id, '', '', '', '']];

    let offline = false;
    for (const row of rows) {
      try { await Sheets.appendSafe('Training_Log', row); }
      catch (e) { offline = true; }
    }

    App.showToast(offline ? 'Offline – wird automatisch nachgesendet ✓' : 'Einheit gespeichert ✓');
    Training.render();
  }
};
```

- [ ] **Step 2: Script-Tag in `app/index.html` registrieren**

Nach `<script src="js/workout-session.js"></script>` einfügen:

```html
  <script src="js/nachtrag.js"></script>
```

- [ ] **Step 3: Datumsformat-Verifikation per Node-Snippet**

Bestätigt, dass die Datumskonvertierung in `_save` exakt zum bestehenden Format passt (keine führenden Nullen):

```bash
node -e "
const [y, m, d] = '2026-01-05'.split('-').map(Number);
const datum = new Date(y, m - 1, d).toLocaleDateString('de-DE');
if (datum !== '5.1.2026') throw new Error('erwartet 5.1.2026 (ohne führende Null), bekommen ' + datum);
console.log('OK: Datumsformat konsistent mit toLocaleDateString(de-DE)');
"
```

Expected: `OK: Datumsformat konsistent mit toLocaleDateString(de-DE)`

- [ ] **Step 4: Manuell im Browser verifizieren**

`http://localhost:8080/` hart neu laden (Service-Worker/Cache vorher leeren falls bereits besuchter Browser), Training-Tab öffnen. In der Browser-Konsole `Nachtrag.render()` aufrufen (der Link aus Task 2 existiert noch nicht):
- Picker mit 3 Workout-Karten erscheint.
- Ganzkörper A/B anklicken → Formular mit Datumsfeld (vorbelegt: gestern) und Übungszeilen ohne Checkbox/„Letztes Mal"-Text.
- Running anklicken → Formular mit nur Datumsfeld + Info-Text, kein Eingabefeld.
- „Speichern" bei einem Kraft-Workout mit einem eingetragenen Gewicht → Toast erscheint, zurück zum normalen Training-Tab.

Expected: Kein Fehler in der Konsole, Formular verhält sich wie beschrieben.

- [ ] **Step 5: Commit**

```bash
git add app/js/nachtrag.js app/index.html && git commit -m "feat: add retroactive training entry (Nachtragen) without timer"
```

---

### Task 2: Einstiegs-Link in `app/js/training.js`

**Files:**
- Modify: `app/js/training.js:15-28` (`render()`, `innerHTML`-Template)

**Interfaces:**
- Consumes: `Nachtrag.render()` (Task 1).

- [ ] **Step 1: Link nach `#workout-picker` einfügen**

In `app/js/training.js`, im Template-String von `render()`, direkt nach dem schließenden `</div>` von `#workout-picker` und vor `<div class="section-title">Letzte Einheiten</div>` einfügen:

```html
      <div class="section-title" style="cursor:pointer;text-decoration:underline" id="btn-nachtragen">+ Training nachtragen</div>
```

Und im JS-Teil von `render()`, nach dem Event-Listener-Block für `#workout-picker [data-workout]`, ergänzen:

```js
    document.getElementById('btn-nachtragen').addEventListener('click', () => Nachtrag.render());
```

- [ ] **Step 2: Manuell im Browser verifizieren**

`http://localhost:8080/` neu laden, Training-Tab öffnen. Link „+ Training nachtragen" ist sichtbar unterhalb der 3 Workout-Karten. Klick öffnet den Nachtrag-Picker aus Task 1; „Zurück" führt wieder zur normalen Ansicht mit Tagesleiste + Workout-Karten.

- [ ] **Step 3: Commit**

```bash
git add app/js/training.js && git commit -m "feat: add entry point link for retroactive training entry"
```

---

### Task 3: Service-Worker-Cache-Version hochzählen

**Files:**
- Modify: `app/sw.js`

- [ ] **Step 1: Cache-Version hochzählen und `nachtrag.js` ins Precache aufnehmen**

In `app/sw.js`:

```js
const CACHE = 'fitness-v7';
const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.json',
  'js/config.js', 'js/data.js', 'js/rotation.js',
  'js/auth.js', 'js/sheets.js', 'js/workout-session.js', 'js/nachtrag.js', 'js/heute.js',
  'js/training.js', 'js/ernaehrung.js', 'js/fortschritt.js',
  'js/app.js', 'icons/icon-192.png', 'icons/icon-512.png'
];
```

- [ ] **Step 2: Commit**

```bash
git add app/sw.js && git commit -m "chore: bump service worker cache version and precache nachtrag.js"
```
