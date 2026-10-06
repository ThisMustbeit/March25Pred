const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../tools/patient-assistance/coverage-data.js');
const {search, groupedSearch} = require('../tools/patient-assistance/assistance.js');
const innovicares=data.products.filter(item=>item.program==='innovicares');
const rxhelp=data.products.filter(item=>item.program==='rxhelp');
assert.equal(data.products.length,260);
assert.equal(rxhelp.length,91);
assert.equal(new Set(rxhelp.map(item=>item.brand.toLowerCase())).size,91);
assert.deepEqual([1,2,3,4,5,6,7,8].map(page=>rxhelp.filter(item=>item.sourcePage===page).length),[13,12,13,13,13,13,13,1]);
assert.equal(search(rxhelp,'clarithromycin').length,2);
assert.equal(search(rxhelp,'hydroxychloroquine sulfate')[0].brand,'Plaquenil');
assert.equal(search(rxhelp,'apixaban')[0].brand,'Eliquis');
assert.equal(search(rxhelp,'Zytiga')[0].sourcePage,8);
assert.deepEqual(search(data.products,'Crestor').map(item=>item.program).sort(),['innovicares','rxhelp']);
assert.deepEqual([1,2,3].map(page=>innovicares.filter(item=>item.sourcePage===page).length),[21,28,23]);
assert.equal(new Set(innovicares.map(item=>item.brand)).size,72);
assert.ok(innovicares.every(item=>item.program==='innovicares' && item.ingredient && item.brand));
assert.equal(data.date,'2026-10-02');
assert.equal(data.province,'Nova Scotia');
assert.deepEqual(search(innovicares,'SEMAGLUTIDE').map(item=>item.brand),['Ozempic','Wegovy']);
assert.deepEqual(search(innovicares,'methylphenidate').map(item=>item.brand),['Biphentin','Concerta']);
assert.equal(search(innovicares,'doxycycline 40mg')[0].brand,'Apprilon');
assert.equal(search(innovicares,'Coversyl Plus/HD')[0].brand,'Coversyl Plus HD');
assert.equal(search(innovicares,'calcitirol')[0].brand,'Rocaltrol');
assert.equal(search(innovicares,'CGM')[0].brand,'Dexcom G7');
assert.deepEqual(search(innovicares,'Zomig').map(item=>item.brand),['Zomig','Zomig Rapimelt']);
assert.equal(search(innovicares,'quetiapine').length,2);
assert.equal(search(innovicares,'','rxhelp').length,0);
assert.equal(search(innovicares,'no such medicine').length,0);

for (const brand of ['Crestor','Concerta']) {
  const matches=groupedSearch(data.products,brand);
  assert.equal(matches.length,1);
  assert.deepEqual(matches[0].listings.map(item=>item.program),['innovicares','rxhelp']);
}
assert.equal(groupedSearch(data.products,'').length,216);
assert.equal(groupedSearch(data.products,'quetiapine').length,2);
assert.equal(groupedSearch(data.products,'Zomig').length,2);
assert.equal(groupedSearch(data.products,'methylphenidate hydrochloride')[1].listings.length,2);
assert.equal(groupedSearch(data.products,'Crestor','rxhelp')[0].listings.length,2);
assert.equal(groupedSearch(data.products,'Wegovy','rxhelp').length,0);

const apo=search(data.products,'','apoassist');
assert.equal(apo.length,16);
assert.equal(search(apo,'deferasirox').length,2);
assert.equal(groupedSearch(data.products,'abiraterone').length,3);
assert.equal(groupedSearch(data.products,'gefitinib').length,2);
assert.equal(search(apo,'teriparatide injection').length,1);
assert.equal(search(apo,'cladribine tablets').length,1);

const myrx=search(data.products,'','myrxcare');
assert.equal(myrx.length,78);
assert.equal(new Set(myrx.map(item=>item.subprogram)).size,10);
assert.equal(groupedSearch(myrx,'').length,54);
assert.equal(groupedSearch(myrx,'apremilast')[0].listings.length,4);
assert.equal(groupedSearch(myrx,'tacrolimus').length,2);
assert.equal(groupedSearch(myrx,'Inclunox').length,2);
assert.equal(search(myrx,'Cladribine')[0].brand,'Cladrabine');
assert.ok(myrx.every(item=>item.url.startsWith('https://myrx.care/en/')));

const rybelsus=groupedSearch(data.products,'Rybelsus');
assert.equal(rybelsus.length,1);
assert.equal(rybelsus[0].program,'rybelsussample');
assert.equal(data.programs.rybelsussample.url,'https://rybelsussample.ca/');
assert.equal(search(data.products,'oral semaglutide','rybelsussample').length,1);

assert.deepEqual(search(data.products,'tirzepatide').map(item=>item.brand),['Mounjaro KwikPen','Zepbound']);
for (const [brand, program] of [['Zepbound','myzepbound'],['Mounjaro','mymounjaro']]) {
  assert.equal(search(data.products,brand,program).length,1);
  assert.equal(data.programs[program].url,`https://${program}.ca/en`);
  assert.equal(data.programs[program].reference,'Reviewed October 3, 2026');
}

