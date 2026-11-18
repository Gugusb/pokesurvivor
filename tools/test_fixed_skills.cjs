const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs'),noop=()=>{};
function setup(){const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js','js/systems/move-control.js','js/systems/move-pp.js'])s.load(f);g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;g.Combat={clearFields:noop};g.Squad.begin(s.player(25));return s;}
test('provided table covers all 966 species exactly and only names existing moves of each species own type',()=>{
 const {G:g}=setup();assert.equal(Object.keys(g.FIXED_SKILLS).length,g.DEX.length);assert.equal(g.DEX.length,966);for(const mon of g.DEX){const id=g.FIXED_SKILLS[mon.dex],m=g.Moves.BY_ID[id];assert.ok(m,mon.dex+': '+id);assert.ok(mon.types.includes(m.type),mon.name+': '+id);assert.ok(g.Moves.poolFor(mon).includes(id));}assert.ok(Object.isFrozen(g.FIXED_SKILLS));
});
test('ordinary evolution families share fixed skills and the four supplied branch exceptions remain intact',()=>{
 const {G:g}=setup();for(const family of [[1,2,3],[4,5,6],[7,8,9],[280,281,282,475],[840,841,842,1011,1019]])assert.equal(new Set(family.map(d=>g.FIXED_SKILLS[d])).size,1);
 assert.equal(g.FIXED_SKILLS[133],'quick-attack');assert.equal(g.FIXED_SKILLS[134],'bubble');assert.equal(g.FIXED_SKILLS[52],'tackle');assert.equal(g.FIXED_SKILLS[863],'metal-claw');assert.equal(g.FIXED_SKILLS[215],'hail');assert.equal(g.FIXED_SKILLS[903],'toxic');assert.equal(g.FIXED_SKILLS[222],'rock-slide');assert.equal(g.FIXED_SKILLS[864],'hex');
});
test('untrained companions always use the supplied move at every recruitment rank without changing captain defaults',()=>{
 const s=setup(),g=s.G;s.load('js/data/starters.js');assert.equal(g.startMoveOf(1),'vine-whip');assert.equal(g.Moves.startFor(g.DEX_BY[1]),'vine-whip');for(const rank of [1,2,3]){const p=new g.Squad.Member(1,rank);assert.equal(p.moves[0].id,'toxic');assert.equal(p.moves[0].lvl,Math.min(rank===1?2:rank===2?5:p.moves[0].def.maxLvl,p.moves[0].def.maxLvl));if(rank===3)assert.equal(p.moves[0].evolved,true);}
});
test('explicit trained moves survive same-species merging and evolution instead of being reset to the fixed default',()=>{
 const s=setup(),g=s.G;const p=g.Squad.recruit(1,'vine-whip');assert.equal(p.moves[0].id,'vine-whip');g.Squad.recruit(1);assert.equal(g.Squad.roster.length,1);assert.equal(p.dex,2);assert.equal(p.rank,2);assert.equal(p.moves[0].id,'vine-whip');assert.equal(p.moves[0].lvl,5);
});
test('regional branch shop species have their exact supplied default and training can still select another legal move',()=>{
 const s=setup(),g=s.G;for(const dex of [133,134,863,903,864]){const p=new g.Squad.Member(dex);assert.equal(p.dex,g.MonProgression.rootFor(dex));assert.equal(p.moves[0].id,g.FIXED_SKILLS[p.dex]);};const p=new g.Squad.Member(1,1,'vine-whip');assert.equal(p.moves[0].id,'vine-whip');assert.ok(g.Moves.poolFor(g.DEX_BY[1]).length>1);
});
