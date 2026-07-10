# Fitness App (Projekt 3)

Persönliches Fitness-Dashboard als PWA — Training, Ernährung, Fortschritt, Google Sheets als Backend.

## Stack

- Vanilla HTML/CSS/JS — kein npm, kein Build, kein Test-Framework
- Google Identity Services (GIS) für OAuth, Google Sheets API v4 als Backend
- Service Worker für Offline-Fähigkeit (`app/sw.js`, Cache-Version bei jeder JS-Änderung hochzählen!)
- Chart.js via CDN
- GitHub Pages Hosting (Deploy passiert automatisch bei `git push` auf `main`)

## Infrastruktur

- **Live-URL:** https://juliusziegler88-stack.github.io/fitness-app/
- **GitHub:** https://github.com/juliusziegler88-stack/fitness-app
- **Google Spreadsheet:** `1N8rGnOhqKCQqZJjp7HjyCiPO1lR-vDDdOFHxT1bu5iw` ("Fitness App Data")
- **Google Cloud Projekt:** "Fitness App v2" (ersetzt das ursprüngliche Projekt, siehe "Bekannte offene Punkte" unten — Anzeigename ≠ Projekt-ID, im Zweifel über den Projekt-Umschalter nach "fitness" suchen, nicht die ID raten)
- **Google OAuth Client ID:** `839647146031-024ia48bl57ctekpbfeth9ku9m0dp7ct.apps.googleusercontent.com`
- **Autorisierte JS-Origins für OAuth:** Live-URL + `http://localhost:8080`
- **Cloudflare Worker (Login-Persistenz):** `https://fitness-app-auth.juliusziegler88.workers.dev` — hält den Google Client Secret, tauscht Refresh-Token gegen Access-Token. Code: `worker/index.js`. Deploy: `cd worker && npx wrangler deploy`.
- **Wichtig:** Das Spreadsheet gehört dem Konto `julius.ziegler88@gmail.com` (nicht dem Mayakakao-Konto) — als Bearbeiter freigegeben. Falls ein neues Google-Konto je die App nutzen soll, muss das Sheet zuerst explizit mit dessen E-Mail geteilt werden ("Teilen"-Button im Spreadsheet), sonst gibt die API 403 PERMISSION_DENIED zurück, obwohl OAuth-Login und Scope korrekt sind.

## Lokales Testen

```bash
cd app && python3 -m http.server 8080
```
Dann `http://localhost:8080/` öffnen. **Wichtig:** Nach JS-Änderungen die Cache-Version in `app/sw.js` (`const CACHE = 'fitness-vX'`) hochzählen, sonst liefert der Service Worker bei bereits besuchten Browsern alten Code aus — harmloses Neuladen reicht dann nicht.

## Git-Workflow

```bash
git add <datei> && git commit -m "..." && git push
```
Push auf `main` löst automatisch das GitHub-Pages-Deployment aus (kein manueller Schritt nötig).

## Bekannte offene Punkte (Stand 08.07.2026)

