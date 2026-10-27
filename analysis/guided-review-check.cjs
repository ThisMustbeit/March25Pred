const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('script.js','utf8');
class El {
 constructor(){this.children=[];this.events={};this.dataset={};this.textContent='';this.value='';this.checked=false;}
 appendChild(e){this.children.push(e);return e;}replaceChildren(){this.children=[];}setAttribute(){}addEventListener(k,f){this.events[k]=f;}
 querySelector(selector){return this.children.flatMap(e=>[e,...e.all()]).find(e=>e.id===selector.slice(1));}all(){return this.children.flatMap(e=>[e,...e.all()]);}
}
const form={};for(const [name,value] of Object.entries({drugName:'Test',taperStartDate:'2026-10-20',startingDose:'50',doseChangePerStep:'10',daysPerStep:'7',totalSteps:'5',finalDose:'',tabletStrengthA:'',tabletStrengthB:'',tabletStrengthC:'',dosageForm:'tablet',solutionUnit:'ml',doseChangeDirection:'reduce',totalStepsMode:'manual'}))form[name]={value};
form.allowPartialTablets={checked:false};form.dosageForm.selectedOptions=[{textContent:'Tablets'}];
const root=new El(),rows=[];
const DOMRefs={form,previewModeInput:{value:'guided'},useCustomOverrideInput:{value:'false'},customSegmentBody:{querySelectorAll:()=>rows}};
const UISetup={getStandardTaperDriver:()=> 'totalSteps',getCustomRowFields:r=>r,getCustomSegmentDirection:()=> 'reduce',syncCustomSegmentDoseHelpers(){}};
const context=vm.createContext({DOMRefs,UISetup,DOMRenderer:{syncMobileFlow(){},renderValidationErrors(){}},document:{getElementById:()=>root,createElement:()=>new El(),body:{dataset:{},classList:{toggle(){}}}},window:{matchMedia:()=>({matches:false})}});
vm.runInContext(source.slice(0,source.indexOf('const DOMRefs ='))+source.slice(source.indexOf('const MobileFlow ='),source.indexOf('const DOMBuilders ='))+source.slice(source.indexOf('const AppController ='),source.lastIndexOf('AppController.initialize();')),context);
const run=s=>vm.runInContext(s,context);
run('AppController.render=()=>InputFactory.create().errors.length===0');form.requestSubmit=()=>run('AppController.handleGenerate({preventDefault(){}})');
for(const expected of [2,3]){run('AppController.handleGenerate({preventDefault(){}})');assert.equal(run('MobileFlow.currentStep'),expected);}
form.tabletStrengthB.value='5';
run('AppController.handleGenerate({preventDefault(){}})');assert.equal(run('MobileFlow.currentStep'),3,'Partial strengths must still require Strength A');
form.tabletStrengthA.value='50';form.tabletStrengthB.value='5';run('AppController.handleGenerate({preventDefault(){}})');assert.equal(run('MobileFlow.currentStep'),4);
run('AppController.handleGenerate({preventDefault(){}})');assert.equal(run('MobileFlow.currentStep'),5);
run('AppController.handleMobileEditInputs()');assert.equal(run('MobileFlow.currentStep'),4);
DOMRefs.useCustomOverrideInput.value='true';
const toggles=['A','B'].map(key=>({checked:true,disabled:false,dataset:{strengthKey:key}}));
rows.push({doseChangeInput:{value:'0'},daysPerStepInput:{value:'7'},repeatsInput:{value:'1'},segmentSequenceEl:{textContent:'50 mg'},segmentDateRangeEl:{textContent:'Oct 20–26'},strengthOptions:toggles.map((toggle,i)=>({querySelector:s=>s==='.segment-strength-toggle'?toggle:{textContent:i?'5 mg':'50 mg'}}))});
run('GuidedReview.render()');const checkbox=root.all().find(e=>e.type==='checkbox');assert.ok(checkbox);checkbox.checked=false;checkbox.events.change();assert.equal(toggles[0].checked,false);assert.equal(toggles[0].dataset.userSet,'true');
assert.equal(run('InputFactory.create().inputs.customSegments[0].allowedStrengthKeys.join()'),'B');
assert.equal(run('ScheduleLogic.generateScheduleRows(InputFactory.create().inputs)[0].warning'),'');
form.startingDose.value='';run('MobileFlow.setStep(2)');assert.ok(run('MobileFlow.validateCurrentStep().length')>0);
console.log('Guided setup passed: Enter progression, taper validation before strengths, required strengths, review-to-calendar, Edit Inputs, and segment strength persistence into schedule generation.');

form.startingDose.value='50';form.tabletStrengthA.value='';form.tabletStrengthB.value='';
run('MobileFlow.setStep(3)');assert.equal(run('MobileFlow.validateCurrentStep().length'),0);
assert.equal(run('InputFactory.create().inputs.doseOnly'),true);
assert.equal(run('InputFactory.create().errors.length'),0);
const doseOnly=run('ScheduleLogic.generateScheduleRows(InputFactory.create().inputs)');
assert.equal(doseOnly.length,7);assert.equal(doseOnly[0].doseMg,50);
assert.equal(doseOnly[0].allocations.length,0);assert.equal(doseOnly[0].warning,'');
assert.equal(doseOnly[0].instructionParts.tabletLines.length,0);assert.equal(doseOnly[0].printableText,'Total = 50 mg');
const summary=run('ViewModelFactory.buildSummaryItems(InputFactory.create().inputs,ScheduleLogic.generateSummary(InputFactory.create().inputs,ScheduleLogic.generateScheduleRows(InputFactory.create().inputs)),"Advanced")');
assert.ok(!summary.secondary.some(item=>/used|Warning Count/i.test(item.label)));
run('GuidedReview.render()');assert.ok(!root.all().some(el=>el.type==='checkbox'));
console.log('Dose-only checks passed: optional strengths, unchanged doses, no quantities or false allocation warnings, print instructions and review.');
