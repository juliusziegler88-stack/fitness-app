# Workout-Picker mit Timer & Checkliste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedes Workout (Ganzkörper A/B, Running) kann an jedem Tag unabhängig von der A/B-Rotation gestartet werden, mit persistentem Timer, Übungs-Checkboxen und automatischem Nachsenden nicht gespeicherter Trainings-Einträge bei fehlender Internetverbindung.

**Architecture:** Neues Modul `workout-session.js` kapselt Timer/Checkbox/Persistenz einer aktiven Trainings-Session (State in `localStorage`, überlebt Reload/App-Neustart). `training.js` wird auf einen 4-Zustands-Flow umgebaut (Info-Zeile → Picker → Vorschau → delegiert an `WorkoutSession`). `sheets.js` bekommt eine generische Offline-Warteschlange, die von Training, Ernährung und Körpergewicht gemeinsam genutzt wird.

**Tech Stack:** Vanilla JS (Browser-Globals, kein Modul-System, kein Build), Google Sheets API v4, `localStorage`. Kein Test-Framework im Projekt vorhanden — reine Logik-Funktionen werden mit kurzen Node-Snippets (`node -e`, mit gefaktem `window`/`localStorage`) verifiziert, DOM-Rendering wird manuell im Browser über den lokalen Server (`http://localhost:8080/`) geprüft.

## Global Constraints

- Spec: `docs/specs/2026-07-07-workout-picker-design.md` — jede Anforderung darin muss durch mindestens eine Task hier abgedeckt sein.
- Die A/B-Rotationslogik (`rotation.js`) wird nicht verändert — nur ihre Verwendung in `training.js` (nur noch Info-Anzeige, keine Steuerung).
- Speicherformat `Training_Log` bleibt `[Datum, Einheit, Übung, Gewicht, Sätze, Wdh]` — "Einheit" wird ab jetzt das gewählte Workout (`workoutId`), nicht mehr `Rotation.getToday().typ`.
- Kein neues npm/Build-Tooling — alle neuen Dateien sind plain `<script>`-Includes wie die bestehenden.
- Bestehende Funktionalität (Gewicht/Sätze/Wdh-Eingabe, "Letztes Mal"-Anzeige, Fortschritts-Charts) darf nicht regressieren.

---

### Task 1: Data.workouts — Workout-Liste unabhängig von der Rotation

**Files:**
- Modify: `app/js/data.js:245` (nach der schließenden `};` des bestehenden `window.Data`-Objekts anhängen)

**Interfaces:**
- Produces: `Data.workouts` — Array von `{ id: string, name: string, typ: 'kraft'|'cardio', plan?: array, text?: string }`. `plan` referenziert `Data.plaene.A`/`Data.plaene.B` (keine Kopie). Spätere Tasks (workout-session.js, training.js) iterieren über `Data.workouts` und lesen `.id`, `.name`, `.typ`, `.plan`, `.text`.

- [ ] **Step 1: Schreibe das Node-Verifikationsskript und führe es aus, um zu bestätigen, dass es (mangels `Data.workouts`) fehlschlägt**

```bash
node -e "
global.window = {};
require('./app/js/data.js');
const w = window.Data.workouts;
if (!Array.isArray(w)) throw new Error('Data.workouts fehlt oder ist kein Array');
if (w.length !== 3) throw new Error('erwartet 3 Workouts, bekommen ' + (w && w.length));
if (w[0].id !== 'A' || w[0].plan !== window.Data.plaene.A) throw new Error('Workout A referenziert nicht Data.plaene.A');
if (w[1].id !== 'B' || w[1].plan !== window.Data.plaene.B) throw new Error('Workout B referenziert nicht Data.plaene.B');
if (w[2].id !== 'running' || w[2].typ !== 'cardio' || !w[2].text) throw new Error('Running-Workout fehlerhaft');
console.log('OK: Data.workouts');
"
```

Expected: `TypeError: Cannot read properties of undefined (reading 'workouts')` (oder ähnlich) — `Data.workouts` existiert noch nicht.

- [ ] **Step 2: Data.workouts implementieren**

Am Ende von `app/js/data.js`, direkt nach der schließenden `};` von `window.Data = { ... }` (aktuell Zeile 245), einfügen:

