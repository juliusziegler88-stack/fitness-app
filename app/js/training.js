window.Training = {
  today: null,

  render() {
    this.today = Rotation.getToday();
    const el = document.getElementById('tab-training');

    const activeSession = WorkoutSession.getSession();
    if (activeSession) {
      const workout = Data.workouts.find(w => w.id === activeSession.workoutId);
      if (workout) { WorkoutSession.render(workout); return; }
      WorkoutSession.clearSession();
    }

    el.innerHTML = `
      <span class="day-badge ${this._badgeClass()}">${this._badgeLabel()}</span>
      <div class="section-title">Workout wählen</div>
      <div id="workout-picker">
        ${Data.workouts.map(w => `
          <div class="card" style="cursor:pointer" data-workout="${w.id}">
            <div style="font-weight:600;font-size:16px">${w.name}</div>
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : 'Cardio'}</div>
          </div>
        `).join('')}
      </div>
      <div class="section-title">Letzte Einheiten</div>
      <div id="history-container"></div>
    `;

    document.querySelectorAll('#workout-picker [data-workout]').forEach(card => {
      card.addEventListener('click', () => {
        const workout = Data.workouts.find(w => w.id === card.dataset.workout);
        WorkoutSession.render(workout);
      });
    });

    this._renderHistory();
  },

  _badgeClass() {
    return { A: 'badge-training', B: 'badge-training', ausdauer: 'badge-ausdauer', ruhetag: 'badge-ruhetag' }[this.today.typ];
  },

  _badgeLabel() {
    return { A: 'Trainingstag A', B: 'Trainingstag B', ausdauer: 'Ausdauertag', ruhetag: 'Ruhetag' }[this.today.typ];
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
        const workout = Data.workouts.find(w => w.id === einheit);
        const label = workout ? workout.name : einheit;
        return `
          <div class="card" style="padding:12px;margin-bottom:8px">
            <span style="font-weight:600">${d}</span>
            <span class="day-badge badge-training" style="margin-left:8px;font-size:11px">${label}</span>
          </div>
        `;
      }).join('') || '<p style="color:var(--text-muted);font-size:14px">Noch keine Einheiten eingetragen</p>';
    } catch (e) { el.innerHTML = ''; }
  }
};
