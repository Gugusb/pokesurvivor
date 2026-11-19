'use strict';
// Isolated Android WebView integration. Requires our QA APK and a dedicated emulator.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {once}=require('node:events'),{createApp}=require('../server/server.cjs'),{chromium}=require('./cache/browser-qa/node_modules/playwright');
const root=path.resolve(__dirname,'..'),adb=path.join(root,'tools/cache/android-sdk/sdk/platform-tools/adb.exe'),serial=process.env.ANDROID_QA_SERIAL||'emulator-5580',appId='cn.gugusb.pokesurvivor.qa';
const cmd=(...args)=>cp.execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:120000,windowsHide:true}).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const build=require('../version.json').v,original=fs.readFileSync(path.join(root,'assets/icons/icon-192.png')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const app=createApp({dbFile:':memory:'});let browser,proxy,forward;
 let mode='bundled',iconRequests=0,manifestRequests=0,apiRequests=0;
 const native=JSON.parse(fs.readFileSync(path.join(root,'android/build/qa/assets/bundle.json'))),changed=fs.readFileSync(path.join(root,'assets/icons/icon-512.png'));
 function manifest(version){const files={...native.files,'assets/icons/icon-192.png':hash(changed)},json=Buffer.from(JSON.stringify(files));return{schema:1,version,encoding:'gzip-base64',sha256:hash(json),data:zlib.gzipSync(json).toString('base64')};}
 try{
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  proxy=http.createServer((req,res)=>{
   const p=new URL(req.url,'http://localhost');
   if(p.pathname==='/version.json'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify({v:mode==='bundled'?build:mode==='changed'?'abcdef9876':'12345fedcb'}));}
   if(p.pathname==='/mobile-assets.json'){manifestRequests++;if(mode==='missing'){res.writeHead(404);return res.end();}res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(manifest('abcdef9876')));}
   if(p.pathname==='/assets/icons/icon-192.png'){iconRequests++;res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=3600');return res.end(mode==='bundled'?original:changed);}
   if(p.pathname.startsWith('/api/'))apiRequests++;
   const r=http.request({host:'127.0.0.1',port:app.server.address().port,path:req.url,method:req.method,headers:req.headers},s=>{res.writeHead(s.statusCode,s.headers);s.pipe(res);});r.on('error',e=>{res.writeHead(502);res.end();});req.pipe(r);
  });proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  const url='http://10.0.2.2:'+proxy.address().port+'/';
  assert.match(cmd('install','-r',path.join(root,'outputs/android/PokeSurvivor-Android-1.0.0-QA.apk')),/Success/);
  cmd('shell','am','force-stop',appId);cmd('shell','am','start','-n',appId+'/cn.gugusb.pokesurvivor.MainActivity','--es','server',url);
  let pid='';for(let i=0;i<60;i++){pid=cmd('shell','pidof',appId);if(pid)break;await sleep(500);}assert.ok(pid);
  forward=cmd('forward','tcp:0','localabstract:webview_devtools_remote_'+pid.split(/\s+/)[0]);
  for(let i=0;i<90;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:'+forward);break;}catch(e){await sleep(1000);}}assert.ok(browser,'WebView devtools ready');
  let page;for(let i=0;i<90;i++){page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith(url));if(page)break;await sleep(1000);}assert.ok(page);
  page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForSelector('#tap-start,#scr-login');
  await page.waitForFunction(()=>document.getElementById('tap-start')&&!document.getElementById('tap-start').classList.contains('hidden'));
  await page.locator('#tap-start').click();await page.locator('#scr-login:not(.hidden)').waitFor();
  const fetchIcon=()=>page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch('/assets/icons/icon-192.png?qa='+Date.now(),{cache:'no-store'})).arrayBuffer())));
  assert.equal(hash(Buffer.from(await fetchIcon())),hash(original));assert.equal(iconRequests,0,'bundled icon does not request server');
  assert.equal(await page.evaluate(()=>typeof window.G),'undefined');
  assert.equal(await page.evaluate(()=>navigator.userAgent.includes('PokeSurvivorAndroid/1.0.0')),true);
  await page.locator('[data-tab="register"]').click();await page.locator('#f-user').fill('android_qa');await page.locator('#f-pass').fill('OnlyForIsolatedTest123!');await page.locator('#btn-auth').click();await page.locator('#rec-link').click();
  for(let n=0;n<40;n++){if(await page.locator('#scr-result:not(.hidden)').count())break;await page.locator('#scr-test:not(.hidden) #test-a .answer').first().click();}
  await page.locator('#res-ok').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
  await page.locator('[data-go="play"]').click();await page.locator('#run-setup-start').click();await page.locator('#scr-menu').waitFor({state:'hidden'});await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(root,'tools/cache/android-game.png')});
  assert.ok(apiRequests>0,'account health is online');assert.deepEqual(errors,[]);
  await page.evaluate(()=>{localStorage.setItem('android-update-proof','kept');});
  mode='changed';await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#tap-start');
  assert.equal(hash(Buffer.from(await fetchIcon())),hash(changed));assert.ok(iconRequests>0);assert.ok(manifestRequests>0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('android-update-proof')),'kept');
  assert.equal(await page.evaluate(async()=>(await(await fetch('/api/session',{credentials:'include'})).json()).user.name),'android_qa');
  const after=iconRequests;assert.equal(hash(Buffer.from(await fetchIcon())),hash(changed));assert.equal(iconRequests,after,'updated image is cached by its hash');
  mode='missing';await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#tap-start');assert.equal(hash(Buffer.from(await fetchIcon())),hash(changed));assert.ok(iconRequests>after,'missing manifest falls back to network');
  console.log(JSON.stringify({android:cmd('shell','getprop','ro.build.version.release'),webview:await page.evaluate(()=>navigator.userAgent),bundledLocal:true,updatedArt:true,missingManifestFallback:true,localStoragePreserved:true,errors}));
 }finally{if(browser)await browser.close();try{cmd('shell','am','force-stop',appId);}catch{}if(forward)try{cmd('forward','--remove','tcp:'+forward);}catch{}if(proxy)await new Promise(r=>proxy.close(r));await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
