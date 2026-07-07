# Wochentags-Leiste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Training-Tab bekommt eine Reihe von 7 Tages-Buttons (Mo–So der aktuellen Woche) oberhalb der Badge-Zeile; Klick auf einen Tag zeigt dessen Rotationsstatus, ohne die Workout-Auswahl oder Historie zu beeinflussen.

**Architecture:** `rotation.js` bekommt eine generalisierte `getForDate(date)`-Methode (bestehende Logik, jetzt für beliebige Daten statt nur "heute"). `training.js` bekommt einen `selectedDate`-State und einen eigenen `#day-nav`-Container, der unabhängig vom Rest des Tabs neu gerendert wird.

**Tech Stack:** Vanilla JS, kein Build. Kein Test-Framework — reine Logik (`rotation.js`) wird mit einem Node-Snippet verifiziert, DOM-Rendering (`training.js`) manuell im Browser über `http://localhost:8080/`.

## Global Constraints

- Spec: `docs/specs/2026-07-07-weekday-strip-design.md`.
- Nur die aktuelle Kalenderwoche (Mo–So), keine Wochen-Navigation.
- Auswahl beeinflusst nicht, welches Workout startbar ist — Workout-Picker bleibt unverändert für alle 3 Workouts.
- Auswahl wird nicht persistiert — jedes `render()` setzt `selectedDate` auf heute zurück.
- Nach den Änderungen: Service-Worker-Cache-Version in `app/sw.js` hochzählen (von `fitness-v4` auf `fitness-v5`), sonst liefern bereits besuchte Browser weiterhin alten Code aus (siehe Erfahrung aus vorherigen Features).

---

### Task 1: `Rotation.getForDate(date)` generalisieren

**Files:**
- Modify: `app/js/rotation.js` (komplette Datei)

**Interfaces:**
- Produces: `Rotation.getForDate(date)` → `{ typ, label, badgeClass }` (gleiche Form wie bisher `getToday()`). `getToday()` bleibt als öffentliche Methode bestehen, ruft aber intern `getForDate(new Date())` auf. `getDatenKey(typ)` unverändert.

- [ ] **Step 1: Node-Verifikationsskript schreiben und ausführen (soll mit dem aktuellen `getToday()`-only Code fehlschlagen)**

```bash
node -e "
global.window = {};
require('./app/js/rotation.js');
const Rotation = window.Rotation;

const week1Montag = Rotation.getForDate(new Date('2026-07-06T10:00:00'));
if (week1Montag.typ !== 'A') throw new Error('Woche1 Montag sollte A sein, bekommen ' + week1Montag.typ);

const week1Mittwoch = Rotation.getForDate(new Date('2026-07-08T10:00:00'));
if (week1Mittwoch.typ !== 'B') throw new Error('Woche1 Mittwoch sollte B sein, bekommen ' + week1Mittwoch.typ);

const week2Montag = Rotation.getForDate(new Date('2026-07-13T10:00:00'));
if (week2Montag.typ !== 'B') throw new Error('Woche2 Montag sollte B sein, bekommen ' + week2Montag.typ);

const samstag = Rotation.getForDate(new Date('2026-07-11T10:00:00'));
if (samstag.typ !== 'ausdauer') throw new Error('Samstag sollte ausdauer sein, bekommen ' + samstag.typ);

const sonntag = Rotation.getForDate(new Date('2026-07-12T10:00:00'));
if (sonntag.typ !== 'ruhetag') throw new Error('Sonntag sollte ruhetag sein, bekommen ' + sonntag.typ);

const today = Rotation.getToday();
const expectedToday = Rotation.getForDate(new Date());
if (JSON.stringify(today) !== JSON.stringify(expectedToday)) throw new Error('getToday() sollte getForDate(new Date()) entsprechen');

console.log('OK: Rotation.getForDate + getToday');
"
```

Expected: `TypeError: Rotation.getForDate is not a function`

- [ ] **Step 2: `app/js/rotation.js` komplett ersetzen**

```js
window.Rotation = {
  // Trainingstage: Mo (1), Mi (3), Fr (5) | Sa (6) = Ausdauer | Rest = Ruhetag
  // Start: 6. Juli 2026 (erster Montag der App)
  START: new Date('2026-07-06T00:00:00'),

  getForDate(date) {
    const dow = date.getDay(); // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa

    if (dow === 6) {
      return { typ: 'ausdauer', label: 'Ausdauertag', badgeClass: 'badge-ausdauer' };
    }
    if (![1, 3, 5].includes(dow)) {
      return { typ: 'ruhetag', label: 'Ruhetag', badgeClass: 'badge-ruhetag' };
    }

    // Welche KW seit Start → gerade/ungerade bestimmt Woche 1 oder 2
    const diffMs = date - this.START;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const isWeek1 = diffWeeks % 2 === 0;

    // Trainingstag-Index innerhalb der Woche (0=Mo, 1=Mi, 2=Fr)
    const idx = dow === 1 ? 0 : dow === 3 ? 1 : 2;

    // Woche 1: A/B/A | Woche 2: B/A/B
    const muster = isWeek1 ? ['A', 'B', 'A'] : ['B', 'A', 'B'];
    const typ = muster[idx];

    return {
      typ,
      label: `Trainingstag ${typ}`,
      badgeClass: 'badge-training'
    };
  },

  getToday() {
    return this.getForDate(new Date());
  },

  getDatenKey(typ) {
    if (typ === 'A' || typ === 'B') return 'trainingstag';
    if (typ === 'ausdauer') return 'ausdauertag';
    return 'ruhetag';
  }
};
```

