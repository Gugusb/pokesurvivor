G.RankingUI = (() => {
  const $ = (id) => G.UI.$(id),
    T = (es, en, zh) => G.Server.text(es, en, zh);
  let board = "completion",
    token = 0;
  function init() {
    for (const id of ["rk-period", "rk-scope", "rk-poke", "rk-clear"])
      $(id).classList.add("hidden");
    $("rk-mod").onclick = () => G.ModUI.open();
  }
  function open() {
    if (!G.SocialUI.needOnline()) return;
    G.UI.show("scr-rank", true);
    $("rk-mod").classList.toggle("hidden", !G.Ranking.isAdmin());
    tabs();
    load();
  }
  function tabs() {
    const box = $("rk-mode");
    box.replaceChildren();
    for (const [id, label] of [
      [
        "completion",
        T("Colección completada", "Full-medal collection", "满勋章通关数量榜"),
      ],
      ["survival", T("Supervivencia · 8★", "Survival · 8★", "八星生存时间榜")],
    ]) {
      const b = document.createElement("button");
      b.className = "gen-tab" + (board === id ? " on" : "");
      b.textContent = label;
      b.onclick = () => {
        board = id;
        tabs();
        load();
      };
      box.appendChild(b);
    }
    const refresh = document.createElement("button");
    refresh.className = "btn small ghost";
    refresh.textContent = T(
      "Actualizar / reintentar",
      "Refresh / retry",
      "刷新／重试上传",
    );
    refresh.onclick = async () => {
      refresh.disabled = true;
      await G.Server.retryRuns?.();
      await load();
      refresh.disabled = false;
    };
    box.appendChild(refresh);
    $("rk-period").classList.remove("hidden");
    $("rk-period").textContent =
      board === "completion"
        ? T(
            "Cada especie con las ocho medallas cuenta por separado, incluso en la misma familia.",
            "Each species with all eight medals counts separately, including evolution relatives.",
            "八枚难度勋章集齐后计入；同一进化家族的每个图鉴编号分别计数。",
          )
        : T(
            "Sólo partidas individuales a velocidad normal, sin depuración.",
            "Solo runs at normal speed, without developer tools.",
            "仅计入正常一倍速、未使用调试的八星单人对局。",
          );
  }
  async function load() {
    const mine = ++token,
      box = $("rk-list");
    box.replaceChildren();
    box.textContent = T("Cargando…", "Loading…", "加载中……");
    try {
      const r = await G.Ranking.list(board);
      if (mine !== token) return;
      box.replaceChildren();
      if (!r.rows.length)
        box.textContent = T(
          "Todavía no hay marcas.",
          "No records yet.",
          "暂无成绩。",
        );
      for (const row of r.rows) {
        const el = document.createElement("div");
        el.className =
          "rk-row" + (row.uid === G.Server.user?.uid ? " mine" : "");
        const pos = document.createElement("span");
        pos.className = "pos";
        pos.textContent = row.pos;
        el.appendChild(pos);
        const mons = document.createElement("span");
        mons.className = "mons";
        if (row.dex && G.DEX_BY[row.dex])
          mons.appendChild(G.UI.spriteCanvas(row.dex, 44, 40, { scale: 1 }));
        el.appendChild(mons);
        const who = document.createElement("span");
        who.className = "who";
        const name = document.createElement("b");
        name.setAttribute("translate", "no");
        name.textContent = row.name;
        name.onclick = () => G.ProfileUI?.show(row.uid);
        who.appendChild(name);
        el.appendChild(who);
        const value = document.createElement("span");
        value.className = "time";
        value.textContent =
          board === "completion" ? String(row.score) : G.U.mmss(row.t);
        el.appendChild(value);
        const report = document.createElement("button");
        report.className = "btn small ghost";
        report.textContent = T("Reportar", "Report", "举报");
        report.disabled = row.uid === G.Server.user?.uid;
        report.onclick = async () => {
          try {
            await G.Ranking.report(board, row.uid);
            report.disabled = true;
            G.UI.toast(T("Reporte enviado", "Report sent", "举报已提交"));
          } catch (e) {
            G.UI.toast(e.message);
          }
        };
        el.appendChild(report);
        box.appendChild(el);
      }
      $("rk-me").textContent = r.me
        ? T("Tu puesto: ", "Your rank: ", "我的排名：") +
          "#" +
          r.me.pos +
          " · " +
          (board === "completion" ? r.me.score : G.U.mmss(r.me.t))
        : T(
            "Aún no tienes una marca válida.",
            "You have no eligible record yet.",
            "暂无符合条件的成绩。",
          );
    } catch (e) {
      if (mine === token)
        box.textContent =
          T("No se pudo cargar: ", "Could not load: ", "加载失败：") +
          e.message;
    }
  }
  return { init, open };
})();
