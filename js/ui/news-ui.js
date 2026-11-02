/* ============ news-ui.js — "Novedades" ============
 * Botón en la barra de arriba que abre la lista de cambios del juego
 * (js/data/changelog.js). Lleva un punto mientras haya algo que no has visto.
 */
G.NewsUI = (() => {
  const $ = G.UI.$;
  const KEY = 'ps.news.seen';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const latest = () => {const v=G.CHANGELOG[0];return v?v.d+' '+(v.title?.[0]||''):'';};
  function seen() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

  function init() {
    const b = $('btn-news');
    b.innerHTML = G.Icons.html('book', 18) + ' <span>Novedades</span><i class="dot"></i>';
    b.onclick = open;
    $('news-close').onclick = close;
    refresh();
  }
  function refresh() { $('btn-news').classList.toggle('new', seen() !== latest()); }

  function fmt(d) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(G.I18n.lang === 'zh' ? 'zh-CN' : G.I18n.lang === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function open() {
    const en = G.I18n.lang === 'en' ? 1 : 0;
    const localized = pair => G.I18n.lang === 'zh' ? G.T(pair[0]) : pair[en];
    // Cada texto ya va en su idioma: translate="no" para que no lo toque i18n.
    const PARTS = [['new', ['Nuevo', 'New']], ['chg', ['Cambios', 'Changes']], ['fix', ['Arreglos', 'Fixes']]];
    $('news-body').innerHTML = (G.CHANGELOG_TEAM?`<p class="news-team" translate="no">${esc(localized(G.CHANGELOG_TEAM))}</p>`:'') + G.CHANGELOG.map(v =>
      `<div class="news-day" translate="no"><h3>${esc(v.title ? localized(v.title) : '')}<small>${fmt(v.d)}</small></h3>` +
      PARTS.filter(([k]) => v[k] && v[k].length).map(([k, lbl]) =>
        `<div class="news-part"><span class="news-tag ${k}">${esc(localized(lbl))}</span><ul>${v[k].map(t => `<li>${esc(localized(t))}</li>`).join('')}</ul></div>`).join('') +
      (v.profile&&G.DB.mode==='server'&&G.DB.online?`<p><button class="btn small" data-news-profile="${esc(v.profile)}" translate="no">${esc(localized(['Conoce a Dafeiyu','Meet Dafeiyu']))}</button></p>`:'') +
      (v.note?`<p class="news-note" translate="no"><b>${esc(localized(['Las pequeñas charlas de Dafeiyu','Dafeiyu’s little musings']))}</b><span>${esc(localized(v.note))}</span></p>`:'') + '</div>').join('');
    $('news-body').querySelectorAll('[data-news-profile]').forEach(button=>button.onclick=()=>{close();G.ProfileUI.show(button.dataset.newsProfile);});
    $('news-body').scrollTop = 0;
    $('scr-news').classList.remove('hidden');
    try { localStorage.setItem(KEY, latest()); } catch (e) { /* nada */ }
    refresh();
  }
  function close() { $('scr-news').classList.add('hidden'); }

  return { init, open, close };
})();
