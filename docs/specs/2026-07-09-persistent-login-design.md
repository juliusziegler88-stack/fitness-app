# Dauerhafter Login — Design

## Kontext

Aktuell verliert die App bei jedem Neuladen den Login-Zustand komplett (`Auth.token` ist nur eine JS-Variable im Speicher, nirgends persistiert). `Auth.autoSignIn()` versucht beim Start einen *stillen* Google-Login über `initTokenClient(...).requestAccessToken({ prompt: '' })`, der auf einer bestehenden Google-Session-Cookie im Browser beruht. Safaris Tracking-Schutz (ITP) blockiert diesen stillen Mechanismus sehr häufig, wodurch Julius beim Öffnen von Tabs, die Google Sheets brauchen (v.a. `fortschritt.js`, das bei fehlendem Login sofort `Auth.signIn()` — den interaktiven Popup-Login — aufruft), ständig neu einloggen muss.

Google-OAuth-Access-Tokens sind grundsätzlich nur ~1 Stunde gültig. Ein echtes "nie wieder einloggen" erfordert ein **Refresh Token**, das Google nur über den serverseitigen Authorization-Code-Flow ausgibt (braucht einen Client Secret, der niemals im Frontend-Code stehen darf). Die App ist bisher rein statisch (GitHub Pages, kein Server) — dafür wird ein neuer, minimaler Server-Baustein nötig.

## Ziel

Nach einem einmaligen (erneuten) Login soll die App bei jedem künftigen Öffnen automatisch, ohne jede Google-Interaktion, eingeloggt sein — unabhängig von Safaris Cookie-Verhalten.

## Architektur-Überblick

```
Browser (app/js/auth.js)          Cloudflare Worker           Google OAuth
─────────────────────────         ──────────────────         ──────────────
initCodeClient() [einmalig]  ──code──▶  POST /exchange  ──────▶ oauth2.googleapis.com/token
  ↓ speichert refresh_token            (hält Client Secret)         ↓
  ↓ + access_token in localStorage  ◀── {access_token,          {access_token,
                                          refresh_token,           refresh_token,
                                          expires_in}              expires_in}

Bei jedem App-Start / abgelaufenem Token:
ensureValidToken()            ──refresh_token──▶ POST /refresh  ──────▶ oauth2.googleapis.com/token
  ↓ speichert neues                                                        ↓
    access_token             ◀── {access_token, expires_in}  ◀── {access_token, expires_in}
```

Der Cloudflare Worker ist die einzige Komponente, die den Google-Client-Secret kennt. Das `refresh_token` wird — angemessen für eine Einzelnutzer-App ohne Backend-Datenbank — im `localStorage` des Browsers gespeichert, nicht serverseitig.

## Voraussetzung: Google Cloud Console (manuell, einmalig)

1. **Client Secret besorgen:** Google Cloud Console → APIs & Dienste → Anmeldedaten → bestehender OAuth-Client (`839647146031-...`) → Client Secret kopieren (Web-Application-Clients haben immer einen, auch wenn er bisher nicht gebraucht wurde).
2. **Publishing Status prüfen:** Google Cloud Console → APIs & Dienste → OAuth-Zustimmungsbildschirm → Status. Falls "Testen": auf **"In Produktion"** umstellen. Grund: Im Testen-Modus verfallen Refresh Tokens laut Google nach 7 Tagen — unabhängig von der Testnutzer-Liste. Ohne diese Umstellung wäre "nie wieder einloggen" nicht erreichbar.
   - Da die App unverifiziert bleibt (nur Sheets-Scope, ein Nutzer), erscheint beim nächsten Login einmalig eine "Diese App ist nicht verifiziert"-Warnung mit einem "Erweitert" → "Trotzdem fortfahren"-Link. Einmaliger Klick, keine Wiederholung danach.

## Cloudflare Worker

**Neues Verzeichnis:** `worker/index.js`, `worker/wrangler.toml`.

**Umgebungsvariablen:**
- `GOOGLE_CLIENT_ID` (unkritisch, bereits öffentlich in `app/js/config.js`)
- `GOOGLE_CLIENT_SECRET` (Secret, via `wrangler secret put`, landet nie im Repo oder im Chat)

**CORS:** Nur Anfragen von `https://juliusziegler88-stack.github.io` (Live) und `http://localhost:8080` (lokales Testen) werden beantwortet — andere Origins bekommen keinen `Access-Control-Allow-Origin`-Header.

**`POST /exchange`** — Body: `{ code: string }`
Tauscht den Code bei `https://oauth2.googleapis.com/token` gegen Tokens:
```
grant_type=authorization_code
code=<code>
client_id=<GOOGLE_CLIENT_ID>
client_secret=<GOOGLE_CLIENT_SECRET>
redirect_uri=postmessage
```
`redirect_uri=postmessage` ist der von Google dokumentierte Spezialwert für den JS-basierten Code-Flow ohne echten Redirect (`ux_mode: 'popup'`).
Antwort an den Client: `{ access_token, refresh_token, expires_in }`.

