window.Rotation = {
  // Fester 4er-Split: Mo/Di schwer, Do/Fr leicht, Sa Ausdauer, Mi/So Ruhetag
  TAGE: {
    1: { typ: 'unterkoerper_schwer', label: 'Unterkörper schwer', badgeClass: 'badge-training' },
    2: { typ: 'oberkoerper_schwer', label: 'Oberkörper schwer', badgeClass: 'badge-training' },
    3: { typ: 'ruhetag', label: 'Ruhetag', badgeClass: 'badge-ruhetag' },
    4: { typ: 'unterkoerper_leicht', label: 'Unterkörper leicht', badgeClass: 'badge-training' },
    5: { typ: 'oberkoerper_leicht', label: 'Oberkörper leicht', badgeClass: 'badge-training' },
    6: { typ: 'ausdauer', label: 'Ausdauertag', badgeClass: 'badge-ausdauer' },
    0: { typ: 'ruhetag', label: 'Ruhetag', badgeClass: 'badge-ruhetag' }
  },

  getForDate(date) {
    return this.TAGE[date.getDay()]; // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
  },

  getToday() {
    return this.getForDate(new Date());
  },

  getDatenKey(typ) {
    if (typ === 'ausdauer') return 'ausdauertag';
    if (typ === 'ruhetag') return 'ruhetag';
    return 'trainingstag';
  }
};
