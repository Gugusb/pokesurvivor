// node --test tools/test_mega_preview.cjs
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..'), noop = () => {};
function context() {
  const s = { console, performance:{now:()=>0}, setTimeout:noop, CanvasRenderingContext2D:function(){},
    localStorage:{getItem:()=> 'zh',setItem:noop}, navigator:{language:'zh-CN'},
    document:{documentElement:{},addEventListener:noop}, addEventListener:noop, location:{pathname:'/'},
    Image:class {set src(value){this.url=value;const b=fs.readFileSync(path.join(ROOT,value));this.width=b.readUInt32BE(16);this.height=b.readUInt32BE(20);if(this.onload)this.onload();}} };
  s.window=s;vm.createContext(s);
  const load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),s,{filename:f});
  for(const f of ['js/core/util.js','js/core/i18n.js','js/data/lang-en.js','js/data/lang-zh.js','js/data/pokedex.js','js/data/sprites-meta.js','js/data/mega-forms.js','js/core/sprites.js','js/systems/mega-preview.js'])load(f);
  const G=s.G;let enabled=true,marked=0;
  G.Coop={active:false};G.Game={state:'playing',debugMark:()=>marked++};G.Dev={canUse:()=>enabled&&!G.Coop.active};
  s.player=dex=>{
    const p={dex,spriteDex:dex,mon:G.DEX_BY[dex],anim:new G.Sprites.Animator(dex),shiny:false,dead:false,
      hp:100,maxHp:120,r:14,bodyH:G.Sprites.bodyHeight(dex),ability:'pressure',atk:2,spd:100};
    G.Game.player=p;return p;
  };
  s.load=load;s.enabled=v=>enabled=v;s.marked=()=>marked;return s;
}

test('pinned Mega manifest has 43 canonical Gen 1/3 forms and validates all 315 imported files',()=>{
  const m=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/mega/manifest.json'),'utf8'));
  assert.match(m.commit,/^[a-f0-9]{40}$/);assert.equal(m.forms.length,43);
  assert.equal(m.forms.filter(f=>f.available).length,23);assert.equal(m.forms.filter(f=>f.meta?.sh).length,22);
  assert.equal(new Set(m.forms.map(f=>f.id)).size,43);let count=0;
  for(const f of m.forms){
    assert.ok(f.dex<=151||f.dex>=252&&f.dex<=386);assert.ok(['Mega','Mega_X','Mega_Y','Mega_Z'].includes(f.form));
    if(!f.available){assert.equal(f.meta,undefined);continue;}
    assert.ok(f.artists.length);assert.ok(f.meta.a.Idle&&f.meta.a.Walk&&f.meta.a.Attack);
    for(const a of f.files){const b=fs.readFileSync(path.join(ROOT,a.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);count++;}
  }
  assert.equal(count,315);
});

test('every normal and shiny form renders all seven animations in eight directions with valid crop bounds',()=>{
  const s=context(),{G}=s;let draws=0;
  const ctx={globalAlpha:1,drawImage:(img,sx,sy,w,h)=>{assert.ok(sx>=0&&sy>=0);assert.ok(sx+w<=img.width);assert.ok(sy+h<=img.height);draws++;}};
  for(const f of G.MegaPreview.LIST.filter(f=>f.available))for(const shiny of [false,...(f.meta.sh?[true]:[])]){
    const anim=new G.Sprites.Animator(f.id,1,shiny);
    for(const name of G.Sprites.ANIMS)for(let dir=0;dir<8;dir++){
      anim.dir=dir;anim.play(name);anim.update(.05);anim.draw(ctx,0,0);
      anim.update(10);anim.draw(ctx,0,0);
    }
  }
  assert.equal(draws,45*7*8*2);
});

test('runtime preview changes only visual data and restores base visuals without writing to the save',()=>{
  const s=context(),{G}=s,p=s.player(6);p.anim.dir=5;p.shiny=true;
  const stats=()=>JSON.stringify([p.dex,p.hp,p.maxHp,p.r,p.ability,p.atk,p.spd,p.mon]);const before=stats();
  assert.equal(G.MegaPreview.apply(p,'6-mega-x',true),true);assert.equal(p.spriteDex,'6-mega-x');assert.equal(p.anim.dir,5);assert.equal(p.anim.shiny,true);
  assert.equal(stats(),before);assert.equal(s.marked(),1);assert.equal(G.MegaPreview.play(p,'Shoot'),true);
  assert.equal(G.MegaPreview.restore(p),true);assert.equal(p.spriteDex,6);assert.equal(p.anim.shiny,true);assert.equal(p.megaForm,null);assert.equal(stats(),before);
});

test('preview rejects disabled debugging, co-op, dead players, different base species and unavailable assets',()=>{
  const s=context(),{G}=s,p=s.player(6);s.enabled(false);assert.equal(G.MegaPreview.apply(p,'6-mega-x'),false);
  s.enabled(true);G.Coop.active=true;assert.equal(G.MegaPreview.apply(p,'6-mega-x'),false);G.Coop.active=false;
  p.dead=true;assert.equal(G.MegaPreview.apply(p,'6-mega-x'),false);p.dead=false;
  assert.equal(G.MegaPreview.apply(p,'150-mega-y'),false);assert.equal(G.MegaPreview.apply(p,'6-mega-y'),false);
  G.Game.state='ui';assert.equal(G.MegaPreview.apply(p,'6-mega-x'),false);G.Game.state='playing';
  const medi=s.player(308);assert.equal(G.MegaPreview.apply(medi,'308-mega',true),false);
});

test('Mega keys do not become catchable species, medals or ordinary sprite replacements',()=>{
  const s=context(),{G}=s,count=G.DEX.length,base=G.SPRITE_META[6];s.load('js/data/abilities.js');
  assert.equal(G.AbilityDefs.LIST.length,63);assert.equal(G.DEX_BY['6-mega-x'],undefined);assert.equal(G.SPRITE_META[6],base);
  assert.equal(G.Sprites.sheet(6,'Idle').src,'assets/pokemon/6/Idle.png');
  assert.equal(G.Sprites.sheet('6-mega-x','Idle').src,'assets/mega/6-mega-x/Idle.png');assert.equal(G.DEX.length,count);
  const scep=G.MegaPreview.BY_ID['254-mega'];assert.equal(scep.aliases.Attack,'Idle');assert.ok(scep.partial);
});

test('disabling developer mode or entering co-op restores base appearance',()=>{
  const s=context(),{G}=s,p=s.player(6);assert.equal(G.MegaPreview.apply(p,'6-mega-x'),true);
  G.AbilityGacha={clearDebug:noop};G.Camera={setViewMultiplier:noop};G.DB={loggedIn:true};
  s.load('js/ui/developer.js');G.Dev.setEnabled(false);assert.equal(p.spriteDex,6);assert.equal(p.megaForm,null);
  G.Dev={canUse:()=>true};assert.equal(G.MegaPreview.apply(p,'6-mega-x'),true);
  G.Net={uid:'self',on:noop,onPeer:noop};s.load('js/net/coop.js');
  G.Coop.begin({host:'self',members:[{uid:'self',dex:6,name:'test'}]},p,{});
  assert.equal(p.spriteDex,6);assert.equal(p.megaForm,null);G.Coop.end();
});
