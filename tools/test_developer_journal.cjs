const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {context}=require('./battle_fixture.cjs');
const {createApp}=require('../server/server.cjs'),{seedDeveloperCharacter}=require('../server/seed-developer-character.cjs');
const {identity,characterFor}=require('../server/character-profiles.cjs');

test('each edition entry has its own localized closing note while upstream history stays unvoiced',()=>{
 const {G,load}=context();load('js/data/changelog.js');
 const own=G.CHANGELOG.filter(v=>v.title[0].includes(' · v')),upstream=G.CHANGELOG.filter(v=>!v.title[0].includes(' · v'));
 assert.ok(own.length>=40);assert.equal(upstream.length,7);assert.equal(new Set(own.map(v=>v.note[0])).size,own.length);
 for(const e of own){assert.equal(e.note.length,2);assert.ok(e.note.every(s=>s.length>20));assert.ok(/[\u4e00-\u9fff]/.test(G.T(e.note[0])));assert.ok(/[\u4e00-\u9fff]/.test(G.T(e.title[0])));for(const k of ['new','chg','fix'])for(const pair of e[k]||[])assert.ok(/[\u4e00-\u9fff]/.test(G.T(pair[0])),e.title[1]+': '+pair[0]);}
 assert.ok(upstream.every(v=>v.note===undefined));assert.equal(upstream.at(-1).d,'2026-10-07');
 assert.ok(G.T(G.CHANGELOG_TEAM[0]).includes('Gugusb'));assert.ok(G.T(G.CHANGELOG_TEAM[0]).includes('鲸鱼娘'));assert.doesNotMatch(G.T(G.CHANGELOG_TEAM[0]),/agent|记忆持久化|DeepSeek/i);
 assert.ok(!JSON.stringify(own).includes('failureProtection'));
});

test('news renders closing notes after changes, escapes content, and opens the character profile',()=>{
 const {G,load}=context(),nodes=new Map(),classes=new Set(),buttons=[{dataset:{newsProfile:'fixture-profile'}}];
 const body={innerHTML:'',scrollTop:0,querySelectorAll:()=>buttons};nodes.set('news-body',body);nodes.set('scr-news',{classList:{remove:x=>classes.delete(x),add:x=>classes.add(x)}});nodes.set('btn-news',{classList:{toggle(){}}});
 G.UI.$=id=>nodes.get(id);let opened;G.ProfileUI={show:id=>opened=id};Object.defineProperty(G.DB,'mode',{value:'server'});Object.defineProperty(G.DB,'online',{value:true});
 G.CHANGELOG_TEAM=['Equipo','Team'];G.CHANGELOG=[{d:'2026-11-02',title:['Título','Title'],chg:[['Cambio <x>','Change <x>']],note:['Nota <script>','Note <script>'],profile:'fixture-profile'}];load('js/ui/news-ui.js');G.NewsUI.open();
 assert.ok(body.innerHTML.indexOf('news-note')>body.innerHTML.indexOf('news-part'));assert.ok(body.innerHTML.includes('&lt;script&gt;'));assert.ok(!body.innerHTML.includes('<script>'));assert.ok(body.innerHTML.includes('news-team'));
 buttons[0].onclick();assert.equal(opened,'fixture-profile');assert.ok(classes.has('hidden'));
});

test('developer character seed is idempotent, has curated history and never inserts verified leaderboard entries',async t=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'});t.after(()=>app.close());
 const first=await seedDeveloperCharacter(app.db,{now:1800000000000}),uid=identity('dafeiyu');assert.ok(first.created);assert.equal(first.fullMedalPokemon,18);assert.equal(first.score,251250);assert.equal(first.bestTime,1938);
 const u=app.db.prepare('SELECT name,role,pass FROM users WHERE uid=?').get(uid);assert.equal(u.name,'大肥鱼');assert.equal(u.role,'player');assert.match(u.pass,/^[0-9a-f]{32}:[0-9a-f]{128}$/);assert.equal(characterFor(app.db,uid).preset,true);
 for(const table of ['completion_scores','run_scores','time_scores','runs','sessions'])assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0,table);
 const old=app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(uid).payload,s=JSON.parse(old);s.coins=654321;app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),uid);
 const again=await seedDeveloperCharacter(app.db,{now:1800000001000});assert.equal(again.created,false);assert.equal(JSON.parse(app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(uid).payload).coins,654321);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM audit WHERE target=?').get(uid).n,1);
});

test('existing names and unmarked identities cannot be overwritten by the character seed',async t=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'});t.after(()=>app.close());app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run('ordinary-owner','大肥鱼','大肥鱼','existing','existing',1);
 await assert.rejects(seedDeveloperCharacter(app.db),/conflicts/);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM saves').get().n,0);assert.equal(characterFor(app.db,identity('dafeiyu')),null);
});

test('registered users can read the marked developer profile without a fabricated score entering either board',async t=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'});t.after(()=>app.close());const character=await seedDeveloperCharacter(app.db);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 const registered=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json','X-PS-Client':'1'},body:JSON.stringify({name:'JournalViewer',pass:'isolated-journal-viewer'})});assert.equal(registered.status,201);const cookie=registered.headers.get('set-cookie').split(';')[0];
 const read=async route=>{const r=await fetch(base+'/api'+route,{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.json();};const p=await read('/profile?uid='+character.uid);
 assert.equal(p.name,'大肥鱼');assert.equal(p.character.key,'dafeiyu');assert.equal(p.character.preset,true);assert.equal(p.best.medals,18);assert.equal(p.best.score,251250);assert.equal(p.best.eightStar,1938);assert.equal(p.best.level,86);assert.equal(p.best.runs,64);assert.equal(p.completedDex.length,12);assert.deepEqual(p.favs.map(x=>x.dex),[321,350,143]);assert.ok(p.character.bio.zh.includes('鲸鱼娘'));assert.ok(p.character.bio.zh.includes('做饭的那家伙'));assert.ok(p.character.bio.zh.includes('咱们'));for(const bio of Object.values(p.character.bio))assert.doesNotMatch(bio,/agent|agente|persistent|persistente|DeepSeek|记忆持久化/i);
 for(const board of ['completion','survival'])assert.ok(!(await read('/ranking?board='+board)).rows.some(row=>row.uid===character.uid));
});
