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
- **Google Cloud Projekt:** intern "fitness-app" genannt, tatsächliche Projekt-ID kann abweichen (Anzeigename ≠ ID) — im Zweifel über den Projekt-Umschalter in der Cloud Console nach "fitness" suchen, nicht die ID raten
- **Google OAuth Client ID:** `300859094998-fv26s5mescenvkk2udfmi2h6abioc2nt.apps.googleusercontent.com`
- **Autorisierte JS-Origins für OAuth:** Live-URL + `http://localhost:8080` (für lokales Testen ergänzt am 07.07.2026)

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

## Bekannte offene Punkte (Stand 07.07.2026)

- **Google Sheets API gibt 403 PERMISSION_DENIED zurück**, obwohl: Konto korrekt, Scope korrekt (`.../auth/spreadsheets`), Token gültig, Sheets API in Cloud Console aktiviert. Wirkt nach einer tieferliegenden Altlast in der OAuth-Zustimmungsbildschirm-Konfiguration (zeigte einen unkonfigurierten "Erste Schritte"-Button statt der Scope-Liste). Noch nicht gelöst — vermutlich hilft ein komplettes Neuanlegen der OAuth-Anmeldedaten. Betrifft alle drei Sheets (Training_Log, Ernaehrungs_Log, Koerper), nicht nur den neuen Workout-Picker.
- **Feature-Wunsch:** Bodyweight-Übungen (z.B. Klimmzüge) sollten kein Gewicht-Eingabefeld zeigen, nur Wiederholungen — aktuell zeigt jede Kraft-Übung Gewicht/Sätze/Wdh einheitlich.
- **Feature-Wunsch:** Möglichkeit, ein Training nachträglich mit einem anderen (vergangenen) Datum zu speichern, statt immer mit dem heutigen Datum — für den Fall, dass man das Eintragen vergisst.

## Workout-Picker Feature (07.07.2026)

Training-Tab zeigt jetzt einen tagesunabhängigen Workout-Picker (Ganzkörper A/B, Running) statt eines starr an die A/B-Rotation gebundenen Einzel-Workouts. Persistenter Timer + Übungs-Checkboxen (State in `localStorage`, übersteht Reload). Generische Offline-Warteschlange in `sheets.js` für alle drei Sheets. Details: `docs/specs/2026-07-07-workout-picker-design.md`, `docs/plans/2026-07-07-workout-picker.md`.

## Farb-Theme: "Warm Wellness" (07.07.2026)

Helles, warmes Theme statt des ursprünglichen Dark Mode — Creme-Hintergrund (`#FBF7F0`), Salbeigrün als Akzent (`#6B8F71`), warme Sekundärfarben (Senfgelb/Terrakotta/Rosé) für Makro-Ringe, Charts und Tages-Badges. Alle Farben hängen an den `:root`-Variablen in `app/styles.css`; `heute.js` (Ring-Farben) und `fortschritt.js` (Chart-Farben) tragen zusätzlich eigene Hex-Werte, die mit den Tokens synchron gehalten werden müssen. Details: `docs/specs/2026-07-07-warm-wellness-theme-design.md`, `docs/plans/2026-07-07-warm-wellness-theme.md`.

**Achtung beim lokalen Testen mit `python3 -m http.server`:** Der Server sendet keine Cache-Control-Header, wodurch Safari hartnäckig alte JS-Dateien aus dem Festplatten-Cache ziehen kann, selbst nach Reload/neuem Tab (unabhängig vom Service-Worker-Cache). Im Zweifel per `curl` direkt gegen den Server prüfen, ob die Datei wirklich aktuell ist, bevor man dem Browser misstraut — auf der echten Live-Seite (GitHub Pages) tritt das nicht auf.
