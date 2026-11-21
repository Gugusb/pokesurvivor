/* Same-origin, self-hosted accounts. No third-party identity provider. */
G.Server = (() => {
  let available = false,
    probeStatus = 0,
    coopEnabled = false,
    user = null,
    rev = 0,
    dirty = false,
    conflict = false,
    serial = Promise.resolve(),
    pushTimer = null,
    baseline = null;
  let run = null,
    runPromise = null,
    runGeneration = 0,
    beatTimer = null,
    lastError = 0;
  let pendingSave=null,retryTimer=null,retryDelay=2000,beating=null,displayRun=null;
  let packTimer=null,packSince=0,packDirty=false,localPacksSupported=false;
  const ident=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const reconcile=(c,b,n)=>G.SaveSync?G.SaveSync.rebase(c,b,n):G.DB.merge(c,n);
  const changed=(a,b)=>G.SaveSync?G.SaveSync.changed(a,b):JSON.stringify(a)!==JSON.stringify(b);
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const text = (es, en, zh) =>
    G.I18n?.lang === "zh" ? zh : G.I18n?.lang === "en" ? en : es;
  function translatedError(message) {
    const messages = {
      'Invalid score counters':['No se pudo confirmar la puntuación de esta aventura.','本局得分记录无法确认。'],
      'Account service unavailable. Retry the connection; your account has not changed.': ['No se puede conectar con las cuentas. Reintenta; tu cuenta no ha cambiado.', '暂时无法连接账号服务器，请重试连接；不会切换或新建本地账号。'],
      'Co-op invitations temporarily unavailable':['Las invitaciones cooperativas están desactivadas temporalmente.','邀请联机暂时关闭。'],
      'Accepted friend required':['Se requiere una amistad aceptada.','需要先成为已接受的好友。'],
      'Choose an owned Pokemon':['Elige un Pokémon de tu colección.','请选择已拥有的宝可梦。'],
      'Hatch not found':['Crianza no encontrada.','未找到这次孵蛋记录。'],
      'Hatch not ready':['La cría aún no está lista.','孵蛋尚未完成。'],
      'Claim the current hatch first':['Recoge primero la cría actual.','请先完成并收获当前孵蛋，过程中不能撤回。'],
      'Place a primary Pokemon first':['Coloca primero el progenitor principal.','请先放入主亲本。'],
      'Nursery primary changed':['El progenitor principal ha cambiado.','主亲本已变更，请重新进入孵蛋屋。'],
      'Nursery invitation required':['Necesitas una invitación para esta crianza.','需要本次主亲本的孵蛋邀请。'],
      'Nursery is occupied':['La guardería está ocupada.','这个孵蛋屋正在孵蛋或等待收获。'],
      'Already participating in a friend hatch':['Ya participas en la crianza de un amigo.','你正在参与另一位好友的孵蛋，请先收获。'],
      'Incompatible egg groups':['Los grupos huevo no son compatibles.','蛋组不适配，无法开始孵蛋。'],
      'Gift already sent today':['Ya has enviado un regalo hoy a este amigo.','今天已经向这位好友送过礼物。'],
      'Daily gift limit reached':['Has alcanzado los 10 regalos diarios.','今天已向 10 位好友赠礼，请明日再来。'],
      'Gift not found':['Regalo no encontrado.','未找到这份礼物。'],
      'Wallet limit reached':['Alcanza el límite del monedero; gasta primero.','货币达到上限，请先消耗后再领取。'],
      "Sign in required": ["Inicia sesión de nuevo.", "请重新登录。"],
      "Account suspended": ["Cuenta suspendida.", "账号已被封禁。"],
      "Password must contain 8–128 characters": [
        "La contraseña debe tener 8–128 caracteres.",
        "密码长度须为 8～128 位。",
      ],
      "Username must contain 3–16 letters, numbers or _": [
        "El nombre debe tener 3–16 letras, números o _.",
        "用户名须为 3～16 个字母、汉字、数字或下划线。",
      ],
      "Username unavailable": ["Nombre no disponible.", "此用户名不可用。"],
      "Invalid username or password": [
        "Usuario o contraseña incorrectos.",
        "用户名或密码错误。",
      ],
      "Invalid password": ["Contraseña incorrecta.", "密码错误。"],
      "Invalid recovery code or account": [
        "Código de recuperación o cuenta incorrectos.",
        "恢复码或账号错误。",
      ],
      "Recovery code already used": [
        "Código de recuperación ya utilizado.",
        "恢复码已使用，请使用最新恢复码。",
      ],
      "Save changed on another device. Reload before continuing.": [
        "El guardado se ha actualizado. Vuelve a intentar esta acción.",
        "进度已更新，请重试这次操作。本机进度已保留。",
      ],
      "Too many requests; try again later": [
        "Demasiados intentos. Espera un poco.",
        "操作过于频繁，请稍后重试。",
      ],
      "Run not unlocked": [
        "Partida no desbloqueada.",
        "尚未解锁该难度或宝可梦。",
      ],
      "Run connection expired": [
        "La conexión de la partida ha caducado.",
        "对局连接已过期，无法验证本局成绩。",
      ],
      "Invalid run clock": [
        "No se pudo verificar el reloj de la partida.",
        "对局计时校验失败。",
      ],
      "Player not found": ["Jugador no encontrado.", "未找到该玩家。"],
      "Request already exists": [
        "La solicitud ya existe.",
        "好友关系或申请已存在。",
      ],
      "Room unavailable": ["Sala no disponible.", "房间已关闭或已经开始。"],
      "Room full": ["Sala llena.", "房间已满。"],
      "Cannot invite": [
        "No se puede invitar ahora.",
        "当前无法邀请：请确认好友关系、房主身份及空位。",
      ],
      "Friend invitation required": [
        "Necesitas una invitación de un amigo.",
        "需要有效的好友邀请才能加入。",
      ],
      "Choose an owned partner first": [
        "Elige primero un compañero de tu colección.",
        "请先选择已拥有的伙伴。",
      ],
      "Administrator required": [
        "Se requiere administrador.",
        "需要管理员权限。",
      ],
      "Player disconnected": [
        "Un jugador está desconectado.",
        "有玩家尚未连接。",
      ],
      "P2P connection not ready": [
        "Espera a la conexión directa de todos los jugadores.",
        "请等待所有玩家完成 P2P 直连；本版不提供战斗中转。",
      ],
    };
    const m = messages[message];
    return m ? text(m[0], message, m[1]) : message;
  }
  function scheduleRetry(){
    if(!user||retryTimer)return;
    retryTimer=setTimeout(()=>{retryTimer=null;flush().then(()=>retryRuns()).catch(error);},retryDelay);
    retryDelay=Math.min(60000,retryDelay*2);
  }
  function error(e) {
    conflict=false;remember();G.DB.serverSync('pending');scheduleRetry();
    const at=Date.now();
    if(!lastError){lastError=at;const message=e.status===401?text('Tu progreso está guardado aquí. Inicia sesión para sincronizar.','Your progress is saved here. Sign in to sync.','进度已保存在本机，重新登录后可继续同步。'):e.status&&e.status<500?text('Progreso conservado aquí. Acción pendiente: ','Progress kept here. Action pending: ','进度已在本机保留，此次操作尚未同步：')+e.message:text('Progreso guardado aquí; se sincronizará al volver la conexión.','Progress saved here; it will sync when the connection returns.','进度已保存在本机，网络恢复后会自动同步。');G.UI?.toast(message,4500);}
  }
  async function api(route, data, timeout=15000) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), timeout);
    try {
      const r = await fetch("/api" + route, {
        method: data === undefined ? "GET" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers:
          data === undefined
            ? {}
            : { "Content-Type": "application/json", "X-PS-Client": "1" },
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: controller.signal,
      });
      let value;
      try { value = await r.json(); }
      catch {
        throw Object.assign(new Error(translatedError('Account service unavailable. Retry the connection; your account has not changed.')), { status: r.ok ? 503 : r.status });
      }
      if (!r.ok)
        throw Object.assign(
          new Error(translatedError(value.error || "Request failed")),
          { status: r.status, code:value.error },
        );
      return value;
    } catch (e) {
      if (!e.status || e.status >= 500) { available = false; coopEnabled = false; }
      if (!e.status) throw Object.assign(new Error(translatedError('Account service unavailable. Retry the connection; your account has not changed.')), { status: 503 });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  function enqueue(fn) {
    const job = serial.then(fn);
    serial = job.catch(() => {});
    return job;
  }
  function remember() {
    if (!user || !G.DB.save) return;
    try {
      localStorage.setItem(
        "ps.selfhost." + user.uid,
        JSON.stringify({rev,dirty,save:G.DB.save,baseline,pending:pendingSave,packDirty}),
      );
    } catch {}
  }
  function accept(value, full = false, sent = null) {
    const prior=baseline&&copy(baseline);
    if (value.rev) rev = value.rev;
    if (value.progress && !value.save && G.DB.save) {
      const remote = copy(baseline || G.DB.save),
        p = value.progress;
      if (p.offline) remote.offline = p.offline;
      if(p.packTokens){remote.cardPack=copy(baseline?.cardPack||G.DB.save.cardPack);remote.cardPack.tokens=copy(p.packTokens);}
      if (p.difficulty) remote.difficulty = p.difficulty;
      if (p.failureProtection) remote.failureProtection = p.failureProtection;
      if (p.records) Object.assign(remote.difficultyRecords, p.records);
      value = { ...value, save: remote };
    }
    if (!value.save || !G.DB.save) return;
    baseline = copy(value.save);
    if(full)G.DB.serverApply(reconcile(value.save,sent||prior||value.save,G.DB.save));
    else {
      const s = G.DB.save,
        remote = value.save;
      G.DB.serverApply({
        ...copy(s),
        difficultyRecords: remote.difficultyRecords,
        difficulty: { ...remote.difficulty, selected: s.difficulty.selected },
        offline: remote.offline,
        failureProtection: remote.failureProtection||{},
        leagueRank:remote.leagueRank||{v:1,results:{}},
        ...(remote.cardPack&&G.CardPacks?.reconcile?{cardPack:G.CardPacks.reconcile(remote.cardPack,prior?.cardPack,s.cardPack)}:{}),
      });
    }
    if(value.runId&&value.runId===displayRun&&value.runLoot)G.Game?.recordServerLoot?.(value.runLoot,value.hatchAcceleration);
    if(value.leagueResult)G.LeagueRankUI?.updateResult(value.leagueResult);
    G.LeagueRankUI?.refreshBadges();
    remember();
    G.UI?.refreshCoins?.();
  }
  function open(value) {
    user = value.user;
    rev = value.rev;
    baseline = copy(value.save);
    dirty = false;
    conflict = false;
    G.DB.serverOpen(value);
    let cached = null;
    try {
      cached = JSON.parse(
        localStorage.getItem("ps.selfhost." + user.uid) || "null",
      );
    } catch {}
    pendingSave=cached?.pending||null;
    packDirty=!!cached?.packDirty||!!pendingSave?.localPacks;
    if(cached?.dirty||pendingSave){
      if(pendingSave){baseline=copy(cached.baseline||pendingSave.base);G.DB.serverApply(cached.save);}
      else G.DB.serverApply(cached.baseline?reconcile(value.save,cached.baseline,cached.save):G.DB.merge(value.save,cached.save));
      dirty=true;commit(true);
    }
    if(dirty||pendingSave||receipts().length)flush().then(()=>retryRuns()).catch(error);
    return true;
  }
  async function probe() {
    try {
      const h = await api("/health");
      coopEnabled=h.coopEnabled===true;
      localPacksSupported=h.localPacks===true;
      available = h?.ok === true && h.protocol === 2 && h.transport === "p2p";
      probeStatus = available ? 200 : 503;
      return available;
    } catch (e) {
      available = false;
      coopEnabled = false;
      probeStatus = e.status || 503;
      return false;
    }
  }
  async function restore() {
    try {
      return open(await api("/session"));
    } catch (e) {
      if (e.status !== 401) error(e);
      return false;
    }
  }
  async function authenticate(kind, name, pass) {
    try {
      if (!available && !await probe())
        return { ok: false, error: translatedError('Account service unavailable. Retry the connection; your account has not changed.') };
      const r = await api("/" + kind, { name, pass });
      open(r);
      return { ok: true, isNew: !G.DB.save.partner, recovery: r.recovery };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  function commit(urgent) {
    dirty = true;
    remember();
    G.DB.serverSync("pending");
    if (user) {
      if(run&&pushTimer)return true;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {pushTimer=null;flush().catch(error);}, run ? 60000 : urgent ? 600 : 5000);
    }
    return true;
  }
  async function upload() {
      if(!user||G.DB.guest||!dirty&&!pendingSave)return;
      const target=user.uid;
      clearTimeout(packTimer);packTimer=null;packSince=0;
      pendingSave ||= {operation:ident(),localPacks:packDirty,base:copy(baseline||G.DB.save),save:copy(G.DB.save)};
      const sent=pendingSave;remember();G.DB.serverSync('syncing');
      try{
        if(sent.localPacks&&!localPacksSupported){const h=await api('/health');localPacksSupported=h.localPacks===true;if(!localPacksSupported)throw Object.assign(new Error(text('Paquete guardado aquí; se sincronizará más tarde.','Pack progress is saved here and will sync later.','卡包进度已保存在本机，稍后自动同步。')),{status:503});}
        const r=await api('/save',{rev,...sent});if(user?.uid!==target)return;
        accept(r,true,sent.save);pendingSave=null;packDirty=packDirty&&JSON.stringify(G.DB.save.cardPack)!==JSON.stringify(baseline.cardPack);dirty=changed(G.DB.save,baseline);conflict=false;retryDelay=2000;lastError=0;remember();
        G.DB.serverSync(dirty?'pending':'ok');if(dirty)commit();
      }catch(e){dirty=true;remember();error(e);throw e;}
  }
  function flush(){return enqueue(upload);}
  function packLocal(data){
    const result=G.CardPacks.apply(G.DB.save,data);G.DB.save.updated=Date.now();dirty=true;packDirty=true;remember();G.DB.serverSync('pending');
    const at=Date.now();if(!packSince)packSince=at;clearTimeout(packTimer);
    packTimer=setTimeout(()=>{packTimer=null;flush().catch(error);},Math.max(0,Math.min(5000,30000-(at-packSince))));
    return result;
  }
  async function settleOffline() {
    return enqueue(async () => {
      if(dirty||pendingSave)await upload();
      const before = baseline && copy(baseline),
        r = await api("/offline", {}),
        s = G.DB.save;
      if (before) {
        s.coins += r.save.coins - before.coins;
        s.abilityGems += r.save.abilityGems - before.abilityGems;
        for (const k of ["t1", "t10"])
          s.tickets[k] += r.save.tickets[k] - before.tickets[k];
        accept(r);
        dirty = true;
        remember();
      } else accept(r, true);
      return r.report;
    });
  }
  async function socialAction(route,data={},reward=false) {
    await flush();
    return enqueue(async()=>{
      // Flush any edits made while waiting for another queued request.
      if(dirty||pendingSave)await upload();
      const {before,r}=reward?await sharedAction(route,data):{before:copy(baseline),r:await api(route,data)};
      if(reward&&r.save){
        const s=G.DB.save,remote=r.save;
        for(const k of ['coins','abilityGems'])s[k]+=remote[k]-before[k];
        for(const k of ['t1','t10'])s.tickets[k]+=remote.tickets[k]-before.tickets[k];
        for(const [d,entry]of Object.entries(remote.owned)){
          if(!s.owned[d])s.owned[d]=copy(entry);
          else if(entry.iv){const old=G.MonProgression.normalizeIV(s.owned[d].iv),iv=G.MonProgression.normalizeIV(entry.iv);s.owned[d].iv=iv.map((v,i)=>Math.max(v,old[i]));}
        }
        s.megaStones={...remote.megaStones,...s.megaStones};
        s.shiny={...remote.shiny,...s.shiny};
        Object.assign(s,G.ZAccess.merge(s,remote));
        accept(r);commit(true);
      }
      return r;
    });
  }
  async function packAction(data){
    await flush();return enqueue(async()=>{
      if(dirty||pendingSave)await upload();
      const {before,r}=await sharedAction('/packs/action',data),s=G.DB.save;
      s.coins+=r.save.coins-before.coins;s.abilityGems+=r.save.abilityGems-before.abilityGems;
      for(const k of ['t1','t10'])s.tickets[k]+=r.save.tickets[k]-before.tickets[k];
      s.cardPack=copy(r.save.cardPack);Object.assign(s,G.ZAccess.merge(s,r.save));s.pupg={};s.upgrades={};accept(r);remember();return r;
    });
  }
  async function sharedAction(route,data){
    for(let attempt=0;attempt<3;attempt++){
      const before=copy(baseline);
      try{return {before,r:await api(route,{...data,rev})};}
      catch(e){if(attempt===2||e.status!==409||e.code!=='Save changed on another device. Reload before continuing.')throw e;
        accept(await api('/session'),true);dirty=changed(G.DB.save,baseline);if(dirty||pendingSave)await upload();}
    }
  }

  function snapshot(clean = true) {
    const p = G.Game?.player;
    return {
      id: run?.id,
      t: G.Game?.st?.time || 0,
      alive: !!p && !p.dead,
      failed: !!p?.dead,
      clean: clean && !!G.Game?.runClean?.(),
      speed: G.Game?.speed || 1,
      lv: p?.level || 1,
      kills: p?.kills || 0,
      scoreCounts:G.Game?.scoreCounts?.(),
      expedition:G.Expedition?.summary?.(),
    };
  }
  function receipts(){
    if(!user)return [];
    try{const key='ps.pending-runs.'+user.uid,all=JSON.parse(localStorage.getItem(key)||'[]'),old=JSON.parse(localStorage.getItem('ps.pending-run.'+user.uid)||'null');if(old){if(!all.some(x=>x.id===old.id))all.push(old);localStorage.setItem(key,JSON.stringify(all));localStorage.removeItem('ps.pending-run.'+user.uid);}return all;}catch{return [];}
  }
  function storeReceipt(b){const all=receipts(),i=all.findIndex(x=>x.id===b.id);if(i<0)all.push(b);else all[i]=b;localStorage.setItem('ps.pending-runs.'+user.uid,JSON.stringify(all));}
  function removeReceipt(id){localStorage.setItem('ps.pending-runs.'+user.uid,JSON.stringify(receipts().filter(x=>x.id!==id)));}
  async function ensureStarted(target){if(!target.started){await api('/run/start',target.start||target,5000);target.started=true;}return target;}
  async function prepareRun(mode,dex,stars,controlsSpeed=true){
    clearInterval(beatTimer);++runGeneration;
    const start={id:ident(),clientStarted:Date.now(),dex,stars,mode,clean:!G.Dev?.enabled,speed:controlsSpeed&&G.CardPacks?.speedAllowed(G.DB.save,G.Settings.get('runSpeed'))?G.Settings.get('runSpeed'):1};
    const current={id:start.id,start,started:false};run=current;displayRun=current.id;runPromise=Promise.resolve(current);
    if(mode==='g'){await flush();await ensureStarted(current);}
    else flush().then(()=>retryRuns().catch(error)).then(()=>enqueue(()=>ensureStarted(current))).catch(error);
    return current;
  }
  function startRun(){if(!G.DB.online||G.DB.mode!=='server'||!run)return;clearInterval(beatTimer);beatTimer=setInterval(()=>heartbeat().catch(error),60000);}
  async function heartbeat(){
    if(!run)return;if(beating)return beating;const target=run;
    beating=enqueue(async()=>{if(run!==target)return;if(dirty||pendingSave)await upload();await ensureStarted(target);const r=await api('/run/beat',{...snapshot(),id:target.id,rev});accept(r,!!r.save);lastError=0;return r;});
    try{return await beating;}finally{beating=null;}
  }
  function recordDps(id,report){const target=run?.id===id?run:null;return enqueue(async()=>{if(target)await ensureStarted(target);return api('/run/dps',{id,report});});}
  function presence(){if(!G.DB.online||G.DB.mode!=='server'||run)return Promise.resolve();return enqueue(async()=>{if(dirty||pendingSave)await upload();const r=await api('/presence',{rev});accept(r,!!r.save);}).catch(error);}
  async function claimBonus(challenge, coins) {
    await runPromise;
    if (!run)
      throw new Error(
        text(
          "Sin partida verificada.",
          "No verified run.",
          "尚未建立有效对局记录。",
        ),
      );
    await flush();
    const b = { ...snapshot(), coins };
    return enqueue(async () => {
      if(dirty||pendingSave)await upload();
      await ensureStarted(run);
      const r = await api("/run/bonus", b);
      accept(r, true);
      dirty = false;
      remember();
      return r.extra;
    });
  }
  function finish(clean,failed){
    clearInterval(beatTimer);clearTimeout(pushTimer);pushTimer=null;const target=run;if(!target)return Promise.resolve();
    const b={...snapshot(clean),start:target.start};if(typeof failed==='boolean')b.failed=failed;
    storeReceipt(b);run=null;runPromise=null;remember();
    return enqueue(async()=>{try{if(dirty||pendingSave)await upload();await ensureStarted(target);const r=await api('/run/end',b);accept(r,!!r.save);removeReceipt(b.id);dirty=changed(G.DB.save,baseline);remember();G.DB.serverSync(dirty?'pending':'ok');if(dirty)commit(true);return r;}catch(e){error(e);throw e;}});
  }
  async function retryRuns(){
    if(!user)return;
    return enqueue(async()=>{if(dirty||pendingSave)await upload();let failure;for(const b of receipts()){
      try{if(b.start)await ensureStarted({start:b.start,started:false});const r=await api('/run/end',b);accept(r,!!r.save);removeReceipt(b.id);}catch(e){error(e);failure=e;}
    }if(failure)throw failure;});
  }
  async function logout() {
    clearTimeout(packTimer);packTimer=null;packSince=0;
    clearTimeout(pushTimer);clearTimeout(retryTimer);retryTimer=null;
    clearInterval(beatTimer);
    runGeneration++;
    try {
      await flush();
    } catch {}
    await api("/logout", {}).catch(() => {});
    user = null;
    run = null;
    dirty = false;pendingSave=null;baseline=null;packDirty=false;
    G.SelfNet?.disconnect();
  }
  async function deleteAccount(pass) {
    try {
      await api("/account/delete", { pass });
      for (const fn of leaveHooks) await fn("delete");
      if (user) localStorage.removeItem("ps.selfhost." + user.uid);
      user = null;
      run = null;
      clearInterval(beatTimer);
      G.SelfNet?.disconnect();
      G.DB.serverClear();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  const leaveHooks = [];
  addEventListener("online", () => {
    if(user)flush().then(()=>retryRuns()).then(()=>heartbeat()).catch(error);
  });
  document.addEventListener("visibilitychange", () => {
    if(user){remember();if(document.hidden)flush().catch(error);else flush().then(()=>retryRuns()).catch(error);}
  });
  return {
    api,
    text,
    probe,
    restore,
    authenticate,
    commit,
    flush,packAction,packLocal,
    settleOffline,
    socialAction,
    claimBonus,
    checkpointRun:()=>run?{id:run.id,start:{...run.start}}:null,pauseCheckpoint:()=>clearInterval(beatTimer),
    async restoreCheckpoint(saved){if(!user||!saved?.start||saved.start.mode!=='q'||typeof saved.id!=='string'||!/^[\w-]{8,100}$/.test(saved.id)||saved.id!==saved.start.id)throw Error('Invalid saved run');clearInterval(beatTimer);++runGeneration;run={id:saved.id,start:{...saved.start},started:false};displayRun=run.id;runPromise=Promise.resolve(run);await enqueue(()=>ensureStarted(run));await heartbeat();startRun();},
    prepareRun,
    startRun,
    heartbeat,
    recordDps,
    get runId(){return run?.id||null;},
    presence,
    finish,
    retryRuns,
    logout,
    deleteAccount,
    accept,
    onDelete(fn) {
      leaveHooks.push(fn);
    },
    get user() {
      return user;
    },
    get available() {
      return available;
    },
    get probeStatus() { return probeStatus; },
    get coopEnabled(){return coopEnabled;},
    get conflict() {
      return conflict;
    },
  };
})();

/* P2P transport is defined in p2p.js before this module. */
G.Social = (() => {
  let started = false,
    extras = {gifts:{sent:[],inbox:[]},nurseryInvites:[],nurseryReady:false},
    friends = [],
    invites = [],
    room = null,
    poll = null;
  const listeners = new Set();
  const emit = (what) => {
    for (const fn of listeners) fn(what);
  };
  function apply(r) {
    for(const k of ['gifts','nurseryInvites','nurseryReady'])if(k in r)extras[k]=r[k];
    G.NurseryUI?.notify(extras);
    if (r.friends) friends = r.friends;
    if (r.invites) invites = r.invites;
    if ("room" in r) {
      room = r.room;
      G.SelfNet.setRoom(room);
    }
    emit(r.closed ? "room-closed" : "room");
  }
  G.SelfNet.on((r) => {
    if (r.k === "social" || r.k === "room") apply(r);
  });
  async function refresh() {
    if (!G.DB.online) return;
    try {
      apply(await G.Server.api("/social"));
    } catch (e) {
      console.warn("[Social]", e.message);
    }
  }
  async function start() {
    if (!G.DB.online) return "off";
    if (!started) {
      started = true;
      G.SelfNet.connect();
      await refresh();
      poll = setInterval(refresh, 30000);
    }
    return "ok";
  }
  async function stop() {
    clearInterval(poll);
    started = false;
    room = null;
    friends = [];
    invites = [];
    extras={gifts:{sent:[],inbox:[]},nurseryInvites:[],nurseryReady:false};
    G.SelfNet.disconnect();
    emit("stop");
  }
  G.DB.onLeave(stop);
  G.Server.onDelete(stop);
  async function action(route, b) {
    try {
      const r = await G.Server.api(route, b);
      if ("room" in r) apply(r);
      await refresh();
      return {
        ok: true,
        msg: G.Server.text("Hecho", "Done", "操作成功"),
        ...r,
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  return {
    start,
    stop,
    on(fn) {
      listeners.add(fn);
    },
    off(fn) {
      listeners.delete(fn);
    },
    get me() {
      return G.Server.user;
    },
    get uid() {
      return G.Server.user?.uid;
    },
    get started() {
      return started;
    },
    get friends() {
      return friends;
    },
    get extras(){return extras;},
    get invites() {
      return invites;
    },
    get room() {
      return room;
    },
    MAX_PLAYERS: 4,
    VALID: /^[\p{L}\p{N}_]{3,16}$/u,
    now: Date.now,
    claimNick: async () => ({ ok: true }),
    request: (name) => action("/friends/request", { name }),
    accept: (uid) => action("/friends/accept", { uid }),
    remove: (uid) => action("/friends/remove", { uid }),
    async createRoom() {
      const r = await action("/room/create", {});
      if (!r.ok) throw new Error(r.error);
      return room;
    },
    joinRoom: (id) => action("/room/join", { id }),
    leaveRoom: () => action("/room/leave", {}),
    setOpen(open) {
      if (open && room?.isHost)
        G.Server.flush()
          .then(() => action("/room/open", {}))
          .catch(() => {});
    },
    setPlaying() {
      refresh();
    },
    refreshPresence: refresh,
    refreshMember() {
      G.Server.flush()
        .then(() => action("/room/member", {}))
        .catch(() => {});
    },
    async invite(uid) {
      if (!room) await this.createRoom();
      return action("/room/invite", { uid });
    },
    acceptInvite: (uid) => {
      const i = invites.find((i) => i.from === uid);
      return i
        ? action("/room/join", { id: i.room })
        : Promise.resolve({ ok: false, error: "Invite expired" });
    },
    declineInvite: (uid) => action("/room/decline", { uid }),
    publishProfile() {
      G.DB.commit();
    },
    getProfile: (uid) =>
      G.Server.api("/profile?uid=" + encodeURIComponent(uid)),
    profileData() {
      const s = G.DB.save;
      return {
        cardTheme:G.CardPacks?.normalize(s).theme,
        name: G.DB.user,
        favs: s.profile?.favs || [],
        title: s.profile?.title || "",
        best: {
          solo: s.stats.bestTime || 0,
          group: s.stats.bestGroupTime || 0,
          level: s.stats.bestLevel || 1,
          kills: s.stats.totalKills || 0,
          medals: G.Difficulty.completedCount(s),
        },
        medals: [],
      };
    },
  };
})();
