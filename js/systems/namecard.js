/* ============ namecard.js — Player custom namecard catalog, unlocks & normalization ============
 * Shared between browser client and server/domain.cjs (zero DOM dependency).
 */
G.Namecard = (() => {
  const local = v => (typeof v === 'object' && v) ? (v[G.I18n?.lang] || v.zh || v.en || v.es || '') : String(v || '');
  const L = (es, en, zh) => ({ es, en, zh });
  const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
  const TYPE_COLOR = {
    normal:'#a8a77a', fire:'#ee8130', water:'#6390f0', grass:'#7ac74c', electric:'#f7d02c', ice:'#96d9d6',
    fighting:'#c22e28', poison:'#a33ea1', ground:'#e2bf65', flying:'#a98ff3', psychic:'#f95587', bug:'#a6b91a',
    rock:'#b6a136', ghost:'#735797', dragon:'#6f35fc', dark:'#705746', steel:'#b7b7ce', fairy:'#d685ad'
  };
  const TYPE_LABEL = {
    normal:L('Normal','Normal','一般'), fire:L('Fuego','Fire','火'), water:L('Agua','Water','水'), grass:L('Planta','Grass','草'),
    electric:L('Eléctrico','Electric','电'), ice:L('Hielo','Ice','冰'), fighting:L('Lucha','Fighting','格斗'), poison:L('Veneno','Poison','毒'),
    ground:L('Tierra','Ground','地面'), flying:L('Volador','Flying','飞行'), psychic:L('Psíquico','Psychic','超能力'), bug:L('Bicho','Bug','虫'),
    rock:L('Roca','Rock','岩石'), ghost:L('Fantasma','Ghost','幽灵'), dragon:L('Dragón','Dragon','龙'), dark:L('Siniestro','Dark','恶'),
    steel:L('Acero','Steel','钢'), fairy:L('Hada','Fairy','妖精')
  };

  const rankOf = s => G.LeagueRank ? G.LeagueRank.view(s) : { tier: 1, stars: 0, points: 0, protocol: 0, color: '#708090', name: 'R1' };
  const ownedCount = s => Object.keys(s?.owned || {}).filter(d => G.DEX_BY?.[d]).length;
  const shinyCount = s => Object.keys(s?.shiny || {}).filter(d => G.DEX_BY?.[d]).length;
  const achCount = s => Object.keys(s?.ach || {}).filter(k => s.ach[k]).length;
  const medalCount = s => Object.keys(s?.abilityMedals || {}).length;
  const rubyCount = s => G.Difficulty?.completedCount ? G.Difficulty.completedCount(s) : 0;
  const researchCount = s => {
    let n = 0;
    for (const r of Object.values(s?.research || {})) {
      if (r?.claimed) n += Object.values(r.claimed).filter(Boolean).length;
    }
    return n;
  };
  const ownsOrInvited = (s, dex) => !!(G.DEX_BY?.[dex] && (s?.owned?.[dex] || (s?.invites?.[dex] || 0) > 0));
  const ownsShiny = (s, dex) => {
    if (!s?.shiny || !dex) return false;
    if (s.shiny[dex]) return true;
    const root = G.MonProgression?.rootFor?.(dex);
    if (root && s.shiny[root]) return true;
    const fam = G.MonProgression?.familyFor?.(dex) || [];
    return fam.some(d => s.shiny[d]);
  };

  // ---------------- 1. Trainer Avatars ----------------
  const TRAINER_AVATARS = [
    { id: 'partner', name: L('Mi Pokémon','My Pokémon','我的宝可梦'), hair:'#57d66d', coat:'#2a4d3c', accent:'#8cf2b0', hat:'none',
      check: () => true, desc: L('Usa tu compañero elegido.','Uses your selected partner.','使用名片展示的宝可梦。') },
    { id: 'tr_boy', name: L('Entrenador','Trainer (Red)','训练家 · 少年'), hair:'#1c2230', coat:'#d9434e', accent:'#ffd24c', hat:'cap_red',
      check: () => true, desc: L('Disponible desde el inicio.','Available by default.','默认解锁。') },
    { id: 'tr_girl', name: L('Entrenadora','Trainer (May)','训练家 · 少女'), hair:'#7a4834', coat:'#eb5b72', accent:'#fff2a6', hat:'sunhat',
      check: () => true, desc: L('Disponible desde el inicio.','Available by default.','默认解锁。') },
    { id: 'tr_assistant', name: L('Asistente','Lab Assistant','研究所助手'), hair:'#4b382a', coat:'#e6eef8', accent:'#4cc99b', hat:'glasses',
      check: s => researchCount(s) >= 1, desc: L('Completa 1 tarea de investigación.','Complete 1 Research task.','完成 1 项宝可梦研究任务解锁。') },
    { id: 'tr_ranger', name: L('Guardabosques','Forest Ranger','森林守卫'), hair:'#26543d', coat:'#2f7d57', accent:'#9df2a8', hat:'bandana',
      check: s => ownedCount(s) >= 30, desc: L('Registra 30 Pokémon en la Pokédex.','Register 30 Pokémon in the Pokédex.','图鉴登记 30 只宝可梦解锁。') },
    { id: 'tr_explorer', name: L('Explorador','Explorer','探险家'), hair:'#5f412b', coat:'#b87a3d', accent:'#f6d57a', hat:'explorer',
      check: s => (s?.stats?.runs || 0) >= 5, desc: L('Completa 5 aventuras.','Complete 5 runs.','累计进行 5 局冒险解锁。') },
    { id: 'tr_veteran', name: L('Veterano','Veteran','老手训练家'), hair:'#8f9db5', coat:'#3c4a6b', accent:'#c8d6f0', hat:'visor',
      check: s => rankOf(s).tier >= 3, desc: L('Alcanza el rango R3 en la Liga.','Reach League Rank R3.','联盟段位达到 R3 解锁。') },
    { id: 'tr_ace', name: L('As de la Liga','Ace Trainer','王牌训练家'), hair:'#2b3252', coat:'#3552a8', accent:'#70b8ff', hat:'spiky',
      check: s => rankOf(s).tier >= 5, desc: L('Alcanza el rango R5 en la Liga.','Reach League Rank R5.','联盟段位达到 R5 解锁。') },
    { id: 'tr_elite', name: L('Alto Mando','Elite Four','四天王'), hair:'#4b246e', coat:'#6d329c', accent:'#e0a8ff', hat:'tiara',
      check: s => rankOf(s).tier >= 6, desc: L('Alcanza el rango R6 en la Liga.','Reach League Rank R6.','联盟段位达到 R6 解锁。') },
    { id: 'tr_champion', name: L('Campeón','Champion','联盟冠军'), hair:'#1b1e2b', coat:'#b83227', accent:'#ffb938', hat:'crown',
      check: s => rankOf(s).tier >= 7, desc: L('Alcanza el rango R7 en la Liga.','Reach League Rank R7.','联盟段位达到 R7 解锁。') },
    { id: 'tr_master', name: L('Maestro del Salón','Hall Master','殿堂大师'), hair:'#d8f8ff', coat:'#155e75', accent:'#3ef2ff', hat:'halo',
      check: s => rankOf(s).tier >= 8, desc: L('Alcanza el rango R8 en la Liga.','Reach League Rank R8.','联盟段位达到 R8 解锁。') },
    { id: 'tr_shiny', name: L('Cazador Shiny','Shiny Hunter','闪光猎手'), hair:'#d99b26', coat:'#2c244f', accent:'#7df2ff', hat:'star',
      check: s => shinyCount(s) >= 3, desc: L('Consigue 3 Pokémon shiny.','Obtain 3 shiny Pokémon.','拥有 3 只异色宝可梦解锁。') },
    { id: 'tr_collector', name: L('Naturalista','Naturalist','博物学家'), hair:'#3d5c3a', coat:'#4b6e58', accent:'#ffd27d', hat:'beret',
      check: s => ownedCount(s) >= 150, desc: L('Registra 150 Pokémon en la Pokédex.','Register 150 Pokémon in the Pokédex.','图鉴登记 150 只宝可梦解锁。') }
  ];
  const TRAINER_BY = Object.fromEntries(TRAINER_AVATARS.map(x => [x.id, x]));

  // ---------------- 2. Avatar Frames (including R7 & R8 rank rewards!) ----------------
  const AVATAR_FRAMES = [
    { id: 'none', name: L('Sin marco','No Frame','无头像框'), color: '#4c5b78', ring: 'none',
      check: () => true, desc: L('Marco clásico sin adornos.','Clean default circular avatar.','经典默认圆形头像。') },
    { id: 'emerald_leaf', name: L('Brote Esmeralda','Emerald Sprout','青翠初芽框'), color: '#57d66d', ring: 'emerald',
      check: s => ownedCount(s) >= 20, desc: L('Registra 20 Pokémon en la Pokédex.','Register 20 Pokémon in the Pokédex.','图鉴登记 20 只宝可梦解锁。') },
    { id: 'cobalt_wave', name: L('Marea Cobalto','Cobalt Tide','蔚蓝潮汐框'), color: '#52a8ff', ring: 'cobalt',
      check: s => achCount(s) >= 5, desc: L('Consigue 5 logros.','Complete 5 achievements.','达成 5 项成就解锁。') },
    { id: 'shiny_spark', name: L('Destello Shiny','Shiny Halo','星辉异色框'), color: '#7ce8ff', ring: 'shiny',
      check: s => shinyCount(s) >= 1, desc: L('Consigue 1 Pokémon shiny.','Obtain 1 shiny Pokémon.','拥有 1 只异色宝可梦解锁。') },
    { id: 'medal_scholar', name: L('Erudito de Medallas','Medal Scholar','勋章学者框'), color: '#c48aff', ring: 'scholar',
      check: s => medalCount(s) >= 10, desc: L('Reúne 10 medallas de habilidad.','Collect 10 Captain Ability Medals.','收集 10 枚队长特性勋章解锁。') },
    { id: 'rank_r7', name: L('Marco Llama de Campeón','Champion Flame Frame','炽焰冠军框'), color: '#ff5a2c', ring: 'r7', rankTier: 7,
      check: s => rankOf(s).tier >= 7 || (s?.avatarFrames || []).includes('rank_r7'),
      desc: L('Recompensa única al alcanzar R7 (Campeón de la Liga).','One-time reward for reaching League Rank R7 (Champion Tier).','联盟段位达到 R7（联盟冠军级）一次性奖励解锁。') },
    { id: 'rank_r8', name: L('Marco Salón de la Fama','Hall of Fame Aura Frame','星辰殿堂框'), color: '#00f0ff', ring: 'r8', rankTier: 8,
      check: s => rankOf(s).tier >= 8 || (s?.avatarFrames || []).includes('rank_r8'),
      desc: L('Recompensa única al alcanzar R8 (Maestro del Salón de la Fama).','One-time reward for reaching League Rank R8 (Hall of Fame Master).','联盟段位达到 R8（殿堂大师）一次性奖励解锁。') },
    { id: 'champion_prism', name: L('Prisma del Campeón','Champion Road Prism','冠军之路棱镜框'), color: '#ff3b9a', ring: 'prism', rankTier: 9,
      check: s => rankOf(s).protocol >= 1,
      desc: L('Completa la primera etapa del Camino del Campeón (P1).','Clear Champion Road Stage 1 (P1).','完成冠军之路第 1 阶（P1）解锁。') }
  ];
  const FRAME_BY = Object.fromEntries(AVATAR_FRAMES.map(x => [x.id, x]));

  // ---------------- 3. Backgrounds (None + Card Pack themes + Milestone scenes) ----------------
  const MILESTONE_BGS = [
    { id: 'amethyst_cave', name: L('Cueva Amatista','Amethyst Cavern','紫晶洞穴'), accent: '#a86dff', style: 'amethyst_cave',
      check: s => achCount(s) >= 10, desc: L('Consigue 10 logros.','Complete 10 achievements.','达成 10 项成就解锁。') },
    { id: 'night_glacier', name: L('Glaciar Nocturno','Night Glacier','夜之冰川'), accent: '#7cd8ff', style: 'night_glacier',
      check: s => rankOf(s).tier >= 3, desc: L('Alcanza el rango R3 en la Liga.','Reach League Rank R3.','联盟段位达到 R3 解锁。') },
    { id: 'crimson_citadel', name: L('Castillo Luna Roja','Crimson Moon Keep','红月城堡'), accent: '#ff5d6c', style: 'crimson_citadel',
      check: s => (s?.stats?.bossesTotal || 0) >= 10, desc: L('Derrota a 10 jefes en total.','Defeat 10 Bosses in total.','累计击败 10 个 BOSS 解锁。') },
    { id: 'circuit_city', name: L('Ciudad Circuito','Circuit City','电路之城'), accent: '#3be3c4', style: 'circuit_city',
      check: s => rankOf(s).tier >= 5, desc: L('Alcanza el rango R5 en la Liga.','Reach League Rank R5.','联盟段位达到 R5 解锁。') },
    { id: 'champion_bonfire', name: L('Hoguera de Campeones','Champion Bonfire','冠军篝火'), accent: '#ff9642', style: 'champion_bonfire',
      check: s => rankOf(s).tier >= 7, desc: L('Alcanza el rango R7 en la Liga.','Reach League Rank R7.','联盟段位达到 R7 解锁。') },
    { id: 'celestial_hall', name: L('Mar de Nubes','Celestial Cloud Sea','云海殿堂'), accent: '#56f0ff', style: 'celestial_hall',
      check: s => rankOf(s).tier >= 8, desc: L('Alcanza el rango R8 en la Liga.','Reach League Rank R8.','联盟段位达到 R8 解锁。') }
  ];

  function backgrounds(s) {
    const p = G.CardPacks?.normalize ? G.CardPacks.normalize(s) : null;
    const list = [
      { id: 'none', name: L('Sin fondo','No Background','无背景'), accent: '#57d66d', kind: 'default', unlocked: true, desc: L('Fondo limpio predeterminado.','Clean default dark banner.','默认极简深空背景。') }
    ];
    for (const t of G.CardPacks?.themes || []) {
      const unlocked = !!(p && p.taken['theme:' + t.id]);
      list.push({
        id: 'theme:' + t.id, themeId: t.id, name: t.name, accent: t.color, kind: 'pack',
        unlocked,
        desc: L('Se obtiene en el Paquete Primeros Pasos.','Unlocked from the Beginner Card Pack.','从「初心者卡包」获取解锁。')
      });
    }
    for (const bg of MILESTONE_BGS) {
      list.push({ ...bg, kind: 'milestone', unlocked: bg.check(s) });
    }
    return list;
  }

  // ---------------- 4. Nameplates & Edges ----------------
  const NAMEPLATES = [
    { id: 'default', name: L('Clásico','Classic Dark','经典深空'), accent: '#57d66d', check: () => true, desc: L('Disponible para todos.','Available to everyone.','默认解锁。') },
    { id: 'partner_motif', name: L('Motivo de Compañero','Partner Motif','伙伴剪影'), accent: '#7dd3fc', check: () => true, desc: L('Muestra la silueta de tu compañero en la placa.','Displays a subtle portrait of your partner inside the nameplate.','在名牌右侧展示伙伴像素特写。') },
    ...TYPES.map(t => ({
      id: 'type:' + t, type: t, name: L('Tipo ' + TYPE_LABEL[t].es, TYPE_LABEL[t].en + ' Type', TYPE_LABEL[t].zh + '属性'),
      accent: TYPE_COLOR[t], check: () => true, desc: L('Placa elemental libre para todos.','Elemental nameplate available to everyone.','属性主题名牌，所有训练家可用。')
    })),
    { id: 'gold_velvet', name: L('Terciopelo Dorado','Gilded Velvet','鎏金丝绒'), accent: '#ffd24c', check: s => rankOf(s).tier >= 4, desc: L('Alcanza el rango R4 en la Liga.','Reach League Rank R4.','联盟段位达到 R4 解锁。') },
    { id: 'prism_aurora', name: L('Aurora Prisma','Prismatic Aurora','极光棱镜'), accent: '#3ef2ff', check: s => rankOf(s).tier >= 8, desc: L('Alcanza el rango R8 en la Liga.','Reach League Rank R8.','联盟段位达到 R8 解锁。') }
  ];
  const NAMEPLATE_BY = Object.fromEntries(NAMEPLATES.map(x => [x.id, x]));

  const NAMEPLATE_EDGES = [
    { id: 'corner', name: L('Esquinas neón','Neon Brackets','荧光角标'), check: () => true, desc: L('Esquinas luminosas al estilo moderno.','Glowing corner brackets.','经典高亮四角边饰。') },
    { id: 'solid', name: L('Borde continuo','Clean Border','简约实线'), check: () => true, desc: L('Línea fina perimetral.','Crisp continuous frame.','纤细高光外框。') },
    { id: 'none', name: L('Sin borde','Borderless','无边缘'), check: () => true, desc: L('Placa minimalista sin marco.','Minimalist borderless plate.','极简无边框样式。') },
    { id: 'glow', name: L('Aura radiante','Radiant Glow','霓虹光晕'), check: s => rankOf(s).tier >= 2, desc: L('Alcanza el rango R2 en la Liga.','Reach League Rank R2.','联盟段位达到 R2 解锁。') },
    { id: 'double', name: L('Doble filigrana','Double Filigree','双层金边'), check: s => rankOf(s).tier >= 5, desc: L('Alcanza el rango R5 en la Liga.','Reach League Rank R5.','联盟段位达到 R5 解锁。') }
  ];
  const EDGE_BY = Object.fromEntries(NAMEPLATE_EDGES.map(x => [x.id, x]));

  // ---------------- 5. Showcase Capsules (陈列柜) ----------------
  const GENERAL_SHOWCASES = [
    { id: 'dex', name: L('Pokédex registrada','Pokédex Registered','图鉴登记'), color: '#57d66d', icon: 'dex' },
    { id: 'shiny', name: L('Colección Shiny','Shiny Collection','异色收集'), color: '#7ce8ff', icon: 'shiny' },
    { id: 'ability_medals', name: L('Medallas de habilidad','Captain Medals','特性勋章'), color: '#c48aff', icon: 'medal' },
    { id: 'ruby_medals', name: L('Pokémon 8★ completos','Full-Medal Pokémon','满勋章宝可梦'), color: '#ff5b7f', icon: 'ruby' },
    { id: 'league_rank', name: L('Rango de la Liga','League Rank','联盟段位'), color: '#ffd24c', icon: 'crown' },
    { id: 'achievements', name: L('Logros completados','Achievements','成就达成'), color: '#f59e0b', icon: 'trophy' },
    { id: 'runs', name: L('Partidas jugadas','Adventures Played','冒险场次'), color: '#60a5fa', icon: 'runs' },
    { id: 'kills', name: L('Enemigos derrotados','Foes Defeated','累计击败'), color: '#f87171', icon: 'kills' }
  ];
  const TYPE_SHOWCASES = TYPES.map(t => ({
    id: 'type:' + t, type: t,
    name: L(TYPE_LABEL[t].es + ' registrados', TYPE_LABEL[t].en + '-type Registered', '已登记的' + TYPE_LABEL[t].zh + '属性'),
    shortName: L('Tipo ' + TYPE_LABEL[t].es, TYPE_LABEL[t].en + ' Type', TYPE_LABEL[t].zh + '属性'),
    color: TYPE_COLOR[t], icon: 'type:' + t
  }));
  const SHOWCASES = [...GENERAL_SHOWCASES, ...TYPE_SHOWCASES];
  const SHOWCASE_BY = Object.fromEntries(SHOWCASES.map(x => [x.id, x]));

  let dexTypeTotals = null;
  function typeTotals() {
    if (dexTypeTotals) return dexTypeTotals;
    dexTypeTotals = Object.fromEntries(TYPES.map(t => [t, 0]));
    for (const m of G.DEX || []) for (const t of m.types || []) if (dexTypeTotals[t] != null) dexTypeTotals[t]++;
    return dexTypeTotals;
  }

  function showcaseValue(s, id) {
    const def = SHOWCASE_BY[id] || SHOWCASE_BY.dex;
    const totalDex = (G.DEX || []).length || 966;
    if (def.type) {
      let owned = 0;
      for (const d of Object.keys(s?.owned || {})) {
        const m = G.DEX_BY?.[d];
        if (m && m.types.includes(def.type)) owned++;
      }
      const goal = typeTotals()[def.type] || 1;
      return { id: def.id, label: local(def.shortName || def.name), fullLabel: local(def.name), value: owned, goal, display: `${owned}/${goal}`, pct: Math.min(100, owned / goal * 100), color: def.color, icon: def.icon };
    }
    if (def.id === 'dex') {
      const v = ownedCount(s);
      return { id: def.id, label: local(def.name), fullLabel: local(def.name), value: v, goal: totalDex, display: `${v}/${totalDex}`, pct: Math.min(100, v / totalDex * 100), color: def.color, icon: def.icon };
    }
    if (def.id === 'shiny') {
      const v = shinyCount(s);
      return { id: def.id, label: local(def.name), fullLabel: local(def.name), value: v, goal: totalDex, display: `${v}/${totalDex}`, pct: Math.min(100, v / totalDex * 100), color: def.color, icon: def.icon };
    }
    if (def.id === 'ability_medals') {
      const v = medalCount(s);
      const goal = Object.keys(G.AbilityDefs?.BY_ID || {}).length || 508;
      return { id: def.id, label: local(def.name), fullLabel: local(def.name), value: v, goal, display: `${v}/${goal}`, pct: Math.min(100, v / goal * 100), color: def.color, icon: def.icon };
    }
    if (def.id === 'ruby_medals') {
      const v = rubyCount(s);
      return { id: def.id, label: local(def.name), fullLabel: local(def.name), value: v, goal: totalDex, display: `${v}/${totalDex}`, pct: Math.min(100, v / totalDex * 100), color: def.color, icon: def.icon };
    }
    if (def.id === 'league_rank') {
      const r = rankOf(s);
      const goal = r.tier === 8 ? 20 : 21;
      const val = r.tier === 8 ? r.protocol : r.points;
      const disp = r.protocol ? `R8 · P${r.protocol}` : `R${r.tier} · ${r.stars}★`;
      return { id: def.id, label: r.name, fullLabel: local(def.name), value: val, goal, display: disp, pct: Math.min(100, (r.tier === 8 ? (r.protocol / 20) : (r.points / 21)) * 100), color: r.color, icon: def.icon };
    }
    if (def.id === 'achievements') {
      const v = achCount(s);
      const goal = (G.AchDefs?.LIST || []).length || 130;
      return { id: def.id, label: local(def.name), fullLabel: local(def.name), value: v, goal, display: `${v}/${goal}`, pct: Math.min(100, v / goal * 100), color: def.color, icon: def.icon };
    }
    if (def.id === 'runs') {
      const v = Math.max(0, Math.floor(s?.stats?.runs || 0));
      return { id: def.id, label: local(def.name), fullLabel: local(def.name), value: v, goal: 0, display: `${v}`, pct: Math.min(100, v / 100 * 100), color: def.color, icon: def.icon };
    }
    const kills = Math.max(0, Math.floor(s?.stats?.totalKills || 0));
    return { id: 'kills', label: local(def.name), fullLabel: local(def.name), value: kills, goal: 0, display: kills.toLocaleString(), pct: Math.min(100, kills / 100000 * 100), color: def.color, icon: def.icon };
  }

  // ---------------- 6. Badge Strip Borders (徽章边框) ----------------
  const BADGE_FRAMES = [
    { id: 'auto', name: L('Automático','Auto (By Rank)','自动'), color: '#7dd3fc',
      check: () => true, desc: L('Usa automáticamente el borde de tu rango actual en la Liga.','Automatically uses the border matching your current League Rank.','根据当前联盟段位自动匹配最高已解锁边框。') },
    { id: 'none', name: L('Sin borde','No Border','无边框'), color: '#64748b',
      check: () => true, desc: L('Estilo clásico limpio.','Classic clean badge bar.','经典简洁徽章栏。') },
    { id: 'bronze', name: L('R3 · Bronce','R3 · Bronze','R3 · 青铜'), color: '#cd7f32',
      check: s => rankOf(s).tier >= 3, desc: L('Alcanza el rango R3 en la Liga.','Reach League Rank R3.','联盟段位达到 R3 解锁。') },
    { id: 'silver', name: L('R5 · Plata','R5 · Silver','R5 · 白银'), color: '#cbd5e1',
      check: s => rankOf(s).tier >= 5, desc: L('Alcanza el rango R5 en la Liga.','Reach League Rank R5.','联盟段位达到 R5 解锁。') },
    { id: 'emerald', name: L('R6 · Esmeralda','R6 · Emerald','R6 · 翡翠'), color: '#34d399',
      check: s => rankOf(s).tier >= 6, desc: L('Alcanza el rango R6 en la Liga.','Reach League Rank R6.','联盟段位达到 R6 解锁。') },
    { id: 'ruby', name: L('R7 · Rubí','R7 · Ruby','R7 · 红宝石'), color: '#fb7185',
      check: s => rankOf(s).tier >= 7, desc: L('Alcanza el rango R7 en la Liga.','Reach League Rank R7.','联盟段位达到 R7 解锁。') },
    { id: 'gold', name: L('R8 · Oro','R8 · Radiant Gold','R8 · 璀璨金'), color: '#fbbf24',
      check: s => rankOf(s).tier >= 8, desc: L('Alcanza el rango R8 en la Liga.','Reach League Rank R8.','联盟段位达到 R8 解锁。') },
    { id: 'champion', name: L('Camino del Campeón','Champion Prism','冠军之路 · 霓虹'), color: '#f472b6',
      check: s => rankOf(s).protocol >= 1, desc: L('Supera la etapa 1 del Camino del Campeón (P1).','Clear Champion Road Stage 1 (P1).','完成冠军之路第 1 阶（P1）解锁。') }
  ];
  const BADGE_FRAME_BY = Object.fromEntries(BADGE_FRAMES.map(x => [x.id, x]));

  function resolveBadgeFrame(s, id) {
    if (id !== 'auto') return BADGE_FRAME_BY[id] ? id : 'none';
    const r = rankOf(s);
    if (r.protocol >= 1) return 'champion';
    if (r.tier >= 8) return 'gold';
    if (r.tier >= 7) return 'ruby';
    if (r.tier >= 6) return 'emerald';
    if (r.tier >= 5) return 'silver';
    if (r.tier >= 3) return 'bronze';
    return 'none';
  }

  // ---------------- 7. Unified Title Catalog (League Rank + Achievements + Research) ----------------
  function resolveTitleLabel(raw) {
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('rank:')) {
      const m = Object.values(G.LeagueRank?.TIER_MILESTONES || {}).find(x => x.title?.id === raw);
      if (m?.title) return local(m.title);
    }
    return raw;
  }

  function allTitles(s) {
    const r = rankOf(s);
    const out = [];
    const seen = new Set();
    // League rank titles R4..R8 & P1 (shown even if locked so players see progression!)
    for (const [key, m] of Object.entries(G.LeagueRank?.TIER_MILESTONES || {})) {
      if (!m.title) continue;
      const isP1 = key === 'p1';
      const unlocked = isP1 ? r.protocol >= 1 : r.tier >= Number(key);
      const label = local(m.title);
      seen.add(m.title.id);
      seen.add(label);
      out.push({
        id: m.title.id,
        label,
        source: 'rank',
        tier: isP1 ? 9 : Number(key),
        color: isP1 ? '#ff007f' : (G.LeagueRank?.TIERS?.[Number(key) - 1]?.color || '#ffd700'),
        unlocked,
        desc: isP1
          ? L('Completa la etapa 1 del Camino del Campeón (P1).','Clear Champion Road Stage 1 (P1).','完成冠军之路第 1 阶（P1）解锁。')
          : L('Alcanza el rango R' + key + ' en la Liga.','Reach League Rank R' + key + '.','联盟段位达到 R' + key + ' 解锁。')
      });
    }
    // Achievement titles
    for (const a of G.AchDefs?.LIST || []) {
      if (!a.title || seen.has(a.title)) continue;
      const unlocked = !!(s?.ach && s.ach[a.id]);
      if (!unlocked) continue;
      seen.add(a.title);
      out.push({
        id: a.title,
        label: G.T ? G.T(a.title) : a.title,
        source: 'ach',
        color: '#f5b935',
        unlocked: true,
        desc: L('Logro: ' + a.name, 'Achievement: ' + a.name, '成就解锁：' + (G.T ? G.T(a.name) : a.name))
      });
    }
    // Research titles stored in s.titles
    for (const t of s?.titles || []) {
      if (!t || typeof t !== 'string' || seen.has(t)) continue;
      seen.add(t);
      out.push({
        id: t,
        label: resolveTitleLabel(t),
        source: 'research',
        color: '#60a5fa',
        unlocked: true,
        desc: L('Desbloqueado en Investigación Pokémon.','Unlocked via Pokémon Research.','宝可梦研究任务解锁。')
      });
    }
    return out;
  }

  function isTitleUnlocked(s, titleId) {
    if (!titleId) return true;
    const list = allTitles(s);
    const hit = list.find(t => t.id === titleId || t.label === titleId);
    if (hit) return hit.unlocked;
    if (titleId.startsWith('rank:')) return false;
    // When running in server domain without AchDefs loaded, allow existing achievement title strings.
    return !G.AchDefs;
  }

  // ---------------- 8. Badge Strip Counts ----------------
  function badgeCounts(s) {
    const r = rankOf(s);
    return [
      { id: 'ruby', icon: 'ruby', count: rubyCount(s), label: L('8★ completos','Full-Medal','满勋章') },
      { id: 'medals', icon: 'medal', count: medalCount(s), label: L('Medallas Cap.','Cap. Medals','特性勋章') },
      { id: 'shiny', icon: 'shiny', count: shinyCount(s), label: L('Shinies','Shinies','异色') },
      { id: 'ach', icon: 'trophy', count: achCount(s), label: L('Logros','Achievements','成就') },
      { id: 'legends', icon: 'star', count: Object.keys(s?.legends || {}).length, label: L('Legendarios','Legendaries','传说击败') },
      { id: 'protocol', icon: 'crown', count: r.protocol || 0, label: L('Camino Campeón','Champ. Road','冠军之路') }
    ];
  }

  // ---------------- 9. Normalization & Sanitization ----------------
  function sanitizePreset(s, raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const bgs = backgrounds(s);
    const bgItem = bgs.find(b => b.id === raw.bg && b.unlocked);
    const frameItem = FRAME_BY[raw.avatarFrame];
    const npItem = NAMEPLATE_BY[raw.nameplate];
    const edgeItem = EDGE_BY[raw.nameplateEdge];
    const bfItem = BADGE_FRAME_BY[raw.badgeFrame];
    const pDex = Number.isInteger(+raw.partnerDex) && ownsOrInvited(s, +raw.partnerDex) ? +raw.partnerDex : 0;
    const pShiny = !!(raw.partnerShiny && ownsShiny(s, pDex || s?.partner));
    let avatarType = raw.avatarType === 'trainer' ? 'trainer' : 'pokemon';
    let avatarId = typeof raw.avatarId === 'string' ? raw.avatarId.slice(0, 32) : '';
    if (avatarType === 'trainer') {
      const tr = TRAINER_BY[avatarId];
      if (!tr || !tr.check(s)) { avatarType = 'pokemon'; avatarId = 'partner'; }
    } else if (avatarId && avatarId !== 'partner') {
      const d = +avatarId;
      if (!ownsOrInvited(s, d) && !(s?.avatars || []).includes(d)) avatarId = 'partner';
    } else {
      avatarId = 'partner';
    }
    const avatarDex = avatarType === 'pokemon' ? (avatarId === 'partner' ? (pDex || s?.partner || 0) : +avatarId) : 0;
    const avatarShiny = !!(avatarType === 'pokemon' && raw.avatarShiny && ownsShiny(s, avatarDex));
    const titleStr = typeof raw.title === 'string' ? raw.title.slice(0, 40) : '';
    return {
      title: isTitleUnlocked(s, titleStr) ? titleStr : '',
      avatarType,
      avatarId,
      avatarShiny,
      avatarFrame: frameItem && frameItem.check(s) ? frameItem.id : 'none',
      bg: bgItem ? bgItem.id : 'none',
      nameplate: npItem && npItem.check(s) ? npItem.id : 'default',
      nameplateEdge: edgeItem && edgeItem.check(s) ? edgeItem.id : 'corner',
      showcase: SHOWCASE_BY[raw.showcase] ? raw.showcase : 'dex',
      badgeFrame: bfItem && bfItem.check(s) ? bfItem.id : 'auto',
      partnerDex: pDex,
      partnerShiny: pShiny
    };
  }

  function normalize(s) {
    if (!s) return null;
    if (!s.profile || typeof s.profile !== 'object' || Array.isArray(s.profile)) s.profile = {};
    const P = s.profile;
    // Sync legacy cardPack.theme -> profile.bg if bg was never configured
    const packTheme = G.CardPacks?.normalize ? G.CardPacks.normalize(s).theme : '';
    if ((!P.bg || P.bg === 'none') && packTheme && P.bgExplicit !== true) {
      P.bg = 'theme:' + packTheme;
    }
    // Legacy numeric avatar -> pokemon avatarId
    if (!P.avatarId && P.avatar && G.DEX_BY?.[P.avatar]) {
      P.avatarType = 'pokemon';
      P.avatarId = String(P.avatar);
    }
    const clean = sanitizePreset(s, P) || {
      title: '', avatarType: 'pokemon', avatarId: 'partner', avatarShiny: false,
      avatarFrame: 'none', bg: 'none', nameplate: 'default', nameplateEdge: 'corner',
      showcase: 'dex', badgeFrame: 'auto', partnerDex: 0, partnerShiny: false
    };
    const favs = Array.isArray(P.favs)
      ? P.favs.filter(f => f && G.DEX_BY?.[f.dex]).slice(0, 3).map(f => ({ dex: +f.dex, shiny: !!f.shiny }))
      : [];
    const presets = Array.isArray(P.presets)
      ? [0, 1, 2].map(i => sanitizePreset(s, P.presets[i]))
      : [null, null, null];
    const legacyAvatar = clean.avatarType === 'pokemon' && clean.avatarId !== 'partner' ? (+clean.avatarId || 0) : 0;
    s.profile = {
      ...clean,
      bgExplicit: P.bgExplicit === true,
      avatar: legacyAvatar,
      favs,
      presets
    };
    return s.profile;
  }

  function publicData(s, overrides = {}) {
    const P = normalize(s);
    const r = rankOf(s);
    const partnerDex = P.partnerDex || s.partner || 25;
    const partnerShiny = P.partnerDex ? P.partnerShiny : (!!s.partnerShiny && ownsShiny(s, partnerDex));
    const avatarDex = P.avatarType === 'pokemon'
      ? (P.avatarId && P.avatarId !== 'partner' ? +P.avatarId : partnerDex)
      : 0;
    const avatarShiny = P.avatarType === 'pokemon'
      ? (P.avatarId && P.avatarId !== 'partner' ? P.avatarShiny : partnerShiny)
      : false;
    return {
      name: overrides.name ?? s.name ?? '',
      created: s.created || Date.now(),
      title: resolveTitleLabel(P.title),
      titleId: P.title,
      leagueRank: r,
      avatarType: P.avatarType,
      avatarId: P.avatarId,
      avatarDex,
      avatarShiny,
      avatarFrame: P.avatarFrame,
      bg: P.bg,
      nameplate: P.nameplate,
      nameplateEdge: P.nameplateEdge,
      showcase: showcaseValue(s, P.showcase),
      badgeFrame: P.badgeFrame,
      resolvedBadgeFrame: resolveBadgeFrame(s, P.badgeFrame),
      badges: badgeCounts(s),
      partnerDex,
      partnerShiny,
      favs: P.favs,
      ...overrides
    };
  }

  function randomize(s, base) {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const unlockedFrames = AVATAR_FRAMES.filter(x => x.check(s));
    const unlockedBgs = backgrounds(s).filter(x => x.unlocked);
    const unlockedPlates = NAMEPLATES.filter(x => x.check(s));
    const unlockedEdges = NAMEPLATE_EDGES.filter(x => x.check(s));
    const unlockedBadgeFrames = BADGE_FRAMES.filter(x => x.check(s));
    const unlockedTitles = allTitles(s).filter(x => x.unlocked);
    const ownedDex = Object.keys(s?.owned || {}).map(Number).filter(d => G.DEX_BY?.[d]);
    const pDex = ownedDex.length ? pick(ownedDex) : (s?.partner || 25);
    const pShiny = ownsShiny(s, pDex) && Math.random() < 0.5;
    const unlockedTrainers = TRAINER_AVATARS.filter(x => x.check(s));
    const useTrainer = Math.random() < 0.45 && unlockedTrainers.length > 1;
    const tr = useTrainer ? pick(unlockedTrainers.filter(x => x.id !== 'partner')) : null;
    return {
      ...base,
      title: unlockedTitles.length && Math.random() < 0.75 ? pick(unlockedTitles).id : '',
      avatarType: tr ? 'trainer' : 'pokemon',
      avatarId: tr ? tr.id : 'partner',
      avatarShiny: tr ? false : pShiny,
      avatarFrame: pick(unlockedFrames).id,
      bg: pick(unlockedBgs).id,
      bgExplicit: true,
      nameplate: pick(unlockedPlates).id,
      nameplateEdge: pick(unlockedEdges).id,
      showcase: pick(SHOWCASES).id,
      badgeFrame: pick(unlockedBadgeFrames).id,
      partnerDex: pDex,
      partnerShiny: pShiny
    };
  }

  return {
    local, TYPES, TYPE_COLOR, TYPE_LABEL,
    TRAINER_AVATARS, TRAINER_BY,
    AVATAR_FRAMES, FRAME_BY,
    MILESTONE_BGS, backgrounds,
    NAMEPLATES, NAMEPLATE_BY,
    NAMEPLATE_EDGES, EDGE_BY,
    GENERAL_SHOWCASES, TYPE_SHOWCASES, SHOWCASES, SHOWCASE_BY, showcaseValue,
    BADGE_FRAMES, BADGE_FRAME_BY, resolveBadgeFrame,
    allTitles, resolveTitleLabel, isTitleUnlocked,
    badgeCounts, ownsOrInvited, ownsShiny,
    sanitizePreset, normalize, publicData, randomize
  };
})();