```js

Data.workouts = [
  { id: 'A', name: 'Ganzkörper A', typ: 'kraft', plan: Data.plaene.A },
  { id: 'B', name: 'Ganzkörper B', typ: 'kraft', plan: Data.plaene.B },
  { id: 'running', name: 'Running', typ: 'cardio', text: 'Mindestens 30–45 min kontinuierliche Ausdauer: Laufen, Fahrrad, Rudergerät oder Schwimmen. Intensität: moderate Herzfrequenz (Zone 2), du kannst noch sprechen.' }
];
```

- [ ] **Step 3: Verifikationsskript aus Step 1 erneut ausführen**

Run: gleicher Befehl wie in Step 1.
Expected: `OK: Data.workouts`

- [ ] **Step 4: Commit**

```bash
git add app/js/data.js && git commit -m "feat: add Data.workouts as rotation-independent workout list"
```

---

### Task 2: Offline-Warteschlange in sheets.js

**Files:**
- Modify: `app/js/sheets.js` (komplette Datei, siehe unten)

**Interfaces:**
- Consumes: nichts Neues (nutzt weiterhin `Auth.isSignedIn()`, `Auth.getToken()`, `fetch`, `Config.SPREADSHEET_ID`).
- Produces: `Sheets.appendSafe(sheet, row)` (async, wirft weiter wenn offline, hat aber vorher in die Warteschlange geschrieben), `Sheets.flushPending()` (async, sendet alle wartenden Zeilen erneut), `Sheets.getPending()`, `Sheets.setPending(list)`, `Sheets.enqueuePending(sheet, row)`. Später von `workout-session.js`, `ernaehrung.js`, `fortschritt.js`, `app.js` genutzt.

- [ ] **Step 1: Node-Verifikationsskript schreiben und ausführen (soll fehlschlagen, da `appendSafe`/`flushPending` fehlen)**

```bash
node -e "
function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
}
global.localStorage = makeLocalStorage();
global.window = {};
require('./app/js/sheets.js');
const Sheets = window.Sheets;

(async () => {
  // Szenario 1: append schlägt fehl -> landet in Warteschlange
  Sheets.append = async () => { throw new Error('network fail'); };
  let threw = false;
  try { await Sheets.appendSafe('Training_Log', ['1.1.2026', 'A', 'Kniebeuge', '80', '4', '8']); }
  catch (e) { threw = true; }
  if (!threw) throw new Error('appendSafe sollte den Fehler weiterwerfen');
  if (Sheets.getPending().length !== 1) throw new Error('erwartet 1 wartende Zeile, bekommen ' + Sheets.getPending().length);

  // Szenario 2: flushPending sendet erfolgreich nach und leert die Liste
  Sheets.append = async () => {};
  await Sheets.flushPending();
  if (Sheets.getPending().length !== 0) throw new Error('flushPending sollte die Warteschlange bei Erfolg leeren');

  // Szenario 3: flushPending behält Zeilen, die weiterhin fehlschlagen
  Sheets.enqueuePending('Koerper', ['1.1.2026', '80.0']);
  Sheets.append = async () => { throw new Error('still offline'); };
  await Sheets.flushPending();
  if (Sheets.getPending().length !== 1) throw new Error('flushPending sollte weiterhin fehlschlagende Zeilen behalten');

  console.log('OK: sheets.js offline queue');
})();
"
```

Expected: `TypeError: Sheets.appendSafe is not a function`

- [ ] **Step 2: Offline-Warteschlange implementieren**

Komplette neue Fassung von `app/js/sheets.js`:

