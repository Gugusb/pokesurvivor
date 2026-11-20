/* Trait events are run-only, bounded and idempotent. Captain medals stay independent. */
G.SquadTraits=(()=>{
  let records=new WeakMap(),days=new Set(),shops=new Set(),battles=new Set(),released=new WeakSet(),merged=new WeakSet(),carry=0;
  const run=()=>G.Expedition?.run,team=()=>G.Squad?.active?G.Squad.deployed().filter(p=>!p.dead&&p.hp>0):[];
  const local=v=>v?.[G.I18n.lang]||v?.en||v;
  const L=(es,en,zh)=>local({es,en,zh});
  const def=p=>p?.moves?.some(m=>m.kind==='buff')&&!p.squadCaptain?G.SquadTraitDefs.BY['support-healer']:G.SquadTraitDefs.BY[p?.squadTrait]||G.SquadTraitDefs.forDex(p?.dex);
  function state(p){let s=records.get(p);if(!s)records.set(p,s={counts:{},shield:0});return s;}
  const weight=p=>Math.max(1,Math.min(3,p?.rank||1))*(G.SquadTraitDefs.weights[Math.max(1,Math.min(5,(G.ExpeditionQuality?G.ExpeditionQuality.quality(p):p?.mon?.rarity)||1))]||1);
  function activeTags(p,scope='all'){
    if(!G.Squad?.active||!G.Squad.deployed().includes(p))return [];
    const tags=G.Squad.tags(p),out=[];G.SquadBonds.refresh();
    if(scope!=='skill')for(const id of new Set(scope==='first'?tags.types.slice(0,1):tags.types))if(G.SquadBonds.count('types',id)>=2)out.push(['types',id]);
    if(scope!=='first')for(const id of new Set(p.moves.map(m=>G.SquadBonds.group(m.kind))))if(G.SquadBonds.KINDS.includes(id)&&G.SquadBonds.state(id).tier>0)out.push(['skill',id]);
    // Undesigned egg/class tags have no activation rule and cannot generate fuel yet.
    return out;
  }
  const layers=p=>activeTags(p).reduce((n,[c,id])=>n+G.SquadBonds.layer(c,id),0);
  function assign(p){const id=p.moves?.some(m=>m.kind==='buff')?'support-healer':p.squadTrait==='support-healer'?G.SquadTraitDefs.forDex(p.dex).id:p.squadTrait||G.SquadTraitDefs.forDex(p.dex).id;if(id!==p.squadTrait){p.squadTrait=id;records.delete(p);}return def(p);}
  function reset(){records=new WeakMap();days=new Set();shops=new Set();battles=new Set();released=new WeakSet();merged=new WeakSet();carry=0;}
  function gold(n){const r=run();if(!r||!Number.isFinite(n)||n<=0)return;const value=Math.round((carry+n)*1e6)/1e6,whole=Math.floor(value+1e-9);carry=value-whole;r.gold+=whole;}
  function trigger(p,event,basis=run()?.gold){
    if(!team().includes(p))return;const d=assign(p);if(d.category==='economic'&&G.EconomyConfig.economicTraitsEnabled===false)return;if(d.event!==event)return;const s=state(p);s.counts[event]=(s.counts[event]||0)+1;
    if(s.counts[event]<d.every)return;s.counts[event]-=d.every;
    if(d.category==='stacking'){for(const [category,id]of activeTags(p,d.scope))G.SquadBonds.addLayer(category,id,d.base*weight(p));return;}
    if(d.category!=='economic')return;
    const r=run();if(!r)return;if(r.trainerLevel&&event==='day'&&!['battle','elite','boss'].includes(r.eventKind))return;gold(d.id==='daily-interest'?basis*d.base*weight(p):d.base*weight(p));
    if(d.id==='elite-supplier')r.traitFreeRefresh=(r.traitFreeRefresh||0)+(p.rank||1);
    if(d.id==='boss-recruiter')r.traitRecruitTickets=(r.traitRecruitTickets||0)+(p.rank||1);
  }
  const emit=(event,exclude=null)=>{const basis=run()?.gold;for(const p of [...team()])if(p!==exclude)trigger(p,event,basis);};
  function visitShop(){const r=run();if(!r||shops.has(r.day))return;shops.add(r.day);emit('shop');}
  function dayEnd(){const r=run();if(!r||r.day<1||days.has(r.day))return;days.add(r.day);emit('day');}
  function finishBattle(cleared){const r=run();if(!r||battles.has(r.day))return;battles.add(r.day);if(cleared)emit('clear');if(r.kind==='elite')emit('elite');if(r.kind==='boss'&&cleared&&r.day%20===0)emit('boss');}
  function release(p){if(released.has(p))return;released.add(p);emit('release',p);}
  function merge(a,b){if(merged.has(b))return;merged.add(b);emit('merge');}
  const ordinary=a=>!a?.typeBondSecondary&&!a?.bondDamageKind&&!String(a?.id||'').startsWith('typebond-');
  function hit(p,a,critical,amount){if(run()?.phase!=='combat'||!p||!(amount>0)||!ordinary(a)||!p.moves.some(m=>m.id===a?.id))return;trigger(p,'hit');if(critical)trigger(p,'critical');}
  function hurt(p,amount,source){if(run()?.phase==='combat'&&amount>0&&!['environment','weather'].includes(source?.kind))trigger(p,'hurt');}
  function kill(p){if(run()?.phase==='combat'&&p)trigger(p,'kill');}
  function terminal(p){const d=def(p);return team().includes(p)&&d?.category==='terminal'?{def:d,fuel:layers(p)*weight(p)}:null;}
  function beforeHit(p,e,a){
    const t=terminal(p),v={factor:1,execute:false,contributions:[]};if(!t||!ordinary(a)||!p.moves.some(m=>m.id===a?.id))return v;
    if(t.def.power){const k=1+t.fuel*t.def.power;v.factor*=k;v.contributions.push(['trait:'+t.def.id,k]);}
    const line=Math.min(.5,t.fuel*(t.def.execute||0));
    if(line>0&&e.hp/e.maxHp<line){if(!e.boss&&!e.elite&&!e.legend)v.execute=true;else{v.factor*=1+line;v.contributions.push(['trait:'+t.def.id,1+line]);}}
    v.executionSource='trait:'+t.def.id;return v;
  }
  const cooldown=p=>{const t=terminal(p);return t?1-Math.min(.4,t.fuel*(t.def.haste||0)):1;};
  function move(p,m){const t=terminal(p);if(!t||!t.def.size||m.traitSizeApplied||m.kind==='buff')return m;const k=1+Math.min(3,t.fuel*t.def.size),v={...m,traitSizeApplied:true};for(const key of ['radius','range','width','size'])if(m[key]!=null)v[key]=m[key]*k;return v;}
  function beginBattle(){for(const p of [...G.Squad.roster])state(p).shield=0;for(const p of team()){const t=terminal(p);if(t?.def.shield)state(p).shield=p.baseHp*t.fuel*t.def.shield;}}
  function absorb(p,n){if(!team().includes(p))return n;const s=state(p),absorbed=Math.min(n,s.shield);s.shield-=absorbed;if(absorbed>0)G.FX.dmgText(p.x,p.y-p.bodyH-6,'−'+Math.round(absorbed),'#e6f8ff');return n-absorbed;}
  const shield=p=>state(p).shield;
  function price(base,kind){if(kind!=='mon'||G.EconomyConfig.economicTraitsEnabled===false)return base;const discount=Math.min(.5,team().reduce((n,p)=>n+(def(p)?.id==='recruit-bargain'?.08*weight(p):0),0));return Math.max(1,Math.ceil(base*(1-discount)));}
  function description(p){
    const d=def(p);if(!d)return '';if(d.category==='economic'&&G.EconomyConfig.economicTraitsEnabled===false)return local(d.name)+' ['+L('Economía pausada','Economy paused','经济特性已暂停')+']';const factor=weight(p),r=p.rank||1,name=local(d.name);
    const events={kill:L('enemigos derrotados','enemies defeated','击败敌人'),hit:L('60 impactos propios','60 own skill hits','自身招式累计命中60次'),critical:L('10 críticos propios','10 own critical hits','自身累计暴击10次'),hurt:L('3 golpes recibidos','3 actual hits received','自身实际承受3次攻击'),day:L('cada fin de día','each day end','每天自然结束'),clear:L('limpieza completa','clearing a battle','战斗限时全歼'),release:L('al liberar otros compañeros','releasing other companions','放生其他伙伴'),elite:L('superar una etapa élite','completing an elite event','精英事件通关'),merge:L('fusionar el equipo','a squad rank merge','队伍合成升阶'),boss:L('vencer al jefe del ciclo','defeating a cycle Boss','击败周期BOSS'),shop:L('visitar una tienda','visiting a shop','访问商店')};
    const scopes={all:L('todos sus vínculos activos','all own active bonds','自身全部已激活羁绊'),first:L('su primer tipo activo','own active primary-type bond','自身首属性已激活羁绊'),skill:L('su oficio activo','own active class bonds','自身职业已激活羁绊')};
    let text='';
    if(d.category==='support')text=L('Al usar un movimiento: cura aliados cercanos por ','On cast: heal nearby allies for ','释放招式时，治疗周围友方：自身最大生命×')+Number((d.base*factor*100).toFixed(2))+'%';
    else if(d.category==='stacking')text=events[d.event]+(d.event==='release'?' ×2':'')+' → '+scopes[d.scope]+' +'+Number((d.base*factor).toFixed(3))+L(' capas',' stacks','层');
    else if(d.category==='economic')text=d.id==='recruit-bargain'?L('Reclutamiento −','Recruitment discount ','招募价格降低')+Math.min(50,8*factor)+'%':events[d.event]+(d.event==='kill'?' ×15':'')+' → '+(d.id==='daily-interest'?(5*factor)+'%':Number((d.base*factor).toFixed(3)))+L(' oro',' gold','局内金币')+(d.id==='elite-supplier'?' +'+r+L(' renovaciones',' refreshes','次免费刷新'):d.id==='boss-recruiter'?' +'+r+L(' invitaciones dirigidas',' directed recruit tickets','张定向招募券'):'');
    else{const fuel=layers(p)*factor,parts=[];if(d.power)parts.push(L('Daño','Damage','独立增伤')+' +'+Number((fuel*d.power*100).toFixed(2))+'%');if(d.haste)parts.push(L('Recarga','Cooldown','冷却缩减')+' −'+Number((Math.min(.4,fuel*d.haste)*100).toFixed(2))+'%');if(d.execute)parts.push(L('Umbral','Execution line','普通敌人斩杀线')+' '+Number((Math.min(.5,fuel*d.execute)*100).toFixed(2))+'%');if(d.size)parts.push(L('Alcance','Range','范围')+' +'+Number((Math.min(3,fuel*d.size)*100).toFixed(2))+'%');if(d.shield)parts.push(L('Barrera inicial','Starting shield','开战白盾')+' '+Number((fuel*d.shield*100).toFixed(2))+'% '+L('PS base','base HP','基础生命'));text=parts.join(' · ');}
    if(d.category==='terminal'){
      const rules=[];
      for(const [key,label]of [['power',L('daño','damage','独立增伤')],['haste',L('reducción de recarga','cooldown reduction','冷却缩减')],['execute',L('umbral de ejecución','execution line','普通敌人斩杀线')],['size',L('alcance','range','范围')],['shield',L('PS base como barrera inicial','base HP as starting shield','基础生命开战白盾')]])if(d[key])rules.push(Number((d[key]*100).toFixed(2))+'% '+label);
      const caps=d.haste?L(' (máx. 40%)',' (cap 40%)','（上限40%）'):d.size?L(' (máx. +300%)',' (cap +300%)','（上限+300%）'):d.execute?L(' (máx. 50%; élites/jefes: daño adicional bajo el umbral)',' (cap 50%; elites/Bosses: extra damage below the line)','（上限50%；精英/BOSS在血线内改为增伤）'):'';
      text=L('Por capa propia activa × peso: ','Per own active stack × weight: ','自身已激活羁绊每层×总权重：')+rules.join(' + ')+caps+'\n'+L('Ahora: ','Current: ','当前：')+text;
    }
    const category={support:L('Apoyo','Support','辅助'),stacking:L('Acumulación','Stacking','叠层'),economic:L('Economía','Economy','经济'),terminal:L('Terminal','Terminal','终端')}[d.category];
    return name+' ['+category+'] · '+L('Rango','Rank','阶级')+' '+r+' · '+L('Calidad','Quality','品质')+' '+(G.ExpeditionQuality?G.ExpeditionQuality.quality(p):p.mon?.rarity||1)+' · ×'+factor+'\n'+text;
  }
  function draw(ctx){for(const p of team()){const value=shield(p);if(value<=0)continue;ctx.save();ctx.strokeStyle='#e4f6ff';ctx.lineWidth=2;ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(p.x,p.y-p.bodyH*.4,p.r+9,p.bodyH*.6+8,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#effaff';ctx.fillText('◈ '+Math.ceil(value),p.x,p.y-p.bodyH-20);ctx.restore();}}
  return {assign,reset,def,weight,local,activeTags,layers,trigger,hit,hurt,kill,visitShop,dayEnd,finishBattle,release,merge,beforeHit,cooldown,move,beginBattle,absorb,shield,price,description,draw,get coinCarry(){return carry;}};
})();
