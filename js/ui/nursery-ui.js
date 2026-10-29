G.NurseryUI = (() => {
  G.I18n.add({
    Guardería: "Nursery",
    "Huevos y crianza con amigos": "Hatching with friends",
    "Un hogar para nuevos compañeros": "A home for new companions",
  });
  G.I18n.addChinese({
    Guardería: "孵蛋屋",
    "Huevos y crianza con amigos": "亲本配对，与好友共同孵蛋",
    "Un hogar para nuevos compañeros": "相伴成长，迎接新的伙伴",
  });
  const $ = (id) => document.getElementById(id),
    t = (es, en, zh) => G.Server.text(es, en, zh);
  const GROUPS = [
    null,
    ["Monstruo", "Monster", "怪兽"],
    ["Agua 1", "Water 1", "水中 1"],
    ["Bicho", "Bug", "虫"],
    ["Volador", "Flying", "飞行"],
    ["Campo", "Field", "陆上"],
    ["Hada", "Fairy", "妖精"],
    ["Planta", "Grass", "植物"],
    ["Humanoide", "Human-like", "人型"],
    ["Agua 3", "Water 3", "水中 3"],
    ["Mineral", "Mineral", "矿物"],
    ["Amorfo", "Amorphous", "不定形"],
    ["Agua 2", "Water 2", "水中 2"],
    ["Ditto", "Ditto", "百变怪"],
    ["Dragón", "Dragon", "龙"],
    ["Desconocido", "Undiscovered", "未发现"],
  ];
  let current = null,
    view = null,
    busy = false,
    poll = null,
    report = null,
    renderKey = null,
    token = 0;
  const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const mon = (d) => (G.DEX_BY[d] ? G.T(G.DEX_BY[d].name) : "#" + d);
  const groupText = (d) =>
    G.NurseryRules.groups(d)
      .map((g) => t(...GROUPS[g]))
      .join(" / ");
  function pokemonFigure(dex, role, preview = false, shiny = false) {
    const figure = el(
      "figure",
      null,
      "nursery-mon" + (preview ? " nursery-preview" : ""),
    );
    figure.append(el("span", role, "nursery-role"));
    if (!G.DEX_BY[dex]) {
      figure.classList.add("empty");
      figure.append(
        el("div", "＋", "nursery-empty-mon"),
        el(
          "figcaption",
          t("Sin progenitor", "No parent selected", "尚未选择亲本"),
        ),
      );
      return figure;
    }
    figure.dataset.dex = dex;
    figure.dataset.shiny = String(!!shiny);
    figure.style.setProperty(
      "--mon-color",
      G.U.TYPE_COLOR[G.DEX_BY[dex].types[0]],
    );
    const meta = G.Sprites.animMeta(dex, "Idle");
    const scale = Math.max(
      1,
      Math.min(
        4,
        Math.floor(180 / (meta?.w || 50)),
        Math.floor(130 / (meta?.ay || 32)),
      ),
    );
    const cv = G.UI.spriteCanvas(dex, 200, 168, { scale, hero: true, shiny });
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", mon(dex));
    figure.append(cv, el("figcaption", (shiny ? '★ ' : '') + mon(dex)));
    const types = el("div", null, "nursery-types");
    types.innerHTML = G.UI.typeChips(G.DEX_BY[dex].types);
    figure.append(types);
    return figure;
  }
  function egg() {
    const nest = el("div", null, "nursery-nest");
    nest.setAttribute("aria-hidden", "true");
    nest.append(el("i", null, "nursery-egg"), el("span", "✦", "nursery-spark"));
    return nest;
  }
  function button(text, fn, cls = "") {
    const b = el("button", text, "btn small " + cls);
    b.disabled = busy;
    b.onclick = () => execute(fn);
    return b;
  }
  function message(text, bad = false) {
    $("nursery-message").textContent = text;
    $("nursery-message").style.color = bad ? "#ffb0b8" : "";
  }
  async function execute(fn) {
    if (busy) return;
    busy = true;
    document
      .querySelectorAll("#nursery-body button")
      .forEach((b) => (b.disabled = true));
    try {
      await fn();
      await refresh();
      await G.Social.refreshPresence();
    } catch (e) {
      message(e.message, true);
    } finally {
      busy = false;
      if (view) render();
    }
  }
  async function refresh() {
    const ownToken = token,
      r = await G.Server.api(
        "/nursery" + (current ? "?owner=" + encodeURIComponent(current) : ""),
      );
    if (ownToken !== token) return;
    view = r;
    render();
  }
  async function open(owner = null) {
    if (!G.DB.online || G.DB.mode !== "server") {
      G.UI.toast(
        t(
          "Inicia sesión en una cuenta del servidor para criar.",
          "Sign in to a server account to use the nursery.",
          "请登录自建账号使用孵蛋屋；游客和旧本地账号不能孵蛋。",
        ),
        5000,
      );
      return;
    }
    current = owner;
    view = null;
    report = null;
    renderKey = null;
    token++;
    G.UI.show("scr-nursery", true);
    message(t("Cargando…", "Loading…", "正在载入…"));
    $("nursery-body").replaceChildren();
    try {
      await G.Server.flush();
      await refresh();
      message("");
    } catch (e) {
      message(e.message, true);
    }
  }
  function picker(parent, id, filter = () => true) {
    const list = Object.keys(G.DB.save.owned)
        .map(Number)
        .filter(filter)
        .sort((a, b) => a - b),
      box = el("div", null, "nursery-picker");
    const search = el("input");
    search.type = "search";
    search.id = id + "-search";
    search.className = "field";
    search.placeholder = t("Buscar Pokémon", "Search Pokémon", "搜索宝可梦");
    search.setAttribute("aria-label", search.placeholder);
    const select = el("select");
    select.id = id;
    select.setAttribute(
      "aria-label",
      t("Elegir progenitor", "Choose parent", "选择亲本"),
    );
    function fill() {
      const old = select.value,
        query = search.value.trim().toLowerCase();
      select.replaceChildren();
      for (const d of list.filter((d) =>
        (mon(d) + " " + d).toLowerCase().includes(query),
      )) {
        const iv = G.DB.save.owned[d].iv || [1, 1, 1],
          o = el(
            "option",
            "#" +
              d +
              " " +
              mon(d) +
              (G.DB.ownsShiny(d) ? ' ★' : '') +
              " · " +
              groupText(d) +
              " · IV " +
              iv.join("/"),
          );
        o.value = d;
        select.append(o);
      }
      if ([...select.options].some((o) => o.value === old)) select.value = old;
      select.dispatchEvent(new Event("change"));
    }
    search.oninput = fill;
    const preview = el("div", null, "nursery-picker-preview");
    select.addEventListener("change", () => {
      preview.replaceChildren(
        pokemonFigure(
          Number(select.value),
          t("Vista previa", "Preview", "亲本预览"),
          true,
          G.DB.ownsShiny(Number(select.value)),
        ),
      );
    });
    fill();
    box.append(search, select);
    parent.append(preview, box);
    return select;
  }
  function hatchCard(h, canClaim = true) {
    const card = el("article", null, "nursery-card nursery-hatch"),
      remaining = Math.max(0, h.ends - view.now);
    card.dataset.started = h.started;
    card.dataset.ends = h.ends;
    card.dataset.offset = view.now - Date.now();
    const heading = el("div", null, "nursery-hatch-heading");
    heading.append(
      el(
        "h3",
        t(
          "Un nuevo compañero en camino",
          "A new friend on the way",
          "新的伙伴正在孕育",
        ),
      ),
      el("span", "", "nursery-state"),
    );
    const garden = el("div", null, "nursery-garden");
    garden.append(
      pokemonFigure(
        h.dex,
        t("Progenitor principal", "Primary parent", "主亲本"),
        false,
        h.shiny,
      ),
      egg(),
      pokemonFigure(
        h.partner,
        h.friend
          ? t("Progenitor de amigo", "Friend’s parent", "好友亲本")
          : t("Otro progenitor", "Partner parent", "配对亲本"),
        false,
        h.partnerShiny,
      ),
    );
    const status = el("div", null, "nursery-hatch-status");
    const progress = el("progress", null, "nursery-progress");
    progress.max = 100;
    progress.value = 0;
    progress.setAttribute(
      "aria-label",
      t("Progreso de eclosión", "Hatching progress", "孵化进度"),
    );
    const line = el("div", null, "nursery-progress-label");
    line.append(
      el("span", t("Progreso de eclosión", "Hatching progress", "孵化进度")),
      el("b", "", "nursery-percent"),
    );
    const clock = el("p", null, "nursery-clock");
    clock.dataset.ends = h.ends;
    clock.dataset.offset = card.dataset.offset;
    clock.setAttribute("role", "timer");
    status.append(line, progress, clock);
    const footer = el("div", null, "nursery-hatch-footer");
    const info = el("div");
    info.append(
      el(
        "p",
        h.friend
          ? t(
              "Crianza con amigo: hereda 2 IV",
              "Friend hatch: inherits 2 IVs",
              "好友孵蛋：继承 2 项个体值",
            )
          : t(
              "Crianza propia: hereda 1 IV",
              "Own hatch: inherits 1 IV",
              "自行孵蛋：继承 1 项个体值",
            ),
        "nursery-inheritance",
      ),
    );
    if (h.guestName)
      info.append(
        el("p", t("Con ", "With ", "参与好友：") + h.guestName, "note"),
      );
    info.append(
      el(
        "p",
        t(
          "La crianza continúa sin conexión",
          "Hatching continues while offline",
          "离线后仍会继续孵化",
        ),
        "note",
      ),
    );
    footer.append(info);
    card.append(heading, garden, status, footer);
    if (!canClaim) return card;
    const claim = button(
      t("Recoger cría", "Collect offspring", "收获宝可梦"),
      async () => {
        const r = await G.Server.socialAction(
          "/nursery/claim",
          { id: h.id },
          true,
        );
        report = r.report;
      },
      "gold nursery-claim",
    );
    claim.disabled = busy || remaining > 0;
    claim.dataset.ends = h.ends;
    claim.dataset.offset = clock.dataset.offset;
    footer.append(claim);
    return card;
  }
  function render() {
    if (!view) return;
    const oldSelections = {};
    const oldSearches = {};
    const activeId = document.activeElement?.id;
    const scroll = $("nursery-body").parentElement.scrollTop;
    const key =
      view.owner +
      ":" +
      (view.dex || "empty") +
      ":" +
      (view.hatch?.id || "setup") +
      ":" +
      !!report;
    const sameState = key === renderKey;
    const opened = new Set(
      [...$("nursery-body").querySelectorAll("details[open]")].map(
        (e) => e.className,
      ),
    );
    $("nursery-body")
      .querySelectorAll('input[type="search"]')
      .forEach((e) => (oldSearches[e.id] = e.value));
    renderKey = key;
    $("nursery-body")
      .querySelectorAll("select")
      .forEach((s) => (oldSelections[s.id] = s.value));
    const body = $("nursery-body");
    body.replaceChildren();
    const own = view.owner === G.Social.uid,
      friend = !own;
    $("nursery-title").textContent = own
      ? t("Tu guardería", "Your nursery", "我的孵蛋屋")
      : view.name + " · " + t("Guardería", "Nursery", "孵蛋屋");
    body.append(
      el(
        "p",
        t(
          "Elige dos progenitores y espera a tu nuevo compañero.",
          "Pair your Pokémon and welcome a new companion.",
          "让两只宝可梦结伴，等待新伙伴的到来。",
        ),
        "nursery-intro",
      ),
    );
    if (report) {
      const box = el("article", null, "nursery-result");
      box.append(
        pokemonFigure(
          report.dex,
          t("Nuevo compañero", "New companion", "新伙伴"),
          false,
          report.shiny,
        ),
      );
      box.append(
        el(
          "h3",
          t("Cría recogida", "Offspring collected", "收获成功") +
            " · " +
            mon(report.dex),
        ),
      );
      if (report.shiny)
        box.append(el('p', t('¡Ha heredado el brillo!', 'Shiny inherited!', '后代继承了闪光！'), 'gold nursery-shiny-result'));
      box.append(
        el(
          "p",
          t(
            "IV (PS / At. / Vel. / At. Esp. / Def. / Def. Esp.): ",
            "IVs (HP / Atk / Speed / Sp. Atk / Def / Sp. Def): ",
            "本次个体值（生命 / 物攻 / 速度 / 特攻 / 物防 / 特防）：",
          ) + report.iv.join(" / "),
        ),
      );
      const names = [
        t("PS", "HP", "生命"),
        t("At. físico", "Attack", "物攻"),
        t("Velocidad", "Speed", "速度"),
        t("At. especial", "Sp. Atk", "特攻"),
        t("Def. física", "Defense", "物防"),
        t("Def. especial", "Sp. Def", "特防"),
      ];
      box.append(
        el(
          "p",
          t("Heredados: ", "Inherited: ", "继承项：") +
            report.inherited.map((i) => names[i]).join(" / "),
          "note",
        ),
      );
      box.append(
        el(
          "p",
          t(
            "La Pokédex conserva el mejor valor de cada atributo.",
            "The Pokédex keeps the best value of each stat.",
            "图鉴继续保留每项个体值的历史最佳值。",
          ),
          "note",
        ),
      );
      if (report.mega)
        box.append(
          el(
            "p",
            t("¡Megapiedra! ", "Mega Stone! ", "额外获得 Mega 进化石：") +
              G.Mega.label(report.mega),
            "gold",
          ),
        );
      if (report.zUnlocked)
        box.append(
          el(
            "p",
            t(
              "Permiso Z desbloqueado para esta familia.",
              "Z permission unlocked for this family.",
              "已解锁这条进化链的 Z 携带权限。",
            ),
            "gold",
          ),
        );
      body.append(box);
    }
    const parents = el("div", null, "nursery-parents");
    if (view.hatch) parents.classList.add("nursery-active");
    body.append(parents);
    if (view.dex && !view.hatch) {
      const primary = el("article", null, "nursery-card");
      primary.append(
        el("h3", t("Progenitor principal", "Primary parent", "主亲本")),
        pokemonFigure(
          view.dex,
          t("En la guardería", "In the nursery", "已入孵蛋屋"),
          false,
          view.shiny,
        ),
        el("p", groupText(view.dex), "note"),
      );
      if (own && !view.hatch)
        primary.append(
          button(
            t("Retirar", "Withdraw", "撤回主亲本"),
            () => G.Server.socialAction("/nursery/primary", { dex: null }),
            "ghost nursery-withdraw",
          ),
        );
      parents.append(primary);
    } else if (!view.dex && own) {
      const card = el("article", null, "nursery-card");
      card.append(
        el(
          "h3",
          t(
            "Colocar progenitor principal",
            "Place primary parent",
            "放入主亲本",
          ),
        ),
      );
      const select = picker(card, "nursery-primary");
      const place = button(
        t("Colocar", "Place", "放入"),
        () =>
          G.Server.socialAction("/nursery/primary", {
            dex: Number(select.value),
          }),
        "gold nursery-place",
      );
      select.addEventListener(
        "change",
        () => (place.disabled = busy || !select.value),
      );
      place.disabled = busy || !select.value;
      card.append(place);
      parents.append(card);
    } else if (!view.dex)
      body.append(
        el(
          "p",
          t(
            "Todavía no hay progenitor principal.",
            "No primary parent has been placed.",
            "好友尚未放入主亲本。",
          ),
          "note",
        ),
      );
    if (view.hatch)
      parents.append(
        hatchCard(
          view.hatch,
          own || view.participating.some((h) => h.id === view.hatch.id),
        ),
      );
    else if (view.dex && (own || view.invited)) {
      const card = el("article", null, "nursery-card");
      card.append(
        el(
          "h3",
          t(
            "Elegir otro progenitor",
            "Choose partner parent",
            "放入另一个亲本",
          ),
        ),
      );
      const select = picker(card, "nursery-partner", (d) =>
          G.NurseryRules.compatible(view.dex, d, friend),
        ),
        duration = el("p", null, "note");
      const start = button(
        t("Comenzar crianza", "Start hatching", "开始孵蛋"),
        () =>
          G.Server.socialAction("/nursery/start", {
            owner: view.owner,
            epoch: view.epoch,
            dex: Number(select.value),
          }),
        "gold nursery-start",
      );
      const update = () => {
        const ms = G.NurseryRules.duration(
          view.dex,
          Number(select.value),
          friend,
        );
        duration.textContent = ms
          ? t("Duración: ", "Duration: ", "孵蛋耗时：") +
            ms / 3600000 +
            t(" horas", " hours", " 小时")
          : t(
              "No tienes un progenitor compatible.",
              "You have no compatible parent.",
              "目前没有同蛋组的适配亲本。",
            );
        start.disabled =
          busy || !ms || (friend && view.participating.length > 0);
      };
      select.onchange = update;
      update();
      card.append(duration, start);
      parents.append(card);
      if (friend && view.participating.length)
        card.append(
          el(
            "p",
            t(
              "Recoge primero tu otra cría de amigo.",
              "Collect your other friend hatch first.",
              "请先完成并领取正在参与的好友孵蛋。",
            ),
            "note",
          ),
        );
    } else if (friend && view.dex)
      body.append(
        el(
          "p",
          t(
            "Puedes visitar, pero necesitas invitación para colocar un progenitor.",
            "Visiting is allowed; an invitation is required to place a parent.",
            "可自由拜访；收到本次主亲本的孵蛋邀请后才能放入亲本。",
          ),
          "note",
        ),
      );
    if (own && view.dex) {
      const section = el("details", null, "nursery-invites");
      section.open = !view.hatch;
      section.append(
        el(
          "summary",
          t(
            "Invitar amigos a criar",
            "Invite friends to hatch",
            "邀请好友孵蛋",
          ),
        ),
      );
      if (!G.Social.friends.some((f) => f.status === "ok"))
        section.append(
          el(
            "p",
            t(
              "Añade amigos para criar juntos.",
              "Add friends to hatch together.",
              "在好友栏添加好友，就能邀请他们一起孵蛋。",
            ),
            "note",
          ),
        );
      for (const f of G.Social.friends.filter((f) => f.status === "ok")) {
        const row = el("div", null, "fr-row");
        row.append(el("b", f.name));
        const invited = view.invitedFriends.includes(f.uid);
        row.append(
          button(
            invited
              ? t("Invitado", "Invited", "已邀请")
              : t("Invitar a criar", "Invite to hatch", "邀请孵蛋"),
            () => G.Server.socialAction("/nursery/invite", { uid: f.uid }),
            "nursery-invite",
          ),
        );
        row.lastChild.disabled = busy || invited;
        section.append(row);
      }
      body.append(section);
    }
    const otherHatches = view.participating.filter(
      (h) => h.id !== view.hatch?.id,
    );
    if (otherHatches.length) {
      body.append(
        el(
          "h3",
          t(
            "Tus crianzas con amigos",
            "Your friend hatches",
            "我参与的好友孵蛋",
          ),
        ),
      );
      for (const h of otherHatches) body.append(hatchCard(h));
    }
    const rules = el("details", null, "nursery-rules");
    rules.append(
      el(
        "summary",
        t(
          "Cómo funciona la crianza",
          "How hatching works",
          "孵蛋规则与额外奖励",
        ),
      ),
    );
    rules.append(
      el(
        "p",
        t(
          "Los progenitores pueden combatir; la crianza continúa sin conexión y no se puede pausar.",
          "Parents can still battle. Hatching continues offline and cannot be paused.",
          "亲本仍可出战；离线继续孵蛋，开始后不能暂停或撤回。",
        ),
        "note",
      ),
    );
    rules.append(
      el(
        "p",
        t(
          "La cría hereda los talentos de sus progenitores. Con un amigo, hereda más y ambos recibís una cría.",
          "Your new partner inherits its parents’ talents. Hatch with a friend to pass on more, and both receive a new partner.",
          "新伙伴会继承亲本的个体值。与好友一起孵蛋，传承更多天赋，双方都能迎接新伙伴。",
        ),
        "note",
      ),
    );
    rules.append(
      el(
        "p",
        t(
          "En la crianza con amigos, cada cría tiene un 2% de heredar el brillo si el progenitor del otro jugador es shiny. Los progenitores con shiny registrado participan como shiny; se registra al empezar.",
          "In friend hatches, each offspring has a 2% chance to be shiny if the other player's parent is shiny. Parents with a registered shiny use that form; their state is recorded when hatching starts.",
          "好友共同孵蛋时，双方分别按对方亲本判定：对方为闪光，自己领取的后代有 2% 概率继承闪光。已收录闪光的亲本会以闪光形态参与，状态在开始孵蛋时记录。",
        ),
        "note",
      ),
    );
    rules.append(
      el(
        "p",
        t(
          "El grupo desconocido sólo se empareja con el de un amigo o con Ditto. Ditto es comodín.",
          "Undiscovered pairs only with a friend’s Undiscovered or with Ditto. Ditto is a wildcard.",
          "未发现组仅能与好友的未发现组配对，或与百变怪配对；百变怪可与任意蛋组配对。",
        ),
        "note",
      ),
    );
    rules.append(
      el(
        "p",
        t(
          "Al recoger la cría, quizá encuentres una megapiedra de su familia.",
          "When collecting your new partner, you may find a Mega Stone for its family.",
          "迎接新伙伴时，或许还能发现它的 Mega 进化石。",
        ),
        "note",
      ),
    );
    body.append(rules);
    for (const [id, value] of Object.entries(oldSearches))
      if ($(id)) {
        $(id).value = value;
        $(id).dispatchEvent(new Event("input"));
      }
    for (const [id, value] of Object.entries(oldSelections)) {
      const select = $(id);
      if (select && [...select.options].some((o) => o.value === value)) {
        select.value = value;
        select.dispatchEvent(new Event("change"));
      }
    }
    clocks();
    if (sameState) {
      body
        .querySelectorAll("details")
        .forEach((d) => (d.open = opened.has(d.className)));
      if (activeId && $(activeId)) $(activeId).focus({ preventScroll: true });
    }
    body.parentElement.scrollTop = sameState ? scroll : 0;
  }
  function clocks() {
    if (!G.UI.isOpen("scr-nursery")) return;
    document.querySelectorAll(".nursery-hatch").forEach((card) => {
      const now = Date.now() + Number(card.dataset.offset),
        start = Number(card.dataset.started),
        end = Number(card.dataset.ends);
      const percent = Math.max(
        0,
        Math.min(100, ((now - start) / Math.max(1, end - start)) * 100),
      );
      const ready = now >= end;
      card.classList.toggle("ready", ready);
      card.querySelector(".nursery-progress").value = percent;
      card.querySelector(".nursery-percent").textContent =
        Math.floor(percent) + "%";
      card.querySelector(".nursery-state").textContent = ready
        ? t("¡Listo!", "Ready!", "待收获")
        : t("Incubando", "Hatching", "孵化中");
    });
    document.querySelectorAll(".nursery-clock").forEach((c) => {
      const n = Math.max(
        0,
        Math.ceil(
          (Number(c.dataset.ends) - Date.now() - Number(c.dataset.offset)) /
            1000,
        ),
      );
      c.textContent = n
        ? t("Eclosiona en ", "Hatches in ", "距离孵化完成：") +
          Math.floor(n / 3600) +
          ":" +
          String(Math.floor(n / 60) % 60).padStart(2, "0") +
          ":" +
          String(n % 60).padStart(2, "0")
        : t(
            "¡Listo para recoger!",
            "Ready to collect!",
            "孵化完成，可以收获！",
          );
    });
    document
      .querySelectorAll(".nursery-claim")
      .forEach(
        (b) =>
          (b.disabled =
            busy ||
            Number(b.dataset.ends) > Date.now() + Number(b.dataset.offset)),
      );
  }
  function renderInbox() {
    const box = $("fr-inbox"),
      e = G.Social.extras;
    if (!box) return;
    box.replaceChildren();
    box.append(
      el(
        "p",
        t("Regalos diarios: ", "Daily gifts: ", "今日送礼：") +
          e.gifts.sent.length +
          "/10 · " +
          t(
            "Gratis; se reinicia a las 00:00 de Pekín. Monedas, cupones o gemas.",
            "Free; resets at 00:00 Beijing time. Coins, tickets or gems.",
            "免费赠送，北京时间 00:00 重置；对方可收到金币、抽奖券或特性宝石。",
          ),
        "note",
      ),
    );
    for (const invite of e.nurseryInvites) {
      const row = el("div", null, "fr-row nursery-invitation");
      row.append(el("span", invite.name + " · " + mon(invite.dex)));
      const b = el(
        "button",
        t("Ver invitación de crianza", "View hatch invitation", "查看孵蛋邀请"),
        "btn small gold",
      );
      b.onclick = () => open(invite.owner);
      row.append(b);
      box.append(row);
    }
    for (const gift of e.gifts.inbox) {
      const row = el("div", null, "fr-row gift-inbox");
      row.append(el("span", gift.name + " · " + t("Regalo", "Gift", "礼物")));
      const b = el(
        "button",
        t("Recoger regalo", "Claim gift", "领取礼物"),
        "btn small gold gift-claim",
      );
      b.onclick = async () => {
        b.disabled = true;
        try {
          const r = await G.Server.socialAction(
            "/gifts/claim",
            { id: gift.id },
            true,
          );
          G.UI.toast(rewardText(r.report), 4000);
          await G.Social.refreshPresence();
          renderInbox();
        } catch (e) {
          G.UI.toast(e.message, 5000);
          b.disabled = false;
        }
      };
      row.append(b);
      box.append(row);
    }
  }
  function rewardText(r) {
    return (
      t("Recibido: ", "Received: ", "获得：") +
      [
        r.coins ? t("Monedas ", "Coins ", "宝可梦币 ") + r.coins : "",
        r.tickets ? t("Cupones ", "Tickets ", "抽奖券 ") + r.tickets : "",
        r.gems ? t("Gemas ", "Gems ", "特性宝石 ") + r.gems : "",
      ]
        .filter(Boolean)
        .join(" · ")
    );
  }
  function notify(extras) {
    if (!G.Social?.uid) return;
    const key = "ps.nursery-notices." + G.Social.uid;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {}
    const unseen = extras.nurseryInvites.filter(
      (i) => !seen.includes(i.owner + ":" + i.epoch),
    );
    if (unseen.length) {
      G.UI.toast(
        unseen.map((i) => i.name).join("、") +
          " · " +
          t(
            "te invita a criar. Revisa Amigos.",
            "invited you to hatch. Check Friends.",
            "邀请你一起孵蛋，请到好友栏查看。",
          ),
        6000,
      );
      try {
        localStorage.setItem(
          key,
          JSON.stringify(
            [...seen, ...unseen.map((i) => i.owner + ":" + i.epoch)].slice(
              -200,
            ),
          ),
        );
      } catch {}
    }
  }
  function init() {
    $("nursery-back").onclick = () => {
      token++;
      current = null;
      G.MenuUI.open();
    };
    setInterval(clocks, 1000);
    poll = setInterval(() => {
      if (G.UI.isOpen("scr-nursery") && !busy)
        refresh().catch((e) => message(e.message, true));
    }, 30000);
  }
  return { init, open, notify, renderInbox };
})();