**`POST /refresh`** — Body: `{ refresh_token: string }`
Tauscht bei `https://oauth2.googleapis.com/token`:
```
grant_type=refresh_token
refresh_token=<refresh_token>
client_id=<GOOGLE_CLIENT_ID>
client_secret=<GOOGLE_CLIENT_SECRET>
```
Antwort an den Client: `{ access_token, expires_in }` (Google gibt bei diesem Grant kein neues `refresh_token` zurück — das ursprüngliche bleibt gültig).

**Fehlerfall:** Antwortet Google mit einem Fehler (z.B. `invalid_grant`, weil das Refresh Token widerrufen wurde), gibt der Worker `{ error: '...' }` mit Status 400 zurück. Der Client erkennt das und fällt auf den interaktiven Login zurück (seltener Fall, z.B. wenn Julius den App-Zugriff in seinem Google-Konto manuell widerruft).

## Frontend-Änderungen

**`app/js/config.js`:** neuer Eintrag `WORKER_URL` (tatsächliche URL erst nach dem ersten Worker-Deploy bekannt).

**`app/js/auth.js`** — neues Speicherformat in `localStorage` unter `fitness_auth`:
```json
{ "access_token": "...", "refresh_token": "...", "expires_at": 1735689600000 }
```
(`expires_at` = Zeitstempel in ms, mit 60s Sicherheitspuffer vor dem tatsächlichen Ablauf.)

Neue/geänderte Methoden:
- `isSignedIn()` — prüft zusätzlich `expires_at > Date.now()`, nicht nur Vorhandensein eines Tokens.
- `autoSignIn()` — **bleibt still** (kein Popup, wie bisher): lädt gespeicherten Zustand; ist `access_token` noch gültig, fertig; sonst mit gespeichertem `refresh_token` still über den Worker erneuern; ohne `refresh_token` (allererster Start) `false` zurückgeben, ohne jede Google-Interaktion.
- `signIn()` — jetzt `initCodeClient({ access_type: 'offline', prompt: 'consent' })` statt `initTokenClient`; schickt den erhaltenen Code an `POST {WORKER_URL}/exchange`; speichert Antwort in `localStorage`.
- `ensureValidToken()` **(neu)** — zentrale Stelle, die von `sheets.js` genutzt wird: ist der Token gültig, nichts tun; sonst still über den Worker erneuern; schlägt auch das fehl, `signIn()` (interaktiv) aufrufen.

**`app/js/sheets.js`:** `_req()` ruft statt `if (!Auth.isSignedIn()) await Auth.signIn();` neu `await Auth.ensureValidToken();` auf — probiert also immer zuerst die stille Erneuerung, bevor überhaupt ein Popup infrage kommt.

Keine Änderung an `fortschritt.js`, `heute.js`, `ernaehrung.js`, `training.js`, `workout-session.js` — die rufen weiterhin nur `Auth.isSignedIn()` ab bzw. verlassen sich auf `sheets.js`.

## Fehlerszenarien

- **Worker nicht erreichbar (offline):** `ensureValidToken()`/`autoSignIn()` werfen/scheitern still, bestehende Offline-Warteschlange (`Sheets.enqueuePending`) greift unverändert.
- **Refresh Token abgelaufen/widerrufen:** Worker antwortet mit Fehler, `ensureValidToken()` fällt auf interaktiven `signIn()` zurück — einmaliger neuer Login, danach wieder dauerhaft.
- **Erster Start ganz ohne vorherigen Login:** `autoSignIn()` liefert `false`, App verhält sich wie bisher (z.B. "Anmelden um History zu sehen"), bis ein Sheets-Zugriff `ensureValidToken()` auslöst und interaktiv einloggt.

## Testplan

Manuell (kein Test-Framework im Projekt):
1. Worker lokal/deployed: `curl -X POST <WORKER_URL>/exchange` ohne gültigen Code → erwartete Fehlerantwort, kein Absturz.
2. Frontend: einmalig einloggen (`signIn()`), `localStorage.fitness_auth` enthält `access_token` + `refresh_token` + `expires_at`.
3. Seite hart neu laden → kein Login-Popup, `Auth.isSignedIn()` sofort `true`.
4. `expires_at` in den DevTools manuell auf einen vergangenen Zeitpunkt setzen, Seite neu laden → `autoSignIn()` erneuert still über den Worker, kein Popup, `Training._renderHistory()` lädt trotzdem Daten.
5. `localStorage.fitness_auth` komplett löschen, Fortschritt-Tab öffnen → interaktiver Login-Popup erscheint (Erstlogin-Fall funktioniert weiterhin).
