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
    multiscale: { name: 'Compensación', en: 'Multiscale', desc: 'Con la vida al máximo, el daño recibido de ataques se reduce a la mitad.', descEn: 'At full HP, damage received from attacks is halved.' },
    sandstream: { name: 'Chorro Arena', en: 'Sand Stream', desc: 'Cada 40 s invoca una tormenta de arena de 20 s.', descEn: 'Every 40 s, summon a sandstorm lasting 20 s.' },
    regenerator: { name: 'Regeneración', en: 'Regenerator', desc: 'Tras 5 s sin recibir daño, recupera 5% de vida máxima por segundo.', descEn: 'After 5 s without damage, restore 5% max HP per second.' },
    naturalcure: { name: 'Cura Natural', en: 'Natural Cure', desc: 'Inmune a ralentizaciones hasta recibir daño. Se recupera tras 20 s sin daño.', descEn: 'Immune to slows until damaged. Immunity returns after 20 s without damage.' },
    truant: { name: 'Ausente', en: 'Truant', desc: 'Cada cuarto lanzamiento tiene el doble de recarga y recupera 5% de vida máxima.', descEn: 'Every fourth cast has double cooldown and restores 5% max HP.' },
    intimidate: { name: 'Intimidación', en: 'Intimidate', desc: 'Los impactos causan Miedo durante 3 s: daño enemigo -20%. Se refresca, no se acumula.', descEn: 'Hits cause Fear for 3 s: enemy damage -20%. Refreshes without stacking.' },
    moxie: { name: 'Autoestima', en: 'Moxie', desc: 'Cada baja da +10% de ataque durante 3 s. Hasta 5 cargas con duración independiente.', descEn: 'Each kill grants +10% attack for 3 s. Up to 5 independently timed stacks.' },
    clearbody: { name: 'Cuerpo Puro', en: 'Clear Body', desc: 'Los beneficios temporales duran un 50% más.', descEn: 'Temporary buffs last 50% longer.' },
    lightmetal: { name: 'Metal Liviano', en: 'Light Metal', desc: 'Recibir daño da +20% de velocidad durante 5 s. Hasta 3 cargas; refresca la duración.', descEn: 'Taking damage grants +20% speed for 5 s. Up to 3 stacks; refreshes duration.' },
    sturdy: { name: 'Robustez', en: 'Sturdy', desc: 'Sobrevive a un golpe mortal con 1 PS y recupera 50% de vida máxima. Una vez por etapa del mapa; las grietas no lo reinician.', descEn: 'Survive lethal damage at 1 HP, then heal 50% max HP. Once per surface stage; rifts do not reset it.' },
    icebody: { name: 'Gélido', en: 'Ice Body', desc: 'Mientras la nieve tenga efecto, recupera 3% de vida máxima por segundo.', descEn: 'While snow is effective, restore 3% max HP per second.' },
    levitate: { name: 'Levitación', en: 'Levitate', desc: 'Atraviesa obstáculos sin lanzar movimientos. Velocidad -50% al atravesar; -70% durante 0,3 s al entrar y salir, sin acumular ambas penalizaciones.', descEn: 'Pass through obstacles without casting. Move 50% slower inside; 70% slower for 0.3 s on entry and exit, without stacking the two penalties.' },
    drizzle: { name: 'Llovizna', en: 'Drizzle', desc: 'Cada 40 s invoca lluvia de 20 s.', descEn: 'Every 40 s, summon rain lasting 20 s.' },
    drought: { name: 'Sequía', en: 'Drought', desc: 'Cada 40 s invoca sol de 20 s.', descEn: 'Every 40 s, summon sunlight lasting 20 s.' },
    airlock: { name: 'Bucle Aire', en: 'Air Lock', desc: 'Anula los efectos del clima para todos. Sin clima, el daño crítico aumenta un 50%.', descEn: 'Suppress weather effects for everyone. Without weather, critical damage increases by 50%.' },
    serenegrace: { name: 'Dicha', en: 'Serene Grace', desc: 'Cada impacto tiene 10% de aplicar un estado aleatorio: lentitud, quemadura, veneno, estática, nerviosismo o miedo.', descEn: 'Each hit has a 10% chance to apply slow, burn, poison, static, unnerve or fear at random.' }
  };
  const byDex = {
    144: ['pressure', 'snowcloak'],
    145: ['pressure', 'static'],
    146: ['pressure', 'flamebody'],
    149: ['innerfocus', 'multiscale'],
    150: ['pressure', 'unnerve'],
    151: ['synchronize'],
    243: ['pressure', 'innerfocus'], 244: ['pressure', 'innerfocus'], 245: ['pressure', 'innerfocus'],
    248: ['sandstream', 'unnerve'], 249: ['pressure', 'multiscale'], 250: ['pressure', 'regenerator'], 251: ['naturalcure'],
    289: ['truant'], 373: ['intimidate', 'moxie'], 376: ['clearbody', 'lightmetal'],
    377: ['clearbody', 'sturdy'], 378: ['clearbody', 'icebody'], 379: ['clearbody', 'lightmetal'],
    380: ['levitate'], 381: ['levitate'], 382: ['drizzle'], 383: ['drought'], 384: ['airlock'], 385: ['serenegrace'], 386: ['pressure']
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
    'Gemas y medallas de tres regiones': 'Gems and medals from three regions',
    '{x} · Medallas de habilidad': '{x} · Ability Medals',
    'Las especies de cinco estrellas dan medallas de habilidad. El resto da Pokémon.': 'Five-star species award ability medals. Other rewards are Pokémon.',
    'Disponible': 'Ready', 'Agotada': 'Used', 'Sin lanzar movimientos': 'Casting blocked', 'Clima anulado': 'Weather suppressed', 'Crítico ×2,25': 'Critical ×2.25', '¡Robustez!': 'Sturdy!', 'Miedo': 'Fear',
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
    'Gemas y medallas de tres regiones': '关都、城都、丰缘特性宝石与勋章',
    '{x} · Medallas de habilidad': '{x} · 特性勋章',
    'Las especies de cinco estrellas dan medallas de habilidad. El resto da Pokémon.': '本地区五星宝可梦奖励替换为对应特性勋章；其余奖励仍为宝可梦。',
    'Disponible': '可用', 'Agotada': '本阶段已消耗', 'Sin lanzar movimientos': '无法发动技能', 'Clima anulado': '天气效果已抑制', 'Crítico ×2,25': '暴击伤害 ×2.25', '¡Robustez!': '结实！', 'Miedo': '害怕',
    'Chorro Arena': '扬沙', 'Regeneración': '再生力', 'Cura Natural': '自然回复', 'Ausente': '懒惰', 'Intimidación': '威吓',
    'Autoestima': '自信过度', 'Cuerpo Puro': '恒净之躯', 'Metal Liviano': '轻金属', 'Robustez': '结实', 'Gélido': '冰冻之躯',
    'Levitación': '飘浮', 'Llovizna': '降雨', 'Sequía': '日照', 'Bucle Aire': '气闸', 'Dicha': '天恩',
    'Cada 40 s invoca una tormenta de arena de 20 s.': '每隔 40 秒召唤持续 20 秒的沙暴天气。',
    'Tras 5 s sin recibir daño, recupera 5% de vida máxima por segundo.': '连续 5 秒未受到伤害后，每秒恢复 5% 最大生命；受伤重新计时。',
    'Inmune a ralentizaciones hasta recibir daño. Se recupera tras 20 s sin daño.': '免疫所有减速，直到受到伤害；连续 20 秒未受伤后恢复免疫。',
    'Cada cuarto lanzamiento tiene el doble de recarga y recupera 5% de vida máxima.': '每发动 3 次技能后，第 4 次发动的技能冷却增加 100%，并恢复 5% 最大生命。',
    'Los impactos causan Miedo durante 3 s: daño enemigo -20%. Se refresca, no se acumula.': '攻击命中施加害怕 3 秒，使敌人伤害降低 20%；重复命中刷新，不叠加。',
    'Cada baja da +10% de ataque durante 3 s. Hasta 5 cargas con duración independiente.': '击倒敌人获得自信：攻击 +10%，持续 3 秒，最多 5 层，每层独立计时。',
    'Los beneficios temporales duran un 50% más.': '获得的临时增益效果持续时间延长 50%。',
    'Recibir daño da +20% de velocidad durante 5 s. Hasta 3 cargas; refresca la duración.': '受伤获得加速：移速 +20%，持续 5 秒，最多 3 层，重复获得刷新时间。',
    'Sobrevive a un golpe mortal con 1 PS y recupera 50% de vida máxima. Una vez por etapa del mapa; las grietas no lo reinician.': '受到致命伤害时保留 1 HP，再恢复 50% 最大生命；每个地表阶段一次，进出裂隙不刷新。',
    'Mientras la nieve tenga efecto, recupera 3% de vida máxima por segundo.': '雪天生效时，每秒恢复 3% 最大生命。',
    'Atraviesa obstáculos sin lanzar movimientos. Velocidad -50% al atravesar; -70% durante 0,3 s al entrar y salir, sin acumular ambas penalizaciones.': '可穿越障碍，但期间无法发动技能；穿越时减速 50%，开始和结束时各减速 70% 持续 0.3 秒，两档惩罚不叠乘。',
    'Cada 40 s invoca lluvia de 20 s.': '每隔 40 秒召唤持续 20 秒的下雨天气。',
    'Cada 40 s invoca sol de 20 s.': '每隔 40 秒召唤持续 20 秒的晴天天气。',
    'Anula los efectos del clima para todos. Sin clima, el daño crítico aumenta un 50%.': '使全场天气效果无效；没有天气时，暴击伤害提高 50%。',
    'Cada impacto tiene 10% de aplicar un estado aleatorio: lentitud, quemadura, veneno, estática, nerviosismo o miedo.': '造成伤害时有 10% 概率等概率施加一种负面效果：减速、灼伤、中毒、静电、紧张或害怕。',
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
