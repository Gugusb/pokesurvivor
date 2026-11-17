const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs'),{once}=require('node:events');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),noop=()=>{};
function setup(){const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/move-control.js','js/systems/move-pp.js'])s.load(f);g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;return s;}
test('schedule is 21 by 7: start at column four, only three adjacent next-day cells, every cycle ends in seven Bosses',()=>{
 const g=setup().G,R=g.ExpeditionRules;
 for(let cycle=1;cycle<=4;cycle++){const grid=R.matrix(cycle);assert.equal(grid.length,21);assert.ok(grid.every(r=>r.length===7));assert.ok(grid[20].every(c=>c.kind==='boss'&&c.day===cycle*20));assert.equal(grid[0][3].day,(cycle-1)*20);for(const row of grid)for(const c of row)assert.equal(R.reachable(0,3,c.row,c.col),c.row===1&&[2,3,4].includes(c.col));}
 assert.equal(R.matrix(3)[20][0].day,60);assert.equal(R.reachable(3,0,4,0),true);assert.equal(R.reachable(3,0,4,-1),false);assert.equal(R.reachable(3,0,5,0),false);
});
test('non-Boss schedule distribution follows 10:2:5:5 and generation pool includes captain plus two distinct regions',()=>{
 const g=setup().G,R=g.ExpeditionRules;let seed=7;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),counts={battle:0,elite:0,shop:0,rest:0};
 for(let i=0;i<300;i++)for(const row of R.matrix(1,rng).slice(1,20))for(const c of row)counts[c.kind]++;
 const total=300*19*7;for(const [id,w]of R.weights)assert.ok(Math.abs(counts[id]/total-w/22)<.01,JSON.stringify(counts));
 const gens=R.generations(g.DEX_BY[6],rng);assert.equal(gens.length,3);assert.equal(new Set(gens).size,3);assert.ok(gens.includes(1));assert.ok(R.pool(gens).every(p=>gens.includes(p.gen)&&g.SPRITE_META[p.dex]));
});
test('cycle transition is a discrete large increase; finite waves have bounded spawn count and deadline',()=>{
 const R=setup().G.ExpeditionRules;for(let day=1;day<200;day++){const w=R.wave(day);assert.ok(w.count>0&&w.count<=92);assert.ok(w.duration>=24&&w.duration<=60);assert.ok(Number.isFinite(w.hp)&&Number.isFinite(w.dmg));}
 close(R.wave(21).hp/R.wave(1).hp,3);close(R.wave(41).dmg/R.wave(21).dmg,1.8);for(const day of [20,40,60,80]){assert.ok(R.wave(day+1).hp>R.wave(day).hp);assert.ok(R.wave(day+1).dmg>R.wave(day).dmg);assert.ok(R.wave(day+1).speed>=R.wave(day).speed);}
 assert.equal(R.capacity(1),4);assert.equal(R.capacity(6),9);assert.ok(R.upgradeCost(5)>R.upgradeCost(1));
});
test('recruitment immediately deploys one random legal move at level one, with half agility and half stamina, independent of click controls',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);leader.level=17;const p=g.Squad.recruit(6);assert.equal(p.level,17);assert.equal(p.moves.length,1);assert.equal(p.moves[0].lvl,1);assert.ok(g.Moves.poolFor(p.mon).includes(p.moves[0].id));close(p.agilityFor(p.moves[0]),p.agility*.5);close(p.staminaFor(p.moves[0]),p.stamina*.5);close(p.ppIntervalFor(),g.MonProgression.ppInterval(p.stamina*.5));g.Settings.set('castMode','click');assert.equal(g.MoveControl.wants(p,p.moves[0]),true);p.gainXp(100000);assert.equal(p.level,17);assert.equal(p.moves[0].lvl,1);assert.ok(g.Squad.actors().includes(p));
});
test('two equal species and equal ranks combine, evolve one stage and never exceed rank three',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(25));for(let i=0;i<2;i++)g.Squad.recruit(4);assert.equal(g.Squad.roster.length,1);assert.equal(g.Squad.roster[0].dex,5);assert.equal(g.Squad.roster[0].rank,2);const move=g.Squad.roster[0].moves[0].id;
 for(let i=0;i<2;i++)g.Squad.recruit(4);assert.equal(g.Squad.roster.length,1);assert.equal(g.Squad.roster[0].dex,6);assert.equal(g.Squad.roster[0].rank,3);assert.equal(g.Squad.roster[0].moves[0].id,move);assert.equal(g.Squad.roster[0].moves[0].lvl,1);
 for(let i=0;i<4;i++)g.Squad.recruit(4);assert.equal(g.Squad.roster.length,2);assert.ok(g.Squad.roster.every(p=>p.dex===6&&p.rank===3));
});
test('tags include both types, both egg groups, and the actual random skill class',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(25));const p=g.Squad.recruit(6),t=g.Squad.tags(p);assert.deepEqual(Array.from(t.types),['fire','flying']);assert.deepEqual(Array.from(t.eggs),[1,14]);assert.equal(t.skill,p.moves[0].kind);
});
test('knocked out deployed members keep support talents; reserves give no support; rearrangement and shop upgrade change deployed roster',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);const a=g.Squad.recruit(6),b=g.Squad.recruit(7),c=g.Squad.recruit(25),reserve=g.Squad.recruit(12);const talent=g.Squad.talent(a);assert.equal(talent.key,'atk');close(g.Squad.growth(leader,'atk'),.03);a.dead=true;a.hp=0;g.Squad.refresh();close(g.Squad.growth(leader,'atk'),.03);assert.ok(!g.Squad.actors().includes(reserve));assert.equal(g.Squad.growth(reserve,'atk'),0);const before=leader.agility;assert.ok(g.Squad.reorder(3,-1));assert.ok(g.Squad.deployed().includes(reserve));assert.ok(leader.agility<before);assert.ok(g.Squad.upgrade());assert.equal(g.Squad.deployed().length,4);assert.ok(g.Squad.actors().includes(c));
});
test('support HP recalculation does not repeatedly heal or grow health; fallen allies restore after stage',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);g.Squad.recruit(19);const max=leader.maxHp;leader.hp=max/2;for(let i=0;i<10;i++)g.Squad.refresh();close(leader.maxHp,max);close(leader.hp,max/2);
 const p=g.Squad.roster[0];p.dead=true;p.hp=0;g.MovePP.state(p,p.moves[0]).current=0;leader.level=22;g.Squad.recover();assert.equal(p.level,22);assert.equal(p.dead,false);close(p.hp,p.maxHp);close(g.MovePP.state(p,p.moves[0]).current,g.MovePP.max(p,p.moves[0]));
});
test('snake formation follows sampled captain route, shares level, and keeps members within a finite trail',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);for(const d of [7,25,133])g.Squad.recruit(d);leader.level=7;
 for(let i=0;i<160;i++){leader.x+=3;if(i>80)leader.y+=2;g.Squad.tick(1/30);}
 const members=g.Squad.deployed();assert.ok(members.every(p=>p.level===7&&p.x<leader.x&&Number.isFinite(p.y)));assert.ok(members[0].x>members[1].x&&members[1].x>members[2].x);
});
test('shop border uses all eight IVs and perfect values are red; unregistered species stay white',()=>{
 const g=setup().G,R=g.ExpeditionRules,s={owned:{}};assert.equal(R.border(s,4),'white');for(const [v,color]of [[1,'blue'],[16,'purple'],[25,'orange'],[31,'red']]){s.owned[4]={iv:Array(8).fill(v)};assert.equal(R.border(s,4),color);}
});
test('all local bodies can be hit by hostile projectiles and hazards; friendly damage is credited to actual companion owner',()=>{
 const s=setup(),g=s.G,leader=s.player(4);for(const f of ['js/entities/projectile.js','js/systems/combat.js','js/systems/hazards.js'])s.load(f);g.Squad.begin(leader);const p=g.Squad.recruit(6);p.x=100;p.y=0;leader.x=-300;p.invuln=leader.invuln=0;g.World.projectileBlock=()=>null;g.World.propsInCircle=()=>[];g.VFX={forType:()=>({}),forMove:()=>({})};g.Game.player=leader;g.Game.everyone=()=>g.Squad.actors();const hp=p.hp;
 g.Projectiles.spawn({friendly:false,x:p.x,y:p.y,dmg:10,r:4});g.Combat.resolve(0,leader,0);assert.ok(p.hp<hp);assert.equal(leader.hp,leader.maxHp);
 const e=s.enemy();e.x=p.x;e.y=p.y;let owner;e.hurt=(amount,col,x,y,k,eff,attacker)=>{owner=attacker;return 3;};p.critChance=0;leader.critChance=1;
 g.Projectiles.spawn({x:e.x,y:e.y,dmg:10,r:8,owner:p,hits:new Set(),phits:new Set(),pierce:0});g.Combat.resolve(0,leader,0);assert.equal(owner,p);assert.equal(p.dmgDealt,3);assert.equal(leader.dmgDealt,0);
 g.EnemyMgr.get=()=>null;const prev=p.hp;g.Hazards.add({kind:'zone',x:p.x,y:p.y,r:50,delay:0,dmg:7,color:'#f00'});g.Hazards.update(.1);assert.ok(p.hp<prev);
});
test('expedition victory requires Arceus, never elapsed time; survival mode retains its old checkpoint',()=>{
 const {G,fresh}=require('../server/domain.cjs'),D=G.Difficulty,s=fresh('Victory'),r={stars:1,dex:4,eligible:true,mode:'q',expedition:{day:59,arceus:false}};assert.equal(D.record(s,r,3600,true,true),false);assert.equal(D.unlocked(s),1);r.expedition={day:60,arceus:true};assert.equal(D.record(s,r,300,true,true),true);assert.equal(D.unlocked(s),2);for(const dex of [4,5,6])assert.equal(s.difficultyRecords[dex][1].won,true);assert.equal(D.claimBonus(s,r,100),100);assert.equal(s.coins>=200,true);assert.equal(D.claimBonus(s,r,100),0);
});
test('continuing past victory closes only that run cashout window; next run may still claim the difficulty opportunity',()=>{
 const R=require('../server/domain.cjs').G.ExpeditionRules;const won=R.progress({day:60,arceus:true,cashout:true});assert.ok(won.cashout);const continued=R.progress({day:60,arceus:true,cashout:false},won);assert.equal(continued.cashout,false);assert.equal(R.progress({day:60,arceus:true,cashout:true},continued).cashout,false);assert.equal(R.progress({day:61,arceus:true,cashout:true},won).cashout,false);assert.equal(R.progress({day:20,arceus:false},won).arceus,true);
});
test('isolated server records day-60 victory, pays one doubled cashout, rejects time-only victory and keeps new mode out of old score board',async t=>{
 const {createApp}=require('../server/server.cjs'),app=createApp({dbFile:':memory:',stunUrls:'none'});t.after(()=>app.close());app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;let cookie;
 async function call(route,body){const res=await fetch(base+'/api'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-PS-Client':'1',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});cookie=res.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:res.status,data:await res.json()};}
 const a=await call('/register',{name:'ExpeditionTest',pass:'test-only-strong-password'});assert.equal(a.status,201);const uid=a.data.user.uid,row=app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(uid),save=JSON.parse(row.payload);save.partner=4;save.owned[4]={iv:Array(8).fill(20)};app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(save),uid);
 const started=await call('/run/start',{dex:4,stars:1,mode:'q',clean:true});assert.equal(started.status,200);const id=started.data.id,baseRun={id,t:1801,speed:1,alive:true,clean:true,kills:3,lv:5,scoreCounts:{normal:0,elite:0,boss:3,rift:0,events:59},expedition:{day:59,arceus:false,cashout:false}};
 const early=await call('/run/beat',baseRun);assert.equal(early.status,200,JSON.stringify(early));assert.equal((await call('/session')).data.save.difficulty.cleared[1],undefined);assert.equal((await call('/run/bonus',{...baseRun,coins:100})).status,400);
 const victory={...baseRun,expedition:{day:60,arceus:true,cashout:true}},bonus=await call('/run/bonus',{...victory,coins:100});assert.equal(bonus.status,200,JSON.stringify(bonus));assert.equal(bonus.data.extra,100);assert.equal(bonus.data.save.difficulty.cleared[1],true);assert.equal((await call('/run/bonus',{...victory,coins:100})).data.extra,0);
 const end=await call('/run/end',{...victory,alive:false,failed:true});assert.equal(end.status,200);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM run_scores').get().n,0);assert.equal((await call('/run/end',{...victory,alive:false})).data.alreadyEnded,true);
 const second=await call('/run/start',{dex:4,stars:1,mode:'q',clean:true}),other={...victory,id:second.data.id};assert.equal((await call('/run/beat',other)).status,200);assert.equal((await call('/run/beat',{...other,expedition:{day:60,arceus:true,cashout:false}})).status,200);assert.equal((await call('/run/bonus',{...other,coins:100})).status,400);
});
