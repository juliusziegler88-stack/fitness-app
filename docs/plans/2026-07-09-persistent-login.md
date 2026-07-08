# Dauerhafter Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login-Zustand übersteht Reloads/App-Neustarts dauerhaft, ohne wiederholte Google-Popups — über einen Cloudflare Worker, der das OAuth-Refresh-Token serverseitig gegen frische Access-Tokens tauscht.

**Architecture:** Neuer, separater Cloudflare Worker (`worker/`) hält den Google-Client-Secret und bietet `/exchange` (Code → Tokens, einmalig) und `/refresh` (Refresh-Token → neues Access-Token, bei jedem App-Start). `app/js/auth.js` speichert Tokens in `localStorage` und nutzt den Worker für stille Erneuerung statt auf Safaris (unzuverlässige) stille Google-Session zu setzen.

**Tech Stack:** Cloudflare Workers (kein npm-Projekt nötig, ein JS-File + `wrangler.toml`), Frontend weiterhin Vanilla JS/kein Build.

## Global Constraints

- Spec: `docs/specs/2026-07-09-persistent-login-design.md`.
- Der Google-Client-Secret darf **niemals** im Repo, im Frontend-Code oder in dieser Chat-Konversation auftauchen. Alle Schritte, die ihn eintippen, führt Julius selbst in seinem eigenen Terminal aus (nicht über Bash-Tool-Aufrufe in dieser Session).
- CORS des Workers erlaubt nur `https://juliusziegler88-stack.github.io` und `http://localhost:8080`.
- `redirect_uri` beim Google-Token-Austausch muss exakt `postmessage` sein (Spezialwert für den JS-Popup-Code-Flow, kein echter Redirect).
- Nach Abschluss: Service-Worker-Cache-Version in `app/sw.js` hochzählen (aktuell `fitness-v12` → `fitness-v13`).

---

### Task 1: Google Cloud Console vorbereiten (Julius, manuell)

**Keine Dateien — reine Konsolen-Schritte.**

- [ ] **Step 1: Client Secret besorgen**

Google Cloud Console (im Projekt "Fitness App v2") → **APIs & Dienste** → **Anmeldedaten** → OAuth-2.0-Client `839647146031-024ia48bl57ctekpbfeth9ku9m0dp7ct.apps.googleusercontent.com` anklicken → **Client Secret** kopieren (wird gleich in Task 4 gebraucht, dort direkt eintragen, nicht hier im Chat einfügen).

- [ ] **Step 2: Publishing Status auf "In Produktion" prüfen/umstellen**

Google Cloud Console → **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**. Falls Status "Testen" ist: auf **"App veröffentlichen"** → **"In Produktion"** umstellen. Ohne diesen Schritt verfallen Refresh Tokens laut Google nach 7 Tagen — das komplette Feature würde nur eine Woche halten.

Beim nächsten Login (Task 6) erscheint dadurch einmalig eine "Diese App wurde nicht verifiziert"-Warnung mit einem "Erweitert"-Link → "Zu Fitness App v2 (unsicher) wechseln" (oder ähnlicher Wortlaut). Das ist normal für eine unverifizierte Einzelnutzer-App und muss nur dieses eine Mal weggeklickt werden.

- [ ] **Step 3: Bestätigen**

Julius bestätigt: "Client Secret kopiert, Publishing Status ist 'In Produktion'."

---

### Task 2: Cloudflare-Account + Wrangler-Login (Julius, eigenes Terminal)

**Keine Dateien.**

- [ ] **Step 1: Cloudflare-Account anlegen**

Falls noch nicht vorhanden: auf https://dash.cloudflare.com/sign-up einen kostenlosen Account anlegen (nur E-Mail + Passwort, keine Zahlungsdaten nötig für den Workers-Free-Plan).

- [ ] **Step 2: Wrangler-CLI einloggen**

In einem **eigenen Terminal-Fenster** (nicht über diese Konversation):

```bash
cd "/Users/juliusziegler/Library/Mobile Documents/com~apple~CloudDocs/Pers. Improvement/Projekt 3 Fitness App"
npx wrangler login
```

Öffnet den Browser, dort mit dem Cloudflare-Account einloggen und Zugriff erlauben.

- [ ] **Step 3: Bestätigen**

Julius bestätigt: "Wrangler ist eingeloggt" (Terminal zeigt nach `npx wrangler login` eine Erfolgsmeldung).

---

### Task 3: Cloudflare Worker — Code

**Files:**
- Create: `worker/index.js`
- Create: `worker/wrangler.toml`

