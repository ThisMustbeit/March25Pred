import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig, ownerUid } from '../sigs/firebase-config.js';

const $=id=>document.getElementById(id);
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
await setPersistence(auth,browserSessionPersistence);
let user=null, scope='personal', pages=[], selected=null, revision=0, ready=false;
let dirty=false, editVersion=0, timer=null, pending=null, stop=null, epoch=0;
const canEdit=()=>Boolean(user && (scope==='personal'||user.uid===ownerUid));
const path=()=>scope==='shared'?['sharedNotebookPages']:['users',user.uid,'notebookPages'];
const say=(id,text,error=false)=>{$(id).textContent=text;$(id).classList.toggle('is-error',error);};
const errorText=error=>error.code==='permission-denied'?'Access denied. Publish the updated Firestore rules, then reload.':error.code==='unavailable'?'Connection unavailable. Your changes are still on this page; retry Save now before leaving.':error.code==='auth/invalid-credential'?'The email or password is incorrect.':error.message||'Unable to connect. Please try again.';
function button(text,action){const b=document.createElement('button');b.type='button';b.className='note-page';b.textContent=text;b.onclick=action;return b;}
function draft(){return {title:$('title').value.trim(),section:$('section').value.trim(),body:$('body').value,pinned:$('pinned').checked,deleted:false};}
function validate(row){
  if(!row.title||row.title.length>160)throw new Error('Enter a page title (up to 160 characters).');
  if(!row.section||row.section.length>80)throw new Error('Enter a section name (up to 80 characters).');
  if(row.body.length>100000)throw new Error('A page can contain up to 100,000 characters. Split this note into pages.');
  return row;
}
function fields(row){
  $('title').value=row.title;$('section').value=row.section;$('body').value=row.body;$('pinned').checked=row.pinned;
  wordCount();
}
function wordCount(){const text=$('body').value.trim();$('word-count').textContent=`${text?text.split(/\s+/).length:0} words · ${$('body').value.length.toLocaleString()} / 100,000 characters`;}
function controls(){
  const row=pages.find(p=>p.id===selected), editable=canEdit()&&!row?.deleted;
  for(const id of ['new-page','new-section'])$(id).disabled=!canEdit()||!ready||Boolean(pending);
  for(const id of ['title','section','body'])$(id).readOnly=!editable;
  $('pinned').disabled=!editable;
  $('save').hidden=!editable;$('save').disabled=!ready||Boolean(pending);
  $('reload').disabled=Boolean(pending);
  $('remove').hidden=!canEdit();$('remove').disabled=!ready||Boolean(pending);
  $('remove').textContent=row?.deleted?'Restore page':'Move to trash';
  $('scope-help').textContent=scope==='personal'?'Only you can read and edit this notebook. Changes save automatically after you pause typing.':canEdit()?'You are editing the shared notebook. Saved changes are visible to all signed-in users.':'This shared notebook is maintained by the owner. You can read and export its pages.';
}
function render(){
  controls();
  const sections=[...new Set(pages.filter(p=>!p.deleted).map(p=>p.section))].sort((a,b)=>a.localeCompare(b));
  const current=$('section-filter').value;$('section-filter').replaceChildren();$('section-options').replaceChildren();
  for(const name of ['',...sections]){const op=document.createElement('option');op.value=name;op.textContent=name||'All sections';$('section-filter').append(op);if(name){const hint=document.createElement('option');hint.value=name;$('section-options').append(hint);}}
  $('section-filter').value=sections.includes(current)?current:'';
  const query=$('search').value.toLocaleLowerCase().trim().split(/\s+/);
  const visible=pages.filter(p=>p.deleted===$('trash').checked && (!$('section-filter').value||p.section===$('section-filter').value) && query.every(word=>[p.title,p.body,p.section].join(' ').toLocaleLowerCase().includes(word)))
    .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.section.localeCompare(b.section)||a.title.localeCompare(b.title));
  $('page-count').textContent=`${visible.length} ${$('trash').checked?'trashed ':''}pages`;
  $('page-list').replaceChildren();
  for(const page of visible){const b=button(`${page.pinned?'★ ':''}${page.title}`,()=>selectPage(page.id));b.setAttribute('aria-current',String(page.id===selected));const small=document.createElement('small');small.textContent=page.section;b.append(small);$('page-list').append(b);}
  if(!visible.length){const p=document.createElement('p');p.textContent='No pages match this view.';$('page-list').append(p);}
}
function clearEditor(){selected=null;dirty=false;revision=0;editVersion++;clearTimeout(timer);$('editor').hidden=true;$('empty-editor').hidden=false;fields({title:'',section:'',body:'',pinned:false});say('save-state','');}
async function write(id,row,expected,session,parts){
  const uid=user?.uid;
  if(!canEdit()||!ready)throw new Error('Wait for the notebook to connect before saving.');
  validate(row);
  await runTransaction(db,async tx=>{
    if(epoch!==session||auth.currentUser?.uid!==uid)throw new Error('Your account or notebook changed.');
    const ref=doc(db,...parts,id), snapshot=await tx.get(ref);
    if((snapshot.exists()?snapshot.data().revision:0)!==expected)throw new Error('This page changed in another session. Export your draft if needed, then use Reload saved page before editing again.');
    tx.set(ref,{...row,revision:expected+1,updatedAt:serverTimestamp()});
  });
}
async function save(){
  clearTimeout(timer);
  if(pending){const success=await pending;return success?save():false;}
  if(!dirty)return true;
  if(!selected||!canEdit())return false;
  const session=epoch,id=selected,version=editVersion,expected=revision,parts=path();
  let row;try{row=validate(draft());}catch(error){say('save-state',errorText(error),true);return false;}
  say('save-state','Saving…');
  const operation=(async()=>{
    try{
      await write(id,row,expected,session,parts);
      if(epoch!==session||selected!==id)return false;
      revision=expected+1;dirty=editVersion!==version;
      say('save-state',dirty?'Unsaved changes…':'Saved to Firebase.');
      if(dirty)timer=setTimeout(()=>save(),1000);
      return true;
    }catch(error){if(epoch===session)say('save-state',errorText(error),true);return false;}
  })();
  pending=operation;controls();
  const success=await operation;
  if(pending===operation)pending=null;
  if(epoch===session){controls();if(success&&dirty)return save();}
  return success;
}
async function selectPage(id){
  const session=epoch;if(!await save()||session!==epoch)return;
  const page=pages.find(p=>p.id===id);if(!page)return;
  selected=id;revision=page.revision;dirty=false;fields(page);
  $('editor').hidden=false;$('empty-editor').hidden=true;say('save-state',page.deleted?'In trash. Restore this page to edit it.':'');render();
}
async function createPage(newSection=false){
  const session=epoch;if(!canEdit()||!ready||!await save()||session!==epoch)return;
  let section=$('section-filter').value||'General';
  if(newSection){const name=prompt('New section name');if(name===null)return;section=name.trim();if(!section)return;}
  const id=crypto.randomUUID(),row={title:newSection?'New section notes':'Untitled page',section,body:'',pinned:false,deleted:false};
  try{await write(id,row,0,session,path());if(session!==epoch)return;
    if(!pages.some(p=>p.id===id))pages.push({...row,id,revision:1});
    $('trash').checked=false;$('search').value='';$('section-filter').value='';await selectPage(id);$('title').focus();
  }catch(error){if(session===epoch)say('sync-state',errorText(error),true);}
}
function subscribe(){
  if(stop)stop();stop=null;epoch++;const session=epoch;ready=false;pages=[];pending=null;clearEditor();render();
  if(!user)return;
  say('sync-state','Connecting to your notebook…');
  stop=onSnapshot(collection(db,...path()),{includeMetadataChanges:true},snapshot=>{
    if(session!==epoch)return;
    pages=snapshot.docs.map(item=>({...item.data(),id:item.id}));ready=!snapshot.metadata.fromCache;
    const page=pages.find(p=>p.id===selected);
    if(selected&&!dirty&&!pending){if(page){revision=page.revision;fields(page);}else clearEditor();}
    say('sync-state',ready?'Notebook connected.':'Offline: showing available pages. Changes cannot save until connected.');render();
  },error=>{if(session!==epoch)return;ready=false;if(error.code==='permission-denied'){pages=[];clearEditor();}say('sync-state',errorText(error),true);render();});
}
for(const id of ['title','section','body','pinned'])$(id).addEventListener('input',()=>{
  if(!canEdit()||!selected)return;dirty=true;editVersion++;wordCount();say('save-state','Unsaved changes…');clearTimeout(timer);timer=setTimeout(()=>save(),1000);
});
$('editor').onsubmit=event=>{event.preventDefault();save();};
$('reload').onclick=()=>{if(dirty&&!confirm('Discard the unsaved draft and reload the saved page?'))return;dirty=false;clearTimeout(timer);if(selected)selectPage(selected);};
$('remove').onclick=async()=>{
  const session=epoch;if(!canEdit()||!selected||!await save()||session!==epoch)return;
  const page=pages.find(p=>p.id===selected);if(!page)return;
  if(!page.deleted&&!confirm(`Move “${page.title}” to trash${scope==='shared'?' for everyone':''}?`))return;
  const row={title:page.title,section:page.section,body:page.body,pinned:page.pinned,deleted:!page.deleted};
  try{await write(page.id,row,page.revision,session,path());if(session===epoch){clearEditor();render();}}
  catch(error){if(session===epoch)say('save-state',errorText(error),true);}
};
$('new-page').onclick=()=>createPage();$('new-section').onclick=()=>createPage(true);
$('search').oninput=render;$('section-filter').onchange=render;$('trash').onchange=render;
$('notebook-scope').onchange=async()=>{
  const next=$('notebook-scope').value,session=epoch;$('notebook-scope').value=scope;
  if(!await save()||session!==epoch)return;
  scope=next;$('notebook-scope').value=scope;$('section-filter').value='';$('search').value='';$('trash').checked=false;subscribe();
};
$('export').onclick=()=>{
  const exported=pages.filter(p=>!p.deleted).map(p=>p.id===selected&&dirty?{...p,...draft()}:p);
  const text=`# ${scope==='personal'?'My private':'Shared'} notebook\n\n`+exported.sort((a,b)=>a.section.localeCompare(b.section)||a.title.localeCompare(b.title)).map(p=>`## ${p.section} / ${p.title}\n\n${p.body}\n`).join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`calendrx-${scope}-notebook.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('show-password').onchange=()=>{$('password').type=$('show-password').checked?'text':'password';};
$('login').onsubmit=async event=>{
  event.preventDefault();const submit=$('login').querySelector('button');submit.disabled=true;say('auth-status','Signing in…');
  try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';say('auth-status','');}
  catch(error){say('auth-status',errorText(error),true);}finally{submit.disabled=false;}
};
$('signout').onclick=async()=>{if(!await save())return;try{await signOut(auth);}catch(error){say('auth-status',errorText(error),true);}};
window.addEventListener('beforeunload',event=>{if(dirty||pending){event.preventDefault();event.returnValue='';}});
onAuthStateChanged(auth,next=>{
  user=next;scope='personal';$('notebook-scope').value=scope;
  $('login').hidden=Boolean(user);$('signout').hidden=!user;$('workspace').hidden=!user;
  say('account-state',user?`Signed in as ${user.email}${user.uid===ownerUid?' · Owner':''}`:'Sign in to open your private notebook and the shared reference notebook.');
  subscribe();
});
