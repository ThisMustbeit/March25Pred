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
const base = await Promise.all(model.mergeVariants(CALENDRX_SIG_CATALOG.entries, CALENDRX_CS_CATALOG.entries).entries.map(async row => ({...row, id:await cloud.stableId(row.code,row.meaning), scope:'shared',revision:0})));
let user = null, shared = [], personal = [], favorites = new Set(), subscriptions = [];
let generation = 0, sharedReady = false, personalReady = false, favoritesReady = false;
let selectedTag = '', editing = null, busy = false;
const status = (text, error = false) => { $('sig-status').textContent = text; $('sig-status').classList.toggle('is-error',error); };
const isOwner = () => user?.uid === ownerUid;
const rows = () => [...cloud.combine(base,shared), ...personal.filter(row=>!row.deleted)];
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
  $('sig-count').textContent = `${filtered.length} shortcuts`;
  const list = $('sig-list'); list.replaceChildren();
  for (const row of filtered) {
    const card=document.createElement('article'); card.className='sig-entry';
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
      }
      if (isOwner() && row.scope==='personal') {
        const publish=button('Copy to shared library',()=>openEditor(row,true,'shared'));
        publish.disabled=busy || !sharedReady; actions.append(publish);
      }
    }
    card.append(actions); list.append(card);
  }
  if (!filtered.length) {
    const empty=document.createElement('p'); empty.className='sig-empty';
    empty.textContent=!user && ['personal','favorites'].includes(view)?'Sign in to see your personal shortcuts and favourites.':'No shortcuts match these filters.';
    list.append(empty);
  }
}
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
  const existing=new Set(personal.map(row=>JSON.stringify([row.code.normalize('NFKC').toLowerCase(),row.meaning])));
  let added=0;
  for(const row of incoming) {
    if(auth.currentUser?.uid!==uid) throw new Error('Import stopped because your account changed.');
    const key=JSON.stringify([row.code.normalize('NFKC').toLowerCase(),row.meaning]);
    if(existing.has(key)) continue;
    // Deterministic IDs make retrying interrupted imports safe without overwriting edits.
    const id='import_'+await cloud.stableId(row.code,row.meaning), ref=refFor('personal',id,uid);
    await runTransaction(db,async tx=>{
      if(auth.currentUser?.uid!==uid) throw new Error('Import stopped because your account changed.');
      const snapshot=await tx.get(ref);
      if(!snapshot.exists()) tx.set(ref,{...model.entry(row),deleted:false,revision:1,updatedAt:serverTimestamp()});
    });
    existing.add(key); added++;
    status(`Importing into your personal list… ${added} processed. Keep this page open.`);
  }
  return `Import complete: ${added} entries processed. Existing personal entries were preserved.`;
}
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
