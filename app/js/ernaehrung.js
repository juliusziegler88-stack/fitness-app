window.Ernaehrung = {
  aktiveMahlzeit: 'Frühstück',
  today: null,
  datenKey: null,
  gegessen: { kcal: 0, protein: 0, carbs: 0, fett: 0 },
  ziel: null,

  async render() {
    this.today = Rotation.getToday();
    this.datenKey = Rotation.getDatenKey(this.today.typ);
    this.ziel = Data.makroziele[this.today.typ] || Data.makroziele['ruhetag'];
    await this._loadGegessen();

    const mahlzeiten = ['Frühstück', 'Mittagessen', 'After Workout', 'Abendessen'];
    const anzeigeM = (this.today.typ === 'ruhetag' || this.today.typ === 'ausdauer')
      ? mahlzeiten.filter(m => m !== 'After Workout')
      : mahlzeiten;

    // Aktive Mahlzeit validieren
    if (!anzeigeM.includes(this.aktiveMahlzeit)) this.aktiveMahlzeit = anzeigeM[0];

    document.getElementById('tab-ernaehrung').innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div id="macro-bars-e"></div>
      </div>

      <div class="chip-row">
        ${anzeigeM.map(m => `
          <div class="chip ${m === this.aktiveMahlzeit ? 'active' : ''}" data-meal="${m}">${m}</div>
        `).join('')}
      </div>

      <div id="rezepte-container"></div>
    `;

    this._renderBars();
    this._renderRezepte();

    document.querySelectorAll('.chip[data-meal]').forEach(chip => {
      chip.addEventListener('click', () => this.setMahlzeit(chip.dataset.meal));
    });
  },

  setMahlzeit(name) {
    this.aktiveMahlzeit = name;
    this.render();
  },

  _renderBars() {
    const items = [
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs',   label: 'Carbs',   unit: 'g' },
      { key: 'fett',    label: 'Fett',    unit: 'g' },
      { key: 'kcal',    label: 'kcal',    unit: '' }
    ];
    document.getElementById('macro-bars-e').innerHTML = items.map(({ key, label, unit }) => {
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

  _renderRezepte() {
    const mahlzeitKey = {
      'Frühstück': 'fruehstueck',
      'Mittagessen': 'mittagessen',
      'After Workout': 'afterWorkout',
      'Abendessen': 'abendessen'
    }[this.aktiveMahlzeit];

    const rezepte = Data.rezepte[this.datenKey]?.[mahlzeitKey] || [];
    const container = document.getElementById('rezepte-container');

    container.innerHTML = rezepte.map((r, i) => `
      <div class="recipe-card">
        <div class="recipe-header" data-idx="${i}">
          <div>
            <div class="recipe-title">${r.name}</div>
            <div class="recipe-macros">${r.makros}</div>
          </div>
          <div style="color:var(--text-muted);font-size:20px" id="arrow-${i}">›</div>
        </div>
        <div class="recipe-body" id="body-${i}">
          <p><strong>Zutaten:</strong> ${r.zutaten}</p>
          <p><strong>Zubereitung:</strong> ${r.zubereitung}</p>
          <button class="btn btn-primary" style="margin-top:8px" data-rezept="${i}">
            ✓ Gegessen
          </button>
        </div>
      </div>
    `).join('');

    // Toggle aufklappen
    container.querySelectorAll('.recipe-header').forEach(h => {
      h.addEventListener('click', () => {
        const idx = h.dataset.idx;
        const body = document.getElementById(`body-${idx}`);
        const arrow = document.getElementById(`arrow-${idx}`);
        const open = body.classList.toggle('open');
        arrow.textContent = open ? '⌄' : '›';
      });
    });

    // Gegessen-Button
    container.querySelectorAll('[data-rezept]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const r = rezepte[parseInt(btn.dataset.rezept)];
        await this._markGegessen(r);
      });
    });
  },

  async _markGegessen(rezept) {
    // Makros aus String parsen: "510 kcal · 34g P · 64g C · 8g F"
    const m = rezept.makros.match(/(\d+)\s*kcal.*?(\d+)g\s*P.*?(\d+)g\s*C.*?(\d+)g\s*F/);
    const kcal    = m ? m[1] : '0';
    const protein = m ? m[2] : '0';
    const carbs   = m ? m[3] : '0';
    const fett    = m ? m[4] : '0';

    const datum = new Date().toLocaleDateString('de-DE');
    const row = [datum, this.aktiveMahlzeit, rezept.name, kcal, protein, carbs, fett];

    try {
      await Sheets.appendSafe('Ernaehrungs_Log', row);
      App.showToast(`${rezept.name} eingetragen ✓`);
    } catch (e) {
      App.showToast('Offline – wird automatisch nachgesendet ✓');
    }

    await this._loadGegessen();
    this._renderBars();
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
    } catch (e) { /* offline */ }
  }
};
