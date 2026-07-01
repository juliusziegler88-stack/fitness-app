window.Rotation = {
  // Trainingstage: Mo (1), Mi (3), Fr (5) | Sa (6) = Ausdauer | Rest = Ruhetag
  // Start: 7. Juli 2026 (erster Montag der App)
  START: new Date('2026-07-06T00:00:00'),

  getToday() {
    const now = new Date();
    const dow = now.getDay(); // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa

    if (dow === 6) {
      return { typ: 'ausdauer', label: 'Ausdauertag', badgeClass: 'badge-ausdauer' };
    }
    if (![1, 3, 5].includes(dow)) {
      return { typ: 'ruhetag', label: 'Ruhetag', badgeClass: 'badge-ruhetag' };
    }

    // Welche KW seit Start → gerade/ungerade bestimmt Woche 1 oder 2
    const diffMs = now - this.START;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const isWeek1 = diffWeeks % 2 === 0;

    // Trainingstag-Index innerhalb der Woche (0=Mo, 1=Mi, 2=Fr)
    const idx = dow === 1 ? 0 : dow === 3 ? 1 : 2;

    // Woche 1: A/B/A | Woche 2: B/A/B
    const muster = isWeek1 ? ['A', 'B', 'A'] : ['B', 'A', 'B'];
    const typ = muster[idx];

    return {
      typ,
      label: `Trainingstag ${typ}`,
      badgeClass: 'badge-training'
    };
  },

  getDatenKey(typ) {
    if (typ === 'A' || typ === 'B') return 'trainingstag';
    if (typ === 'ausdauer') return 'ausdauertag';
    return 'ruhetag';
  }
};
