window.Training = {
  selectedDate: null,

  render() {
    this.selectedDate = new Date();
    const el = document.getElementById('tab-training');

    const activeSession = WorkoutSession.getSession();
    if (activeSession) {
      const workout = Data.workouts.find(w => w.id === activeSession.workoutId);
      if (workout) { WorkoutSession.render(workout); return; }
      WorkoutSession.clearSession();
    }

    el.innerHTML = `
      <div id="day-nav"></div>
      <div class="section-title">Workout wählen</div>
      <div id="workout-picker">
        ${Data.workouts.filter(w => !w.nurNachtragen).map(w => `
          <div class="card" style="cursor:pointer" data-workout="${w.id}">
            <div style="font-weight:600;font-size:16px">${w.name}</div>
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">${w.typ === 'kraft' ? 'Krafttraining' : 'Cardio'}</div>
          </div>
        `).join('')}
      </div>
      <div class="section-title" style="cursor:pointer;text-decoration:underline" id="btn-nachtragen">+ Training nachtragen</div>
      <div class="section-title">Letzte Einheiten</div>
      <div id="history-container"></div>
    `;

    this._renderDayNav();

    document.querySelectorAll('#workout-picker [data-workout]').forEach(card => {
      card.addEventListener('click', () => {
        const workout = Data.workouts.find(w => w.id === card.dataset.workout);
        WorkoutSession.render(workout);
      });
    });

    document.getElementById('btn-nachtragen').addEventListener('click', () => Nachtrag.render());

    this._renderHistory();
  },

  _getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  },

  _getWeekDays(date) {
    const monday = this._getMonday(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  },

  _isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  },

  _renderDayNav() {
    const el = document.getElementById('day-nav');
    if (!el) return;
    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const today = new Date();
    const weekDays = this._getWeekDays(this.selectedDate);
    const info = Rotation.getForDate(this.selectedDate);

    el.innerHTML = `
      <div class="day-nav-row">
        ${weekDays.map((d, i) => `
          <div class="day-nav-item ${this._isSameDay(d, this.selectedDate) ? 'selected' : ''}" data-date="${d.toISOString()}">
            <div class="day-nav-circle">${labels[i]}</div>
            ${this._isSameDay(d, today) ? '<div class="day-nav-today-dot"></div>' : ''}
          </div>
        `).join('')}
      </div>
      <span class="day-badge ${info.badgeClass}">${info.label}</span>
    `;

    el.querySelectorAll('.day-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedDate = new Date(item.dataset.date);
        this._renderDayNav();
      });
    });
  },

  async _renderHistory() {
    const el = document.getElementById('history-container');
    if (!el) return;
    if (!Auth.isSignedIn()) { el.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Anmelden um History zu sehen</p>'; return; }
    try {
      const rows = await Sheets.getAll('Training_Log');
      const tage = [...new Set(rows.map(r => r[0]))].reverse().slice(0, 5);
      el.innerHTML = tage.map(d => {
        const row = rows.find(r => r[0] === d);
        const einheit = row?.[1] || '';
        const workout = Data.workouts.find(w => w.id === einheit);
        const label = einheit === 'sonstiges' ? (row?.[2] || workout.name) : (workout ? workout.name : einheit);
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