```js
window.Sheets = {
  BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
  PENDING_KEY: 'fitness_pending_rows',

  async _req(path, method = 'GET', body = null) {
    if (!Auth.isSignedIn()) await Auth.signIn();
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${Auth.getToken()}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${this.BASE}/${Config.SPREADSHEET_ID}${path}`, opts);
    if (!res.ok) throw new Error(`Sheets API Fehler: ${res.status}`);
    return res.json();
  },

  // Zeile anhängen: row = ['Wert1', 'Wert2', ...]
  async append(sheet, row) {
    await this._req(
      `/values/${encodeURIComponent(sheet)}:append?valueInputOption=USER_ENTERED`,
      'POST',
      { values: [row] }
    );
  },

  // Alle Datenzeilen lesen (ohne Header-Zeile)
  async getAll(sheet) {
    const data = await this._req(`/values/${encodeURIComponent(sheet)}!A2:Z`);
    return data.values || [];
  },

  // --- Offline-Warteschlange ---

  getPending() {
    try { return JSON.parse(localStorage.getItem(this.PENDING_KEY)) || []; }
    catch (e) { return []; }
  },

  setPending(list) {
    localStorage.setItem(this.PENDING_KEY, JSON.stringify(list));
  },

  enqueuePending(sheet, row) {
    const pending = this.getPending();
    pending.push({ sheet, row });
    this.setPending(pending);
  },

  // Wie append(), aber legt die Zeile bei Fehler in die Warteschlange (wirft trotzdem weiter,
  // damit der Aufrufer den Nutzer informieren kann).
  async appendSafe(sheet, row) {
    try {
      await this.append(sheet, row);
    } catch (e) {
      this.enqueuePending(sheet, row);
      throw e;
    }
  },

  // Versucht alle wartenden Zeilen erneut zu senden; behält nur die, die weiterhin fehlschlagen.
  async flushPending() {
    const pending = this.getPending();
    if (!pending.length) return;
    const remaining = [];
    for (const item of pending) {
      try { await this.append(item.sheet, item.row); }
      catch (e) { remaining.push(item); }
    }
    this.setPending(remaining);
  }
};
```

- [ ] **Step 3: Verifikationsskript aus Step 1 erneut ausführen**

Run: gleicher Befehl wie in Step 1.
Expected: `OK: sheets.js offline queue`

- [ ] **Step 4: Commit**

```bash
git add app/js/sheets.js && git commit -m "feat: add offline queue with automatic retry to Sheets client"
```

---

### Task 3: Offline-Warteschlange app-weit anschließen

**Files:**
- Modify: `app/js/app.js:24-42` (`init()`)
- Modify: `app/js/ernaehrung.js:132-137` (`_markGegessen`)
- Modify: `app/js/fortschritt.js:78-87` (`_saveGewicht`)

**Interfaces:**
- Consumes: `Sheets.appendSafe`, `Sheets.flushPending` (aus Task 2).

- [ ] **Step 1: `app.js` — Warteschlange beim Start und bei Netzwerk-Wiederverbindung leeren**

In `app/js/app.js`, `init()` (Zeilen 24-42) ersetzen durch:

```js
  init() {
    // Service Worker registrieren
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });

    // Toast Element einfügen
    const toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);

    // Wartende Einträge automatisch nachsenden, sobald wieder Netz da ist
    window.addEventListener('online', () => Sheets.flushPending());

    // Auto-Login versuchen, dann initialer Tab
    Auth.autoSignIn().finally(() => {
      Sheets.flushPending();
      this.showTab('heute');
    });
  }
```

- [ ] **Step 2: `ernaehrung.js` — `_markGegessen` auf `appendSafe` umstellen**

In `app/js/ernaehrung.js`, im `try`-Block von `_markGegessen` (Zeilen 132-137):

```js
    try {
      await Sheets.appendSafe('Ernaehrungs_Log', row);
      App.showToast(`${rezept.name} eingetragen ✓`);
    } catch (e) {
      App.showToast('Offline – wird automatisch nachgesendet ✓');
    }
```

- [ ] **Step 3: `fortschritt.js` — `_saveGewicht` auf `appendSafe` mit Fehlerbehandlung umstellen**

In `app/js/fortschritt.js`, `_saveGewicht` (Zeilen 78-87) ersetzen durch:

```js
  async _saveGewicht() {
    const val = document.getElementById('input-gewicht').value;
    if (!val) return;
    const datum = new Date().toLocaleDateString('de-DE');
    try {
      await Sheets.appendSafe('Koerper', [datum, val]);
      App.showToast('Gewicht gespeichert ✓');
    } catch (e) {
      App.showToast('Offline – wird automatisch nachgesendet ✓');
    }
    document.getElementById('input-gewicht').value = '';
    const rows = await Sheets.getAll('Koerper');
    this._renderGewichtChart(rows);
  },
```

- [ ] **Step 4: Manuell im Browser verifizieren**

Der lokale Server läuft bereits auf `http://localhost:8080/`. Browser öffnen, Seite neu laden (harter Reload wegen Service-Worker-Cache: Safari/Chrome DevTools → "Empty Cache and Hard Reload", oder Service Worker in den DevTools unter Application → Service Workers kurz deregistrieren).
- Ernährung-Tab öffnen, ein Rezept als "Gegessen" markieren → Toast "... eingetragen ✓" erscheint (bei bestehender Verbindung).
- Fortschritt-Tab öffnen, ein Gewicht eintragen → Toast "Gewicht gespeichert ✓" erscheint.
- In den Browser-DevTools unter Network auf "Offline" stellen, erneut ein Gewicht eintragen → Toast "Offline – wird automatisch nachgesendet ✓" erscheint. Wieder auf "Online" stellen und kurz warten oder Seite neu laden → im Fortschritts-Chart taucht der Wert auf (`flushPending` beim nächsten Start bzw. `online`-Event).

