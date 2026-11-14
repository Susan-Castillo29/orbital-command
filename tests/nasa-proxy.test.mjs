import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { nasaHandler } from '../server/nasa-proxy.mjs';

test('intermediario limita destinos, protege clave y conserva datos de la fuente', async () => {
  const nativeFetch=globalThis.fetch; const previous=process.env.NASA_API_KEY;process.env.NASA_API_KEY='test-private-key';
  let calls=0;
  globalThis.fetch=async (url)=>{calls++;assert.equal(new URL(url).host,'science.nasa.gov');return new Response(JSON.stringify({title:'Observación de prueba',reference:'test-private-key'}),{headers:{'content-type':'application/json'}});};
  const server=createServer((req,res)=>void nasaHandler(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/nasa`;
  try {
    let response=await nativeFetch(base+'?dataset=apod');assert.equal(response.status,200);let body=await response.text();assert.ok(body.includes('Observación de prueba'));assert.ok(!body.includes('test-private-key'));
    response=await nativeFetch(base+'?dataset=apod');assert.equal((await response.json()).cached,true);assert.equal(calls,1);
    assert.equal((await nativeFetch(base+'?dataset=apod&url=https://attacker.invalid')).status,400);
    assert.equal((await nativeFetch(base+'?dataset=constructor')).status,400);
    assert.equal((await nativeFetch(base+'?dataset=apod',{method:'POST'})).status,405);
    assert.equal((await nativeFetch(base+'?dataset=apod',{headers:{'sec-fetch-site':'cross-site'}})).status,403);
  } finally {await new Promise(resolve=>server.close(resolve));globalThis.fetch=nativeFetch;if(previous===undefined)delete process.env.NASA_API_KEY;else process.env.NASA_API_KEY=previous;}
});
