/* Player-facing expedition terminology; the ordinary three-language UI remains shared. */
(() => {
  const terms=[
    ['Apoyo ardiente','Fiery support','烈焰声援'],['Espíritu de lucha','Fighting spirit','斗志'],['Emboscada','Ambush','伏击'],['Fuerza dracónica','Draconic strength','龙之力量'],
    ['Marea vital','Vital tide','生命潮汐'],['Brote vital','Vital sprout','新生萌芽'],['Bendición','Blessing','祝福'],['Compañerismo','Companionship','伙伴之心'],['Firmeza','Steadfast','坚实'],['Bastión','Bastion','壁垒'],['Arraigo','Rooted','大地庇护'],
    ['Reserva natural','Natural reserve','自然储备'],['Metabolismo','Metabolism','新陈代谢'],['Concentración','Concentration','专注'],['Vigor espectral','Spectral vigor','幽影活力'],['Impulso eléctrico','Electric impulse','电光助力'],['Mente fría','Cool head','冷静'],['Viento favorable','Fair wind','顺风'],
    ['Monstruo','Monster','怪兽组'],['Agua 1','Water 1','水中1组'],['Bicho','Bug','虫组'],['Volador','Flying','飞行组'],['Campo','Field','陆上组'],['Hada','Fairy','妖精组'],['Planta','Grass','植物组'],['Humanoide','Human-Like','人型组'],['Agua 3','Water 3','水中3组'],['Mineral','Mineral','矿物组'],['Amorfo','Amorphous','不定形组'],['Agua 2','Water 2','水中2组'],['Ditto','Ditto','百变怪组'],['Dragón','Dragon','龙组'],['Desconocido','Undiscovered','未发现组'],
    ['Proyectil','Projectile','投射物'],['Cuerpo a cuerpo','Melee','近战'],['Rayo','Beam','能量柱'],['Órbita','Orbit','环绕'],['Cadena','Chain','连锁'],['Embestida','Dash','位移'],['Meteoro','Meteor','陨石'],['Atributos','Stat boost','属性提升'],['Bumerán','Boomerang','回旋'],['Onda','Shockwave','冲击波'],['Aura','Aura','光环'],['Mina','Mine','地雷'],['Torreta','Turret','炮台'],['Rastro','Trail','地面轨迹'],['Abanico','Cone','扇形']
  ];
  const local=t=>t?(G.I18n.lang==='zh'?t[2]:G.I18n.lang==='en'?t[1]:t[0]):'—';
  G.ExpeditionTerms={egg:n=>local(terms[17+n]),talent:name=>local(terms.slice(0,18).find(t=>t[0]===name)),skill:name=>local(terms.slice(33).find(t=>t[0]===name))};
})();
