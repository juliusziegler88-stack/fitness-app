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
      `/values/${encodeURIComponent(sheet)}:append?valueInputOption=USER_ENTERED`,
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