- ~~Google Sheets API gibt 403 PERMISSION_DENIED zurück~~ **Gelöst (07.07.2026).** Root Cause war nicht die OAuth-Konfiguration (Origin, Scope, API-Aktivierung, Client — alles war schon korrekt), sondern: das Spreadsheet gehörte einem **anderen Google-Konto** (`julius.ziegler@mayakakao.de`) als dem, mit dem sich die App anmeldet (`julius.ziegler88@gmail.com`). Der Browser zeigte beim direkten Öffnen des Sheet-Links trotzdem Zugriff, weil er ohnehin mit dem Mayakakao-Konto eingeloggt war — das hat die Fehlersuche lange in die falsche Richtung gelenkt. Fix: Sheet explizit mit `julius.ziegler88@gmail.com` geteilt. Nebenbei wurde ein neues, sauberes Google-Cloud-Projekt ("Fitness App v2") mit neuem OAuth-Client angelegt, da der alte Zustimmungsbildschirm einen unklaren "Erste Schritte"-Zustand hatte (siehe neue Client-ID oben) — im Nachhinein war das wahrscheinlich nicht die eigentliche Ursache, aber schadet nicht.
- **Feature-Wunsch:** Bodyweight-Übungen (z.B. Klimmzüge) sollten kein Gewicht-Eingabefeld zeigen, nur Wiederholungen — aktuell zeigt jede Kraft-Übung Gewicht/Sätze/Wdh einheitlich.
- ~~Auf der Live-Seite kommt ein neu ausgeliefertes Feature auch nach mehrfachem Reload nicht an~~ **Gelöst (09.07.2026), drei Schichten — die ersten beiden waren nötig, aber nicht ausreichend:**
  1. `app/sw.js` beantwortete jede Anfrage cache-first (`caches.match(...) || fetch(...)`) — sobald eine Ressource einmal im Service-Worker-Cache lag, wurde sie für immer aus dem Cache bedient. Fix: Fetch-Strategie auf **Network-First** umgestellt.
  2. `fetch(e.request)` respektiert standardmäßig den normalen HTTP-Cache des Browsers — GitHub Pages liefert alle Dateien mit `cache-control: max-age=600`, wodurch der "Netzwerk-Fetch" innerhalb von 10 Minuten trotzdem eine alte HTTP-gecachte Antwort zurückgab. Fix: `fetch(e.request, { cache: 'no-store' })`.
  3. **Der eigentliche Kern des Problems:** Beide Fixes oben ändern nur, *wie* eine bereits aktive neue Service-Worker-Version Anfragen beantwortet — sie setzen voraus, dass diese neue Version überhaupt erst installiert wird. Das Erkennen einer neuen `sw.js`-Version passiert aber standardmäßig nach Safaris eigenem, undokumentiertem Hintergrund-Zeitplan, der auf iOS nachweislich unzuverlässig ist (bestätigt: selbst kompletter Safari-Neustart hat nichts gebracht — SW-Zustand ist persistent und unabhängig vom Browser-Prozess). Fix: `app/js/app.js` ruft nach der Registrierung aktiv `registration.update()` auf (erzwingt bei **jedem** App-Start eine Prüfung, statt auf Safari zu warten) und lädt die Seite automatisch neu (`location.reload()`), sobald eine neue Version über `controllerchange` die Kontrolle übernimmt.
  - **Wichtige Einschränkung:** Dieser Fix kann sich nicht selbst ausliefern, wenn ein Gerät bereits in einem alten, unzuverlässigen Service-Worker feststeckt — der alte SW liefert ja gerade das alte `app.js` aus, das den Fix noch nicht enthält (Henne-Ei-Problem). Für bereits betroffene Geräte ist einmalig ein manueller Reset nötig (iPhone: Einstellungen → Safari → Erweitert → Websitedaten → Eintrag für `juliusziegler88-stack.github.io` löschen). Danach sollte sich die App bei jedem zukünftigen Deploy selbst aktuell halten, ohne dass das nochmal nötig ist.
  - Cache-Version weiterhin bei jeder JS-Änderung hochzählen (aktueller Stand siehe `app/sw.js`) — bleibt relevant für den Offline-Fallback (`caches.match` bei fehlgeschlagenem Fetch).
  - **`app/reset.html`:** Alternative zum manuellen Websitedaten-Löschen in den iPhone-Einstellungen, falls ein Gerät trotz obiger Fixes nochmal feststeckt. Funktioniert, weil eine komplett neue, im alten Cache nie vorhandene Datei vom alten Service Worker zwangsläufig aus dem echten Netzwerk geladen wird (Cache-Miss → Fallback auf `fetch`). Die Seite meldet den aktiven Service Worker ab, löscht alle Caches und leitet zurück zur App. Aufruf: `https://juliusziegler88-stack.github.io/fitness-app/app/reset.html`.

## Trainingsplan-Umbau: 4er-Split "Hybrid Athlete" (10.07.2026)

Alte A/B-Ganzkörper-Rotation komplett ersetzt durch festen Upper/Lower-x2-Split, weil Julius bei den A/B-Supersätzen weniger Muskelkater/Reiz spürte (kardiovaskuläre Ermüdung durch kurze Pausen bei Push+Pull direkt hintereinander) und Richtung "Hybrid Athlete" (Kraft + Laufen, kein Bodybuilding) wollte. Auf Recherche-Basis (Interferenz-Effekt bei getrenntem Kraft/Lauf-Tag vernachlässigbar, 2x/Woche-Frequenz pro Muskelgruppe optimal) neu aufgebaut.

