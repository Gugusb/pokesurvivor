/* Homepage UI island. Original game controls retain their handlers and IDs. */
G.Homepage = (() => {
  const lib = typeof PokeHomepage !== "undefined" ? PokeHomepage : null;
  let mounted = false,
    shown = false,
    menu = null,
    account = null;
  const actions = new Map();
  const snapshot = () => {
    const s = G.DB.save || {},
      rank = G.LeagueRank?.view(s),
      saved = G.ExpeditionSave?.read();
    return {
      lang: G.I18n.lang,
      name: G.DB.guest ? G.T("Invitado") : G.DB.user || s.name || "",
      owned: Object.keys(s.owned || {}).filter((d) => G.DEX_BY[d]).length,
      total: G.DEX.length,
      runs: s.stats?.runs || 0,
      kills: s.stats?.totalKills || 0,
      rank: rank ? "R" + rank.tier : "R1",
      captain: G.T(G.DEX_BY[s.partner]?.name || ""),
      guest: !!G.DB.guest,
      calm: !!G.Settings.get("calm"),
      version: G.SettingsUI?.version || "",
      checkpointDay: saved?.day ?? null,
    };
  };
  function init() {
    if (mounted || !lib) return;
    menu = document.getElementById("scr-menu");
    account = document.getElementById("topbar");
    const slots = {
      captain: menu.querySelector(".partner-card"),
      stats: document.getElementById("menu-stats"),
      account: document.createElement("span"),
    };
    for (const b of menu.querySelectorAll("[data-go]")) {
      actions.set(b.dataset.go, b);
      slots[b.dataset.go] = b;
    }
    // Legacy fields still updated by menu/social modules, outside the new visual hierarchy.
    const compatibility = document.createElement("div");
    compatibility.hidden = true;
    compatibility.id = "home-compatibility";
    for (const el of [menu.querySelector(".difficulty-picker")])
      if (el) compatibility.append(el);
    slots.community = menu.querySelector(".menu-community");
    slots["dex-art"] = G.UI.spriteCanvas(151, 180, 190, {
      scale: 3,
      hero: true,
      lively: false,
      portrait: true,
    });
    slots["gacha-art"] = G.UI.spriteCanvas(25, 180, 190, {
      scale: 3,
      hero: true,
      lively: false,
      portrait: true,
    });
    for (const [name, image] of [
      ["pack-art", "cards"],
      ["ability-art", "medal3"],
    ]) {
      const span = document.createElement("span");
      span.innerHTML = G.Icons.html(image, 100);
      slots[name] = span;
    }
    menu.classList.add("home-menu");
    document.documentElement.style.setProperty(
      "--home-scene-image",
      'url("' +
        new URL("assets/homepage/expedition-dawn.png", document.baseURI).href +
        '")',
    );
    lib.mount(menu, snapshot(), {
      slots,
      action: (id) =>
        id === "resume"
          ? document.getElementById("expedition-continue")?.click()
          : id.startsWith("btn-")
            ? document.getElementById(id)?.click()
            : actions.get(id)?.click(),
      legal: () =>
        document.querySelector("#credits-line [data-legal]")?.click(),
    });
    menu.append(compatibility);
    mounted = true;
  }
  function open() {
    if (!mounted) init();
    if (!mounted) return;
    lib.update(snapshot());
    const play = actions.get("play");
    if (play) {
      for (const child of play.childNodes)
        if (child.nodeType === 3 && child.textContent.trim())
          child.textContent =
            G.I18n.lang === "zh"
              ? "开始远征"
              : G.I18n.lang === "en"
                ? "Begin expedition"
                : "Iniciar expedición";
      const small = play.querySelector("small");
      if (small)
        small.textContent =
          G.I18n.lang === "zh"
            ? "准备小队，踏上新旅程"
            : G.I18n.lang === "en"
              ? "Prepare your squad and set out"
              : "Prepara el equipo y sal de viaje";
    }
    visibility(true);
  }
  function visibility(next) {
    if (!mounted || next === shown) return;
    shown = next;
    document.body.classList.toggle("home-menu-open", next);
    if (next) {
      document.querySelector("[data-home-slot=account]")?.append(account);
    } else document.body.append(account);
  }
  function tick(time) {
    if (!mounted) return;
    const next =
      G.UI.isOpen("scr-menu") &&
      ![...document.querySelectorAll(".scr")].some(
        (el) => el.id !== "scr-menu" && !el.classList.contains("hidden"),
      );
    visibility(next);
    if (next) lib.tick(time);
  }
  return { init, open, tick };
})();
