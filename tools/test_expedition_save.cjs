const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){const storage=new Map(),g={DB:{loggedIn:true,mode:'local',user:'Alice'},I18n:{lang:'zh'},DEX_BY:{1:{}},Moves:{BY_ID:{tackle:{}}},Player:class Player{heal(){}},Game:{state:'ui'},UI:{toast(){}}};vm.runInNewContext(fs.readFileSync('js/systems/expedition-save.js','utf8'),{G:g,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},console,Date,Set,Map,addEventListener(){}});const data={run:{phase:'route',day:5,map:[]},captain:{fields:{dex:1,hp:10,maxHp:10},moves:[{id:'tackle',lvl:1}],slots:[[0]]},members:[],formation:[],pool:[1],game:{time:20,pendingLevels:0,protectionRunId:'run-test-123'}};const slot={format:1,owner:'local:Alice',payload:JSON.stringify(data),day:5};const key='ps.expedition.checkpoint.local%3AAlice';storage.set(key,JSON.stringify(slot));return {g,storage,key,slot,data};}
test('local checkpoints belong to one backend/account; logout and another account do not expose them',()=>{const {g,storage,key}=setup();assert.equal(g.ExpeditionSave.read().day,5);g.DB.user='Bob';assert.equal(g.ExpeditionSave.read(),null);g.DB.user='Alice';assert.equal(g.ExpeditionSave.read().day,5);g.DB.loggedIn=false;assert.equal(g.ExpeditionSave.read(),null);assert.ok(storage.has(key));});
test('corrupt JSON and future formats fail closed without deleting the previous stored bytes',()=>{const {g,storage,key,slot}=setup();for(const text of ['{broken',JSON.stringify({...slot,format:2}),JSON.stringify({...slot,payload:'{}'})]){storage.set(key,text);assert.equal(g.ExpeditionSave.read(),null);assert.equal(storage.get(key),text);}});
test('invalid actors, slot references and prototype methods are rejected before restoration',()=>{const {g,storage,key,slot,data}=setup();for(const alter of [d=>d.captain.fields.hp=null,d=>d.captain.moves[0].id='unknown',d=>d.captain.slots=[[999]],d=>d.captain.fields.heal=3,d=>d.formation=[999]]){const d=structuredClone(data);alter(d);storage.set(key,JSON.stringify({...slot,payload:JSON.stringify(d)}));assert.equal(g.ExpeditionSave.read(),null);}});

