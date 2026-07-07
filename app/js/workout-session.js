window.WorkoutSession = {
  STORAGE_KEY: 'fitness_active_session',
  timerInterval: null,
  letzteSession: {},

  // --- Persistenz & Timer (reine Logik, aus Task 4 unverändert) ---

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
  },

  // --- Rendering (neu in dieser Task) ---

  async render(workout) {
    const el = document.getElementById('tab-training');
    const session = this.getSession();

    if (session && session.workoutId === workout.id) {
      if (workout.typ === 'kraft') await this._loadLetzteSession();
      this._renderActive(el, workout, session);
    } else {
      this._renderPreview(el, workout);
    }
  },

  async _loadLetzteSession() {
    if (!Auth.isSignedIn()) { this.letzteSession = {}; return; }
    try {
      const rows = await Sheets.getAll('Training_Log');
      this.letzteSession = {};
      rows.forEach(r => { this.letzteSession[r[2]] = { gewicht: r[3], saetze: r[4], reps: r[5] }; });
    } catch (e) { /* offline */ }
  },

  _renderPreview(el, workout) {
    const isKraft = workout.typ === 'kraft';
    el.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px">${workout.name}</h2>
        ${isKraft
          ? workout.plan.map(ss => `
              <div style="margin-bottom:14px">
                <div class="section-title">${ss.name}</div>
                ${ss.uebungen.map(u => `<div style="padding:4px 0;font-size:15px">· ${u}</div>`).join('')}
              </div>
            `).join('')
          : `<p style="color:var(--text-muted);line-height:1.6">${workout.text}</p>`
        }
      </div>
      <button class="btn btn-primary" id="btn-session-start">▶ Beginnen</button>
      <button class="btn btn-ghost" id="btn-session-back" style="margin-top:8px">Zurück</button>
    `;
    document.getElementById('btn-session-start').addEventListener('click', () => {
      this.start(workout.id);
      this.render(workout);
    });
    document.getElementById('btn-session-back').addEventListener('click', () => Training.render());
  },

  _renderActive(el, workout, session) {
    const isKraft = workout.typ === 'kraft';
    const alleUebungen = isKraft
      ? workout.plan.flatMap(ss => ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core'))
      : [];

    el.innerHTML = `
      <div class="card" style="text-align:center;padding:20px 16px">
        <div id="session-timer" style="font-size:32px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums">${this.formatElapsed(session.startedAt)}</div>
        <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${workout.name}</div>
      </div>
      ${isKraft
        ? workout.plan.map(ss => {
            const uebungen = ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core');
            if (!uebungen.length) {
              return `
                <div class="superset-group">
                  <div class="superset-label">Finisher</div>
                  ${ss.uebungen.map(u => `<div style="padding:4px 0;font-size:15px;color:var(--text-muted)">· ${u}</div>`).join('')}
                </div>
              `;
            }
            return `
              <div class="superset-group">
                <div class="superset-label">${ss.name}</div>
                ${uebungen.map(u => this._renderExerciseRow(u, session)).join('')}
              </div>
            `;
          }).join('')
        : `<div class="card"><p style="color:var(--text-muted);line-height:1.6">${workout.text}</p></div>`
      }
      <button class="btn btn-primary" id="btn-session-finish" style="margin-top:8px">${isKraft ? '✓ Abschließen' : '✓ Fertig'}</button>
      <button class="btn btn-ghost" id="btn-session-cancel" style="margin-top:8px">Abbrechen</button>
    `;

    if (isKraft) {
      alleUebungen.forEach(u => {
        const id = u.replace(/\s/g, '_');
        const checkEl = document.getElementById(`check_${id}`);
        checkEl?.addEventListener('click', () => {
          this.toggleChecked(session, u);
          const done = !!session.checked[u];
          checkEl.classList.toggle('done', done);
          checkEl.nextElementSibling?.classList.toggle('done', done);
        });
      });
    }

    document.getElementById('btn-session-finish').addEventListener('click', () => this._finish(workout, session, alleUebungen));
    document.getElementById('btn-session-cancel').addEventListener('click', () => {
      clearInterval(this.timerInterval);
      this.clearSession();
      Training.render();
    });

    this._startTimer(session.startedAt);
  },

  _renderExerciseRow(uebung, session) {
    const prev = this.letzteSession[uebung];
    const prevText = prev ? `Letztes Mal: ${prev.gewicht} kg × ${prev.saetze} Sätze × ${prev.reps} Wdh` : 'Erstes Mal';
    const id = uebung.replace(/\s/g, '_');
    const done = !!session.checked[uebung];
    return `
      <div class="exercise-row">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div class="meal-check ${done ? 'done' : ''}" id="check_${id}"></div>
          <div class="exercise-name ${done ? 'done' : ''}" style="margin-bottom:0">${uebung}</div>
        </div>
        <div class="exercise-prev">${prevText}</div>
        <div class="log-inputs">
          <div>
            <div class="log-input-label">Gewicht (kg)</div>
            <input type="number" id="kg_${id}" placeholder="${prev?.gewicht || '0'}" min="0" step="2.5">
          </div>
          <div>
            <div class="log-input-label">Sätze</div>
            <input type="number" id="saetze_${id}" placeholder="${prev?.saetze || '3'}" min="1" max="10">
          </div>
          <div>
            <div class="log-input-label">Wdh</div>
            <input type="number" id="reps_${id}" placeholder="${prev?.reps || '8'}" min="1" max="30">
          </div>
        </div>
      </div>
    `;
  },

  _startTimer(startedAt) {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const el = document.getElementById('session-timer');
      if (!el) { clearInterval(this.timerInterval); return; }
      el.textContent = this.formatElapsed(startedAt);
    }, 1000);
  },

  async _finish(workout, session, alleUebungen) {
    clearInterval(this.timerInterval);
    const datum = new Date().toLocaleDateString('de-DE');

    const rows = workout.typ === 'kraft'
      ? alleUebungen.map(u => {
          const id = u.replace(/\s/g, '_');
          const kg = document.getElementById(`kg_${id}`)?.value || '0';
          const saetze = document.getElementById(`saetze_${id}`)?.value || '0';
          const reps = document.getElementById(`reps_${id}`)?.value || '0';
          return [datum, workout.id, u, kg, saetze, reps];
        })
      : [[datum, workout.id, '', '', '', '']];

    let offline = false;
    for (const row of rows) {
      try { await Sheets.appendSafe('Training_Log', row); }
      catch (e) { offline = true; }
    }

    App.showToast(offline ? 'Offline – wird automatisch nachgesendet ✓' : 'Einheit gespeichert ✓');
    this.clearSession();
    Training.render();
  }
};
