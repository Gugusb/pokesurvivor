/* ============ coop.js — partida cooperativa (hasta 4 jugadores) ============
 *
 * Quién manda en qué:
 *   ANFITRIÓN   enemigos (aparición, IA, vida, muerte), objetos del suelo,
 *               experiencia y nivel del equipo, reloj, fin de la partida.
 *   CADA UNO    su propio Pokémon: posición, vida, ataques y lo que le golpea.
 *               Sus golpes a enemigos se mandan al anfitrión, que los aplica.
 *
 * Los invitados ven COPIAS de los enemigos del anfitrión (enemy.remote) y los
 * ataques de los compañeros como "fantasmas" que no hacen daño (ver combat.js).
 *
 * Quién está eligiendo (objeto o vínculo) y quién ha elegido carta de nivel va
 * además en CADA envío (no sólo en un aviso suelto): si un aviso se pierde
 * porque la conexión parpadea, el siguiente envío lo arregla y nadie se queda
 * esperando a otro para siempre (pasaba en 2026-10).
 *
 * Mensajes (por net.js, unas 15 veces por segundo; 5 si va por el relé):
 *   invitado -> anfitrión  { k:'f', p:[estado], ev:[eventos] }
 *   anfitrión -> invitado  { k:'f', t, lv, xp, xn, ki, bo, co, p:{uid:[estado]},
 *                            e:[[id,x,y,vida,anim,dir,estados]], ev:[eventos],
 *                            ja:[x,y,anim,dir] (Arceus, sólo en la Sentencia) }
 *   anfitrión -> todos     { k:'start', seed, host, members:[{uid,name,dex,shiny}] }
 */