Expected: Alle drei Toast-Varianten erscheinen wie beschrieben, kein Datenverlust im Offline-Fall.

- [ ] **Step 5: Commit**

```bash
git add app/js/app.js app/js/ernaehrung.js app/js/fortschritt.js && git commit -m "feat: wire offline queue into app startup, nutrition and body weight logging"
```

---

### Task 4: workout-session.js — Persistenz & Timer (reine Logik)

**Files:**
- Create: `app/js/workout-session.js`
- Modify: `app/index.html:60` (Script-Tag registrieren, nach `js/sheets.js`, vor `js/heute.js`)

**Interfaces:**
- Consumes: `localStorage` (Browser-API).
- Produces: `WorkoutSession.getSession()` → `session|null`, `WorkoutSession.saveSessionState(session)`, `WorkoutSession.clearSession()`, `WorkoutSession.start(workoutId)` → `session`, `WorkoutSession.toggleChecked(session, uebungName)` → `session`, `WorkoutSession.formatElapsed(startedAt, now?)` → `string`. `session` hat die Form `{ workoutId: string, startedAt: number, checked: { [uebungName]: boolean } }`. Task 5 baut das Rendering darauf auf.

- [ ] **Step 1: Node-Verifikationsskript schreiben und ausführen (soll fehlschlagen, Datei existiert noch nicht)**

```bash
node -e "
function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
}
global.localStorage = makeLocalStorage();
global.window = {};
require('./app/js/workout-session.js');
const WS = window.WorkoutSession;

if (WS.getSession() !== null) throw new Error('erwartet null vor dem ersten Start');

const s = WS.start('A');
if (s.workoutId !== 'A') throw new Error('start() sollte workoutId setzen');
if (typeof s.startedAt !== 'number') throw new Error('start() sollte startedAt als Timestamp setzen');

const loaded = WS.getSession();
if (!loaded || loaded.workoutId !== 'A') throw new Error('getSession() sollte die persistierte Session liefern');

WS.toggleChecked(loaded, 'Kniebeuge LH');
if (WS.getSession().checked['Kniebeuge LH'] !== true) throw new Error('toggleChecked() sollte checked-Status persistieren');
WS.toggleChecked(WS.getSession(), 'Kniebeuge LH');
if (WS.getSession().checked['Kniebeuge LH'] !== false) throw new Error('toggleChecked() sollte zurück auf false togglen');

WS.clearSession();
if (WS.getSession() !== null) throw new Error('clearSession() sollte die Session entfernen');

if (WS.formatElapsed(1000, 1000 + 65 * 1000) !== '01:05') throw new Error('formatElapsed sollte 65s als 01:05 formatieren');
if (WS.formatElapsed(0, 3661 * 1000) !== '01:01:01') throw new Error('formatElapsed sollte 1h1m1s als 01:01:01 formatieren');

console.log('OK: workout-session.js persistence + timer');
"
```

Expected: `Error: Cannot find module '.../app/js/workout-session.js'`

- [ ] **Step 2: `app/js/workout-session.js` mit den reinen Logik-Funktionen anlegen**

```js
window.WorkoutSession = {
  STORAGE_KEY: 'fitness_active_session',
  timerInterval: null,
  letzteSession: {},

  // --- Persistenz & Timer (reine Logik) ---

  getSession() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveSessionState(session) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  start(workoutId) {
    const session = { workoutId, startedAt: Date.now(), checked: {} };
    this.saveSessionState(session);
    return session;
  },

  toggleChecked(session, uebungName) {
    session.checked[uebungName] = !session.checked[uebungName];
    this.saveSessionState(session);
    return session;
  },

  formatElapsed(startedAt, now = Date.now()) {
    const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
};
```

- [ ] **Step 3: Script-Tag in `app/index.html` registrieren**

In `app/index.html`, Zeile 60 (`<script src="js/sheets.js"></script>`), direkt danach einfügen:

