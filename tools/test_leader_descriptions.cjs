const test=require('node:test'),assert=require('node:assert/strict');
const cfg=require('./leader_config.cjs').read(process.cwd());

test('all 9 generations (508 families) have standardized, concise zh/en display descriptions',()=>{
 assert.equal(cfg.families.length,508);
 const forbidden=/budget\(|stats\.[a-z]|moves\.[a-z]|zCrit|incomingTypes|classStunT|applySlow|\*\*|`/;
 for(const f of cfg.families){
  assert.ok(f.display,`missing display on #${f.root}`);
  for(const lang of ['zh','en']){
   for(const key of ['base','active','cost','five','eight']){
    const arr=f.display[lang]?.[key];
    assert.ok(Array.isArray(arr)&&arr.length>=1&&arr.length<=4,`bad ${lang}.${key} on #${f.root}`);
    for(const line of arr){
     assert.ok(typeof line==='string'&&line.trim().length>=2,`empty ${lang}.${key} on #${f.root}`);
     assert.ok(line.length<=(lang==='zh'?95:165),`too long (${line.length}) ${lang}.${key} on #${f.root}: ${line}`);
     assert.ok(!forbidden.test(line),`forbidden token in ${lang}.${key} on #${f.root}: ${line}`);
    }
   }
   assert.equal(f.display[lang].active.length,2,`active must be 2 lines on #${f.root} (${lang})`);
   assert.ok(f.display[lang].active[1].includes('120'),`missing 120s charge rule on #${f.root} (${lang})`);
  }
 }
});
