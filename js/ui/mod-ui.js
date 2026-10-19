/* Permissions are enforced by the private server. */
G.ModUI = (() => {
  const $ = (id) => G.UI.$(id),
    T = (es, en, zh) => G.Server.text(es, en, zh);
  let search = "";
  function button(text, fn) {
    const b = document.createElement("button");
    b.className = "btn small ghost";
    b.textContent = text;
    b.onclick = async () => {
      b.disabled = true;
      try {
        await fn();
        await load();
      } catch (e) {
        G.UI.toast(e.message, 5000);
        b.disabled = false;
      }
    };
    return b;
  }
  function init() {
    $("mod-back").onclick = () => G.RankingUI.open();
    $("mod-purge").classList.add("hidden");
    $("mod-tabs").replaceChildren();
    const input = document.createElement("input");
    input.className = "field";
    input.placeholder = T("Buscar usuario", "Search users", "搜索用户名");
    input.oninput = () => {
      search = input.value;
    };
    $("mod-tabs").append(input, button(T("Buscar", "Search", "搜索"), load));
  }
  async function open() {
    if (!G.Ranking.isAdmin()) return;
    G.UI.show("scr-mod", true);
    try {
      await load();
    } catch (e) {
      G.UI.toast(e.message);
    }
  }
  async function load() {
    const box = $("mod-list");
    box.replaceChildren();
    const [r, reports] = await Promise.all([
      G.Server.api("/admin/users?q=" + encodeURIComponent(search)),
      G.Server.api("/admin/reports"),
    ]);
    for (const u of r.users) {
      const row = document.createElement("div");
      row.className = "row between";
      const label = document.createElement("span");
      label.textContent =
        u.name +
        " · " +
        u.role +
        (u.ban ? " · " + T("Suspendido", "Suspended", "已封禁") : "") +
        (u.deleted ? " · " + T("Borrado", "Deleted", "已注销") : "");
      label.setAttribute("translate", "no");
      row.appendChild(label);
      if (u.uid !== G.Server.user.uid && !u.deleted)
        row.appendChild(
          button(
            u.ban
              ? T("Desbanear", "Unban", "解封")
              : T("Banear", "Suspend", "封禁"),
            () => G.Server.api("/admin/ban", { uid: u.uid, ban: !u.ban }),
          ),
        );
      box.appendChild(row);
    }
    const title = document.createElement("h3");
    title.textContent = T("Reportes", "Reports", "举报");
    box.appendChild(title);
    for (const r of reports.reports) {
      const row = document.createElement("div");
      row.className = "row between";
      const label = document.createElement("span");
      label.textContent = r.name + " · " + r.board;
      row.appendChild(label);
      if (r.board === "survival")
        row.appendChild(
          button(T("Borrar marca", "Remove score", "删除成绩"), () =>
            G.Server.api("/admin/remove-score", {
              uid: r.target,
              board: r.board,
            }),
          ),
        );
      row.appendChild(
        button(T("Descartar", "Dismiss", "忽略"), () =>
          G.Server.api("/admin/dismiss", { id: r.id }),
        ),
      );
      box.appendChild(row);
    }
  }
  return { init, open };
})();
