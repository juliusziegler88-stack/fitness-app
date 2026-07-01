# Fitness PWA – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persönliche PWA mit vier Tabs (Heute, Training, Ernährung, Fortschritt), Google Sheets als Backend, installierbar auf iPhone, dark theme.

**Architecture:** Vanilla HTML/CSS/JS ohne Build-Tools. Alle Dateien liegen im `app/`-Ordner und werden via GitHub Pages gehostet. Google Identity Services (GIS) übernimmt OAuth, die Sheets API wird direkt per fetch() angesprochen. Statische Trainingsdaten und Rezepte liegen in `js/data.js`.

**Tech Stack:** HTML5, CSS3, Vanilla JS (ES Modules), Google Sheets API v4, Google Identity Services, Chart.js (CDN), GitHub Pages

## Global Constraints

- Kein npm, kein Build-Schritt — nur plain files, direkt im Browser lauffähig
- Sprache: Deutsch (UI + Variablennamen können Englisch sein)
- Dark theme: Background `#0f0f0f`, Cards `#1a1a2e`, Accent `#52b788`, Text `#e0e0e0`
- Mobile-first: Bottom Navigation Bar, große Touch-Targets (min. 44px)
- Alle Dateien unter `app/` im Repo-Root
- GitHub Pages hostet den `app/`-Ordner als Root

---

## Dateistruktur

```
app/
├── index.html           # App-Shell, Tab-Container, Bottom Nav
├── manifest.json        # PWA-Manifest (Name, Icons, Theme)
├── sw.js                # Service Worker (Offline-Caching)
├── styles.css           # Globales Dark Theme, Layout, Komponenten
├── js/
│   ├── config.js        # Google Client ID + Spreadsheet ID (manuell befüllen)
│   ├── data.js          # Statisch: Trainingspläne A/B + alle Rezepte
│   ├── rotation.js      # Tagestyp-Erkennung (A/B/Ausdauer/Ruhetag)
│   ├── auth.js          # Google OAuth via GIS
│   ├── sheets.js        # Sheets API: lesen + schreiben
│   ├── heute.js         # Tab 1: Dashboard
│   ├── training.js      # Tab 2: Trainingsplan + Log
│   ├── ernaehrung.js    # Tab 3: Rezepte + Makro-Tracker
│   ├── fortschritt.js   # Tab 4: Charts + Gewicht
│   └── app.js           # Init, Tab-Routing
└── icons/
    ├── icon-192.png     # PWA Icon (192×192)
    └── icon-512.png     # PWA Icon (512×512)
```

---

## Vorab: Google Setup (manuell, einmalig)

Bevor mit dem Code begonnen wird, müssen folgende Schritte manuell abgeschlossen werden:

### Google Cloud Project
1. Öffne https://console.cloud.google.com
2. Neues Projekt erstellen: Name "Fitness App"
3. APIs & Dienste → Bibliothek → "Google Sheets API" aktivieren
4. APIs & Dienste → Anmeldedaten → "Anmeldedaten erstellen" → OAuth-Client-ID
   - Anwendungstyp: Webanwendung
   - Autorisierte JavaScript-Ursprünge: `https://[dein-github-username].github.io`
   - Auch hinzufügen: `http://localhost:8080` (für lokales Testen)
5. Client-ID kopieren → kommt in `js/config.js`

### Google Spreadsheet
1. Öffne https://sheets.google.com → neues Spreadsheet erstellen: "Fitness Tracking"
2. Drei Sheets anlegen (Tabs unten umbenennen):
   - `Training_Log`
   - `Ernaehrungs_Log`
   - `Koerper`
3. Headers eintragen:
   - Training_Log: `Datum | Einheit | Uebung | Gewicht_kg | Saetze | Reps`
   - Ernaehrungs_Log: `Datum | Mahlzeit | Rezept | Kalorien | Protein_g | Carbs_g | Fett_g`
   - Koerper: `Datum | Gewicht_kg`
4. Spreadsheet-ID aus der URL kopieren: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
   → kommt in `js/config.js`

---

## Task 1: Projekt-Scaffold, PWA-Shell, Navigation

**Files:**
- Create: `app/index.html`
- Create: `app/manifest.json`
- Create: `app/sw.js`
- Create: `app/styles.css`
- Create: `app/js/app.js`
- Create: `app/icons/icon-192.png` (via Python-Skript generiert)
- Create: `app/icons/icon-512.png`

**Interfaces:**
- Produces: `window.App.showTab(tabName)` — wechselt aktiven Tab
- Produces: DOM-Struktur mit `#tab-heute`, `#tab-training`, `#tab-ernaehrung`, `#tab-fortschritt`

- [ ] **Schritt 1: GitHub Repo anlegen**

```bash
cd "/Users/juliusziegler/Library/Mobile Documents/com~apple~CloudDocs/Pers. Improvement/Projekt 3 Fitness App"
git init
mkdir -p app/js app/icons app/docs/plans app/docs/specs
echo "# Fitness App" > README.md
```

- [ ] **Schritt 2: Icons generieren**

```python
# Ausführen: python3 generate_icons.py
from PIL import Image, ImageDraw
import os

os.makedirs("app/icons", exist_ok=True)

for size in [192, 512]:
    img = Image.new("RGB", (size, size), color="#1a1a2e")
    draw = ImageDraw.Draw(img)
    # Grüner Kreis als Placeholder-Icon
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], fill="#52b788")
    img.save(f"app/icons/icon-{size}.png")
    print(f"icon-{size}.png erstellt")
```

Falls Pillow nicht installiert: `pip3 install Pillow` → dann Skript ausführen.

- [ ] **Schritt 3: manifest.json erstellen**

```json
{
  "name": "Julius Fitness",
  "short_name": "Fitness",
  "description": "Persönlicher Trainings- und Ernährungsplan",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "orientation": "portrait",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Schritt 4: index.html erstellen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0f0f0f">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Fitness">
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <link rel="stylesheet" href="styles.css">
  <title>Julius Fitness</title>
</head>
<body>
  <div id="app">
    <main id="content">
      <section id="tab-heute" class="tab active"></section>
      <section id="tab-training" class="tab"></section>
      <section id="tab-ernaehrung" class="tab"></section>
      <section id="tab-fortschritt" class="tab"></section>
    </main>

    <nav id="bottom-nav">
      <button class="nav-btn active" data-tab="heute">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Heute</span>
      </button>
      <button class="nav-btn" data-tab="training">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18"/>
          <circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="6.5" r="2"/>
          <circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>
        </svg>
        <span>Training</span>
      </button>
      <button class="nav-btn" data-tab="ernaehrung">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Ernährung</span>
      </button>
      <button class="nav-btn" data-tab="fortschritt">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>Fortschritt</span>
      </button>
    </nav>
  </div>

  <script src="js/config.js"></script>
  <script src="js/data.js"></script>
  <script src="js/rotation.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/sheets.js"></script>
  <script src="js/heute.js"></script>
  <script src="js/training.js"></script>
  <script src="js/ernaehrung.js"></script>
  <script src="js/fortschritt.js"></script>
  <script src="js/app.js"></script>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js" async defer></script>
</body>
</html>
```

- [ ] **Schritt 5: styles.css erstellen**

