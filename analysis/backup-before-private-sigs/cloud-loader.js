document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('sig-tool')) return;
  try { await import('./cloud.js'); }
  catch (error) {
    document.getElementById('sig-account-state').textContent = 'Cloud connection unavailable. Reload to try again. The bundled reference list is available below.';
    document.getElementById('sig-sync-state').textContent = 'Offline reference list; shared updates are unavailable.';
    const model = globalThis.CalendRxSigModel;
    const entries = model.mergeVariants(CALENDRX_SIG_CATALOG.entries, CALENDRX_CS_CATALOG.entries).entries;
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
