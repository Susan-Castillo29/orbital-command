import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEonetTargets, isEonetTarget, targetSource } from '../src/systems/eonet.ts';
import { createScienceReport } from '../src/systems/science.ts';
import { initialDesign } from '../src/systems/engineering.ts';
import { chapterOrder, chapterUnlocked } from '../src/systems/campaign.ts';
const snapshot=JSON.parse(readFileSync(new URL('../public/nasa-data/eonet.json',import.meta.url),'utf8'));
const resource={fuel:70,energy:80,integrity:95,storage:0,communications:80,elapsedMinutes:1440};
const mission={id:'earth',name:'HOME',destination:'Tierra',objective:'Observar'};
test('EONET validates provenance, dates and identifiers before making targets available',()=>{
 const result={...snapshot,snapshot:true};const targets=parseEonetTargets(result);assert.ok(targets.length>0);assert.equal(targets[0].snapshot,true);assert.match(targetSource(targets[0]),/^https:\/\/eonet\.gsfc\.nasa\.gov\/api\/v3\/events\/EONET_\d+$/);assert.deepEqual(parseEonetTargets({...result,source:'https://attacker.invalid'}),[]);assert.equal(isEonetTarget({...targets[0],id:'../../unsafe'}),false);assert.equal(isEonetTarget({...targets[0],eventDate:'invalid'}),false);
});
test('the Earth report retains the real event as context and labels simulated readings',()=>{
 const target=parseEonetTargets({...snapshot,snapshot:true})[0];const report=createScienceReport(mission,initialDesign,resource,['EONET: '+target.title],[],[],null,0,[],target);assert.equal(report.eonetTarget.id,target.id);assert.match(report.observations[0].unit,/simulado/);assert.equal(createScienceReport({...mission,id:'mars'},initialDesign,resource,[],[],[],null,0,[],target).eonetTarget,undefined);
});
test('all campaign chapters unlock only after the preceding chapter',()=>{
 for(let i=0;i<chapterOrder.length;i++){const id=chapterOrder[i];assert.equal(chapterUnlocked(id,chapterOrder.slice(0,i)),true,id);if(i>0)assert.equal(chapterUnlocked(id,[]),false,id);}
});