**Interfaces:**
- Produces: `POST {WORKER_URL}/exchange` mit Body `{ code }` → `{ access_token, refresh_token, expires_in }`; `POST {WORKER_URL}/refresh` mit Body `{ refresh_token }` → `{ access_token, expires_in }`. Konsumiert von `app/js/auth.js` (Task 5).
- Consumes: Umgebungsvariablen `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (gesetzt in Task 4).

- [ ] **Step 1: `worker/wrangler.toml` anlegen**

```toml
name = "fitness-app-auth"
main = "index.js"
compatibility_date = "2026-07-09"
```

- [ ] **Step 2: `worker/index.js` anlegen**

```js
const ALLOWED_ORIGINS = [
  'https://juliusziegler88-stack.github.io',
  'http://localhost:8080'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

async function googleTokenRequest(params, env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...params
    })
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/exchange') {
      const { code } = await request.json();
      if (!code) return new Response(JSON.stringify({ error: 'code fehlt' }), { status: 400, headers });

      const { ok, data } = await googleTokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'postmessage'
      }, env);
      if (!ok) return new Response(JSON.stringify({ error: data.error || 'exchange fehlgeschlagen' }), { status: 400, headers });

      return new Response(JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
      }), { status: 200, headers });
    }

    if (request.method === 'POST' && url.pathname === '/refresh') {
      const { refresh_token } = await request.json();
      if (!refresh_token) return new Response(JSON.stringify({ error: 'refresh_token fehlt' }), { status: 400, headers });

      const { ok, data } = await googleTokenRequest({
        grant_type: 'refresh_token',
        refresh_token
      }, env);
      if (!ok) return new Response(JSON.stringify({ error: data.error || 'refresh fehlgeschlagen' }), { status: 400, headers });

      return new Response(JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
  }
};
```

- [ ] **Step 3: Syntax verifizieren**

```bash
node --check worker/index.js
```

Expected: keine Ausgabe (Syntax OK).

- [ ] **Step 4: Commit**

```bash
git add worker/index.js worker/wrangler.toml && git commit -m "feat: add cloudflare worker for OAuth refresh-token exchange"
```

---

### Task 4: Worker-Secret setzen + deployen (Julius, eigenes Terminal)

**Keine Dateien.**

- [ ] **Step 1: Client Secret als Wrangler-Secret hinterlegen**

In einem **eigenen Terminal-Fenster**:

```bash
cd "/Users/juliusziegler/Library/Mobile Documents/com~apple~CloudDocs/Pers. Improvement/Projekt 3 Fitness App/worker"
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Wenn danach gefragt wird: den in Task 1 kopierten Client Secret einfügen und Enter drücken.

- [ ] **Step 2: Client ID als normale Variable setzen**

In `worker/wrangler.toml` folgende Zeile ergänzen (Client ID ist bereits öffentlich, kein Secret nötig):

```toml
[vars]
GOOGLE_CLIENT_ID = "839647146031-024ia48bl57ctekpbfeth9ku9m0dp7ct.apps.googleusercontent.com"
```

- [ ] **Step 3: Deployen**

```bash
npx wrangler deploy
```

Ausgabe enthält die Worker-URL, z.B. `https://fitness-app-auth.<dein-subdomain>.workers.dev`.

- [ ] **Step 4: Bestätigen**

Julius teilt die ausgegebene Worker-URL mit (kein Geheimnis — wird als `WORKER_URL` in Task 5 gebraucht).

---

### Task 5: Frontend — `auth.js`, `sheets.js`, `config.js`

**Files:**
- Modify: `app/js/config.js`
- Modify: `app/js/auth.js` (komplett ersetzen)
- Modify: `app/js/sheets.js:5-7` (`_req()`)

**Interfaces:**
- Consumes: `Config.WORKER_URL` (Task 4), `Config.CLIENT_ID`, `Config.SCOPES` (bestehend).
- Produces: `Auth.isSignedIn()`, `Auth.getToken()`, `Auth.autoSignIn()`, `Auth.signIn()`, `Auth.ensureValidToken()` — Signaturen unverändert bzw. (`ensureValidToken`) neu, von `sheets.js` konsumiert.

- [ ] **Step 1: `app/js/config.js` um `WORKER_URL` ergänzen**

