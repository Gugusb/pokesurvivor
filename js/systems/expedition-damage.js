/* Actual HP/shield loss, conserved across actors, bonds and traits; two run-local scopes. */
G.ExpeditionDamage=(()=>{
  const MAX_VISIBLE_ROWS=6;
  let rows=new Map(),battle=new Map(),actors=new WeakMap(),serial=0,last=0,battleDay=0;
  const widgets=new WeakMap(),preferences={live:{scope:'run',collapsed:false},loot:{scope:'battle',collapsed:false},result:{scope:'run',collapsed:false}};
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  function reset(){rows=new Map();battle=new Map();actors=new WeakMap();serial=0;last=0;battleDay=0;document.getElementById?.('expedition-damage')?.remove();}
  function actor(p,updateBattle=false){
    if(!actors.has(p)){const id='actor:'+serial++;actors.set(p,id);rows.set(id,{id,damage:0,kind:'pokemon',elements:{}});}
    const row=rows.get(actors.get(p));Object.assign(row,{dex:p.dex,spriteDex:p.spriteDex||p.dex,name:p.mon.name,shiny:!!p.shiny,types:[...p.mon.types]});
    if(updateBattle&&battle.has(row.id)){const r=battle.get(row.id);Object.assign(r,{dex:row.dex,spriteDex:row.spriteDex,name:row.name,shiny:row.shiny,types:row.types.slice()});}return row;
  }
  function entry(map,row){if(!map.has(row.id))map.set(row.id,{...row,damage:0,elements:{},types:row.types?.slice()});return map.get(row.id);}
  function add(row,n,type){if(!(n>0))return;for(const map of [rows,battle]){const r=entry(map,row);r.damage+=n;if(G.U.TYPE_COLOR[type])r.elements[type]=(r.elements[type]||0)+n;}}
  function addBond(type,n,element){if(!(n>0))return;const id='bond:'+type,row=rows.get(id)||{id,type,kind:'bond',damage:0,elements:{}};add(row,n,G.U.TYPE_COLOR[type]?type:element);}
  function beginBattle(day=G.Expedition?.run?.day||0){battle=new Map();battleDay=day;last=0;for(const p of G.Squad?.actors()||[])entry(battle,actor(p));}
  function record(p,attack,n,context){
    if(!G.Squad?.active||!p||!(n>0)||!Number.isFinite(n))return;
    G.ExpeditionRecorder?.damage(n);
    const id=attack?.id||'',bond=id.startsWith('typebond-')?id.slice(9):attack?.typeBondSecondary?attack?.bondDamageKind:null,element=attack?.type||p.mon.types[0];
    if(bond)addBond(bond,n,element);
    else if(context?.execute)addBond(context.executionSource||'fairy',n,element);
    else add(actor(p,true),n,element);
  }
  const snapshot=(scope='run')=>[...(scope==='battle'?battle:rows).values()].map(r=>({...r,types:r.types?.slice(),elements:{...r.elements}})).sort((a,b)=>b.damage-a.damage||a.id.localeCompare(b.id));
  function label(r){if(r.type?.startsWith('trait:')){const d=G.SquadTraitDefs?.BY[r.type.slice(6)];return (d?G.SquadTraits.local(d.name):r.type.slice(6))+L(' · rasgo',' trait damage','特性伤害');}return r.kind==='bond'?(G.U.TYPE_NAME[r.type]?G.T(G.U.TYPE_NAME[r.type]):G.Expedition.skillLabel(r.type))+L(' · vínculo',' bond damage','羁绊伤害'):G.T(r.name);}
  function colors(r){
    if(r.kind==='pokemon')return (r.types||G.DEX_BY[r.dex]?.types||['normal']).map(type=>[type,1]);
    if(G.U.TYPE_COLOR[r.type])return [[r.type,1]];
    const values=Object.entries(r.elements||{}).filter(([type,n])=>G.U.TYPE_COLOR[type]&&n>0);return values.length?values:[['normal',1]];
  }
  function gradient(r){const values=colors(r),total=values.reduce((n,[,v])=>n+v,0);let left=0;return 'linear-gradient(90deg,'+values.map(([type,v])=>{const start=left;left+=v/total*100;return G.U.TYPE_COLOR[type]+' '+start+'% '+left+'%';}).join(',')+')';}
  const fmt=n=>Math.round(n).toLocaleString(G.I18n.lang==='zh'?'zh-CN':G.I18n.lang);
  function mount(target,view){
    const pref=preferences[view]||preferences.result;if(view==='live'&&!pref.userToggled&&typeof innerHeight==='number'&&innerHeight<=520)pref.collapsed=true;const s={pref,view,source:null,cache:new Map(),order:''};target.replaceChildren();target.classList.add('damage-meter');
    const head=node('header','damage-head'),title=node('h3','',L('Daño','Damage','伤害统计')),fold=node('button','damage-fold');fold.type='button';fold.dataset.damageFold='';head.append(title,fold);
    const body=node('div','damage-body'),tabs=node('nav','damage-tabs');tabs.setAttribute('aria-label',L('Periodo','Damage period','统计范围'));s.tabs=[];
    for(const [scope,text]of [['run',L('Expedición','Entire run','整局')],['battle',L('Combate','This battle','本场')]]){const b=node('button','',text);b.type='button';b.dataset.damageScope=scope;b.onclick=()=>{pref.scope=scope;update(target,s);};tabs.append(b);s.tabs.push(b);}
    const total=node('p','damage-total'),list=node('div','damage-list');body.append(tabs,total,list);target.append(head,body);
    Object.assign(s,{body,fold,total,list});fold.onclick=()=>{pref.userToggled=true;pref.collapsed=!pref.collapsed;update(target,s);};widgets.set(target,s);return s;
  }
  function update(target,s){
    const {pref}=s,collapsed=pref.collapsed;target.classList.toggle('damage-collapsed',collapsed);s.body.hidden=collapsed;s.fold.textContent=collapsed?'▸':'−';s.fold.setAttribute('aria-expanded',String(!collapsed));s.fold.setAttribute('aria-label',collapsed?L('Mostrar daño','Expand damage meter','展开伤害统计'):L('Ocultar daño','Collapse damage meter','收起伤害统计'));
    for(const b of s.tabs)b.setAttribute('aria-pressed',String(b.dataset.damageScope===pref.scope));if(collapsed)return;
    const ranked=s.source?(s.source[pref.scope]||[]):snapshot(pref.scope);
    const total=ranked.reduce((n,r)=>n+r.damage,0);
    const data=ranked.slice(0,MAX_VISIBLE_ROWS),day=s.source?s.source.day:battleDay;
    s.total.textContent=(pref.scope==='battle'&&day?L('Día ','Day ','第')+day+(G.I18n.lang==='zh'?'天':'')+' · ':'')+L('Total ','Total ','总伤害 ')+fmt(total);const ids=data.map(r=>r.id).join('|');
    for(const r of data){
      let item=s.cache.get(r.id);if(!item){const row=node('div','expedition-damage-row');row.dataset.damageId=r.id;const portrait=node('span','damage-portrait'),info=node('div','damage-info'),name=node('span','damage-name'),numbers=node('div','damage-numbers'),value=node('b','damage-value'),percent=node('small','damage-share'),track=node('div','damage-track'),bar=node('span','damage-bar');track.append(bar);numbers.append(value,percent);info.append(name,numbers,track);row.append(portrait,info);item={row,portrait,name,value,percent,bar,dex:null};s.cache.set(r.id,item);}
      const {row,portrait,name,value,percent,bar}=item;name.textContent=label(r);name.title=name.textContent;value.textContent=fmt(r.damage);const ratio=total>0?r.damage/total*100:0;percent.textContent=ratio.toFixed(1)+'%';bar.style.width=ratio+'%';bar.style.background=gradient(r);bar.dataset.share=ratio;row.dataset.damage=r.damage;row.title=name.textContent+' · '+colors(r).map(([type])=>G.T(G.U.TYPE_NAME[type]||type)).join(' / ');
      if(r.kind==='pokemon'){const key=(r.spriteDex||r.dex)+':'+!!r.shiny;if(item.dex!==key){portrait.replaceChildren(G.UI.spriteCanvas(r.spriteDex||r.dex,48,48,{scale:3,hero:true,portrait:true,shiny:!!r.shiny,shadow:false}));item.dex=key;}portrait.setAttribute('aria-hidden','true');}
      else{portrait.textContent=r.type?.startsWith('trait:')?L('R','T','特'):L('V','B','羁');portrait.style.background=gradient(r);portrait.setAttribute('aria-hidden','true');}
      if(ids!==s.order)s.list.append(row);
    }
    for(const [id,item]of s.cache)if(!data.some(r=>r.id===id)){item.row.remove();s.cache.delete(id);}s.order=ids;
    let empty=s.list.querySelector('.damage-empty');if(!data.length){if(!empty)s.list.append(node('p','damage-empty',L('Aún sin daño','No damage yet','暂无伤害')));}else empty?.remove();
  }
  // Explicit source snapshots keep the final result independent of later ledger resets.
  function render(target,data=null,view='result'){const s=widgets.get(target)||mount(target,view);s.source=Array.isArray(data)?{run:data,battle:[],day:0}:data;update(target,s);}
  function tick(){
    let el=document.getElementById('expedition-damage');if(!G.Squad?.active){if(el)el.hidden=true;return;}
    for(const p of [...G.Squad.actors(),...G.Squad.reserves()])actor(p);
    if(!el){el=node('aside','expedition-damage');el.id='expedition-damage';document.body.append(el);}
    el.hidden=G.Game.state!=='playing';if(el.hidden||performance.now()-last<200)return;last=performance.now();render(el,null,'live');
  }
  function checkpoint(people){return {rows:[...rows],battle:[...battle],serial,battleDay,bindings:people.map(p=>actors.get(p)||null)};}
  function restore(s,people){reset();if(!s)return;rows=new Map(s.rows);battle=new Map(s.battle);serial=s.serial;battleDay=s.battleDay;people.forEach((p,i)=>{if(s.bindings[i])actors.set(p,s.bindings[i]);});}
  return {checkpoint,restore,reset,beginBattle,record,snapshot,render,tick,get battleDay(){return battleDay;}};
})();
