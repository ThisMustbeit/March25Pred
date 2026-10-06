const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const model = require('../tools/sigs/sigs.js');
const cloud = require('../tools/sigs/cloud-model.js');
class Element {
  constructor(tag='div'){Object.assign(this,{tag,children:[],events:{},value:'',hidden:false,disabled:false,attributes:{},classList:{toggle(){}}});}
  append(...els){this.children.push(...els);} replaceChildren(...els){this.children=els;}
  addEventListener(event,fn){this.events[event]=fn;} setAttribute(k,v){this.attributes[k]=v;}
  click(){if(!this.disabled)return this.onclick?.() || this.events.click?.();}
  querySelectorAll(){return [];} reportValidity(){return true;} reset(){} focus(){} scrollIntoView(){}
}
(async()=>{
  const ids=new Map(), $=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
  $('sig-view').value='all';
  const docs=new Map(), listeners=new Map(), storage=new Map();
  let authCallback, auth={currentUser:null}, transactionFailure=null;
  const snapshot=path=>({metadata:{fromCache:false},docs:[...docs].filter(([id])=>id.startsWith(path+'/')&&id.split('/').length===path.split('/').length+1).map(([id,data])=>({id:id.split('/').pop(),data:()=>data}))});
  function notify(){for(const [path,fn] of listeners)fn(snapshot(path));}
  const row={code:'TEST',meaning:'Shared meaning',tags:['LS'],notes:''};
  const context={console,crypto,TextEncoder,URL,Blob,setTimeout,confirm:()=>true,
    document:{getElementById:$,createElement:tag=>new Element(tag)},localStorage:{getItem:key=>storage.get(key)||null},
    CalendRxSigModel:model,CalendRxCloudModel:cloud,CALENDRX_SIG_CATALOG:{entries:[row]},CALENDRX_CS_CATALOG:{entries:[]},
    firebaseConfig:{},ownerUid:'owner',initializeApp:()=>({}),getAuth:()=>auth,getFirestore:()=>({}),setPersistence:async()=>{},browserSessionPersistence:'session',
    collection:(_, ...parts)=>parts.join('/'),doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=>123,
    onSnapshot:(path,options,fn)=>{if(typeof options==='function')fn=options;listeners.set(path,fn);fn(snapshot(path));return()=>listeners.delete(path);},
    onAuthStateChanged:(_,fn)=>{authCallback=fn;fn(null);},
    runTransaction:async(_,fn)=>{if(transactionFailure)throw transactionFailure;const pending=[];await fn({get:async ref=>({exists:()=>docs.has(ref),data:()=>docs.get(ref)}),set:(ref,data)=>pending.push(()=>docs.set(ref,data)),delete:ref=>pending.push(()=>docs.delete(ref))});pending.forEach(fn=>fn());notify();},
    signOut:async()=>{auth.currentUser=null;authCallback(null);},
    signInWithEmailAndPassword:async()=>{},createUserWithEmailAndPassword:async()=>{},sendPasswordResetEmail:async()=>{}
  };
  const source=fs.readFileSync('tools/sigs/cloud.js','utf8').replace(/^import .*;\r?\n/gm,'');
  await vm.runInNewContext(`(async()=>{${source}\n})()`,context);
  const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
  const login=uid=>{auth.currentUser={uid,email:uid+'@example.test'};authCallback(auth.currentUser);};
  const actions=()=> $('sig-list').children.flatMap(card=>card.children.filter(el=>el.className==='sig-actions').flatMap(el=>el.children));
  const clickText=text=>{const found=actions().find(el=>el.textContent===text);assert.ok(found,`Button ${text}`);found.click();};
  const submit=async(code,meaning)=>{$('sig-code').value=code;$('sig-meaning').value=meaning;$('sig-entry-tags').value='Mine';$('sig-notes').value='';$('sig-form').events.submit({preventDefault(){}});await tick();};
  assert.equal($('sig-add').disabled,true);assert.equal(actions().length,0);
  login('member');assert.equal($('sig-shared-option').hidden,true);
  assert.ok(!actions().some(el=>el.textContent==='Edit'),'Members cannot edit shared entries');
  clickText('Copy to my list');await submit('TEST','Private meaning');
  const privatePath=[...docs.keys()].find(p=>p.startsWith('users/member/sigs/'));assert.ok(privatePath);
  assert.equal(docs.get(privatePath).meaning,'Private meaning');assert.equal(docs.get(privatePath).revision,1);
  clickText('☆ Favourite');await tick();assert.ok([...docs.keys()].some(p=>p.startsWith('users/member/favorites/shared_')));
  $('sig-view').value='personal';$('sig-view').onchange();clickText('Edit');
  transactionFailure={code:'unavailable'};await submit('TEST','Offline update');
  assert.equal(docs.get(privatePath).meaning,'Private meaning');assert.match($('sig-status').textContent,/unavailable/);assert.equal($('sig-editor').hidden,false);
  transactionFailure=null;
  docs.set(privatePath,{...docs.get(privatePath),meaning:'Other session edit',revision:2});
  await submit('TEST','Stale update');assert.equal(docs.get(privatePath).meaning,'Other session edit');assert.match($('sig-status').textContent,/another session/);
  await $('sig-signout').onclick();assert.equal($('sig-list').children.length,1);assert.match($('sig-list').children[0].textContent,/Sign in/);
  login('other');assert.ok(!$('sig-list').children.some(card=>card.children.some(el=>el.textContent==='Private meaning')));
  login('owner');$('sig-view').value='shared';$('sig-view').onchange();assert.equal($('sig-shared-option').hidden,false);
  clickText('Edit');await submit('TEST','Updated shared meaning');
  const sharedPath=[...docs.keys()].find(p=>p.startsWith('sharedSigs/'));assert.ok(sharedPath);assert.equal(docs.get(sharedPath).meaning,'Updated shared meaning');
  clickText('Remove');await tick();assert.equal(docs.get(sharedPath).deleted,true);assert.equal($('sig-count').textContent,'0 shortcuts');
  const original=JSON.stringify({version:1,entries:[row,{code:'CUSTOM',meaning:'Local addition',notes:'',tags:['LS']}]});storage.set('calendrx_sig_library_v1',original);
  await $('sig-import-local').onclick();assert.equal(storage.get('calendrx_sig_library_v1'),original);
  const imported=[...docs].filter(([p])=>p.startsWith('users/owner/sigs/'));assert.equal(imported.length,1);assert.equal(imported[0][1].code,'CUSTOM');
  await $('sig-import-local').onclick();assert.equal([...docs.keys()].filter(p=>p.startsWith('users/owner/sigs/')).length,1);
  assert.equal(cloud.canEdit({uid:'member'},'owner','shared'),false);assert.equal(cloud.canEdit({uid:'owner'},'owner','shared'),true);
  console.log('Cloud UI checks passed: guest/member/owner controls, personal saves, shared edits/deletions, favourites, stale-write rejection, account isolation, browser import preservation and retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
