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
    // TEMPORÄR zum Debuggen des Schritte-Kurzbefehl-Bounce — wieder entfernen, sobald geklärt.
    if (window.location.search) alert('Debug URL-Parameter: ' + window.location.search);

    // Schrittzahl vom Kurzbefehl übernehmen (falls gerade zurückgesprungen), sonst
    // auf dem iPhone den nächsten Bounce zu Shortcuts auslösen.
    Schritte.syncOnStart();

    // Service Worker registrieren, Update-Check aktiv erzwingen statt auf Safaris
    // eigenen (unzuverlässigen) Hintergrund-Zeitplan zu warten. Sobald eine neue
    // Version die Kontrolle übernimmt, Seite automatisch neu laden.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => reg.update());
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
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

    // TEMPORÄR zum Debuggen: Beim Zurückkommen aus dem Hintergrund (z.B. nach dem
    // Shortcuts-Bounce) prüfen, ob die URL inzwischen einen Rückgabewert enthält —
    // nötig, weil iOS die Seite dabei offenbar nicht neu lädt (kein DOMContentLoaded).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      alert('Debug (sichtbar geworden): ' + window.location.href);
      const kamGeradeZurueck = Schritte.captureFromUrl();
      if (kamGeradeZurueck && this.currentTab === 'heute') window.Heute?.render();
    });

    // Auto-Login versuchen, dann initialer Tab
    Auth.autoSignIn().finally(() => {
      Sheets.flushPending();
      this.showTab('heute');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