```html
  <script src="js/sheets.js"></script>
  <script src="js/workout-session.js"></script>
```

- [ ] **Step 4: Verifikationsskript aus Step 1 erneut ausführen**

Run: gleicher Befehl wie in Step 1.
Expected: `OK: workout-session.js persistence + timer`

- [ ] **Step 5: Commit**

```bash
git add app/js/workout-session.js app/index.html && git commit -m "feat: add WorkoutSession persistence and timer logic"
```

---

### Task 5: workout-session.js — Rendering (Vorschau, aktive Session, Checkboxen, Speichern)

**Files:**
- Modify: `app/js/workout-session.js` (Rendering-Methoden ergänzen)
- Modify: `app/styles.css:200` (eine neue Regel nach `.meal-name.done`)

**Interfaces:**
- Consumes: `Data.workouts` (Task 1), `Sheets.appendSafe`/`Sheets.getAll` (Task 2), `Auth.isSignedIn` (bestehend), `App.showToast` (bestehend), `Training.render()` (wird in Task 6 final, existiert aber schon).
- Produces: `WorkoutSession.render(workout)` (async) — einziger Einstiegspunkt, den `training.js` in Task 6 aufruft.

- [ ] **Step 1: `app/js/workout-session.js` komplett durch die finale Fassung ersetzen (Persistenz/Timer aus Task 4 + neue Rendering-Methoden)**

