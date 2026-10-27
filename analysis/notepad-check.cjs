const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(){Object.assign(this,{children:[],events:{},value:'',checked:false,hidden:false,disabled:false,classList:{toggle(){}}});}
 append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}
 addEventListener(e,fn){this.events[e]=fn;}setAttribute(){}focus(){}click(){if(!this.disabled)return this.onclick?.();}querySelector(){return new Element();}
}
(async()=>{
 const ids=new Map(),$=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
 const docs=new Map(),listeners=new Map();let authCallback,auth={currentUser:null},failure=null,download='';
 const snapshot=path=>({metadata:{fromCache:false},docs:[...docs].filter(([p])=>p.startsWith(path+'/')&&p.split('/').length===path.split('/').length+1).map(([p,row])=>({id:p.split('/').pop(),data:()=>row}))});
 const notify=()=>{for(const [path,fn] of listeners)fn(snapshot(path));};
 const ctx={console,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,confirm:()=>true,prompt:()=> 'Reference',
  document:{getElementById:$,createElement:()=>new Element()},window:{addEventListener(){}},Blob,URL:{createObjectURL:blob=>{download=blob;return 'blob:test';},revokeObjectURL(){}},
  firebaseConfig:{},ownerUid:'owner',initializeApp:()=>({}),getAuth:()=>auth,getFirestore:()=>({}),setPersistence:async()=>{},browserSessionPersistence:'session',
  collection:(_, ...p)=>p.join('/'),doc:(_, ...p)=>p.join('/'),serverTimestamp:()=>123,
  onSnapshot:(path,options,fn)=>{listeners.set(path,fn);fn(snapshot(path));return()=>listeners.delete(path);},
  onAuthStateChanged:(_,fn)=>{authCallback=fn;fn(null);},signOut:async()=>{auth.currentUser=null;authCallback(null);},signInWithEmailAndPassword:async()=>{},
  runTransaction:async(_,fn)=>{if(failure)throw failure;const writes=[];await fn({get:async ref=>({exists:()=>docs.has(ref),data:()=>docs.get(ref)}),set:(ref,row)=>writes.push(()=>docs.set(ref,row))});writes.forEach(fn=>fn());notify();}
 };
 const source=fs.readFileSync('tools/notepad/notepad.js','utf8').replace(/^import .*;\r?\n/gm,'');await vm.runInNewContext(`(async()=>{${source}\n})()`,ctx);
 const login=uid=>{auth.currentUser={uid,email:uid+'@test.example'};authCallback(auth.currentUser);};
 const tick=()=>new Promise(r=>setTimeout(r,20));
 const type=(id,text)=>{$(id).value=text;$(id).events.input();};
 const save=async()=>{$('editor').onsubmit({preventDefault(){}});await tick();};
 const switchTo=async scope=>{$('notebook-scope').value=scope;await $('notebook-scope').onchange();};
 assert.equal($('workspace').hidden,true);login('member');assert.equal($('workspace').hidden,false);
 await $('new-section').onclick();const privatePath=[...docs.keys()][0];assert.match(privatePath,/users\/member\/notebookPages\//);assert.equal(docs.get(privatePath).section,'Reference');
 type('title','My first note');type('body','Private content');await save();assert.equal(docs.get(privatePath).body,'Private content');assert.match($('save-state').textContent,/Saved/);
 type('body','Autosaved content');await new Promise(r=>setTimeout(r,1100));assert.equal(docs.get(privatePath).body,'Autosaved content');
 failure={code:'unavailable'};type('body','Offline draft');await switchTo('shared');assert.equal($('notebook-scope').value,'personal');assert.equal($('body').value,'Offline draft');assert.match($('save-state').textContent,/Connection/);
 failure=null;await save();
 type('body','My stale draft');docs.set(privatePath,{...docs.get(privatePath),body:'Remote revision',revision:docs.get(privatePath).revision+1});notify();await save();assert.equal(docs.get(privatePath).body,'Remote revision');assert.equal($('body').value,'My stale draft');assert.match($('save-state').textContent,/another session/);
 $('export').onclick();assert.match(await download.text(),/My stale draft/);
 $('reload').onclick();await tick();assert.equal($('body').value,'Remote revision');
 await $('remove').onclick();assert.equal(docs.get(privatePath).deleted,true);$('trash').checked=true;$('trash').onchange();await $('page-list').children[0].onclick();assert.equal($('remove').textContent,'Restore page');await $('remove').onclick();assert.equal(docs.get(privatePath).deleted,false);
 await switchTo('shared');assert.equal($('new-page').disabled,true);assert.equal($('save').hidden,true);
 login('owner');await switchTo('shared');await $('new-page').onclick();type('title','Shared guidance');type('body','Everyone can read');await save();const sharedPath=[...docs.keys()].find(p=>p.startsWith('sharedNotebookPages/'));assert.ok(sharedPath);
 login('member');await switchTo('shared');await $('page-list').children[0].onclick();assert.equal($('body').value,'Everyone can read');assert.equal($('body').readOnly,true);assert.equal($('remove').hidden,true);
 login('other');assert.equal($('body').value,'');assert.equal($('page-count').textContent,'0 pages');assert.ok(![...listeners.keys()].some(p=>p.includes('member')));
 await $('signout').onclick();assert.equal($('workspace').hidden,true);assert.equal($('body').value,'');
 console.log('Notebook checks passed: private isolation, owner-only shared UI, sections, autosave, offline draft preservation, conflict rejection, draft export, trash/restore, scope switching and sign-out.');
})().catch(error=>{console.error(error);process.exitCode=1;});
