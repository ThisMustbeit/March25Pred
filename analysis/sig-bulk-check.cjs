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
  const submit=async(code,meaning,tags='Mine')=>{$('sig-add').onclick();$('sig-code').value=code;$('sig-meaning').value=meaning;$('sig-entry-tags').value=tags;$('sig-notes').value='';$('sig-form').events.submit({preventDefault(){}});await tick();};
  const cards=()=>$('sig-list').children.filter(card=>card.tag==='article');
  const codeOf=card=>card.children.find(el=>el.tag==='h3').textContent;
  const clickCard=(i,shiftKey=false)=>cards()[i].events.click({target:{closest:()=>null},shiftKey});
  const docsUnder=prefix=>[...docs].filter(([p])=>p.startsWith(prefix)).map(([p,d])=>d);
  const view=v=>{$('sig-view').value=v;$('sig-view').onchange();};
  let confirmAnswer=true; context.confirm=()=>confirmAnswer;

  // Guests get no select controls.
  assert.equal($('sig-select-bar').hidden,true);
  login('member');
  assert.equal($('sig-select-bar').hidden,false);
  for (const [code,tags] of [['AAA','Mine'],['BBB','Mine, Old'],['CCC','Old'],['DDD','']]) await submit(code,'Meaning '+code,tags);
  assert.equal(docsUnder('users/member/sigs/').length,4);

  // Select mode: checkboxes replace per-card buttons; nothing selected yet hides the action bar.
  view('personal'); $('sig-select-toggle').onclick();
  assert.ok(cards().every(card=>card.children.some(el=>el.className==='sig-check')));
  assert.ok(cards().every(card=>!card.children.some(el=>el.className==='sig-actions')));
  assert.equal($('sig-bulk').hidden,true);

  // Click, then shift-click selects a range.
  clickCard(0); clickCard(2,true);
  assert.equal($('sig-bulk-count').textContent,'3 selected');
  assert.deepEqual(cards().filter(c=>c.className.includes('is-selected')).map(codeOf),['AAA','BBB','CCC']);
  assert.equal($('sig-bulk').hidden,false);

  // Add tags keeps existing tags and skips ones already present.
  $('sig-bulk-add-tags').onclick(); $('sig-bulk-tag-input').value='Bulk, Mine'; $('sig-bulk-apply').onclick(); await tick();
  const byCode=code=>docsUnder('users/member/sigs/').find(d=>d.code===code);
  assert.deepEqual(byCode('AAA').tags,['Mine','Bulk']); assert.deepEqual(byCode('BBB').tags,['Mine','Old','Bulk']); assert.deepEqual(byCode('CCC').tags,['Old','Bulk','Mine']);
  assert.deepEqual(byCode('DDD').tags,[]); assert.match($('sig-status').textContent,/Added tags to 3 shortcuts/);
  assert.equal($('sig-bulk-panel').hidden,true);

  // Remove tags offers only tags on the selection, with counts.
  $('sig-bulk-remove-tags').onclick();
  const options=()=>$('sig-bulk-tag-options').children;
  assert.deepEqual(options().map(b=>b.textContent),['Bulk (3)','Mine (3)','Old (2)']);
  options().find(b=>b.textContent==='Old (2)').click(); $('sig-bulk-apply').onclick(); await tick();
  assert.deepEqual(byCode('BBB').tags,['Mine','Bulk']); assert.deepEqual(byCode('CCC').tags,['Bulk','Mine']);
  assert.match($('sig-status').textContent,/Removed tags from 2 shortcuts\. 1 already matched/);

  // A shortcut changed in another session is skipped, not overwritten.
  const aaaPath=[...docs].find(([p,d])=>p.startsWith('users/member/sigs/')&&d.code==='AAA')[0];
  docs.set(aaaPath,{...docs.get(aaaPath),meaning:'Edited elsewhere',revision:docs.get(aaaPath).revision+5});
  $('sig-bulk-add-tags').onclick(); $('sig-bulk-tag-input').value='Second'; $('sig-bulk-apply').onclick(); await tick();
  assert.equal(docs.get(aaaPath).meaning,'Edited elsewhere'); assert.ok(!docs.get(aaaPath).tags.includes('Second'));
  assert.ok(byCode('BBB').tags.includes('Second')); assert.match($('sig-status').textContent,/1 shortcut changed in another session and was skipped/);
  notify(); await tick();

  // Delete asks once; cancelling changes nothing; undo restores.
  confirmAnswer=false; $('sig-bulk-delete').onclick(); await tick();
  assert.equal(docsUnder('users/member/sigs/').filter(d=>d.deleted).length,0);
  confirmAnswer=true; $('sig-bulk-delete').onclick(); await tick();
  assert.equal(docsUnder('users/member/sigs/').filter(d=>d.deleted).length,3);
  assert.equal($('sig-undo').hidden,false); assert.equal(cards().length,1); assert.equal($('sig-bulk').hidden,true);
  $('sig-undo').onclick(); await tick();
  assert.equal(docsUnder('users/member/sigs/').filter(d=>d.deleted).length,0); assert.match($('sig-status').textContent,/Restored 3 shortcuts/);

  // Mixed selection as a member: shared rows are skipped for edits but can be favourited and copied.
  view('all'); $('sig-select-all').onclick();
  assert.equal($('sig-bulk-count').textContent,'5 selected'); assert.equal($('sig-bulk-copy').hidden,false);
  $('sig-bulk-add-tags').onclick(); $('sig-bulk-tag-input').value='Everyone'; $('sig-bulk-apply').onclick(); await tick();
  assert.match($('sig-status').textContent,/Skipped 1 shared shortcut you can't edit/);
  assert.ok(!docsUnder('sharedSigs/').length,'Members never write shared entries');
  $('sig-bulk-favourite').onclick(); await tick();
  assert.equal(docsUnder('users/member/favorites/').length,5);
  $('sig-bulk-unfavourite').onclick(); await tick();
  assert.equal(docsUnder('users/member/favorites/').length,0);
  $('sig-bulk-copy').onclick(); await tick();
  assert.ok(docsUnder('users/member/sigs/').some(d=>d.code==='TEST'&&d.meaning==='Shared meaning'));

  // Done clears the selection; signing out hides everything.
  $('sig-select-toggle').onclick(); assert.equal($('sig-bulk').hidden,true); assert.ok(cards().every(c=>!c.children.some(el=>el.className==='sig-check')));
  $('sig-select-toggle').onclick(); $('sig-select-all').onclick(); await $('sig-signout').onclick();
  assert.equal($('sig-bulk').hidden,true); assert.equal($('sig-select-bar').hidden,true);

  // Owner bulk edits on shared entries ask for confirmation first.
  login('owner'); view('shared'); $('sig-select-toggle').onclick(); $('sig-select-all').onclick();
  confirmAnswer=false; $('sig-bulk-add-tags').onclick(); $('sig-bulk-tag-input').value='Owner tag'; $('sig-bulk-apply').onclick(); await tick();
  assert.equal(docsUnder('sharedSigs/').length,0);
  confirmAnswer=true; $('sig-bulk-apply').onclick(); await tick();
  assert.deepEqual(docsUnder('sharedSigs/')[0].tags,['LS','Owner tag']); assert.equal(docsUnder('sharedSigs/')[0].revision,1);

  console.log('Bulk selection checks passed: select mode, shift ranges, add/remove tags, conflict skipping, delete with confirm and undo, member skips for shared entries, bulk favourites and copies, sign-out reset, owner confirmation for shared edits.');
})().catch(error=>{console.error(error);process.exitCode=1;});