```css
:root {
  --bg: #0f0f0f;
  --card: #1a1a2e;
  --card2: #16213e;
  --accent: #52b788;
  --accent-dim: #2d6a4f;
  --text: #e0e0e0;
  --text-muted: #888;
  --danger: #e05252;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
}

#content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: calc(72px + var(--safe-bottom));
}

.tab { display: none; padding: 16px; }
.tab.active { display: block; }

/* Bottom Navigation */
#bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  background: var(--card);
  border-top: 1px solid #2a2a3e;
  padding-bottom: var(--safe-bottom);
  z-index: 100;
}

.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s;
}

.nav-btn svg { width: 22px; height: 22px; }
.nav-btn.active { color: var(--accent); }

/* Cards */
.card {
  background: var(--card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  width: 100%;
}
.btn:active { opacity: 0.7; }
.btn-primary { background: var(--accent); color: #0f0f0f; }
.btn-secondary { background: var(--card2); color: var(--text); }
.btn-ghost { background: transparent; color: var(--accent); border: 1px solid var(--accent-dim); }

/* Section Headers */
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 20px 0 10px;
}

/* Inputs */
input[type="number"], input[type="text"] {
  background: var(--card2);
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  color: var(--text);
  font-size: 16px;
  padding: 10px 12px;
  width: 100%;
}
input:focus { outline: none; border-color: var(--accent); }

/* Macro Rings */
.macro-rings {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.macro-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ring-svg { width: 64px; height: 64px; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: var(--card2); stroke-width: 6; }
.ring-fill { fill: none; stroke: var(--accent); stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
.ring-label { font-size: 10px; color: var(--text-muted); }
.ring-value { font-size: 11px; font-weight: 600; }

/* Progress Bars */
.macro-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.macro-bar-label { font-size: 13px; color: var(--text-muted); width: 60px; flex-shrink: 0; }
.macro-bar-track { flex: 1; height: 8px; background: var(--card2); border-radius: 4px; overflow: hidden; }
.macro-bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.4s ease; }
.macro-bar-num { font-size: 12px; color: var(--text-muted); width: 50px; text-align: right; flex-shrink: 0; }

/* Recipe Cards */
.recipe-card {
  background: var(--card);
  border-radius: 12px;
  margin-bottom: 10px;
  overflow: hidden;
}
.recipe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
}
.recipe-title { font-weight: 600; font-size: 15px; }
.recipe-macros { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.recipe-body { padding: 0 16px 14px; display: none; }
.recipe-body.open { display: block; }
.recipe-body p { font-size: 14px; color: var(--text-muted); margin-bottom: 6px; line-height: 1.5; }
.recipe-body strong { color: var(--text); }

/* Meal Checklist */
.meal-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #2a2a3e;
  cursor: pointer;
}
.meal-item:last-child { border-bottom: none; }
.meal-check {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.meal-check.done { border-color: var(--accent); background: var(--accent); }
.meal-check.done::after { content: "✓"; color: #0f0f0f; font-size: 13px; font-weight: 700; }
.meal-name { font-weight: 500; }
.meal-name.done { color: var(--text-muted); text-decoration: line-through; }

/* Day Badge */
.day-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}
.badge-training { background: #1a3a2e; color: var(--accent); }
.badge-ausdauer { background: #1a2a3a; color: #52a8e0; }
.badge-ruhetag { background: #2a1a1a; color: #e08852; }

/* Chip Filter */
.chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #2a2a3e;
  background: var(--card);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip.active { background: var(--accent-dim); color: var(--accent); border-color: var(--accent-dim); }

/* Exercise Log */
.exercise-row {
  background: var(--card2);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.exercise-name { font-weight: 600; margin-bottom: 8px; }
.exercise-prev { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
.log-inputs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.log-input-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }

/* Chart Container */
.chart-container { position: relative; height: 200px; margin-bottom: 16px; }

/* Streak */
.streak-display {
  text-align: center;
  padding: 20px;
}
.streak-number { font-size: 48px; font-weight: 700; color: var(--accent); }
.streak-label { font-size: 14px; color: var(--text-muted); }

/* Toast */
#toast {
  position: fixed;
  bottom: calc(80px + var(--safe-bottom));
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--accent);
  color: #0f0f0f;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s;
  pointer-events: none;
  white-space: nowrap;
  z-index: 200;
}
#toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
```

- [ ] **Schritt 6: sw.js (Service Worker) erstellen**

```js
const CACHE = 'fitness-v1';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/manifest.json',
  '/js/config.js', '/js/data.js', '/js/rotation.js',
  '/js/auth.js', '/js/sheets.js', '/js/heute.js',
  '/js/training.js', '/js/ernaehrung.js', '/js/fortschritt.js',
  '/js/app.js', '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis') || e.request.url.includes('accounts.google')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

- [ ] **Schritt 7: app.js (Tab-Routing + Init) erstellen**

```js
window.App = {
  currentTab: 'heute',

  showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    document.querySelector(`[data-tab="${name}"]`).classList.add('active');
    this.currentTab = name;

    if (name === 'heute') window.Heute?.render();
    if (name === 'training') window.Training?.render();
    if (name === 'ernaehrung') window.Ernaehrung?.render();
    if (name === 'fortschritt') window.Fortschritt?.render();
  },

  showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  },

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

    // Initialer Tab
    this.showTab('heute');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
```

- [ ] **Schritt 8: Lokal testen**

```bash
cd "/Users/juliusziegler/Library/Mobile Documents/com~apple~CloudDocs/Pers. Improvement/Projekt 3 Fitness App/app"
python3 -m http.server 8080
# Browser öffnen: http://localhost:8080
# Prüfen: Alle vier Tabs wechseln, keine Konsolen-Fehler
```

Erwartetes Ergebnis: Schwarze Seite mit Bottom Nav, Tab-Wechsel funktioniert.

- [ ] **Schritt 9: Commit**

```bash
cd "/Users/juliusziegler/Library/Mobile Documents/com~apple~CloudDocs/Pers. Improvement/Projekt 3 Fitness App"
git add app/
git commit -m "feat: PWA shell with bottom navigation and dark theme"
```

---

## Task 2: Google Auth + Sheets Integration

**Files:**
- Create: `app/js/config.js`
- Create: `app/js/auth.js`
- Create: `app/js/sheets.js`

**Interfaces:**
- Produces: `window.Auth.signIn()`, `window.Auth.isSignedIn()`, `window.Auth.getToken()`
- Produces: `window.Sheets.append(sheet, row)` — fügt eine Zeile an
- Produces: `window.Sheets.getAll(sheet)` — gibt alle Zeilen zurück (Array of Arrays)

- [ ] **Schritt 1: config.js erstellen (Platzhalter)**

```js
window.Config = {
  // Aus Google Cloud Console kopieren:
  CLIENT_ID: 'DEINE_CLIENT_ID.apps.googleusercontent.com',
  // Aus Google Sheets URL kopieren:
  SPREADSHEET_ID: 'DEINE_SPREADSHEET_ID',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};
