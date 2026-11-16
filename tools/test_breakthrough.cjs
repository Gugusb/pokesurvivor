const test=require('node:test'),assert=require('node:assert/strict');
const {G,fresh,sanitize}=require('../server/domain.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('breakthrough has one Z card per family, four six-level skills and ten Boss unlocks; costs 2700 independently',()=>{
 const s=fresh('Break'),pack=G.CardPacks.packBy.breakthrough;s.coins=10000;
 assert.equal(pack.price,2700);assert.equal(G.CardPacks.packBy.beginner.price,800);assert.equal(G.CardPacks.skills.length,4);assert.equal(pack.cards.filter(c=>c.kind==='skill').reduce((a,c)=>a+c.max,0),24);
 const roots=new Set(G.DEX.map(m=>G.ZAccess.root(m.dex))),z=pack.cards.filter(c=>c.kind==='z');assert.equal(z.length,roots.size);for(const m of G.DEX)assert.ok(z.some(c=>c.key===G.ZAccess.root(m.dex)));
 assert.equal(G.BREAKTHROUGH_ITEMS.length,10);for(const i of G.BREAKTHROUGH_ITEMS){assert.ok(i.boss&&i.unlock);assert.ok(pack.cards.some(c=>c.key===i.id));}
 const beginner=G.CardPacks.remaining(s),before=G.CardPacks.remaining(s,'breakthrough'),p=G.CardPacks.draw(s,()=>0,'breakthrough');assert.equal(s.coins,7300);assert.equal(p.pack,'breakthrough');assert.equal(G.CardPacks.draw(s,()=>0).seq,p.seq);assert.equal(s.coins,7300);G.CardPacks.choose(s,p.seq,0);assert.equal(G.CardPacks.remaining(s),beginner);assert.equal(G.CardPacks.remaining(s,'breakthrough'),before-1);
});
test('all old agility levels retain exact benefit once, and a paid old agility choice survives migration',()=>{
 for(let n=0;n<=8;n++){const s=fresh('Migration');delete s.cardPack.skillMigrated;s.cardPack.taken['stat:cd']=n;const p=G.CardPacks.normalize(s);near(G.Upgrades.perks(G.CardPacks.levels(s)).statGrowth.agility,n*.03);const after=JSON.stringify(p);G.CardPacks.normalize(s);assert.equal(JSON.stringify(p),after);assert.ok(!G.CardPacks.packBy.beginner.cards.some(c=>c.id==='stat:cd'));}
 const s=fresh('Pending');delete s.cardPack.skillMigrated;s.cardPack.taken['stat:cd']=3;s.cardPack.seq=1;s.cardPack.pending={seq:1,options:['stat:cd','stat:hp','stat:cd']};G.CardPacks.normalize(s);G.CardPacks.choose(s,1,0);near(G.Upgrades.perks(G.CardPacks.levels(s)).statGrowth.agility,.12);
});
test('owned Z families leave stock, claimed permission covers all branches, and acquired pending permission is replaced',()=>{
 const s=fresh('Permissions'),C=G.CardPacks,stock=C.remaining(s,'breakthrough');G.ZAccess.unlock(s,134,'duplicates');assert.equal(C.remaining(s,'breakthrough'),stock-1);
 s.cardPack.seq=1;s.cardPack.pending={seq:1,pack:'breakthrough',options:['z:4','z:7','z:1']};C.choose(s,1,0);for(const d of [4,5,6])assert.ok(G.ZAccess.allowed(s,d));assert.equal(C.remaining(s,'breakthrough'),stock-2);
 s.cardPack.seq=2;s.cardPack.pending={seq:2,pack:'breakthrough',options:['z:7','z:1','z:172']};G.ZAccess.unlock(s,9,'duplicates');C.normalize(s);assert.equal(s.cardPack.pending.options.length,3);assert.ok(!s.cardPack.pending.options.includes('z:7'));assert.equal(new Set(s.cardPack.pending.options).size,3);
 const input=JSON.parse(JSON.stringify(s));input.cardPack.taken['skill:retention']=6;const out=sanitize(input,s,'Permissions');assert.equal(out.cardPack.taken['skill:retention'],0);
});
function battle(){const s=require('./battle_fixture.cjs').context('zh',false),g=s.G;for(const f of ['js/systems/z-access.js','js/data/starter-items.js','js/data/breakthrough-items.js','js/systems/card-packs.js','js/systems/move-pp.js','js/systems/breakthrough-items.js'])s.load(f);g.CardPacks.normalize(g.DB.save);g.Game.st={time:10};g.Game.state='playing';s.make=(items=[])=>{const p=s.player(6);p.moves=['ember','tackle','swords-dance'].map(id=>g.Moves.instance(id));p.slots=p.moves.map(m=>[m]);for(const id of items){g.DB.save.cardPack.taken['item:'+id]=1;assert.ok(g.Items.gain(p,id));}return p;};return s;}
test('skill cards modify actual original stats, PP caps and additive PP-retention without weakening PP requirements',()=>{
 const s=battle(),g=s.G;for(const c of g.CardPacks.skills)g.DB.save.cardPack.taken[c.id]=6;const perks=g.Upgrades.perks(g.CardPacks.levels(g.DB.save)),p=new g.Player(g.DEX_BY[6],perks);near(p.statGrowth.agility,.3);near(p.statGrowth.stamina,.3);assert.equal(p.maxPpBonus,6);near(p.ppRetention,.18);const m=g.Moves.instance('ember');p.moves=[m];p.slots=[[m]];assert.equal(g.MovePP.max(p,m),21);s.random([.17,.19]);assert.ok(g.MovePP.consume(p,m));near(g.MovePP.state(p,m).current,21);assert.ok(g.MovePP.consume(p,m));near(g.MovePP.state(p,m).current,20);g.MovePP.state(p,m).current=0;assert.equal(g.MovePP.consume(p,m),false);
});
test('room service and terrain extender reward real switches, once per slot and within their window',()=>{
 const s=battle(),g=s.G,p=s.make(['roomservice','terrainextender']),[a,b]=p.moves;g.MovePP.state(p,a).current=0;g.MovePP.state(p,b).current=0;p.activeItem='spiritspray';assert.ok(g.Items.useActive(p));p.setActive(1);near(g.MovePP.state(p,a).current,2);near(g.MovePP.state(p,b).current,5);p.setActive(0);near(g.MovePP.state(p,a).current,7);p.setActive(1);near(g.MovePP.state(p,b).current,5);g.Game.st.time+=11;p.setActive(0);near(g.MovePP.state(p,a).current,7);near(g.MovePP.state(p,b).current,7);
});
test('throat spray and low-health eject button grant bounded free damaging casts; contact red card readies and slows',()=>{
 const s=battle(),g=s.G,p=s.make(['throatspray','ejectbutton','redcard']),[a,b,c]=p.moves;g.Items.onCast(p,c);g.MovePP.state(p,a).current=0;assert.ok(g.MovePP.consume(p,a));assert.equal(g.MovePP.consume(p,a),false);p.hp=p.maxHp*.2;let slowed;const e={applySlow:(x,t)=>slowed=[x,t]};a.t=5;p.hurt(1,null,true,{kind:'contact',enemy:e});near(a.t,0);assert.deepEqual(slowed,[.5,2]);assert.ok(p.invuln>=.75);assert.ok(g.MovePP.consume(p,a));assert.equal(g.MovePP.consume(p,a),false);
});
test('blunder policy and cell battery fund missing PP without lethal payment or repeated cooldown abuse',()=>{
 const s=battle(),g=s.G,p=s.make(['blunderpolicy','cellbattery']),[a]=p.moves;g.MovePP.state(p,a).current=0;const hp=p.hp;assert.ok(g.MovePP.consume(p,a));assert.equal(p.hp,hp);assert.equal(p.tempPP,1);assert.ok(g.MovePP.consume(p,a));assert.equal(p.tempPP,0);assert.ok(g.MovePP.consume(p,a));near(p.hp,hp-p.maxHp*.02);assert.equal(g.MovePP.consume(p,a),false);g.Game.st.time+=1;p.hp=1;assert.equal(g.MovePP.consume(p,a),false);assert.equal(p.hp,1);
});
test('big root bounds overheal conversion; binding band finds the learned move from damage metadata and supports peer receipts',()=>{
 const s=battle(),g=s.G,p=s.make(['bigroot','bindingband']),[a]=p.moves;p.heal(1000);assert.equal(p.tempPP,3);p.heal(1000);assert.equal(p.tempPP,3);g.Game.st.time++;p.heal(10);assert.equal(p.tempPP,6);g.MovePP.state(p,a).current=0;g.Items.onHit(p,{slowT:1},{id:a.id,kind:a.kind});near(g.MovePP.state(p,a).current,1);g.Items.onHit(p,{slowT:1},{id:a.id});near(g.MovePP.state(p,a).current,1);g.Game.st.time++;p.remote=true;const got=[];g.Coop.specReward=(p,id,h,pp)=>got.push([id,h,pp]);g.Items.onHit(p,{slowT:1},{id:a.id});assert.deepEqual(got,[[a.id,0,1]]);
});
test('white herb cleanses with cooldown; new Boss rewards obey unlock/toggle and never enter ordinary loot',()=>{
 const s=battle(),g=s.G,p=s.make(['whiteherb']),[a]=p.moves;g.MovePP.state(p,a).current=0;p.slowT=3;g.BreakItems.tick(p);assert.equal(p.slowT,0);near(g.MovePP.state(p,a).current,3);p.slowT=3;g.BreakItems.tick(p);assert.equal(p.slowT,3);
 let pool;g.U.pick=items=>{pool=items;return items[0];};g.Items.roll();assert.ok(pool.every(i=>!i.boss));g.DB.save.cardPack.taken['item:cellbattery']=1;let calls=0;assert.ok(g.Items.rewardChoices(()=>++calls%2?0:.999,false).includes('cellbattery'));g.CardPacks.toggle(g.DB.save,'cellbattery');for(let n=0;n<50;n++)assert.ok(!g.Items.rewardChoices(Math.random,true).includes('cellbattery'));
});