```js
window.WorkoutSession = {
  STORAGE_KEY: 'fitness_active_session',
  timerInterval: null,
  letzteSession: {},

  // --- Persistenz & Timer (reine Logik, aus Task 4 unverändert) ---

  getSession() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveSessionState(session) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  start(workoutId) {
    const session = { workoutId, startedAt: Date.now(), checked: {} };
    this.saveSessionState(session);
    return session;
  },

  toggleChecked(session, uebungName) {
    session.checked[uebungName] = !session.checked[uebungName];
    this.saveSessionState(session);
    return session;
  },

  formatElapsed(startedAt, now = Date.now()) {
    const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  },

  // --- Rendering (neu in dieser Task) ---

  async render(workout) {
    const el = document.getElementById('tab-training');
    const session = this.getSession();

    if (session && session.workoutId === workout.id) {
      if (workout.typ === 'kraft') await this._loadLetzteSession();
      this._renderActive(el, workout, session);
    } else {
      this._renderPreview(el, workout);
    }
  },

  async _loadLetzteSession() {
    if (!Auth.isSignedIn()) { this.letzteSession = {}; return; }
    try {
      const rows = await Sheets.getAll('Training_Log');
      this.letzteSession = {};
      rows.forEach(r => { this.letzteSession[r[2]] = { gewicht: r[3], saetze: r[4], reps: r[5] }; });
    } catch (e) { /* offline */ }
  },

  _renderPreview(el, workout) {
    const isKraft = workout.typ === 'kraft';
    el.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px">${workout.name}</h2>
        ${isKraft
          ? workout.plan.map(ss => `
              <div style="margin-bottom:14px">
                <div class="section-title">${ss.name}</div>
                ${ss.uebungen.map(u => `<div style="padding:4px 0;font-size:15px">· ${u}</div>`).join('')}
              </div>
            `).join('')
          : `<p style="color:var(--text-muted);line-height:1.6">${workout.text}</p>`
        }
      </div>
      <button class="btn btn-primary" id="btn-session-start">▶ Beginnen</button>
      <button class="btn btn-ghost" id="btn-session-back" style="margin-top:8px">Zurück</button>
    `;
    document.getElementById('btn-session-start').addEventListener('click', () => {
      this.start(workout.id);
      this.render(workout);
    });
    document.getElementById('btn-session-back').addEventListener('click', () => Training.render());
  },

  _renderActive(el, workout, session) {
    const isKraft = workout.typ === 'kraft';
    const alleUebungen = isKraft
      ? workout.plan.flatMap(ss => ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core'))
      : [];

    el.innerHTML = `
      <div class="card" style="text-align:center;padding:20px 16px">
        <div id="session-timer" style="font-size:32px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums">${this.formatElapsed(session.startedAt)}</div>
        <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${workout.name}</div>
      </div>
      ${isKraft
        ? workout.plan.map(ss => {
            const uebungen = ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core');
            if (!uebungen.length) {
              return `
                <div class="superset-group">
                  <div class="superset-label">Finisher</div>
                  ${ss.uebungen.map(u => `<div style="padding:4px 0;font-size:15px;color:var(--text-muted)">· ${u}</div>`).join('')}
                </div>
              `;
            }
            return `
              <div class="superset-group">
                <div class="superset-label">${ss.name}</div>
                ${uebungen.map(u => this._renderExerciseRow(u, session)).join('')}
              </div>
            `;
          }).join('')
        : `<div class="card"><p style="color:var(--text-muted);line-height:1.6">${workout.text}</p></div>`
      }
      <button class="btn btn-primary" id="btn-session-finish" style="margin-top:8px">${isKraft ? '✓ Abschließen' : '✓ Fertig'}</button>
      <button class="btn btn-ghost" id="btn-session-cancel" style="margin-top:8px">Abbrechen</button>
    `;

    if (isKraft) {
      alleUebungen.forEach(u => {
        const id = u.replace(/\s/g, '_');
        document.getElementById(`check_${id}`)?.addEventListener('click', () => {
          this.toggleChecked(session, u);
          this._renderActive(el, workout, session);
        });
      });
    }

    document.getElementById('btn-session-finish').addEventListener('click', () => this._finish(workout, session, alleUebungen));
    document.getElementById('btn-session-cancel').addEventListener('click', () => {
      clearInterval(this.timerInterval);
      this.clearSession();
      Training.render();
    });

    this._startTimer(session.startedAt);
  },

  _renderExerciseRow(uebung, session) {
    const prev = this.letzteSession[uebung];
    const prevText = prev ? `Letztes Mal: ${prev.gewicht} kg × ${prev.saetze} Sätze × ${prev.reps} Wdh` : 'Erstes Mal';
    const id = uebung.replace(/\s/g, '_');
    const done = !!session.checked[uebung];
    return `
      <div class="exercise-row">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div class="meal-check ${done ? 'done' : ''}" id="check_${id}"></div>
          <div class="exercise-name ${done ? 'done' : ''}" style="margin-bottom:0">${uebung}</div>
        </div>
        <div class="exercise-prev">${prevText}</div>
        <div class="log-inputs">
          <div>
            <div class="log-input-label">Gewicht (kg)</div>
            <input type="number" id="kg_${id}" placeholder="${prev?.gewicht || '0'}" min="0" step="2.5">
          </div>
          <div>
            <div class="log-input-label">Sätze</div>
            <input type="number" id="saetze_${id}" placeholder="${prev?.saetze || '3'}" min="1" max="10">
          </div>
          <div>
            <div class="log-input-label">Wdh</div>
            <input type="number" id="reps_${id}" placeholder="${prev?.reps || '8'}" min="1" max="30">
          </div>
        </div>
      </div>
    `;
  },

  _startTimer(startedAt) {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const el = document.getElementById('session-timer');
      if (!el) { clearInterval(this.timerInterval); return; }
      el.textContent = this.formatElapsed(startedAt);
    }, 1000);
  },

  async _finish(workout, session, alleUebungen) {
    clearInterval(this.timerInterval);
    const datum = new Date().toLocaleDateString('de-DE');

    const rows = workout.typ === 'kraft'
      ? alleUebungen.map(u => {
          const id = u.replace(/\s/g, '_');
          const kg = document.getElementById(`kg_${id}`)?.value || '0';
          const saetze = document.getElementById(`saetze_${id}`)?.value || '0';
          const reps = document.getElementById(`reps_${id}`)?.value || '0';
          return [datum, workout.id, u, kg, saetze, reps];
        })
      : [[datum, workout.id, '', '', '', '']];

    let offline = false;
    for (const row of rows) {
      try { await Sheets.appendSafe('Training_Log', row); }
      catch (e) { offline = true; }
    }

    App.showToast(offline ? 'Offline – wird automatisch nachgesendet ✓' : 'Einheit gespeichert ✓');
    this.clearSession();
    Training.render();
  }
};
```

- [ ] **Step 2: CSS-Regel für abgehakte Übungen ergänzen**

In `app/styles.css`, nach Zeile 198 (`.meal-check.done::after { ... }`) und vor `.meal-name { font-weight: 500; }` (Zeile 199) einfügen — bzw. direkt nach der bestehenden `.meal-name.done`-Regel (Zeile 200):

```css
.exercise-name.done { color: var(--text-muted); text-decoration: line-through; }
```

- [ ] **Step 3: Manuell im Browser verifizieren**

`http://localhost:8080/` öffnen (harter Reload wegen Service Worker), zum Training-Tab wechseln. Da `training.js` erst in Task 6 umgebaut wird, ist der Picker noch nicht sichtbar — stattdessen direkt in der Browser-Konsole testen:

