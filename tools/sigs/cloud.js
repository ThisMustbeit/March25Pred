import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig, ownerUid } from './firebase-config.js';

const $ = id => document.getElementById(id);
const model = globalThis.CalendRxSigModel;
const cloud = globalThis.CalendRxCloudModel;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Session-only authentication avoids leaving an account signed in on shared pharmacy computers.
await setPersistence(auth, browserSessionPersistence);
// Bundled reference lists are no longer shipped with the site (the LS/CS lists are private to the owner's account).
// If a bundled catalog is present (tests or a future public list), it is still merged in as before.
const bundled = [globalThis.CALENDRX_SIG_CATALOG, globalThis.CALENDRX_CS_CATALOG];
const base = bundled.some(Boolean)
  ? await Promise.all(model.mergeVariants(bundled[0]?.entries || [], bundled[1]?.entries || []).entries.map(model.entry).map(async row => ({...row, id:await cloud.stableId(row.code,row.meaning), scope:'shared',revision:0})))
  : [];
const bundledIds = new Set(base.map(row => row.id));
// Shared-library edits of entries from a bundled list use a 64-character content hash as their id.
// When that list is no longer bundled, those edits must not show to everyone.
const isOrphanOverride = row => /^[0-9a-f]{64}$/.test(row.id) && !bundledIds.has(row.id);
let user = null, shared = [], personal = [], favorites = new Set(), subscriptions = [];
let generation = 0, sharedReady = false, personalReady = false, favoritesReady = false;
let selectedTag = '', editing = null, busy = false;
// Bulk selection state.
let selectMode = false, selected = new Set(), lastIndex = -1, shown = [], bulkMode = null, bulkRemove = new Set(), undoRows = null;
const status = (text, error = false) => { $('sig-status').textContent = text; $('sig-status').classList.toggle('is-error',error); };
const isOwner = () => user?.uid === ownerUid;
const rows = () => [...cloud.combine(base,shared.filter(row=>!isOrphanOverride(row))), ...personal.filter(row=>!row.deleted)];
function button(text, action, className = 'button button-secondary') {
  const el = document.createElement('button'); el.type='button'; el.className=className; el.textContent=text;
  el.addEventListener('click',action); return el;
}
function fail(error) {
  const messages = {
    'permission-denied':'Access denied. Check that the Firestore rules have been published for this project.',
    'unavailable':'Cloud saving is unavailable. Check your connection and try again.',
    'auth/invalid-credential':'The email or password is incorrect.',
    'auth/email-already-in-use':'An account already exists for that email. Sign in or reset your password.',
    'auth/operation-not-allowed':'Email/password sign-in must be enabled in Firebase Authentication.',
    'auth/weak-password':'Choose a stronger password (at least six characters).',
    'auth/too-many-requests':'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed':'Unable to connect. Check your internet connection.'
  };
  return messages[error.code] || error.message || 'Something went wrong. Please try again.';
}
function controls() {
  $('sig-add').disabled = !user || !personalReady || busy;
  $('sig-import').disabled = !user || !personalReady || busy;
  $('sig-import-local').disabled = !user || !personalReady || busy;
  $('sig-signout').disabled = busy;
  $('sig-save').disabled = busy;
  $('sig-shared-option').hidden = !isOwner();
  $('sig-owner-tools').hidden = !isOwner();
  $('sig-owner-import').disabled = !isOwner() || !personalReady || !sharedReady || busy;
}
function render() {
  controls();
  const all = rows(), view = $('sig-view').value;
  const scoped = all.filter(row => view==='all' || row.scope===view || (view==='favorites' && favorites.has(cloud.key(row))));
  const tagNames = [...new Set(scoped.flatMap(row=>row.tags))].sort((a,b)=>a.localeCompare(b));
  const tagBox = $('sig-tags'); tagBox.replaceChildren();
  for (const tag of ['',...tagNames]) {
    const b = button(tag || 'All tags',()=>{selectedTag=tag;render();},'sig-tag');
    b.setAttribute('aria-pressed',String(tag===selectedTag)); tagBox.append(b);
  }
  const filtered = scoped.filter(row=>model.matches(row,$('sig-search').value,selectedTag)).sort((a,b)=>a.code.localeCompare(b.code));
  shown = filtered;
  const existing = new Set(all.map(cloud.key));
  for (const k of [...selected]) if (!existing.has(k)) selected.delete(k);
  $('sig-count').textContent = `${filtered.length} shortcuts`;
  const list = $('sig-list'); list.replaceChildren();
  filtered.forEach((row, index) => {
    const card=document.createElement('article'); card.className='sig-entry';
    if (selectMode) {
      const k = cloud.key(row), isOn = selected.has(k);
      card.className = 'sig-entry is-selectable' + (isOn ? ' is-selected' : '');
      const box = document.createElement('input'); box.type = 'checkbox'; box.className = 'sig-check'; box.checked = isOn;
      box.setAttribute('aria-label', `Select ${row.code}`);
      box.addEventListener('click', event => { event?.stopPropagation?.(); toggleSelect(index, event?.shiftKey); });
      card.append(box);
      card.addEventListener('click', event => {
        if (event?.target?.closest?.('button, input, a, select, textarea')) return;
        if (!event?.shiftKey && globalThis.getSelection?.()?.toString()) return; // let people copy text
        toggleSelect(index, event?.shiftKey);
      });
      // Shift-click selects a range, not text.
      card.addEventListener('mousedown', event => { if (event?.shiftKey) event.preventDefault(); });
    }
    for (const [tag,text,cls] of [['h3',row.code,''],['p',row.meaning,''],['p',`${row.scope==='shared'?'Shared':'Personal'} · ${row.tags.join(', ')}`,'sig-entry-notes'],['p',row.notes,'sig-entry-notes']]) {
      if (!text) continue;
      const el=document.createElement(tag); el.textContent=text; el.className=cls; card.append(el);
    }
    const actions=document.createElement('div'); actions.className='sig-actions';
    if (user) {
      const favourite=button(favorites.has(cloud.key(row))?'★ Favourited':'☆ Favourite',()=>toggleFavorite(row));
      favourite.setAttribute('aria-pressed',String(favorites.has(cloud.key(row))));
      favourite.disabled=busy || !favoritesReady; actions.append(favourite);
      if (row.scope==='shared') {
        const copy=button('Copy to my list',()=>openEditor(row,true)); copy.disabled=busy || !personalReady; actions.append(copy);
      }
      if (cloud.canEdit(user,ownerUid,row.scope)) {
        const edit=button('Edit',()=>openEditor(row));
        const remove=button('Remove',()=>removeRow(row));
        edit.disabled=remove.disabled=busy || !(row.scope==='shared'?sharedReady:personalReady);
        actions.append(edit,remove);
        const editTags=button('Edit tags',()=>{openEditor(row);$('sig-entry-tags').focus();});
        editTags.disabled=edit.disabled; actions.append(editTags);
      }
      if (isOwner() && row.scope==='personal') {
        const publish=button('Copy to shared library',()=>openEditor(row,true,'shared'));
        publish.disabled=busy || !sharedReady; actions.append(publish);
      }
    }
    if (!selectMode) card.append(actions);
    list.append(card);
  });
  if (!filtered.length) {
    const empty=document.createElement('p'); empty.className='sig-empty';
    empty.textContent=!user && ['personal','favorites'].includes(view)?'Sign in to see your personal shortcuts and favourites.':'No shortcuts match these filters.';
    list.append(empty);
  }
  renderBulk();
}

