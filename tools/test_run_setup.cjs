const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
function setup(){const s=context('zh',false);for(const f of ['js/data/starters.js','js/systems/z-access.js','js/data/starter-items.js','js/data/breakthrough-items.js','js/systems/card-packs.js','js/systems/equipment.js','js/systems/run-setup.js'])s.load(f);const p=s.G.CardPacks.normalize(s.G.DB.save);Object.assign(p.taken,{'stat:ban':3,'stat:hp':2,'item:charcoal':1});p.disabled.charcoal=true;return s;}
test('family bans include future forms, share one root record, exclude starting move and respect capacity',()=>{
 const {G:g}=setup(),s=g.DB.save,r=g.RunSetup;assert.equal(r.root(6),4);const ids=r.moves(6);assert.ok(ids.length>3);assert.ok(!ids.includes(g.startMoveOf(4)));
 for(const id of ids.slice(0,3))assert.equal(r.toggle(s,6,id),true);assert.equal(r.toggle(s,6,ids[3]),false);assert.deepEqual(Array.from(r.bans(s,4)),Array.from(r.bans(s,6)));assert.equal(s.pban[6],undefined);
 assert.equal(r.toggle(s,4,ids[0]),true);assert.equal(r.toggle(s,6,ids[3]),true);assert.equal(r.toggle(s,6,g.startMoveOf(4)),false);
});
test('legacy selected-form bans are read until a canonical family choice is saved',()=>{
 const {G:g}=setup(),s=g.DB.save,r=g.RunSetup,ids=r.moves(6);s.pban={6:[ids[0],ids[0],'__invalid__',g.startMoveOf(4)]};assert.deepEqual(Array.from(r.bans(s,6)),[ids[0]]);r.toggle(s,6,ids[1]);assert.deepEqual(Array.from(r.bans(s,4)),Array.from(ids.slice(0,2)));
});
test('search covers localized names, original names, dex numbers and all evolution branches; only owned forms are selectable',()=>{
 const {G:g}=setup(),s=g.DB.save;s.owned={6:{iv:Array(8).fill(10)},133:{iv:Array(8).fill(10)}};
 for(const query of ['喷火龙','Charizard','6','小火龙'])assert.ok(g.RunSetup.owned(s,query).some(p=>p.dex===6),query);
 assert.ok(g.RunSetup.owned(s,'仙子伊布').some(p=>p.dex===133));assert.equal(g.RunSetup.owned(s,'does-not-exist').length,0);assert.ok(g.RunSetup.owned(s).every(p=>s.owned[p.dex]));
});
test('preview separates enabled, disabled and locked items, uses held item on selected form and reports card bonuses without unlocking species',()=>{
 const {G:g}=setup(),s=g.DB.save;s.partner=6;s.owned={6:{iv:Array(8).fill(10)}};s.activeEquipped={6:'pppotion'};const before=JSON.stringify(s),p=g.RunSetup.snapshot(s);
 assert.equal(p.root,4);assert.equal(p.held.id,'pppotion');assert.equal(p.perks.statGrowth.hp,.06);assert.equal(p.items.find(i=>i.id==='charcoal').state,'disabled');assert.equal(p.items.find(i=>i.id==='leftovers').state,'enabled');assert.equal(p.items.find(i=>i.id==='silkscarf').state,'locked');assert.equal(JSON.stringify(s),before);
});
test('zero unlocked slots preserve starting move and do not permit new bans',()=>{
 const {G:g}=setup(),s=g.DB.save;s.cardPack.taken['stat:ban']=0;assert.equal(g.RunSetup.limit(s),0);assert.equal(g.RunSetup.toggle(s,4,g.RunSetup.moves(4)[0]),false);
});
