window.Fortschritt = {
  gewichtChart: null,
  kraftChart: null,

  async render() {
    const el = document.getElementById('tab-fortschritt');
    if (!el) return;

    if (typeof Chart === 'undefined') {
      el.innerHTML += '<p style="color:var(--text-muted);font-size:13px">Charts laden...</p>';
      setTimeout(() => this.render(), 500);
      return;
    }

    document.getElementById('tab-fortschritt').innerHTML = `
      <div class="card">
        <div class="section-title">Körpergewicht</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input type="number" id="input-gewicht" placeholder="z.B. 71.5" step="0.1" min="40" max="200" style="flex:1">
          <button class="btn btn-primary" id="btn-gewicht" style="width:auto;padding:10px 16px">Eintragen</button>
        </div>
        <div class="chart-container">
          <canvas id="chart-gewicht"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Trainingsgewicht</div>
        <select id="uebung-select" style="background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:15px;padding:10px 12px;width:100%;margin-bottom:12px">
          ${this._getAlleUebungen().map(u => `<option value="${u}">${u}</option>`).join('')}
        </select>
        <div class="chart-container">
          <canvas id="chart-kraft"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Diese Woche</div>
        <div id="woche-container"></div>
      </div>

      <div class="card">
        <div class="streak-display">
          <div class="streak-number" id="streak-zahl">—</div>
          <div class="streak-label">Wochen in Folge trainiert</div>
        </div>
      </div>
    `;

    document.getElementById('btn-gewicht').addEventListener('click', () => this._saveGewicht());
    document.getElementById('uebung-select').addEventListener('change', async () => {
      const rows = await Sheets.getAll('Training_Log');
      this._renderKraftChart(rows);
    });

    if (!Auth.isSignedIn()) {
      try { await Auth.signIn(); } catch (e) { return; }
    }

    await this._loadAll();
  },

  async _loadAll() {
    try {
      const [gwRows, trainRows] = await Promise.all([
        Sheets.getAll('Koerper'),
        Sheets.getAll('Training_Log')
      ]);
      this._renderGewichtChart(gwRows);
      this._renderKraftChart(trainRows);
      this._renderWoche(trainRows);
      this._renderStreak(trainRows);
    } catch (e) {
      console.warn('Fortschritt konnte nicht geladen werden:', e);
    }
  },

  async _saveGewicht() {
    const val = document.getElementById('input-gewicht').value;
    if (!val) return;
    const datum = new Date().toLocaleDateString('de-DE');
    try {
      await Sheets.appendSafe('Koerper', [datum, val]);
      App.showToast('Gewicht gespeichert ✓');
    } catch (e) {
      App.showToast('Offline – wird automatisch nachgesendet ✓');
    }
    document.getElementById('input-gewicht').value = '';
    const rows = await Sheets.getAll('Koerper');
    this._renderGewichtChart(rows);
  },

  _renderGewichtChart(rows) {
    const canvas = document.getElementById('chart-gewicht');
    if (!canvas) return;
    if (this.gewichtChart) this.gewichtChart.destroy();

    const labels = rows.map(r => r[0]);
    const data   = rows.map(r => parseFloat(r[1]));

    this.gewichtChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Gewicht (kg)',
          data,
          borderColor: '#6B8F71',
          backgroundColor: 'rgba(107,143,113,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#6B8F71'
        }]
      },
      options: this._chartOptions('kg')
    });
  },

  _renderKraftChart(rows) {
    const canvas = document.getElementById('chart-kraft');
    const select = document.getElementById('uebung-select');
    if (!canvas || !select) return;
    if (this.kraftChart) this.kraftChart.destroy();

    const uebung = select.value;
    const filtered = rows.filter(r => r[2] === uebung);
    const labels = filtered.map(r => r[0]);
    const data   = filtered.map(r => parseFloat(r[3]));

    this.kraftChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${uebung} (kg)`,
          data,
          borderColor: '#C9963F',
          backgroundColor: 'rgba(201,150,63,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#C9963F'
        }]
      },
      options: this._chartOptions('kg')
    });
  },

  _renderWoche(rows) {
    const el = document.getElementById('woche-container');
    if (!el) return;
    const heute = new Date();
    const startWoche = new Date(heute);
    startWoche.setDate(heute.getDate() - heute.getDay() + 1); // Montag

    const dieseWoche = new Set(
      rows
        .filter(r => {
          const [d, m, y] = r[0].split('.');
          const d2 = new Date(+y, +m - 1, +d);
          return d2 >= startWoche && d2 <= heute;
        })
        .map(r => r[0])
    ).size;

    const ziel = 5;
    el.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
        <span style="font-size:36px;font-weight:700;color:var(--accent)">${dieseWoche}</span>
        <span style="color:var(--text-muted)">von ${ziel} Einheiten</span>
      </div>
      <div class="macro-bar-track" style="height:10px">
        <div class="macro-bar-fill" style="width:${Math.min(100, (dieseWoche / ziel) * 100)}%"></div>
      </div>
    `;
  },

  _renderStreak(rows) {
    const tage = [...new Set(rows.map(r => r[0]))]
      .sort((a, b) => {
        const toComparable = s => s.split('.').reverse().join('');
        return toComparable(a) < toComparable(b) ? -1 : 1;
      })
      .reverse();
    let streak = 0;
    let prevWeek = null;

    tage.forEach(d => {
      const [day, m, y] = d.split('.');
      const date = new Date(+y, +m - 1, +day);
      const kw = this._getKW(date);
      if (prevWeek === null || kw === prevWeek - 1) {
        streak++;
        prevWeek = kw;
      }
    });

    const el = document.getElementById('streak-zahl');
    if (el) el.textContent = streak;
  },

  _getKW(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  _getAlleUebungen() {
    return [
      ...Data.plaene.unterkoerperSchwer.flatMap(ss => ss.uebungen),
      ...Data.plaene.oberkoerperSchwer.flatMap(ss => ss.uebungen),
      ...Data.plaene.unterkoerperLeicht.flatMap(ss => ss.uebungen),
      ...Data.plaene.oberkoerperLeicht.flatMap(ss => ss.uebungen)
    ].filter((u, i, a) => a.indexOf(u) === i);
  },

  _chartOptions(unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8A8175', maxTicksLimit: 6 }, grid: { color: '#F0E7D8' } },
        y: { ticks: { color: '#8A8175', callback: v => `${v} ${unit}` }, grid: { color: '#F0E7D8' } }
      }
    };
  }
};
