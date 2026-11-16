const test=require('node:test'),assert=require('node:assert/strict');
const {G,fresh}=require('../server/domain.cjs'),{context}=require('./battle_fixture.cjs'),copy=x=>JSON.parse(JSON.stringify(x));
test('ten-pack draws give ten consecutive choices and charge one opening per round',()=>{
 const s=fresh('Ten');s.coins=20000;const stock=G.CardPacks.remaining(s);G.CardPacks.drawMany(s,()=>0);assert.throws(()=>G.CardPacks.apply(s,{action:'choose',seq:s.cardPack.pending.seq,index:0,offerId:'stale-offer'}),/Invalid pack choice/);
 for(let n=1;n<=10;n++){const p=s.cardPack.pending;assert.ok(p);assert.equal(p.batch.total,10);assert.equal(p.batch.left,11-n);assert.equal(s.coins,20000-800*n);G.CardPacks.choose(s,p.seq,0,()=>0);}
 assert.equal(s.cardPack.pending,null);assert.equal(G.CardPacks.remaining(s),stock-10);assert.equal(s.coins,12000);
});
test('owned ten packs consume tokens, retain a paid choice across reload and finish the final short batch',()=>{
 const s=fresh('OwnedTen');s.coins=0;G.CardPacks.grantToken(s,'beginner',10);G.CardPacks.drawMany(s,()=>0,'beginner',true);
 for(let n=0;n<3;n++){const p=s.cardPack.pending;G.CardPacks.choose(s,p.seq,0,()=>0);}const restored=copy(s);G.CardPacks.normalize(restored);assert.deepEqual(copy(restored.cardPack.pending),copy(s.cardPack.pending));
 for(let n=3;n<10;n++){const p=restored.cardPack.pending;G.CardPacks.choose(restored,p.seq,0,()=>0);}assert.equal(restored.cardPack.tokens.beginner,0);assert.equal(restored.coins,0);
 const tail=fresh('Tail');tail.coins=10000;for(const c of G.CardPacks.packBy.beginner.cards)tail.cardPack.taken[c.id]=c.max;tail.cardPack.taken['stat:hp']-=2;G.CardPacks.drawMany(tail,()=>0);assert.equal(tail.cardPack.pending.batch.total,2);for(let n=0;n<2;n++)G.CardPacks.choose(tail,tail.cardPack.pending.seq,0,()=>0);assert.equal(tail.coins,8400);assert.equal(G.CardPacks.remaining(tail),0);
});
test('insufficient ten-draw funds leave wallet, stock and pending state unchanged',()=>{
 const s=fresh('Poor');s.coins=7999;const before=copy(s);assert.throws(()=>G.CardPacks.drawMany(s),/Not enough coins/);assert.deepEqual(copy(s),before);assert.throws(()=>G.CardPacks.drawMany(s,Math.random,'beginner',true),/No pack owned/);
});
test('card sync preserves unsent choices, cloud token grants and separately paid pending offers',()=>{
 const base=fresh('Merge');base.coins=20000;const a=copy(base),b=copy(base);G.CardPacks.draw(a,()=>0);G.CardPacks.draw(b,()=>.9);const merged=G.SaveSync.rebase(a,base,b);assert.equal(merged.cardPack.waiting.length,1);assert.equal(merged.coins,18400);
 const send=copy(a);G.CardPacks.choose(a,a.cardPack.pending.seq,0,()=>0);G.CardPacks.grantToken(b,'breakthrough',2);const preserved=G.SaveSync.rebase(b,send,a);assert.equal(preserved.cardPack.tokens.breakthrough,2);assert.equal(preserved.cardPack.taken['stat:hp'],1);assert.ok(!preserved.cardPack.pending||preserved.cardPack.pending.id!==send.cardPack.pending.id);
 for(const c of G.CardPacks.cards)assert.ok(preserved.cardPack.taken[c.id]<=c.max);
});
test('hundred pulls use ten-pull vouchers first then fill the remainder with single tickets',()=>{
 const {G:g}=context();for(const [t10,t1,ok]of [[10,0,true],[6,40,true],[0,100,true],[6,39,false],[20,100,true]]){const s=g.DB.save;s.tickets={t10,t1};const cost=g.Gacha.costOf(s,100);assert.equal(!!cost,ok);if(ok){assert.equal(cost.t10,Math.min(10,t10));assert.equal(cost.t1,100-10*Math.min(10,t10));const out=g.Gacha.pull(s,100);assert.equal(out.length,100);assert.equal(s.tickets.t10,t10-cost.t10);assert.equal(s.tickets.t1,t1-cost.t1);}else{assert.equal(g.Gacha.pull(s,100),null);assert.equal(s.tickets.t10,t10);assert.equal(s.tickets.t1,t1);}}
});

test('duplicate card receipts cannot charge or award twice, even with a small wallet',()=>{
 const base=fresh('Duplicate');base.coins=1000;const once=copy(base);G.CardPacks.draw(once,()=>0);G.CardPacks.choose(once,once.cardPack.pending.seq,0,()=>0);const repeated=G.SaveSync.rebase(once,base,once);assert.equal(repeated.coins,200);assert.equal(repeated.cardPack.taken['stat:hp'],1);
});
test('concurrent claims on the final finite resource card refund the excess opening and resource reward',()=>{
 const base=fresh('LastCard');base.coins=2000;for(const c of G.CardPacks.packBy.beginner.cards)base.cardPack.taken[c.id]=c.max;base.cardPack.taken.tickets=9;
 const a=copy(base),b=copy(base);for(const s of [a,b]){G.CardPacks.draw(s,()=>0);G.CardPacks.choose(s,s.cardPack.pending.seq,0,()=>0);}const merged=G.SaveSync.rebase(a,base,b);assert.equal(merged.coins,1200);assert.equal(merged.tickets.t1,100);assert.equal(merged.cardPack.taken.tickets,10);assert.equal(Object.values(merged.cardPack.closed).filter(v=>v.refunded).length,1);
});
