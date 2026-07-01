// Fortschritt Tab — wird in späteren Tasks implementiert
window.Fortschritt = {
  render() {
    const el = document.getElementById('tab-fortschritt');
    if (!el) return;
    el.innerHTML = `
      <div class="card">
        <h2 style="font-size:20px;margin-bottom:8px;">Fortschritt</h2>
        <p style="color:var(--text-muted);font-size:14px;">Wird in einem späteren Task implementiert.</p>
      </div>
    `;
  }
};