G.Coop = (() => {
  const ANIMS = ['Idle', 'Walk', 'Attack', 'Shoot', 'Charge', 'Hurt', 'Faint'];
  const COLORS = ['#ffcb3d', '#5fc8ff', '#7ee07a', '#ff8ad8'];
  // P2P runs at 15 Hz. Slow/reconnecting links use 3 Hz while recovering;
  // v0.16 never sends those frames through an application server or TURN.
  const RATE_FAST = 1 / 15, RATE_TURN = 1 / 4, RATE_SLOW = 1 / 3;
  const rateFor = u => (G.Net.slow(u) ? RATE_SLOW : G.Net.viaTurn(u) ? RATE_TURN : RATE_FAST);
  const NEAR = 950;                     // radio de enemigos que se mandan a cada uno

  let active = false, host = false, me = null, hostUid = null;
  let local = null;                     // tu Player
  const mates = new Map();              // uid -> { uid, name, color, pl, connected, q:[], flushT, xpMul }
  let outEv = [];                       // invitado: eventos para el anfitrión
  let flushT = 0;
  let hitFrom = null;                   // invitado cuyo golpe se está aplicando (no repetirle el número)
  let specReceipt=0;
  let api = {};                         // callbacks del juego (game.js)
  let waiting = new Set();              // subida de nivel: quién falta por elegir
  let holds = new Set();                // quién está eligiendo una fusión (la partida se para para todos)
  // El anfitrión mueve a los enemigos: si cambia de pestaña (o se le congela),
  // todo se para para todos. Antes los enemigos se quedaban quietos y los demás
  // seguían jugando con una ventaja enorme.
  let hostAway = false, stalled = false, lastHostAt = 0;
  // Cartas de nivel: número de la ronda (anfitrión), la última que te ha llegado
  // y la última que has elegido (invitado). Y el último "quién elige" aplicado.
  let levelSeq = 0, levelNow = 1, seenSeq = 0, doneSeq = 0, lastHo = '';
  const STALL_MS = 2500;
  let members = [];

  // ---------------- escalado de dificultad ----------------

  const scaleRate = n => 1 + 0.75 * Math.max(0, n - 1);
  const scaleHp = n => 1 + 0.3 * Math.max(0, n - 1);

  // ---------------- arranque / fin ----------------

  /**
   * @param cfg   { seed, host, members }
   * @param pl    tu Player (ya creado)
   * @param cb    { levelStart(lv), resume(), waiting(names), over(data), lost(msg), team(t), shiny(dex) }
   */
  function begin(cfg, pl, cb) {
    if (G.MegaPreview) G.MegaPreview.restore(pl);
    specReceipt=0;active = true;
    me = G.Net.uid; hostUid = cfg.host;
    host = me === hostUid;
    local = pl;
    api = cb;
    members = cfg.members;
    mates.clear();
    outEv = []; flushT = 0; waiting = new Set(); holds = new Set();
    hostAway = false; stalled = false; lastHostAt = performance.now();
    levelSeq = 0; levelNow = 1; seenSeq = 0; doneSeq = 0; lastHo = '';
    cfg.members.forEach((m, i) => {
      const x = (i - (cfg.members.length - 1) / 2) * 34, y = 0;
      if (m.uid === me) { pl.x = x; pl.y = y; pl.uid = me; pl.coopHost = host; pl.tagColor = COLORS[i]; return; }
      const mon = G.DEX_BY[m.equipment&&G.MonProgression?G.MonProgression.rootFor(m.dex):m.dex] || G.DEX_BY[25];
      const p = new G.Player(mon, {}, !!m.shiny);
      if(G.MonProgression){p.evolutionPath=G.MonProgression.pathFor(m.dex).slice();p.monStage=mon.dex;}
      p.remote = true; p.uid = m.uid; p.tag = m.name; p.tagColor = COLORS[i]; p.revLabel = 'Quédate a su lado';
      p.ability = null;
      p.x = x; p.y = y;
      p.net = { x, y, ang: Math.PI / 2, walk: 0, hp: p.maxHp, maxHp: p.maxHp, dead: 0, mv: G.startMoveOf(mon.dex), ml: 1, mag: 78, aim: Math.PI / 2, rev: 0 };
      G.Sprites.preload([mon.dex], 8000, p.shiny);
      mates.set(m.uid, { uid: m.uid, name: m.name, selectedDex:m.dex, color: COLORS[i], pl: p, equipment:m.equipment, connected: true, q: [], flushT: 0, xpMul: 1 });
    });
  }

  function end() {
    active = false; host = false; local = null;
    mates.clear(); outEv = []; waiting = new Set(); holds = new Set();
  }

  /** Te vas de la partida (los demás siguen). */
  function leave() {
    if (!active) return;
    if (host) {
      // Si se va el anfitrión, la partida termina para todos.
      emit(['ov', Object.assign(api.summary ? api.summary() : {}, { why: 'host' })]);
      flushAll();
    } else {
      outEv.push(['bye']);
      flushClient(true);
    }
    end();
  }

  // ---------------- lista de jugadores ----------------

  function players() {
    const out = [local];
    for (const m of mates.values()) if (m.connected) out.push(m.pl);
    return out;
  }
  function puppets() { const out = []; for (const m of mates.values()) if (m.connected) out.push(m.pl); return out; }

  /**
   * Multiplicador de la experiencia del equipo: la media de los bonus de
   * cada uno, y repartida entre los que sois (en grupo cae mucho más, y si no
   * se subiría de nivel el triple de rápido que en solitario).
   */
  function xpFactor() {
    let s = local.effectiveXpMul, n = 1;
    for (const m of mates.values()) if (m.connected) { s += m.xpMul || 1; n++; }
    return (s / n) / local.effectiveXpMul / (1 + 0.6 * (n - 1));
  }

  // ---------------- estado de un jugador ----------------

  const r1 = v => Math.round(v), r2 = v => Math.round(v * 100) / 100;

  function myState() {
    // Con un vínculo se manda la órbita si la hay (es lo único que los demás no ven por los 'c').
    const g = local.activeGroup();
    const m = g.find(x => x.kind === 'orbit' && G.Projectiles.all().some(s=>s.orb&&s.owner===local&&s.mid===x.id)) || g.find(x=>x.kind!=='orbit');
    return [r1(local.x), r1(local.y), r2(local.moveAngle), local.walking ? 1 : 0, r1(local.hp), r1(local.maxHp),
            local.dead ? 1 : 0, m ? m.id : '', m ? m.lvl : 1, r1(local.magnet), r2(local.aim), r2(local.effectiveXpMul),
            r2(local.reviveT || 0), api.choosing && api.choosing() ? 1 : 0, doneSeq, local.ability || null,
            G.Mega && G.Mega.active(local) ? local.megaState.id : null, r2(local.megaState && local.megaState.left || 0),
            G.Mega && G.Mega.hasStone(local) ? local.megaState.id : null, r2(local.damageBonus || 0),
            G.ZMoves && G.ZMoves.hasStone(local) ? [local.zState.type,local.zState.phase,r2(local.zState.cooldown),local.zState.charges] : null,local.dex,local.level,local.evolutionPath,Object.entries(local.specialItems||{}),G.Specialization?.snapshot(local)||[]];
  }

  function readState(a) {
    const def=G.Moves.BY_ID[a[7]];
    return { x: a[0], y: a[1], ang: Number.isFinite(a[2])?a[2]:0, walk: a[3], hp: a[4], maxHp: a[5], dead: a[6], mv: a[7], ml: def&&Number.isFinite(a[8])?G.U.clamp(Math.floor(a[8]),1,def.maxLvl):1,
             mag: Number.isFinite(a[9])?G.U.clamp(a[9],0,10000):78, aim: Number.isFinite(a[10])?a[10]:0, xpMul: a[11], rev: Number.isFinite(a[12])?G.U.clamp(a[12],0,30):0, ch: a[13], ld: a[14], ability: a[15] || null,
             mega: a[16] || null, megaLeft: a[17] || 0, stone: a[18] || null,
             damageBonus: Number.isFinite(a[19]) ? G.U.clamp(a[19], 0, 10) : 0, z:a[20] || null,dex:a[21],level:a[22],path:a[23],items:a[24],masteries:a[25] };
  }
  function syncSpecies(m) {
    const n=m.pl.net,p=m.pl;
    if(!G.MonProgression?.stageFor||!Number.isInteger(n.level)||n.level<1||n.level>1000)return;
    const root=G.MonProgression.rootFor(m.selectedDex),path=n.path||G.MonProgression.pathFor(m.selectedDex);
    if(!Array.isArray(path))return;const i=path.indexOf(n.dex);
    if(!G.MonProgression.validPath(path,root)||i<0||n.level<G.MonProgression.evolutionLevel(i)||!G.DEX_BY[n.dex])return;
    const previous=p.evolutionPath||G.MonProgression.pathFor(m.selectedDex),at=previous.indexOf(p.monStage||p.dex);
    if(p.monStage!==root&&at>=0&&!previous.slice(0,at+1).every((d,j)=>path[j]===d))return;
    p.evolutionPath=path.slice();p.monStage=n.dex;
    const dex=n.dex;if(dex===p.dex)return;
    const mon=G.DEX_BY[dex],dir=p.anim.dir;p.baseAtk*=mon.atk/p.mon.atk;p.baseSpd*=mon.spd/p.mon.spd;
    p.baseHp*=mon.hp/p.mon.hp;p.baseAgility*=G.MonProgression.agilityBase(mon)/G.MonProgression.agilityBase(p.mon);p.baseStamina*=G.MonProgression.staminaBase(mon)/G.MonProgression.staminaBase(p.mon);
    p.baseSpa*=(mon.spa??mon.atk)/(p.mon.spa??p.mon.atk);
    p.baseDefense*=(mon.defense||1)/(p.mon.defense||1);p.baseSpDef*=(mon.spdef||1)/(p.mon.spdef||1);
    p.dex=dex;p.mon=mon;p.spriteDex=dex;p.megaForm=null;
    if(p.megaState)p.megaState.left=0;
    p.anim=new G.Sprites.Animator(dex,1,p.shiny);p.anim.dir=dir;
    p.r=G.Sprites.bodyRadius(dex);p.bodyH=G.Sprites.bodyHeight(dex);
    if(p.dead)p.anim.play('Faint',{hold:true});
    G.Projectiles.clearOrbs(p);
    G.Sprites.preload([dex],8000,p.shiny);
  }
  function validPlayerState(a) {
    return Array.isArray(a)&&a.length>=15&&[0,1,4,5,11].every(i=>Number.isFinite(a[i]))&&
      Math.abs(a[0])<=2e6&&Math.abs(a[1])<=2e6&&a[5]>=1&&a[5]<=50000&&a[4]>=0&&a[4]<=a[5]&&a[11]>=0&&a[11]<=100;
  }
  function syncPeerState(m,a) {
    if(!validPlayerState(a))return false;
    m.state=a.slice();m.pl.net=readState(a);syncSpecies(m);
    const p=m.pl,n=p.net;
    const validAbility=G.AbilityDefs.medalsFor(p.dex).some(a=>a.ability===n.ability)&&(!m.equipment||m.equipment.abilities?.[p.dex]===n.ability);
    p.ability=n.ability=validAbility?n.ability:null;
    if(m.equipment){
      const owns=id=>m.equipment.mega===id||m.equipment.megas?.includes(id);
      if(!owns(n.mega))n.mega=null;
      if(!owns(n.stone))n.stone=null;
      if(m.equipment.z!==n.z?.[0])n.z=null;
    }
    p.specialItems={};if(Array.isArray(n.items))for(const entry of n.items.slice(0,32)){if(!Array.isArray(entry))continue;const [id,count]=entry;if(G.Items?.BY[id]&&!['linker','masterytm'].includes(id)&&Number.isInteger(count)&&count>0&&count<=1000)p.specialItems[id]=count;}
    m.state[24]=Object.entries(p.specialItems);
    if(G.Specialization)m.state[25]=G.Specialization.sync(p,n.masteries);
    p.damageBonus=n.damageBonus;
    if(G.Mega)G.Mega.sync(p,n.mega,n.megaLeft,n.stone);
    if(G.ZMoves)G.ZMoves.sync(p,n.z);
    // Forward the validated equipment, not the original untrusted values.
    m.state[15]=n.ability;m.state[16]=n.mega;m.state[18]=n.stone;m.state[20]=n.z;
    return true;
  }

  // ---------------- envío ----------------

  /** Anfitrión: evento para todos los invitados (menos `except`). */
  function emit(ev, except) {
    if (!host) return;
    for (const m of mates.values()) if (m.connected && m.uid !== except) m.q.push(ev);
  }

  /** Anfitrión: evento sólo para los que están cerca (números de daño). */
  function emitNear(ev, x, y, except) {
    for (const m of mates.values()) {
      if (!m.connected || m.uid === except) continue;
      if (G.U.dist2(m.pl.x, m.pl.y, x, y) > 700 * 700) continue;
      if (m.q.length > 400) continue;
      m.q.push(ev);
    }
  }

  function enemyList(near) {
    const out = [];
    const r2n = NEAR * NEAR;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || G.U.dist2(e.x, e.y, near.x, near.y) > r2n) continue;
      const a = ANIMS.indexOf(e.anim.cur);
      out.push([e.id, r1(e.x), r1(e.y), Math.ceil(e.hp), a < 0 ? 0 : a, e.anim.dir,
                (e.burn > 0 || e.abilityBurn ? 1 : 0) | (e.poison > 0 ? 2 : 0) | (e.shield > 0 ? 4 : 0), r2(e.staticT || 0), r2(e.unnerveT || 0), r2(e.fearT || 0), r2(e.repelT || 0), e.ai?.fury?1:0,Math.round((e.bossGuard?.resistance||0)*100)]);
    }
    return out;
  }

  function hostFrame(m) {
    const st = api.team();
    const p = { [me]: myState() };
    for (const o of mates.values()) {
      if (o.connected && o.uid !== m.uid && o.state) p[o.uid] = o.state;
    }
    const ev = m.q; m.q = [];
    const f = { k: 'f', t: r2(st.time), lv: st.level, xp: r2(st.xp), xn: st.xpNext, ki: st.kills, bo: st.bosses, co: st.coins, tk: [st.t1, st.t10],
                p, e: enemyList(m.pl), ev, speed: G.Game.speed || 1,victory:!!st.victory,scoreCounts:st.scoreCounts };
    const ja = G.Judgment.netState();       // Arceus en la Sentencia
    if (ja) f.ja = ja;
    // Siempre: quién está eligiendo y, si hay cartas de nivel, cuáles (ver arriba).
    f.ho = holdNames();
    if (waiting.size) f.lu = [levelSeq, levelNow];
    return f;
  }

  function flushAll() { for (const m of mates.values()) if (m.connected) G.Net.send(m.uid, hostFrame(m)); }
  function resyncPeer(m) {
    if(!m?.connected)return;
    const events=[['reset']];
    for(const e of G.EnemyMgr.all())if(!e.dead)events.push(['ne',e.id,e.dex,r1(e.x),r1(e.y),e.boss?1:0,e.shiny?1:0,Math.ceil(e.maxHp),r2(e.dmg),e.behavior,e.mega||null,e.elite?1:0,e.legend?1:0]);
    for(const o of G.Pickups.all())events.push(['pk',o.id,o.kind,r1(o.x),r1(o.y),o.value]);
    const pending=m.q.filter(e=>!['ne','ed','eg','pk','pc'].includes(e[0]));m.q=[];
    while(events.length){m.q=events.splice(0,400);G.Net.send(m.uid,hostFrame(m));}
    m.q.push(...pending);
  }
  function resync() {if(!active)return;if(host){for(const m of mates.values())resyncPeer(m);}else {outEv.push(['rs']);flushClient(true);}}

  function flushClient(force) {
    if (!force && !outEv.length && flushT > 0) return;
    G.Net.toHost({ k: 'f', p: myState(), ev: outEv });
    outEv = [];
  }

  /** Cada fotograma (también en la pantalla de subida de nivel). */
  function tick(dt) {
    if (!active) return;
    if (host) {
      for (const m of mates.values()) {
        if (!m.connected) continue;
        m.flushT -= dt;
        if (m.flushT > 0) continue;
        m.flushT = rateFor(m.uid);
        G.Net.send(m.uid, hostFrame(m));
      }
    } else {
      if (!stalled && performance.now() - lastHostAt > STALL_MS) { stalled = true; updateAway(); }
      flushT -= dt;
      if (flushT <= 0) {
        flushT = rateFor(hostUid);
        G.Net.toHost({ k: 'f', p: myState(), ev: outEv });
        outEv = [];
      }
    }
  }

  // ---------------- recepción ----------------

  G.Net.on((from, msg) => {
    if (!msg) return;
    if (msg.k === 'start') { if(from!==G.Net.hostUid||msg.host!==from)return; if (G.Flow.startCoop) G.Flow.startCoop(msg); return; }
    if (!active || msg.k !== 'f') return;
    if (host) onClientFrame(from, msg); else if (from === hostUid) onHostFrame(msg);
  });

  G.Net.onPeer((u, mode) => {
    if (!active || (mode !== 'closed' && mode !== 'failed')) return;
    if (host) mateGone(u);
    else if (u === hostUid) { const cb = api.lost; end(); if (cb) cb('Se ha perdido la conexión con el anfitrión.'); }
  });

  function mateGone(u) {
    const m = mates.get(u);
    if (!m || !m.connected) return;
    m.connected = false;
    G.Projectiles.clearOrbs(m.pl);
    G.Spawner.say(m.name + ' ha dejado la partida', 2.6);
    if (waiting.has(u)) picked(u);
    if (holds.has(u)) holdOff(u);
    if (api.mateLeft) api.mateLeft(m);
  }

  // --- en el anfitrión ---

  function onClientFrame(from, msg) {
    const m = mates.get(from);
    if (!m || !m.connected) return;
    if(!Array.isArray(msg.ev)||msg.ev.length>2000)return;
    if(msg.p&&!validPlayerState(msg.p))return;
    if (msg.p) {
      syncPeerState(m,msg.p);
      m.xpMul = m.pl.net.xpMul || 1; reconcile(from, m.pl.net);
    }
    for (const ev of msg.ev || []) {
      if(api.team?.().victory&&ev[0]!=='bye')continue;
      switch (ev[0]) {
        case 'rs':
          if(G.Game.st.time-(m.resyncAt??-999)>=5){m.resyncAt=G.Game.st.time;resyncPeer(m);}
          break;
        case 'zc':
          if(G.ZMoves && G.Game.st.time-(m.zAt??-999)>=G.ZMoves.COOLDOWN && G.ZMoves.remoteCast(m.pl,ev[1],ev[2])){
            m.zAt=G.Game.st.time;emit(['zc',from,ev[1],ev[2]],from);
          }
          break;
        case 'mx':
          if (G.Mega && G.Mega.active(m.pl) && m.pl.megaState.id === ev[1] && G.Game.st.time - (m.megaRepelAt ?? -999) >= G.Mega.DURATION) {
            m.megaRepelAt = G.Game.st.time; G.Mega.repel(m.pl);
          }
          break;
        case 'h': {
          if(!Number.isFinite(ev[2])||ev[2]<=0||ev[2]>1e9||!G.Moves.BY_ID[ev[7]]||[4,5,6].some(i=>!Number.isFinite(ev[i])))break;
          const e = G.EnemyMgr.get(ev[1]);
          if (!e || e.dead || e.remote) break;
          hitFrom = from;
          const def = G.Moves.BY_ID[ev[7]];
          const move=G.Moves.instance(def.id,1);if(ev[8]===1)G.Moves.evolve(move);
          const attack = { id:def.id, kind: def.kind, type: def.type, damageClass:move.damageClass, evolved:!!move.evolved };
          e.hurt(ev[2], ev[3], ev[4], ev[5], G.Abilities.suppressEffects(m.pl) ? 0 : ev[6], null, m.pl, attack);
          hitFrom = null;
          break;
        }
        case 'bl': {
          const e=G.EnemyMgr.get(ev[1]);
          if(e&&!e.dead&&e.legend&&Number.isFinite(ev[2])&&ev[2]>0&&ev[2]<=m.pl.maxHp&&G.BossCombat)
            G.BossCombat.leech(e,ev[2],m.pl.maxHp);
          break;
        }
        case 's': {
          const e = G.EnemyMgr.get(ev[1]);
          if (!e || e.dead) break;
          if (G.Abilities.suppressEffects(m.pl)) break;
          if (ev[2] === 'b') e.applyBurn(ev[3], m.pl);
          else if (ev[2] === 'p') e.applyPoison(ev[3], m.pl);
          else if (ev[2] === 's') e.applySlow(ev[3], ev[4] || 1.2);
          break;
        }
        case 'ab': {
          const e = G.EnemyMgr.get(ev[1]);
          const allowed = m.pl.ability === ev[2] || (m.pl.ability === 'intimidate' && ev[2] === 'repel') ||
            (m.pl.ability === 'serenegrace' && G.Abilities.DEBUFFS.includes(ev[2]));
          if (e && !e.dead && allowed && Number.isFinite(ev[3])) G.Abilities.applyEffect(e, ev[2], Math.max(0, Math.min(1e6, ev[3])), m.pl);
          break;
        }
        case 'aw': {
          const kind = G.Abilities.WEATHER[m.pl.ability], now = G.Game.st.time;
          if (kind && ev[1] === kind && now - (m.abilityWeatherAt || 0) >= 39.5) {
            m.abilityWeatherAt = now; G.Weather.debugStart(kind, 20);
          }
          break;
        }
        case 'as': {
          if (m.pl.ability === 'synchronize' && Number.isFinite(ev[1])) {
            for (const e of G.EnemyMgr.all()) if (!e.dead) e.applySlow(G.U.clamp(ev[1], 0, 0.95), 3);
          }
          break;
        }
        case 'c':
          if(!G.Moves.BY_ID[ev[1]]||!Number.isFinite(ev[2])||!Number.isFinite(ev[3]))break;
          ev[2]=G.U.clamp(Math.floor(ev[2]),1,G.Moves.BY_ID[ev[1]].maxLvl);
          G.Combat.ghostCast(m.pl, ev[1], ev[2], ev[3], ev[4],Number.isFinite(ev[5])?G.U.clamp(ev[5],0,120):0);
          emit(['c', from, ev[1], ev[2], ev[3], ev[4],Number.isFinite(ev[5])?G.U.clamp(ev[5],0,120):0], from);
          break;
        case 'pb':
          if(!Number.isInteger(ev[1])||!Number.isInteger(ev[2])||Math.abs(ev[1])>1e6||Math.abs(ev[2])>1e6)break;
          G.World.breakAt(ev[1], ev[2]);
          emit(['pb', ev[1], ev[2]], from);
          break;
        case 'lp': picked(from); break;
        case 'hs': holdOn(from); break;
        case 'he': holdOff(from); break;
        case 're': G.Rift.enterRequest(); break;
        case 'bye': mateGone(from); break;
      }
    }
  }

  /** Anfitrión: lo que dice cada envío del invitado manda sobre avisos que se hayan perdido. */
  function reconcile(from, n) {
    if (n.ch === undefined) return;                        // versión vieja del juego
    if (n.ch && !holds.has(from)) holdOn(from);
    else if (!n.ch && holds.has(from)) holdOff(from);
    if (waiting.has(from) && n.ld >= levelSeq) picked(from);
  }

  // --- en el invitado ---

  /** Invitado: se para (o sigue) según si el anfitrión está. */
  function updateAway() { if (api.away) api.away(hostAway || stalled ? nameOf(hostUid) : null); }

  // Anfitrión: al irse de la pestaña avisa a todos al momento (después ya no
  // podrá mandar nada) y al volver, que sigue.
  document.addEventListener('visibilitychange', () => {
    if (!active || !host) return;
    emit(['ha', document.hidden ? 1 : 0]);
    flushAll();
  });

  function onHostFrame(msg) {
    lastHostAt = performance.now();
    if (stalled) { stalled = false; updateAway(); }
    // Sync the clock and the victory overlay before processing hold events,
    // so a bond/level overlay cannot replace the shared victory decision.
    if (G.Game.setSpeed) G.Game.setSpeed(msg.speed === 2 ? 2 : 1, true);
    api.syncTeam({ time: msg.t, level: msg.lv, xp: msg.xp, xpNext: msg.xn, kills: msg.ki, bosses: msg.bo, coins: msg.co,
                   t1: (msg.tk || [])[0], t10: (msg.tk || [])[1],scoreCounts:msg.scoreCounts });
    if(api.victory)api.victory(!!msg.victory);
    // Apply form/equipment state before any casts in this same snapshot.
    for (const u in msg.p || {}) {
      const m=mates.get(u);if(m)syncPeerState(m,msg.p[u]);
    }
    for (const ev of msg.ev || []) applyHostEvent(ev);
    if (msg.ja) G.Judgment.netApply(msg.ja);
    // Quién elige y las cartas de nivel, aunque se haya perdido algún aviso.
    if (msg.ho) {
      const k = msg.ho.join('|');
      if (k !== lastHo) { lastHo = k; api.hold && api.hold(msg.ho); }
      if (msg.lu && msg.lu[0] > seenSeq) { seenSeq = msg.lu[0]; api.levelStart(msg.lu[1]); }
      else if (!msg.lu && api.inLevelUp && api.inLevelUp()) api.resume();
    }
    const now = performance.now();
    for (const a of msg.e || []) {
      const e = G.EnemyMgr.get(a[0]);
      if (!e || !e.remote || e.dead) continue;
      const n = e.net;
      const dts = (now - (n.last || now)) / 1000;
      if (dts > 0.02 && dts < 1) {
        n.vx = G.U.clamp((a[1] - n.x) / dts, -600, 600);
        n.vy = G.U.clamp((a[2] - n.y) / dts, -600, 600);
      } else { n.vx = 0; n.vy = 0; }
      n.x = a[1]; n.y = a[2]; n.age = 0; n.last = now;
      e.hp = Math.min(e.maxHp, a[3]);
      if(e.boss){e.ai={fury:!!a[11]};e.bossGuard={resistance:(a[12]||0)/100};}
      n.anim = a[4]; n.dir = a[5]; n.st = a[6];
      e.staticT = a[7] || 0; e.unnerveT = a[8] || 0;
      e.fearT = a[9] || 0;
      e.repelT = a[10] || 0;
    }
  }

  function applyHostEvent(ev) {
    switch (ev[0]) {
      case 'reset': G.EnemyMgr.clearRemote();G.Pickups.clear();G.Projectiles.clear();break;
      case 'mk': if (G.Mega) G.Mega.onKill(local, ev[1]); break;
      case 'za': if(G.ZMoves)G.ZMoves.grantCharge(local,ev[1]);break;
      case 'ak': G.Abilities.onKill(local, ev[1]); break;
      case 'ne':
        G.EnemyMgr.addRemote({ id: ev[1], dex: ev[2], x: ev[3], y: ev[4], boss: !!ev[5], shiny: !!ev[6], hp: ev[7], dmg: ev[8], beh: ev[9], mega: ev[10],elite:!!ev[11],legend:!!ev[12] });
        break;
      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;
      case 'eg': G.EnemyMgr.removeRemote(ev[1], false); break;
      case 'hn': { const e = G.EnemyMgr.get(ev[1]); if (e && !e.dead) e.showHurt(ev[2], ev[3]); break; }
      case 'es':
        G.Projectiles.spawn({ x: ev[1], y: ev[2], vx: ev[3], vy: ev[4], dmg: ev[5], r: ev[6], life: ev[7],
                              friendly: false, color: '#ff7a9e', vis: G.VFX.forType(ev[8]), mtype: ev[8],sourceId:ev[9]||0 });
        break;
      case 'c': { const m = mates.get(ev[1]); if (m) G.Combat.ghostCast(m.pl, ev[2], ev[3], ev[4], ev[5],ev[6]); break; }
      case 'zc': {const m=mates.get(ev[1]);if(m&&G.ZMoves){G.ZMoves.sync(m.pl,m.pl.net?.z);G.ZMoves.remoteCast(m.pl,ev[2],ev[3]);}break;}
      case 'sr': if(G.Specialization)G.Specialization.reward(local,ev[1],ev[2],ev[3],ev[4]);break;
      case 'sf': {const e=G.EnemyMgr.get(ev[1]);if(e&&!e.boss&&Number.isFinite(ev[2])&&ev[2]>0){e.freezeT=Math.max(e.freezeT||0,Math.min(.5,ev[2]));G.FX.ring(e.x,e.y,e.r,e.r*2,'#a4e8ff',.5,2);}break;}
      case 'bc': G.BossRewards?.receive(ev[1],ev[2]);break;
      case 'item': api.item(ev[1]); break;
      case 'pk': G.Pickups.addRemote(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
      case 'pc': G.Pickups.removeId(ev[1]); break;
      case 'mag': G.Pickups.pullAll(); G.FX.ring(local.x, local.y, 10, 420, '#ff9ed8', 0.6, 4); break;
      case 'bomb':
        G.FX.ring(ev[1], ev[2], 20, G.Camera.outerRadius(), '#ff7b3d', 0.5, 6);
        if (G.U.dist2(ev[1], ev[2], local.x, local.y) < 500 * 500) G.Camera.kick(0.8);
        G.Audio.sfx('break');
        break;
      case 'pb': G.World.breakAt(ev[1], ev[2]); break;
      case 'say': G.Spawner.say(ev[1], ev[2]); break;
      case 'heal': if (!local.dead) { local.heal(local.maxHp * ev[1]); G.FX.ring(local.x, local.y, 6, 60, '#5fe08a', 0.4, 3); } break;
      case 'lu': if (!ev[2] || ev[2] > seenSeq) { seenSeq = ev[2] || seenSeq; api.levelStart(ev[1]); } break;
      case 'lw': api.waiting(ev[1]); break;
      case 'lr': api.resume(); break;
      case 'hp': lastHo = (ev[1] || []).join('|'); api.hold && api.hold(ev[1]); break;
      case 'ha': hostAway = !!ev[1]; updateAway(); break;
      case 'sh': api.shiny(ev[1]); break;
      case 'ov': { const cb = api.over; const d = ev[1]; end(); cb(d); break; }
      case 'rift': case 'riftx': case 'arena': case 'aw': case 'al': G.Rift.onEvent(ev); break;
      case 'jd': case 'jk': G.Judgment.onEvent(ev); break;
      case 'wx': G.Weather.onEvent(ev); break;
      case 'ev': G.Events.onNet(ev); break;
      case 'hz': G.Hazards.add(ev[1], true); break;
      case 'fxr': G.FX.ring(ev[1], ev[2], 8, ev[3], ev[4], 0.5, 3); break;
    }
  }

  // ---------------- ganchos que llaman los módulos del juego ----------------

  /** Tu ataque: los demás lo repiten como fantasma. */
  function cast(pl, m, orbitLife=0) {
    if (!active || pl !== local) return;
    if (host) emit(['c', me, m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0, orbitLife]);
    else outEv.push(['c', m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0, orbitLife]);
  }
  function zCast(pl,ms,angles){
    if(!active||pl!==local)return;
    const spec=ms.map(m=>[m.id,m.lvl,!!m.evolved]);
    if(host)emit(['zc',me,spec,angles]);else {outEv.push(['zc',spec,angles]);flushClient(true);}
  }

  // invitado
  function hit(e, d, color, dx, dy, knock, attack = {}) { outEv.push(['h', e.id, d, color, r1(dx), r1(dy), knock || 0, attack.id || null, attack.evolved ? 1 : 0]); }
  function status(e, kind, val, dur) { outEv.push(['s', e.id, kind, val, dur]); }

  // anfitrión
  function hurtShown(e, d, color) { emitNear(['hn', e.id, d, color], e.x, e.y, hitFrom); }
  function abilityKill(p, id) { const m = mates.get(p.uid); if (m && m.connected) m.q.push(['ak', id]); }
  function megaKill(p, id) { const m = mates.get(p.uid); if (m && m.connected) m.q.push(['mk', id]); }
  function zAward(p,key){const m=mates.get(p.uid);if(m&&m.connected)m.q.push(['za',key]);}
  function enemyAdded(e) {
    emit(['ne', e.id, e.dex, r1(e.x), r1(e.y), e.boss ? 1 : 0, e.shiny ? 1 : 0, Math.ceil(e.maxHp), r2(e.dmg), e.behavior, e.mega || null,e.elite?1:0,e.legend?1:0]);
  }
  function enemyGone(e, died) { emit([died ? 'ed' : 'eg', e.id]); }
  function bossLeech(e,damage){if(!host)outEv.push(['bl',e.id,Math.max(0,Math.min(local.maxHp,damage))]);}
  function enemyShot(p, type) { emit(['es', r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), r2(p.dmg), p.r, p.life, type,p.sourceId||0]); }
  function pickupAdded(o) { emit(['pk', o.id, o.kind, r1(o.x), r1(o.y), o.value]); }
  function pickupGone(id) { emit(['pc', id]); }
  function say(text, secs) { emit(['say', text, secs]); }

  function propBroken(p) {
    if (host) emit(['pb', p.tx, p.ty]);
    else outEv.push(['pb', p.tx, p.ty]);
  }

  /** Anfitrión: alguien ha cogido un objeto. Devuelve true si es para ti. */
  function collected(p, who) {
    emit(['pc', p.id]);
    if (p.kind === 'magnet') emit(['mag']);
    if (p.kind === 'bomb') emit(['bomb', r1(who.x), r1(who.y)]);
    if ((p.kind === 'heal' || p.kind === 'item') && who !== local) {
      const m = mates.get(who.uid);
      if (m) m.q.push(p.kind === 'heal' ? ['heal', 0.3] : ['item', p.value]);
    }
  }

  function shinyCaught(e) { emit(['sh', e.dex]); }

  // ---------------- subida de nivel compartida ----------------

  function levelStart(level) {
    waiting = new Set([me]);
    for (const m of mates.values()) if (m.connected) waiting.add(m.uid);
    levelSeq++; levelNow = level;
    emit(['lu', level, levelSeq]);
    flushAll();
    api.levelStart(level);
    sendWaiting();
  }

  function nameOf(u) { return u === me ? (G.Social.me ? G.Social.me.name : 'Tú') : (mates.get(u) || {}).name || '?'; }

  function sendWaiting() {
    const names = [...waiting].map(nameOf);
    emit(['lw', names]);
    api.waiting(names);
  }

  /** Alguien ha elegido carta (anfitrión). */
  function picked(u) {
    if (!waiting.delete(u)) return;
    if (waiting.size) { sendWaiting(); return; }
    emit(['lr']);
    flushAll();
    api.resume();
  }

  // ---------------- fusiones: pausa para todos ----------------
  // Mientras alguien elige qué movimientos fusiona (vínculo de un legendario),
  // la partida se para para todos, como con las cartas de nivel.

  function holdNames() { return [...holds].map(nameOf); }

  /** Anfitrión: `u` empieza a elegir. */
  function holdOn(u) {
    holds.add(u);
    emit(['hp', holdNames()]); flushAll();
    api.hold && api.hold(holdNames());
  }

  /** Anfitrión: `u` ha terminado (o se ha ido). */
  function holdOff(u) {
    if (!holds.delete(u)) return;
    emit(['hp', holdNames()]); flushAll();
    api.hold && api.hold(holdNames());
  }

  /** Tú empiezas / terminas de elegir fusión. */
  function holdStart() { if (host) holdOn(me); else { outEv.push(['hs']); flushClient(true); } }
  function holdEnd() { if (host) holdOff(me); else { outEv.push(['he']); flushClient(true); } }

  /** Has elegido tu carta. */
  function localPicked() {
    if (host) picked(me);
    else { doneSeq = seenSeq; outEv.push(['lp']); flushClient(true); }
  }

  /** Anfitrión: se acabó para todos. */
  function over(data) {
    emit(['ov', data]);
    flushAll();
    end();
  }

  return {
    ANIMS, COLORS, begin, end, leave, tick, players, puppets, xpFactor, scaleRate, scaleHp,resync,
    specReward(p,id,heal,pp){const m=mates.get(p.uid);if(host&&m&&m.connected)m.q.push(['sr',++specReceipt,id,Math.min(p.maxHp,heal),pp]);},
    cast, zCast, hit, status, bossLeech, hurtShown, abilityKill, megaKill, enemyAdded, enemyGone, enemyShot, pickupAdded, pickupGone, say,
    propBroken, collected, shinyCaught, levelStart, localPicked, over, holdStart, holdEnd,zAward,
    /** Anfitrión: evento para todos. Invitado: evento para el anfitrión. */
    broadcast(ev) { emit(ev); },
    toHost(ev) { if (active && !host) { outEv.push(ev); flushClient(true); } },
    mate(u) { return mates.get(u); },
    get mates() { return [...mates.values()]; },
    get members() { return members; },
    get active() { return active; },
    get isHost() { return active && host; },
    get local() { return local; }
  };
})();
