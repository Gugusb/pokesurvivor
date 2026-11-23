const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {G,fresh}=require('../server/domain.cjs'),{createApp}=require('../server/server.cjs');
const R=G.LeagueRank,opts=id=>({id,clean:true,alive:true}),run=hp=>({day:60,arceus:true,squadHp:hp,leagueTier:1});
test('exact final squad HP thresholds award 3/2/1 stars without rounding',()=>{
 for(const [hp,n]of [[100,3],[70,3],[69.999,2],[40,2],[39.999,1],[.1,1]]){const s=fresh('Boundary'),r=R.settle(s,run(hp),opts('boundary-'+String(hp).replace('.','_')));assert.equal(r.award,n);assert.equal(R.view(s).points,n);}
});
test('only clean living final clears qualify; early exit, captain defeat and squad wipe never remove progress',()=>{
 const s=fresh('Protection');R.settle(s,run(80),opts('qualified-first'));const before=JSON.stringify(s.leagueRank);
 for(const [r,o]of [[{...run(100),day:59},opts('early-exit')],[run(0),opts('squad-wipe')],[run(90),{...opts('captain-death'),alive:false}],[run(100),{...opts('debug-excluded'),clean:false}],[{...run(100),arceus:false},opts('no-completion')]]){assert.equal(R.settle(s,r,o).award,0);assert.equal(JSON.stringify(s.leagueRank),before);}
 assert.equal(R.settle(s,run(80),opts('bad')).reason,'invalid');
});
test('three stars promote one tier, overflowing stars carry and R8 graduation cannot skip Champion Road',()=>{
 const s=fresh('Ascent');for(let i=0;i<6;i++)R.settle(s,run(70),opts('regular-clear-'+i));assert.equal(R.view(s).tier,7);R.settle(s,run(50),opts('regular-two-stars'));assert.equal(R.view(s).stars,2);const r=R.settle(s,run(70),opts('regular-graduation'));assert.equal(r.award,3);assert.equal(r.applied,1);assert.equal(R.view(s).tier,8);assert.equal(R.view(s).protocol,0);
 for(let i=0;i<25;i++)R.settle(s,{...run(i%2?99:1),leagueTier:8},opts('protocol-clear-'+i));assert.equal(R.view(s).protocol,20);assert.equal(R.view(s).maxed,true);assert.ok(Object.keys(s.leagueRank.results).length<=41);
});
test('run receipts are idempotent and local save merges union independent clears without counting duplicates',()=>{
 const a=fresh('Merge'),b=fresh('Merge');R.settle(a,run(70),opts('same-run-identifier'));R.settle(b,run(70),opts('same-run-identifier'));const before=JSON.stringify(a.leagueRank);assert.equal(R.settle(a,run(70),opts('same-run-identifier')).applied,0);assert.equal(JSON.stringify(a.leagueRank),before);R.settle(b,run(50),opts('different-run-id'));const merged=R.merge(a,b);assert.equal(R.view(merged).points,5);assert.equal(R.view(R.merge(merged,b)).points,5);const normalized=G.DB.normalize(JSON.parse(JSON.stringify(merged)),'Merge');assert.equal(R.view(normalized).points,5);
});
test('rank feature tiers filter generated and restored events without introducing lock placeholders',()=>{
 for(const tier of [1,2,3,4]){const r=R.rules(tier);assert.equal(r.types,tier>=2);assert.equal(r.traits,tier>=3);assert.equal(r.training,true);assert.equal(r['pokemon-training'],tier>=3);assert.equal(r.eggs,tier>=4);assert.equal(r.companionChance,tier===1?.6:tier===2?.4:null);const matrix=G.ExpeditionRules.matrix(1,Math.random,tier);for(const row of matrix)for(const c of row)assert.equal(R.allows(c.kind,tier),true);const old={leagueTier:tier,map:[[{kind:'training'},{kind:'pokemon-training'},{kind:'boss'}]]};R.filterMap(old);assert.equal(old.map[0][0].kind,'training');assert.equal(old.map[0][1].kind,tier<3?'rest':'pokemon-training');assert.equal(old.map[0][2].kind,'boss');}
});
test('manual shop pity reserves an existing companion family on the exact fourth/eighth refresh and respects inventory',()=>{
 const {context}=require('./battle_fixture.cjs'),s=context('zh',false),g=s.G;for(const f of ['js/data/expedition-quality.js','js/systems/expedition-quality.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/league-rank.js'])s.load(f);g.Sprites.preload=()=>{};const captain=s.player(25);g.Game.player=captain;g.Expedition={run:{...g.Economy.create(),trainerLevel:4,leagueTier:1}};g.Squad.begin(captain);g.Squad.syncTrainer();const ally=g.Squad.recruit(4),pool=new g.UnitPool([g.DEX_BY[4],g.DEX_BY[7],g.DEX_BY[25]]);const before=pool.stock.get(4),offers=[pool.draw(4,()=>0,m=>m.dex===7)];
 for(const [tier,n]of [[1,4],[2,8]]){const run={leagueTier:tier,rankRefreshCount:n-1};assert.equal(g.LeagueRank.pityShop(run,pool,offers,[ally]),false);run.rankRefreshCount=n;assert.equal(g.LeagueRank.pityShop(run,pool,offers,[ally]),true);assert.equal(offers[0].dex,4);assert.equal(offers[0].rank,1);assert.equal(pool.stock.get(4),before-1);pool.putBack(offers[0]);offers[0]=pool.draw(4,()=>0,m=>m.dex===7);}
 pool.stock.set(4,0);assert.equal(g.LeagueRank.pityShop({leagueTier:1,rankRefreshCount:4},pool,offers,[ally]),false);assert.equal(offers[0].dex,7);assert.equal(pool.stock.get(4),0);assert.equal(g.LeagueRank.pityShop({leagueTier:3,rankRefreshCount:4},pool,offers,[ally]),false);
});
test('locked type bonds and companion traits produce no combat stats or effects while class bonds remain usable',()=>{
 const {context}=require('./battle_fixture.cjs'),s=context('zh',false),g=s.G;for(const f of ['js/data/expedition-quality.js','js/systems/expedition-quality.js','js/data/egg-groups.js','js/systems/expedition-rules.js','js/entities/projectile.js','js/systems/squad.js','js/systems/league-rank.js','js/systems/squad-bonds.js','js/data/type-bonds.js','js/systems/type-bonds.js','js/data/squad-traits.js','js/systems/squad-traits.js'])s.load(f);g.Sprites.preload=()=>{};const cap=s.player(25),r={...g.Economy.create(),trainerLevel:4,leagueTier:1,phase:'combat',day:1,gold:100,captain:cap};cap.addMove('thunder-shock');g.Expedition={run:r};g.Game.player=cap;g.Squad.begin(cap);g.Squad.syncTrainer();const a=g.Squad.recruit(4),b=g.Squad.recruit(37);a.traitPermanent={atk:5};a.squadTraitOverride=g.SquadTraitDefs.LIST.find(d=>d.effect==='gold'&&d.event==='battle_end').id;g.Squad.refresh();assert.equal(g.TypeBonds.state('fire').tier,0);assert.equal(g.SquadBonds.setLayer('types','fire',20),false);assert.equal(g.SquadTraits.flat(a,'atk'),0);assert.equal(g.SquadTraits.description(a),'');g.SquadTraits.finishBattle();assert.equal(r.gold,100);assert.ok(g.SquadBonds.count('skill','projectile')>=3);
 r.leagueTier=2;g.Squad.refresh();assert.equal(g.TypeBonds.state('fire').tier,2);assert.equal(g.SquadTraits.flat(a,'atk'),0);r.leagueTier=3;r.day=2;g.Squad.refresh();assert.ok(g.SquadTraits.flat(a,'atk')>0);assert.ok(g.SquadTraits.description(a));g.SquadTraits.finishBattle();assert.ok(r.gold>100);
});
test('server settles final survival with zero boss kills, retries once, rejects forged account rank and never awards on heartbeats',async t=>{
 let clock=Date.now();const app=createApp({dbFile:':memory:',now:()=>clock,lootRng:()=>.99});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(route,b,cookie)=>{const r=await fetch(base+'/api'+route,{method:b?'POST':'GET',headers:{...(b?{'Content-Type':'application/json','X-PS-Client':'1'}:{}),...(cookie?{Cookie:cookie}:{})},body:b?JSON.stringify(b):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=await call('/register',{name:'LeagueTester',pass:'league-test-password-123'});assert.equal(a.status,201);const cookie=a.cookie,s=a.data.save;s.owned[4]={at:clock,from:'starter',iv:Array(8).fill(20)};s.partner=4;assert.equal((await call('/save',{save:s,rev:a.data.rev},cookie)).status,200);
 const start=await call('/run/start',{dex:4,stars:1,mode:'q',clean:true},cookie);assert.equal(start.status,200);clock+=1000*1000;const report={id:start.data.id,t:1000,alive:true,failed:false,clean:true,speed:1,kills:0,scoreCounts:{normal:0,elite:0,boss:0,rift:0,events:60},expedition:run(70)};
 const beat=await call('/run/beat',report,cookie);assert.equal(beat.status,200);assert.equal(R.view((await call('/session',null,cookie)).data.save).points,0);
 const end=await call('/run/end',report,cookie);assert.equal(end.status,200,JSON.stringify(end.data));assert.equal(end.data.leagueResult.award,3);assert.equal(R.view(end.data.save).tier,2);const retry=await call('/run/end',report,cookie);assert.equal(retry.data.alreadyEnded,true);assert.equal(R.view(retry.data.save).points,3);assert.equal(retry.data.leagueResult.id,start.data.id);
 const forged=JSON.parse(JSON.stringify(end.data.save));for(let i=0;i<20;i++)R.settle(forged,{...run(100),leagueTier:1},opts('forged-result-'+i));const upload=await call('/save',{save:forged,rev:retry.data.rev},cookie);assert.equal(upload.status,200);assert.equal(R.view(upload.data.save).points,3);
 const another=await call('/run/start',{dex:4,stars:1,mode:'q',clean:true},cookie),lost=await call('/run/end',{...report,id:another.data.id,alive:false,failed:true,expedition:run(0)},cookie);assert.equal(lost.status,200);assert.equal(lost.data.leagueResult.award,0);assert.equal(R.view(lost.data.save).points,3);
});
test('R4+ requires difficulty >= rank tier; clearing above rank tier grants +1 bonus star up to 4 total',()=>{
 const s=fresh('DiffRules');
 // R1..R3 allow N1
 for(let i=0;i<3;i++){const res=R.settle(s,run(70),{...opts('diff-r1-r3-'+i),stars:1});assert.equal(res.reason,'cleared');assert.equal(res.award,3);assert.equal(res.bonus,0);}
 assert.equal(R.view(s).tier,4);
 // R4 with N3 -> rejected with reason 'difficulty'
 const low4=R.settle(s,run(100),{...opts('diff-r4-n3'),stars:3});assert.equal(low4.reason,'difficulty');assert.equal(low4.award,0);assert.equal(low4.applied,0);assert.equal(R.view(s).points,9);
 // R4 with N4 -> +3 stars -> promotes to R5
 const ok4=R.settle(s,run(70),{...opts('diff-r4-n4'),stars:4});assert.equal(ok4.reason,'cleared');assert.equal(ok4.award,3);assert.equal(ok4.bonus,0);assert.equal(R.view(s).tier,5);
 // R5 with N4 -> rejected with reason 'difficulty'
 const low5=R.settle(s,run(100),{...opts('diff-r5-n4'),stars:4});assert.equal(low5.reason,'difficulty');assert.equal(low5.award,0);
 // R5 with N6 (tier < diff) -> SSS (3) + 1 bonus = 4 stars, survives normalize
 const high5=R.settle(s,run(80),{...opts('diff-r5-n6'),stars:6});assert.equal(high5.reason,'cleared');assert.equal(high5.bonus,1);assert.equal(high5.award,4);assert.equal(R.view(s).points,16);
 const norm=G.DB.normalize(JSON.parse(JSON.stringify(s)),'DiffRules');assert.equal(R.view(norm).points,16);
 // R1 with N3 (tier < diff) -> A (1) + 1 bonus = 2 stars
 const s2=fresh('BonusLow');const lowRankHighDiff=R.settle(s2,run(10),{...opts('diff-r1-n3'),stars:3});assert.equal(lowRankHighDiff.bonus,1);assert.equal(lowRankHighDiff.award,2);
});