class Element {
  constructor(){this.children=[];this.events={};this.attributes={};this.value='';}
  append(...children){this.children.push(...children);}
  replaceChildren(){this.children=[];}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(type,fn){this.events[type]=fn;}
  focus(){this.focused=true;}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
get('assistance-program').value='all';
const source=fs.readFileSync(path.join(__dirname,'../tools/patient-assistance/assistance.js'),'utf8');
vm.runInNewContext(source,{
  CALENDRX_ASSISTANCE:data,
  document:{readyState:'complete',getElementById:get,createElement:()=>new Element()}
});
assert.equal(get('assistance-results').children.length,216);
get('assistance-search').value='semaglutide';get('assistance-search').events.input();
assert.equal(get('assistance-count').textContent,'3 of 216 drugs and products');
const card=get('assistance-results').children[0];
assert.equal(card.children[0].textContent,'Ozempic');
assert.equal(card.children[2].href,data.programs.innovicares.url);
assert.equal(card.children[2].target,'_blank');
assert.equal(card.children[2].rel,'noopener noreferrer');
assert.ok(card.children[3].textContent.includes('October 2, 2026'));
get('assistance-program').value='rxhelp';get('assistance-program').events.change();
assert.equal(get('assistance-count').textContent,'0 of 216 drugs and products');
assert.equal(get('assistance-results').children[0].children[0].textContent,'No matching products in this list');
get('assistance-search').value='apixaban';get('assistance-search').events.input();
const rxCard=get('assistance-results').children[0];
assert.equal(rxCard.children[0].textContent,'Eliquis');
assert.equal(rxCard.children[2].href,data.programs.rxhelp.url);
assert.ok(rxCard.children[3].textContent.includes('Reviewed October 2, 2026'));
get('assistance-search').value='';get('assistance-search').events.input();
assert.equal(get('assistance-results').children.length,91);
get('assistance-clear').events.click();
assert.equal(get('assistance-results').children.length,216);
assert.equal(get('assistance-search').focused,true);
get('assistance-search').value='Crestor';get('assistance-search').events.input();
assert.equal(get('assistance-results').children.length,1);
const merged=get('assistance-results').children[0];
assert.equal(merged.children[2].href,data.programs.innovicares.url);
assert.equal(merged.children[4].href,data.programs.rxhelp.url);
assert.ok(merged.children[3].textContent.includes('October 2, 2026'));
assert.ok(merged.children[5].textContent.includes('Reviewed October 2, 2026'));
get('assistance-program').value='apoassist';get('assistance-search').value='';get('assistance-program').events.change();
assert.equal(get('assistance-results').children.length,16);
const apoCard=get('assistance-results').children[0];
assert.equal(apoCard.children[2].href,'https://www.apoassist.com/en/');
assert.ok(apoCard.children[3].textContent.includes('Canada'));
assert.ok(apoCard.children[3].textContent.includes('Reviewed October 2, 2026'));
assert.ok(!apoCard.children[3].textContent.includes('undefined'));
assert.ok(!apoCard.children[3].textContent.includes('Nova Scotia'));
get('assistance-clear').events.click();
get('assistance-program').value='myrxcare';get('assistance-search').value='';get('assistance-program').events.change();
assert.equal(get('assistance-results').children.length,54);
get('assistance-search').value='apremilast';get('assistance-search').events.input();
assert.equal(get('assistance-results').children.length,1);
const myrxCard=get('assistance-results').children[0];
assert.equal(myrxCard.children[2].href,'https://myrx.care/en/sandoz');
assert.ok(myrxCard.children[2].textContent.includes('Sandoz'));
assert.equal(myrxCard.children[8].href,'https://myrx.care/en/auro');
assert.ok(myrxCard.children[3].textContent.includes('Reviewed October 2, 2026'));
get('assistance-clear').events.click();
get('assistance-search').value='<script>alert(1)</script>';get('assistance-search').events.input();
assert.equal(get('assistance-results').children[0].children[0].textContent,'No matching products in this list');
const html=fs.readFileSync(path.join(__dirname,'../tools/patient-assistance/index.html'),'utf8');
assert.ok(html.includes('/tools/access-gate.js'));
assert.ok(html.includes('/password-toggle.js'));
assert.ok(html.includes('name="description"'));
assert.ok(html.includes(data.source));
assert.ok(fs.existsSync(path.join(__dirname,'../tools/patient-assistance',data.source)));
const directory=fs.readFileSync(path.join(__dirname,'../tools/index.html'),'utf8');
assert.ok(directory.includes('href="/tools/patient-assistance/"'));
assert.ok(html.indexOf('/rxhelp-data.js') < html.indexOf('/coverage-data.js'));
assert.ok(html.includes(data.programs.rxhelp.source));
assert.ok(fs.existsSync(path.join(__dirname,'../tools/patient-assistance',data.programs.rxhelp.source)));
console.log('Passed: 260 listings merged into 216 drug/product cards across both PDFs, brand/ingredient search, formulation distinctions, program filters/links, empty states, reset, program-specific source dates/PDFs, and protected directory navigation.');
