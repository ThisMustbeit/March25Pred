// Node-only integration checks for tutorial navigation and cancellation.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const elements = new Map();
class Element {
  constructor(type = 'text') {
    this.type = type; this.value = ''; this.checked = false;
    this.hidden = false; this.disabled = false; this.inert = false;
    this.dataset = {}; this.events = {}; this.classes = new Set();
    this.classList = { add: x => this.classes.add(x), remove: x => this.classes.delete(x) };
  }
  addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
  dispatchEvent(event) { (this.events[event.type] || []).forEach(fn => fn(event)); }
  click() { if (!this.disabled) this.dispatchEvent({type:'click'}); }
  setAttribute() {}
  focus() { document.activeElement = this; }
  scrollIntoView() {}
  closest() { return null; }
  querySelector(selector) { return get(selector); }
  querySelectorAll(selector) { return selector === 'button' ? controls : []; }
}
function get(selector) {
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector);
}
const controls = ['exit','back','pause','next','keep'].map(name => get(`[data-tour="${name}"]`));
const button = name => get(`[data-tour="${name}"]`);
const document = { querySelector: get, getElementById: id => get('#'+id), createElement: () => new Element(), body: new Element() };
document.body.append = panel => document.panel = panel;
const selectors = ['#drug-name','#taper-start-date','#dosage-form','#tablet-strength-a','#tablet-strength-b','#starting-dose',
  '#custom-segment-body tr:first-child .segment-days-per-step',
  '#custom-segment-body tr:nth-child(2) .segment-dose-change',
  '#custom-segment-body tr:nth-child(2) .segment-days-per-step',
  '#custom-segment-body tr:nth-child(2) .segment-repeats'];
const fields = selectors.map(get);
fields.forEach((field,i) => field.type = i === 0 ? 'text' : i === 1 ? 'date' : i === 2 ? 'select-one' : 'number');
const snapshot = () => fields.map(field => field.value);
const form = new Element(); form.querySelectorAll = () => fields;
form.totalSteps = new Element();
const DOMRefs = {form, customSegmentBody: new Element(), previewModeInput: get('#preview'), useCustomOverrideInput: get('#advanced'), results: get('#results')};
let generated = 0;
const MobileFlow = {currentStep:2, setStep(step) {this.currentStep = step;}};
const UISetup = {
  applyFormDefaults() { fields.forEach(field => field.value = ''); },
  setPreviewMode(mode) {DOMRefs.previewModeInput.value = mode;},
  applyImportedConfiguration(values) {values.forEach((value,i) => fields[i].value = value);},
};
for (const name of ['syncMedicationLabels','syncDoseChangeDirectionButtons','syncCustomOverrideVisibility','syncCustomSegmentDoseHelpers','syncInputUnitAffixes']) UISetup[name] = () => {};
get('#taper-mode-advanced').addEventListener('click', () => DOMRefs.useCustomOverrideInput.value = 'true');
const app = fs.readFileSync(path.join(root,'script.js'),'utf8');
const engine = vm.createContext({});
vm.runInContext(app.slice(0,app.indexOf('const DOMRefs =')),engine);
function generate() {
  assert.equal(DOMRefs.useCustomOverrideInput.value,'true');
  const values = snapshot();
  assert.deepEqual(values.slice(0,1),['Prednisone']);
  assert.deepEqual(values.slice(2),['tablet','50','5','50','7','10','7','5']);
  // Run the tutorial values through the actual schedule engine.
  const result = vm.runInContext(`(() => {
    const inputs = {drugName:'Prednisone', dosageForm:'tablet', solutionUnit:'ml', taperStartDate:new Date(2026,9,1),
      startingDose:50, minDoseClamp:0, maxDoseClamp:1000, useCustomOverride:true, daysPerStep:7,
      strengths:[{key:'A',value:50},{key:'B',value:5}], allowPartialTablets:false,
      customSegments:[{doseChange:0,daysPerStep:7,repeats:1},{doseChange:-10,daysPerStep:7,repeats:5}]};
    const rows = ScheduleLogic.generateScheduleRows(inputs);
    return {count:rows.length, doses:rows.filter((_,i) => i%7===0).map(row=>row.doseMg), warnings:rows.filter(row=>row.warning).length};
  })()`,engine);
  assert.equal(result.count,35);
  assert.equal(JSON.stringify(result.doses),'[50,40,30,20,10]');
  assert.equal(result.warnings,0);
  generated++; MobileFlow.setStep(4);
}
const motion = {matches:true};
const context = {document, DOMRefs, MobileFlow, UISetup, APP_CONFIG:{defaults:{taper:{}}},
  DateUtils:{toDateInputValue: () => '2026-10-01'}, ConfigCode:{captureCurrentState:snapshot}, UIState:{},
  AppController:{handleMobileStepNext:generate, render:()=>{}},
  DOMRenderer:{clearResults:()=>{}, renderValidationErrors:()=>{}},
  window:{matchMedia:()=>motion, scrollY:100, scrollTo:()=>{}},
  setTimeout:callback=>setTimeout(callback,1), Event:class {constructor(type){this.type=type;}}
};
vm.runInNewContext(fs.readFileSync(path.join(root,'tutorial.js'),'utf8'),context);
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function settled() {
  for(let i=0;i<300 && button('next').disabled;i++) await sleep(2);
  assert.equal(button('next').disabled,false,'tutorial did not settle');
}
async function next() {button('next').click(); await settled();}
(async()=>{
  fields[0].value='Original medication'; fields[3].value='12.5';
  DOMRefs.previewModeInput.value='full';
  const original=snapshot();
  get('#tutorial-button').click(); await settled();
  assert.equal(get('.app-shell').inert,true);
  await next(); assert.equal(fields[0].value,'Prednisone');
  button('back').click(); await settled(); assert.equal(fields[0].value,'');
  for(let i=0;i<9;i++) await next();
  assert.equal(generated,1); assert.equal(button('keep').hidden,false);
  button('exit').click();
  assert.deepEqual(snapshot(),original);
  assert.equal(MobileFlow.currentStep,2);
  assert.equal(DOMRefs.previewModeInput.value,'full');
  assert.equal(get('.app-shell').inert,false);
  assert.equal(document.panel.hidden,true);
  // Exit during a paused animation must cancel all pending writes.
  motion.matches=false;
  get('#tutorial-button').click(); await settled();
  button('next').click(); button('pause').click();
  await sleep(30); assert.equal(fields[0].value,'');
  button('exit').click(); await sleep(40);
  assert.deepEqual(snapshot(),original);
  // Resume and keep the completed example.
  motion.matches=true;
  get('#tutorial-button').click(); await settled();
  button('next').click(); button('pause').click();
  await sleep(10); button('pause').click(); await settled();
  for(let i=1;i<9;i++) await next();
  button('keep').click();
  assert.equal(fields[0].value,'Prednisone');
  assert.equal(MobileFlow.currentStep,4);
  assert.equal(document.panel.hidden,true);
  console.log('Passed: all tutorial steps, real schedule generation, Back replay, Pause/Resume, cancellation, restore, and Keep example.');
})().catch(error=>{console.error(error);process.exitCode=1;});
