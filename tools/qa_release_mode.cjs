// Production regression with a memory database and stale developer preferences.
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events');
const {createApp}=require('../server/server.cjs');
const {chromium}=require('./cache/browser-qa/node_modules/playwright');
(async()=>{const app=createApp({dbFile:':memory:',origin:'https://game.example'});let browser;
 try{app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 for(const entry of ['/','/en/'])for(const lang of ['zh','en','es']){const c=await browser.newContext({viewport:{width:1280,height:900}});await c.addInitScript(l=>{localStorage.setItem('ps.lang',l);localStorage.setItem('ps.dev.enabled','true');localStorage.setItem('ps.dev.view','2');},lang);
 const p=await c.newPage();p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await p.goto('http://127.0.0.1:'+app.server.address().port+entry);
 await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
 if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#btn-guest').click();
 for(let n=0;n<40;n++){if(await p.locator('#scr-result:not(.hidden)').count())break;await p.locator('#scr-test:not(.hidden) #test-a .answer').first().click();}
 await p.locator('#res-ok').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('#btn-settings').click();
 assert.equal(await p.locator('[data-t="dev"],#dev-enable,#dev-panel,#dev-launcher').count(),0);await p.keyboard.press('F2');assert.equal(await p.locator('#dev-panel,#dev-launcher').count(),0);
 await p.waitForTimeout(600);await p.screenshot({path:path.join(__dirname,'cache/release-settings-'+lang+'.png')});await p.locator('#set-close').click();await p.locator('[data-go="play"]').click();await p.locator('#run-setup-start').click();await p.locator('#scr-menu').waitFor({state:'hidden'});await p.waitForTimeout(1200);await p.keyboard.press('F2');assert.equal(await p.locator('#dev-panel,#dev-launcher').count(),0);await c.close();}
 assert.deepEqual(errors,[]);console.log('Production zh/en/es: stale preferences ignored, no developer settings or F2 panel, gameplay OK; pageErrors=0');
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