// ---------- Bulk selection ----------
const keyOf = row => cloud.key(row);
const selectedRows = () => rows().filter(row => selected.has(keyOf(row)));
const canWrite = row => cloud.canEdit(user, ownerUid, row.scope) && (row.scope === 'shared' ? sharedReady : personalReady);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
function toggleSelect(index, range) {
  const row = shown[index]; if (!row || busy) return;
  const turnOn = !selected.has(keyOf(row));
  const [from, to] = range && lastIndex >= 0 ? [Math.min(lastIndex, index), Math.max(lastIndex, index)] : [index, index];
  for (let i = from; i <= to; i++) { const k = keyOf(shown[i]); if (turnOn) selected.add(k); else selected.delete(k); }
  lastIndex = index;
  render();
}
function setSelectMode(on) {
  selectMode = on; lastIndex = -1;
  if (!on) { selected.clear(); closeBulkPanel(); }
  render();
}
function closeBulkPanel() { bulkMode = null; bulkRemove = new Set(); $('sig-bulk-panel').hidden = true; $('sig-bulk-panel-error').textContent = ''; }
function renderBulk() {
  $('sig-select-bar').hidden = !user;
  $('sig-select-toggle').textContent = selectMode ? 'Done selecting' : 'Select';
  $('sig-select-toggle').setAttribute('aria-pressed', String(selectMode));
  $('sig-select-toggle').disabled = busy;
  $('sig-select-all').hidden = !selectMode;
  $('sig-select-all').textContent = `Select all ${shown.length} shown`;
  $('sig-select-all').disabled = busy || !shown.length;
  $('sig-select-none').hidden = !selectMode || !selected.size;
  $('sig-select-hint').hidden = !selectMode;
  const picked = selectedRows(), editable = picked.filter(canWrite);
  $('sig-bulk').hidden = !(user && selectMode && picked.length);
  $('sig-bulk-count').textContent = `${picked.length} selected`;
  $('sig-bulk-add-tags').disabled = $('sig-bulk-remove-tags').disabled = $('sig-bulk-delete').disabled = busy || !editable.length;
  $('sig-bulk-favourite').disabled = $('sig-bulk-unfavourite').disabled = busy || !favoritesReady;
  $('sig-bulk-copy').hidden = !picked.some(row => row.scope === 'shared');
  $('sig-bulk-copy').disabled = busy || !personalReady;
  $('sig-bulk-clear').disabled = busy;
  if (bulkMode === 'remove') renderRemoveOptions();
}
function skippedNote(picked, editable) {
  const skipped = picked.length - editable.length;
  return skipped ? ` Skipped ${plural(skipped, 'shared shortcut')} you can't edit; copy ${skipped === 1 ? 'it' : 'them'} to your list first.` : '';
}
function openBulkPanel(mode) {
  if (busy) return;
  const editable = selectedRows().filter(canWrite);
  bulkMode = mode; bulkRemove = new Set();
  $('sig-bulk-panel').hidden = false; $('sig-bulk-panel-error').textContent = '';
  $('sig-bulk-tag-field').hidden = mode !== 'add';
  const options = $('sig-bulk-tag-options'); options.replaceChildren();
  if (mode === 'add') {
    $('sig-bulk-panel-title').textContent = `Add tags to ${plural(editable.length, 'shortcut')}. Existing tags are kept.`;
    $('sig-bulk-tag-input').value = '';
    for (const tag of [...new Set(rows().flatMap(row => row.tags))].sort((a, b) => a.localeCompare(b))) {
      options.append(button(tag, () => {
        try { $('sig-bulk-tag-input').value = model.tags([...model.tags($('sig-bulk-tag-input').value), tag]).join(', '); }
        catch (error) { $('sig-bulk-panel-error').textContent = fail(error); }
      }, 'sig-tag'));
    }
    $('sig-bulk-tag-input').focus?.();
  } else {
    renderRemoveOptions();
  }
}
function renderRemoveOptions() {
  const editable = selectedRows().filter(canWrite);
  const counts = new Map();
  for (const row of editable) for (const tag of row.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  $('sig-bulk-panel-title').textContent = counts.size
    ? `Choose tags to remove from ${plural(editable.length, 'shortcut')}.`
    : 'The selected shortcuts have no tags to remove.';
  const options = $('sig-bulk-tag-options'); options.replaceChildren();
  for (const [tag, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
    const b = button(`${tag} (${count})`, () => { bulkRemove.has(tag) ? bulkRemove.delete(tag) : bulkRemove.add(tag); renderRemoveOptions(); }, 'sig-tag');
    b.setAttribute('aria-pressed', String(bulkRemove.has(tag))); options.append(b);
  }
}
function confirmShared(changes, verb) {
  const sharedCount = changes.filter(change => change.row.scope === 'shared').length;
  return !sharedCount || confirm(`This ${verb} ${plural(sharedCount, 'shortcut')} in the shared library for everyone. Continue?`);
}
// Saves many entries with the same revision checks as single edits, in batches.
async function bulkSave(changes) {
  const uid = user?.uid, saved = []; let conflicts = 0;
  for (const scope of ['personal', 'shared']) {
    const group = changes.filter(change => change.row.scope === scope);
    for (let start = 0; start < group.length; start += 100) {
      const chunk = group.slice(start, start + 100), written = [];
      let chunkConflicts = 0;
      await runTransaction(db, async tx => {
        written.length = 0; chunkConflicts = 0;
        if (auth.currentUser?.uid !== uid) throw new Error('Your account changed. Sign in again.');
        const refs = chunk.map(change => refFor(scope, change.row.id, uid));
        const snapshots = [];
        for (const ref of refs) snapshots.push(await tx.get(ref));
        chunk.forEach((change, i) => {
          const current = snapshots[i].exists() ? snapshots[i].data().revision : 0;
          if (current !== change.row.revision) { chunkConflicts++; return; }
          tx.set(refs[i], {...model.entry(change.next), deleted: Boolean(change.deleted), revision: current + 1, updatedAt: serverTimestamp()});
          written.push({...change.row, ...model.entry(change.next), revision: current + 1});
        });
      });
      saved.push(...written); conflicts += chunkConflicts;
      if (group.length > 100) status(`Saving… ${saved.length} of ${changes.length}`);
    }
  }
  return {saved, conflicts};
}
const conflictNote = n => n ? ` ${plural(n, 'shortcut')} changed in another session and ${n === 1 ? 'was' : 'were'} skipped.` : '';
function applyBulkTags() {
  const picked = selectedRows(), editable = picked.filter(canWrite);
  let changes = [], tooMany = 0;
  try {
    if (bulkMode === 'add') {
      const adding = model.tags($('sig-bulk-tag-input').value);
      if (!adding.length) { $('sig-bulk-panel-error').textContent = 'Type at least one tag.'; return; }
      for (const row of editable) {
        let next;
        try { next = model.tags([...row.tags, ...adding]); } catch { tooMany++; continue; }
        if (next.length !== row.tags.length) changes.push({row, next: {...row, tags: next}});
      }
    } else {
      if (!bulkRemove.size) { $('sig-bulk-panel-error').textContent = 'Choose at least one tag to remove.'; return; }
      for (const row of editable) {
        const next = row.tags.filter(tag => !bulkRemove.has(tag));
        if (next.length !== row.tags.length) changes.push({row, next: {...row, tags: next}});
      }
    }
  } catch (error) { $('sig-bulk-panel-error').textContent = fail(error); return; }
  const verb = bulkMode === 'add' ? 'adds tags to' : 'removes tags from';
  if (!changes.length) {
    $('sig-bulk-panel-error').textContent = tooMany ? `No changes: ${plural(tooMany, 'shortcut')} would go over 20 tags.` : 'No changes needed: the selected shortcuts already match.';
    return;
  }
  if (!confirmShared(changes, verb)) return;
  const mode = bulkMode;
  action(async () => {
    const {saved, conflicts} = await bulkSave(changes);
    closeBulkPanel();
    const unchanged = editable.length - changes.length - tooMany;
    return `${mode === 'add' ? 'Added tags to' : 'Removed tags from'} ${plural(saved.length, 'shortcut')}.` +
      (unchanged > 0 ? ` ${unchanged} already matched.` : '') +
      (tooMany ? ` ${plural(tooMany, 'shortcut')} would go over 20 tags and ${tooMany === 1 ? 'was' : 'were'} skipped.` : '') +
      conflictNote(conflicts) + skippedNote(picked, editable);
  });
}
function bulkDelete() {
  if (busy) return;
  const picked = selectedRows(), editable = picked.filter(canWrite);
  if (!editable.length) return;
  const sharedCount = editable.filter(row => row.scope === 'shared').length;
  const question = `Delete ${plural(editable.length, 'shortcut')}?` + (sharedCount ? ` ${sharedCount} ${sharedCount === 1 ? 'is' : 'are'} in the shared library and will be removed for everyone.` : '');
  if (!confirm(question)) return;
  action(async () => {
    const {saved, conflicts} = await bulkSave(editable.map(row => ({row, next: row, deleted: true})));
    undoRows = saved;
    $('sig-undo').textContent = `Undo delete (${saved.length})`;
    $('sig-undo').hidden = !saved.length;
    return `Deleted ${plural(saved.length, 'shortcut')}.` + conflictNote(conflicts) + skippedNote(picked, editable);
  });
}
function bulkFavourite(on) {
  const uid = user?.uid, picked = selectedRows(); if (!uid || !picked.length) return;
  action(async () => {
    let changed = 0;
    for (let start = 0; start < picked.length; start += 200) {
      const chunk = picked.slice(start, start + 200);
      let count = 0;
      await runTransaction(db, async tx => {
        count = 0;
        if (auth.currentUser?.uid !== uid) throw new Error('Your account changed. Sign in again.');
        const refs = chunk.map(row => doc(db, 'users', uid, 'favorites', keyOf(row)));
        const snapshots = [];
        for (const ref of refs) snapshots.push(await tx.get(ref));
        chunk.forEach((row, i) => {
          if (on && !snapshots[i].exists()) { tx.set(refs[i], {source: row.scope, entryId: row.id}); count++; }
          if (!on && snapshots[i].exists()) { tx.delete(refs[i]); count++; }
        });
      });
      changed += count;
    }
    return on ? `Added ${plural(changed, 'shortcut')} to favourites.` : `Removed ${plural(changed, 'shortcut')} from favourites.`;
  });
}
function bulkCopy() {
  const sharedRows = selectedRows().filter(row => row.scope === 'shared');
  if (!sharedRows.length) return;
  action(async () => await importRows(sharedRows.map(row => model.entry(row))));
}
$('sig-select-toggle').onclick = () => setSelectMode(!selectMode);
$('sig-select-all').onclick = () => { shown.forEach(row => selected.add(keyOf(row))); render(); };
$('sig-select-none').onclick = () => { selected.clear(); closeBulkPanel(); render(); };
$('sig-bulk-clear').onclick = () => { selected.clear(); closeBulkPanel(); render(); };
$('sig-bulk-add-tags').onclick = () => openBulkPanel('add');
$('sig-bulk-remove-tags').onclick = () => openBulkPanel('remove');
$('sig-bulk-cancel').onclick = () => closeBulkPanel();
$('sig-bulk-apply').onclick = () => applyBulkTags();
$('sig-bulk-tag-input').addEventListener('keydown', event => { if (event?.key === 'Enter') { event.preventDefault(); applyBulkTags(); } });
$('sig-bulk-delete').onclick = () => bulkDelete();
$('sig-bulk-favourite').onclick = () => bulkFavourite(true);
$('sig-bulk-unfavourite').onclick = () => bulkFavourite(false);
$('sig-bulk-copy').onclick = () => bulkCopy();
$('sig-undo').onclick = () => {
  const restore = undoRows; if (!restore?.length) return;
  undoRows = null; $('sig-undo').hidden = true;
  action(async () => {
    const {saved, conflicts} = await bulkSave(restore.map(row => ({row, next: row, deleted: false})));
    return `Restored ${plural(saved.length, 'shortcut')}.` + conflictNote(conflicts);
  });
};
function closeEditor() { editing=null; $('sig-editor').hidden=true; $('sig-form').reset(); $('sig-form-error').textContent=''; }
function openEditor(row=null, copy=false, scope='personal') {
  if (busy || !user) return;
  editing=row && !copy?{...row}:null;
  $('sig-scope').value=editing?.scope || scope;
  $('sig-scope').disabled=Boolean(editing);
  $('sig-editor-title').textContent=editing?'Edit shortcut':copy?'Copy shortcut':'Add shortcut';
  for (const [id,value] of [['sig-code',row?.code||''],['sig-meaning',row?.meaning||''],['sig-entry-tags',row?.tags.join(', ')||''],['sig-notes',row?.notes||'']]) $(id).value=value;
  $('sig-form-error').textContent='';
  const suggestions=$('sig-tag-suggestions'); suggestions.replaceChildren();
  for (const tag of [...new Set(rows().flatMap(r=>r.tags))].sort()) suggestions.append(button(tag,()=>{
    try { $('sig-entry-tags').value=model.tags([...model.tags($('sig-entry-tags').value),tag]).join(', '); }
    catch(error) { $('sig-form-error').textContent=fail(error); }
  },'sig-tag'));
  $('sig-editor').hidden=false; $('sig-editor').scrollIntoView({behavior:'smooth',block:'start'}); $('sig-code').focus({preventScroll:true});
}
function refFor(scope,id,uid) { return scope==='shared'?doc(db,'sharedSigs',id):doc(db,'users',uid,'sigs',id); }
async function saveRow(row, scope, id, revision, deleted=false) {
  const uid=user?.uid;
  if (!cloud.canEdit(user,ownerUid,scope)) throw new Error('Sign in with an account allowed to edit this list.');
  if (!(scope==='shared'?sharedReady:personalReady)) throw new Error('Wait for this list to connect before saving.');
  const valid=model.entry(row), ref=refFor(scope,id,uid);
  await runTransaction(db,async tx=>{
    if (auth.currentUser?.uid!==uid) throw new Error('Your account changed. Sign in again.');
    const snapshot=await tx.get(ref);
    cloud.assertRevision(snapshot.exists()?snapshot.data().revision:0,revision);
    tx.set(ref,{...valid,deleted,revision:revision+1,updatedAt:serverTimestamp()});
  });
}
async function action(work) {
  if (busy) return;
  busy=true; const session=generation; render(); status('Saving…');
  try { const message=await work(); if (session===generation) status(message || 'Saved to your account.'); }
  catch(error) { if(session===generation) {status(fail(error),true); $('sig-form-error').textContent=fail(error);} }
  finally {busy=false; render();}
}
$('sig-form').addEventListener('submit',event=>{
  event.preventDefault();
  const row={code:$('sig-code').value,meaning:$('sig-meaning').value,tags:$('sig-entry-tags').value,notes:$('sig-notes').value};
  const scope=editing?.scope || $('sig-scope').value, id=editing?.id || crypto.randomUUID(), revision=editing?.revision || 0;
  const session=generation;
  action(async()=>{await saveRow(row,scope,id,revision);if(session===generation)closeEditor();return scope==='shared'?'Saved to the shared library for everyone.':'Saved to your personal list.';});
});
async function removeRow(row) {
  if (!confirm(`Remove ${row.code} from ${row.scope==='shared'?'the shared library for everyone':'your personal list'}?`)) return;
  await action(async()=>{await saveRow(row,row.scope,row.id,row.revision,true); if(editing?.id===row.id) closeEditor();return row.scope==='shared'?'Removed from the shared library.':'Removed from your personal list.';});
}
async function toggleFavorite(row) {
  const uid=user?.uid, id=cloud.key(row); if(!uid) return;
  await action(async()=>{
    const ref=doc(db,'users',uid,'favorites',id);
    await runTransaction(db,async tx=>{
      if(auth.currentUser?.uid!==uid) throw new Error('Your account changed. Sign in again.');
      const snapshot=await tx.get(ref);
      if(snapshot.exists()) tx.delete(ref); else tx.set(ref,{source:row.scope,entryId:row.id});
    });
  });
}
async function importRows(incoming) {
  const uid=user?.uid;
  if(!uid || !personalReady) throw new Error('Sign in and wait for your personal list to connect.');
  const keyFor=row=>JSON.stringify([row.code.normalize('NFKC').toLowerCase(),row.meaning]);
  const existing=new Set(personal.map(keyFor)), pending=[];
  for(const row of incoming) { const key=keyFor(row); if(existing.has(key)) continue; existing.add(key); pending.push(row); }
  let processed=0;
  for(let start=0; start<pending.length; start+=100) {
    if(auth.currentUser?.uid!==uid) throw new Error('Import stopped because your account changed.');
    const chunk=pending.slice(start,start+100);
    // Deterministic IDs make retrying interrupted imports safe without overwriting edits.
    const ids=await Promise.all(chunk.map(row=>cloud.stableId(row.code,row.meaning)));
    await runTransaction(db,async tx=>{
      if(auth.currentUser?.uid!==uid) throw new Error('Import stopped because your account changed.');
      const refs=ids.map(id=>refFor('personal','import_'+id,uid)), snapshots=[];
      for(const ref of refs) snapshots.push(await tx.get(ref));
      chunk.forEach((row,i)=>{ if(!snapshots[i].exists()) tx.set(refs[i],{...model.entry(row),deleted:false,revision:1,updatedAt:serverTimestamp()}); });
    });
    processed+=chunk.length;
    status(`Importing into your personal list… ${processed} of ${pending.length} processed. Keep this page open.`);
  }
  return `Import complete: ${processed} entries processed. Existing personal entries were preserved.`;
}
// Owner only: bring the private LS/CS lists into the owner's personal list, carrying over earlier
// shared-library edits of those entries, then remove those edits from the public shared library.
// Each entry is stored under an id derived from its ORIGINAL text, and entries the owner had removed
// are stored as hidden removal markers, so running the import again never brings anything back.
async function migrateOwnerCatalog(incoming) {
  if(!isOwner()) throw new Error('Only the owner account can import the private sig file.');
  if(!sharedReady || !personalReady) throw new Error('Wait for the shared and personal lists to connect.');
  const uid=user.uid;
  const keyFor=row=>JSON.stringify([row.code.normalize('NFKC').toLowerCase(),row.meaning]);
  const overrides=shared.filter(isOrphanOverride), byId=new Map(overrides.map(row=>[row.id,row])), used=new Set(), items=[];
  for(const entry of incoming) {
    const hash=await cloud.stableId(entry.code,entry.meaning), edited=byId.get(hash);
    if(edited) used.add(hash);
    items.push({docId:'import_'+hash, row:edited?model.entry(edited):entry, deleted:Boolean(edited?.deleted)});
  }
  for(const row of overrides) if(!used.has(row.id)) items.push({docId:'import_'+row.id, row:model.entry(row), deleted:Boolean(row.deleted)});
  // Skip entries already in the personal list with the same text (unless writing a removal marker).
  const present=new Set(personal.filter(row=>!row.deleted).map(keyFor));
  const pending=items.filter(item=>{ if(item.deleted) return true; const key=keyFor(item.row); if(present.has(key)) return false; present.add(key); return true; });
  let added=0, processed=0;
  for(let start=0; start<pending.length; start+=100) {
    const chunk=pending.slice(start,start+100);
    let chunkAdded=0;
    await runTransaction(db,async tx=>{
      chunkAdded=0;
      if(!isOwner() || auth.currentUser?.uid!==uid) throw new Error('Import stopped because your account changed.');
      const refs=chunk.map(item=>refFor('personal',item.docId,uid)), snapshots=[];
      for(const ref of refs) snapshots.push(await tx.get(ref));
      chunk.forEach((item,i)=>{
        if(snapshots[i].exists()) return;
        tx.set(refs[i],{...model.entry(item.row),deleted:item.deleted,revision:1,updatedAt:serverTimestamp()});
        if(!item.deleted) chunkAdded++;
      });
    });
    added+=chunkAdded; processed+=chunk.length;
    status(`Importing into your private list… ${processed} of ${pending.length} processed. Keep this page open.`);
  }
  const imported=`Import complete: ${added} new entr${added===1?'y':'ies'} added to your personal list (only your account can see them).`;
  let removed=0;
  try {
    for(let start=0; start<overrides.length; start+=100) {
      const chunk=overrides.slice(start,start+100);
      await runTransaction(db,async tx=>{
        if(!isOwner() || auth.currentUser?.uid!==uid) throw new Error('Your account changed. Sign in again.');
        chunk.forEach(row=>tx.delete(refFor('shared',row.id)));
      });
      removed+=chunk.length;
    }
  } catch(error) {
    const hint=error.code==='permission-denied'?' Publish the updated Firestore rules (they allow the owner to delete shared entries), then run this import again; it will not duplicate entries.':' '+fail(error);
    return `${imported} The earlier shared-library edits could not be removed yet.${hint}`;
  }
  return `${imported} ${removed ? `Removed ${removed} earlier edit${removed===1?'':'s'} of these entries from the public shared library.` : 'No earlier edits were left in the public shared library.'}`;
}
$('sig-owner-import').onclick=()=>$('sig-owner-file').click();
$('sig-owner-file').onchange=event=>{
  const file=event.target.files[0]; event.target.value=''; if(!file) return;
  action(async()=>{if(file.size>20*1024*1024) throw new Error('Choose a file smaller than 20 MB.'); return await migrateOwnerCatalog(model.decode(await file.text()));});
};
$('sig-import-local').onclick=()=>action(async()=>{
  const raw=localStorage.getItem('calendrx_sig_library_v1');
  if(!raw) throw new Error('There is no saved list in this browser.');
  const incoming=model.migrateNames(model.decode(raw));
  // Leave unchanged bundled entries in Shared; preserve local customizations as personal copies.
  const unchanged=new Set(base.map(row=>JSON.stringify(model.entry(row))));
  return await importRows(incoming.filter(row=>!unchanged.has(JSON.stringify(row))));
});
$('sig-import').onclick=()=>$('sig-import-file').click();
$('sig-import-file').onchange=event=>{
  const file=event.target.files[0]; event.target.value=''; if(!file) return;
  action(async()=>{if(file.size>20*1024*1024) throw new Error('Choose a backup smaller than 20 MB.'); return await importRows(model.migrateNames(model.decode(await file.text())));});
};
$('sig-export').onclick=()=>{
  // Export only the selected scope, preserving the established version-1 backup format.
  const view=$('sig-view').value;
  const selected=rows().filter(row=>view==='all'||row.scope===view||(view==='favorites'&&favorites.has(cloud.key(row))));
  const entries=model.mergeVariants([],selected.map(model.entry)).entries;
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,entries},null,2)],{type:'application/json'}));
  const link=document.createElement('a'); link.href=url; link.download=`calendrx-sigs-${view}.json`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('sig-add').onclick=()=>openEditor();
