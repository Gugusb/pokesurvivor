/* Run-local move specializations. Learned definitions are never mutated. */
G.Specialization=(()=>{
  const defs=[],english={},chinese={};
  function def(id,rare,unique,es,en,zh,descEs,descEn,descZh,allowed=()=>true){
    defs.push({id,rare,unique,name:es,desc:descEs,allowed});Object.assign(english,{[es]:en,[descEs]:descEn});Object.assign(chinese,{[es]:zh,[descEs]:descZh});
  }
  const damage=m=>m.kind!=='buff',projectile=m=>['projectile','nova','boomerang','cone','orbit'].includes(m.kind);
  def('t1',true,true,'Onda de llegada','Landing shockwave','落点震荡','Tras una embestida, inflige un 20% de potencia en un área cercana.','After a dash, deal 20% move power in a nearby area.','位移释放后，以自身为圆心造成一次范围伤害，倍率为该技能的20%。',m=>m.kind==='dash');
  def('t2',true,true,'Drenaje experto','Expert drain','吸血专精','Los golpes cuerpo a cuerpo roban un 5% de vida.','Melee hits gain 5% life steal.','近战技能获得5%吸血。',m=>m.kind==='melee');
  def('t3',true,true,'Retorno de PP','PP return','PP反馈','Cada impacto tiene un 2% de recuperar 1 PP de este movimiento.','Each damaging hit has a 2% chance to restore 1 PP to this move.','技能造成伤害时，有2%概率恢复该技能1点PP。',damage);
  def('t4',true,true,'Expansión','Expansion','广域交换','Área y tamaño +50%; potencia ×0.7.','Area and projectile size +50%; power ×0.7.','范围与子弹大小+50%，技能倍率降至70%。',damage);
  def('t5',true,true,'Carga pesada','Heavy charge','重击交换','Potencia +50%; recarga ×1.5.','Power +50%; cooldown ×1.5.','技能倍率+50%，技能冷却+50%。');
  def('t6',true,true,'Ahorro extremo','Extreme economy','极限节能','50% de no gastar PP; PP máximos a la mitad.','50% chance to spend no PP; maximum PP halved.','释放时有50%概率不消耗PP，最大PP减半。');
  def('t7',true,true,'Ciclo veloz','Rapid cycle','急速循环','Recarga ×0.5 y PP máximos ×2; potencia ×0.2.','Cooldown ×0.5 and maximum PP ×2; power ×0.2.','技能冷却-50%，最大PP翻倍，技能倍率降至20%。');
  def('t8',true,true,'Traspaso','Phase through','穿墙专精','Atraviesa obstáculos; 30% de gastar el doble de PP.','Pass through obstacles; 30% chance to pay double PP.','技能可穿越障碍物，有30%概率消耗双倍PP；竞技场外墙仍阻挡。',m=>projectile(m)&&m.kind!=='orbit'||['dash','beam'].includes(m.kind));
  def('t9',true,true,'Lanzamiento doble','Double cast','双重施放','Lanza dos veces con un ángulo pequeño; paga dos usos de PP.','Cast twice at a small angle; pay PP for two casts.','以小角度差释放两次，同时支付两次PP。');
  def('t10',true,true,'Ascua secreta','Hidden ember','灼烧专精','6% de quemar al golpear.','6% chance to burn on hit.','技能命中时有6%概率附加灼烧。',damage);
  def('t11',true,true,'Atadura','Binding','减速专精','13% de ralentizar un 20% durante 3 s.','13% chance to slow by 20% for 3s.','技能命中时有13%概率附加20%减速，持续3秒。',damage);
  def('t12',true,true,'Escarcha','Frost','冰冻专精','5% de congelar 0.5 s; los jefes se ralentizan un 50%.','5% chance to freeze for 0.5s; Bosses are slowed by 50% instead.','技能命中时有5%概率冰冻0.5秒；BOSS改为减速50%。',damage);
  def('t13',true,true,'Veneno oculto','Hidden poison','中毒专精','7% de envenenar al golpear.','7% chance to poison on hit.','技能命中时有7%概率附加中毒。',damage);
  def('n1',false,false,'Amplitud','Breadth','广域强化','Área y tamaño +10%; potencia +10%.','Area and projectile size +10%; power +10%.','范围与子弹大小+10%，技能倍率+10%。',damage);
  def('n2',false,false,'Disparo múltiple','Multishot','多重穿透','Perforación +2 y proyectiles +2.','Pierce +2 and projectiles +2.','技能穿透+2，弹丸数量+2。',projectile);
  def('n3',false,false,'Agilización','Acceleration','冷却强化','Recarga ×0.8.','Cooldown ×0.8.','技能冷却-20%。');
  def('n4',false,false,'Economía','Economy','节约专精','15% adicional de no gastar PP.','Additional 15% chance to spend no PP.','技能额外获得15%不消耗PP的概率。');
  def('n5',false,false,'Precisión crítica','Critical precision','会心专精','Críticos +10%; multiplicador crítico +0.25.','Critical chance +10%; critical damage multiplier +0.25.','技能暴击率+10%，暴击伤害倍率+0.25。',damage);
  def('n6',false,false,'Golpe preparado','Prepared strike','蓄势会心','Recarga ×1.2; críticos +15%.','Cooldown ×1.2; critical chance +15%.','技能冷却+20%，暴击率+15%。',damage);
  def('n7',false,false,'Potencia especializada','Specialized power','威力强化','Potencia +15%.','Power +15%.','技能倍率+15%。');
  def('n8',false,false,'Eco','Echo','余响专精','5% adicional de repetir gratis tras media recarga; no se repite a sí mismo.','Additional 5% chance to repeat for free after half a cooldown; repeats cannot repeat themselves.','技能有5%额外释放一次的概率；间隔本次冷却的一半，追加释放不再触发额外释放。');
  G.I18n.add(english);G.I18n.addChinese(chinese);
  const BY=Object.assign(Object.create(null),Object.fromEntries(defs.map(d=>[d.id,d])));
  const EMPTY=Object.freeze([]),neutral={},statCache=new WeakMap();
  const ids=m=>Array.isArray(m?.specializations)?m.specializations:EMPTY;
  function normalize(m,list){const out=[];for(const id of (Array.isArray(list)?list:[]).slice(0,5)){const d=typeof id==='string'&&BY[id];if(d&&d.allowed(m)&&(!d.unique||!out.includes(id)))out.push(id);}return out;}
  const eligible=p=>(p.moves||[]).filter(m=>m.lvl>=m.def.maxLvl&&ids(m).length<5);
  function offers(m,rng=Math.random){const available=defs.filter(d=>d.allowed(m)&&(!d.unique||!ids(m).includes(d.id))),out=[];for(let i=0;i<3;i++){const rare=rng()<.07;let pool=available.filter(d=>d.rare===rare&&!out.includes(d.id));if(!pool.length)pool=available.filter(d=>!out.includes(d.id));if(!pool.length)break;out.push(pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))].id);}return out;}
  function apply(p,m,id){const d=BY[id];if(!(p.specTokens>0)||!eligible(p).includes(m)||!d||!d.allowed(m)||d.unique&&ids(m).includes(id))return false;m.specializations=[...ids(m),id];p.specTokens--;const state=G.MovePP?.state(p,m);if(state)state.plan=null;return true;}
  function stats(m){m=m||neutral;const list=ids(m),cached=statCache.get(m);if(cached&&cached.list===list)return cached.value;const n=id=>list.filter(x=>x===id).length;const value={power:(1+.1*n('n1')+.15*n('n7')+.5*n('t5'))*(n('t4')?.7:1)*(n('t7')?.2:1),size:1+.1*n('n1')+.5*n('t4'),cooldown:Math.pow(.8,n('n3'))*Math.pow(1.2,n('n6'))*(n('t5')?1.5:1)*(n('t7')?.5:1),free:Math.min(1,.15*n('n4')+.5*n('t6')),maxPP:(n('t6')?.5:1)*(n('t7')?2:1),crit:.1*n('n5')+.15*n('n6'),critDamage:.25*n('n5'),pierce:2*n('n2'),shots:2*n('n2'),echo:Math.min(1,.05*n('n8')),phase:!!n('t8'),double:!!n('t9'),shock:!!n('t1'),lifesteal:n('t2')?.05:0,refund:!!n('t3'),burn:!!n('t10'),slow:!!n('t11'),freeze:!!n('t12'),poison:!!n('t13')};statCache.set(m,{list,value});return value;}
  function move(p,m){if(m.specApplied)return m;const q=stats(m);return {...m,specApplied:true,dmg:(m.dmg||0)*q.power,amount:m.amount==null?m.amount:m.amount*q.power,radius:m.radius==null?m.radius:m.radius*q.size,width:m.width==null?m.width:m.width*q.size,size:m.size==null?m.size:m.size*q.size,count:(m.count||1)+q.shots,pierce:(m.pierce||0)+q.pierce,phaseWalls:q.phase};}
  function find(p,id){return p.remote?(p.masteryMoves?.[id]||p.moves?.find(m=>m.id===id)):(p.moves?.find(m=>m.id===id)||p.masteryMoves?.[id]);}
  function snapshot(p){return (p.moves||[]).filter(m=>ids(m).length).slice(0,16).map(m=>[m.id,m.lvl,!!m.evolved,ids(m)]);}
  function sync(p,list){p.masteryMoves=Object.create(null);for(const row of (Array.isArray(list)?list:[]).slice(0,16)){if(!Array.isArray(row)||!Object.hasOwn(G.Moves.BY_ID,row[0]))continue;const d=G.Moves.BY_ID[row[0]];if(row[1]!==d.maxLvl)continue;const m=G.Moves.instance(d.id,d.maxLvl);if(row[2])G.Moves.evolve(m);m.specializations=normalize(m,row[3]);p.masteryMoves[m.id]=m;}return Object.values(p.masteryMoves).map(m=>[m.id,m.lvl,!!m.evolved,ids(m)]);}
  const receipts=new WeakMap();
  function reward(p,key,id,heal,pp){let seen=receipts.get(p);if(!seen)receipts.set(p,seen=new Set());if(!Number.isSafeInteger(key)||key<1||key<Math.max(0,(p.specReceiptFloor||0))||seen.has(key)||!Number.isFinite(heal)||heal<0||heal>50000||![0,1].includes(pp))return false;const m=find(p,id);if(!m)return false;seen.add(key);if(seen.size>2048){const oldest=seen.values().next().value;seen.delete(oldest);p.specReceiptFloor=Math.max(p.specReceiptFloor||0,oldest+1);}if(heal)p.heal(heal);if(pp)G.MovePP?.add(p,[m],1);return true;}
  function onHit(p,e,attack,dealt){if(!(dealt>0)||!p||!attack?.id)return;const m=find(p,attack.id);if(!m||!ids(m).length||G.Abilities.suppressEffects(p))return;const q=stats(m);const heal=Math.min(p.maxHp,dealt*q.lifesteal),pp=q.refund&&Math.random()<.02?1:0;if(p.remote){if(heal||pp)G.Coop.specReward?.(p,m.id,heal,pp);}else{if(heal)p.heal(heal);if(pp)G.MovePP?.add(p,[m],1);}if(q.burn&&Math.random()<.06)e.applyBurn(1,p);if(q.slow&&Math.random()<.13)e.applySlow(.2,3);if(q.poison&&Math.random()<.07)e.applyPoison(1,p);if(q.freeze&&Math.random()<.05){if(e.boss)e.applySlow(.5,.5);else{e.freezeT=Math.max(e.freezeT||0,.5);G.FX.ring(e.x,e.y,e.r,e.r*2,'#a4e8ff',.5,2);G.Coop.isHost&&G.Coop.broadcast(['sf',e.id,.5]);}}}
  return {LIST:defs,BY,ids,normalize,eligible,offers,apply,stats,move,find,snapshot,sync,reward,onHit};
})();
