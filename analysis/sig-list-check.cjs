const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const model = require('../tools/sigs/sigs.js');
const {tags, entry, decode, matches, merge} = model;
assert.deepEqual(tags(' Route, route, Frequency, , '),['Route','Frequency']);
assert.throws(()=>tags({}),/Tags/);
assert.throws(()=>tags(['x'.repeat(41)]),/40/);
assert.throws(()=>entry({code:' ',meaning:'Test'}),/both/);
const sample = entry({code:' ABC ',meaning:'An expanded phrase',tags:'Group, Reference',notes:'Memo'});
assert.equal(sample.code,'ABC');
assert.ok(matches(sample,'abc phrase','group'));
assert.ok(matches(sample,'MEMO'));
assert.equal(matches(sample,'phrase','other'),false);
assert.equal(matches(sample,'no match'),false);
assert.deepEqual(decode(JSON.stringify({version:1,entries:[sample]})),[sample]);
assert.throws(()=>decode('{'),SyntaxError);
assert.throws(()=>decode(JSON.stringify({version:2,entries:[]})),/version/);
assert.throws(()=>decode(JSON.stringify({version:1,entries:[sample,{...sample,code:'abc'}]})),/duplicate/);
assert.equal(merge([sample],[{...sample,code:'abc',meaning:'Replacement'}]).entries[0].meaning,sample.meaning);
assert.equal(merge([sample],[{...sample,code:'DEF'}]).added,1);

class Element {
  constructor(tag='div') {this.tag=tag;this.children=[];this.events={};this.value='';this.hidden=false;this.disabled=false;this.attributes={};this.classList={toggle(){}};}
  addEventListener(type,fn){this.events[type]=fn;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(name,value){this.attributes[name]=value;}
  click(){if(!this.disabled) this.events.click?.({target:this});}
  focus(){}
  scrollIntoView(){}
  reset(){}
}
const source=fs.readFileSync(path.join(__dirname,'../tools/sigs/sigs.js'),'utf8');
const KEY='calendrx_sig_library_v1';
const storage = new Map();
let failWrite=false;
function load() {
  const ids=new Map();
  const $=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
  const context={document:{readyState:'complete',getElementById:$,createElement:tag=>new Element(tag),body:new Element()},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(failWrite)throw new Error('Storage full');storage.set(key,value);}},
    window:{addEventListener(){}},setTimeout,URL,Blob};
  vm.runInNewContext(source,context);
  return $;
}
function submit($,code,meaning,tagsValue='',notes='') {
  $('sig-code').value=code; $('sig-meaning').value=meaning;
  $('sig-entry-tags').value=tagsValue; $('sig-notes').value=notes;
  $('sig-form').events.submit({preventDefault(){}});
}
let $=load();
assert.equal($('sig-count').textContent,'0 of 0 shortcuts');
$('sig-add').click(); submit($,'ABC','Expanded phrase','Group, Reference','A note');
assert.equal(decode(storage.get(KEY)).length,1);
assert.equal($('sig-editor').hidden,true);
$=load(); // Reload from persistent browser storage.
assert.equal($('sig-count').textContent,'1 of 1 shortcut');
$('sig-search').value='a NOTE'; $('sig-search').events.input();
assert.equal($('sig-count').textContent,'1 of 1 shortcut');
$('sig-search').value='missing'; $('sig-search').events.input();
assert.equal($('sig-count').textContent,'0 of 1 shortcut');
$('sig-clear').click();
$('sig-tags').children.find(button=>button.textContent==='Group').click();
assert.equal($('sig-count').textContent,'1 of 1 shortcut');
let actions=$('sig-list').children[0].children[0].children[1];
actions.children[0].click(); submit($,'ABC','Updated phrase','New tag');
assert.deepEqual(decode(storage.get(KEY))[0].tags,['New tag']);
$('sig-add').click(); submit($,'abc','Duplicate');
assert.match($('sig-form-error').textContent,/already exists/);
$('sig-cancel').click();
actions=$('sig-list').children[0].children[0].children[1];
actions.children[1].click();
assert.equal(decode(storage.get(KEY)).length,0);
$('sig-undo').click(); assert.equal(decode(storage.get(KEY)).length,1);
failWrite=true; $('sig-add').click(); submit($,'DEF','Cannot save');
assert.match($('sig-form-error').textContent,/Not saved/);
assert.equal(decode(storage.get(KEY)).length,1);
failWrite=false;
storage.set(KEY,JSON.stringify({version:1,entries:[sample,{...sample,code:'OTHER'}]}));
submit($,'DEF','Stale tab'); assert.match($('sig-form-error').textContent,/another tab/);
assert.equal(decode(storage.get(KEY)).length,2);
storage.set(KEY,'broken saved data'); $=load();
assert.equal($('sig-add').disabled,true);
assert.equal(storage.get(KEY),'broken saved data');
console.log('Passed: empty state, CRUD, tags, multi-word search, reload persistence, backup validation/merge, undo, write failures, stale-tab protection, and corrupt-data preservation.');
