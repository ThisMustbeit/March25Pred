document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('sig-tool')) return;
  try { await import('./cloud.js'); }
  catch (error) {
    document.getElementById('sig-account-state').textContent = 'Cloud connection unavailable. Reload to try again.';
    document.getElementById('sig-sync-state').textContent = 'The sig library needs a connection. Reload to try again.';
    const model = globalThis.CalendRxSigModel;
    const entries = model.mergeVariants(globalThis.CALENDRX_SIG_CATALOG?.entries || [], globalThis.CALENDRX_CS_CATALOG?.entries || []).entries;
    const render = () => {
      const rows = entries.filter(row => model.matches(row, document.getElementById('sig-search').value));
      const list = document.getElementById('sig-list'); list.replaceChildren();
      rows.forEach(row => {
        const card = document.createElement('article'); card.className = 'sig-entry';
        for (const [tag, text] of [['h3',row.code],['p',row.meaning],['p',row.tags.join(', ')]]) {
          const el = document.createElement(tag); el.textContent = text; card.append(el);
        }
        list.append(card);
      });
      document.getElementById('sig-count').textContent = `${rows.length} shortcuts`;
    };
    document.getElementById('sig-search').addEventListener('input', render);
    document.getElementById('sig-clear').onclick = () => { document.getElementById('sig-search').value = ''; render(); };
    document.getElementById('sig-export').disabled = true;
    document.getElementById('sig-view').disabled = true;
    render();
  }
});
