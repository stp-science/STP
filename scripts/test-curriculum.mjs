import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildCurriculumPlan,defaultPracticeIds,assertCurriculumPreserved} from '../unit-plan-builder/curriculum.js';
import {checkSources} from '../unit-plan-builder/model.js';
const c=JSON.parse(fs.readFileSync(new URL('../unit-plan-builder/science-curriculum.json',import.meta.url)));
assert.equal(c.units.length,44);assert.equal(c.units.reduce((n,u)=>n+u.knowledge.length,0),326);
const meta={title:'Test unit',duration:'12 lessons',whakatauki:'Confirmed department wording'};
for(const u of c.units){
 for(const subset of [false,true]){
 const k=subset?u.knowledge.slice(0,1):u.knowledge,p=subset?u.practices.slice(-1):u.practices;
 const sel={knowledge:k.map(s=>s.id),practices:p.map(s=>s.id)};
 const {plan,source}=buildCurriculumPlan(c,u,sel,meta);
 assert.equal(plan.year,`Year ${u.year}`);assert.equal(source.unitId,u.id);
 for(const key of ['knowledge','practices']){const actual=new Set(plan.focuses.flatMap(f=>f[key].split('\n').filter(Boolean)));assert.deepEqual(actual,new Set((key==='knowledge'?k:p).map(s=>s.text)));}
 assert.deepEqual(checkSources(plan,source).filter(s=>!s.includes('add the Ministry practice')),[]);
 for(const f of plan.focuses)for(const key of ['objectives','vocabulary','misconceptions','checks'])assert.ok(f[key]);
 const changed=structuredClone(plan);changed.focuses[0].knowledge+=' invented Ministry text';assert.throws(()=>assertCurriculumPreserved(plan,changed,source));
 const refined=structuredClone(plan);refined.focuses[0].objectives='Adapted for our class';assert.doesNotThrow(()=>assertCurriculumPreserved(plan,refined,source));
 }
 assert.ok(defaultPracticeIds(u).every(id=>u.practices.some(s=>s.id===id)));
}
const water=c.units.find(u=>u.title==='The water cycle');assert.ok(water.practices.filter(p=>defaultPracticeIds(water).includes(p.id)).every(p=>!p.text.includes('tectonic')));
const evo=c.units.find(u=>u.id==='science-y8-evolution');const result=buildCurriculumPlan(c,evo,{knowledge:evo.knowledge.map(s=>s.id),practices:evo.practices.map(s=>s.id)},meta);
assert.equal(result.plan.focuses.length,4);assert.deepEqual(checkSources(result.plan,result.source),[]);
assert.throws(()=>buildCurriculumPlan(c,evo,{knowledge:[],practices:[]},meta));
console.log('Passed: 44 topics, 326 knowledge statements, 88 full/subset drafts; exact selected text, year scope and AI edit protection.');
