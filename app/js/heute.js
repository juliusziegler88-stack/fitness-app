window.Heute = {
  today: null,
  ziel: null,
  schritte: null,
  gewicht: 75, // Platzhalter, bis ein Wert aus dem Koerper-Sheet geladen ist
  gegessen: { kcal: 0, protein: 0, carbs: 0, fett: 0 },

  async render() {
    this.today = Rotation.getToday();
    this.basisZiel = Data.makroziele[Rotation.getDatenKey(this.today.typ)] || Data.makroziele['ruhetag'];
    this.schritte = Schritte.getToday();
    this.ziel = this._buildZiel();

    const mahlzeiten = ['Frühstück', 'Mittagessen', 'After Workout', 'Abendessen'];
    // Ausdauer/Ruhetag: kein After Workout
    const anzeigeM = (this.today.typ === 'ruhetag' || this.today.typ === 'ausdauer')
      ? mahlzeiten.filter(m => m !== 'After Workout')
      : mahlzeiten;

    const datumStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('tab-heute').innerHTML = `
      <h1 style="font-size:20px;font-weight:700;margin-bottom:4px">${datumStr}</h1>
      <span class="day-badge ${this.today.badgeClass}">${this.today.label}</span>

      <div class="card" id="schritte-card"></div>

      <div class="card">
        <div class="macro-rings" id="macro-rings"></div>
        <div id="macro-bars"></div>
      </div>

      <div class="card">
        <div class="section-title">Mahlzeiten heute</div>
        ${anzeigeM.map(m => `
          <div class="meal-item" data-meal="${m}" id="meal-${m.replace(/\s/g,'')}">
            <div class="meal-check" id="check-${m.replace(/\s/g,'')}"></div>
            <div>
              <div class="meal-name">${m}</div>
              <div style="font-size:12px;color:var(--text-muted)">Tippen für Rezepte</div>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="btn btn-primary" id="btn-training-heute" style="margin-bottom:12px">
        💪 Zum Training
      </button>
    `;

    this._renderSchritte();
    this._renderRings();
    this._renderBars();
    this._bindEvents(anzeigeM);
    await this._loadGegessen();
    await this._loadGewicht();
  },

  _buildZiel() {
    const bonus = Schritte.kcalBonus(this.schritte, this.gewicht);
    return { ...this.basisZiel, kcal: this.basisZiel.kcal + bonus };
  },

  _renderSchritte() {
    const el = document.getElementById('schritte-card');
    if (!el) return;
    const s = this.schritte;
    const pct = s === null ? 0 : Math.min(100, Math.round((s / Schritte.ZIEL) * 100));
    el.innerHTML = `
      <div class="section-title">Schritte heute</div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">
        <span style="font-size:28px;font-weight:700">${s === null ? '–' : s.toLocaleString('de-DE')}</span>
        <span style="font-size:13px;color:var(--text-muted)">/ ${Schritte.ZIEL.toLocaleString('de-DE')}</span>
      </div>
      <div class="macro-bar-track"><div class="macro-bar-fill" style="width:${pct}%"></div></div>
      <button class="btn btn-ghost" id="btn-schritte-update" style="margin-top:10px;width:100%">🔄 Aktualisieren</button>
    `;
    document.getElementById('btn-schritte-update')?.addEventListener('click', async () => {
      const r = await Schritte.tryClipboard();
      alert('Debug Zwischenablage: ' + JSON.stringify(r)); // TEMPORÄR
      if (r.ok) {
        this.schritte = Schritte.getToday();
        this.ziel = this._buildZiel();
        this._renderSchritte();
        this._renderRings();
        this._renderBars();
        App.showToast(`Schritte aktualisiert: ${this.schritte}`);
      } else {
        App.showToast('Zwischenablage nicht lesbar — Kurzbefehl gerade ausgeführt?');
      }
    });
  },

  _renderRings() {
    const items = [
      { key: 'kcal',    label: 'kcal',    color: '#6B8F71' },
      { key: 'protein', label: 'Protein', color: '#C9963F' },
      { key: 'carbs',   label: 'Carbs',   color: '#B5652F' },
      { key: 'fett',    label: 'Fett',    color: '#A56B7A' }
    ];
    const C = 2 * Math.PI * 26; // circumference für r=26

    document.getElementById('macro-rings').innerHTML = items.map(({ key, label, color }) => {
      const pct = Math.min(1, (this.gegessen[key] || 0) / this.ziel[key]);
      const offset = C * (1 - pct);
      return `
        <div class="macro-ring">
          <svg class="ring-svg" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" r="26"/>
            <circle class="ring-fill" cx="32" cy="32" r="26"
              stroke="${color}"
              stroke-dasharray="${C}"
              stroke-dashoffset="${offset}"
              style="transition:stroke-dashoffset 0.5s ease"/>
          </svg>
          <div class="ring-value" style="color:${color}">${this.gegessen[key] || 0}</div>
          <div class="ring-label">${label}</div>
        </div>
      `;
    }).join('');
  },

  _renderBars() {
    const items = [
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs',   label: 'Carbs',   unit: 'g' },
      { key: 'fett',    label: 'Fett',    unit: 'g' }
    ];
    document.getElementById('macro-bars').innerHTML = items.map(({ key, label, unit }) => {
      const pct = Math.min(100, Math.round(((this.gegessen[key] || 0) / this.ziel[key]) * 100));
      return `
        <div class="macro-bar-row">
          <div class="macro-bar-label">${label}</div>
          <div class="macro-bar-track">
            <div class="macro-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="macro-bar-num">${this.gegessen[key] || 0}/${this.ziel[key]}${unit}</div>
        </div>
      `;
    }).join('');
  },

  _bindEvents(mahlzeiten) {
    mahlzeiten.forEach(m => {
      document.getElementById(`meal-${m.replace(/\s/g,'')}`)?.addEventListener('click', () => {
        App.showTab('ernaehrung');
        setTimeout(() => {
          if (window.Ernaehrung) Ernaehrung.setMahlzeit(m);
        }, 50);
      });
    });
    document.getElementById('btn-training-heute')?.addEventListener('click', () => App.showTab('training'));
  },

  async _loadGegessen() {
    if (!Auth.isSignedIn()) return;
    try {
      const rows = await Sheets.getAll('Ernaehrungs_Log');
      const heute = new Date().toLocaleDateString('de-DE');
      this.gegessen = { kcal: 0, protein: 0, carbs: 0, fett: 0 };
      rows.filter(r => r[0] === heute).forEach(r => {
        this.gegessen.kcal    += parseFloat(r[3]) || 0;
        this.gegessen.protein += parseFloat(r[4]) || 0;
        this.gegessen.carbs   += parseFloat(r[5]) || 0;
        this.gegessen.fett    += parseFloat(r[6]) || 0;
      });

      // Mark logged meals as done
      const loggedMeals = rows
        .filter(r => r[0] === heute)
        .map(r => r[1]); // column 1 = Mahlzeit name

      loggedMeals.forEach(mahlzeit => {
        const id = mahlzeit.replace(/\s/g, '');
        const check = document.getElementById(`check-${id}`);
        const nameEl = document.querySelector(`#meal-${id} .meal-name`);
        if (check) check.classList.add('done');
        if (nameEl) nameEl.classList.add('done');
      });

      this._renderRings();
      this._renderBars();
    } catch (e) {
      console.warn('Makros konnten nicht geladen werden:', e);
    }
  },

  async _loadGewicht() {
    if (!Auth.isSignedIn()) return;
    try {
      const rows = await Sheets.getAll('Koerper');
      const letzte = [...rows].reverse().find(r => r[1]);
      if (!letzte) return;
      this.gewicht = parseFloat(letzte[1]) || this.gewicht;
      this.ziel = this._buildZiel();
      this._renderRings();
      this._renderBars();
    } catch (e) {
      console.warn('Gewicht konnte nicht geladen werden:', e);
    }
  }
};
