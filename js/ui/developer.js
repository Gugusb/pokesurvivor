/* Herramientas explícitas de desarrollo. Desactivadas por defecto; sólo solo. */
G.Dev = (() => {
  let enabled = false;
  try { enabled = localStorage.getItem('ps.dev.enabled') === 'true'; } catch (e) { /* sin persistencia */ }
  let god = false, panel, launcher;
  let viewMultiplier = 1.5;
  let zTestMove = 'ember', zShortCooldown = false;
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
    if (!enabled) { god = false; zShortCooldown = false; if (G.AbilityGacha.clearDebug) G.AbilityGacha.clearDebug(); if (G.MegaPreview) G.MegaPreview.restore(G.Game.player); }
    if (G.Camera.setViewMultiplier) G.Camera.setViewMultiplier(canUse() ? viewMultiplier : 1);
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
  function setZCooldown(on) {
    if(!canUse())return false;
    zShortCooldown=!!on;G.Game.debugMark();
    const p=G.Game.player;
    if(zShortCooldown&&p?.zState?.phase==='cooldown')p.zState.cooldown=Math.min(2,p.zState.cooldown);
    return true;
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
  function renderPanel() {
    const save = G.DB.save;
    const scroll = panel.scrollTop;
    panel.innerHTML = '<div class="row between"><h3>开发者调试</h3><button class="btn small" id="dev-close">收起</button></div>' +
      '<p class="note">调试会修改当前本地存档。调试局不提交排行榜；联机时不可使用。</p>' +
      '<label for="dev-view">视野范围：<output id="dev-view-value">' + viewMultiplier.toFixed(2) + '×</output></label>' +
      '<input id="dev-view" type="range" min="1" max="2" step="0.05" value="' + viewMultiplier + '">' +
      '<p class="note">向右拉可看得更远，默认 1.5×；关闭开发者模式恢复正常视野。</p>' +
      '<h4>货币增减</h4><p class="note">输入每次增减的数量。余额最低为 0，立即保存。</p>' +
      currencies.map(c => '<div class="dev-currency"><span>' + c.name + '：' + (save ? balance(c.id) : 0) + '</span>' +
        '<input type="number" id="dev-amount-' + c.id + '" aria-label="' + c.name + '增减数量" min="1" max="1000000000" step="1" value="' + c.step + '">' +
        '<button class="btn small" data-currency="' + c.id + '" data-sign="-1" aria-label="减少' + c.name + '">−</button>' +
        '<button class="btn small" data-currency="' + c.id + '" data-sign="1" aria-label="增加' + c.name + '">＋</button></div>').join('') +
      '<p>勋章：' + Object.keys(save && save.abilityMedals || {}).length + '/' + G.AbilityDefs.LIST.length + '</p>' +
      '<div class="row wrap"><button class="btn small" data-dev="medals">解锁全部勋章</button><button class="btn small" data-dev="legends">解锁全部五星伙伴</button></div>' +
      '<label>测试伙伴 <select id="dev-partner">' + G.AbilityDefs.SPECIES.map(d => '<option value="' + d + '">' + G.T(G.DEX_BY[d].name) + '</option>').join('') + '</select></label>' +
      '<button class="btn small" data-dev="partner">选择伙伴（局外）</button>' +
      (G.Difficulty?'<h4>难度与精英测试</h4><label>测试难度 <select id="dev-difficulty">'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'"'+(G.Difficulty.current===i+1?' selected':'')+'>'+(i+1)+'★</option>').join('')+'</select></label><div class="row wrap"><button class="btn small" data-dev="difficulty">本局切换难度</button><button class="btn small" data-dev="elite">生成测试精英</button><button class="btn small" data-dev="z-add">Z 充能 +1</button></div>':'')+
      (G.ZMoves ? '<h4>Z 招式试玩</h4><p class="note">仅用于调试。替换测试招式会清空本局原有技能，并装备同属性 Z 石。</p>' +
      '<div class="row wrap"><button class="btn small" data-dev="z-grant">获得全部 Z 石</button><button class="btn small" data-dev="z-charge">Z 石立即就绪</button></div>' +
      '<button class="btn small '+(zShortCooldown?'gold':'')+'" data-dev="z-short-cd">Z 技能冷却固定 2s：'+(zShortCooldown?'开':'关')+'</button>'+
      '<label>测试 Z 招式 <select id="dev-z-move">'+G.Moves.ALL.filter(m=>G.ZMoves.KINDS.includes(m.kind)).map(m=>'<option value="'+m.id+'"'+(m.id===zTestMove?' selected':'')+'>'+G.T(m.name)+' · '+m.kind+'</option>').join('')+'</select></label>'+
      '<div class="row wrap"><button class="btn small" data-dev="z-prepare">替换为测试招式</button><button class="btn small" data-dev="z-enemies">生成测试敌群</button><button class="btn small" data-dev="z-boss">生成测试 Boss</button><button class="btn small" data-dev="z-arm">进入 Z 蓄力</button></div>':'') +
      '<h4>Mega 素材预览</h4><p class="note">此处用于预览 Mega 外观和动画。</p>' +
      '<label>Mega 形态 <select id="dev-mega">' + G.MegaPreview.LIST.map(f => '<option value="' + f.id + '"' + (f.available ? '' : ' disabled') + '>' + G.MegaPreview.label(f) + (f.available ? (!f.basicComplete ? '（未达基本标准，旧版保留）' : f.completion === 2 ? '（完整级）' : '（基本达标）') : f.completion === 0 && f.reason && f.reason.startsWith('Source animations') ? '（已有部分动画，未达基本标准）' : '（暂无动画素材）') + '</option>').join('') + '</select></label>' +
      '<label><input id="dev-mega-shiny" type="checkbox">异色（该形态需有异色素材）</label>' +
      '<div class="row wrap"><button class="btn small" data-dev="mega-partner">选择对应本体（局外）</button><button class="btn small" data-dev="mega-apply">应用 Mega 外观（局内）</button><button class="btn small" data-dev="mega-clear">恢复本体外观</button></div>' +
      '<p class="note">' + (G.Game.player && G.Game.player.megaForm ? G.MegaPreview.label(G.MegaPreview.BY_ID[G.Game.player.megaForm]) : '当前为本体外观') + '</p>' +
      '<label>测试动作 <select id="dev-mega-anim"><option value="Idle">待机 Idle</option><option value="Walk">行走 Walk</option><option value="Attack">攻击 Attack</option><option value="Shoot">远程 Shoot</option><option value="Charge">蓄力 Charge</option><option value="Hurt">受伤 Hurt</option><option value="Faint">倒下 Faint</option></select></label><button class="btn small" data-dev="mega-anim">播放测试动作</button>' +
      '<h4>Mega 进化调试</h4><p class="note">下方工具用于测试 Mega 相关功能。</p>' +
      '<div class="row wrap"><button class="btn small" data-dev="mega-stone">获得对应进化石</button><button class="btn small" data-dev="mega-equip">装备对应进化石（局外）</button><button class="btn small" data-dev="mega-energy">充满 Mega 能量</button><button class="btn small" data-dev="mega-end">结束 Mega 进化</button><button class="btn small" data-dev="mega-clock">Mega 计时 +30s</button><button class="btn small" data-dev="mega-rift">进入对应 Mega 裂缝</button><button class="btn small" data-dev="mega-drop">下一次 Mega 胜利测试掉石</button><button class="btn small" data-dev="mega-item">测试拾取普通道具</button></div>' +
      '<p id="dev-mega-state">' + (G.Game.player && G.Game.player.megaState ? 'Mega 能量：' + G.Game.player.megaState.energy.toFixed(1) + '/120；剩余：' + Math.ceil(G.Game.player.megaState.left) + 's' : '本局尚未开始') + '</p>' +
      '<label>指定勋章 <select id="dev-medal">' + G.AbilityDefs.LIST.map(m => '<option value="' + m.id + '">' + G.T(G.DEX_BY[m.dex].name) + ' · ' + G.T(m.name) + '</option>').join('') + '</select></label>' +
      '<div class="row wrap"><button class="btn small" data-dev="force">下次抽出此勋章</button><button class="btn small" data-dev="equip">装备此勋章（局外）</button></div>' +
      '<p>' + G.Abilities.status(G.Game.player) + '</p>' +
      '<label>测试天气 <select id="dev-weather"><option value="sand">沙暴</option><option value="snow">雪天</option><option value="rain">下雨</option><option value="sun">晴天</option><option value="fog">雾天</option></select></label>' +
      '<div class="row wrap"><button class="btn small" data-dev="weather">召唤天气 20s</button><button class="btn small" data-dev="clear-weather">清除天气</button><button class="btn small" data-dev="damage">测试受伤 10%</button><button class="btn small" data-dev="same-type">测试同属性伤害</button><button class="btn small" data-dev="fire-damage">测试火属性伤害</button><button class="btn small" data-dev="lethal">测试致命伤害</button></div>' +
      '<div class="row wrap"><button class="btn small" data-dev="god">无敌：' + (god ? '开' : '关') + '</button><button class="btn small" data-dev="heal">回满生命</button><button class="btn small" data-dev="level">升一级</button><button class="btn small" data-dev="slow">自身减速 3.5s</button><button class="btn small" data-dev="time">时间 +60s</button><button class="btn small" data-dev="rift">开启裂隙战斗</button><button class="btn small" data-dev="boss">击败裂隙 Boss</button><button class="btn small" data-dev="quit">结束本局</button></div>';
    panel.querySelector('#dev-close').onclick = () => panel.classList.add('hidden');
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
    if (save && G.AbilityDefs.SPECIES.includes(save.partner)) panel.querySelector('#dev-partner').value = save.partner;
    const mf = !['ui', 'over'].includes(G.Game.state) && G.Game.player && G.Game.player.megaForm;
    const first = G.MegaPreview.LIST.find(f => f.available && save && f.dex === save.partner) || G.MegaPreview.LIST.find(f => f.available);
    panel.querySelector('#dev-mega').value = mf || first && first.id || '';
    panel.querySelector('#dev-mega-shiny').checked = !!(mf && G.Game.player.anim.shiny);
    panel.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => {
      const dex = +panel.querySelector('#dev-partner').value;
      const medalId = panel.querySelector('#dev-medal').value;
      const mega = G.MegaPreview.BY_ID[panel.querySelector('#dev-mega').value];
      if(G.ZMoves)zTestMove=panel.querySelector('#dev-z-move').value;
      action(() => {
        const s = G.DB.save;
        switch (b.dataset.dev) {
          case 'z-grant': for(const type of G.ZMoves.TYPES)G.ZMoves.grant(s,type);G.UI.toast('已获得全部 Z 石，可在图鉴详情装备');break;
          case 'z-charge': {const p=requireRun();if(p)G.ZMoves.debugCharge(p);break;}
          case 'z-short-cd': setZCooldown(!zShortCooldown);break;
          case 'difficulty': if(requireRun())G.Difficulty.debugLevel(+panel.querySelector('#dev-difficulty').value);break;
          case 'z-add': {const p=requireRun();if(p)G.ZMoves.grantCharge(p,'dev:'+performance.now());break;}
          case 'elite': {const p=requireRun();if(!p)break;
            const e=new G.Enemy({dex:1,hp:200,spd:65,dmg:8,xp:20,behavior:'chase'},p.x+140,p.y,G.Enemies.scale(G.Game.st.time));e.makeElite();G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();break;}
          case 'z-prepare': {
            const p=requireRun();if(!p)break;
            if(G.ZMoves.busy(p)||G.Mega.active(p)){G.UI.toast('请等待当前招式或 Mega 进化结束');break;}
            const m=G.Moves.instance(zTestMove,1);G.ZMoves.grant(s,m.type);G.ZMoves.equip(s,p.ivDex||p.dex,m.type);
            G.Projectiles.clearOrbs(p);G.Combat.clearFields(p);p.moves=[m];p.slots=[[m]];p.active=0;
            p.zState=null;G.ZMoves.init(p,s);p.hp=p.maxHp;break;
          }
          case 'z-enemies': case 'z-boss': {
            const p=requireRun();if(!p)break;const boss=b.dataset.dev==='z-boss',n=boss?1:12;
            for(let i=0;i<n;i++){const a=boss?0:(i<10?-.7+i*.14:Math.PI+i*.1),r=boss?250:100+(i%3)*65;
              G.EnemyMgr.add(new G.Enemy({dex:boss?150:1,hp:10000000,spd:0,dmg:0,xp:0,behavior:'melee'},p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,{hp:1,spd:1,dmg:1},boss));}
            G.EnemyMgr.rebuildGrid();break;
          }
          case 'z-arm': {const p=requireRun();if(p)G.ZMoves.arm(p);break;}
          case 'mega-stone': if (mega && G.Mega.BY[mega.id]) G.Mega.award(mega.id); else G.UI.toast('此形态尚未开放正式 Mega 进化'); break;
          case 'mega-equip':
            if (G.Game.state !== 'ui') { G.UI.toast('请先返回主菜单'); break; }
            if (!mega || !G.Mega.equip(s, mega.dex, mega.id)) G.UI.toast('请先获得对应进化石');
            break;
          case 'mega-energy': { const p = requireRun(); if (p && !G.Mega.debugCharge(p)) G.UI.toast('请在开局前装备对应进化石'); break; }
          case 'mega-end': { const p = requireRun(); if (p) G.Mega.finish(p); break; }
          case 'mega-clock': { const p = requireRun(); if (p) G.Mega.tick(p, 30); break; }
          case 'mega-rift': if (requireRun() && mega && G.Mega.BY[mega.id]) G.Rift.debugMega(mega.id); break;
          case 'mega-drop': G.Rift.debugStoneDrop(); break;
          case 'mega-item': if (requireRun()) G.Game.debugItem('leftovers'); break;
          case 'medals': for (const m of G.AbilityDefs.LIST) s.abilityMedals[m.id] = s.abilityMedals[m.id] || { at: Date.now(), from: 'dev' }; break;
          case 'legends': for (const d of G.AbilityDefs.SPECIES) G.DB.grant(d, 'dev'); break;
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
            G.Abilities.equip(s, m.dex, m.id); G.UI.toast('已装备：' + G.T(m.name)); break;
          }
          case 'mega-partner': {
            if (G.Game.state !== 'ui') { G.UI.toast('请先返回主菜单'); break; }
            if (!mega || !mega.available) break;
            s.owned[mega.dex] = s.owned[mega.dex] || {at:Date.now(),from:'dev'};
            s.partner = mega.dex; s.partnerShiny = false; if (!s.starter) s.starter = mega.dex; G.Flow.goMenu(); break;
          }
          case 'mega-apply': {
            const p = requireRun();
            if (p && !G.MegaPreview.apply(p, mega && mega.id, panel.querySelector('#dev-mega-shiny').checked)) G.UI.toast('请选择与本局伙伴对应且有素材的形态；异色需单独有素材');
            break;
          }
          case 'mega-clear': { const p = requireRun(); if (p) G.MegaPreview.restore(p); break; }
          case 'mega-anim': { const p = requireRun(); if (p) G.MegaPreview.play(p, panel.querySelector('#dev-mega-anim').value); break; }
          case 'god': god = !god; break;
          case 'weather': if (requireRun()) G.Weather.debugStart(panel.querySelector('#dev-weather').value, 20); break;
          case 'clear-weather': if (requireRun()) G.Weather.clear(); break;
          case 'damage': { const p = requireRun(); if (p) { p.invuln = 0; p.hurt(p.maxHp * 0.1); } break; }
          case 'same-type': { const p = requireRun(); if (p) { p.invuln = 0; p.hurt(p.maxHp * 0.2, p.mon.types[0], false, {kind:'attack'}); } break; }
          case 'fire-damage': { const p = requireRun(); if (p) { p.invuln = 0; p.hurt(p.maxHp * 0.2, 'fire', false, {kind:'attack'}); } break; }
          case 'lethal': { const p = requireRun(); if (p) { p.invuln = 0; p.hurt(p.maxHp * 10); } break; }
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
  return { init, canUse, setEnabled, setView, setZCooldown, adjustCurrency, renderSettings,
    get zShortCooldown() { return canUse() && zShortCooldown; },
    get viewMultiplier() { return viewMultiplier; }, get enabled() { return enabled; }, get invincible() { return canUse() && god; } };
})();
