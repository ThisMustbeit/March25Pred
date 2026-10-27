const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.style = {}; this.attributes = {}; this.events = {}; }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(event, callback) { this.events[event] = callback; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...((selector === '.print-preview-paper' && child.className === 'print-preview-paper') || selector === child.tag ? [child] : []),
      ...child.querySelectorAll(selector)
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
}
const ids = new Map();
const get = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
const pages = get('print-preview-pages'); pages.clientWidth = 1096;
const zoom = get('print-preview-zoom'); zoom.value = 'fit';
const source = get('print-calendar-root');
let months = ['October 2026', 'November 2026'].map(name => ({
  outerHTML: `<section class="print-month"><div class="print-page">${name}</div></section>`,
  querySelector: () => ({textContent:name})
}));
source.innerHTML = months.map(month => month.outerHTML).join('');
source.querySelectorAll = () => months;
const mainLayout = {value:'landscape'};
const observers = [];
let resize, printed = 0;
const context = {
  URL, Html:{escape:value => value.replaceAll('&','&amp;').replaceAll('"','&quot;')},
  document:{baseURI:'https://example.test/planner/', body:new Element(), getElementById:get, createElement:tag=>new Element(tag)},
  DOMRefs:{printLayoutSelect:mainLayout},
  DOMRenderer:{syncPrintLayoutControls:origin => {assert.equal(origin,'preview'); mainLayout.value=get('preview-print-layout').value;}},
  AppController:{handlePrint:()=>printed++},
  MutationObserver:class {constructor(callback){observers.push(callback);} observe(){}},
  ResizeObserver:class {constructor(callback){resize=callback;} observe(){}}
};
vm.runInNewContext(fs.readFileSync(path.join(root,'print-preview.js'),'utf8'),context);
const frames = () => pages.querySelectorAll('iframe');
assert.equal(frames().length,2);
assert.equal(frames()[0].style.width,'1056px');
assert.equal(frames()[0].style.height,'816px');
assert.equal(frames()[0].style.transform,'scale(1)');
assert.ok(frames()[0].srcdoc.includes(months[0].outerHTML));
assert.ok(frames()[0].srcdoc.includes('https://example.test/planner/print-calendar.css'));
assert.equal(frames()[0].attributes.sandbox,'');
assert.equal(get('print-preview-status').textContent,'2 pages · Letter · Landscape');
get('preview-print-layout').value='portrait';
get('preview-print-layout').events.change(); observers[1]();
assert.equal(frames()[0].style.width,'816px');
assert.equal(frames()[0].style.height,'1056px');
assert.ok(frames()[0].srcdoc.includes('print-layout-portrait'));
pages.clientWidth=360; resize();
assert.ok(parseFloat(pages.querySelector('.print-preview-paper').style.width)<=320);
zoom.value='1.25'; zoom.events.change();
assert.equal(frames()[0].style.transform,'scale(1.25)');
assert.equal(pages.querySelector('.print-preview-paper').style.width,'1020px');
mainLayout.value='landscape'; observers[1]();
assert.equal(get('preview-print-layout').value,'landscape');
get('preview-print-button').events.click(); assert.equal(printed,1);
months=months.slice(0,1); source.innerHTML=months[0].outerHTML; observers[0]();
assert.equal(frames().length,1);
assert.equal(get('print-preview-status').textContent,'1 page · Letter · Landscape');
months=[]; source.innerHTML=''; observers[0](); assert.equal(frames().length,0);
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.indexOf('summary-card') < html.indexOf('print-preview-card'));
assert.ok(html.indexOf('print-preview-card') < html.indexOf('card calendar-card'));
assert.match(html, /href="print-calendar.css" media="print"/);
assert.match(html, /print-preview-card no-print/);
const css=fs.readFileSync(path.join(root,'print-calendar.css'),'utf8');
assert.match(css,/width: 7.1in/); assert.match(css,/width: 10.25in/);
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
console.log('Passed: identical print markup, shared stylesheet, portrait/landscape, mobile fit, zoom, regeneration, clearing, Print action, and section placement.');