test('peer inventories retain new Boss items beyond the former 32-kind limit and return PP through existing receipts',()=>{
 const s=battle(),g=s.G,p=s.make();let receive;const noop=()=>{};g.Net={uid:'host',on:f=>receive=f,onPeer:noop};g.startMoveOf=()=> 'ember';g.Sprites.preload=noop;s.load('js/net/coop.js');
 g.Coop.begin({host:'host',members:[{uid:'host',dex:6},{uid:'peer',dex:6}]},p,{});
 const items=g.Items.LIST.filter(i=>!['linker','masterytm'].includes(i.id)).map(i=>[i.id,1]);assert.ok(items.length>32);
 const frame=[0,0,0,0,100,100,0,'ember',1,78,0,1,0,0,0,null,null,0,null,0,null,6,25,[4,5,6],items];receive('peer',{k:'f',p:frame,ev:[]});const peer=g.Coop.mate('peer').pl;for(const i of g.BREAKTHROUGH_ITEMS)assert.equal(g.Items.count(peer,i.id),1);
 const receipts=[];g.Coop.specReward=(p,id,h,pp)=>receipts.push([id,h,pp]);g.Items.onHit(peer,{slowT:2},{id:'ember'});assert.deepEqual(receipts,[['ember',0,1]]);g.Coop.end();
});

test('the finite second deck exhausts once, and the last paid Z offer refunded by an outside unlock cannot repay twice',()=>{
 const s=fresh('Exhaust'),C=G.CardPacks;s.coins=1e7;const total=C.remaining(s,'breakthrough'),coins=s.coins;for(let i=0;i<total;i++){const offer=C.draw(s,()=>0,'breakthrough');C.choose(s,offer.seq,0);}assert.equal(C.remaining(s,'breakthrough'),0);assert.equal(s.coins,coins-total*2700);assert.throws(()=>C.draw(s,()=>0,'breakthrough'));for(const m of G.DEX)assert.ok(G.ZAccess.allowed(s,m.dex));for(const c of C.skills)assert.equal(C.levels(s)[c.key],6);
 const p=C.normalize(s);delete s.zAccess[7];p.taken['z:7']=0;s.coins=5000;const offer=C.draw(s,()=>0,'breakthrough');assert.deepEqual(Array.from(offer.options),['z:7']);G.ZAccess.unlock(s,9,'duplicates');C.normalize(s);assert.equal(p.pending,null);C.normalize(s);assert.equal(s.coins,5000);C.normalize(s);assert.equal(s.coins,5000);
});
