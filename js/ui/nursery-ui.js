G.NurseryUI = (() => {
  G.I18n.add({
    Guardería: "Nursery",
    "Huevos y crianza con amigos": "Hatching with friends",
  });
  G.I18n.addChinese({
    Guardería: "孵蛋屋",
    "Huevos y crianza con amigos": "亲本配对，与好友共同孵蛋",
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
    fill();
    box.append(search, select);
    parent.append(box);
    return select;
  }
  function hatchCard(h, canClaim = true) {
    const card = el("article", null, "nursery-card"),
      remaining = Math.max(0, h.ends - view.now);
    card.append(
      el("h3", mon(h.dex) + " + " + mon(h.partner)),
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
        "note",
      ),
    );
    const clock = el("p", null, "nursery-clock");
    clock.dataset.ends = h.ends;
    clock.dataset.offset = view.now - Date.now();
    card.append(clock);
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
    card.append(claim);
    return card;
  }
  function render() {
    if (!view) return;
    const oldSelections = {};
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
          "Los progenitores siguen disponibles para combatir. La crianza no se puede pausar.",
          "Parents remain available for battle. Hatching cannot be paused.",
          "亲本仍可正常出战；孵蛋开始后不能暂停或撤回，离线也会继续计时。",
        ),
        "note",
      ),
    );
    body.append(
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
    if (report) {
      const box = el("article", null, "nursery-result");
      box.append(
        el(
          "h3",
          t("Cría recogida", "Offspring collected", "收获成功") +
            " · " +
            mon(report.dex),
        ),
      );
      box.append(
        el(
          "p",
          t(
            "IV de la cría (PS / ataque / velocidad): ",
            "Offspring IVs (HP / attack / speed): ",
            "本次个体值（生命 / 攻击 / 速度）：",
          ) + report.iv.join(" / "),
        ),
      );
      const names = [
        t("PS", "HP", "生命"),
        t("Ataque", "Attack", "攻击"),
        t("Velocidad", "Speed", "速度"),
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
    body.append(parents);
    if (view.dex) {
      const primary = el("article", null, "nursery-card");
      primary.append(
        el(
          "h3",
          t("Progenitor principal", "Primary parent", "主亲本") +
            " · " +
            mon(view.dex),
        ),
        G.UI.spriteCanvas(view.dex, 140, 110, { scale: 2, lively: true }),
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
    } else if (own) {
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
      card.append(
        button(
          t("Colocar", "Place", "放入"),
          () =>
            G.Server.socialAction("/nursery/primary", {
              dex: Number(select.value),
            }),
          "gold nursery-place",
        ),
      );
      parents.append(card);
    } else
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
      const section = el("section", null, "nursery-invites");
      section.append(
        el(
          "h3",
          t(
            "Invitar amigos a criar",
            "Invite friends to hatch",
            "邀请好友孵蛋",
          ),
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
    if (view.participating.length) {
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
      for (const h of view.participating)
        if (h.id !== view.hatch?.id) body.append(hatchCard(h));
    }
    body.append(
      el(
        "p",
        t(
          "Al recoger: 0,5% de obtener una megapiedra compatible con la familia.",
          "On collection: 0.5% chance of a Mega Stone matching this evolution family.",
          "收获时有 0.5% 概率获得这条进化链对应的 Mega 进化石（存在已开放 Mega 形态时）。",
        ),
        "note",
      ),
    );
    for (const [id, value] of Object.entries(oldSelections)) {
      const select = $(id);
      if (select && [...select.options].some((o) => o.value === value)) {
        select.value = value;
        select.dispatchEvent(new Event("change"));
      }
    }
    clocks();
  }
  function clocks() {
    if (!G.UI.isOpen("scr-nursery")) return;
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
