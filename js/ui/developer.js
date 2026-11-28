/* Herramientas explícitas de desarrollo. Desactivadas por defecto; sólo solo. */
G.Dev = (() => {
  let enabled = false;
  try { enabled = localStorage.getItem('ps.dev.enabled') === 'true'; } catch (e) { /* sin persistencia */ }
  let god = false, panel, launcher;
  let viewMultiplier = 1.5;
  let bondTestKind='projectile',bondTestCategory='skill';
  try {
    const stored = Number(localStorage.getItem('ps.dev.view'));
    if (stored >= 1 && stored <= 2) viewMultiplier = stored;
  } catch (e) { /* sin persistencia */ }
  const currencies = [
    { id: 'coins', name: '金币', step: 1000 },
    { id: 't1', name: '单抽券', step: 10 },
    { id: 't10', name: '十连券', step: 1 },
    { id: 'abilityGems', name: '特性宝石', step: 10 }
  ];
  const canUse = () => enabled && G.DB.loggedIn && !G.Coop.active;
  const balance = id => id === 't1' || id === 't10' ? G.DB.save.tickets[id] : G.DB.save[id];
  function adjustCurrency(id, delta) {
    if (!canUse() || !currencies.some(c => c.id === id) || !Number.isSafeInteger(delta)) return false;
    G.Game.debugMark();
    const amount = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, balance(id) + delta));
    if (id === 't1' || id === 't10') G.DB.save.tickets[id] = amount;
    else G.DB.save[id] = amount;
    return true;
  }
  function setView(value) {
    if (!canUse() || !Number.isFinite(value)) return false;
    viewMultiplier = Math.round(Math.max(1, Math.min(2, value)) * 100) / 100;
    G.Game.debugMark();
    if (G.Camera.setViewMultiplier) G.Camera.setViewMultiplier(viewMultiplier);
    try { localStorage.setItem('ps.dev.view', String(viewMultiplier)); } catch (e) { /* nada */ }
    return true;
  }
  function setEnabled(on) {
    enabled = !!on;
    if (enabled && G.Game) G.Game.debugMark();
    if (!enabled) { god = false; if (G.AbilityGacha.clearDebug) G.AbilityGacha.clearDebug(); }
    if (G.Camera.setViewMultiplier) G.Camera.setViewMultiplier(canUse() ? viewMultiplier : 1 / (G.Settings?.get('zoom') || 1));
    try { localStorage.setItem('ps.dev.enabled', String(enabled)); } catch (e) { /* nada */ }
    refresh();
  }
  function init() {
    launcher = document.createElement('button');
    launcher.id = 'dev-launcher'; launcher.className = 'btn small'; launcher.textContent = '调试 · F2';
    launcher.onclick = () => { panel.classList.toggle('hidden'); if (!panel.classList.contains('hidden')) renderPanel(); };
    panel = document.createElement('aside'); panel.id = 'dev-panel'; panel.className = 'panel hidden';
    panel.setAttribute('aria-label', '开发者调试面板'); panel.setAttribute('translate', 'no');
    launcher.setAttribute('translate', 'no');
    document.body.append(launcher, panel);
    document.addEventListener('keydown', e => {
      if (enabled && e.code === 'F2') { e.preventDefault(); launcher.click(); }
    });
    refresh();
  }
  function refresh() {
    if (!launcher) return;
    launcher.classList.toggle('hidden', !enabled);
    if (!enabled) panel.classList.add('hidden');
  }
  function requireRun() {
    const p = G.Game.player;
    if (!p || G.Game.state === 'ui' || G.Game.state === 'over') { G.UI.toast('请先开始一局游戏'); return null; }
    return p;
  }
  function action(fn) {
    if (!canUse()) { G.UI.toast('请先登录或以游客进入单人游戏；联机时不可使用调试'); return; }
    G.Game.debugMark();
    fn();
    if (G.DB.loggedIn) { G.DB.commit(true); G.UI.refreshCoins(); }
    if (G.UI.isOpen('scr-menu') && !G.UI.isOpen('scr-gacha')) G.MenuUI.open();
    if (G.UI.isOpen('scr-gacha') && !G.GachaUI.open_) G.GachaUI.refresh();
    if (panel) renderPanel();
  }

  function unlockAllPokemon(){
    if(!canUse())return false;G.Game.debugMark();
    for(const mon of G.DEX)if(!G.DB.save.owned[mon.dex])G.DB.grant(mon.dex,'dev');return true;
  }
  function unlockAllCards(){
    if(!canUse()||!G.CardPacks)return false;G.Game.debugMark();const save=G.DB.save,pack=G.CardPacks.normalize(save);
    for(const c of G.CardPacks.cards){const missing=Math.max(0,c.max-(pack.taken[c.id]||0));pack.taken[c.id]=c.max;
      if(c.kind==='z')G.ZAccess?.unlock(save,c.key,'dev');
      if(c.kind==='tickets')save.tickets.t1=Math.min(1e7,save.tickets.t1+missing*100);
      if(c.kind==='gems')save.abilityGems=Math.min(1e8,save.abilityGems+missing*20);
    }
    // Existing paid offers are handled by the normal replacement/refund path.
    G.CardPacks.normalize(save);return true;
  }
  function expeditionAction(id,value){
    if(!canUse())return false;const r=G.Expedition?.run;if(!r||!requireRun()){G.UI.toast('请先进入远征');return false;}
    const leader=G.LeaderAbilities;
    if(['leader-charge','leader-cast','leader-reset'].includes(id)&&!leader?.active()){G.UI.toast('当前队长没有已实装的家族特性');return false;}
    if(id==='trainer-level'&&(!Number.isSafeInteger(value)||value<1||value>G.Economy.maxLevel(r)))return false;
    if(id==='squad-health'&&(!Number.isFinite(value)||value<1||value>G.TrainerTalents.maxHp(r)))return false;
    if(['wave-end','test-enemies','leader-cast','actor-status'].includes(id)&&r.phase!=='combat'){G.UI.toast('此项目需在战斗中测试');return false;}
    G.Game.debugMark();
    switch(id){
      case 'leader-charge':{const d=G.LeaderMedals.medalsFor(r.captain.dex).find(m=>m.leader);G.DB.save.abilityMedals[d.id]||={at:Date.now(),from:'dev'};leader.state().charge=1;break;}
      case 'leader-cast':return leader.activate();
      case 'leader-reset':leader.state().charge=0;break;
      case 'trainer-level':r.trainerLevel=value;r.trainerXp=0;G.Squad.syncTrainer();break;
      case 'squad-health':r.squadHp=value;break;
      case 'jar-fill':G.ExpeditionSupplies.deposit(r,G.ExpeditionSupplies.jarMax(r));break;
      case 'actor-status':if(!G.ActorStatus?.kinds.includes(value))return false;G.ActorStatus.apply(r.captain,value,4,1,G.EnemyMgr.all().find(e=>!e.dead)||null);break;
      case 'clear-status':G.ActorStatus?.clear(r.captain);break;
      case 'wave-end':r.elapsed=r.wave.duration;G.Expedition.tick(0);break;
      case 'test-enemies':{const p=r.captain;for(let i=0;i<8;i++){const a=i*Math.PI/4,e=new G.Enemy({dex:1,hp:1000000,spd:0,dmg:0,xp:0,behavior:'chase'},p.x+Math.cos(a)*140,p.y+Math.sin(a)*140,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);}G.EnemyMgr.rebuildGrid();break;}
      default:return false;
    }
    G.Expedition.refreshScreen?.();return true;
  }
  function recentPanel(){
    const r=G.Expedition?.run;if(!r)return '<h4>近期远征测试</h4><p class="note">进入远征后可测试队长特性、5／8级进阶、小队生命、经验罐及战后结算。</p>';
    const d=G.LeaderAbilities?.definition(r.captain.dex),hp=G.TrainerTalents.maxHp(r);
    return '<h4>近期远征测试</h4><label>我方异常测试 <select id="dev-actor-status"><option value="poison">中毒</option><option value="burn">灼伤</option><option value="freeze">冻结</option><option value="stun">定身</option><option value="slow">减速</option><option value="attack">减攻</option></select></label><div class="row wrap"><button class="btn small" data-dev="actor-status">施加4秒异常</button><button class="btn small" data-dev="clear-status">清除我方异常</button></div><p class="note">第'+r.day+'天 · '+r.phase+' · 训练家Lv.'+r.trainerLevel+' · 小队生命 '+Math.ceil(r.squadHp)+'/'+hp+'</p>'+
      (d?'<p>队长特性：'+(d.name.zh||d.name.en)+' · 主动Z充能 '+Math.floor(G.LeaderAbilities.state().charge*100)+'%</p><div class="row wrap"><button class="btn small" data-dev="leader-charge">解锁家族勋章并充满主动Z</button><button class="btn small" data-dev="leader-cast">施放队长主动Z</button><button class="btn small" data-dev="leader-reset">清空主动Z充能</button></div>':'')+
      '<label>训练家等级 <input id="dev-trainer-level" type="number" min="1" max="'+G.Economy.maxLevel(r)+'" value="'+r.trainerLevel+'"></label><button class="btn small" data-dev="trainer-level">设置等级（5／8级测试进阶）</button>'+
      '<label>小队生命 <input id="dev-squad-health" type="number" min="1" max="'+hp+'" value="'+Math.ceil(r.squadHp)+'"></label><div class="row wrap"><button class="btn small" data-dev="squad-health">设置小队生命</button><button class="btn small" data-dev="jar-fill">填满经验罐</button><button class="btn small" data-dev="test-enemies">生成8只无伤害测试靶</button><button class="btn small" data-dev="wave-end">本场时间到（保留存活敌人扣血）</button></div><p class="note">等级调整可能进化队长，降低等级不回退形态。测试靶也计入存活敌人扣血。</p>';
  }

  function renderPanel() {
    const save = G.DB.save;
    const scroll = panel.scrollTop;
    panel.innerHTML = '<div class="row between"><h3>开发者调试</h3><button class="btn small" id="dev-close">收起</button></div>' +
      '<p class="note">调试会修改当前本地存档。调试局不提交排行榜；联机时不可使用。</p>' +
      '<label for="dev-view">视野范围：<output id="dev-view-value">' + viewMultiplier.toFixed(2) + '×</output></label>' +
      '<input id="dev-view" type="range" min="1" max="2" step="0.05" value="' + viewMultiplier + '">' +
      '<p class="note">向右拉可看得更远，默认 1.5×；关闭开发者模式后恢复设置中的视野。</p>' +
      (G.Squad?.active&&G.SquadBonds?'<h4>小队羁绊层数</h4><label>类别 <select id="dev-bond-category"><option value="skill"'+(bondTestCategory==='skill'?' selected':'')+'>职业羁绊</option><option value="types"'+(bondTestCategory==='types'?' selected':'')+'>属性羁绊</option></select></label><label>羁绊 <select id="dev-bond-kind">'+(bondTestCategory==='types'?G.TypeBondDefs.LIST.map(d=>d.id):G.SquadBonds.KINDS).map(k=>'<option value="'+k+'"'+(k===bondTestKind?' selected':'')+'>'+(bondTestCategory==='types'?G.T(G.U.TYPE_NAME[k]):G.Expedition.skillLabel(k))+' · '+G.SquadBonds.layer(bondTestCategory,k)+'层</option>').join('')+'</select></label><label>层数 <input id="dev-bond-layer" type="number" min="0" max="10000" step="0.1" value="'+G.SquadBonds.layer(bondTestCategory,bondTestKind)+'"></label><div class="row wrap"><button class="btn small" data-dev="bond-layer">设置本局羁绊层数</button><button class="btn small" data-dev="bond-party">组建同类标签测试队员</button><button class="btn small" data-dev="type-bond-reset">重置本阶段属性状态</button></div><p class="note">组队测试会替换本局队员。属性与职业分别使用当前配置的层数规则；职业二级为7人，辅助为5人。</p>':'')+
      (G.Squad?.active&&G.SquadTraits?'<h4>远征队员特性</h4><select id="dev-squad-trait">'+G.SquadTraitDefs.LIST.map(d=>'<option value="'+d.id+'">'+G.SquadTraits.description({dex:d.rootDex,rank:1,squadTraitOverride:d.id})+'</option>').join('')+'</select><button class="btn small" data-dev="squad-trait">赋予当前全部队员（仅调试）</button>':'')+
      recentPanel() +
      '<h4>货币增减</h4><p class="note">输入每次增减的数量。余额最低为 0，立即保存。</p>' +
      currencies.map(c => '<div class="dev-currency"><span>' + c.name + '：' + (save ? balance(c.id) : 0) + '</span>' +
        '<input type="number" id="dev-amount-' + c.id + '" aria-label="' + c.name + '增减数量" min="1" max="1000000000" step="1" value="' + c.step + '">' +
        '<button class="btn small" data-currency="' + c.id + '" data-sign="-1" aria-label="减少' + c.name + '">−</button>' +
        '<button class="btn small" data-currency="' + c.id + '" data-sign="1" aria-label="增加' + c.name + '">＋</button></div>').join('') +
      '<p>勋章：' + Object.keys(save && save.abilityMedals || {}).length + '/' + G.AbilityDefs.LIST.length + '</p>' +
      '<div class="row wrap"><button class="btn small" data-dev="medals">解锁全部勋章</button><button class="btn small" data-dev="all-pokemon">解锁全部宝可梦</button><button class="btn small" data-dev="all-cards">解锁全部卡包内容</button></div>' +
      '<label>测试伙伴 <select id="dev-partner">' + G.DEX.map(m=>m.dex).map(d => '<option value="' + d + '">' + G.T(G.DEX_BY[d].name) + '</option>').join('') + '</select></label>' +
      '<button class="btn small" data-dev="partner">选择伙伴（局外）</button>' +
      (G.Difficulty?'<h4>难度与精英测试</h4><label>测试难度 <select id="dev-difficulty">'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'"'+(G.Difficulty.current===i+1?' selected':'')+'>'+(i+1)+'★</option>').join('')+'</select></label><div class="row wrap"><button class="btn small" data-dev="difficulty">本局切换难度</button><button class="btn small" data-dev="elite">生成测试精英</button></div>':'')+
      '<label>指定勋章 <select id="dev-medal">' + G.AbilityDefs.LIST.map(m => '<option value="' + m.id + '">' + G.T(G.DEX_BY[m.dex].name) + ' · ' + G.T(m.name) + '</option>').join('') + '</select></label>' +
      '<div class="row wrap"><button class="btn small" data-dev="force">下次抽出此勋章</button><button class="btn small" data-dev="equip">装备此勋章（局外）</button></div>' +
      '<p>' + G.Abilities.status(G.Game.player) + '</p>' +
      '<label>测试天气 <select id="dev-weather"><option value="sand">沙暴</option><option value="snow">雪天</option><option value="rain">下雨</option><option value="sun">晴天</option><option value="fog">雾天</option></select></label>' +
      '<div class="row wrap"><button class="btn small" data-dev="weather">召唤天气 20s</button><button class="btn small" data-dev="clear-weather">清除天气</button><button class="btn small" data-dev="damage">测试受伤 10%</button><button class="btn small" data-dev="same-type">测试同属性伤害</button><button class="btn small" data-dev="fire-damage">测试火属性伤害</button><button class="btn small" data-dev="lethal">测试致命伤害</button></div>' +
      '<div class="row wrap"><button class="btn small" data-dev="mastery">' + G.T('Obtener MT de Especialización') + '</button><button class="btn small" data-dev="move-max">' + G.T('Maximizar movimientos activos') + '</button><button class="btn small" data-dev="god">无敌：' + (god ? '开' : '关') + '</button><button class="btn small" data-dev="heal">回满生命</button><button class="btn small" data-dev="level">升一级</button><button class="btn small" data-dev="slow">自身减速 3.5s</button><button class="btn small" data-dev="time">时间 +60s</button><button class="btn small" data-dev="rift">开启裂隙战斗</button><button class="btn small" data-dev="boss">击败裂隙 Boss</button><button class="btn small" data-dev="quit">结束本局</button></div>';
    panel.querySelector('#dev-close').onclick = () => panel.classList.add('hidden');
    panel.querySelector('#dev-bond-category')?.addEventListener('change',e=>{bondTestCategory=e.target.value;bondTestKind=bondTestCategory==='types'?'normal':'projectile';renderPanel();});
    panel.querySelector('#dev-bond-kind')?.addEventListener('change',e=>{bondTestKind=e.target.value;panel.querySelector('#dev-bond-layer').value=G.SquadBonds.layer(bondTestCategory,bondTestKind);});
    panel.querySelector('#dev-view').oninput = e => {
      if (setView(Number(e.target.value))) panel.querySelector('#dev-view-value').textContent = viewMultiplier.toFixed(2) + '×';
    };
    panel.querySelectorAll('[data-currency]').forEach(b => b.onclick = () => {
      const c = currencies.find(c => c.id === b.dataset.currency);
      const input = panel.querySelector('#dev-amount-' + c.id), amount = Number(input.value);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000) {
        G.UI.toast('请输入 1 至 1000000000 的整数'); return;
      }
      c.step = amount;
      action(() => adjustCurrency(c.id, amount * Number(b.dataset.sign)));
    });
    if (save && G.DEX_BY[save.partner]) panel.querySelector('#dev-partner').value = save.partner;
    panel.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => {
      const dex = +panel.querySelector('#dev-partner').value;
      const medalId = panel.querySelector('#dev-medal').value;
      action(() => {
        const s = G.DB.save;
        switch (b.dataset.dev) {
          case 'squad-trait':if(requireRun()&&G.Squad.active){const id=panel.querySelector('#dev-squad-trait').value;if(G.SquadTraitDefs.BY[id])for(const p of G.Squad.roster){p.squadTraitOverride=id;G.SquadTraits.assign(p);}}break;
          case 'bond-layer': if(requireRun()){const kind=panel.querySelector('#dev-bond-kind').value,n=Number(panel.querySelector('#dev-bond-layer').value);if(!G.SquadBonds.setLayer(bondTestCategory,kind,n))G.UI.toast('请输入0至10000的层数（可含小数）');}break;
          case 'type-bond-reset':if(requireRun())G.TypeBonds?.beginStage();break;
          case 'bond-party':{
            if(!requireRun()||!G.Squad.active)break;if(G.Expedition?.run){G.Expedition.run.trainerLevel=Math.max(5,G.Expedition.run.trainerLevel);G.Squad.syncTrainer();}else{for(let i=0;i<10&&G.Squad.capacity<7;i++)if(!G.Squad.upgrade())break;}for(const p of [...G.Squad.roster])G.Squad.release(p);
            const kind=panel.querySelector('#dev-bond-kind').value,seen=new Set();
            for(const mon of G.DEX){if(seen.has(mon.name)||!G.SPRITE_META[mon.dex])continue;const id=bondTestCategory==='types'?(mon.types.includes(kind)?G.Moves.startFor(mon):null):G.Moves.poolFor(mon).find(id=>G.Moves.BY_ID[id].kind===kind);if(!id)continue;seen.add(mon.name);G.Squad.recruit(mon.dex,id);if(seen.size===6)break;}G.Squad.refresh();break;
          }
          case 'difficulty': if(requireRun())G.Difficulty.debugLevel(+panel.querySelector('#dev-difficulty').value);break;
          case 'elite': {const p=requireRun();if(!p)break;
            const e=new G.Enemy({dex:1,hp:200,spd:65,dmg:8,xp:20,behavior:'chase'},p.x+140,p.y,G.Enemies.scale(G.Game.st.time));e.makeElite();G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();break;}
          case 'medals': for (const m of G.AbilityDefs.LIST) s.abilityMedals[m.id] = s.abilityMedals[m.id] || { at: Date.now(), from: 'dev' }; break;
          case 'all-pokemon': unlockAllPokemon();G.UI.toast('已解锁全部宝可梦');break;
          case 'all-cards': unlockAllCards();G.UI.toast('全部卡包内容已解锁至上限；开局加成下局生效');break;
          case 'actor-status':case 'clear-status':case 'leader-charge':case 'leader-cast':case 'leader-reset':case 'trainer-level':case 'squad-health':case 'jar-fill':case 'wave-end':case 'test-enemies':
            expeditionAction(b.dataset.dev,b.dataset.dev==='actor-status'?panel.querySelector('#dev-actor-status').value:b.dataset.dev==='trainer-level'?Number(panel.querySelector('#dev-trainer-level').value):b.dataset.dev==='squad-health'?Number(panel.querySelector('#dev-squad-health').value):undefined);break;
          case 'force': G.AbilityGacha.debugMedal(medalId); G.UI.toast('下次抽卡将产出指定勋章，仍消耗宝石'); break;
          case 'partner':
            if (G.Game.state !== 'ui') { G.UI.toast('请先返回主菜单'); break; }
            G.DB.grant(dex, 'dev'); s.partner = dex; s.partnerShiny = false;
            if (!s.starter) s.starter = dex;
            G.Flow.goMenu(); break;
          case 'equip': {
            if (G.Game.state !== 'ui') { G.UI.toast('请先返回主菜单'); break; }
            const m = G.AbilityDefs.BY_ID[medalId];
            s.abilityMedals[m.id] = s.abilityMedals[m.id] || { at: Date.now(), from: 'dev' };
            if(!m.leader)G.Abilities.equip(s, m.dex, m.id); G.UI.toast((m.leader?'已解锁家族主动Z：':'已装备：') + G.T(m.name)); break;
          }
          case 'god': god = !god; break;
          case 'weather': if (requireRun()) G.Weather.debugStart(panel.querySelector('#dev-weather').value, 20); break;
          case 'clear-weather': if (requireRun()) G.Weather.clear(); break;
          case 'damage': { const p = requireRun(); if (p) { p.invuln = p.dashGuardT = 0; p.hurt(p.maxHp * 0.1); } break; }
          case 'same-type': { const p = requireRun(); if (p) { p.invuln = p.dashGuardT = 0; p.hurt(p.maxHp * 0.2, p.mon.types[0], false, {kind:'attack'}); } break; }
          case 'fire-damage': { const p = requireRun(); if (p) { p.invuln = p.dashGuardT = 0; p.hurt(p.maxHp * 0.2, 'fire', false, {kind:'attack'}); } break; }
          case 'lethal': { const p = requireRun(); if (p) { p.invuln = p.dashGuardT = 0; p.hurt(p.maxHp * 10); } break; }
          case 'mastery':{const p=requireRun();if(p)G.Items.gain(p,'masterytm');break;}
          case 'move-max':{const p=requireRun();if(p)for(const m of p.activeGroup())while(G.Moves.levelUp(m)){}break;}
          case 'heal': { const p = requireRun(); if (p) p.heal(p.maxHp); break; }
          case 'level': if (requireRun()) G.Game.debugLevelUp(); break;
          case 'slow': { const p = requireRun(); if (p) p.slowT = 3.5; break; }
          case 'time': if (requireRun()) G.Game.debugTime(G.Game.st.time + 60); break;
          case 'rift': if (requireRun()) G.Rift.debugStart(); break;
          case 'boss': { const a = G.Rift.arena, e = a && G.EnemyMgr.get(a.bossId); if (e && !e.dead) e.hurt(e.maxHp * 2); else G.UI.toast('当前没有裂隙 Boss'); break; }
          case 'quit': if (requireRun()) G.Game.quit(); break;
        }
      });
    });
    panel.scrollTop = scroll;
  }
  function renderSettings(box) {
    box.setAttribute('translate', 'no');
    box.innerHTML = '<h3>开发者模式</h3><p class="note">开启后显示调试按钮，也可用 F2 收起或展开。只用于单人调试。</p>' +
      '<button class="btn ' + (enabled ? 'gold' : '') + '" id="dev-enable">开发者模式：' + (enabled ? '开' : '关') + '</button>';
    box.querySelector('#dev-enable').onclick = () => { setEnabled(!enabled); renderSettings(box); };
  }
  return { init, canUse, setEnabled, setView, adjustCurrency, unlockAllPokemon, unlockAllCards, expeditionAction, renderSettings,
    get viewMultiplier() { return viewMultiplier; }, get enabled() { return enabled; }, get invincible() { return canUse() && god; } };
})();
