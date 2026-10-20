/* Cosmetic QA with disposable users/progress; no production saves. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh,G}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
  const app=createApp({dbFile:':memory:',stunUrls:'none'}),out=path.join(__dirname,'cache'),errors=[];let browser;
  try{
    fs.mkdirSync(out,{recursive:true});
    const name='MedalFixture',pass=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=1;
    for(const dex of [1,4,7])save.owned[dex]={at:Date.now(),from:'fixture',iv:[20,20,20]};
    for(const [dex,count] of [[4,3],[7,8]])for(let n=1;n<=count;n++)G.Difficulty.record(save,{stars:n,dex,eligible:true},1201+n*10,true,true);
    app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());
    app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
    const variants=process.argv.includes('--built')?[['/','zh-CN'],['/en/','en-US'],['/','es-ES']]:[['/dev.html','zh-CN']];
    for(const [entry,locale] of variants){
      const lang=locale.slice(0,2),c=await browser.newContext({viewport:{width:1280,height:960},locale}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(base+entry);await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
      if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
      await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();
      await p.locator('[data-go="dex"]').click();
      for(const [dex,count] of [[1,0],[4,3],[7,8]]){
        await p.locator('#dex-grid .cell').filter({has:p.locator('.no',{hasText:String(dex).padStart(3,'0')})}).click();
        assert.equal(await p.locator('.difficulty-medal').count(),8);assert.equal(await p.locator('.difficulty-medal.won').count(),count);
        assert.equal(await p.locator('.difficulty-medal-count').textContent(),count+' / 8');
        assert.equal(await p.locator('.difficulty-medal-art').count(),8);
        assert.ok((await p.locator('.difficulty-medal').first().getAttribute('aria-label')).includes('1★'));
        await p.locator('.difficulty-record').screenshot({path:path.join(out,'medals-'+lang+'-'+(process.argv.includes('--built')?'built-':'')+count+'.png')});
      }
      for(const width of [390,320]){
        await p.setViewportSize({width,height:844});await p.locator('.difficulty-record').scrollIntoViewIfNeeded();
        assert.ok(await p.locator('.difficulty-record').evaluate(el=>el.scrollWidth<=el.clientWidth+1),locale+' '+width+' panel');
        assert.ok(await p.locator('.difficulty-medals').evaluate(el=>el.scrollWidth<=el.clientWidth+1),locale+' '+width+' medals');
        await p.locator('.difficulty-record').screenshot({path:path.join(out,'medals-'+lang+'-mobile-'+width+'.png')});
      }
      await p.locator('.difficulty-medal').first().focus();assert.ok(await p.locator('.difficulty-medal').first().evaluate(el=>el===document.activeElement));
      await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.difficulty-medal').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
      await p.setViewportSize({width:1280,height:960});await p.locator('#btn-support').click();await p.locator('#scr-support:not(.hidden)').waitFor();
      assert.equal(await p.locator('#sup-body a[href="https://github.com/JPTER78/pokesurvivor"]').count(),1);
      assert.equal(await p.locator('#sup-body a[href="https://ko-fi.com/jpter78"]').count(),1);
      assert.equal(await p.locator('#sup-body a[href="https://github.com/sponsors/JPTER78"]').count(),1);
      assert.equal(await p.locator('.support-fork h3').textContent(),'Gugusb');
      assert.equal(await p.locator('.support-fork a').getAttribute('href'),'https://github.com/Gugusb/pokesurvivor');
      await p.locator('.support-fork').screenshot({path:path.join(out,'support-gugusb-'+lang+'.png')});
      await p.setViewportSize({width:320,height:844});assert.ok(await p.locator('.support-fork').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await c.close();
    }
    if(process.argv.includes('--built')){
      const p=await browser.newPage({viewport:{width:390,height:844}});
      for(const route of ['/apoyar/','/en/support/']){
        await p.goto(base+route);
        for(const href of ['https://github.com/JPTER78/pokesurvivor','https://ko-fi.com/jpter78','https://github.com/sponsors/JPTER78','https://github.com/Gugusb/pokesurvivor'])
          assert.ok(await p.locator('a[href="'+href+'"]').count(),route+' '+href);
        assert.equal(await p.locator('.support-fork h3').textContent(),'Gugusb');
        assert.ok(await p.locator('.support-fork').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      }
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({entry:process.argv.includes('--built')?'built':'source',medals:[0,3,8],narrowWidths:[390,320],keyboardFocus:true,reducedMotion:true,originalAuthorAndSponsorLinksPreserved:true,gugusbRepository:true,pageErrors:0},null,2));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
