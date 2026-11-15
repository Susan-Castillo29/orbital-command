import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validatePublicConfig } from '../src/collaboration/config.ts';
import { captureCampaign, parseCampaignSnapshot, restoreCampaign } from '../src/collaboration/campaignSnapshot.ts';
const jwt = role => `header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
test('cloud configuration rejects private keys and untrusted endpoints',()=>{
 assert.ok(validatePublicConfig('https://example.supabase.co','sb_publishable_example'));
 assert.ok(validatePublicConfig('https://example.supabase.co',jwt('anon')));
 assert.equal(validatePublicConfig('https://example.supabase.co',jwt('service_role')),null);
 assert.equal(validatePublicConfig('https://example.supabase.co','sb_secret_key'),null);
 assert.equal(validatePublicConfig('https://example.supabase.co.attacker.test','sb_publishable_example'),null);
 assert.equal(validatePublicConfig('http://example.supabase.co','sb_publishable_example'),null);
});
test('campaign backups whitelist keys and preserve unrelated browser data',()=>{
 const values=new Map([['orbital-command-player','{"xp":12}'],['private-token','secret'],['orbital-command-progress-earth','{}']]);
 const storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const snapshot=captureCampaign(storage);assert.deepEqual(Object.keys(snapshot.items).sort(),['orbital-command-player','orbital-command-progress-earth']);
 assert.equal(parseCampaignSnapshot({version:1,items:{'private-token':'x'}}),null);
 assert.equal(parseCampaignSnapshot({version:1,items:{'orbital-command-player':'💫'.repeat(30000)}}),null);
 restoreCampaign(storage,{version:1,items:{'orbital-command-player':'{"xp":20}'}});
 assert.equal(values.get('private-token'),'secret');assert.equal(values.has('orbital-command-progress-earth'),false);assert.equal(values.get('orbital-command-player'),'{"xp":20}');
});

test('a failed restore rolls back the prior campaign when storage recovers',()=>{
 const values=new Map([['orbital-command-player','old'],['orbital-command-progress-earth','old-progress'],['other','untouched']]);let fail=true;
 const storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(k==='orbital-command-player' && v==='new' && fail){fail=false;throw new Error('quota');}values.set(k,v)},removeItem:k=>values.delete(k)};
 assert.throws(()=>restoreCampaign(storage,{version:1,items:{'orbital-command-player':'new'}}));
 assert.equal(values.get('orbital-command-player'),'old');assert.equal(values.get('orbital-command-progress-earth'),'old-progress');assert.equal(values.get('other'),'untouched');
});

test('cloud backup retains campaign medals and the active campaign',()=>{
 const values=new Map([['orbital-command-campaign-archive-v1', JSON.stringify({version:1,medals:[{id:'galactic-explorer',earnedAt:'2026-11-14T12:00:00Z'}],campaigns:[]})],['orbital-command-active-campaign-v1','{\"completed\":true}']]);
 const storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const snapshot=captureCampaign(storage);values.clear();restoreCampaign(storage,snapshot);
 assert.equal(JSON.parse(values.get('orbital-command-campaign-archive-v1')).medals[0].id,'galactic-explorer');
 assert.equal(JSON.parse(values.get('orbital-command-active-campaign-v1')).completed,true);
});
