import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadNASAData } from '../src/systems/nasaClient.ts';

test('usa la fuente pública fechada cuando no existe el servidor', async () => {
 const original=globalThis.fetch; const urls=[];
 globalThis.fetch=async url=>{urls.push(url);return urls.length===1?new Response('Not found',{status:404}):Response.json({dataset:'apod',observedAt:'2026-01-01T00:00:00Z',data:{title:'Prueba'}});};
 try {const result=await loadNASAData('apod','/orbital-command/',new AbortController().signal);assert.equal(result.snapshot,true);assert.equal(result.data.title,'Prueba');assert.equal(urls[1],'/orbital-command/nasa-data/apod.json');}finally{globalThis.fetch=original;}
});
test('no sustituye una fuente viva por una instantánea', async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({dataset:'apod',observedAt:'2026-01-01',data:[]});};
 try {const result=await loadNASAData('apod','/',new AbortController().signal);assert.equal(result.snapshot,undefined);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('static hosting loads snapshots directly without calling an unavailable API', async () => {
 const original=globalThis.fetch; const urls=[];
 globalThis.fetch=async url=>{urls.push(url);return String(url).endsWith('/index.json') ? Response.json(['apod']) : Response.json({dataset:'apod',observedAt:'2026-01-01',data:[]});};
 try {const result=await loadNASAData('apod','/orbital-command/',new AbortController().signal,'snapshot');assert.equal(result.snapshot,true);assert.deepEqual(urls,['/orbital-command/nasa-data/index.json','/orbital-command/nasa-data/apod.json']);}finally{globalThis.fetch=original;}
});

test('static hosting does not request missing snapshot files', async () => {
 const original=globalThis.fetch; const urls=[];
 globalThis.fetch=async url=>{urls.push(url);return Response.json(['apod']);};
 try {await assert.rejects(loadNASAData('donki_flr','/',new AbortController().signal,'snapshot'));assert.deepEqual(urls,['/nasa-data/index.json']);}finally{globalThis.fetch=original;}
});
