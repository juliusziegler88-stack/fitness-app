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
    if (!Auth.isSignedIn()) return; // kein ungefragtes Login-Popup beim Start/online-Event
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