**Fester Wochenplan** (`rotation.js`, keine Wochenalternation mehr):
- Mo: Unterkörper schwer (5–8 Wdh) — Di: Oberkörper schwer (5–8 Wdh) — Mi: Ruhetag
- Do: Unterkörper leicht (10–15 Wdh) — Fr: Oberkörper leicht (10–15 Wdh) — Sa: Laufen (Zone 2) — So: Ruhetag

**Datenmodell (`data.js`):** `plaene` hat jetzt 4 Keys (`unterkoerperSchwer`, `oberkoerperSchwer`, `unterkoerperLeicht`, `oberkoerperLeicht`) statt `A`/`B`. Grundübungen sind einzelne Straight-Set-Blöcke (volle Pause), nur die Arm-Isolation bleibt als Superset. Jeder Block hat jetzt ein `zielWdh`-Feld (Ziel-Wiederholungsbereich), das in `workout-session.js` sowohl in der Vorschau als auch in der aktiven Session angezeigt wird. `makroziele` hat `A`/`B` zu einem gemeinsamen `trainingstag`-Key konsolidiert (Werte waren identisch); `heute.js`/`ernaehrung.js` lesen den Key jetzt über `Rotation.getDatenKey()` statt direkt über `today.typ`.

**Progression:** Kein Auto-Tracking — wenn alle Sätze einer Übung am oberen Ende des `zielWdh`-Bereichs erreicht werden, Gewicht beim nächsten Mal um 2,5–5% steigern und unten im Bereich neu starten (Julius wendet das selbst an).

**Wochenziel in `fortschritt.js`** von 4 auf **5** Einheiten erhöht (4 Kraft + 1 Lauf).

Bei künftigen Anpassungen am Plan: Übungsauswahl/Reihenfolge in `data.js` unter `Data.plaene`, Wochentag-Zuordnung in `rotation.js` unter `Rotation.TAGE`.

## Workout-Picker Feature (07.07.2026)

Training-Tab zeigt jetzt einen tagesunabhängigen Workout-Picker (Ganzkörper A/B, Running) statt eines starr an die A/B-Rotation gebundenen Einzel-Workouts. Persistenter Timer + Übungs-Checkboxen (State in `localStorage`, übersteht Reload). Generische Offline-Warteschlange in `sheets.js` für alle drei Sheets. Details: `docs/specs/2026-07-07-workout-picker-design.md`, `docs/plans/2026-07-07-workout-picker.md`.

## Farb-Theme: "Warm Wellness" (07.07.2026)

Helles, warmes Theme statt des ursprünglichen Dark Mode — Creme-Hintergrund (`#FBF7F0`), Salbeigrün als Akzent (`#6B8F71`), warme Sekundärfarben (Senfgelb/Terrakotta/Rosé) für Makro-Ringe, Charts und Tages-Badges. Alle Farben hängen an den `:root`-Variablen in `app/styles.css`; `heute.js` (Ring-Farben) und `fortschritt.js` (Chart-Farben) tragen zusätzlich eigene Hex-Werte, die mit den Tokens synchron gehalten werden müssen. Details: `docs/specs/2026-07-07-warm-wellness-theme-design.md`, `docs/plans/2026-07-07-warm-wellness-theme.md`.

**Achtung beim lokalen Testen mit `python3 -m http.server`:** Der Server sendet keine Cache-Control-Header, wodurch Safari hartnäckig alte JS-Dateien aus dem Festplatten-Cache ziehen kann, selbst nach Reload/neuem Tab (unabhängig vom Service-Worker-Cache). Im Zweifel per `curl` direkt gegen den Server prüfen, ob die Datei wirklich aktuell ist, bevor man dem Browser misstraut.

**Korrektur (08.07.2026):** Der Service-Worker-Cache (`fitness-vX`, cache-first-Strategie in `app/sw.js`) kann genauso auf der Live-Seite (GitHub Pages) zuschlagen, nicht nur lokal — ein bereits besuchter Browser kann auch dort nach einem Deploy noch alten Code zeigen, selbst nach mehrfachem Reload. Verlässlichster Reset: Safari → Einstellungen → Websitedaten verwalten → Eintrag der Domain entfernen, dann neu laden.

## Weekday-Leiste im Training-Tab (07.07.2026)

