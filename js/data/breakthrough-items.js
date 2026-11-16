/* Mechanism-based Boss rewards; all effects are survivor adaptations. */
G.BREAKTHROUGH_ITEMS=[
  {
    "id": "ejectbutton",
    "name": "Botón Escape",
    "en": "Eject Button",
    "zh": "逃脱按键",
    "desc": "Al recibir daño con poca vida, prepara un uso sin PP y una breve protección.",
    "descEn": "Taking damage below 30% HP primes one free-PP damaging cast and 0.3s extra protection; 20s cooldown.",
    "descZh": "生命低于30%时受伤，获得一次输出技能免PP施放和额外0.3秒保护；冷却20秒。",
    "boss": true,
    "unlock": true,
    "icon": "up"
  },
  {
    "id": "redcard",
    "name": "Tarjeta Roja",
    "en": "Red Card",
    "zh": "红牌",
    "desc": "El contacto prepara el hueco activo y frena al atacante.",
    "descEn": "Contact damage readies the active slot and slows the attacker by 50% for 2s; 10s cooldown.",
    "descZh": "受到接触伤害时，当前技能槽立即就绪，攻击者减速50%持续2秒；冷却10秒。",
    "boss": true,
    "unlock": true,
    "icon": "cards"
  },
  {
    "id": "roomservice",
    "name": "Servicio Habitación",
    "en": "Room Service",
    "zh": "客房服务",
    "desc": "Cambiar de hueco restaura PP del anterior.",
    "descEn": "Switching slots restores 2 PP per copy to the previous slot; 8s cooldown.",
    "descZh": "切换技能槽时，为上一个槽位的所有技能恢复2点PP；冷却8秒。",
    "boss": true,
    "unlock": true,
    "icon": "bond"
  },
  {
    "id": "throatspray",
    "name": "Espray Bucal",
    "en": "Throat Spray",
    "zh": "爽喉喷雾",
    "desc": "Un movimiento de apoyo prepara un ataque sin PP.",
    "descEn": "Casting a buff primes one free-PP damaging cast; 5s cooldown.",
    "descZh": "释放属性技能后，下一次输出技能免PP；冷却5秒，最多储存3次。",
    "boss": true,
    "unlock": true,
    "icon": "spiritspray"
  },
  {
    "id": "blunderpolicy",
    "name": "Seguro Fallo",
    "en": "Blunder Policy",
    "zh": "打空保险",
    "desc": "Quedarse sin PP entrega una pequeña reserva.",
    "descEn": "A cast blocked by empty PP grants 2 reserve PP per copy; 12s cooldown.",
    "descZh": "技能因PP不足无法发动时，获得2点临时PP；冷却12秒。",
    "boss": true,
    "unlock": true,
    "icon": "shield"
  },
  {
    "id": "bigroot",
    "name": "Raíz Grande",
    "en": "Big Root",
    "zh": "大根茎",
    "desc": "Convierte curación sobrante en PP de reserva.",
    "descEn": "Each 10 overheal becomes 1 reserve PP; up to 3 per second per copy.",
    "descZh": "每10点溢出治疗转为1点临时PP，每秒最多转化3点。",
    "boss": true,
    "unlock": true,
    "icon": "sprout"
  },
  {
    "id": "bindingband",
    "name": "Banda Atadura",
    "en": "Binding Band",
    "zh": "紧绑束带",
    "desc": "Golpear a un rival frenado restaura PP.",
    "descEn": "Hitting a slowed enemy restores 1 PP per copy to that move, up to 3; 1s cooldown.",
    "descZh": "命中被减速的敌人时，恢复该技能1点PP；冷却1秒，多件最多恢复3点。",
    "boss": true,
    "unlock": true,
    "icon": "bond"
  },
  {
    "id": "terrainextender",
    "name": "Cubresuelos",
    "en": "Terrain Extender",
    "zh": "大地膜",
    "desc": "Tras usar un objeto, cambiar de hueco repone PP durante un breve tiempo.",
    "descEn": "After using an active item, switching to each slot restores 5 PP once within 10s.",
    "descZh": "使用主动道具后10秒内，首次切换至每个技能槽时，为该槽所有技能恢复5点PP。",
    "boss": true,
    "unlock": true,
    "icon": "type:grass"
  },
  {
    "id": "whiteherb",
    "name": "Hierba Blanca",
    "en": "White Herb",
    "zh": "白色香草",
    "desc": "Limpia una ralentización y repone PP.",
    "descEn": "Cleanses a slow and restores 3 PP to the active slot; 15s cooldown.",
    "descZh": "受到减速时自动解除，并为当前槽位恢复3点PP；冷却15秒。",
    "boss": true,
    "unlock": true,
    "icon": "sprout"
  },
  {
    "id": "cellbattery",
    "name": "Pila",
    "en": "Cell Battery",
    "zh": "充电电池",
    "desc": "Intercambia vida por el PP que falta.",
    "descEn": "When PP is insufficient, pay 2% max HP per missing PP without KO; 0.5s cooldown.",
    "descZh": "技能PP不足时，每缺1点可支付2%最大生命代付，不会致死；冷却0.5秒。",
    "boss": true,
    "unlock": true,
    "icon": "type:electric"
  }
];
{const en={},zh={};for(const i of G.BREAKTHROUGH_ITEMS){G.Items.LIST.push(i);G.Items.BY[i.id]=i;en[i.name]=i.en;en[i.desc]=i.descEn;zh[i.name]=i.zh;zh[i.desc]=i.descZh;}G.I18n.add(en);G.I18n.addChinese(zh);}
