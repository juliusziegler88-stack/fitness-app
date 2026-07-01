// Ernährung Tab — wird in späteren Tasks implementiert
window.Ernaehrung = {
  render() {
    const el = document.getElementById('tab-ernaehrung');
    if (!el) return;
    el.innerHTML = `
      <div class="card">
        <h2 style="font-size:20px;margin-bottom:8px;">Ernährung</h2>
        <p style="color:var(--text-muted);font-size:14px;">Wird in einem späteren Task implementiert.</p>
      </div>
    `;
  }
};
