/* Sólo previsualización de recursos: sin reglas de evolución ni cambios de stats. */
G.MegaPreview = (() => {
  const LIST = G.MEGA_FORMS || [];
  const BY_ID = Object.fromEntries(LIST.map(f => [f.id, f]));
  function label(f) {
    const suffix = f.form.replace('Mega', '').replace('_', ' ');
    return G.T('Mega') + ' ' + G.T((G.DEX_BY[f.dex] || {}).name || f.name) + suffix;
  }
  function allowed(p) {
    return !!(p && !p.dead && G.Dev && G.Dev.canUse() && G.Game && G.Game.player === p &&
      !['ui', 'over'].includes(G.Game.state) && !G.Coop.active);
  }
  function restore(p) {
    if (!p || !p.megaForm) return false;
    const dir = p.anim.dir;
    p.spriteDex = p.dex; p.megaForm = null;
    p.anim = new G.Sprites.Animator(p.dex, 1, p.shiny); p.anim.dir = dir;
    p.bodyH = G.Sprites.bodyHeight(p.dex);
    return true;
  }
  function apply(p, id, shiny = false) {
    const f = BY_ID[id];
    if (!allowed(p) || !f || !f.available || f.dex !== p.dex || shiny && !f.meta.sh) return false;
    G.Game.debugMark();
    const dir = p.anim.dir;
    p.spriteDex = id; p.megaForm = id;
    p.anim = new G.Sprites.Animator(id, 1, shiny); p.anim.dir = dir;
    p.bodyH = G.Sprites.bodyHeight(id);
    G.Sprites.preload([id], 8000, shiny);
    return true;
  }
  function play(p, anim) {
    if (!allowed(p) || !G.Sprites.ANIMS.includes(anim)) return false;
    G.Game.debugMark(); p.anim.play(anim); return true;
  }
  G.I18n.add({'Mega': 'Mega', 'Vista previa de recursos': 'Asset preview'});
  G.I18n.addChinese({'Mega': '超级', 'Vista previa de recursos': '素材预览'});
  return {LIST, BY_ID, label, apply, restore, play};
})();