Reihe von 7 Tages-Buttons (Mo–So der aktuellen Woche) oberhalb der Workout-Auswahl im Training-Tab. Klick zeigt den Rotationsstatus (Trainingstag A/B, Ausdauertag, Ruhetag) für diesen Tag als Badge — rein informativ, beeinflusst nicht, welches Workout startbar ist. `Rotation.getForDate(date)` (generalisiert aus `getToday()`) berechnet das für beliebige Tage. Details: `docs/specs/2026-07-07-weekday-strip-design.md`, `docs/plans/2026-07-07-weekday-strip.md`.

## Dauerhafter Login (09.07.2026)

Bisher verlor die App den Login-Zustand bei jedem Reload (Token nur im JS-Speicher), und Safaris Cookie-Blockade (ITP) ließ den stillen Google-Reauth fast nie durchgehen — ständiges Neu-Einloggen. Fix: neuer Cloudflare Worker (`worker/index.js`, deployed als `fitness-app-auth` unter `https://fitness-app-auth.juliusziegler88.workers.dev`, Cloudflare-Account: julius eigener) hält den Google-Client-Secret und bietet `/exchange` (einmaliger Code → Tokens) sowie `/refresh` (Refresh-Token → neues Access-Token). `app/js/auth.js` nutzt jetzt `initCodeClient` (statt `initTokenClient`) für den einmaligen Login und speichert `access_token` + `refresh_token` + `expires_at` in `localStorage` (`fitness_auth`); `sheets.js` ruft vor jedem API-Call `Auth.ensureValidToken()` auf, was still über den Worker erneuert, bevor überhaupt ein Login-Popup infrage kommt.

**Voraussetzung, die zusammen mit diesem Fix erledigt wurde:** Google-Cloud-Projekt "Fitness App v2" von "Testen" auf "In Produktion" umgestellt (OAuth-Zustimmungsbildschirm → Zielgruppe) — im Testen-Modus verfallen Refresh Tokens nach 7 Tagen, unabhängig vom Code. App bleibt unverifiziert (nur Sheets-Scope, ein Nutzer) — beim ersten Login nach dieser Umstellung erscheint einmalig eine "nicht verifiziert"-Warnung zum Wegklicken, keine Wiederholung danach.

**Neuer, alter Clientschlüssel:** Der ursprüngliche Client Secret war nicht mehr abrufbar (Google zeigt Secrets nach der Erstellung nicht mehr im Klartext); es wurde ein zweiter Clientschlüssel über "Clientschlüssel hinzufügen" erstellt, der jetzt aktiv genutzt wird. Der alte (maskiert `****vu3k`) bleibt parallel bestehen, ungenutzt.

**Deploy-Workflow für den Worker** (bei Codeänderungen in `worker/`):
```bash
cd worker
npx wrangler deploy
```
Der `GOOGLE_CLIENT_SECRET` ist als Wrangler-Secret hinterlegt (`wrangler secret put GOOGLE_CLIENT_SECRET`), nicht im Repo. Details: `docs/specs/2026-07-09-persistent-login-design.md`, `docs/plans/2026-07-09-persistent-login.md`.

**Bekannte Falle beim lokalen Testen mit `curl`:** Das alte macOS-System-`curl` (LibreSSL 3.3.6) kann keinen TLS-Handshake mit `*.workers.dev`-Adressen aufbauen (`SSL routines:ST_CONNECT:sslv3 alert handshake failure`), obwohl der Worker einwandfrei läuft. Über Safari/Browser oder mit einem moderneren curl/HTTP-Client prüfen, nicht dem System-`curl` misstrauen.

## Sonstige Aktivität (09.07.2026)

Neue Workout-Kategorie `typ: 'sonstiges'` (z.B. "Fußball") ohne Timer/Live-Session — Sportart wird frei eingetippt und landet in der bei Cardio ungenutzten "Übung"-Spalte von `Training_Log`. Erreichbar von zwei Stellen, beide nutzen dasselbe Formular `Nachtrag.renderForm(workout, defaultDate, onBack)`:
- **"Workout wählen"** (training.js, direkt): Standard-Datum heute, "Zurück" führt zurück zu `Training.render()`.
- **"Training nachtragen"** (nachtrag.js): Standard-Datum gestern, "Zurück" führt zu `Nachtrag.render()`.