```js
WorkoutSession.render(Data.workouts[0])
```

Erwartet: Vorschau von "Ganzkörper A" mit allen Supersets erscheint, darunter "▶ Beginnen" und "Zurück". Auf "Beginnen" klicken → Timer startet und läuft hochzählend, Übungen mit Kreis-Checkbox erscheinen. Eine Checkbox anklicken → Name wird durchgestrichen, grauer Text. Seite hart neu laden → Timer läuft mit korrektem verstrichenem Wert weiter, angehakte Übung bleibt angehakt (Session kam aus `localStorage`). "Abbrechen" klicken → zurück zu einer leeren `tab-training`-Section (da `Training.render()` in dieser Task noch alt ist — das ist erwartet, wird in Task 6 final).

Expected: Timer zählt sichtbar hoch, Checkbox-Status übersteht Reload, kein Fehler in der Konsole.

- [ ] **Step 4: Commit**

```bash
git add app/js/workout-session.js app/styles.css && git commit -m "feat: add WorkoutSession rendering for preview, active session and save"
```

---

### Task 6: training.js — 4-Zustands-Flow (Info-Zeile, Picker, Vorschau, aktive Session)

**Files:**
- Modify: `app/js/training.js` (komplette Datei ersetzen)

**Interfaces:**
- Consumes: `Rotation.getToday()` (bestehend, nur noch für Info-Anzeige), `Data.workouts` (Task 1), `WorkoutSession.getSession()` / `WorkoutSession.render(workout)` (Task 4/5), `Sheets.getAll` (bestehend).

- [ ] **Step 1: `app/js/training.js` komplett ersetzen**

```js
window.Training = {
  today: null,

  render() {
    this.today = Rotation.getToday();
    const el = document.getElementById('tab-training');

    const activeSession = WorkoutSession.getSession();
    if (activeSession) {
      const workout = Data.workouts.find(w => w.id === activeSession.workoutId);
      if (workout) { WorkoutSession.render(workout); return; }
      WorkoutSession.clearSession();
    }

    el.innerHTML = `
      <span class="day-badge ${this._badgeClass()}">${this._badgeLabel()}</span>
      <div class="section-title">Workout wählen</div>
      <div id="workout-picker">
        ${Data.workouts.map(w => `
          <div class="card" style="cursor:pointer" data-workout="${w.id}">
            <div style="font-weight:600;font-size:16px">${w.name}</div>
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : 'Cardio'}</div>
          </div>
        `).join('')}
      </div>
      <div class="section-title">Letzte Einheiten</div>
      <div id="history-container"></div>
    `;

    document.querySelectorAll('#workout-picker [data-workout]').forEach(card => {
      card.addEventListener('click', () => {
        const workout = Data.workouts.find(w => w.id === card.dataset.workout);
        WorkoutSession.render(workout);
      });
    });

    this._renderHistory();
  },

  _badgeClass() {
    return { A: 'badge-training', B: 'badge-training', ausdauer: 'badge-ausdauer', ruhetag: 'badge-ruhetag' }[this.today.typ];
  },

  _badgeLabel() {
    return { A: 'Trainingstag A', B: 'Trainingstag B', ausdauer: 'Ausdauertag', ruhetag: 'Ruhetag' }[this.today.typ];
  },

  async _renderHistory() {
    const el = document.getElementById('history-container');
    if (!el) return;
    if (!Auth.isSignedIn()) { el.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Anmelden um History zu sehen</p>'; return; }
    try {
      const rows = await Sheets.getAll('Training_Log');
      const tage = [...new Set(rows.map(r => r[0]))].reverse().slice(0, 5);
      el.innerHTML = tage.map(d => {
        const einheit = rows.find(r => r[0] === d)?.[1] || '';
        const workout = Data.workouts.find(w => w.id === einheit);
        const label = workout ? workout.name : einheit;
        return `
          <div class="card" style="padding:12px;margin-bottom:8px">
            <span style="font-weight:600">${d}</span>
            <span class="day-badge badge-training" style="margin-left:8px;font-size:11px">${label}</span>
          </div>
        `;
      }).join('') || '<p style="color:var(--text-muted);font-size:14px">Noch keine Einheiten eingetragen</p>';
    } catch (e) { el.innerHTML = ''; }
  }
};
```

