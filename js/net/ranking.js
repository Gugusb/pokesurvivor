/* Rankings are derived by the private server, never uploaded as arbitrary rows. */
G.Ranking = (() => {
  function periodIds(date = new Date()) {
    const parts = {};
    for (const p of new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date))
      parts[p.type] = p.value;
    const y = +parts.year,
      m = +parts.month,
      d = +parts.day,
      t = new Date(Date.UTC(y, m - 1, d));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const wy = t.getUTCFullYear(),
      w = Math.ceil(((t - new Date(Date.UTC(wy, 0, 1))) / 864e5 + 1) / 7),
      p = (n) => String(n).padStart(2, "0");
    return {
      d: "d" + y + p(m) + p(d),
      w: "w" + wy + "-" + p(w),
      m: "m" + y + p(m),
      y: "y" + y,
      a: "all2",
    };
  }
  return {
    periodIds,
    runStarted() {},
    submitSolo: async () => [],
    submitGroup: async () => [],
    list: (board) =>
      G.Server.api("/ranking?board=" + encodeURIComponent(board)),
    isAdmin: () => G.Server.user?.role === "admin",
    report: (board, uid) => G.Server.api("/report", { board, uid }),
  };
})();
