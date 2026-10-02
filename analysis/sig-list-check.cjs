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
function load(catalog) {
  const ids=new Map();
  const $=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
  const context={CALENDRX_SIG_CATALOG:catalog,document:{readyState:'complete',getElementById:$,createElement:tag=>new Element(tag),body:new Element()},
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
const catalog=require('../tools/sigs/lds-data.js');
assert.equal(catalog.entries.length,568);
assert.equal(decode(JSON.stringify({version:1,entries:catalog.entries})).length,568);
assert.ok(catalog.entries.every(item=>item.tags.length===1 && item.tags[0]==='LDS'));
const pageCounts=Array(14).fill(0);
catalog.entries.forEach(item=>pageCounts[Number(item.notes.match(/page (\d+)/)[1])-1]++);
assert.deepEqual(pageCounts,[35,42,42,42,42,42,39,41,42,42,41,42,41,35]);
const byCode=new Map(catalog.entries.map(item=>[item.code,item]));
assert.equal(byCode.get('BID').meaning,'TWICE A DAY');
assert.equal(byCode.get('F7D,').meaning,'FOR 7 DAYS,');
assert.equal(byCode.get('(UD)').meaning,'(AS DIRECTED)');
assert.ok(byCode.get('LOCARABIC').meaning.includes('الأذن'));
assert.ok(byCode.get('G1.5TS').notes.includes('verify'));
assert.ok(byCode.get('INS1').notes.includes('verify'));
const migrated=model.applyCatalog([{...sample,code:'BID'}],[],catalog);
assert.equal(migrated.entries.length,568);
assert.equal(migrated.entries.find(item=>item.code==='BID').meaning,sample.meaning);
assert.equal(migrated.skipped,1);
assert.equal(model.applyCatalog(migrated.entries,migrated.catalogs,catalog).added,0);
storage.clear(); $=load(catalog);
assert.equal($('sig-count').textContent,'568 of 568 shortcuts');
$('sig-tags').children.find(button=>button.textContent==='LDS').click();
assert.equal($('sig-count').textContent,'568 of 568 shortcuts');
$('sig-search').value='weekly'; $('sig-search').events.input();
assert.ok($('sig-list').children.length>0);
$('sig-clear').click();
$('sig-list').children[0].children[0].children[1].children[1].click();
assert.equal(decode(storage.get(KEY)).length,567);
$=load(catalog);
assert.equal($('sig-count').textContent,'567 of 567 shortcuts');
console.log('Passed: empty state, CRUD, tags, multi-word search, reload persistence, backup validation/merge, undo, write failures, stale-tab protection, and corrupt-data preservation.');
console.log('Passed: all 568 LDS entries, 14 page counts, punctuation/Arabic, source notes, search/tag filtering, existing-entry preservation, and persistent catalog removal.');