```js
window.Config = {
  // Aus Google Cloud Console kopieren:
  CLIENT_ID: '839647146031-024ia48bl57ctekpbfeth9ku9m0dp7ct.apps.googleusercontent.com',
  // Aus Google Sheets URL kopieren:
  SPREADSHEET_ID: '1N8rGnOhqKCQqZJjp7HjyCiPO1lR-vDDdOFHxT1bu5iw',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  // Aus `wrangler deploy` (Task 4):
  WORKER_URL: 'https://fitness-app-auth.WIRD-IN-TASK-4-ERSETZT.workers.dev'
};
```

(Platzhalter `WIRD-IN-TASK-4-ERSETZT` durch die tatsächliche, in Task 4 mitgeteilte Worker-URL ersetzen.)

- [ ] **Step 2: `app/js/auth.js` komplett ersetzen**

```js
window.Auth = {
  STORAGE_KEY: 'fitness_auth',
  token: null,
  refreshToken: null,
  expiresAt: 0,

  _load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.token = data.access_token || null;
      this.refreshToken = data.refresh_token || null;
      this.expiresAt = data.expires_at || 0;
    } catch (e) { /* ignore */ }
  },

  _save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      access_token: this.token,
      refresh_token: this.refreshToken,
      expires_at: this.expiresAt
    }));
  },

  isSignedIn() {
    return !!this.token && this.expiresAt > Date.now();
  },

  getToken() { return this.token; },

  async autoSignIn() {
    this._load();
    if (this.isSignedIn()) return true;
    if (!this.refreshToken) return false;
    return this._refresh();
  },

  async ensureValidToken() {
    if (this.isSignedIn()) return true;
    if (this.refreshToken && await this._refresh()) return true;
    await this.signIn();
    return true;
  },

  async _refresh() {
    try {
      const res = await fetch(`${Config.WORKER_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.token = data.access_token;
      this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
      this._save();
      return true;
    } catch (e) { return false; }
  },

  async signIn() {
    const code = await new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initCodeClient({
        client_id: Config.CLIENT_ID,
        scope: Config.SCOPES,
        ux_mode: 'popup',
        access_type: 'offline',
        prompt: 'consent',
        callback: (resp) => {
          if (resp.error || !resp.code) return reject(resp.error || 'kein Code erhalten');
          resolve(resp.code);
        }
      });
      client.requestCode();
    });

    const res = await fetch(`${Config.WORKER_URL}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) throw new Error('Token-Austausch fehlgeschlagen');
    const data = await res.json();
    this.token = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    this._save();
    return this.token;
  }
};
```

- [ ] **Step 3: `app/js/sheets.js` — `_req()` auf `ensureValidToken` umstellen**

```js
// vorher:
  async _req(path, method = 'GET', body = null) {
    if (!Auth.isSignedIn()) await Auth.signIn();
// nachher:
  async _req(path, method = 'GET', body = null) {
    await Auth.ensureValidToken();
```

- [ ] **Step 4: Syntax verifizieren**

```bash
node --check app/js/auth.js && node --check app/js/config.js && node --check app/js/sheets.js
```

Expected: keine Ausgabe (Syntax OK).

- [ ] **Step 5: Commit**

```bash
git add app/js/config.js app/js/auth.js app/js/sheets.js && git commit -m "feat: persist login via cloudflare worker refresh-token exchange"
```

---

### Task 6: Cache-Version hochzählen, deployen, manuell verifizieren

**Files:**
- Modify: `app/sw.js`

- [ ] **Step 1: Cache-Version hochzählen**

```js
const CACHE = 'fitness-v13';
```

- [ ] **Step 2: Commit und pushen**

```bash
git add app/sw.js && git commit -m "chore: bump service worker cache version for persistent login" && git push
```

- [ ] **Step 3: Manuell auf der Live-Seite verifizieren**

Auf dem iPhone (Julius):
1. Falls noch alte `localStorage`-Reste vorhanden: keine Sonderbehandlung nötig, neues Format überschreibt das alte beim nächsten Login.
2. Fortschritt-Tab öffnen → Login-Popup erscheint (einmalig, inkl. der "nicht verifiziert"-Warnung aus Task 1) → einloggen.
3. Safari **komplett schließen** und neu öffnen, Live-URL erneut aufrufen, direkt Fortschritt-Tab öffnen → **kein** Login-Popup, Daten laden direkt.
4. Optional (mehrere Stunden später erneut prüfen): Login sollte weiterhin ohne Popup funktionieren, auch nachdem das ursprüngliche Access Token (~1h) abgelaufen ist.

Expected: Nur beim allerersten Mal ein Login-Popup, danach dauerhaft automatisch eingeloggt.
