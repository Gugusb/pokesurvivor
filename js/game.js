/* ============ game.js — flujo del juego y bucle principal ============
 *
 *   login ──> test de personalidad ──> menú ──> run ──> resumen ──> menú
 *                (sólo la 1ª vez)          │
 *                                          ├─ Pokémon (colección)
 *                                          ├─ Mejoras
 *                                          └─ Gacha
 *
 * Estados del bucle: 'ui' (menús, con el mundo de fondo), 'playing',
 * 'levelup', 'paused', 'over'.
 *
 * Cooperativo (G.Coop.active): el anfitrión lleva enemigos, objetos y
 * experiencia; cada uno su Pokémon. La pausa no para el juego, las cartas de
 * nivel esperan a que elijan todos y un compañero caído se levanta si otro
 * se queda a su lado. Ver net/coop.js.
 */
G.Game = (() => {
  let cv, ctx, dpr = 1, w = 0, h = 0;
  let state = 'ui';
  let time = 0, last = 0, pendingLevels = 0;
  let pl = null;
  let caught = [];          // shinies y capturas pendientes de esta run
  let biome = -1;
  let challenge = null, victoryBusy=false;

  const st = { get time() { return time; }, get difficulty() { return challenge?.stars || 4; } };

  // ---------------- arranque ----------------

  function init() {
    cv = document.getElementById('game');
    ctx = cv.getContext('2d');
    resize();
    addEventListener('resize', resize);
    G.Touch.init(cv);
    // Switching apps pauses solo play; either screen orientation is supported.
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
    G.RunUI.wirePause(() => { state = 'playing'; G.UI.hideAll(); }, quitRun);
    Backdrop.init();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function resize() {
    // Resolución interna como mucho ×1,5: en pantallas ×2 dibujar el doble de
    // píxeles era de lo que más costaba, y con el pixel art no se nota.
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    G.Camera.resize(w, h, dpr);
  }

  /** Pausa sola (sólo en solitario: en grupo los demás siguen). */
  function autoPause() {
    G.Touch.reset();
    if (state === 'playing' && !G.Coop.active) { state = 'paused'; G.RunUI.showPause(); }
  }

  /** Pausa/continúa (tecla Esc o P, o el botón de pausa del móvil). */
  let holdBy = [];                   // grupo: quién está eligiendo fusión (todo parado)

  function togglePause() {
    // En grupo la pausa no para el juego (los demás siguen jugando).
    if (G.Coop.active) {
      if (state !== 'playing') return;
      if (G.UI.isOpen('scr-pause')) G.UI.hide('scr-pause');
      else { G.RunUI.showPause(true); G.Audio.sfx('pause'); }
      return;
    }
    if (state === 'playing') { state = 'paused'; G.RunUI.showPause(); G.Audio.sfx('pause'); }
    else if (state === 'paused') { state = 'playing'; G.UI.hideAll(); }
  }

  // ---------------- run ----------------

  /** @param coop  { seed, host, members } para una partida en grupo */
  let startingRun=false;
  async function startRun(coop = null) {
    G.BossRewards.reset();
    if(startingRun)return;
    holdBy = []; awayBy = null;
    const save = G.DB.save;
    // A run always starts at the first form, even when the selected Pokédex
    // entry is an evolved form.  IVs are read from that form's collection
    // entry and then carried through the evolution stages.
    const startDex = G.MonProgression ? G.MonProgression.rootFor(save.partner) : save.partner;
    if(G.DB.mode==='server'&&G.DB.online){
      startingRun=true;
      try{await G.Server.prepareRun(coop?'g':'s',startDex,coop?.difficulty??save.difficulty.selected);}
      catch(e){G.UI.toast(e.message,6000);G.MenuUI.open();return;}
      finally{startingRun=false;}
    }
    const evolutionPath = G.MonProgression ? G.MonProgression.pathFor(save.partner) : [startDex];
    const mon = G.DEX_BY[startDex];
    challenge = G.Difficulty ? G.Difficulty.begin(save, mon.dex, coop?.difficulty ?? (coop ? 1 : undefined)) : null;
    const perks = G.Upgrades.perks(G.DB.upgradesOf(startDex));

    G.UI.hideAll();
    G.UI.chrome(false);
    G.FX.clear();
    G.Projectiles.clear();
    G.Combat.clearFields();
    G.EnemyMgr.clear();
    G.Pickups.clear();
    G.Spawner.reset();
    G.Rift.reset();
    G.Judgment.reset();
    G.Events.reset();
    G.Weather.reset();
    G.Path.clear();
    G.Hazards.clear();
    G.World.reset(coop ? coop.seed : Math.floor(Math.random() * 1e6));
    G.World.setBiome(0, true);
    biome = 0;
    time = 0; pendingLevels = 0;openItem=null;laterItems.length=0;
    victoryBusy=false;
    runSpeed = 1; speedBonus = 0; speedK = 1; scoreCounters={normal:0,elite:0,boss:0,rift:0,events:0};
    runReal = performance.now(); tampered = !!(G.Dev && G.Dev.enabled);

    pl = new G.Player(mon, perks, !!save.partnerShiny && G.DB.ownsShiny(save.partner), save.partner);
    if (G.MonProgression) {
      pl.evolutionPath = evolutionPath.slice();
      pl.monStage = G.MonProgression.stageFor(startDex, 1, pl.evolutionPath);
    }
    banked = { t1: 0, t10: 0 };
    caught = [];
    if (G.MonProgression) challenge.pendingCaptures = [];
    // Atajos: movimientos con hueco fijo (save.pbind[dex] = [id del 1, id del 2, ...]),
    // antes de aprender nada: addMove ya los coloca.
    (save.pbind && save.pbind[startDex] || []).forEach((id, i) => { if (id) pl.bind[id] = i; });
    pl.addMove(G.startMoveOf(startDex));
    // Mejora "Veto": movimientos que no quieres que te salgan.
    pl.banned = new Set((save.pban && save.pban[startDex] || []).slice(0, perks.bans));
    // Mejora "Repertorio": un segundo movimiento de ataque al azar.
    if (perks.startMoves >= 2) {
      const pool = G.Moves.poolFor(mon).filter(id => !pl.hasMove(id) && !pl.banned.has(id) && G.Moves.BY_ID[id].kind !== 'buff');
      if (pool.length) pl.addMove(G.U.pick(pool));
      pl.setActive(0);
    }

    if (coop) {
      G.Coop.begin(coop, pl, coopApi);
      G.Social.setPlaying(true);
    }
    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;
    // Hojas de sprites locales: el compañero y los primeros enemigos.
    G.Sprites.preload([mon.dex], 8000, pl.shiny);
    G.Audio.music(G.BIOME_MUSIC[0]);
    // Para el ranking: el servidor apunta cuándo empieza la partida (anti-trampas).
    if (G.DB.mode === 'server') G.Server.startRun(coop ? 'g' : 's');
    else if (!coop || G.Coop.isHost) G.Ranking.runStarted(coop ? 'g' : 's');
    deathT = 0;

    state = 'playing';
  }

  function quitRun() {
    if (G.Coop.active) G.Coop.leave();
    endRun(false);
  }

  function checkChallenge() {
    if (!G.Difficulty || !challenge || pl.dead || time <= G.Difficulty.WIN) return;
    challenge.survived = true;
    if (challenge.victory || !clean()) return;
    if (!G.Difficulty.record(G.DB.save, challenge, time, true, true)) return;
    challenge.choicePending=true;
    G.DB.commit(true);
    G.UI.toast(G.T('Dificultad superada') + ' · ' + challenge.stars + '★ · ' + pl.mon.name, 5000);
    G.Audio.sfx('legend');
    if (G.Social.refreshMember) G.Social.refreshMember();
  }

  function victoryChoice(waiting=false){
    state='victory';challenge.choiceShown=true;challenge.choicePending=false;
    G.RunUI.showVictory(challenge.stars,G.Difficulty.bonusAvailable(G.DB.save,challenge.stars),G.Coop.active,waiting,
      ()=>cashoutVictory(),()=>{
        if(state!=='victory'||victoryBusy)return;
        G.UI.hide('scr-victory');state='playing';
        if(G.Coop.active)G.Coop.holdEnd();
      });
  }
  function maybeVictoryChoice(){
    if(state!=='playing'||!challenge?.victory||challenge.choiceShown||!challenge.choicePending||pl.dead||!clean()||G.Coop.active&&!G.Coop.isHost)return false;
    if(G.ZMoves&&everyone().some(G.ZMoves.busy)||['scr-levelup','scr-item','scr-bond','scr-pause'].some(G.UI.isOpen))return false;
    victoryChoice();if(G.Coop.active)G.Coop.holdStart();return true;
  }
  let scoreCounters={normal:0,elite:0,boss:0,rift:0,events:0};
  function scoreCounts(){
    const c=G.Difficulty.scoreCounts(scoreCounters);
    const counted=c.normal+c.elite+c.boss+c.rift;
    c.normal+=Math.max(0,(pl?.kills||0)-counted);return c;
  }
  function runScore(){return G.Difficulty.score(scoreCounts(),time,challenge?.stars);}
  function scoreKill(e){scoreCounters[e.legend?'rift':e.boss?'boss':e.elite?'elite':'normal']++;}
  function scoreEvent(){scoreCounters.events++;}
  function coinPayout(){
    const score=runScore(),parts={puntuación:G.Difficulty.rewardCoins(score.total),recogidas:pl.coins};
    return {parts,score,base:Math.round(Object.values(parts).reduce((a,b)=>a+b,0)*pl.coinMul)};
  }
  async function cashoutVictory(fromHost=false){
    if(victoryBusy||!pl||state!=='victory')return false;
    const actor=pl,run=challenge,account=G.DB.save;
    victoryBusy=true;let extra=0;
    try{
      if(challenge?.victory&&clean()&&G.Difficulty.bonusAvailable(G.DB.save,challenge.stars))extra=await G.DB.claimVictoryBonus(challenge,coinPayout().base);
    }catch(e){
      victoryBusy=false;
      if(!fromHost)return false;
      G.UI.toast(G.T('No se pudo cobrar el extra; la oportunidad sigue disponible.'));
    }
    if(pl!==actor||challenge!==run||G.DB.save!==account||state!=='victory'){victoryBusy=false;return false;}
    if(G.Coop.active&&G.Coop.isHost)G.Coop.over({...summary(),why:'victory',victoryCashout:true});
    endRun(false,extra);victoryBusy=false;return true;
  }

  function setSpeed(value, fromHost = false) {
    if (value !== 1 && value !== 2 || !pl || !['playing','paused','held','levelup'].includes(state)) return false;
    if (G.Coop.active && !G.Coop.isHost && !fromHost) return false;
    const changed=runSpeed!==value;
    runSpeed = value;
    if(changed&&G.DB.mode==='server')G.Server.heartbeat().catch(()=>{});
    return true;
  }

  /** Todos los jugadores de la partida (tú primero). */
  function everyone() { return G.Coop.active ? G.Coop.players() : [pl]; }

  /** Experiencia que hace falta para el siguiente nivel (cofres con candado). */
  function levelXp() {
    if (!pl) return 20;
    const k = (G.Coop.active ? G.Coop.xpFactor() : 1) * pl.effectiveXpMul;
    return Math.ceil((pl.xpNext - pl.xp + 1) / k);
  }

  // Destello de pantalla completa (viaje a la grieta).
  let flashT = 0, flashDur = 1, flashCol = '#fff';
  function flash(col, dur) { flashCol = col; flashDur = dur; flashT = dur; }

  function teamState() {
    return { time, level: pl.level, xp: pl.xp, xpNext: pl.xpNext, kills: pl.kills, bosses: pl.bosses, coins: pl.coins, t1: pl.t1, t10: pl.t10,scoreCounts:scoreCounts(),victory:state==='victory' };
  }
  function summary() { return { t: time, ki: pl.kills, bo: pl.bosses, co: pl.coins, lv: pl.level, t1: pl.t1, t10: pl.t10,scoreCounts:scoreCounts() }; }

  /** Lo que el cooperativo necesita del juego. */
  /**
   * Los tickets recogidos se guardan en cuanto los coges (como los shinies):
   * antes sólo al acabar, y si la pestaña se cerraba de golpe se perdían.
   * `banked` = los de esta partida que ya están en la partida guardada.
   */
  let banked = { t1: 0, t10: 0 };
  function bankTickets(save_ = true) {
    const sv = G.DB.save;
    if (!sv || !pl) return;
    sv.tickets = sv.tickets || { t1: 0, t10: 0 };
    const d1 = Math.max(0, pl.t1 - banked.t1), d10 = Math.max(0, pl.t10 - banked.t10);
    if (!d1 && !d10) return;
    sv.tickets.t1 += d1; sv.tickets.t10 += d10;
    banked = { t1: pl.t1, t10: pl.t10,scoreCounts:scoreCounts() };
    if (save_) G.DB.commit('run');
  }

  const coopApi = {
    team: teamState,
    summary,
    // Invitado: el anfitrión manda el reloj y lo del equipo.
    syncTeam(t) {
      if (Math.abs(t.time - time) > 0.4) time = t.time;
      if (t.level > pl.level) G.Audio.sfx('xp');
      for (let level = pl.level; level < t.level; level++) G.Abilities.onLevel(pl);
      pl.level = t.level; pl.xp = t.xp; pl.xpNext = t.xpNext;
      pl.kills = t.kills; pl.bosses = t.bosses; pl.coins = t.coins;
      if(t.scoreCounts)scoreCounters=G.Difficulty.scoreCounts(t.scoreCounts);
      if (t.t1 > pl.t1 || t.t10 > pl.t10) G.Audio.sfx('shiny');
      pl.t1 = t.t1 || 0; pl.t10 = t.t10 || 0;
      bankTickets();
      checkChallenge();
    },
    victory(open){
      if(open&&state!=='victory'&&state!=='over'){checkChallenge();victoryChoice(true);}
      else if(!open&&state==='victory'&&!victoryBusy){G.UI.hide('scr-victory');state=holdBy.length||awayBy?'held':'playing';}
    },
    levelStart(level) {
      // (Si tenías abierta la elección de objeto, vuelve al terminar: afterLevelUp.)
      if (state === 'choice' && openItem && G.Coop.active) G.Coop.holdEnd();
      state = 'levelup';
      G.UI.hide('scr-pause');
      G.Audio.sfx('levelup');
      chooseLevelRewards(level, () => G.Coop.localPicked(), true);
    },
    waiting(names) { G.RunUI.setWaiting(names); },
    resume() {
      G.RunUI.closeLevelUp();
      if (state === 'levelup') { state = holdBy.length ? 'held' : 'playing'; afterLevelUp(); }
    },
    /** ¿Estás eligiendo algo que para la partida (objeto o vínculo)? */
    choosing() { return state === 'choice'; },
    inLevelUp() { return state === 'levelup'; },
    shiny(dex) { G.onShinyCaught({ dex, name: (G.DEX_BY[dex] || {}).name || '' }); },
    over(d) {
      if(d?.scoreCounts)scoreCounters=G.Difficulty.scoreCounts(d.scoreCounts);
      if (d) Object.assign(pl, { kills: d.ki, bosses: d.bo, coins: d.co, level: Math.max(pl.level, d.lv || 1), t1: d.t1 || pl.t1, t10: d.t10 || pl.t10 });
      if (d && d.t) time = d.t;
      if (d && d.why === 'host') G.UI.toast('El anfitrión ha terminado la partida', 3200);
      if(d?.victoryCashout){state='victory';checkChallenge();cashoutVictory(true);return;}
      endRun(!(d && d.why === 'host'));
    },
    lost(msg) { G.UI.toast(msg, 3600); endRun(false); },
    item(id) { offerItem(id); },
    mateLeft() {},
    /** Grupo: quién está eligiendo fusión. Mientras haya alguien, todo parado. */
    hold(names) {
      holdBy = names || [];
      const mine = G.UI.isOpen('scr-bond')||G.UI.isOpen('scr-item');
      if (holdBy.length) {
        if (state === 'playing') state = 'held';
        if (pl && pl.bonds > 0) offerBond(true);      // si tú también tienes vínculo, eliges a la vez
        const others = holdBy.filter(n => n !== (G.Social.me && G.Social.me.name) && n !== 'Tú');
        if (!mine && others.length) G.Spawner.say('Pausa: ' + others.join(', ') + ' ' + (others.length > 1 ? 'están eligiendo…' : 'está eligiendo…'), 999, true);
        else if (!others.length) G.Spawner.say(awayBy ? awayText() : '', awayBy ? 999 : 0, true);   // sólo tú: sin aviso viejo
      } else {
        if (state === 'held' && !awayBy) state = 'playing';
        G.Spawner.say(awayBy ? awayText() : '', awayBy ? 999 : 0, true);
      }
    },
    /** Grupo (invitado): el anfitrión se ha ido de la pestaña o no responde: todo parado. */
    away(name) {
      awayBy = name || null;
      if (awayBy) {
        if (state === 'playing') state = 'held';
        G.Spawner.say(awayText(), 999, true);
      } else if (!holdBy.length) {
        if (state === 'held') state = 'playing';
        G.Spawner.say('', 0, true);
      }
    }
  };
  let awayBy = null;
  const awayText = () => 'Pausa: esperando a ' + awayBy + ' (anfitrión)…';

  /** Has llevado a casa a un Pokémon perdido y se une a ti (events.js). */
  G.onRescue = (dex, name) => {
    if (!G.DB.save || !pl) return;
    const isNew = !G.DB.owns(dex);
    G.DB.grant(dex, 'rescue'); G.DB.commit(true);
    if (!isNew) pl.coins += 150;
    G.Spawner.say(isNew ? '¡' + name + ' se une a tu equipo!' : '¡' + name + ' te da las gracias! (+150 monedas, ya lo tenías)', 4);
    G.Audio.sfx('shinyGet');
  };

  /** Un shiny salvaje cae: te lo quedas (y la versión normal si no la tenías). */
  G.onShinyCaught = e => {
    if (!G.DB.save || !pl) return;
    if (G.Coop.isHost) G.Coop.shinyCaught(e);
    const result = G.DB.grantShiny(e.dex, 'wild');
    const isNew = result.shinyNew;
    G.DB.save.stats.shinies++;
    G.DB.commit(true);
    caught.push({ dex: e.dex, isNew, ivUp: result.ivUp, ivRaised: result.ivRaised });
    G.Spawner.say(isNew ? '¡Has conseguido a ' + e.name + ' shiny!' : '¡Otro ' + e.name + ' shiny! (+300 monedas)', 4);
    if (!isNew) pl.coins += 300;
    G.Audio.sfx('shinyGet');
  };

  function endRun(dead = true, victoryBonus=0) {
    if (state === 'over' || !pl) return;
    G.UI.hide('scr-victory');
    const coop = !!pl.uid;                    // sólo las partidas en grupo le ponen uid
    const wasHost = !!pl.coopHost;
    const team = coop ? G.Coop.members.slice() : [];
    if (G.Coop.active) G.Coop.end();
    if (coop) G.Social.setPlaying(false);
    state = 'over';
    G.Audio.music(null);
    G.Audio.sfx(dead ? 'gameover' : 'back');
    const save = G.DB.save;
    const confirmed = G.MonProgression ? G.MonProgression.commitCaptures(save, challenge || {}) : [];
    const {parts,score,base}=coinPayout();
    const ok = clean();
    // In solo, the clock stops on death. A late death cannot undo having
    // survived twenty minutes, even if the checkpoint was missed that frame.
    // In co-op, team time may continue while this player is already down.
    const completed=!!(G.Difficulty&&challenge&&time>G.Difficulty.WIN&&(challenge.survived||challenge.victory||!coop));
    if (G.Difficulty) G.Difficulty.record(save, challenge, time, completed||!pl.dead, ok);
    const progressExcluded=challenge&&!challenge.victory?(tampered?'debug':!challenge.eligible?'locked':!ok?'validation':null):null;
    const coins=base+victoryBonus;
    const record = score.total > (save.stats.bestScore || 0);
    save.stats.bestScore=Math.max(save.stats.bestScore||0,score.total);

    if(!victoryBonus)save.coins += base; // A cashout receipt already credits the full doubled payout.
    bankTickets(false);
    save.stats.runs++;
    save.stats.totalKills += pl.kills;
    save.stats.bestTime = Math.max(save.stats.bestTime, Math.floor(time));
    if (coop) save.stats.bestGroupTime = Math.max(save.stats.bestGroupTime || 0, Math.floor(time));
    save.stats.bestLevel = Math.max(save.stats.bestLevel, pl.level);
    if(!victoryBonus)save.stats.coinsEarned += base;
    const judge = G.Judgment.summary();
    if (judge) G.Progress.event('judgeEnd', judge);
    G.Judgment.reset();
    G.Progress.event('runEnd', { time, level: pl.level, coins: pl.coins, types: pl.mon.types, group: coop });
    G.Progress.checkAch();
    // A la nube al acabar la partida (como mucho cada 30 min); si la marca entra
    // en un top (hoy, semana o mes), enseguida (abajo, tras subirla al ranking).
    G.DB.commit('run');
    if (G.Social.me) G.Social.publishProfile();

    // Ranking: en solitario cada uno lo suyo; en grupo lo sube el anfitrión.
    const mark = { t: Math.floor(time), lv: pl.level, kills: pl.kills };
    // Si la partida se ha tocado (ver clean()), no sube al ranking (sin avisar); lo demás, sí.
    const ranked = ok && (!challenge || challenge.eligible) && !coop;
    if(G.DB.mode==='server')G.Server.finish(ok).catch(()=>{});
    const sent = ranked && !coop ? G.Ranking.submitSolo(Object.assign(mark, { dex: pl.dex, shiny: pl.shiny }))
               : ranked && wasHost ? G.Ranking.submitGroup(Object.assign(mark, { members: team })) : null;
    if (sent) sent.then(b => { if (b && b.some(p => p !== 'a')) G.DB.commit(true); }).catch(() => {});

    G.RunUI.showOver({
      dead, time, level: pl.level, kills: pl.kills, bosses: pl.bosses, coins, record, t1: pl.t1, t10: pl.t10, judge,
      moves: pl.moves, caught: caught.concat(confirmed.map(c => ({ ...c, captured: true }))), difficulty: challenge?.stars, victory: !!challenge?.victory, completed, progressExcluded, rankingExcluded: !ranked, score,
      breakdown: Object.entries(parts).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · ') +
                 (pl.coinMul > 1 ? ` · ×${pl.coinMul.toFixed(2)} Fortuna` : '')+
                 (victoryBonus>0?` · ×2 ${G.T('Bonificación de victoria')}`:'')
    }, () => { pl = null; G.Flow.afterRun(); });
  }

  /*
   * ¿Partida limpia? Sólo cosas que ningún jugador legal puede hacer, con
   * márgenes enormes (el sistema del 10-10 daba falsos positivos):
   *   - el reloj de la partida va más deprisa que el real (trucos de velocidad)
   *   - funciones de tu Pokémon sustituidas (así se hace uno invencible)
   *   - vida, ataque, velocidad o recarga muy por encima de lo posible
   *   - se han usado las funciones de pruebas (saltar el reloj...)
   * Si algo salta, esa partida no sube al ranking (sin avisar) y nada más.
   */
  let runReal = 0, tampered = false;
  function clean() {
    if (tampered) return false;
    if (time > (performance.now() - runReal) / 1000 + speedBonus + 10) return false;
    for (const k of ['hurt', 'update', 'heal', 'gainXp']) if (Object.prototype.hasOwnProperty.call(pl, k)) return false;
    if (!isFinite(pl.hp) || !isFinite(pl.maxHp) || pl.hp > pl.maxHp + 1 || pl.maxHp > 50000) return false;
    if (pl.atkMul > 2000 || pl.spdMul > 25 || pl.cdMul < 0.03 || pl.level > 20 + time / 3) return false;
    return true;
  }

  // ---------------- subida de nivel ----------------

  function chooseLevelCards(level, done, coop = false) {
    let remaining = G.Abilities.levelChoices(pl);
    function offer() {
      G.RunUI.showLevelUp(level, G.LevelUp.offer(pl), card => {
        G.Audio.sfx('confirm'); card.apply(pl);
        if (--remaining > 0) offer(); else done();
      }, coop);
    }
    offer();
  }
  function chooseLevelRewards(level,done,coop=false){
    function evolution(){
      const cards=G.LevelUp.evolutionOffer?.(pl) || [];
      if(!cards.length){done();return;}
      G.RunUI.showLevelUp(level,cards,card=>{G.Audio.sfx('confirm');card.apply(pl);evolution();},coop,true);
    }
    chooseLevelCards(level,evolution,coop);
  }

  function maybeLevelUp() {
    if (pendingLevels <= 0 || state !== 'playing') return;
    if (G.Coop.active) {
      // En grupo, las cartas salen a la vez para todos y se espera a que elijan.
      if (G.Coop.players().every(p => p.dead)) return;
      pendingLevels--;
      G.Coop.levelStart(pl.level);
      return;
    }
    // Nunca abras cartas con el Pokémon caído (morir y recoger XP en el mismo frame).
    if (pl.dead) return;
    pendingLevels--;
    state = 'levelup';
    G.Audio.sfx('levelup');
    chooseLevelRewards(pl.level, () => { state = 'playing'; });
  }

  // ---------------- vínculos ----------------

  /**
   * Vínculo de un legendario: eliges qué movimientos se fusionan.
   * Si ahora no se puede (no hay dos sueltos), se guarda hasta que aprendas
   * otro movimiento. Se mira en cada fotograma: si otra pantalla la tapa (cartas
   * de nivel en grupo, pausa), vuelve a salir al cerrarla.
   * @param quiet  no avisar si todavía no se puede
   */
  function offerBond(quiet = false) {
    if (!pl || pl.bonds <= 0 || pl.dead || (state !== 'playing' && state !== 'held') || G.Rift.inArena) return;
    if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup'].some(G.UI.isOpen)) return;
    const opt = pl.bondOptions();
    if (!opt) {
      if (!quiet) G.Spawner.say('Guardas el vínculo: aprende otro movimiento para usarlo', 3, true);
      return;
    }
    // Se para el juego; en grupo, para todos hasta que cada uno elige (G.Coop.holdStart).
    state = 'choice';
    if (G.Coop.active) G.Coop.holdStart();
    G.Audio.sfx('levelup');
    G.RunUI.showBond(opt, picked => {
      const group = pl.fuse(picked, opt.group);
      G.Audio.sfx('legend');
      G.FX.ring(pl.x, pl.y, 8, 130, '#ff8ad8', 0.8, 6);
      G.FX.burst(pl.x, pl.y - pl.bodyH * 0.5, '#ffb3e6', 40, 240);
      G.Spawner.say('¡Vínculo! ' + group.length + ' movimientos a la vez', 2.6, true);
      if (state === 'choice') state = holdBy.length ? 'held' : 'playing';
      if (G.Coop.active) G.Coop.holdEnd();
    });
  }

  // ---------------- recogida ----------------

  const PICK_SFX = { xp: 'xp', xpBig: 'xp', coin: 'coin', treasure:'legend', heal: 'heal', bomb: 'break', magnet: 'confirm', ticket: 'shiny', ticket10: 'legend', item: 'legend',bossChest:'legend' };

  /*
   * Cooperativo: la elección de objeto y las cartas de nivel no pueden taparse.
   * Si llega un objeto con las cartas abiertas, espera a que elijas carta; y si
   * las cartas llegan con la elección de objeto abierta, ésta vuelve a salir al
   * terminar. (Antes una cerraba la otra, nadie podía terminar de elegir y la
   * partida se quedaba parada para todos.)
   */
  let openItem=null;
  const laterItems=[];
  function afterLevelUp(){
    if(state!=='playing'&&state!=='held')return;
    if(openItem&&!G.UI.isOpen('scr-item')){state='choice';if(G.Coop.active)G.Coop.holdStart();G.RunUI.showSpecialChoice(openItem.options,openItem.take);return;}
    if(laterItems.length)offerSpecialChoice(laterItems.shift());
  }
  function offerItem(id){
    if(!pl||!G.Items.gain(pl,id))return;
    G.Progress.event('item',{id});
    G.UI.toast(G.T('Objeto especial obtenido')+' · '+G.T(G.Items.BY[id].name));
  }
  function offerSpecialChoice(options){
    if(!pl)return;
    options=(options||G.Items.rewardChoices()).filter(id=>G.Items.BY[id]);if(!options.length)return;
    if(pl.dead||!['playing','held'].includes(state)||G.Rift.inArena||openItem||G.ZMoves&&everyone().some(G.ZMoves.busy)) {laterItems.push(options);return;}
    state='choice';if(G.Coop.active)G.Coop.holdStart();
    const take=id=>{
      if(!openItem||!openItem.options.includes(id))return;
      openItem=null;offerItem(id);state=holdBy.length?'held':'playing';if(G.Coop.active)G.Coop.holdEnd();afterLevelUp();
    };
    openItem={options:options.slice(),take};G.RunUI.showSpecialChoice(options,take);
  }

  /** @param who  quien lo ha cogido (en cooperativo puede ser un compañero) */
  function onCollect(p, who = pl) {
    const mine = who === pl;
    if (G.Coop.active && !G.Coop.isHost) {
      // Copia de un objeto del anfitrión: el efecto lo decide él.
      if (mine) G.Audio.sfx(PICK_SFX[p.kind]);
      return;
    }
    if (G.Coop.active) G.Coop.collected(p, who);
    if (mine || p.kind === 'bomb') G.Audio.sfx(PICK_SFX[p.kind]);
    if(p.kind==='bossChest'){G.BossRewards.open(p);return;}
    if (p.kind === 'xp' || p.kind === 'xpBig') {
      pendingLevels += pl.gainXp(p.value * (G.Coop.active ? G.Coop.xpFactor() : 1));
      return;
    }
    if (p.kind === 'coin'||p.kind==='treasure') {
      pl.coins += p.value;
      G.FX.dmgText(who.x, who.y - who.bodyH - 6, '+' + p.value, '#ffd23f');
      return;
    }
    if (p.kind === 'item') {
      if (mine) offerItem(p.value);
      return;
    }
    if (p.kind === 'ticket' || p.kind === 'ticket10') {
      if (p.kind === 'ticket') pl.t1++; else pl.t10++;
      bankTickets();
      G.FX.dmgText(who.x, who.y - who.bodyH - 8, p.kind === 'ticket' ? '+1 ticket' : '¡Ticket ×10!', p.kind === 'ticket' ? '#ffd23f' : '#d9a6ff', true);
      G.FX.ring(who.x, who.y, 6, 50, p.kind === 'ticket' ? '#ffd23f' : '#c47bff', 0.4, 3);
      return;
    }
    if (p.kind === 'heal') {
      if (mine) pl.heal(pl.maxHp * 0.3);
      G.FX.ring(who.x, who.y, 6, 60, '#5fe08a', 0.4, 3);
      return;
    }
    if (p.kind === 'magnet') {
      G.Pickups.pullAll();
      G.FX.ring(who.x, who.y, 10, 420, '#ff9ed8', 0.6, 4);
      return;
    }
    if (p.kind === 'bomb') {
      if (G.U.dist2(who.x, who.y, pl.x, pl.y) < 500 * 500) G.Camera.kick(0.8);
      const R = G.Camera.outerRadius();
      G.FX.ring(who.x, who.y, 20, R, '#ff7b3d', 0.5, 6);
      for (const e of G.EnemyMgr.all()) {
        if (mine ? !G.Camera.sees(e.x, e.y, 0) : G.U.dist2(e.x, e.y, who.x, who.y) > R * R) continue;
        e.hurt(60 + pl.level * 14, '#ff7b3d', e.x - who.x, e.y - who.y, 160);
      }
    }
  }

  // ---------------- teclado ----------------

  function handleKeys() {
    if(state==='victory')return;
    if (G.SettingsUI.isOpen) { if (G.Input.tap('escape')) G.SettingsUI.close(); return; }
    // La Sentencia de Arceus: Espacio, Intro o Esc saltan la animación (si se puede).
    if (G.Judgment.cinematic && state === 'playing') {
      if (['space', 'enter', 'escape'].some(k => G.Input.tap(k))) G.Judgment.skip();
      return;
    }
    if (state === 'levelup') {
      for (let i = 0; i < Math.min(9,document.querySelectorAll('#cards .card').length); i++) {
        if (G.Input.tap('digit' + (i + 1)) || G.Input.tap('numpad' + (i + 1))) G.RunUI.pick(i);
      }
      if (G.Input.tap('keyr')) G.RunUI.reroll();
      return;
    }
    if (G.UI.isOpen('scr-bond')) {
      for (let i = 0; i < 4; i++) {
        if (G.Input.tap('digit' + (i + 1)) || G.Input.tap('numpad' + (i + 1))) G.RunUI.pickBond(i);
      }
      return;
    }
    if (G.UI.isOpen('scr-item')) {
      for (let i = 0; i < Math.min(9,document.querySelectorAll('#item-cards .card').length); i++) {
        if (G.Input.tap('digit' + (i + 1)) || G.Input.tap('numpad' + (i + 1))) document.querySelectorAll('#item-cards .card')[i].click();
      }
      return;
    }
    if (state === 'ui') {
      // Esc en una subpantalla del menú vuelve al menú.
      if (G.Input.tap('escape') && !G.UI.isOpen('scr-profile') && ['scr-dex', 'scr-upgrades', 'scr-gacha', 'scr-friends', 'scr-rank', 'scr-goals'].some(G.UI.isOpen)
          && document.getElementById('pull-fx').classList.contains('hidden')) G.MenuUI.open();
      return;
    }
    if (G.Input.tap('escape') || G.Input.tap('keyp')) { togglePause(); return; }
    if (state !== 'playing' || !pl) return;
    if (G.Input.tap('keyv') && !document.activeElement?.closest('input,textarea,select,[contenteditable]')) setSpeed(runSpeed === 1 ? 2 : 1);
    if ((G.Input.tap('keyz') || G.Input.tap('keyf')) && !document.activeElement?.closest('input, textarea, select, [contenteditable]')) {
      if (G.ZMoves && G.ZMoves.hasStone(pl)) G.ZMoves.arm(pl); else if (G.Input.tap('keyf') && G.Mega) G.Mega.activate(pl);
    }
    if((G.Input.tap('digit0')||G.Input.tap('numpad0'))&&!document.activeElement?.closest('input,textarea,select,[contenteditable]'))G.Items.useActive(pl);
    for (let i = 0; i < 4; i++) {
      if (G.Input.tap('digit' + (i + 1)) || G.Input.tap('numpad' + (i + 1))) G.MoveControl?G.MoveControl.input(pl,i):pl.setActive(i);
    }
    if (G.Input.tap('keyq')) G.MoveControl?G.MoveControl.input(pl,(pl.active+pl.slots.length-1)%pl.slots.length):pl.cycle(-1);
    if (G.Input.tap('keye') || G.Input.tap('tab')) G.MoveControl?G.MoveControl.input(pl,(pl.active+1)%pl.slots.length):pl.cycle(1);
  }

  // ---------------- bucle ----------------

  let deathT = 0;

  let frameDt = 0, speedK = 1, runSpeed = 1, speedBonus = 0;
  let fpsShown = 60, fpsAcc = 0, fpsN = 0;
  // El siguiente fotograma se pide ANTES de nada: si algo falla a mitad, el
  // juego sigue (antes se quedaba congelado para siempre y había que recargar;
  // así se perdió una partida enorme al abrirse una grieta).
  // Si falla fotograma tras fotograma (el juego ya no avanza ni se ve), la
  // partida se da por terminada a los ~3 s y se guarda: tiempo, derrotados,
  // récords y ranking. Mejor eso que una pantalla negra y perderlo todo.
  let loopErrs = 0, errRun = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    try { frame(ts); errRun = 0; }
    catch (e) {
      if (loopErrs++ < 5) console.error('[Game] fallo en un fotograma:', e);
      G.Input.endFrame();
      if (++errRun === 180 && pl && state !== 'ui' && state !== 'over') {
        try {
          G.UI.hideAll();
          quitRun();
          G.UI.toast('El juego ha fallado: tu partida se ha guardado hasta aquí', 5000);
        } catch (e2) { console.error('[Game] no se pudo cerrar la partida:', e2); }
      }
    }
  }

  function frame(ts) {
    const real = (ts - last) / 1000 || 0;
    let step = Math.min(1 / 30, real) * speedK;
    last = ts;
    if (state === 'playing') G.Settings.sample(real);
    fpsAcc += real; fpsN++;
    if (fpsAcc >= 0.5) { fpsShown = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    handleKeys();
    const networkDt = step * runSpeed;
    step *= G.ZMoves ? G.ZMoves.timeFactor() : 1;
    const dt = step * runSpeed;
    frameDt = state === 'playing' ? dt : 0;

    if (state === 'playing') {
      speedBonus += Math.max(0, real) * (runSpeed - 1);
      const steps = runSpeed;
      for (let i = 0; i < steps && state === 'playing'; i++) update(step);
    }
    else if (pl && state !== 'ui') { G.FX.update(dt * 0.25); pl.anim.update(dt * 0.25); }
    // La red se atiende siempre (también con las cartas de nivel abiertas).
    if (G.Coop.active && pl && state !== 'ui' && state !== 'over') G.Coop.tick(networkDt);

    if (pl && state !== 'ui') render(); else Backdrop.render(ctx, w, h, dpr, dt);
    G.UI.tick(dt);

    G.Input.endFrame();
  }

  function update(dt) {
    const coop = G.Coop.active;
    if (flashT > 0) flashT -= dt;
    // La Sentencia de Arceus: mientras dura la animación, todo lo demás se para.
    if (G.Judgment.cinematic) {
      G.Judgment.cineTick(dt);
      pl.anim.update(dt);
      if (coop) for (const p of G.Coop.puppets()) p.netUpdate(dt);
      G.World.update(dt, G.Camera);
      G.FX.update(dt);
      G.Audio.music(G.Judgment.music);
      return;
    }
    // Tras caer, deja que se vea la animación de Faint antes del resumen.
    // (En la arena de la grieta no: allí caer sólo te echa de vuelta.)
    if (pl.dead && !coop && !G.Rift.inArena) {
      deathT += dt;
      pl.update(dt);
      G.EnemyMgr.update(dt * 0.3, pl);
      G.FX.update(dt);
      G.Camera.follow(pl.x, pl.y, dt);
      if (deathT > 1.3) { deathT = 0; endRun(true); }
      return;
    }
    time += dt;

    const b = Math.floor(time / 240);
    if (b !== biome && !G.Rift.inArena && !G.Judgment.active) {
      biome = b;
      for (const p of everyone()) G.Abilities.resetStage(p, b);
      G.World.setBiome(b);
      G.Audio.sfx('biome');
      G.Spawner.say('— ' + G.World.biomeName() + ' —', 3);
      G.FX.ring(pl.x, pl.y, 10, G.Camera.outerRadius(), '#ffffff', 0.7, 6);
    }

    pl.frozen = coop && (G.UI.isOpen('scr-pause') || G.UI.isOpen('scr-item'));
    pl.update(dt);
    if (coop) {
      for (const p of G.Coop.puppets()) { p.netUpdate(dt); if (G.ZMoves) G.ZMoves.tick(p, dt); G.Combat.ghostOrbit(p, dt, time); }
      if (pl.dead) reviveTick(dt);
    }
    G.Camera.follow(pl.x, pl.y, dt);
    G.World.update(dt, G.Camera);

    const all = everyone();
    if (!coop || G.Coop.isHost) { G.Path.update(dt, all); G.Spawner.update(dt, all, time); }
    else G.Spawner.tickBanner(dt);
    G.EnemyMgr.update(dt, all);
    G.EnemyMgr.rebuildGrid();
    G.Combat.tick(dt, pl, time);
    G.Projectiles.update(dt, pl, G.EnemyMgr.all());
    G.Combat.resolve(dt, pl, time);
    G.Combat.updateFields(dt);
    G.Pickups.update(dt, all, onCollect);
    G.Hazards.update(dt);
    G.Interact.update(dt, pl);
    G.Rift.update(dt, pl, time);
    G.Judgment.update(dt, pl, time);
    G.Events.update(dt, all, time);
    G.Weather.update(dt, time, pl);
    checkChallenge();
    G.FX.update(dt);

    G.Audio.music(G.Judgment.active ? G.Judgment.music : G.Rift.inArena ? 'rift' : G.EnemyMgr.bossAlive() ? 'boss' : G.BIOME_MUSIC[biome % G.BIOME_MUSIC.length]);
    const zBusy = G.ZMoves && everyone().some(G.ZMoves.busy);
    if (!zBusy) {
      if(maybeVictoryChoice())return;
      if (!coop || G.Coop.isHost) maybeLevelUp();
      if (pl.bonds > 0) offerBond(true);
      if (state === 'playing' && laterItems.length) afterLevelUp();
    }
    if (G.Coop.isHost) checkAllDown(dt);
  }

  /** Caído en grupo: un compañero a tu lado te va levantando. */
  function reviveTick(dt) {
    const helper = G.Coop.puppets().some(p => !p.dead && G.U.dist2(p.x, p.y, pl.x, pl.y) < 56 * 56);
    pl.reviveT = helper ? (pl.reviveT || 0) + dt : Math.max(0, (pl.reviveT || 0) - dt * 0.5);
    if (pl.reviveT >= G.Player.REVIVE_TIME) pl.revive(0.5);
  }

  /** Anfitrión: si caéis todos, se acaba (tras ver caer al último). */
  function checkAllDown(dt) {
    if (G.Rift.inArena || !G.Coop.players().every(p => p.dead)) { deathT = 0; return; }
    deathT += dt;
    if (deathT > 1.6) {
      deathT = 0;
      G.Coop.over(summary());
      endRun(true);
    }
  }

  // ---------------- dibujo ----------------

  function drawScene(cam, extra) {
    const t = performance.now() / 1000;
    G.World.drawGround(ctx, cam);
    G.World.drawLiquid(ctx, cam, t);
    G.Hazards.draw(ctx);
    G.Combat.drawGroundFields(ctx);
    if (G.ZMoves) G.ZMoves.drawGround(ctx);
    G.Pickups.draw(ctx);

    // Todo lo que tiene "pies" se ordena por Y: objetos, enemigos, jugador.
    const items = [];
    // Los planos (manantiales, trampas) siempre debajo de todo lo demás.
    for (const p of G.World.visibleProps(cam)) items.push({ y: p.flat ? p.y - 4000 : p.y, prop: p });
    for (const e of G.EnemyMgr.drawables(cam)) items.push({ y: e.y, ent: e });
    for (const e of extra) items.push({ y: e.y, ent: e });
    const rift = G.Rift.drawable();
    if (rift) items.push({ y: rift.y, ent: rift });
    const arceus = pl && state !== 'ui' ? G.Judgment.drawable() : null;
    if (arceus) items.push({ y: arceus.y, ent: arceus });
    if (pl && state !== 'ui') for (const d of G.Events.drawables()) items.push({ y: d.y, ent: d });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.prop) G.World.drawProp(ctx, it.prop, t);
      else it.ent.draw(ctx);
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.scale(G.Camera.scale, G.Camera.scale);
    G.Camera.apply(ctx);
    drawScene(G.Camera, G.Coop.active ? [pl, ...G.Coop.puppets()] : [pl]);
    G.Projectiles.draw(ctx);
    G.Combat.drawAirFields(ctx);
    if (G.ZMoves) G.ZMoves.draw(ctx);
    G.FX.draw(ctx);
    G.Judgment.drawAir(ctx);
    ctx.restore();

    G.Weather.draw(ctx, w, h, frameDt);
    G.World.drawVignette(ctx, w, h);
    // Niebla: la viñeta se cierra un poco (sin tapar el centro).
    const fog = G.Weather.vignette;
    if (fog > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.62);
      g.addColorStop(0, 'rgba(200,205,220,0)');
      g.addColorStop(1, `rgba(200,205,220,${0.45 * fog})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (!G.Judgment.cinematic) G.HUD.draw(ctx, w, h, pl, st);
    G.Judgment.drawOverlay(ctx, w, h);
    G.Touch.draw(ctx);
    if (G.Settings.get('fps')) {
      ctx.save();
      ctx.font = '700 11px Pixelify, monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = fpsShown >= 50 ? '#5fe08a' : fpsShown >= 30 ? '#ffd23f' : '#ff5f6d';
      ctx.fillText(fpsShown + ' FPS', w - 10, h - 8);
      ctx.restore();
    }
    if (flashT > 0) {
      ctx.save();
      // "Menos destellos": el fogonazo de pantalla se queda en un tercio.
      ctx.globalAlpha = Math.min(1, flashT / flashDur * 1.4) * (G.Settings.get('calm') ? 0.3 : 1);
      ctx.fillStyle = flashCol;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // ---------------- fondo de los menús ----------------

  /**
   * El mundo de verdad, con Pokémon salvajes paseando y la cámara a la deriva.
   * Así el menú enseña desde el primer segundo cómo se ve el juego.
   */
  const Backdrop = (() => {
    let wanderers = [], t = 0, ready = false, biomeT = 0, bi = 0;
    const CAST = [1, 4, 7, 25, 133, 52, 39, 35, 16, 43, 60, 69, 74, 92, 129, 147, 113, 143, 54, 79];

    function init() {
      G.World.reset(4242);
      G.World.setBiome(0, true);
      G.Camera.x = 0; G.Camera.y = 0;
      wanderers = CAST.map(dex => spawn(dex, true));
      ready = true;
    }

    function spawn(dex, anywhere) {
      const a = new G.Sprites.Animator(dex, 1);
      const r = G.Sprites.bodyRadius(dex);
      let x = 0, y = 0;
      for (let i = 0; i < 20; i++) {
        x = G.Camera.x + G.U.rand(-1, 1) * (anywhere ? G.Camera.w * 0.6 : G.Camera.w * 0.7);
        y = G.Camera.y + G.U.rand(-1, 1) * (anywhere ? G.Camera.h * 0.6 : G.Camera.h * 0.7);
        if (G.World.isFree(x, y, r)) break;
      }
      return { dex, anim: a, x, y, r, vx: 0, vy: 0, t: 0, draw(ctx) {
        G.Sprites.drawShadow(ctx, this.dex, this.x, this.y);
        this.anim.draw(ctx, this.x, this.y);
      } };
    }

    function step(dt) {
      t += dt;
      G.World.update(dt, G.Camera);
      // Deriva lenta de la cámara.
      G.Camera.x += Math.cos(t * 0.05) * 14 * dt;
      G.Camera.y += Math.sin(t * 0.037) * 10 * dt;
      G.Camera.follow(G.Camera.x, G.Camera.y, dt);

      biomeT += dt;
      if (biomeT > 30) { biomeT = 0; bi = (bi + 1) % 3; G.World.setBiome(bi); }

      for (const wd of wanderers) {
        wd.t -= dt;
        if (wd.t <= 0) {
          // Pasea, se para o "ataca" al aire de vez en cuando.
          wd.t = G.U.rand(1, 3.5);
          const r = Math.random();
          if (r < 0.55) {
            const a = Math.random() * 6.2832, s = G.U.rand(25, 55);
            wd.vx = Math.cos(a) * s; wd.vy = Math.sin(a) * s;
          } else {
            wd.vx = wd.vy = 0;
            if (r > 0.85) wd.anim.play(G.U.pick(['Attack', 'Shoot', 'Charge']));
          }
        }
        wd.x += wd.vx * dt; wd.y += wd.vy * dt;
        G.World.collide(wd);
        const moving = Math.abs(wd.vx) + Math.abs(wd.vy) > 1;
        if (moving) wd.anim.dir = G.Sprites.dirFromAngle(Math.atan2(wd.vy, wd.vx));
        wd.anim.loop(moving ? 'Walk' : 'Idle');
        wd.anim.update(dt);
        // Si se queda fuera de cámara, reaparece dentro.
        if (!G.Camera.sees(wd.x, wd.y, 120)) Object.assign(wd, spawn(wd.dex, false));
      }
    }

    function render(ctx, w, h, dpr, dt) {
      if (!ready) return;
      step(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.scale(G.Camera.scale, G.Camera.scale);
      G.Camera.apply(ctx);
      drawScene(G.Camera, wanderers);
      ctx.restore();
      G.World.drawVignette(ctx, w, h);
    }

    /** Al volver de una run, recupera el mundo del menú. */
    function restore() {
      G.World.reset(4242);
      G.World.setBiome(bi, true);
      G.FX.clear(); G.Projectiles.clear(); G.Combat.clearFields(); G.EnemyMgr.clear(); G.Pickups.clear();
      wanderers = CAST.map(dex => spawn(dex, true));
    }

    return { init, render, restore };
  })();

  return {
    init, startRun, everyone, scoreKill,scoreEvent,scoreCounts,runScore, levelXp, flash, offerBond, offerSpecialChoice, setSpeed, runClean:clean, get challenge() { return challenge; }, get speed() { return runSpeed; },
    debugMark() { tampered = true; },
    /** Para pruebas: salta el reloj de la run. */
    debugTime(t) { tampered = true; time = t; },
    /** Para grabar vídeos: cámara lenta (0,5 = mitad de velocidad). */
    debugSpeed(k) { if (k > 1) tampered = true; speedK = k; },
    togglePause,
    /** Abandona la partida en curso (p. ej. al cerrar sesión desde Ajustes). */
    quit() { if (state !== 'ui' && state !== 'over') quitRun(); },
    /** Para grabar vídeos: abre las cartas de subir de nivel. */
    debugLevelUp() { tampered = true; pl.level++; pl.xpNext = G.Player.xpFor(pl.level); G.Abilities.onLevel(pl); pendingLevels++; },
    debugItem(id) { if (G.Dev && G.Dev.canUse() && pl && G.Items.BY[id]) { tampered = true; onCollect({id:-1,kind:'item',value:id},pl); } },
    toUI() { state = 'ui'; Backdrop.restore(); },
    get state() { return state; }, get player() { return pl; }, st
  };
})();

/* ============ Flow — transiciones entre pantallas ============ */
G.Flow = {
  boot() {
    G.UI.initChrome();
    G.LoginUI.init(); G.TestUI.init(); G.MenuUI.init(); G.GachaUI.init(); G.Dev.init();
    if (G.Offline) { G.Offline.init(); G.OfflineUI.init(); }
    G.SocialUI.init(); G.NurseryUI.init(); G.RankingUI.init(); G.ModUI.init(); G.GoalsUI.init(); G.ProfileUI.init(); G.SettingsUI.init(); G.SupportUI.init(); G.NewsUI.init(); G.Updater.init();
    // Tu nombre arriba a la derecha abre tu perfil.
    document.getElementById('user-pill').onclick = () => G.GoalsUI.open('profile');
    G.Audio.music('village');     // suena tras el primer clic (lo exige el navegador)
    G.Game.init();
    // La base de datos (nube o local) recupera la sesión anterior.
    G.DB.ready().then(restored => {
      document.getElementById('boot').classList.add('hidden');
      // En otra tarea: crear el sonido para comprobarlo cuesta ~60 ms y no debe bloquear la carga.
      setTimeout(() => this.tapToStart(() => { if (restored) this.afterLogin(); else this.toLogin(); }), 0);
    });
  },
  /**
   * "Pulsa para empezar": los navegadores no dejan que una web suene hasta
   * que se toca algo. Con esta pantalla la música empieza en cuanto entras.
   * (Si el navegador ya deja sonar, no sale.)
   */
  tapToStart(then) {
    G.Audio.unlock();
    if (G.Audio.canPlay()) { then(); return; }
    const el = document.getElementById('tap-start');
    el.classList.remove('hidden');
    const go = e => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      G.Audio.unlock();
      el.classList.add('hidden');
      el.removeEventListener('click', go); removeEventListener('keydown', go, true);
      then();
    };
    el.addEventListener('click', go);
    addEventListener('keydown', go, true);
  },
  toLogin() { G.Audio.music('village'); G.LoginUI.open(); },
  afterLogin() {
    if (G.Offline) G.Offline.start();
    G.Audio.music('village');
    if (!G.DB.save.partner) G.TestUI.start();
    else this.goMenu();
  },
  goMenu() {
    if (G.Game.state !== 'ui') G.Game.toUI();
    G.Audio.music('village');
    G.MenuUI.open();
    G.LoginUI.offerRecovery();
  },
  /** Al cerrar el resumen: a la sala si sigues en una, si no al menú. */
  afterRun() {
    if (G.Social.room) {
      if (G.Game.state !== 'ui') G.Game.toUI();
      G.Audio.music('village');
      if (G.Social.room.isHost) G.Social.setOpen(true);
      G.LobbyUI.open();
    } else this.goMenu();
  },
  play() { G.Game.startRun(); },
  /** Empieza la partida en grupo (el anfitrión la manda a todos). */
  startCoop(cfg) {
    if (G.Game.state !== 'ui' || !G.Social.room) return;
    G.LobbyUI.close();
    G.Game.startRun(cfg);
  }
};