`_renderHistory()` in training.js zeigt bei `sonstiges`-Einträgen die eingetippte Sportart statt des generischen Kategorienamens.

## Training nachtragen (08.07.2026)

Link "+ Training nachtragen" unter der Workout-Auswahl im Training-Tab öffnet ein eigenes, zustandsloses Formular (neues Modul `app/js/nachtrag.js`): Workout wählen → Datum frei wählbar (Standard: gestern) → bei Kraft-Workouts Gewicht/Sätze/Wdh pro Übung (ohne Timer, ohne Checkbox, ohne "Letztes Mal") → Speichern schreibt direkt in `Training_Log` mit dem gewählten statt dem heutigen Datum. Details: `docs/specs/2026-07-07-training-nachtragen-design.md`, `docs/plans/2026-07-07-training-nachtragen.md`.

## Schrittzähler aus Apple Health (09.07.2026, läuft noch — siehe "Status" unten)

Neues Modul `app/js/schritte.js`. Da eine Web-PWA keinen direkten HealthKit-Zugriff hat, läuft das über einen **Kurzbefehl-Bounce**: Beim App-Start (nur wenn als installierte iPhone-App, `navigator.standalone`) ruft `Schritte.syncOnStart()` per `shortcuts://run-shortcut?name=...` einen Kurzbefehl auf, der die heutige Schrittzahl aus Health liest.

**Name des Kurzbefehls:** `SchritteApp` (Konstante `Schritte.SHORTCUT_NAME` in `schritte.js`). Ursprünglich hieß er anders und wurde zweimal neu angelegt — Details dazu und zur ganzen Fehlersuche siehe Verlauf unten.

**Aktionen im Kurzbefehl (Stand jetzt):** "Health-Messungen suchen mit" (Typ Schritte, Startdatum ist heute) → "Statistik berechnen" (Summe) → "In Zwischenablage kopieren" (Eingabe: die Summe). Dazu kommt noch eine Alt-Aktion "Stoppen und Text ausgeben" aus einer früheren Testphase, die nicht mehr gebraucht wird, aber nicht stört — kann bei Gelegenheit aufgeräumt werden.

**kcal-Ziel-Anpassung** (`heute.js`, `_buildZiel()`): `kcal_ziel = Basis-Ziel(Tagestyp) + max(0, Schritte − 7000) × Gewicht(kg) × 0.0005`. Baseline 7.000 Schritte gilt als bereits in den bestehenden 2350/2300/2100-kcal-Zielen eingepreist. Gewicht wird aus dem zuletzt geloggten Wert im `Koerper`-Sheet geladen (`_loadGewicht()`), Platzhalter 75 kg bis ein Wert vorliegt. `this.basisZiel` wird in `render()` als Instanzfeld gehalten, damit `_buildZiel()` später (z.B. nach einem Update-Button-Klick) ohne erneuten Parameter neu rechnen kann. Neue Karte oben auf der Heute-Seite zeigt Schrittzahl + Fortschrittsbalken zu einem Ziel von 10.000 + einen "🔄 Aktualisieren"-Button.

### Fehlersuche — was schon ausprobiert und verworfen wurde

