import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAnswers, scoreAnswers, evidenceExport, readEvidence, saveEvidence, clearEvidence } from '../src/systems/learningEvidence.ts';
const before={answers:[1,2,1],missionsAtAssessment:0,transmissionsAtAssessment:0,recordedAt:'2026-11-14'};
const after={answers:[1,0,1],missionsAtAssessment:1,transmissionsAtAssessment:1,recordedAt:'2026-11-15'};
test('voluntary assessment scores validated answers and exports no individual answers',()=>{
 assert.equal(isAnswers([1,2,1]),true);assert.equal(isAnswers([1,2,NaN]),false);assert.equal(isAnswers([1,2]),false);assert.equal(scoreAnswers(before.answers),3);const result=evidenceExport({version:1,before,after});assert.equal(result.after.score,2);assert.equal('answers' in result.before,false);assert.match(result.limitations,/Not independently verified/);
});
test('storage rejects malformed or out-of-order records and reports failed deletion',()=>{
 const map=new Map();globalThis.window={localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
 try{const valid={version:1,before,after};assert.equal(saveEvidence(valid),true);assert.deepEqual(readEvidence(),valid);const replay={version:1,before:{...before,missionsAtAssessment:13},after:{...after,missionsAtAssessment:13}};assert.equal(saveEvidence(replay),true);assert.deepEqual(readEvidence(),replay);assert.equal(saveEvidence(valid),true);assert.equal(saveEvidence({...valid,after:{...after,transmissionsAtAssessment:0}}),true);assert.equal(readEvidence(),null);saveEvidence(valid);window.localStorage.removeItem=()=>{throw Error('blocked')};assert.equal(clearEvidence(),false);assert.deepEqual(readEvidence(),valid);window.localStorage.getItem=()=>{throw Error('blocked')};assert.equal(clearEvidence(),false);}finally{delete globalThis.window;}
});
