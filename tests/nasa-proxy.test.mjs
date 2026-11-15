import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { nasaHandler } from '../server/nasa-proxy.mjs';

test('intermediario limita destinos, protege clave y conserva datos de la fuente', async () => {
  const nativeFetch=globalThis.fetch; const previous=process.env.NASA_API_KEY;process.env.NASA_API_KEY='test-private-key';
  let calls=0;
  globalThis.fetch=async (url)=>{calls++;assert.equal(new URL(url).host,'science.nasa.gov');return new Response(JSON.stringify({title:'Observación de prueba',reference:'test-private-key'}),{headers:{'content-type':'application/json'}});};
  const request=async(path,method='GET',headers={})=>{const req=Readable.from([]);Object.assign(req,{url:path,method,headers,socket:{remoteAddress:'test'}});const res={statusCode:200,headers:{},body:'',setHeader(key,value){this.headers[key]=value;},end(body=''){this.body=body;}};await nasaHandler(req,res);return res;};
  try {
    let response=await request('/api/nasa?dataset=apod');assert.equal(response.statusCode,200);assert.ok(response.body.includes('Observación de prueba'));assert.ok(!response.body.includes('test-private-key'));
    response=await request('/api/nasa?dataset=apod');assert.equal(JSON.parse(response.body).cached,true);assert.equal(calls,1);
    assert.equal((await request('/api/nasa?dataset=apod&url=https://attacker.invalid')).statusCode,400);
    assert.equal((await request('/api/nasa?dataset=constructor')).statusCode,400);
    assert.equal((await request('/api/nasa?dataset=apod','POST')).statusCode,405);
    assert.equal((await request('/api/nasa?dataset=apod','GET',{'sec-fetch-site':'cross-site'})).statusCode,403);
  } finally {globalThis.fetch=nativeFetch;if(previous===undefined)delete process.env.NASA_API_KEY;else process.env.NASA_API_KEY=previous;}
});
