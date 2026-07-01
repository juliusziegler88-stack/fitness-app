window.Training = {
  today: null,
  logMode: false,
  letzteSession: {},

  async render() {
    this.today = Rotation.getToday();
    await this._loadLetzteSession();

    const el = document.getElementById('tab-training');

    if (this.today.typ === 'ruhetag') {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:32px">
          <div style="font-size:40px;margin-bottom:12px">😴</div>
          <div style="font-size:18px;font-weight:600">Ruhetag</div>
          <div style="color:var(--text-muted);margin-top:8px">Erhol dich gut. Morgen wieder.</div>
        </div>
      `;
      return;
    }

    if (this.today.typ === 'ausdauer') {
      el.innerHTML = `
        <div class="card">
          <span class="day-badge badge-ausdauer">Ausdauertag</span>
          <h2 style="margin:12px 0 8px">Cardio — Samstag</h2>
          <p style="color:var(--text-muted);line-height:1.6">
            Mindestens 30–45 min kontinuierliche Ausdauer:<br>
            Laufen, Fahrrad, Rudergerät oder Schwimmen.<br><br>
            Intensität: moderate Herzfrequenz (Zone 2), du kannst noch sprechen.
          </p>
        </div>
      `;
      return;
    }

    const plan = Data.plaene[this.today.typ];
    const alleUebungen = plan.flatMap(ss => ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core'));

    el.innerHTML = `
      <span class="day-badge badge-training">Ganzkörper ${this.today.typ}</span>

      ${!this.logMode ? `
        <div class="card">
          ${plan.map(ss => `
            <div style="margin-bottom:14px">
              <div class="section-title">${ss.name}</div>
              ${ss.uebungen.map(u => `<div style="padding:4px 0;font-size:15px">· ${u}</div>`).join('')}
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary" id="btn-start-log">▶ Einheit starten</button>
      ` : `
        <div id="log-container">
          ${plan.map((ss, i) => {
            const uebungen = ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core');
            if (!uebungen.length) return '';
            return `
              <div class="superset-group">
                <div class="superset-label">Superset ${i + 1} · ${ss.saetze} Sätze</div>
                ${uebungen.map(u => this._renderExerciseRow(u)).join('')}
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-primary" id="btn-save-log" style="margin-top:8px">✓ Einheit abschließen</button>
        <button class="btn btn-ghost" id="btn-cancel-log" style="margin-top:8px">Abbrechen</button>
      `}

      <div class="section-title" style="margin-top:20px">Letzte Einheiten</div>
      <div id="history-container"></div>
    `;

    if (!this.logMode) {
      document.getElementById('btn-start-log').addEventListener('click', () => {
        this.logMode = true;
        this.render();
      });
    } else {
      document.getElementById('btn-save-log').addEventListener('click', () => this._saveLog(alleUebungen));
      document.getElementById('btn-cancel-log').addEventListener('click', () => {
        this.logMode = false;
        this.render();
      });
    }

    this._renderHistory();
  },

  _renderExerciseRow(uebung) {
    const prev = this.letzteSession[uebung];
    const prevText = prev ? `Letztes Mal: ${prev.gewicht} kg × ${prev.saetze} Sätze × ${prev.reps} Wdh` : 'Erstes Mal';
    const id = uebung.replace(/\s/g, '_');
    return `
      <div class="exercise-row">
        <div class="exercise-name">${uebung}</div>
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

  async _saveLog(uebungen) {
    const datum = new Date().toLocaleDateString('de-DE');
    const einheit = this.today.typ;
    const rows = [];

    uebungen.forEach(u => {
      const id = u.replace(/\s/g, '_');
      const kg = document.getElementById(`kg_${id}`)?.value || '0';
      const saetze = document.getElementById(`saetze_${id}`)?.value || '0';
      const reps = document.getElementById(`reps_${id}`)?.value || '0';
      rows.push([datum, einheit, u, kg, saetze, reps]);
    });

    try {
      for (const row of rows) await Sheets.append('Training_Log', row);
      App.showToast('Einheit gespeichert ✓');
    } catch (e) {
      App.showToast('Offline – bitte später synchronisieren');
    }

    this.logMode = false;
    this.render();
  },

  async _loadLetzteSession() {
    if (!Auth.isSignedIn()) return;
    try {
      const rows = await Sheets.getAll('Training_Log');
      this.letzteSession = {};
      rows.forEach(r => {
        this.letzteSession[r[2]] = { gewicht: r[3], saetze: r[4], reps: r[5] };
      });
    } catch (e) { /* offline */ }
  },

  async _renderHistory() {
    const el = document.getElementById('history-container');
    if (!el) return;
    if (!Auth.isSignedIn()) { el.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Anmelden um History zu sehen</p>'; return; }
    try {
      const rows = await Sheets.getAll('Training_Log');
      const tage = [...new Set(rows.map(r => r[0]))].reverse().slice(0, 5);
      el.innerHTML = tage.map(d => {
        const einheit = rows.find(r => r[0] === d)?.[1] || '';
        return `
          <div class="card" style="padding:12px;margin-bottom:8px">
            <span style="font-weight:600">${d}</span>
            <span class="day-badge badge-training" style="margin-left:8px;font-size:11px">Plan ${einheit}</span>
          </div>
        `;
      }).join('') || '<p style="color:var(--text-muted);font-size:14px">Noch keine Einheiten eingetragen</p>';
    } catch (e) { el.innerHTML = ''; }
  }
};
