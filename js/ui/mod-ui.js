/* Permissions are enforced by the private server. */
G.ModUI = (() => {
  const $ = (id) => G.UI.$(id),
    T = (es, en, zh) => G.Server.text(es, en, zh);
  let search = "",view='users',version='',dayFrom='',dayTo='',cleanOnly=true;
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
    renderTabs();
  }
  function renderTabs(){
    const tabs=$("mod-tabs");tabs.replaceChildren();
    tabs.append(button(T('Jugadores','Players','玩家管理'),()=>{view='users';renderTabs();}),button(T('Registro DPS','DPS records','远征输出记录'),()=>{view='dps';renderTabs();}));
    const input = document.createElement("input");
    input.className = "field";
    input.value=search;
    input.placeholder = T("Buscar usuario", "Search users", "搜索用户名");
    input.oninput = () => {
      search = input.value;
    };
    tabs.append(input);
    if(view==='dps'){
      for(const [label,value,change,type]of [[T('Versión','Version','版本'),version,v=>version=v,'text'],[T('Día desde','Day from','起始天'),dayFrom,v=>dayFrom=v,'number'],[T('Día hasta','Day to','结束天'),dayTo,v=>dayTo=v,'number']]){const field=document.createElement('input');field.className='field';field.placeholder=label;field.setAttribute('aria-label',label);field.value=value;field.type=type;field.maxLength=64;field.oninput=()=>change(field.value);tabs.append(field);}
      const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=cleanOnly;check.onchange=()=>cleanOnly=check.checked;label.append(check,document.createTextNode(T('Sin depuración','No debug','仅非调试局')));tabs.append(label);
      tabs.append(button(T('Exportar JSON','Export JSON','导出JSON'),()=>exportDps('json')),button(T('Exportar CSV','Export CSV','导出CSV'),()=>exportDps('csv')));
    }
    tabs.append(button(T("Buscar", "Search", "搜索"),()=>{}));
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
    if(view==='dps'){await loadDps(box);return;}
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
  function query(before='',limit=50){const params=new URLSearchParams({q:search,version,dayFrom,dayTo,clean:cleanOnly?'1':'0',limit:String(limit)});if(before)params.set('before',before);return '/admin/expedition-dps?'+params;}
  function paragraph(parent,text){const p=document.createElement('p');p.textContent=text;parent.append(p);}
  async function loadDps(box){
    paragraph(box,T('Telemetría del cliente; no verifica puntuaciones. Se usa tiempo de juego.','Client-reported balancing telemetry, not score verification. Uses game time.','客户端平衡遥测，不作为排行验证。DPS使用游戏时间；不足5秒的战斗按实际时长计算峰值。'));
    const data=await G.Server.api(query());
    for(const r of data.records){
      const detail=document.createElement('details');detail.className='dps-record';const title=document.createElement('summary');title.textContent=r.name+' · '+T('Día ','Day ','第')+r.day+' · DPS '+r.averageDps.toFixed(2)+' / '+r.peak.dps.toFixed(2);detail.append(title);
      const team=r.peak.team,q=team.quality;paragraph(detail,r.version+' · '+r.event+' · '+r.outcome+' · '+(r.clean?T('Sin depuración','No debug','非调试'):T('Depuración','Debug','调试/非标准')));
      paragraph(detail,T('Media / pico','Average / peak','平均 / 峰值')+' · '+r.seconds.toFixed(2)+'s · '+T('Pico a ','Peak at ','峰值时刻 ')+r.peak.at.toFixed(2)+'s / '+r.peak.seconds.toFixed(2)+'s');
      paragraph(detail,T('Calidad / estrellas medias','Mean quality / stars','平均品质 / 星级')+' '+(q?.average??0).toFixed(2)+' / '+(q?.averageStars??0).toFixed(2)+' · '+T('Entrenador','Trainer','训练家')+' Lv.'+team.trainerLevel);
      paragraph(detail,(team.bonds||[]).map(b=>(b.category==='types'?G.T(G.U.TYPE_NAME[b.id]):b.category==='skill'?G.Expedition.skillLabel(b.id):G.ExpeditionTerms.egg(+b.id))+' '+b.count+' / '+b.layers).join(' · '));
      const raw=document.createElement('pre');raw.textContent=JSON.stringify(r,null,2);detail.append(raw);box.append(detail);
    }
    if(!data.records.length)paragraph(box,T('Sin registros','No records','暂无记录'));
    if(data.next)paragraph(box,T('Se muestran los 50 más recientes; exporta para ver todos.','Showing the latest 50; export to inspect all matching records.','页面显示最近50条；导出可获取当前筛选的全部保留记录。'));
  }
  async function exportDps(format){
    const records=[];let cursor='';do{const page=await G.Server.api(query(cursor,500));records.push(...page.records);cursor=page.next;}while(cursor&&records.length<10000);
    const fields=['uid','name','run','day','version','event','outcome','clean','seconds','damage','averageDps','peakDps','peakAt','peakWindowSeconds','peakTeam','initial','final','sources'];
    const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const rows=records.map(r=>({...r,peakDps:r.peak.dps,peakAt:r.peak.at,peakWindowSeconds:r.peak.seconds,peakTeam:r.peak.team}));
    const content=format==='json'?JSON.stringify({source:'client-reported',records},null,2):'\uFEFF'+[fields.join(','),...rows.map(r=>fields.map(k=>csv(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:format==='json'?'application/json':'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='expedition-dps.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return { init, open };
})();