- [ ] **Step 3: Verifikationsskript aus Step 1 erneut ausführen**

Run: gleicher Befehl wie in Step 1.
Expected: `OK: Rotation.getForDate + getToday`

- [ ] **Step 4: Commit**

```bash
git add app/js/rotation.js && git commit -m "feat: generalize Rotation to compute status for any date"
```

---

### Task 2: Tagesleiste in `training.js` + CSS

**Files:**
- Modify: `app/js/training.js` (komplette Datei)
- Modify: `app/styles.css` (neue Regeln für Tages-Buttons, am Ende der Datei anhängen)

**Interfaces:**
- Consumes: `Rotation.getForDate(date)` (Task 1).
- Produces: keine neuen öffentlichen Schnittstellen — rein UI-intern. Entfernt `Training._badgeClass()`/`Training._badgeLabel()` (ersetzt durch direkte Nutzung von `Rotation.getForDate(...).label`/`.badgeClass`, behebt nebenbei die in der Task-6-Review des Workout-Picker-Features notierte Duplikation).

- [ ] **Step 1: `app/js/training.js` komplett ersetzen**

```js
window.Training = {
  selectedDate: null,

  render() {
    this.selectedDate = new Date();
    const el = document.getElementById('tab-training');

    const activeSession = WorkoutSession.getSession();
    if (activeSession) {
      const workout = Data.workouts.find(w => w.id === activeSession.workoutId);
      if (workout) { WorkoutSession.render(workout); return; }
      WorkoutSession.clearSession();
    }

    el.innerHTML = `
      <div id="day-nav"></div>
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

    this._renderDayNav();

    document.querySelectorAll('#workout-picker [data-workout]').forEach(card => {
      card.addEventListener('click', () => {
        const workout = Data.workouts.find(w => w.id === card.dataset.workout);
        WorkoutSession.render(workout);
      });
    });

    this._renderHistory();
  },

  _getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  },

  _getWeekDays(date) {
    const monday = this._getMonday(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  },

  _isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  },

  _renderDayNav() {
    const el = document.getElementById('day-nav');
    if (!el) return;
    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const today = new Date();
    const weekDays = this._getWeekDays(this.selectedDate);
    const info = Rotation.getForDate(this.selectedDate);

    el.innerHTML = `
      <div class="day-nav-row">
        ${weekDays.map((d, i) => `
          <div class="day-nav-item ${this._isSameDay(d, this.selectedDate) ? 'selected' : ''}" data-date="${d.toISOString()}">
            <div class="day-nav-circle">${labels[i]}</div>
            ${this._isSameDay(d, today) ? '<div class="day-nav-today-dot"></div>' : ''}
          </div>
        `).join('')}
      </div>
      <span class="day-badge ${info.badgeClass}">${info.label}</span>
    `;

    el.querySelectorAll('.day-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedDate = new Date(item.dataset.date);
        this._renderDayNav();
      });
    });
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

- [ ] **Step 2: CSS für die Tages-Buttons ergänzen**

Am Ende von `app/styles.css` anhängen:

```css

/* Day Navigation Strip */
.day-nav-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 14px;
}
.day-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  flex: 1;
}
.day-nav-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--card);
  border: 1px solid var(--border);
  transition: all 0.15s;
}
.day-nav-item.selected .day-nav-circle {
  background: var(--accent);
  color: var(--text);
  border-color: var(--accent);
}
.day-nav-today-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}
```

- [ ] **Step 3: Manuell im Browser verifizieren**

`http://localhost:8080/` hart neu laden (bzw. bei bereits besuchtem Browser vorher Service Worker/Cache leeren, siehe `CLAUDE.md`), Training-Tab öffnen.
- Oben erscheinen 7 runde Tages-Buttons (Mo–So), der heutige Tag ist hervorgehoben und zeigt den korrekten Rotationsstatus als Badge darunter.
- Auf einen anderen Tag klicken (z.B. Samstag) → Badge wechselt zu "Ausdauertag", die Auswahl-Hervorhebung wandert zum geklickten Tag; unter dem heutigen Tag bleibt der kleine Punkt sichtbar, da er nicht mehr ausgewählt ist.
- Workout-Karten darunter bleiben unverändert alle 3 klickbar, unabhängig vom ausgewählten Tag.
- Tab wechseln (z.B. zu Ernährung) und zurück zu Training → Auswahl ist wieder auf "heute" zurückgesetzt.

Expected: Alles wie beschrieben, keine Fehler in der Konsole.

- [ ] **Step 4: Commit**

```bash
git add app/js/training.js app/styles.css && git commit -m "feat: add weekday navigation strip to training tab"
```

---

### Task 3: Service-Worker-Cache-Version hochzählen

**Files:**
- Modify: `app/sw.js`

- [ ] **Step 1: Cache-Version hochzählen**

In `app/sw.js`, Zeile 1:

```js
const CACHE = 'fitness-v5';
```

- [ ] **Step 2: Commit**

```bash
git add app/sw.js && git commit -m "chore: bump service worker cache version for weekday strip feature"
```
