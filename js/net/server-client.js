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
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const text = (es, en, zh) =>
    G.I18n?.lang === "zh" ? zh : G.I18n?.lang === "en" ? en : es;
  function translatedError(message) {
    const messages = {
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
        "El guardado cambió en otro dispositivo. Recarga antes de continuar.",
        "存档已被另一设备更新，请重新载入后继续。本机副本已保留。",
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
  function error(e) {
    if (
      e.status === 409 &&
      /Save changed|存档已被|guardado cambió/.test(e.message)
    )
      conflict = true;
    G.DB.serverSync(e.status === 409 ? "pending" : "offline");
    if (Date.now() - lastError > 8000) {
      lastError = Date.now();
      G.UI?.toast(
        text("No se pudo sincronizar: ", "Sync failed: ", "同步失败：") +
          e.message,
        6000,
      );
    }
  }
  async function api(route, data) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
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
          { status: r.status },
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
        JSON.stringify({ rev, dirty, save: G.DB.save }),
      );
    } catch {}
  }
  function accept(value, full = false) {
    if (value.rev) rev = value.rev;
    if (value.progress && G.DB.save) {
      const remote = copy(baseline || G.DB.save),
        p = value.progress;
      if (p.offline) remote.offline = p.offline;
      if (p.difficulty) remote.difficulty = p.difficulty;
      if (p.records) Object.assign(remote.difficultyRecords, p.records);
      value = { ...value, save: remote };
    }
    if (!value.save || !G.DB.save) return;
    baseline = copy(value.save);
    if (full) G.DB.serverApply(value.save);
    else {
      const s = G.DB.save,
        remote = value.save;
      G.DB.serverApply({
        ...copy(s),
        difficultyRecords: remote.difficultyRecords,
        difficulty: { ...remote.difficulty, selected: s.difficulty.selected },
        offline: remote.offline,
      });
    }
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
    if (cached?.dirty && cached.rev === rev) {
      G.DB.serverApply(cached.save);
      accept(value);
      dirty = true;
      commit();
    } else if (cached?.dirty && cached.rev !== rev)
      G.UI?.toast(
        text(
          "Copia pendiente conservada; se cargó el servidor.",
          "Pending local copy retained; server save loaded.",
          "已加载服务器存档；未同步的本机副本已保留。",
        ),
        6000,
      );
    return true;
  }
  async function probe() {
    try {
      const h = await api("/health");
      coopEnabled=h.coopEnabled===true;
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
    if (!conflict) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => flush().catch(error), urgent ? 600 : 5000);
    }
    return true;
  }
  function flush() {
    return enqueue(async () => {
      if (!user || G.DB.guest || !dirty) return;
      if (conflict)
        throw Object.assign(
          new Error(
            text(
              "Recarga para resolver el conflicto.",
              "Reload to resolve the save conflict.",
              "请重新载入以解决多设备存档冲突。",
            ),
          ),
          { status: 409 },
        );
      const target = user.uid,
        snapshot = copy(G.DB.save);
      G.DB.serverSync("syncing");
      try {
        const r = await api("/save", { rev, save: snapshot });
        if (user?.uid !== target) return;
        dirty = JSON.stringify(G.DB.save) !== JSON.stringify(snapshot);
        accept(r);
        G.DB.serverSync(dirty ? "pending" : "ok");
        if (dirty) commit();
      } catch (e) {
        if (e.status === 409) conflict = true;
        remember();
        error(e);
        throw e;
      }
    });
  }
  async function settleOffline() {
    return enqueue(async () => {
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
      if(dirty){
        const snapshot=copy(G.DB.save),r=await api('/save',{rev,save:snapshot});
        dirty=JSON.stringify(G.DB.save)!==JSON.stringify(snapshot);accept(r);
      }
      const before=copy(baseline),r=await api(route,{...data,...(reward?{rev}:{})});
      if(reward&&r.save){
        const s=G.DB.save,remote=r.save;
        for(const k of ['coins','abilityGems'])s[k]+=remote[k]-before[k];
        for(const k of ['t1','t10'])s.tickets[k]+=remote.tickets[k]-before.tickets[k];
        for(const [d,entry]of Object.entries(remote.owned)){
          if(!s.owned[d])s.owned[d]=copy(entry);
          else if(entry.iv)s.owned[d].iv=entry.iv.map((v,i)=>Math.max(v,s.owned[d].iv?.[i]||1));
        }
        s.megaStones={...remote.megaStones,...s.megaStones};
        Object.assign(s,G.ZAccess.merge(s,remote));
        accept(r);commit(true);
      }
      return r;
    });
  }
  function snapshot(clean = true) {
    const p = G.Game?.player;
    return {
      id: run?.id,
      t: G.Game?.st?.time || 0,
      alive: !!p && !p.dead,
      clean: clean && !!G.Game?.runClean?.(),
      speed: G.Game?.speed || 1,
      lv: p?.level || 1,
      kills: p?.kills || 0,
    };
  }
  async function prepareRun(mode, dex, stars) {
    await flush();
    const r = await api("/run/start", {
      dex,
      stars,
      mode,
      clean: !G.Dev?.enabled,
    });
    clearInterval(beatTimer);
    ++runGeneration;
    run = r;
    runPromise = Promise.resolve(r);
    return r;
  }
  function startRun(mode) {
    if (!G.DB.online || G.DB.mode !== "server") return;
    if (run) {
      clearInterval(beatTimer);
      beatTimer = setInterval(() => heartbeat().catch(error), 10000);
      return;
    }
  }
  async function heartbeat() {
    await runPromise;
    if (!run) return;
    const b = snapshot();
    return enqueue(async () => {
      const r = await api("/run/beat", { ...b, rev });
      accept(r);
      return r;
    });
  }
  function presence() {
    if (!G.DB.online || G.DB.mode !== "server" || run) return Promise.resolve();
    return enqueue(async () => {
      const r = await api("/presence", { rev });
      accept(r);
    }).catch(error);
  }
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
      const r = await api("/run/bonus", b);
      accept(r, true);
      dirty = false;
      remember();
      return r.extra;
    });
  }
  function finish(clean) {
    clearInterval(beatTimer);
    const b = snapshot(clean),
      pending = runPromise;
    return enqueue(async () => {
      const ending = await pending;
      if (!ending) return;
      const id = ending.id,
        payload = { ...b, id };
      try {
        localStorage.setItem(
          "ps.pending-run." + user.uid,
          JSON.stringify(payload),
        );
      } catch {}
      try {
        const r = await api("/run/end", payload);
        accept(r);
        localStorage.removeItem("ps.pending-run." + user.uid);
        G.DB.serverSync("ok");
      } catch (e) {
        error(e);
        throw e;
      } finally {
        if (run?.id === id) run = null;
      }
    });
  }
  async function retryRuns() {
    if (!user) return;
    return enqueue(async () => {
      let payload;
      try {
        payload = JSON.parse(
          localStorage.getItem("ps.pending-run." + user.uid) || "null",
        );
      } catch {}
      if (!payload) return;
      try {
        const r = await api("/run/end", payload);
        accept(r);
        localStorage.removeItem("ps.pending-run." + user.uid);
        G.UI?.toast(text("Marca sincronizada", "Record synced", "成绩已同步"));
      } catch (e) {
        error(e);
      }
    });
  }
  async function logout() {
    clearTimeout(pushTimer);
    clearInterval(beatTimer);
    runGeneration++;
    try {
      await flush();
    } catch {}
    await api("/logout", {}).catch(() => {});
    user = null;
    run = null;
    dirty = false;
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
    if (user && !conflict) flush().catch(error);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && user) flush().catch(error);
  });
  return {
    api,
    text,
    probe,
    restore,
    authenticate,
    commit,
    flush,
    settleOffline,
    socialAction,
    claimBonus,
    prepareRun,
    startRun,
    heartbeat,
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
