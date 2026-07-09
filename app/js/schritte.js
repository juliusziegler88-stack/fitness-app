window.Schritte = {
  STORAGE_KEY: 'fitness_schritte',
  // Muss exakt so heißen wie der Kurzbefehl in der Shortcuts-App auf dem iPhone.
  SHORTCUT_NAME: 'SchritteApp',
  BASELINE: 7000,
  ZIEL: 10000,

  // Übernimmt den Rückgabewert des Kurzbefehls aus der URL (?result=1234), falls vorhanden,
  // und räumt den Parameter wieder aus der URL. Gibt true zurück, wenn gerade übernommen wurde.
  captureFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('result')) return false;
    const n = parseInt(params.get('result'), 10);
    if (!isNaN(n)) this._save(n);
    params.delete('result');
    const query = params.toString();
    const clean = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
    window.history.replaceState({}, '', clean);
    return true;
  },

  _save(steps) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      datum: new Date().toLocaleDateString('de-DE'),
      steps
    }));
  },

  // Heutige Schrittzahl, oder null falls noch keine (aktuelle) vorhanden ist.
  getToday() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
      if (!raw) return null;
      return raw.datum === new Date().toLocaleDateString('de-DE') ? raw.steps : null;
    } catch (e) {
      return null;
    }
  },

  // Springt zur Shortcuts-App, die die aktuelle Schrittzahl aus Health liest und per
  // x-callback-url zurück in die App springt (?result=<Schrittzahl> wird von iOS angehängt).
  requestUpdate() {
    const successUrl = window.location.origin + window.location.pathname;
    window.location.href =
      `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(this.SHORTCUT_NAME)}` +
      `&x-success=${encodeURIComponent(successUrl)}`;
  },

  // Beim App-Start aufrufen: übernimmt einen Rückgabewert, falls die App gerade aus dem
  // Kurzbefehl zurückkommt. Sonst löst sie (nur als installierte iPhone-App) den nächsten
  // Bounce zu Shortcuts aus, damit die Schrittzahl bei jedem Start aktuell ist.
  syncOnStart() {
    const kamGeradeZurueck = this.captureFromUrl();
    if (!kamGeradeZurueck && window.navigator.standalone) {
      this.requestUpdate();
    }
  },

  // kcal-Bonus für Schritte über der Baseline, skaliert mit Körpergewicht (~0,0005 kcal/kg/Schritt).
  kcalBonus(steps, gewichtKg) {
    if (steps === null) return 0;
    const extra = Math.max(0, steps - this.BASELINE);
    return Math.round(extra * gewichtKg * 0.0005);
  }
};
