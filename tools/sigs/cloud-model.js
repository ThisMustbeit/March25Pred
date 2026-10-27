(() => {
  const key = row => `${row.scope}_${row.id}`;
  function combine(base, overrides) {
    const rows = new Map(base.map(row => [row.id,row]));
    overrides.forEach(row => rows.set(row.id,row));
    return [...rows.values()].filter(row => !row.deleted);
  }
  function canEdit(user, ownerUid, scope) {
    return Boolean(user && (scope === 'personal' || (ownerUid && user.uid === ownerUid && scope === 'shared')));
  }
  function assertRevision(actual, expected) {
    if (actual !== expected) throw new Error('This shortcut changed in another session. Close the editor and reopen it before saving.');
  }
  async function stableId(code, meaning) {
    const bytes = new TextEncoder().encode(JSON.stringify([code.normalize('NFKC').toLowerCase(),meaning]));
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const api = {key, combine, canEdit, assertRevision, stableId};
  globalThis.CalendRxCloudModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
