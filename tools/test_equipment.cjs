const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
function setup(){const s=context(),{G}=s;for(const f of ['js/data/mega-forms.js','js/data/mega-types.js','js/systems/z-access.js','js/systems/mega.js','js/systems/z-moves.js'])s.load(f);G.DB.save.owned[6]={at:1,iv:Array(8).fill(31)};return s;}
test('one per-species slot switches between a free potion, permitted Z and an owned matching Mega Stone',()=>{
 const {G}=setup(),s=G.DB.save;
 assert.equal(G.Equipment.active(s,6),'superpotion');assert.equal(G.ZMoves.equip(s,6,'fire'),false);assert.equal(G.Mega.equip(s,6,'6-mega-x'),false);
 G.ZAccess.unlock(s,6);assert.ok(G.ZMoves.equip(s,6,'fire'));assert.equal(G.Equipment.active(s,6),null);
 G.Mega.grant(s,'6-mega-x');assert.equal(G.Mega.equip(s,65,'6-mega-x'),false);assert.ok(G.Mega.equip(s,6,'6-mega-x'));assert.equal(s.zEquipped[6],null);assert.equal(G.Equipment.active(s,6),null);
 assert.ok(G.Equipment.equip(s,6,'superpotion'));assert.equal(s.megaEquipped[6],null);assert.equal(s.zEquipped[6],null);assert.equal(G.Equipment.active(s,6),'superpotion');
 assert.equal(G.Equipment.equip(s,6,'fire'),false);assert.ok(G.Equipment.equip(s,6,null));assert.equal(G.Equipment.active(s,6),null);assert.equal(G.Equipment.active(s,5),'superpotion');
});
test('both PP consumables equip, clear stones, survive save validation and remain available to the server',()=>{
 const {G}=setup(),s=G.DB.save,domain=require('../server/domain.cjs');G.ZAccess.unlock(s,6);
 for(const id of ['pppotion','spiritspray']){
  G.ZMoves.equip(s,6,'fire');assert.ok(G.Equipment.equip(s,6,id));G.DB._test.sanitize(s);assert.equal(s.zEquipped[6],null);assert.equal(G.Equipment.active(s,6),id);assert.equal(new G.Player(G.DEX_BY[4],{},false,6).activeItem,id);
  const old=domain.fresh('Fixture'),input=domain.clone(old);input.owned[6]={at:1,iv:Array(8).fill(31)};input.activeEquipped[6]=id;assert.equal(domain.sanitize(input,old,'Fixture').activeEquipped[6],id);
 }
});

test('run equipment follows the selected species and remains exclusive before and after Mega evolution',()=>{
 const {G}=setup(),s=G.DB.save;G.Mega.grant(s,'6-mega-x');G.Mega.equip(s,6,'6-mega-x');
 const root=new G.Player(G.DEX_BY[4]);assert.equal(root.activeItem,'superpotion');assert.equal(root.megaState.id,null);
 const p=new G.Player(G.DEX_BY[4],{},false,6);assert.equal(p.activeItem,null);assert.equal(p.megaState.id,'6-mega-x');assert.equal(G.ZMoves.hasStone(p),false);
 G.ZAccess.unlock(s,6);G.ZMoves.equip(s,6,'fire');assert.equal(G.ZMoves.hasStone(new G.Player(G.DEX_BY[4])),false);const z=new G.Player(G.DEX_BY[4],{},false,6);assert.equal(z.activeItem,null);assert.equal(z.megaState.id,null);assert.ok(G.ZMoves.hasStone(z));
 G.Equipment.equip(s,6,'superpotion');assert.equal(new G.Player(G.DEX_BY[4],{},false,6).activeItem,'superpotion');
});
test('legacy migration preserves stones, rejects forged loadouts, and persists deliberate empty slots',()=>{
 const {G}=setup(),s=G.DB.save;G.Mega.grant(s,'6-mega-x');s.megaEquipped[6]='6-mega-x';delete s.activeEquipped;
 G.DB._test.sanitize(s);assert.equal(G.Equipment.active(s,6),null);assert.equal(s.activeEquipped[6],null);
 s.activeEquipped[6]='cheat';s.activeEquipped.bad='superpotion';s.zEquipped[6]='fire';G.DB._test.sanitize(s);assert.equal(s.zEquipped[6],undefined);assert.equal(s.activeEquipped.bad,undefined);assert.equal(s.activeEquipped[6],null);
 const older=JSON.parse(JSON.stringify(s));older.updated=1;s.updated=2;G.Equipment.equip(s,6,null);const merged=G.DB.merge(s,older);assert.equal(merged.activeEquipped[6],null);assert.equal(merged.megaEquipped[6],null);
 const legacy=JSON.parse(JSON.stringify(older));delete legacy.activeEquipped;legacy.updated=3;assert.equal(G.DB.merge(legacy,s).activeEquipped[6],null);
});
test('server save sanitation enforces permission and stone ownership and round-trips empty slots',()=>{
 const domain=require('../server/domain.cjs'),old=domain.fresh('Fixture'),s=domain.clone(old);s.owned[6]={at:1,iv:Array(8).fill(31)};s.activeEquipped[6]='superpotion';s.zEquipped[6]='fire';s.megaEquipped[6]='6-mega-x';
 let clean=domain.sanitize(s,old,'Fixture');assert.equal(clean.zEquipped[6],undefined);assert.equal(clean.megaEquipped[6],undefined);assert.equal(clean.activeEquipped[6],'superpotion');
 s.megaStones['6-mega-x']={at:1};clean=domain.sanitize(s,old,'Fixture');assert.equal(clean.megaEquipped[6],'6-mega-x');assert.equal(clean.activeEquipped[6],null);
 clean.activeEquipped[6]=null;clean.megaEquipped[6]=null;const empty=domain.sanitize(clean,clean,'Fixture');assert.equal(empty.activeEquipped[6],null);
 const legacy=domain.clone(empty);delete legacy.activeEquipped;assert.equal(domain.sanitize(legacy,empty,'Fixture').activeEquipped[6],null);
});