function setupCaptureEnv(){
  const storage=new Map(),toasts=[];
  class Player{constructor(d){this.dex=d?.dex||1;this.spriteDex=this.dex;this.hp=100;this.maxHp=100;this.moves=[{id:'tackle',lvl:1}];this.slots=[[this.moves[0]]];}heal(){}}
  class Member extends Player{constructor(dex,rank,mid){super({dex});this.rank=rank;this.squadId=101;this.moves=[{id:mid||'tackle',lvl:2}];this.slots=[[this.moves[0]]];}}
  class Enemy{constructor(){this.hp=50;}}
  class Animator{constructor(){this.frame=0;}play(){}}
  const captain=new Player({dex:1});
  const member=new Member(4,1,'tackle');
  const enemy=new Enemy();
  const patch={kind:'patch',owner:member,x:12,y:34};
  member.lastPatch=patch;
  member.idleTarget={x:10,y:20};
  member.lastAttacker=enemy;
  member.anim=new Animator();
  const selfCycle={tag:'cycle'};
  selfCycle.self=selfCycle;
  const selfSet=new Set(['keep']);
  selfSet.add(selfSet);
  const selfMap=new Map([['ok',7]]);
  selfMap.set('self',selfMap);
  const shared={label:'shared-dag',count:3};
  const sharedSet=new Set([1,2]);
  const run={
    phase:'route',day:12,gold:350,squadHp:10,map:[],captain,
    pool:[{dex:1},{dex:4}],unitPool:{stock:new Map([[1,2],[4,1]])},pendingSpawns:[],
    settledDays:new Set([5,10]),
    stalePatch:patch,
    staleEnemy:enemy,
    selfCycle,
    selfSet,
    selfMap,
    dagA:shared,
    dagB:shared,
    setA:sharedSet,
    setB:sharedSet
  };
  member.moves[0].leak={owner:member,lastPatch:patch};
  const g={
    DB:{loggedIn:true,mode:'local',user:'Alice'},
    I18n:{lang:'zh'},
    DEX_BY:{1:{dex:1},4:{dex:4}},
    Moves:{BY_ID:{tackle:{id:'tackle'}},instance:id=>({id,lvl:1})},
    Player,Enemy,
    Sprites:{Animator},
    Squad:{Member,roster:[member],formation:[member],shopLevel:2},
    Expedition:{active:true,phase:'route',run,offers:[{dex:4}]},
    Coop:{active:false},
    SettingsUI:{version:'0.43.0-alpha.85'},
    MovePP:{snapshot:()=>({}),restoreCheckpoint(){}},
    MoveControl:{snapshot:()=>({}),restore(){}},
    BreakItems:{snapshot:()=>({}),restore(){}},
    Game:{state:'play',checkpoint:()=>({time:120,pendingLevels:0,protectionRunId:'run-cycle-test'})},
    Server:{checkpointRun:()=>null},
    World:{snapshot:()=>({biome:1})},
    SquadBonds:{snapshot:()=>({})},
    ExpeditionGrowth:{berries:[]},
    SquadTraits:{snapshot:()=>({})},
    TypeBonds:{snapshot:()=>({})},
    ExpeditionDamage:{checkpoint:()=>({})},
    ExpeditionTraining:{snapshot:()=>({})},
    FailureProtection:{snapshot:()=>({})},
    UI:{toast:msg=>toasts.push(msg)}
  };
  vm.runInNewContext(fs.readFileSync('js/systems/expedition-save.js','utf8'),{G:g,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},console,Date,Set,Map,addEventListener(){}});
  return {g,storage,toasts,member,captain};
}

test('capture and save handle owner->Member->lastPatch circular structures, live entities, and cyclic Set/Map without throwing',()=>{
  const {g,toasts}=setupCaptureEnv();
  const saved=g.ExpeditionSave.save(false);
  assert.equal(saved,true,'expected save() to succeed without circular JSON error');
  assert.ok(!toasts.some(t=>t.includes('保存失败')),'should not show save failure toast: '+toasts.join(' | '));
  const slot=g.ExpeditionSave.read();
  assert.ok(slot,'saved checkpoint must validate cleanly');
  assert.equal(slot.day,12);
  const parsed=JSON.parse(slot.payload);
  assert.equal(parsed.members.length,1);
  assert.equal(parsed.members[0].fields.lastPatch,undefined);
  assert.equal(parsed.members[0].fields.idleTarget,undefined);
  assert.equal(parsed.members[0].fields.lastAttacker,undefined);
  assert.equal(parsed.members[0].moves[0].leak.owner,undefined);
  assert.equal(parsed.run.staleEnemy,undefined);
  assert.equal(parsed.run.stalePatch.owner,undefined);
  assert.equal(parsed.run.selfCycle.tag,'cycle');
  assert.equal(parsed.run.selfCycle.self,undefined);
  assert.deepEqual(parsed.run.dagA,{label:'shared-dag',count:3});
  assert.deepEqual(parsed.run.dagB,{label:'shared-dag',count:3});
  assert.deepEqual(parsed.run.setA,{$set:[1,2]});
  assert.deepEqual(parsed.run.setB,{$set:[1,2]});
});

test('hydrate strips legacy stale transient fields from older checkpoints',()=>{
  const {g}=setupCaptureEnv();
  const hydrated=g.ExpeditionSave.hydrate({
    fields:{dex:4,rank:1,hp:80,maxHp:100,lastPatch:{kind:'patch'},idleTarget:{x:1,y:2},target:{hp:10},lastAttacker:{hp:20},owner:{dex:1}},
    moves:[{id:'tackle',lvl:2}],slots:[[0]],pp:{},control:{},items:{}
  },true);
  assert.equal(hydrated.lastPatch,undefined);
  assert.equal(hydrated.idleTarget,undefined);
  assert.equal(hydrated.target,null);
  assert.equal(hydrated.lastAttacker,undefined);
  assert.equal(hydrated.owner,undefined);
});
