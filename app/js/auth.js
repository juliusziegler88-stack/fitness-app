window.Auth = {
  token: null,

  async autoSignIn() {
    return new Promise((resolve) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: Config.CLIENT_ID,
        scope: Config.SCOPES,
        prompt: '',
        callback: (resp) => {
          if (resp.error || !resp.access_token) return resolve(false);
          this.token = resp.access_token;
          resolve(true);
        }
      });
      client.requestAccessToken({ prompt: '' });
    });
  },

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
