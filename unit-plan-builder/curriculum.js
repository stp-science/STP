import {emptyFocus,validatePlan} from './model.js';
const join=items=>items.map(s=>s.text).join('\n');
const words=s=>s.toLowerCase().match(/[a-zāēīōū]{4,}/g)||[];
const stop=new Set(words('this that from with have their them into these those through about between different using developing evidence science scientific understanding explaining investigate investigation process processes common provided identify determine describe'));
export function defaultPracticeIds(unit){
 const curated={'Mixtures':[0,2,3],'Concentration and solubility':[1],'Identification tests for common substances':[3,4],'Motion and forces':[0,1,2,3,6],'Pressure in fluids':[2]};
 if(curated[unit.title])return curated[unit.title].map(i=>unit.practices[i].id);
 const keys=new Set(words(unit.title+' '+unit.knowledge.map(s=>s.text).join(' ')).filter(s=>!stop.has(s)));
 const relevant=unit.practices.filter(s=>words(s.text).filter(w=>keys.has(w)).length>=2);
 return (relevant.length?relevant:unit.practices.slice(0,1)).map(s=>s.id);
}
const evoGroups=[
 ['Evidence and common ancestry',[0,1,11],[0,1],'Use fossil features, shared traits and DNA evidence to support an explanation of common ancestry.','Evidence; infer; justify','Fossil; extinct; common ancestor; DNA','A fossil is always a bone; organisms alive today are unchanged ancestors of other living species.','Give students unfamiliar fossil images. Ask them to infer structure and environment, then distinguish an observation from an inference.'],
 ['Variation and selection pressures',[2,3,4],[0],'Distinguish variation from heritable variation and identify a selection pressure in a named population.','Variation; distinguish; influence','Trait; heritable; selection pressure; population','All variation can be inherited; an organism develops a useful inherited trait because it needs it.','Compare inherited and acquired examples. Ask which could affect the next generation and why.'],
 ['Natural selection over generations',[5,6,7,8],[0],'Explain how a selection pressure changes the frequency of a heritable trait over generations; locate Darwin and Wallace in the development of the explanation.','Frequency; sequence; explain','Natural selection; reproduction; generation; evolution','Individuals evolve during their lifetime; natural selection gives every organism the traits it needs.','Use a simple population model over three generations. Ask students to explain who reproduces and how the population changes, without using “needed to”.'],
 ['New species and extinction',[9,10],[2],'Use shared ancestry and environmental change to explain how lineages may diverge or become extinct.','Accumulate; contrast; consequence','Species; speciation; extinction; ancestor','Every species can adapt quickly enough to survive any environmental change.','Compare a branching ancestry diagram with an extinction case. Ask students to justify what each can and cannot show.']
];
export function buildCurriculumPlan(catalogue,unit,selection,meta){
 const ks=unit.knowledge.filter(s=>selection.knowledge.includes(s.id)),ps=unit.practices.filter(s=>selection.practices.includes(s.id));
 if(!ks.length||!ps.length)throw Error('Select at least one knowledge statement and one practice statement.');
 const selectedK=new Set(ks.map(s=>s.id)),selectedP=new Set(ps.map(s=>s.id));
 let groups;
 if(unit.id==='science-y8-evolution') groups=evoGroups.map(([title,ki,pi,...teaching])=>({title,k:ki.map(i=>unit.knowledge[i]).filter(s=>selectedK.has(s.id)),p:pi.map(i=>unit.practices[i]).filter(s=>selectedP.has(s.id)),teaching})).filter(g=>g.k.length);
 else {const count=Math.ceil(ks.length/4);groups=Array.from({length:count},(_,i)=>({title:count===1?unit.title:`${unit.title} · ${i+1}`,k:ks.slice(i*4,i*4+4),p:ps.filter((_,j)=>j%count===i)}));}
 // Each selected practice is retained even when a knowledge subset removes its usual focus.
 for(const p of ps)if(!groups.some(g=>g.p.some(s=>s.id===p.id)))groups[groups.length-1].p.push(p);
 const topicTerms=[...new Set(words(unit.title))].filter(w=>!stop.has(w));
 const focuses=groups.map((g,i)=>{
  const f=emptyFocus(g.title);f.knowledge=join(g.k);f.practices=join(g.p);
  if(g.teaching&&g.k.length===evoGroups.find(x=>x[0]===g.title)[1].length){const [obj,t2,t3,mis,check]=g.teaching;f.objectives=obj;f.vocabulary=`Tier 2: ${t2}.\nTier 3: ${t3}.`;f.misconceptions=mis;f.checks=check;}
  else {f.objectives=g.k.map(s=>`Explain in your own words, using an example or annotated model: ${s.text}`).join('\n');
   f.vocabulary=`Tier 2: evidence; explain; compare; justify.\nTier 3: ${topicTerms.join('; ')}. Identify and define additional disciplinary terms in the selected statements.`;
   f.misconceptions='Elicit students’ initial explanations before teaching. Check for overgeneralisation from one example and confusion between an observation and an explanation.';
   f.checks=`Ask students to explain one of the ${g.k.length} selected ideas using a new example. Check accuracy, vocabulary and the link between evidence and explanation; use the response to plan reteaching.`;}
  f.priorities='';
  return f;
 });
 const pages=[...new Set([...ks,...ps].map(s=>s.page))].sort((a,b)=>a-b);
 const source={documentId:catalogue.documentId,unitId:unit.id,title:`${catalogue.title}, ${catalogue.version}, Year ${unit.year}, pp. ${pages.join(', ')}`,url:catalogue.ministryUrl,mirrorUrl:catalogue.mirrorUrl,knowledge:join(ks),practices:join(ps),knowledgeIds:ks.map(s=>s.id),practiceIds:ps.map(s=>s.id),pages,year:unit.year,license:catalogue.license};
 const evolution=unit.id==='science-y8-evolution';
 const plan={...meta,subject:'Science',year:`Year ${unit.year}`,phase:`Phase ${unit.phase}`,title:meta.title||unit.title,duration:meta.duration||'',whakatauki:meta.whakatauki||'',
  purpose:evolution&&ks.length===unit.knowledge.length?'Explain how evidence supports evolution and how heritable variation, selection pressures and reproduction can change populations over generations.':`Develop a scientifically accurate explanation of ${unit.title.toLowerCase()} through the selected curriculum knowledge and practices. Use examples, models and evidence to make thinking visible.`,
  prior:evolution?'Elicit prior ideas about traits, inheritance, fossils, adaptations and environmental change. Check students can distinguish an individual from a population.':'Use a short diagnostic discussion, drawing or concept map to identify students’ existing ideas about '+unit.title.toLowerCase()+'. Revisit prerequisite vocabulary and models before extending the explanation.',
  future:evolution?'Use these ideas as a foundation for deeper study of inheritance, biodiversity and evidence for relationships between organisms. Confirm later sequencing with the department.':`Revisit the ${unit.title.toLowerCase()} model in later Science learning. Agree the next step with the department after checking diagnostic and end-point evidence.`,
  knowledgeSummary:`${ks.length} selected Ministry knowledge statements, organised into ${focuses.length} learning focuses: ${focuses.map(f=>f.title).join('; ')}.`,
  practicesSummary:ps.map(s=>`${s.category}: ${s.text}`).join('\n'),
  resources:`Ministry of Education. ${source.title}.\n${source.url}\nPDF download mirror: ${source.mirrorUrl}\n${catalogue.license}\nTeacher preparation: select age-appropriate examples and models for each focus; prepare a diagnostic task and an unfamiliar transfer task. Check practical requirements before teaching.`,
  assessment:evolution&&ks.length===unit.knowledge.length?'Students explain a change in trait frequency in an unfamiliar population across several generations. They connect heritable variation, a named selection pressure, differential reproduction and population change, and use evidence to support the explanation. Include a fossil inference or extinction example relevant to the selected focuses.':`Students explain ${unit.title.toLowerCase()} in an unfamiliar example using the selected knowledge, an annotated model and relevant evidence. Include an opportunity to demonstrate each selected practice. Retain diagnostic and final responses to show progress.`,
  descriptors:'Look for accurate concepts and vocabulary, a coherent explanation, and a justified link between evidence and claims. Agree task-specific descriptors and reporting judgements using the school’s Junior Assessment Framework before assessment.',
  reporting:'Record demonstrated learning, supporting evidence and one next step. Moderate judgements with the department using the agreed school framework.',
  capabilities:['Thinkers','Communicators','Reflective'],focuses};
 return {plan:validatePlan(plan),source};
}
export function assertCurriculumPreserved(before,after,source){
 if(!source.documentId)return;
 for(const key of ['knowledge','practices']){
  const a=before.focuses.map(f=>f[key]).filter(Boolean).sort(),b=after.focuses.map(f=>f[key]).filter(Boolean).sort();
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('The proposal changed Ministry statements. Keep their wording and grouping unchanged; revise the teacher-planning sections only.');
 }
}
