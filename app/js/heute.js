window.Heute = {
  render() {
    const el = document.getElementById('tab-heute');
    if (!el) return;
    el.innerHTML = `
      <div class="card">
        <p style="margin-bottom:12px;color:var(--text-muted)">Google-Konto verbinden:</p>
        <button class="btn btn-primary" id="btn-signin">Mit Google verbinden</button>
      </div>
    `;
    document.getElementById('btn-signin').addEventListener('click', async () => {
      await Auth.signIn();
      App.showToast('Verbunden ✓');
    });
  }
};
