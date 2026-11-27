/* ============ research.js — 宝可梦研究系统与称号/头像奖励 ============ */
G.Research = (() => {
  const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
  const rootOf = dex => (G.MonProgression?.rootFor(+dex)) || +dex;

  const TASKS = [
    {
      id: 'battles',
      stat: 'battles',
      goal: 3,
      rewardType: 'avatar',
      label: () => L('Participar en 3 combates', 'Complete 3 battles', '出战并完成 3 场战斗'),
      rewardLabel: mon => L('Avatar de ' + mon.name, mon.name + ' Avatar', G.T(mon.name) + ' 专属头像')
    },
    {
      id: 'kills',
      stat: 'kills',
      goal: 150,
      rewardType: 'title',
      titleSuffix: { es: 'Aliado de ', en: 'Partner of ', zh: '之友 · ' },
      label: () => L('Derrotar a 150 enemigos', 'Defeat 150 enemies', '累计击败 150 名敌人'),
      rewardLabel: mon => L('Título: Aliado de ' + mon.name, 'Title: Partner of ' + mon.name, '称号：' + G.T(mon.name) + '之友')
    },
    {
      id: 'bosses',
      stat: 'bosses',
      goal: 3,
      rewardType: 'title',
      titleSuffix: { es: 'Maestro de ', en: 'Master of ', zh: '大师 · ' },
      label: () => L('Derrotar a 3 jefes', 'Defeat 3 bosses', '累计击败 3 个 BOSS'),
      rewardLabel: mon => L('Título: Maestro de ' + mon.name, 'Title: Master of ' + mon.name, '称号：' + G.T(mon.name) + '大师')
    },
    {
      id: 'wins',
      stat: 'wins',
      goal: 1,
      rewardType: 'title',
      titleSuffix: { es: 'Campeón con ', en: 'Champion with ', zh: '冠军 · ' },
      label: () => L('Completar 1 expedición', 'Clear 1 expedition', '作为队长通关 1 次远征'),
      rewardLabel: mon => L('Título: Campeón con ' + mon.name, 'Title: Champion with ' + mon.name, '称号：' + G.T(mon.name) + '冠军')
    }
  ];

  function entry(save, dex) {
    save.research ||= {};
    const r = rootOf(dex);
    return save.research[r] ||= { battles: 0, kills: 0, bosses: 0, wins: 0, maxLv: 0, claimed: {} };
  }

  function recordBattle(run, cleared, save = G.DB?.save) {
    const cap = run?.captain;
    if (!save || !cap || !G.DB?.owns(cap.dex)) return;
    const e = entry(save, cap.dex);
    e.battles = (e.battles || 0) + 1;
    e.kills = (e.kills || 0) + (run.kills || 0);
    if (run.kind === 'boss' || run.kind === 'rift') e.bosses = (e.bosses || 0) + (cleared ? 1 : 0);
    if (run.arceus && cleared) e.wins = (e.wins || 0) + 1;
    e.maxLv = Math.max(e.maxLv || 0, cap.level || 1);
    G.DB.commit(true);
  }

  function titleName(dex, task) {
    const mon = G.DEX_BY?.[rootOf(dex)] || G.DEX_BY?.[dex];
    if (!mon) return '';
    const lang = G.I18n?.lang || 'es';
    if (lang === 'zh') return G.T(mon.name) + (task.id === 'kills' ? '之友' : task.id === 'bosses' ? '大师' : '冠军');
    return (task.titleSuffix?.[lang] || task.titleSuffix?.en || '') + mon.name;
  }

  function tasksFor(dex, save = G.DB?.save) {
    const r = rootOf(dex);
    const mon = G.DEX_BY?.[r] || G.DEX_BY?.[dex];
    const owned = !!G.DB?.owns(dex);
    const e = save?.research?.[r] || { battles: 0, kills: 0, bosses: 0, wins: 0, claimed: {} };
    return TASKS.map(t => {
      const value = e[t.stat] || 0;
      const done = owned && value >= t.goal;
      const claimed = !!e.claimed?.[t.id];
      const rewardId = t.rewardType === 'avatar' ? r : `research:${r}:${t.id}`;
      return {
        id: t.id,
        label: t.label(),
        rewardLabel: t.rewardLabel(mon) + ' · +' + TASK_LEAGUE_COINS + ' ' + L('Monedas Liga', 'League Coins', '联盟币'),
        leagueCoins: TASK_LEAGUE_COINS,
        rewardType: t.rewardType,
        rewardId,
        titleText: t.rewardType === 'title' ? titleName(r, t) : null,
        value: Math.min(t.goal, value),
        goal: t.goal,
        done,
        claimed
      };
    });
  }

  const TASK_LEAGUE_COINS = 200;

  function claim(dex, taskId, save = G.DB?.save) {
    if (!save || !G.DB?.owns(dex)) return false;
    const r = rootOf(dex);
    const list = tasksFor(dex, save);
    const item = list.find(t => t.id === taskId);
    if (!item || !item.done || item.claimed) return false;
    const e = entry(save, dex);
    e.claimed ||= {};
    e.claimed[taskId] = true;
    save.leagueCoins = (save.leagueCoins || 0) + TASK_LEAGUE_COINS;
    if (item.rewardType === 'avatar') {
      save.avatars ||= [];
      if (!save.avatars.includes(r)) save.avatars.push(r);
      if (!save.profile?.avatar) { save.profile ||= { favs: [], title: '', avatar: 0 }; save.profile.avatar = r; }
    } else {
      save.titles ||= [];
      if (!save.titles.includes(item.titleText)) save.titles.push(item.titleText);
      save.profile ||= { favs: [], title: '', avatar: 0 };
      if (!save.profile.title) save.profile.title = item.titleText;
    }
    G.UI?.refreshCoins?.();
    G.DB.commit(true);
    return true;
  }

  function equipTitle(title, save = G.DB?.save) {
    if (!save) return false;
    save.profile ||= { favs: [], title: '', avatar: 0 };
    save.profile.title = title || '';
    G.DB.commit(true);
    return true;
  }

  function equipAvatar(dex, save = G.DB?.save) {
    if (!save) return false;
    save.profile ||= { favs: [], title: '', avatar: 0 };
    save.profile.avatar = +dex || 0;
    G.DB.commit(true);
    return true;
  }

  return { TASKS, rootOf, recordBattle, tasksFor, claim, equipTitle, equipAvatar };
})();
