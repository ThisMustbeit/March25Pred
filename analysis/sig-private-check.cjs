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
    CalendRxSigModel:model,CalendRxCloudModel:cloud,
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
  const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
  const login=uid=>{auth.currentUser={uid,email:uid+'@example.test'};authCallback(auth.currentUser);};
  const cards=()=>$('sig-list').children.filter(card=>card.tag==='article');
  const codes=()=>cards().map(card=>card.children.find(el=>el.tag==='h3').textContent).sort();
  const view=v=>{$('sig-view').value=v;$('sig-view').onchange();};
  const docsUnder=prefix=>[...docs].filter(([p])=>p.startsWith(prefix));
  const id=async(code,meaning)=>cloud.stableId(code,meaning);

  // Shared library as it stands today: edits of private-list entries (hash ids) plus one genuine shared addition.
  const edited={code:'PRIV1',meaning:'Original one',tags:['LS'],notes:''};
  const removed={code:'PRIV2',meaning:'Original two',tags:['CS'],notes:''};
  const plain={code:'PRIV3',meaning:'Original three',tags:['LS','CS'],notes:''};
  docs.set('sharedSigs/'+await id(edited.code,edited.meaning),{...edited,meaning:'Owner edited meaning',tags:['LS','Mine'],deleted:false,revision:2});
  docs.set('sharedSigs/'+await id(removed.code,removed.meaning),{...removed,deleted:true,revision:1});
  docs.set('sharedSigs/1f0c8e2a-1111-4c3b-9a8d-2b6f0d7e9c01',{code:'PUBLIC',meaning:'Owner added for everyone',tags:['General'],notes:'',deleted:false,revision:1});
  notify(); await tick();

  // Guests and members see only the genuine shared entry; no private-list entries or their edits.
  assert.deepEqual(codes(),['PUBLIC'],'Guest sees only the public shared entry');
  assert.equal($('sig-owner-tools').hidden,true);
  login('member'); view('all');
  assert.deepEqual(codes(),['PUBLIC'],'Member sees only the public shared entry');
  assert.equal($('sig-owner-tools').hidden,true,'Members never see the owner import');

  // Owner imports the private file: edited version kept, removed entry stays removed, the rest imported.
  login('owner'); await tick();
  assert.equal($('sig-owner-tools').hidden,false);
  const file=JSON.stringify({version:1,entries:[edited,removed,plain]});
  const pick=()=>$('sig-owner-file').onchange({target:{files:[{size:file.length,text:async()=>file}],value:''}});
  pick(); await tick(); await tick();
  const ownerDocs=docsUnder('users/owner/sigs/').map(([,d])=>d), ownerRows=ownerDocs.filter(d=>!d.deleted);
  assert.deepEqual(ownerRows.map(d=>d.code).sort(),['PRIV1','PRIV3']);
  assert.ok(ownerDocs.some(d=>d.code==='PRIV2'&&d.deleted===true),'Entries the owner removed are kept only as hidden removal markers');
  assert.equal(ownerRows.find(d=>d.code==='PRIV1').meaning,'Owner edited meaning');
  assert.deepEqual(ownerRows.find(d=>d.code==='PRIV1').tags,['LS','Mine']);
  assert.match($('sig-status').textContent,/Removed 2 earlier edits/);
  assert.deepEqual(docsUnder('sharedSigs/').map(([,d])=>d.code),['PUBLIC'],'Private-list edits are deleted from the public library');
  view('personal'); assert.deepEqual(codes(),['PRIV1','PRIV3']);

  // Running it again does not duplicate anything or bring back the original text of edited or removed entries.
  pick(); await tick(); await tick();
  assert.equal(docsUnder('users/owner/sigs/').length,3);
  assert.deepEqual(docsUnder('users/owner/sigs/').map(([,d])=>d).filter(d=>!d.deleted).map(d=>d.meaning).sort(),['Original three','Owner edited meaning']);
  view('personal'); assert.deepEqual(codes(),['PRIV1','PRIV3']);

  // Other accounts still cannot see the owner's private entries.
  login('member'); view('all');
  assert.deepEqual(codes(),['PUBLIC']);
  assert.ok(!docsUnder('users/member/sigs/').length);

  // A non-owner cannot run the private import even if the control were forced.
  const before=docsUnder('users/member/sigs/').length;
  pick(); await tick();
  assert.equal(docsUnder('users/member/sigs/').length,before);
  assert.match($('sig-status').textContent,/Only the owner account/);

  console.log('Private list checks passed: no bundled LS/CS data, hash-id edits hidden from guests and members, owner-only import keeps edits and removals, public copies deleted, re-run safe, other accounts isolated.');
})().catch(error=>{console.error(error);process.exitCode=1;});
