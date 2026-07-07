window.WorkoutSession = {
  STORAGE_KEY: 'fitness_active_session',
  timerInterval: null,
  letzteSession: {},

  // --- Persistenz & Timer (reine Logik) ---

  getSession() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveSessionState(session) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  start(workoutId) {
    const session = { workoutId, startedAt: Date.now(), checked: {} };
    this.saveSessionState(session);
    return session;
  },

  toggleChecked(session, uebungName) {
    session.checked[uebungName] = !session.checked[uebungName];
    this.saveSessionState(session);
    return session;
  },

  formatElapsed(startedAt, now = Date.now()) {
    const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
};