```

Die echten Werte werden nach dem Google-Setup eingetragen.

- [ ] **Schritt 2: auth.js erstellen**

```js
window.Auth = {
  token: null,

  async signIn() {
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: Config.CLIENT_ID,
        scope: Config.SCOPES,
        callback: (resp) => {
          if (resp.error) return reject(resp.error);
          this.token = resp.access_token;
          resolve(resp.access_token);
        }
      });
      client.requestAccessToken();
    });
  },

  isSignedIn() { return !!this.token; },
  getToken() { return this.token; }
};
```

- [ ] **Schritt 3: sheets.js erstellen**

```js
window.Sheets = {
  BASE: 'https://sheets.googleapis.com/v4/spreadsheets',

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
      `/values/${encodeURIComponent(sheet)}!A1:Z1:append?valueInputOption=USER_ENTERED`,
      'POST',
      { values: [row] }
    );
  },

  // Alle Datenzeilen lesen (ohne Header-Zeile)
  async getAll(sheet) {
    const data = await this._req(`/values/${encodeURIComponent(sheet)}!A2:Z`);
    return data.values || [];
  }
};
```

- [ ] **Schritt 4: Google-Button im Heute-Tab (temporär zum Testen)**

In `app/js/heute.js` temporär hinzufügen:

```js
window.Heute = {
  render() {
    const el = document.getElementById('tab-heute');
    el.innerHTML = `
      <div class="card">
        <p style="margin-bottom:12px;color:var(--text-muted)">Google-Konto verbinden:</p>
        <button class="btn btn-primary" id="btn-signin">Mit Google verbinden</button>
      </div>
    `;
    document.getElementById('btn-signin').addEventListener('click', async () => {
      await Auth.signIn();
      App.showToast('Verbunden ✓');
    });
  }
};
```

- [ ] **Schritt 5: Lokal testen**

```bash
python3 -m http.server 8080
```

Browser: http://localhost:8080 → "Mit Google verbinden" klicken → OAuth-Popup erscheint → Anmelden → Toast "Verbunden ✓" erscheint. Kein Konsolen-Fehler.

- [ ] **Schritt 6: Commit**

```bash
git add app/js/config.js app/js/auth.js app/js/sheets.js app/js/heute.js
git commit -m "feat: Google Sheets auth and API integration"
```

---

## Task 3: Datenschicht — Trainingspläne & Rezepte + Rotation

**Files:**
- Create: `app/js/data.js`
- Create: `app/js/rotation.js`

**Interfaces:**
- Produces: `window.Data.plaene.A` — Array von Supersets für Plan A
- Produces: `window.Data.plaene.B` — Array von Supersets für Plan B
- Produces: `window.Data.rezepte` — Objekt: `{ trainingstag, ausdauertag, ruhetag }` je mit `{ fruehstueck, mittagessen, afterWorkout, abendessen }`
- Produces: `window.Data.makroziele` — Objekt mit Kalorien/Protein/Carbs/Fett je Tagestyp
- Produces: `window.Rotation.getToday()` → `{ typ: 'A'|'B'|'ausdauer'|'ruhetag', label: string, badgeClass: string }`

- [ ] **Schritt 1: data.js erstellen**

```js
window.Data = {
  makroziele: {
    A:        { kcal: 2350, protein: 160, carbs: 290, fett: 60 },
    B:        { kcal: 2350, protein: 160, carbs: 290, fett: 60 },
    ausdauer: { kcal: 2300, protein: 160, carbs: 275, fett: 60 },
    ruhetag:  { kcal: 2100, protein: 160, carbs: 210, fett: 60 }
  },

  plaene: {
    A: [
      {
        name: 'Superset 1 — 4 Sätze',
        uebungen: ['Schrägbankdrücken KH', 'Einarmiges KH Rudern (Schrägbank)']
      },
      {
        name: 'Superset 2 — 4 Sätze',
        uebungen: ['Kniebeuge LH', 'KH Romanian Deadlift']
      },
      {
        name: 'Superset 3 — 3 Sätze',
        uebungen: ['Schulterdrücken KH', 'Klimmzüge']
      },
      {
        name: 'Superset 4 — 3 Sätze',
        uebungen: ['Overhead Trizepsdrücken KH', 'Bizepscurl KH']
      },
      {
        name: 'Finisher',
        uebungen: ['Core', '10 min Conditioning (Rudergerät oder Seilspringen)']
      }
    ],
    B: [
      {
        name: 'Superset 1 — 4 Sätze',
        uebungen: ['Flachbankdrücken KH', 'Vorgebeugtes Rudern LH']
      },
      {
        name: 'Superset 2 — 4 Sätze',
        uebungen: ['Kreuzheben LH', 'Bulgarische Kniebeuge KH']
      },
      {
        name: 'Superset 3 — 3 Sätze',
        uebungen: ['Seitheben KH', 'Reverse Fly KH']
      },
      {
        name: 'Superset 4 — 3 Sätze',
        uebungen: ['Bizepscurl KH (alternierend)', 'Dips']
      },
      {
        name: 'Finisher',
        uebungen: ['Core', '10 min Conditioning (Rudergerät oder Seilspringen)']
      }
    ]
  },

  rezepte: {
    trainingstag: {
      fruehstueck: [
        {
          name: 'Overnight Oats mit Beeren',
          makros: '510 kcal · 34g P · 64g C · 8g F',
          zutaten: '80g Haferflocken, 250ml Milch, 150g Magerquark, 100g Beeren (TK), 1 TL Honig',
          zubereitung: 'Abends alles in ein Glas schichten, über Nacht in den Kühlschrank. Morgens direkt essen.'
        },
        {
          name: 'Vollkornbrot mit Hüttenkäse und Ei',
          makros: '490 kcal · 42g P · 44g C · 14g F',
          zutaten: '3 Scheiben Vollkornbrot, 200g Hüttenkäse, 2 hartgekochte Eier, Salz, Schnittlauch',
          zubereitung: 'Eier hartkochen (8 min). Hüttenkäse würzen und auf das Brot streichen, Ei in Scheiben drauflegen.'
        },
        {
          name: 'Rührei mit Haferflocken',
          makros: '560 kcal · 36g P · 56g C · 18g F',
          zutaten: '80g Haferflocken, 300ml Milch, 3 Eier, Salz, Pfeffer, etwas Butter',
          zubereitung: 'Haferflocken mit Milch aufkochen, 5 min köcheln. Eier separat zu Rührei in der Pfanne. Beides zusammen essen.'
        }
      ],
      mittagessen: [
        {
          name: 'Hähnchenbrust mit Reis und Brokkoli',
          makros: '650 kcal · 52g P · 78g C · 10g F',
          zutaten: '200g Hähnchenbrust, 150g Reis (roh), 200g Brokkoli, Olivenöl, Knoblauch, Salz, Pfeffer',
          zubereitung: 'Reis kochen. Hähnchen mit Olivenöl und Knoblauch braten (ca. 8 min). Brokkoli dämpfen oder mitbraten.'
        },
        {
          name: 'Putenhack-Pasta mit Tomatensoße',
          makros: '680 kcal · 50g P · 82g C · 12g F',
          zutaten: '200g Putenhackfleisch, 120g Nudeln (roh), 1 Dose stückige Tomaten, Zwiebel, Knoblauch, Öl, Oregano',
          zubereitung: 'Nudeln kochen. Zwiebel und Knoblauch andünsten, Hackfleisch anbraten, Tomaten dazu, 10 min köcheln.'
        }
      ],
      afterWorkout: [
        {
          name: 'Quark-Bowl mit Banane & Haferflocken',
          makros: '520 kcal · 44g P · 58g C · 9g F',
          zutaten: '300g Magerquark, 1 Banane, 30g Haferflocken, 1 EL Erdnussbutter, 1 EL Honig',
          zubereitung: 'Quark in eine Schüssel, Banane in Scheiben, Haferflocken drüber, Erdnussbutter und Honig obendrauf.'
        },
        {
          name: 'Bananen-Protein-Smoothie',
          makros: '480 kcal · 38g P · 68g C · 5g F',
          zutaten: '2 Bananen, 300ml Milch, 200g Magerquark, 1 EL Honig',
          zubereitung: 'Alle Zutaten in den Mixer, ca. 30 Sekunden mixen. Sofort trinken.'
        },
        {
          name: 'Thunfisch-Wrap',
          makros: '480 kcal · 48g P · 44g C · 10g F',
          zutaten: '2 Weizen-Wraps, 2 Dosen Thunfisch (in Wasser), 1 EL Frischkäse light, Salatblätter, Paprika, Zitronensaft',
          zubereitung: 'Thunfisch abtropfen, mit Frischkäse und Zitronensaft mischen. Mit Salat und Paprika in Wraps füllen.'
        }
      ],
      abendessen: [
        {
          name: 'Hähnchen-Salat mit Senf-Dressing',
          makros: '380 kcal · 46g P · 10g C · 16g F',
          zutaten: '200g Hähnchenbrust (gebraten), gemischter Salat, Gurke, Tomaten, 1 TL Senf, 1 EL Olivenöl, Essig',
          zubereitung: 'Hähnchen in Streifen schneiden. Dressing aus Senf, Öl und Essig mischen. Alles zusammen.'
        },
        {
          name: 'Gemüse-Omelette mit Vollkornbrot',
          makros: '420 kcal · 34g P · 30g C · 18g F',
          zutaten: '4 Eier, Paprika, Spinat, Zwiebel, Öl, Salz, Pfeffer, 2 Scheiben Vollkornbrot',
          zubereitung: 'Gemüse kurz andünsten. Eier verquirlen, drübergießen, Deckel drauf, 5 min stocken lassen.'
        }
      ]
    },

    ausdauertag: {
      fruehstueck: [
        {
          name: 'Overnight Oats mit Banane',
          makros: '480 kcal · 18g P · 82g C · 8g F',
          zutaten: '80g Haferflocken, 250ml Milch, 1 Banane, 1 EL Honig, 1 TL Zimt',
          zubereitung: 'Abends alles in ein Glas schichten, über Nacht in den Kühlschrank. Morgens direkt essen.'
        },
        {
          name: 'Joghurt-Müsli-Bowl mit Beeren',
          makros: '430 kcal · 20g P · 62g C · 10g F',
          zutaten: '300g Naturjoghurt (3,5%), 60g Müsli, 100g Beeren, 1 EL Honig',
          zubereitung: 'Joghurt in eine Schüssel, Müsli, Beeren und Honig drüber.'
        },
        {
          name: 'Vollkorntoast mit Marmelade und Quark',
          makros: '420 kcal · 22g P · 66g C · 4g F',
          zutaten: '3 Scheiben Vollkorntoast, 150g Magerquark, 2 EL Marmelade (zuckerreduziert)',
          zubereitung: 'Toast toasten, Quark draufstreichen, Marmelade darüber.'
        }
      ],
      mittagessen: [
        {
          name: 'Kartoffeln mit Spiegelei und Gemüse',
          makros: '530 kcal · 28g P · 60g C · 16g F',
          zutaten: '300g Kartoffeln, 3 Eier, Paprika, Zucchini, Öl, Salz, Paprikapulver',
          zubereitung: 'Kartoffeln kochen. Gemüse in Pfanne braten. Eier als Spiegelei dazu.'
        },
        {
          name: 'Reisnudeln mit Hühnchen und Sojasauce',
          makros: '560 kcal · 42g P · 72g C · 8g F',
          zutaten: '120g Reisnudeln (roh), 180g Hähnchenbrust, 1 EL Sojasauce, Knoblauch, Frühlingszwiebeln',
          zubereitung: 'Nudeln nach Packungsanleitung. Hähnchen in Streifen mit Sojasauce und Knoblauch braten.'
        }
      ],
      afterWorkout: [
        {
          name: 'Bananen-Protein-Smoothie',
          makros: '480 kcal · 38g P · 68g C · 5g F',
          zutaten: '2 Bananen, 300ml Milch, 200g Magerquark, 1 EL Honig',
          zubereitung: 'Alle Zutaten in den Mixer, ca. 30 Sekunden mixen. Sofort trinken.'
        },
        {
          name: 'Quark-Bowl mit Honig & Haferflocken',
          makros: '420 kcal · 40g P · 44g C · 4g F',
          zutaten: '300g Magerquark, 30g Haferflocken, 1 EL Honig, 100g Beeren',
          zubereitung: 'Quark in eine Schüssel, Haferflocken und Honig drüber, Beeren dazu.'
        }
      ],
      abendessen: [
        {
          name: 'Hähnchen-Salat',
          makros: '370 kcal · 44g P · 8g C · 16g F',
          zutaten: '200g Hähnchenbrust (gebraten), gemischter Salat, Gurke, Tomaten, Olivenöl, Essig, Salz',
          zubereitung: 'Hähnchen in Streifen schneiden, mit Salat und Gemüse mischen, mit Öl und Essig anmachen.'
        },
        {
          name: 'Omelette mit Gemüse',
          makros: '330 kcal · 28g P · 8g C · 20g F',
          zutaten: '4 Eier, Spinat, Paprika, Zwiebel, Öl, Salz, Pfeffer',
          zubereitung: 'Gemüse andünsten, Eier verquirlen und drübergießen, Deckel drauf, 5 min stocken lassen.'
        }
      ]
    },

    ruhetag: {
      fruehstueck: [
        {
          name: 'Magerquark mit Beeren und Leinsamen',
          makros: '280 kcal · 36g P · 18g C · 5g F',
          zutaten: '300g Magerquark, 100g Beeren, 1 EL Leinsamen, 1 TL Honig',
          zubereitung: 'Alles in eine Schüssel – fertig. Kein Kochen nötig.'
        },
        {
          name: 'Rührei mit Gemüse',
          makros: '350 kcal · 28g P · 22g C · 16g F',
          zutaten: '3 Eier, Paprika, Spinat, 1 Scheibe Vollkornbrot, Öl, Salz, Pfeffer',
          zubereitung: 'Gemüse kurz andünsten, Eier verquirlen und dazugeben, rühren bis stockt. Mit Brot servieren.'
        }
      ],
      mittagessen: [
        {
          name: 'Gemüse-Omelette',
          makros: '350 kcal · 30g P · 10g C · 20g F',
          zutaten: '4 Eier, Paprika, Spinat, Zwiebel, Öl, Salz, Pfeffer, Kräuter',
          zubereitung: 'Gemüse andünsten. Eier verquirlen, drübergießen, Deckel drauf, ca. 5 min stocken lassen.'
        },
        {
          name: 'Rote Linsensuppe',
          makros: '420 kcal · 28g P · 62g C · 4g F',
          zutaten: '150g rote Linsen, 1 Dose stückige Tomaten, Zwiebel, Knoblauch, Karotte, Kreuzkümmel, Paprikapulver',
          zubereitung: 'Zwiebel und Knoblauch andünsten, Karotte dazu, Linsen und Tomaten rein, 20 min köcheln. Würzen.'
        },
        {
          name: 'Hüttenkäse mit Gurke und Vollkornbrot',
          makros: '380 kcal · 34g P · 36g C · 8g F',
          zutaten: '250g Hüttenkäse, 1 Gurke, 2 Scheiben Vollkornbrot, Salz, Pfeffer, Schnittlauch',
          zubereitung: 'Hüttenkäse würzen und auf das Brot streichen, Gurke in Scheiben dazu legen.'
        }
      ],
      abendessen: [
        {
          name: 'Hähnchen-Salat mit Senf-Dressing',
          makros: '380 kcal · 46g P · 10g C · 16g F',
          zutaten: '200g Hähnchenbrust (gebraten), gemischter Salat, Gurke, Tomaten, 1 TL Senf, 1 EL Olivenöl, Essig',
          zubereitung: 'Hähnchen in Streifen schneiden, Salat und Gemüse bereitstellen, Dressing mischen.'
        },
        {
          name: 'Rührei mit Spinat',
          makros: '380 kcal · 34g P · 22g C · 18g F',
          zutaten: '4 Eier, 100g Spinat (TK oder frisch), 1 Scheibe Vollkornbrot, Öl, Knoblauch, Salz, Muskat',
          zubereitung: 'Spinat mit Knoblauch andünsten. Eier verquirlen, dazugeben und rühren bis stockt.'
        }
      ]
    }
  }
};
```

- [ ] **Schritt 2: rotation.js erstellen**

```js
window.Rotation = {
  // Trainingstage: Mo (1), Mi (3), Fr (5) | Sa (6) = Ausdauer | Rest = Ruhetag
  // Start: 7. Juli 2026 (erster Montag der App)
  START: new Date('2026-07-06T00:00:00'),

  getToday() {
    const now = new Date();
    const dow = now.getDay(); // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa

    if (dow === 6) {
      return { typ: 'ausdauer', label: 'Ausdauertag', badgeClass: 'badge-ausdauer' };
    }
    if (![1, 3, 5].includes(dow)) {
      return { typ: 'ruhetag', label: 'Ruhetag', badgeClass: 'badge-ruhetag' };
    }

    // Welche KW seit Start → gerade/ungerade bestimmt Woche 1 oder 2
    const diffMs = now - this.START;
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

  getDatenKey(typ) {
    if (typ === 'A' || typ === 'B') return 'trainingstag';
    if (typ === 'ausdauer') return 'ausdauertag';
    return 'ruhetag';
  }
};
```

- [ ] **Schritt 3: Testen**

In Browser-Konsole auf http://localhost:8080 eingeben:
```js
console.log(Rotation.getToday());
// Erwartung je nach Wochentag: { typ: 'A'|'B'|'ausdauer'|'ruhetag', label: '...', badgeClass: '...' }
console.log(Data.rezepte.trainingstag.fruehstueck.length); // 3
console.log(Data.plaene.A.length); // 5
```

- [ ] **Schritt 4: Commit**

```bash
git add app/js/data.js app/js/rotation.js
git commit -m "feat: static data layer with training plans, recipes, and day rotation"
```

---

## Task 4: Tab 1 — Heute (Dashboard)

**Files:**
- Modify: `app/js/heute.js` (ersetzt Testversion aus Task 2)

**Interfaces:**
- Consumes: `Rotation.getToday()`, `Data.makroziele`, `Data.rezepte`
- Consumes: `Sheets.getAll('Ernaehrungs_Log')` für heutige Makros
- Produces: `window.Heute.render()`

- [ ] **Schritt 1: heute.js vollständig ersetzen**

```js
window.Heute = {
  today: null,
  ziel: null,
  gegessen: { kcal: 0, protein: 0, carbs: 0, fett: 0 },

  async render() {
    this.today = Rotation.getToday();
    this.ziel = Data.makroziele[this.today.typ] || Data.makroziele['ruhetag'];

    const mahlzeiten = ['Frühstück', 'Mittagessen', 'After Workout', 'Abendessen'];
    // Ausdauer/Ruhetag: kein After Workout
    const anzeigeM = (this.today.typ === 'ruhetag' || this.today.typ === 'ausdauer')
      ? mahlzeiten.filter(m => m !== 'After Workout')
      : mahlzeiten;

    const datumStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('tab-heute').innerHTML = `
      <h1 style="font-size:20px;font-weight:700;margin-bottom:4px">${datumStr}</h1>
      <span class="day-badge ${this.today.badgeClass}">${this.today.label}</span>

      <div class="card">
        <div class="macro-rings" id="macro-rings"></div>
        <div id="macro-bars"></div>
      </div>

      <div class="card">
        <div class="section-title">Mahlzeiten heute</div>
        ${anzeigeM.map(m => `
          <div class="meal-item" data-meal="${m}" id="meal-${m.replace(/\s/g,'')}">
            <div class="meal-check" id="check-${m.replace(/\s/g,'')}"></div>
            <div>
              <div class="meal-name">${m}</div>
              <div style="font-size:12px;color:var(--text-muted)">Tippen für Rezepte</div>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="btn btn-primary" id="btn-training-heute" style="margin-bottom:12px">
        💪 Zum Training
      </button>
    `;

    this._renderRings();
    this._renderBars();
    this._bindEvents(anzeigeM);
    await this._loadGegessen();
  },

  _renderRings() {
    const items = [
      { key: 'kcal',    label: 'kcal',    color: '#52b788' },
      { key: 'protein', label: 'Protein', color: '#52a8e0' },
      { key: 'carbs',   label: 'Carbs',   color: '#e0b852' },
      { key: 'fett',    label: 'Fett',    color: '#e08852' }
    ];
    const C = 2 * Math.PI * 26; // circumference für r=26

    document.getElementById('macro-rings').innerHTML = items.map(({ key, label, color }) => {
      const pct = Math.min(1, (this.gegessen[key] || 0) / this.ziel[key]);
      const offset = C * (1 - pct);
      return `
        <div class="macro-ring">
          <svg class="ring-svg" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" r="26"/>
            <circle class="ring-fill" cx="32" cy="32" r="26"
              stroke="${color}"
              stroke-dasharray="${C}"
              stroke-dashoffset="${offset}"
              style="transition:stroke-dashoffset 0.5s ease"/>
          </svg>
          <div class="ring-value" style="color:${color}">${this.gegessen[key] || 0}</div>
          <div class="ring-label">${label}</div>
        </div>
      `;
    }).join('');
  },

  _renderBars() {
    const items = [
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs',   label: 'Carbs',   unit: 'g' },
      { key: 'fett',    label: 'Fett',    unit: 'g' }
    ];
    document.getElementById('macro-bars').innerHTML = items.map(({ key, label, unit }) => {
      const pct = Math.min(100, Math.round(((this.gegessen[key] || 0) / this.ziel[key]) * 100));
      return `
        <div class="macro-bar-row">
          <div class="macro-bar-label">${label}</div>
          <div class="macro-bar-track">
            <div class="macro-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="macro-bar-num">${this.gegessen[key] || 0}/${this.ziel[key]}${unit}</div>
        </div>
      `;
    }).join('');
  },

  _bindEvents(mahlzeiten) {
    mahlzeiten.forEach(m => {
      document.getElementById(`meal-${m.replace(/\s/g,'')}`)?.addEventListener('click', () => {
        App.showTab('ernaehrung');
        setTimeout(() => Ernaehrung.setMahlzeit(m), 50);
      });
    });
    document.getElementById('btn-training-heute')?.addEventListener('click', () => App.showTab('training'));
  },

  async _loadGegessen() {
    if (!Auth.isSignedIn()) return;
    try {
      const rows = await Sheets.getAll('Ernaehrungs_Log');
      const heute = new Date().toLocaleDateString('de-DE');
      this.gegessen = { kcal: 0, protein: 0, carbs: 0, fett: 0 };
      rows.filter(r => r[0] === heute).forEach(r => {
        this.gegessen.kcal    += parseFloat(r[3]) || 0;
        this.gegessen.protein += parseFloat(r[4]) || 0;
        this.gegessen.carbs   += parseFloat(r[5]) || 0;
        this.gegessen.fett    += parseFloat(r[6]) || 0;
      });
      this._renderRings();
      this._renderBars();
    } catch (e) {
      console.warn('Makros konnten nicht geladen werden:', e);
    }
  }
};
```

- [ ] **Schritt 2: Testen**

```bash
python3 -m http.server 8080
```

Prüfen:
- Dashboard zeigt heutiges Datum + Tagestyp-Badge
- 4 Makro-Ringe sichtbar (leer = 0%)
- Mahlzeiten-Liste korrekt (Ruhetag ohne "After Workout")
- Klick auf Mahlzeit → wechselt zu Ernährungs-Tab
- Klick "Zum Training" → wechselt zu Training-Tab

- [ ] **Schritt 3: Commit**

```bash
git add app/js/heute.js
git commit -m "feat: Heute tab with macro rings, meal checklist, and day type detection"
```

---

## Task 5: Tab 2 — Training

**Files:**
- Create: `app/js/training.js`

**Interfaces:**
- Consumes: `Rotation.getToday()`, `Data.plaene`
- Consumes/Produces: `Sheets.append('Training_Log', row)`, `Sheets.getAll('Training_Log')`
- Produces: `window.Training.render()`

- [ ] **Schritt 1: training.js erstellen**

```js
window.Training = {
  today: null,
  logMode: false,
  letzteSession: {},

  async render() {
    this.today = Rotation.getToday();
    await this._loadLetzteSession();

    const el = document.getElementById('tab-training');

    if (this.today.typ === 'ruhetag') {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:32px">
          <div style="font-size:40px;margin-bottom:12px">😴</div>
          <div style="font-size:18px;font-weight:600">Ruhetag</div>
          <div style="color:var(--text-muted);margin-top:8px">Erhol dich gut. Morgen wieder.</div>
        </div>
      `;
      return;
    }

    if (this.today.typ === 'ausdauer') {
      el.innerHTML = `
        <div class="card">
          <span class="day-badge badge-ausdauer">Ausdauertag</span>
          <h2 style="margin:12px 0 8px">Cardio — Samstag</h2>
          <p style="color:var(--text-muted);line-height:1.6">
            Mindestens 30–45 min kontinuierliche Ausdauer:<br>
            Laufen, Fahrrad, Rudergerät oder Schwimmen.<br><br>
            Intensität: moderate Herzfrequenz (Zone 2), du kannst noch sprechen.
          </p>
        </div>
      `;
      return;
    }

    const plan = Data.plaene[this.today.typ];
    const alleUebungen = plan.flatMap(ss => ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core'));

    el.innerHTML = `
      <span class="day-badge badge-training">Ganzkörper ${this.today.typ}</span>

      ${!this.logMode ? `
        <div class="card">
          ${plan.map(ss => `
            <div style="margin-bottom:14px">
              <div class="section-title">${ss.name}</div>
              ${ss.uebungen.map(u => `<div style="padding:4px 0;font-size:15px">· ${u}</div>`).join('')}
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary" id="btn-start-log">▶ Einheit starten</button>
      ` : `
        <div id="log-container">
          ${alleUebungen.map(u => this._renderExerciseRow(u)).join('')}
        </div>
        <button class="btn btn-primary" id="btn-save-log" style="margin-top:8px">✓ Einheit abschließen</button>
        <button class="btn btn-ghost" id="btn-cancel-log" style="margin-top:8px">Abbrechen</button>
      `}

      <div class="section-title" style="margin-top:20px">Letzte Einheiten</div>
      <div id="history-container"></div>
    `;

    if (!this.logMode) {
      document.getElementById('btn-start-log').addEventListener('click', () => {
        this.logMode = true;
        this.render();
      });
    } else {
      document.getElementById('btn-save-log').addEventListener('click', () => this._saveLog(alleUebungen));
      document.getElementById('btn-cancel-log').addEventListener('click', () => {
        this.logMode = false;
        this.render();
      });
    }

    this._renderHistory();
  },

  _renderExerciseRow(uebung) {
    const prev = this.letzteSession[uebung];
    const prevText = prev ? `Letztes Mal: ${prev.gewicht} kg × ${prev.saetze} Sätze × ${prev.reps} Wdh` : 'Erstes Mal';
    const id = uebung.replace(/\s/g, '_');
    return `
      <div class="exercise-row">
        <div class="exercise-name">${uebung}</div>
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

  async _saveLog(uebungen) {
    const datum = new Date().toLocaleDateString('de-DE');
    const einheit = this.today.typ;
    const rows = [];

    uebungen.forEach(u => {
      const id = u.replace(/\s/g, '_');
      const kg = document.getElementById(`kg_${id}`)?.value || '0';
      const saetze = document.getElementById(`saetze_${id}`)?.value || '0';
      const reps = document.getElementById(`reps_${id}`)?.value || '0';
      rows.push([datum, einheit, u, kg, saetze, reps]);
    });

    try {
      for (const row of rows) await Sheets.append('Training_Log', row);
      App.showToast('Einheit gespeichert ✓');
    } catch (e) {
      App.showToast('Offline – bitte später synchronisieren');
    }

    this.logMode = false;
    this.render();
  },

  async _loadLetzteSession() {
    if (!Auth.isSignedIn()) return;
    try {
      const rows = await Sheets.getAll('Training_Log');
      this.letzteSession = {};
      rows.forEach(r => {
        this.letzteSession[r[2]] = { gewicht: r[3], saetze: r[4], reps: r[5] };
      });
    } catch (e) { /* offline */ }
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
        return `
          <div class="card" style="padding:12px;margin-bottom:8px">
            <span style="font-weight:600">${d}</span>
            <span class="day-badge badge-training" style="margin-left:8px;font-size:11px">Plan ${einheit}</span>
          </div>
        `;
      }).join('') || '<p style="color:var(--text-muted);font-size:14px">Noch keine Einheiten eingetragen</p>';
    } catch (e) { el.innerHTML = ''; }
  }
};
```

- [ ] **Schritt 2: Testen**

Prüfen:
- Training-Tab zeigt heutigen Plan mit Supersets
- "Einheit starten" wechselt in Log-Modus
- Eingabefelder für Gewicht/Sätze/Reps vorhanden
- "Einheit abschließen" → Toast, zurück zur Planansicht
- Ruhetag/Ausdauertag zeigen korrekte Inhalte

- [ ] **Schritt 3: Commit**

```bash
git add app/js/training.js
git commit -m "feat: Training tab with plan display, log mode, and session history"
```

---

## Task 6: Tab 3 — Ernährung

**Files:**
- Create: `app/js/ernaehrung.js`

**Interfaces:**
- Consumes: `Rotation.getToday()`, `Rotation.getDatenKey()`, `Data.rezepte`, `Data.makroziele`
- Consumes/Produces: `Sheets.append('Ernaehrungs_Log', row)`, `Sheets.getAll('Ernaehrungs_Log')`
- Produces: `window.Ernaehrung.render()`, `window.Ernaehrung.setMahlzeit(name)`

- [ ] **Schritt 1: ernaehrung.js erstellen**

```js
window.Ernaehrung = {
  aktiveMahlzeit: 'Frühstück',
  today: null,
  datenKey: null,
  gegessen: { kcal: 0, protein: 0, carbs: 0, fett: 0 },
  ziel: null,

  async render() {
    this.today = Rotation.getToday();
    this.datenKey = Rotation.getDatenKey(this.today.typ);
    this.ziel = Data.makroziele[this.today.typ] || Data.makroziele['ruhetag'];
    await this._loadGegessen();

    const mahlzeiten = ['Frühstück', 'Mittagessen', 'After Workout', 'Abendessen'];
    const anzeigeM = (this.today.typ === 'ruhetag' || this.today.typ === 'ausdauer')
      ? mahlzeiten.filter(m => m !== 'After Workout')
      : mahlzeiten;

    // Aktive Mahlzeit validieren
    if (!anzeigeM.includes(this.aktiveMahlzeit)) this.aktiveMahlzeit = anzeigeM[0];

    document.getElementById('tab-ernaehrung').innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div id="macro-bars-e"></div>
      </div>

      <div class="chip-row">
        ${anzeigeM.map(m => `
          <div class="chip ${m === this.aktiveMahlzeit ? 'active' : ''}" data-meal="${m}">${m}</div>
        `).join('')}
      </div>

      <div id="rezepte-container"></div>
    `;

    this._renderBars();
    this._renderRezepte();

    document.querySelectorAll('.chip[data-meal]').forEach(chip => {
      chip.addEventListener('click', () => this.setMahlzeit(chip.dataset.meal));
    });
  },

  setMahlzeit(name) {
    this.aktiveMahlzeit = name;
    this.render();
  },

  _renderBars() {
    const items = [
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs',   label: 'Carbs',   unit: 'g' },
      { key: 'fett',    label: 'Fett',    unit: 'g' },
      { key: 'kcal',    label: 'kcal',    unit: '' }
    ];
    document.getElementById('macro-bars-e').innerHTML = items.map(({ key, label, unit }) => {
      const pct = Math.min(100, Math.round(((this.gegessen[key] || 0) / this.ziel[key]) * 100));
      return `
        <div class="macro-bar-row">
          <div class="macro-bar-label">${label}</div>
          <div class="macro-bar-track">
            <div class="macro-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="macro-bar-num">${this.gegessen[key] || 0}/${this.ziel[key]}${unit}</div>
        </div>
      `;
    }).join('');
  },

  _renderRezepte() {
    const mahlzeitKey = {
      'Frühstück': 'fruehstueck',
      'Mittagessen': 'mittagessen',
      'After Workout': 'afterWorkout',
      'Abendessen': 'abendessen'
    }[this.aktiveMahlzeit];

    const rezepte = Data.rezepte[this.datenKey]?.[mahlzeitKey] || [];
    const container = document.getElementById('rezepte-container');

    container.innerHTML = rezepte.map((r, i) => `
      <div class="recipe-card">
        <div class="recipe-header" data-idx="${i}">
          <div>
            <div class="recipe-title">${r.name}</div>
            <div class="recipe-macros">${r.makros}</div>
          </div>
          <div style="color:var(--text-muted);font-size:20px" id="arrow-${i}">›</div>
        </div>
        <div class="recipe-body" id="body-${i}">
          <p><strong>Zutaten:</strong> ${r.zutaten}</p>
          <p><strong>Zubereitung:</strong> ${r.zubereitung}</p>
          <button class="btn btn-primary" style="margin-top:8px" data-rezept="${i}">
            ✓ Gegessen
          </button>
        </div>
      </div>
    `).join('');

    // Toggle aufklappen
    container.querySelectorAll('.recipe-header').forEach(h => {
      h.addEventListener('click', () => {
        const idx = h.dataset.idx;
        const body = document.getElementById(`body-${idx}`);
        const arrow = document.getElementById(`arrow-${idx}`);
        const open = body.classList.toggle('open');
        arrow.textContent = open ? '⌄' : '›';
      });
    });

    // Gegessen-Button
    container.querySelectorAll('[data-rezept]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const r = rezepte[parseInt(btn.dataset.rezept)];
        await this._markGegessen(r);
      });
    });
  },

  async _markGegessen(rezept) {
    // Makros aus String parsen: "510 kcal · 34g P · 64g C · 8g F"
    const m = rezept.makros.match(/(\d+)\s*kcal.*?(\d+)g\s*P.*?(\d+)g\s*C.*?(\d+)g\s*F/);
    const kcal    = m ? m[1] : '0';
    const protein = m ? m[2] : '0';
    const carbs   = m ? m[3] : '0';
    const fett    = m ? m[4] : '0';

    const datum = new Date().toLocaleDateString('de-DE');
    const row = [datum, this.aktiveMahlzeit, rezept.name, kcal, protein, carbs, fett];

    try {
      await Sheets.append('Ernaehrungs_Log', row);
      App.showToast(`${rezept.name} eingetragen ✓`);
    } catch (e) {
      App.showToast('Offline – konnte nicht speichern');
    }

    await this._loadGegessen();
    this._renderBars();
  },

  async _loadGegessen() {
    if (!Auth.isSignedIn()) return;
    try {
      const rows = await Sheets.getAll('Ernaehrungs_Log');
      const heute = new Date().toLocaleDateString('de-DE');
      this.gegessen = { kcal: 0, protein: 0, carbs: 0, fett: 0 };
      rows.filter(r => r[0] === heute).forEach(r => {
        this.gegessen.kcal    += parseFloat(r[3]) || 0;
        this.gegessen.protein += parseFloat(r[4]) || 0;
        this.gegessen.carbs   += parseFloat(r[5]) || 0;
        this.gegessen.fett    += parseFloat(r[6]) || 0;
      });
    } catch (e) { /* offline */ }
  }
};
```

- [ ] **Schritt 2: Testen**

Prüfen:
- Ernährungs-Tab zeigt Makro-Balken oben
- Chip-Filter wechselt zwischen Mahlzeiten
- Rezept-Karten klappbar (Name + Makros → Zutaten + Zubereitung)
- "Gegessen" Button erscheint wenn Karte offen ist
- Von Heute-Tab auf Mahlzeit klicken → Ernährungs-Tab öffnet korrekte Mahlzeit

- [ ] **Schritt 3: Commit**

```bash
git add app/js/ernaehrung.js
git commit -m "feat: Ernaehrung tab with recipe cards, macro tracking, and Sheets integration"
```

---

## Task 7: Tab 4 — Fortschritt

**Files:**
- Create: `app/js/fortschritt.js`

**Interfaces:**
- Consumes: `Sheets.getAll('Training_Log')`, `Sheets.getAll('Koerper')`
- Consumes/Produces: `Sheets.append('Koerper', row)`
- Produces: `window.Fortschritt.render()`

- [ ] **Schritt 1: fortschritt.js erstellen**

```js
window.Fortschritt = {
  gewichtChart: null,
  kraftChart: null,

  async render() {
    document.getElementById('tab-fortschritt').innerHTML = `
      <div class="card">
        <div class="section-title">Körpergewicht</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input type="number" id="input-gewicht" placeholder="z.B. 71.5" step="0.1" min="40" max="200" style="flex:1">
          <button class="btn btn-primary" id="btn-gewicht" style="width:auto;padding:10px 16px">Eintragen</button>
        </div>
        <div class="chart-container">
          <canvas id="chart-gewicht"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Trainingsgewicht</div>
        <select id="uebung-select" style="background:var(--card2);border:1px solid #2a2a3e;border-radius:8px;color:var(--text);font-size:15px;padding:10px 12px;width:100%;margin-bottom:12px">
          ${this._getAlleUebungen().map(u => `<option value="${u}">${u}</option>`).join('')}
        </select>
        <div class="chart-container">
          <canvas id="chart-kraft"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Diese Woche</div>
        <div id="woche-container"></div>
      </div>

      <div class="card">
        <div class="streak-display">
          <div class="streak-number" id="streak-zahl">—</div>
          <div class="streak-label">Wochen in Folge trainiert</div>
        </div>
      </div>
    `;

    document.getElementById('btn-gewicht').addEventListener('click', () => this._saveGewicht());
    document.getElementById('uebung-select').addEventListener('change', async () => {
      const rows = await Sheets.getAll('Training_Log');
      this._renderKraftChart(rows);
    });

    if (!Auth.isSignedIn()) {
      try { await Auth.signIn(); } catch (e) { return; }
    }

    await this._loadAll();
  },

  async _loadAll() {
    try {
      const [gwRows, trainRows] = await Promise.all([
        Sheets.getAll('Koerper'),
        Sheets.getAll('Training_Log')
      ]);
      this._renderGewichtChart(gwRows);
      this._renderKraftChart(trainRows);
      this._renderWoche(trainRows);
      this._renderStreak(trainRows);
    } catch (e) {
      console.warn('Fortschritt konnte nicht geladen werden:', e);
    }
  },

  async _saveGewicht() {
    const val = document.getElementById('input-gewicht').value;
    if (!val) return;
    const datum = new Date().toLocaleDateString('de-DE');
    await Sheets.append('Koerper', [datum, val]);
    App.showToast('Gewicht gespeichert ✓');
    document.getElementById('input-gewicht').value = '';
    const rows = await Sheets.getAll('Koerper');
    this._renderGewichtChart(rows);
  },

  _renderGewichtChart(rows) {
    const canvas = document.getElementById('chart-gewicht');
    if (!canvas) return;
    if (this.gewichtChart) this.gewichtChart.destroy();

    const labels = rows.map(r => r[0]);
    const data   = rows.map(r => parseFloat(r[1]));

    this.gewichtChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Gewicht (kg)',
          data,
          borderColor: '#52b788',
          backgroundColor: 'rgba(82,183,136,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#52b788'
        }]
      },
      options: this._chartOptions('kg')
    });
  },

  _renderKraftChart(rows) {
    const canvas = document.getElementById('chart-kraft');
    const select = document.getElementById('uebung-select');
    if (!canvas || !select) return;
    if (this.kraftChart) this.kraftChart.destroy();

    const uebung = select.value;
    const filtered = rows.filter(r => r[2] === uebung);
    const labels = filtered.map(r => r[0]);
    const data   = filtered.map(r => parseFloat(r[3]));

    this.kraftChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${uebung} (kg)`,
          data,
          borderColor: '#52a8e0',
          backgroundColor: 'rgba(82,168,224,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#52a8e0'
        }]
      },
      options: this._chartOptions('kg')
    });
  },

  _renderWoche(rows) {
    const el = document.getElementById('woche-container');
    if (!el) return;
    const heute = new Date();
    const startWoche = new Date(heute);
    startWoche.setDate(heute.getDate() - heute.getDay() + 1); // Montag

    const dieseWoche = new Set(
      rows
        .filter(r => {
          const [d, m, y] = r[0].split('.');
          const d2 = new Date(+y, +m - 1, +d);
          return d2 >= startWoche && d2 <= heute;
        })
        .map(r => r[0])
    ).size;

    const ziel = 4;
    el.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
        <span style="font-size:36px;font-weight:700;color:var(--accent)">${dieseWoche}</span>
        <span style="color:var(--text-muted)">von ${ziel} Einheiten</span>
      </div>
      <div class="macro-bar-track" style="height:10px">
        <div class="macro-bar-fill" style="width:${Math.min(100, (dieseWoche / ziel) * 100)}%"></div>
      </div>
    `;
  },

  _renderStreak(rows) {
    const tage = [...new Set(rows.map(r => r[0]))].sort().reverse();
    let streak = 0;
    let prevWeek = null;

    tage.forEach(d => {
      const [day, m, y] = d.split('.');
      const date = new Date(+y, +m - 1, +day);
      const kw = this._getKW(date);
      if (prevWeek === null || kw === prevWeek - 1) {
        streak++;
        prevWeek = kw;
      }
    });

    const el = document.getElementById('streak-zahl');
    if (el) el.textContent = streak;
  },

  _getKW(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  _getAlleUebungen() {
    return [
      ...Data.plaene.A.flatMap(ss => ss.uebungen),
      ...Data.plaene.B.flatMap(ss => ss.uebungen)
    ].filter((u, i, a) => a.indexOf(u) === i && !u.includes('Conditioning') && u !== 'Core');
  },

  _chartOptions(unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888', maxTicksLimit: 6 }, grid: { color: '#2a2a3e' } },
        y: { ticks: { color: '#888', callback: v => `${v} ${unit}` }, grid: { color: '#2a2a3e' } }
      }
    };
  }
};
```

- [ ] **Schritt 2: Testen**

Prüfen:
- Gewicht eintragen → Toast → Chart aktualisiert
- Übung auswählen → Kraft-Chart erscheint
- Wochenübersicht zeigt korrekte Anzahl Einheiten
- Streak-Zahl erscheint

- [ ] **Schritt 3: Commit**

```bash
git add app/js/fortschritt.js
git commit -m "feat: Fortschritt tab with weight/strength charts and streak counter"
```

---

## Task 8: GitHub Pages Deployment + iPhone Install

**Files:**
- Create: `.github/workflows/deploy.yml` (optional, für auto-deploy)
- Create: `app/CNAME` (optional, für eigene Domain)

- [ ] **Schritt 1: GitHub Repo erstellen**

```bash
# Auf github.com: neues Repo erstellen "fitness-app" (öffentlich)
# Dann lokal verbinden:
cd "/Users/juliusziegler/Library/Mobile Documents/com~apple~CloudDocs/Pers. Improvement/Projekt 3 Fitness App"
git remote add origin https://github.com/[dein-username]/fitness-app.git
git branch -M main
git push -u origin main
```

- [ ] **Schritt 2: GitHub Pages aktivieren**

1. Auf github.com → Repository "fitness-app" → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main` | Folder: `/app`
4. Speichern → URL erscheint: `https://[username].github.io/fitness-app`

- [ ] **Schritt 3: Google Cloud — authorized origins ergänzen**

1. console.cloud.google.com → APIs & Dienste → Anmeldedaten → OAuth-Client öffnen
2. Autorisierte JavaScript-Ursprünge: `https://[username].github.io` hinzufügen
3. Speichern

- [ ] **Schritt 4: config.js mit echten Werten befüllen**

```js
window.Config = {
  CLIENT_ID: 'echte-client-id.apps.googleusercontent.com',  // aus Google Cloud
  SPREADSHEET_ID: 'echte-spreadsheet-id',                   // aus Sheets URL
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};
```

```bash
git add app/js/config.js
git commit -m "config: add Google API credentials"
git push
```

- [ ] **Schritt 5: Auf iPhone installieren**

1. Safari auf iPhone öffnen
2. URL aufrufen: `https://[username].github.io/fitness-app`
3. Teilen-Symbol (□↑) → "Zum Home-Bildschirm" → "Hinzufügen"
4. App öffnet sich als Vollbild ohne Browser-Leiste

- [ ] **Schritt 6: Finaler Test auf iPhone**

Prüfen:
- App öffnet sich als Vollbild (kein Browser-Chrome)
- Bottom Navigation funktioniert per Touch
- Google-Anmeldung funktioniert (beim ersten Öffnen von Fortschritt-Tab)
- Rezept als "Gegessen" markieren → Makros aktualisieren in Heute-Tab
- Training-Log eintragen → in Google Sheets sichtbar
- Gewicht eintragen → Chart erscheint

- [ ] **Schritt 7: Finaler Commit**

```bash
git add .
git commit -m "feat: complete fitness PWA - ready for production"
git push
```