1. **`x-success`-Rücksprung (`shortcuts://x-callback-url/run-shortcut?...&x-success=...`):** Auf Julius' iPhone **nachweislich komplett kaputt** — bestätigt durch einen isolierten Test direkt in der Notizen-App (Link ohne unsere App dazwischen): Sobald `x-success` im Link vorkommt, bricht die Kurzbefehl-Ausführung selbst mit "Beim Ausführen ... ist ein Problem aufgetreten" ab, auch bei einem trivialen Ein-Aktionen-Testkurzbefehl ganz ohne Health-Zugriff. Ohne `x-success` läuft derselbe Kurzbefehl fehlerfrei. **Fazit: `x-success` in `schritte.js` nicht wiederverwenden, auch nicht für andere Features.**
2. **Deshalb umgestellt auf Zwischenablage:** Kurzbefehl kopiert die Schrittzahl rein (`In Zwischenablage kopieren`), `Schritte.tryClipboard()` liest sie über `navigator.clipboard.readText()`.
3. **Automatisches Lesen der Zwischenablage beim Zurückkommen (`visibilitychange`-Listener in `app.js`) schlägt zuverlässig fehl** mit `NotAllowedError` — Safari erlaubt `clipboard.readText()` nur direkt nach einem echten Nutzer-Tap, nicht aus einem automatischen Event heraus. Deshalb zusätzlich ein manueller **"🔄 Aktualisieren"-Button** auf der Schritte-Karte (`heute.js`), der beim Klick liest (der Tap selbst ist die nötige Nutzer-Geste). Der `visibilitychange`-Listener bleibt als stiller Bonusversuch bestehen (könnte nach einer einmaligen Erlaubnis auch automatisch klappen), Hauptmechanismus ist aber der Button.
4. **Verwirrung um Kurzbefehl-Umbenennung:** Ein zusammengeführter Kurzbefehl ließ sich partout nicht umbenennen (Name sprang nach "Fertig" immer auf den Auto-Titel zurück, vermutlich iOS-Anzeigebug) und scheiterte danach *nur* beim externen Aufruf über die App (manueller Play-Button-Test lief immer fehlerfrei) — Ursache vermutlich verwirrte interne Kennung durch das Zusammenführen zweier ursprünglich getrennter Kurzbefehle. Lösung: kompletter Neuaufbau als frischer Kurzbefehl `SchritteApp`, `SHORTCUT_NAME` entsprechend im Code mitgeführt.
5. **Debug-Vorgehen, das sich bewährt hat:** Bei jedem "geht nicht" zuerst mit einem minimalen Test-Kurzbefehl (nur `Text: 9999`, ohne Health) isoliert testen, ob das Problem am Health-Zugriff liegt oder allgemein an der Aufruf-Mechanik — und Links testweise direkt in der Notizen-App antippen, um Code als Fehlerquelle auszuschließen.

**Aktuell temporär im Code:** In `heute.js` (`_renderSchritte()`, Button-Handler) steht noch `alert('Debug Zwischenablage: ' + JSON.stringify(r));` — zeigt bei jedem Button-Klick den rohen Erfolg/Fehler der Zwischenablage-Lesung. **Muss entfernt werden**, sobald der Mechanismus bestätigt zuverlässig läuft.

## Status (Stand: 09.07.2026, Session unterbrochen wegen GitHub-Ausfall)

**Zuletzt gepushter Commit:** `81bab50` ("Debug: Grund des Zwischenablage-Fehlschlags beim Aktualisieren-Button anzeigen"), Cache-Version `fitness-v21`.

**Blocker beim Sessionende:** GitHub selbst hatte einen Ausfall (laut githubstatus.com eskalierend von "Minor Service Outage" zu "Partial System Outage"), wodurch das Pages-Deployment für diesen Commit in der Warteschlange feststeckte und trotz mehrfachen Nachprüfens (auch nach 15+ Minuten) nicht live ging. **Das ist kein Code-Problem** — beim nächsten Mal zuerst prüfen, ob `https://juliusziegler88-stack.github.io/fitness-app/app/js/heute.js` bereits den String `"Debug Zwischenablage"` enthält (`curl` + `grep`), und ob githubstatus.com wieder "All Systems Operational" zeigt.

**Nächste Schritte, sobald das Deployment durch ist:**
1. Julius testet: App öffnen (bounct automatisch zu Shortcuts und zurück, kein Fehler mehr erwartet) → auf der Heute-Seite den "🔄 Aktualisieren"-Button antippen → Debug-Alert zeigt entweder `{"ok":true,"text":"..."}` (Erfolg, Schrittzahl sollte dann angezeigt werden) oder `{"ok":false,...}` mit Fehlergrund.
2. Falls weiterhin `NotAllowedError` trotz direktem Button-Tap: eventuelle iOS-Einstellung zu "Einfügen aus anderen Apps zulassen" prüfen, oder ob der Kurzbefehl tatsächlich VOR dem Tap fertig gelaufen ist (Zwischenablage könnte noch leer/alt sein, wenn zu schnell getippt wird).
3. Falls Erfolg: Debug-Alert aus `heute.js` entfernen, `CACHE`-Version in `sw.js` hochzählen, committen/pushen.
4. Danach: Feature-Wunsch aus "Bekannte offene Punkte" oben (Bodyweight-Übungen ohne Gewichtsfeld) ist weiterhin offen und noch nicht angegangen.