- [ ] **Step 2: Manuell im Browser verifizieren**

`http://localhost:8080/` hart neu laden, Training-Tab öffnen.
- Info-Zeile oben zeigt den korrekten Rotationsstatus (aktuell z.B. "Ruhetag" oder "Trainingstag A", je nach heutigem Datum).
- Darunter erscheinen 3 anklickbare Karten: "Ganzkörper A", "Ganzkörper B", "Running" — unabhängig davon, was oben steht.
- Auf "Ganzkörper A" klicken → Vorschau mit allen Supersets, "▶ Beginnen".
- "Beginnen" klicken → Timer läuft, Checkboxen sichtbar, Gewicht/Sätze/Wdh-Felder wie gehabt.
- "Abbrechen" klicken → zurück zum Picker (Info-Zeile + 3 Karten wieder sichtbar).
- "Running"-Karte klicken → Text-Block-Vorschau ohne Übungsliste, "Beginnen" → Timer läuft, kein Checkbox, nur "✓ Fertig".

Expected: Alle drei Workouts sind an jedem Wochentag startbar, unabhängig vom Rotationsstatus in der Info-Zeile.

- [ ] **Step 3: Commit**

```bash
git add app/js/training.js && git commit -m "feat: rewrite training tab as day-independent workout picker"
```

---

### Task 7: End-to-End-Verifikation (mit Google-Login)

**Files:** keine Code-Änderungen — reine Verifikation des Gesamt-Flows.

- [ ] **Step 1: Vollständiger Kraft-Workout-Durchlauf**

`http://localhost:8080/` öffnen, mit Google einloggen (einmalig). Training-Tab → "Ganzkörper B" wählen → Beginnen → mindestens eine Übung abhaken, bei einer Übung Gewicht/Sätze/Wdh eintragen → "Abschließen" klicken.
Expected: Toast "Einheit gespeichert ✓", zurück zum Picker, unter "Letzte Einheiten" erscheint ein neuer Eintrag mit Label "Ganzkörper B" und heutigem Datum.

- [ ] **Step 2: Google Sheet direkt prüfen**

Das Sheet `1N8rGnOhqKCQqZJjp7HjyCiPO1lR-vDDdOFHxT1bu5iw` (Tab `Training_Log`) im Browser öffnen.
Expected: Neue Zeile(n) mit Einheit-Spalte `B` (nicht mehr zwingend der Rotations-Typ von heute), korrektem Gewicht/Sätze/Wdh bei der abgehakten Übung.

- [ ] **Step 3: Fortschritts-Tab prüfen**

Zum Fortschritt-Tab wechseln, im "Trainingsgewicht"-Dropdown die geloggte Übung auswählen.
Expected: Der eben eingetragene Wert erscheint im Chart — Kraftwerte aktualisieren sich unabhängig davon, ob das Workout am "richtigen" Rotationstag gemacht wurde.

- [ ] **Step 4: Running-Workout-Durchlauf**

Training-Tab → "Running" wählen → Beginnen → kurz warten (Timer läuft) → "Fertig" klicken.
Expected: Toast "Einheit gespeichert ✓", in "Letzte Einheiten" erscheint ein Eintrag mit Label "Running".

- [ ] **Step 5: Offline-Fall end-to-end**

DevTools → Network → "Offline". Ein Kraft-Workout starten, abhaken, "Abschließen" klicken.
Expected: Toast "Offline – wird automatisch nachgesendet ✓". Danach "Online" wieder aktivieren und die Seite neu laden (oder kurz warten, falls die App im Hintergrund bleibt) → Eintrag erscheint automatisch im Sheet, ohne dass manuell etwas erneut gespeichert werden muss.

- [ ] **Step 6: Session-Persistenz über App-Neustart**

Ein Workout beginnen, eine Übung abhaken, den Tab/das Browserfenster komplett schließen. Neu öffnen (`http://localhost:8080/`).
Expected: App springt direkt in die aktive Session zurück (nicht zum Picker), Timer zeigt die inzwischen verstrichene Zeit korrekt an, die abgehakte Übung ist weiterhin markiert.

Kein Commit nötig — diese Task bestätigt nur, dass Tasks 1–6 zusammen korrekt funktionieren.
