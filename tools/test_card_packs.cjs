const test=require('node:test'),assert=require('node:assert/strict');
const {G,fresh,sanitize}=require('../server/domain.cjs');
test('legacy training refunds exact costs once, clears levels and preserves collection',()=>{
 const s=fresh('Legacy');delete s.cardPack;s.coins=100;s.pupg={4:{atk:3},133:{hp:2}};s.owned[4]={iv:Array(8).fill(1)};
 const refund=[0,1,2].reduce((a,n)=>a+G.Upgrades.cost('atk',n),0)+G.Upgrades.cost('hp',0)+G.Upgrades.cost('hp',1);G.CardPacks.normalize(s);assert.equal(s.coins,100+refund);assert.deepEqual(Object.keys(s.pupg),[]);assert.equal(G.CardPacks.levels(s).atk,0);assert.ok(s.owned[4]);G.CardPacks.normalize(s);assert.equal(s.coins,100+refund);
 s.coins=1e8;delete s.cardPack;s.pupg={4:{hp:2}};G.CardPacks.normalize(s);assert.ok(s.cardPack.refundDue>0);const owed=s.cardPack.refundDue;s.coins-=800;G.CardPacks.normalize(s);assert.equal(s.coins,1e8-800+owed);assert.equal(s.cardPack.refundDue,0);
});
test('draw charges once, persists its three physical cards and returns unchosen stock',()=>{
 const s=fresh('Cards');s.coins=10000;const before=G.CardPacks.remaining(s),offer=G.CardPacks.draw(s,()=>0);assert.equal(offer.options.length,3);assert.equal(s.coins,9200);assert.equal(G.CardPacks.draw(s).seq,offer.seq);assert.equal(s.coins,9200);assert.equal(G.CardPacks.remaining(s),before);const restored=JSON.parse(JSON.stringify(s));G.CardPacks.normalize(restored);assert.deepEqual(restored.cardPack.pending,JSON.parse(JSON.stringify(offer)));G.CardPacks.choose(s,offer.seq,0);assert.equal(G.CardPacks.remaining(s),before-1);assert.throws(()=>G.CardPacks.choose(s,offer.seq,0));assert.equal(G.CardPacks.levels(s).hp,1);
});
test('finite pack exhausts without replacement, grants exactly 1000 tickets/200 gems, 25 unlocks and ten styles',()=>{
 const s=fresh('Finite');s.coins=1e7;const before=G.CardPacks.remaining(s),gems=s.abilityGems;for(let n=0;n<before;n++){const p=G.CardPacks.draw(s,()=>0);G.CardPacks.choose(s,p.seq,0);}assert.equal(G.CardPacks.remaining(s),0);assert.throws(()=>G.CardPacks.draw(s));assert.equal(s.tickets.t1,1000);assert.equal(s.abilityGems,gems+200);assert.equal(G.STARTER_ITEMS.length,25);assert.equal(G.CardPacks.themes.length,10);for(const u of G.Upgrades.LIST)assert.equal(G.CardPacks.levels(s)[u.id],u.id==='cd'?0:u.max);G.CardPacks.toggle(s,'charcoal');assert.equal(G.CardPacks.enabled(s,'charcoal'),false);G.CardPacks.toggle(s,'charcoal');assert.equal(G.CardPacks.enabled(s,'charcoal'),true);G.CardPacks.equip(s,'ocean');assert.equal(s.cardPack.theme,'ocean');
});
test('forged save updates cannot unlock cards, rewrite stock or reintroduce per-species levels',()=>{
 const old=fresh('Safe'),input=JSON.parse(JSON.stringify(old));input.cardPack.taken['stat:hp']=10;input.cardPack.taken['item:charcoal']=1;input.pupg={4:{hp:10}};const out=sanitize(input,old,'Safe');assert.equal(out.cardPack.taken['stat:hp'],0);assert.deepEqual(out.pupg,{});assert.throws(()=>G.CardPacks.toggle(old,'charcoal'));assert.throws(()=>G.CardPacks.equip(old,'ocean'));old.coins=799;assert.throws(()=>G.CardPacks.draw(old));assert.equal(old.coins,799);
});
test('original type items and class items boost only matching attacks; unavailable items never enter pools',()=>{
 const p={specialItems:{charcoal:2,wiseglasses:1}},s=fresh('Pool');assert.ok(Math.abs(G.Items.typeBonus(p,{type:'fire',damageClass:'special'})-.14)<1e-8);assert.equal(G.Items.typeBonus(p,{type:'water',damageClass:'physical'}),0);assert.equal(G.Items.typeBonus(p,{}),0);
 const db=G.DB,u=G.U;try{G.DB={save:s};let pool;G.U={pick:items=>{pool=items;return items[0];}};G.Items.roll();assert.ok(!pool.some(i=>i.unlock));s.cardPack.taken['item:charcoal']=1;G.Items.roll();assert.ok(pool.some(i=>i.id==='charcoal'));G.CardPacks.toggle(s,'charcoal');G.Items.roll();assert.ok(!pool.some(i=>i.id==='charcoal'));}finally{G.DB=db;G.U=u;}
});

test('peer Boss choices cannot introduce locked or disabled new items',()=>{
 const {context}=require('./battle_fixture.cjs'),s=context(),g=s.G;s.load('js/data/starter-items.js');s.load('js/systems/card-packs.js');g.CardPacks.normalize(g.DB.save);let options;g.Game.offerSpecialChoice=x=>options=x;
 assert.ok(g.BossRewards.receive(700001,{rift:false,stone:null,options:['charcoal','leftovers','quickclaw']}));assert.ok(options.every(id=>!g.Items.BY[id].unlock));
 g.CardPacks.normalize(g.DB.save).taken['item:charcoal']=1;g.CardPacks.toggle(g.DB.save,'charcoal');assert.ok(g.BossRewards.receive(700002,{rift:false,stone:null,options:['charcoal','leftovers','quickclaw']}));assert.ok(!options.includes('charcoal'));
});
