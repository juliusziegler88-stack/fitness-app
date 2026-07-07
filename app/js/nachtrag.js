window.Nachtrag = {
  render() {
    const el = document.getElementById('tab-training');
    el.innerHTML = `
      <div class="section-title">Welches Workout nachtragen?</div>
      <div id="nachtrag-picker">
        ${Data.workouts.map(w => `
          <div class="card" style="cursor:pointer" data-workout="${w.id}">
            <div style="font-weight:600;font-size:16px">${w.name}</div>
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : 'Cardio'}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-ghost" id="btn-nachtrag-back" style="margin-top:8px">Zurück</button>
    `;

    document.querySelectorAll('#nachtrag-picker [data-workout]').forEach(card => {
      card.addEventListener('click', () => {
        const workout = Data.workouts.find(w => w.id === card.dataset.workout);
        this.renderForm(workout);
      });
    });

    document.getElementById('btn-nachtrag-back').addEventListener('click', () => Training.render());
  },

  renderForm(workout) {
    const el = document.getElementById('tab-training');
    const isKraft = workout.typ === 'kraft';
    const yesterday = new Date(Date.now() - 86400000);
    const defaultDate = yesterday.toISOString().slice(0, 10);

    const alleUebungen = isKraft
      ? workout.plan.flatMap(ss => ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core'))
      : [];

    el.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px">${workout.name} nachtragen</h2>
        <div class="log-input-label">Datum</div>
        <input type="date" id="nachtrag-datum" value="${defaultDate}" style="margin-bottom:14px">
        ${isKraft
          ? workout.plan.map(ss => {
              const uebungen = ss.uebungen.filter(u => !u.includes('Conditioning') && u !== 'Core');
              if (!uebungen.length) return '';
              return `
                <div style="margin-bottom:14px">
                  <div class="section-title">${ss.name}</div>
                  ${uebungen.map(u => this._renderExerciseRow(u)).join('')}
                </div>
              `;
            }).join('')
          : `<p style="color:var(--text-muted);line-height:1.6">${workout.text}</p>`
        }
      </div>
      <button class="btn btn-primary" id="btn-nachtrag-save">✓ Speichern</button>
      <button class="btn btn-ghost" id="btn-nachtrag-cancel" style="margin-top:8px">Zurück</button>
    `;

    document.getElementById('btn-nachtrag-save').addEventListener('click', () => this._save(workout, alleUebungen));
    document.getElementById('btn-nachtrag-cancel').addEventListener('click', () => this.render());
  },

  _renderExerciseRow(uebung) {
    const id = uebung.replace(/\s/g, '_');
    return `
      <div class="exercise-row">
        <div class="exercise-name">${uebung}</div>
        <div class="log-inputs">
          <div>
            <div class="log-input-label">Gewicht (kg)</div>
            <input type="number" id="nachtrag-kg_${id}" placeholder="0" min="0" step="2.5">
          </div>
          <div>
            <div class="log-input-label">Sätze</div>
            <input type="number" id="nachtrag-saetze_${id}" placeholder="3" min="1" max="10">
          </div>
          <div>
            <div class="log-input-label">Wdh</div>
            <input type="number" id="nachtrag-reps_${id}" placeholder="8" min="1" max="30">
          </div>
        </div>
      </div>
    `;
  },

  async _save(workout, alleUebungen) {
    const [y, m, d] = document.getElementById('nachtrag-datum').value.split('-').map(Number);
    const datum = new Date(y, m - 1, d).toLocaleDateString('de-DE');

    const rows = workout.typ === 'kraft'
      ? alleUebungen.map(u => {
          const id = u.replace(/\s/g, '_');
          const kg = document.getElementById(`nachtrag-kg_${id}`)?.value || '0';
          const saetze = document.getElementById(`nachtrag-saetze_${id}`)?.value || '0';
          const reps = document.getElementById(`nachtrag-reps_${id}`)?.value || '0';
          return [datum, workout.id, u, kg, saetze, reps];
        })
      : [[datum, workout.id, '', '', '', '']];

    let offline = false;
    for (const row of rows) {
      try { await Sheets.appendSafe('Training_Log', row); }
      catch (e) { offline = true; }
    }

    App.showToast(offline ? 'Offline – wird automatisch nachgesendet ✓' : 'Einheit gespeichert ✓');
    Training.render();
  }
};
