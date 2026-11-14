const {test}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {createApp}=require('../server/server.cjs');
for(const production of [false,true])test(`developer assets ${production?'blocked in production':'available for local development'}`,async()=>{
 const app=createApp({dbFile:':memory:',origin:production?'https://game.example':''});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 try{const base='http://127.0.0.1:'+app.server.address().port;
  for(const route of ['/dev.html','/js/ui/developer.js','/%64ev.html','/js//ui/developer.js']){
   const r=await fetch(base+route);assert.equal(r.status,production?404:200,route);await r.arrayBuffer();
  }
  for(const route of ['/','/en/','/js/app.min.js']){const r=await fetch(base+route);assert.equal(r.status,200);const text=await r.text();if(route!=='/js/app.min.js')assert.ok(!text.includes('data-t="dev"'));}
 }finally{await app.close();}
});
