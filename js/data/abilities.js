/* Cada medalla desbloquea una sola habilidad de un Pokémon concreto. */
G.AbilityDefs = (() => {
  const abilities = {
    pressure: { name: 'Presión', en: 'Pressure', desc: 'Los enemigos a 240 de distancia atacan un 20% menos.', descEn: 'Enemies within 240 units attack 20% less often.' },
    snowcloak: { name: 'Manto Níveo', en: 'Snow Cloak', desc: '10% de evasión contra ataques a distancia. Al esquivar recuperas 5% de vida máxima (1 s entre curaciones). Siempre activo por ahora.', descEn: '10% chance to dodge ranged attacks. Dodging heals 5% max HP (1 s healing cooldown). Always active for now.' },
    static: { name: 'Electricidad Estática', en: 'Static', desc: 'Al recibir daño de contacto, el atacante se ralentiza 10% durante 2 s. Sus ataques de contacto tienen 25% de fallo contra ti.', descEn: 'Taking contact damage slows the attacker by 10% for 2 s. Its contact attacks have a 25% chance to fail against you.' },
    flamebody: { name: 'Cuerpo Llama', en: 'Flame Body', desc: '30% de quemar al atacante al recibir daño de contacto. En 5 s inflige el daño de una bola de Ascuas.', descEn: '30% chance to burn an attacker after contact damage. Deals one Ember fireball of damage over 5 s.' },
    unnerve: { name: 'Nerviosismo', en: 'Unnerve', desc: 'Tus ataques reducen la curación recibida por el objetivo un 50% durante 3 s.', descEn: 'Your attacks reduce healing received by the target by 50% for 3 s.' },
    synchronize: { name: 'Sincronía', en: 'Synchronize', desc: 'Al ralentizarte, refleja esa ralentización a todos los enemigos durante 3 s (recarga 3 s). Toda ralentización enemiga es ×1,1.', descEn: 'When slowed, reflect that slow to all enemies for 3 s (3 s cooldown). All enemy slow effects are ×1.1.' },
    innerfocus: { name: 'Foco Interno', en: 'Inner Focus', desc: 'Todos los movimientos se recargan a la vez, incluso los de huecos inactivos. Sólo ataca el hueco seleccionado.', descEn: 'All moves cool down simultaneously, including inactive slots. Only the selected slot attacks.' },
    multiscale: { name: 'Compensación', en: 'Multiscale', desc: 'Con la vida al máximo, el daño recibido de ataques se reduce a la mitad.', descEn: 'At full HP, damage received from attacks is halved.' }
  };
  const byDex = {
    144: ['pressure', 'snowcloak'],
    145: ['pressure', 'static'],
    146: ['pressure', 'flamebody'],
    149: ['innerfocus', 'multiscale'],
    150: ['pressure', 'unnerve'],
    151: ['synchronize']
  };
  const LIST = Object.entries(byDex).flatMap(([dex, ids]) => ids.map(ability => ({
    id: dex + '-' + ability, dex: +dex, ability, rarity: 5, ...abilities[ability]
  })));
  const BY_ID = Object.fromEntries(LIST.map(m => [m.id, m]));
  const SPECIES = Object.keys(byDex).map(Number);
  function medalsFor(dex) { return LIST.filter(m => m.dex === dex); }
  function owns(save, dex, ability) {
    return !!(save && save.abilityMedals && Object.prototype.hasOwnProperty.call(save.abilityMedals, dex + '-' + ability));
  }
  G.I18n.add(Object.fromEntries(Object.values(abilities).flatMap(a => [[a.name, a.en], [a.desc, a.descEn]])));
  G.I18n.add({
    'Habilidades': 'Abilities', 'Gacha de habilidades': 'Ability Gacha', 'Gemas y medallas de Kanto': 'Kanto gems and medals',
    'Gemas de habilidad': 'Ability Gems', 'Gema de habilidad': 'Ability Gem', 'Medalla de habilidad': 'Ability Medal',
    'Kanto · Medallas de habilidad': 'Kanto · Ability Medals',
    'Las seis especies de cinco estrellas dan sus medallas, incluido Dragonite. El resto da Pokémon.': 'All six five-star species award their medals, including Dragonite. Other rewards are Pokémon.',
    'Medallas: {x}': 'Medals: {x}', 'Equipar': 'Equip', 'Equipada': 'Equipped', 'Sin medalla': 'Locked', 'Sin habilidad': 'No ability',
    'Sólo una medalla equipada por Pokémon.': 'Only one equipped medal per Pokémon.',
    'No tienes gemas suficientes: derrota jefes de grietas': 'Not enough gems: defeat rift bosses',
    'Cada especie conserva su probabilidad. Sus medallas se reparten por igual.': 'Each species keeps its drop chance. Its medals share that chance equally.',
    '×10 garantiza una Épica o superior.': '×10 guarantees an Epic or higher.',
    'Medalla de cinco estrellas garantizada en la tirada 70.': 'A five-star medal is guaranteed on pull 70.',
    'Medalla repetida: 300 Pokémonedas.': 'Duplicate medal: 300 Pokécoins.',
    'Shiny: 1% en premios Pokémon; las medallas no son shiny.': 'Shiny: 1% for Pokémon rewards; medals have no shiny variant.',
    'Cada jefe de una grieta da 1 gema. Regalo inicial: 10 gemas.': 'Each rift boss awards 1 gem. Starting gift: 10 gems.',
    'El saldo y la garantía son independientes del gacha de Pokémon.': 'Gem balance and pity are separate from the Pokémon gacha.',
    '¡Evasión!': 'Dodged!', '¡Fallo!': 'Miss!', '¡Sincronía!': 'Synchronize!'
  });
  G.I18n.addChinese({
    'Presión': '压迫感', 'Manto Níveo': '雪隐', 'Electricidad Estática': '静电', 'Cuerpo Llama': '火焰之躯', 'Nerviosismo': '紧张感', 'Sincronía': '同步',
    'Foco Interno': '精神力', 'Compensación': '多重鳞片',
    'Todos los movimientos se recargan a la vez, incluso los de huecos inactivos. Sólo ataca el hueco seleccionado.': '所有技能同时进行冷却，包括未选中的技能槽；只有当前选中的技能槽发动攻击。',
    'Con la vida al máximo, el daño recibido de ataques se reduce a la mitad.': '满血时，受到的攻击伤害减半。',
    'Los enemigos a 240 de distancia atacan un 20% menos.': '自身周围 240 范围内敌人的攻击频率降低 20%。',
    '10% de evasión contra ataques a distancia. Al esquivar recuperas 5% de vida máxima (1 s entre curaciones). Siempre activo por ahora.': '受到远程攻击时有 10% 概率闪避，闪避后恢复 5% 最大生命；回血隐藏冷却 1 秒。本版本常驻。',
    'Al recibir daño de contacto, el atacante se ralentiza 10% durante 2 s. Sus ataques de contacto tienen 25% de fallo contra ti.': '受到接触伤害后，使攻击者静电 2 秒：减速 10%，对你的接触攻击有 25% 概率失败。',
    '30% de quemar al atacante al recibir daño de contacto. En 5 s inflige el daño de una bola de Ascuas.': '受到接触伤害时，有 30% 概率使攻击者灼伤 5 秒，总伤害约为自身一发火花火球的伤害。',
    'Tus ataques reducen la curación recibida por el objetivo un 50% durante 3 s.': '攻击命中后，使目标紧张 3 秒：受到的治疗降低 50%。',
    'Al ralentizarte, refleja esa ralentización a todos los enemigos durante 3 s (recarga 3 s). Toda ralentización enemiga es ×1,1.': '自身被减速时，将受到的减速反射给所有敌人 3 秒；隐藏冷却 3 秒。敌人受到的所有减速增强至 ×1.1。',
    'Habilidades': '特性', 'Gacha de habilidades': '特性抽卡', 'Gemas y medallas de Kanto': '关都特性宝石与勋章',
    'Gemas de habilidad': '特性宝石', 'Gema de habilidad': '特性宝石', 'Medalla de habilidad': '特性勋章',
    'Kanto · Medallas de habilidad': '关都 · 特性勋章',
    'Las seis especies de cinco estrellas dan sus medallas, incluido Dragonite. El resto da Pokémon.': '包括快龙在内的六只五星宝可梦，奖励替换为各自特性勋章；其余奖励仍为宝可梦。',
    'Medallas: {x}': '勋章：{x}', 'Equipar': '装备', 'Equipada': '已装备', 'Sin medalla': '未获得', 'Sin habilidad': '不装备特性',
    'Sólo una medalla equipada por Pokémon.': '每只宝可梦同时只能装备一枚特性勋章。',
    'No tienes gemas suficientes: derrota jefes de grietas': '特性宝石不足：击败裂隙 Boss 获取',
    'Cada especie conserva su probabilidad. Sus medallas se reparten por igual.': '每个种类保持原抽取概率，其对应的不同勋章等概率出现。',
    '×10 garantiza una Épica o superior.': '十连至少获得一个史诗或以上奖励。',
    'Medalla de cinco estrellas garantizada en la tirada 70.': '第 70 抽保底五星特性勋章。',
    'Medalla repetida: 300 Pokémonedas.': '重复勋章返还 300 金币。',
    'Shiny: 1% en premios Pokémon; las medallas no son shiny.': '宝可梦奖励有 1% 异色概率，勋章没有异色版本。',
    'Cada jefe de una grieta da 1 gema. Regalo inicial: 10 gemas.': '每击败一个裂隙 Boss 获得 1 枚宝石，初始赠送 10 枚。',
    'El saldo y la garantía son independientes del gacha de Pokémon.': '特性宝石余额与保底独立于普通宝可梦抽卡。',
    '¡Evasión!': '闪避！', '¡Fallo!': '攻击失败！', '¡Sincronía!': '同步！', 'Desarrollador': '开发者'
  });
  return { LIST, BY_ID, SPECIES, medalsFor, owns };
})();