$('sig-cancel').onclick=closeEditor;
$('sig-search').addEventListener('input',render);
$('sig-view').onchange=()=>{selectedTag='';render();};
$('sig-clear').onclick=()=>{$('sig-search').value='';selectedTag='';render();};
$('sig-show-password').onchange=()=>{$('sig-password').type=$('sig-show-password').checked?'text':'password';};
let authBusy=false;
async function authenticate(mode) {
  if(authBusy) return;
  const email=$('sig-email').value.trim(), password=$('sig-password').value;
  if(!$('sig-email').reportValidity() || (mode!=='reset' && !$('sig-password').reportValidity())) return;
  authBusy=true; $('sig-auth-status').textContent='Connecting…';
  const buttons=[...$('sig-auth-form').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try {
    if(mode==='reset') {await sendPasswordResetEmail(auth,email);$('sig-auth-status').textContent='If an account exists for that email, a password reset email will be sent.';}
    else {
      if(mode==='register') await createUserWithEmailAndPassword(auth,email,password);
      else await signInWithEmailAndPassword(auth,email,password);
      $('sig-password').value=''; $('sig-auth-status').textContent='';
    }
  } catch(error) {$('sig-auth-status').textContent=fail(error);}
  finally {authBusy=false;buttons.forEach(b=>b.disabled=false);}
}
$('sig-auth-form').onsubmit=event=>{event.preventDefault();authenticate('signin');};
$('sig-register').onclick=()=>authenticate('register');
$('sig-reset-password').onclick=()=>authenticate('reset');
$('sig-signout').onclick=async()=>{try {await signOut(auth);} catch(error){$('sig-auth-status').textContent=fail(error);}};
function readRows(snapshot,scope) {return snapshot.docs.map(item=>({...model.entry(item.data()),id:item.id,scope,revision:item.data().revision,deleted:item.data().deleted}));}
onSnapshot(collection(db,'sharedSigs'),{includeMetadataChanges:true},snapshot=>{
  try {shared=readRows(snapshot,'shared');sharedReady=!snapshot.metadata.fromCache;
    $('sig-sync-state').textContent=sharedReady?'Shared library is up to date.':'Shared library is offline; showing available entries.'; render();
  }catch(error){sharedReady=false;status('A shared entry could not be read. '+fail(error),true);render();}
},error=>{sharedReady=false;$('sig-sync-state').textContent='Shared updates unavailable. '+fail(error);render();});
onAuthStateChanged(auth,next=>{
  generation++; const session=generation;
  subscriptions.forEach(stop=>stop());subscriptions=[];
  user=next;personal=[];favorites=new Set();personalReady=favoritesReady=false;closeEditor();status('');
  selectMode=false;selected.clear();undoRows=null;$('sig-undo').hidden=true;closeBulkPanel();
  $('sig-auth-form').hidden=Boolean(user);$('sig-signout').hidden=!user;
  $('sig-account-state').textContent=user?`Signed in as ${user.email}${isOwner()?' · Owner':''}. Personal data syncs to this account. Sign-in lasts for this browser session.`:'Browse the shared list or sign in to save your own shortcuts and favourites.';
  if(user) {
    subscriptions.push(onSnapshot(collection(db,'users',user.uid,'sigs'),{includeMetadataChanges:true},snapshot=>{
      if(session!==generation)return;
      try{personal=readRows(snapshot,'personal');personalReady=!snapshot.metadata.fromCache;render();}
      catch(error){personalReady=false;status(fail(error),true);render();}
    },error=>{if(session===generation){personal=[];personalReady=false;status('Personal list unavailable. '+fail(error),true);render();}}));
    subscriptions.push(onSnapshot(collection(db,'users',user.uid,'favorites'),{includeMetadataChanges:true},snapshot=>{
      if(session!==generation)return;
      favorites=new Set(snapshot.docs.map(item=>item.id));favoritesReady=!snapshot.metadata.fromCache;render();
    },error=>{if(session===generation){favorites=new Set();favoritesReady=false;status('Favourites unavailable. '+fail(error),true);render();}}));
  }
  render();
});
render();
