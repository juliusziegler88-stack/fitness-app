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
