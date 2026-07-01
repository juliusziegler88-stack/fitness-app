// TEMP: Task-1 placeholder — wird in Task 2 ersetzt
window.Heute = {
  render() {
    const el = document.getElementById('tab-heute');
    if (!el) return;
    el.innerHTML = `
      <div class="card">
        <h2 style="font-size:20px;margin-bottom:8px;">Heute</h2>
        <p style="color:var(--text-muted);font-size:14px;">Wird in Task 2 implementiert.</p>
      </div>
    `;
  }
};
