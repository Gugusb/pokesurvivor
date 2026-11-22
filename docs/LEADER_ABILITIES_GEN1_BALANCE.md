# 第一世代队长特性：实施前收益估算与调参

日期：2026-11-22。覆盖设计文档实际的 74 个家族（原目录标注的 68 与正文不一致）。

## 估算口径

以下是实施前的静态估算，不是实测 DPS。各招式按常规 3 弹、全向 8 弹、80 敏捷／耐力估算；只比较命中同一目标的伤害、施法频率、覆盖半径、覆盖目标数、物理有效生命和 PP 消耗，不把范围面积直接算成单体增伤。增益与代价均按开局生效；进阶为训练家 5／8 级。

Z 由家族勋章解锁，满充手动施放，最多一发。按匹配队伍的理论施法间隔／事件频率归一到约 60 秒战斗游戏时间；无对应行为不充能。首次从零开始，跨战斗保存。单次 Z 的直接伤害预算约为队长主技能的 10 秒基础输出，分摊到各段；附带控制／团队收益较强时减小直接伤害。并非保证每套队伍都恰好 60 秒。

## 明显离群值的调整

- 袋兽：原首段 0.75 × (1+0.35) = 1.0125，只有 1.25% 收益却承担接触易伤，首段改 0.90，合计 1.215 倍。
- 超梦：原特攻 1.5 倍且无视一半防御，约 3 倍输出，改为特攻 +25%、穿甲 25%，约 1.667 倍；队友减伤害的代价保留。
- 妙蛙：原半径 1.8、跳频 1.5，在均匀密度敌群的覆盖输出上限约 4.86 倍，改为半径 1.5、跳频 1.25，覆盖输出约 2.81 倍，单目标只增加 25% 跳频；移速代价降低至 20%。
- 杰尼龟：80 耐力降 35% 后 PP 回复约从 2.714/s 降到 2.238/s，加一 PP 的续航惩罚过大，改耐力 -20%，额外 PP 仍 +1。
- 卡比兽：原双倍生命叠火冰减半约为 4 倍对应属性有效生命，改生命 +60%、火冰受伤 ×0.65，约 2.46 倍。
- 大范围吸血统一受每秒每只最大生命 3% 的治疗预算限制；白盾最多最大生命 40%。百分比伤害对精英／BOSS按队长输出预算封顶，普通怪按设计比例；避免高生命首领被单次多段结算抹除。
- 长时间无冷却仍保留 0.15 秒调度间隔；同时最多 64 个特性领域、240 个特性弹丸。自动触发衍生攻击不再次充能，不形成回响／击杀循环。
- 全队常驻增伤、减防、伤害免疫及脆弱惩罚，逐家族在配置中收敛。下表以最终配置为准，原文保留在 source 供核对。

## 逐家族开局收益

`单击× / 施法× / 半径× / 数量× / 跳频×` 互为不同维度，不直接相乘冒充单体 DPS。物理有效生命比仅计生命、物防、通用易伤，不包含属性克制、白盾、控制和临时进阶。

|家族|招式收益（单击／施法／半径／数量／跳频）|属性乘数|物理有效生命×|Z充能条件|
|---|---|---|---|---|
|毒沼领域|aura: 1 / 1 / 1.5 / 1 / 1.25|spd×0.8|1|auraHit|
|燎原烈风|cone: 1 / 1 / 1.7 / 1 / 1|1|1|coneCast|
|激流重炮|beam: 1 / 1 / 1.6 / 1 / 1|stamina×0.8|1|beamCast|
|超载电弧|chain: 1 / 1 / 1.4 / 1.667 / 1|defense×0.75|0.75|chainCast|
|三色鳞粉|nova: 1 / 1 / 1 / 1.35 / 1|defense×0.7|0.7|novaCast|
|致命蜂刺|melee: 1 / 1 / 1 / 1 / 1|hp×0.8|0.8|meleeCrit|
|气流回旋|boomerang: 1 / 1 / 1 / 1 / 1|1|1|boomerangCast|
|绝境门牙|条件机制，见配置及下列说明|1|1|heavyHurt|
|钻孔穿刺|dash: 1.4 / 1 / 1.6 / 1 / 1|1|1|dashHit|
|毒沼盘绕|mine: 1 / 1 / 1.3 / 1 / 1<br>trail: 1 / 1 / 1 / 1 / 1|spd×0.85|1|mineTrigger|
|裂地坚爪|条件机制，见配置及下列说明|spdef×0.75|1|meleeCrit|
|母皇阵线|orbit: 1 / 0.87 / 1.3 / 1.333 / 1|1|1|orbitHit|
|强行暴君|条件机制，见配置及下列说明|1|1|kill|
|九尾狐火|meteor: 1 / 1 / 1.4 / 1 / 1|atk×0.7|1|burnStack|
|回声吸血|条件机制，见配置及下列说明|hp×0.8|0.8|bounceHit|
|花瓣狂舞|条件机制，见配置及下列说明|1|1|kill|
|真菌寄生|条件机制，见配置及下列说明|1|1|spore|
|蝶舞极光|buff: 1 / 1 / 1 / 1 / 1|1|1|buffCast|
|遁地突袭|条件机制，见配置及下列说明|spd×1.2，hp×0.75|0.75|distance|
|金运财阀|条件机制，见配置及下列说明|1|1|kill|
|剧痛念力|nova: 1.3 / 1 / 1.5 / 1 / 1|1|1|hurtAmount|
|狂怒之拳|条件机制，见配置及下列说明|defense×0.8，spdef×0.8|0.8|hurtCount|
|神速威吓|dash: 1 / 1.25 / 1 / 1 / 1|1|1|dashCast|
|悠游水流拳|条件机制，见配置及下列说明|1|1|meleeHit|
|折跃念力|beam: 1 / 1 / 1.8 / 1 / 1|spa×1.25，hp×0.7，defense×0.75|0.525|beamHit|
|无防守旋风拳|melee: 1 / 1 / 1 / 1 / 1|atk×1.25|0.8|meleeCast|
|强酸捕食|cone: 1 / 1 / 1.5 / 1 / 1|spd×0.8|1|debuffKill|
|深海触壁|orbit: 1 / 1 / 1 / 1.333 / 1|defense×0.75|0.75|orbitHit|
|坚石绝爆|nova: 1 / 1 / 1.4 / 1 / 1|defense×1.3，spd×0.8|1.3|novaCast|
|炽热蹄痕|条件机制，见配置及下列说明|spd×1.3|1|distance|
|迟钝滞后|条件机制，见配置及下列说明|spd×0.75|1|painTick|
|极磁风暴|orbit: 1 / 1 / 1 / 1.333 / 1|1|1|pickup|
|大葱一闪|melee: 1 / 1 / 1.4 / 1 / 1|hp×0.85|0.85|meleeCrit|
|三首齐射|projectile: 1 / 1 / 1 / 1.333 / 1|spdef×0.75|1|projectileHit|
|厚脂极光|条件机制，见配置及下列说明|1|1|freeze|
|恶臭剧毒泥|条件机制，见配置及下列说明|spd×0.75|1|poisonStack|
|连续破壳刺|projectile: 1 / 1 / 1 / 1.333 / 1|defense×1.4|1.4|projectileHit|
|幽冥虚体|条件机制，见配置及下列说明|hp×0.75，defense×0.7|0.525|projectileHit|
|岩崩巨碾|melee: 1 / 1 / 1.6 / 1 / 1|defense×1.5，spd×0.75|1.5|knock|
|摄魂摆锤|aura: 1 / 1 / 1.5 / 1 / 1|spd×0.8|1|stun|
|巨钳断头台|条件机制，见配置及下列说明|atk×1.3|1|meleeHit|
|极速雷爆|dash: 1 / 1.333 / 1 / 1 / 1|spd×1.35，hp×0.75|0.75|dashCast|
|投掷丰收|meteor: 1 / 1 / 1 / 1.333 / 1|1|1|fruitPickup|
|回力骨棒|boomerang: 1 / 1 / 1 / 1 / 1|spa×0.7，stamina×0.8|1|boomerangReturn|
|巨舌缠缚|melee: 1 / 0.87 / 1.8 / 1 / 1|spd×0.8|1|meleeHit|
|化学气体|条件机制，见配置及下列说明|1|1|poisonHit|
|坚硬岩铠|条件机制，见配置及下列说明|spd×0.75|1|knock|
|再生藤蔓|条件机制，见配置及下列说明|spd×0.8|1|heal|
|亲子爱连击|条件机制，见配置及下列说明|1|1|echoHit|
|狙击龙卷|projectile: 1 / 1 / 1 / 1 / 1<br>meteor: 1 / 1 / 1 / 1 / 1|hp×0.85|0.85|crit|
|避雷金角|条件机制，见配置及下列说明|spdef×0.75|1|shieldBreak|
|核心解析|条件机制，见配置及下列说明|hp×0.8，defense×0.75|0.6|intercept|
|反射晶壁|条件机制，见配置及下列说明|atk×0.85，spa×0.85|1|intercept|
|技师连斩|melee: 1 / 1.25 / 1 / 1 / 1|1|1|repeatMelee|
|恶魔霜吻|cone: 1 / 1 / 1.4 / 1 / 1|defense×0.7|0.7|coneHit|
|电气引擎拳|条件机制，见配置及下列说明|stamina×0.8|1|electricHit|
|炎体加农炮|projectile: 1 / 1 / 1.5 / 1 / 1<br>meteor: 1 / 1 / 1.5 / 1 / 1|spd×0.8|1|burnHit|
|自信头冠夹|melee: 1 / 1 / 1 / 1 / 1|spdef×0.7|1|kill|
|愤怒狂冲|dash: 1.4 / 1 / 1.6 / 1 / 1|1|1|dashHit|
|跃鲤狂龙|条件机制，见配置及下列说明|1|1|kill|
|乘风圣咏|条件机制，见配置及下列说明|spd×0.75|1|absorb|
|变身幻象|条件机制，见配置及下列说明|1|1|cast|
|九彩适应力|条件机制，见配置及下列说明|1|1|stabHit|
|代码下载|条件机制，见配置及下列说明|stamina×0.85|1|kill|
|多刺硬壳|projectile: 1 / 1 / 1 / 1.333 / 1|spd×0.8|1|rangedHit|
|战斗利镰|melee: 1 / 1 / 1 / 1 / 1|1|1|meleeCrit|
|远古天威|条件机制，见配置及下列说明|spd×1.3，hp×0.75|0.75|areaHit|
|贪吃腹鼓|条件机制，见配置及下列说明|hp×1.6，spd×0.75|1.6|hurtAmount|
|极霜神域|条件机制，见配置及下列说明|1|1|iceHit|
|雷霆天罚|条件机制，见配置及下列说明|defense×0.8|0.8|electricHit|
|涅槃不死火|条件机制，见配置及下列说明|1|1|burnStack|
|多重鳞片逆鳞|dash: 1 / 1 / 1.5 / 1 / 1<br>melee: 1 / 1 / 1.5 / 1 / 1|1|1|meleeCrit|
|精神利刃主宰|条件机制，见配置及下列说明|spa×1.25|1|hit|
|万物始源|条件机制，见配置及下列说明|agility×1.3，hp×0.8|0.8|distinctType|

## 条件收益与资源约束

### 毒沼领域（1）

开局收益：`{"moves":{"aura":{"radius":1.5,"tickRate":1.25}},"auraSlow":0.25}`。代价：`{"stats":{"spd":-0.2},"ban":["dash"]}`。

5级：`{"poisonRate":1.5}`；8级：`{"pollen":true}`。Z：`toxicBloom`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 燎原烈风（4）

开局收益：`{"moves":{"cone":{"range":1.7,"agility":1.3,"knock":1.5}}}`。代价：`{"weakDamage":1.35}`。

5级：`{"burnCrit":0.2}`；8级：`{"wallExplosion":true}`。Z：`giantCone`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 激流重炮（7）

开局收益：`{"moves":{"beam":{"range":1.6,"width":1.6,"knock":1.8}},"beamRamp":0.08}`。代价：`{"extraPP":{"beam":1},"stats":{"stamina":-0.2}}`。

5级：`{"beamDefense":0.35}`；8级：`{"beamVulnerable":0.2}`。Z：`tripleBeam`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 超载电弧（172）

开局收益：`{"moves":{"chain":{"count":2,"range":1.4}},"chainRamp":0.1}`。代价：`{"stats":{"defense":-0.25},"contactIFrames":0.75}`。

5级：`{"critPP":0.25}`；8级：`{"overchargeFocus":true}`。Z：`overcharge`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 三色鳞粉（10）

开局收益：`{"moves":{"nova":{"countFactor":1.35,"speed":0.8,"poison":1,"slow":0.2}}}`。代价：`{"stats":{"defense":-0.3},"incomingTypes":{"fire":1.3,"rock":1.3}}`。

5级：`{"stationaryDefense":0.6}`；8级：`{"statusDuration":1.4,"statusDeathPollen":true}`。Z：`sleepPollen`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 致命蜂刺（13）

开局收益：`{"moves":{"melee":{"crit":0.25,"critMul":2,"poison":1}}}`。代价：`{"stats":{"hp":-0.2},"ban":["beam","aura"]}`。

5级：`{"critVenom":0.15}`；8级：`{"moves":{"melee":{"range":1.4}},"executeThreshold":0.35}`。Z：`twinSting`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 气流回旋（16）

开局收益：`{"moves":{"boomerang":{"life":1.5}},"returnDamage":1.5,"returnPull":true}`。代价：`{"stationaryIncoming":1.3}`。

5级：`{"flyingSpeed":0.25}`；8级：`{"knockCrit":true,"slowImmune":true}`。Z：`stormBlades`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 绝境门牙（19）

开局收益：`{"missingHealthPower":0.6}`。代价：`{"noRegen":true,"healthyDamage":0.85}`。

5级：`{"firstHealthyCrit":true}`；8级：`{"deathGuard":2}`。Z：`furyFang`。

估算边界：80%失血时双攻／敏捷各增加48%；自然回复为零，满血输出有惩罚。
### 钻孔穿刺（21）

开局收益：`{"moves":{"dash":{"range":1.6,"width":1.4,"damage":1.4}}}`。代价：`{"moves":{"projectile":{"range":0.75},"beam":{"range":0.75}},"dashAfterIncoming":1.2}`。

5级：`{"dashKillReset":0.35}`；8级：`{"drillBreak":true}`。Z：`drillWind`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 毒沼盘绕（23）

开局收益：`{"moves":{"mine":{"life":1.7,"radius":1.3},"trail":{"life":1.7}},"trapSilence":2}`。代价：`{"stats":{"spd":-0.15},"moves":{"projectile":{"damage":0.8}}}`。

5级：`{"contactFear":1}`；8级：`{"deathGuard":1.5,"shedNova":true}`。Z：`acidSerpents`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 裂地坚爪（27）

开局收益：`{"meleeStones":3,"defCritConversion":0.08}`。代价：`{"banSpecial":true,"stats":{"spdef":-0.25}}`。

5级：`{"meleeSpeed":0.2}`；8级：`{"contactReflect":0.5,"moves":{"melee":{"crit":0.15}}}`。Z：`earthSplit`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 母皇阵线（29）

开局收益：`{"moves":{"orbit":{"count":1,"radius":1.3,"speed":1.2}},"orbitHeal":0.002}`。代价：`{"cooldown":1.15,"farDamage":0.8}`。

5级：`{"moves":{"orbit":{"poison":1}},"poisonIncoming":0.85}`；8级：`{"shieldOrbit":1.5}`。Z：`motherBarrier`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 强行暴君（32）

开局收益：`{"damage":1.35,"shieldDamage":1.6,"sheerForce":true}`。代价：`{"selfCostPP":0.005}`。

5级：`{"healthyProjectile":1.2}`；8级：`{"shieldQuake":true}`。Z：`tyrantBarrage`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 九尾狐火（37）

开局收益：`{"moves":{"meteor":{"radius":1.4,"windup":0.5,"burn":2}}}`。代价：`{"incomingTypes":{"water":1.4},"stats":{"atk":-0.3}}`。

5级：`{"burnSpa":0.015}`；8级：`{"weather":"sun","foxSpeed":2}`。Z：`foxFire`。

估算边界：天气同时影响敌我双方，收益需按双方属性及天气规则计算。
### 回声吸血（41）

开局收益：`{"ricochet":2,"projectileLeech":0.02}`。代价：`{"stats":{"hp":-0.2},"sunCritPenalty":0.2}`。

5级：`{"projectileLeech":0.015,"overhealShield":0.2}`；8级：`{"stats":{"spd":0.3},"castWhileMoving":true}`。Z：`ultrasound`。

估算边界：吸血按有效伤害结算并受每秒治疗预算限制。
### 花瓣狂舞（43）

开局收益：`{"orbitPetals":2,"sunStats":0.3}`。代价：`{"incomingTypes":{"ice":1.3,"fire":1.3},"wetCooldown":1.2}`。

5级：`{"sweetAura":true}`；8级：`{"petalHeal":0.02}`。Z：`petalDance`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 真菌寄生（46）

开局收益：`{"parasiticMines":true}`。代价：`{"incomingTypes":{"fire":1.6},"moves":{"dash":{"speed":0.8}}}`。

5级：`{"parasiteVulnerable":0.2,"parasiteHeal":0.03}`；8级：`{"mushroomUses":3}`。Z：`sleepSpores`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 蝶舞极光（48）

开局收益：`{"moves":{"buff":{"amount":1.4,"life":1.6}},"buffBeam":0.08}`。代价：`{"unbuffedDamage":0.8}`。

5级：`{"moves":{"buff":{"cd":0.8}}}`；8级：`{"butterflyCrit":0.5,"butterflyDefense":0.7}`。Z：`butterflyBeam`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 遁地突袭（50）

开局收益：`{"stats":{"spd":0.2},"burrowCycle":true}`。代价：`{"stats":{"hp":-0.25},"incomingTypes":{"ground":1.3,"water":1.3}}`。

5级：`{"quicksand":true}`；8级：`{"burrowTriple":true}`。Z：`burrow`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 金运财阀（52）

开局收益：`{"smallMoveRate":1.25,"bankDamage":0.03}`。代价：`{"poorDefense":0.8,"shopRefreshFactor":1.5}`。

5级：`{"eliteItem":1}`；8级：`{"bankShield":true}`。Z：`payDay`。

估算边界：每20存款提高3%伤害（试玩封顶30%），附带经济与存款机会成本。
### 剧痛念力（54）

开局收益：`{"moves":{"nova":{"radius":1.5,"damage":1.3}}}`。代价：`{"fullHpNovaCooldown":1.5}`。

5级：`{"headacheHeal":0.08}`；8级：`{"headacheBoss":1.5}`。Z：`headache`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 狂怒之拳（56）

开局收益：`{"hurtMelee":0.015}`。代价：`{"stats":{"defense":-0.2,"spdef":-0.2},"noRegen":true}`。

5级：`{"rageSpeed":0.3}`；8级：`{"hurtMelee":0.01,"rageGuard":1}`。Z：`rageFists`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 神速威吓（58）

开局收益：`{"moves":{"dash":{"speed":1.7,"cd":0.8}},"speedDash":0.05}`。代价：`{"ban":["aura","turret"],"stationaryCritOff":true}`。

5级：`{"dashIntercept":true}`；8级：`{"dashFlames":true}`。Z：`roarRush`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 悠游水流拳（60）

开局收益：`{"rainMelee":true,"meleeEcho":0.2}`。代价：`{"sunSlow":0.15,"sunCooldown":1.25}`。

5级：`{"contactSlow":0.4}`；8级：`{"openingWeather":"rain"}`。Z：`hypnosisRain`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 折跃念力（63）

开局收益：`{"moves":{"beam":{"range":1.8}},"stats":{"spa":0.25},"groundImmune":true}`。代价：`{"stats":{"hp":-0.3,"defense":-0.25}}`。

5级：`{"beamCritRamp":0.06}`；8级：`{"emergencyWarp":2}`。Z：`warpBeam`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 无防守旋风拳（66）

开局收益：`{"stats":{"atk":0.25},"moves":{"melee":{"arc":6.283,"knock":1.6}}}`。代价：`{"incoming":1.25,"ban":["beam"]}`。

5级：`{"castGuard":0.3}`；8级：`{"extraFists":2}`。Z：`fourFists`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 强酸捕食（69）

开局收益：`{"moves":{"cone":{"arcFactor":0.7,"range":1.5}},"acidDefense":0.25}`。代价：`{"stats":{"spd":-0.2},"freshEnemyDamage":0.85}`。

5级：`{"acidPuddle":true}`；8级：`{"devourPP":2}`。Z：`devour`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 深海触壁（72）

开局收益：`{"moves":{"orbit":{"count":1,"poisonChance":0.5}},"spdefOrbit":0.08}`。代价：`{"stats":{"defense":-0.25},"incomingTypes":{"electric":1.35}}`。

5级：`{"shieldShards":8}`；8级：`{"rainOrbits":true}`。Z：`toxicCurtain`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 坚石绝爆（74）

开局收益：`{"stats":{"defense":0.3},"moves":{"nova":{"radius":1.4,"knock":1.6}},"deathNova":true}`。代价：`{"stats":{"spd":-0.2},"incomingTypes":{"water":1.6,"grass":1.6}}`。

5级：`{"dashArmor":true}`；8级：`{"deathGuard":2.5}`。Z：`rockDetonation`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 炽热蹄痕（77）

开局收益：`{"stats":{"spd":0.3},"movingTrail":"fire"}`。代价：`{"stationaryIncoming":1.35}`。

5级：`{"moves":{"dash":{"cd":0.75}},"longDashTrail":true}`；8级：`{"trailTeamSpeed":0.15,"fireTrailSlow":0.3}`。Z：`flameGallop`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 迟钝滞后（79）

开局收益：`{"delayedDamage":0.4}`。代价：`{"stats":{"spd":-0.25},"cooldown":1.15}`。

5级：`{"painDefense":0.4}`；8级：`{"painReleaseHeal":0.35}`。Z：`painRelease`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 极磁风暴（81）

开局收益：`{"magnet":2.5,"moves":{"orbit":{"count":1}},"orbitRadiusDamage":0.025}`。代价：`{"incomingTypes":{"ground":1.6},"moves":{"dash":{"cd":1.25}}}`。

5级：`{"magnetLinks":true}`；8级：`{"magnetGuard":2}`。Z：`magnetStorm`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 大葱一闪（83）

开局收益：`{"moves":{"melee":{"crit":0.35,"range":1.4}}}`。代价：`{"nonCritDamage":0.8,"stats":{"hp":-0.15}}`。

5级：`{"frontParry":true}`；8级：`{"thrustVulnerable":0.25}`。Z：`meteorThrust`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 三首齐射（84）

开局收益：`{"moves":{"projectile":{"count":1}},"speedProjectile":0.1}`。代价：`{"stats":{"spdef":-0.25},"statusPenalty":1.3}`。

5级：`{"hurtSpeed":0.3}`；8级：`{"thirdHitTrue":true}`。Z：`tripleVolley`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 厚脂极光（86）

开局收益：`{"incomingTypes":{"fire":0.6,"ice":0.6},"beamFreeze":0.8}`。代价：`{"sunIncoming":1.25,"moves":{"beam":{"cd":1.15}}}`。

5级：`{"openingWeather":"snow"}`；8级：`{"frozenExecute":0.2}`。Z：`polarBeam`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 恶臭剧毒泥（88）

开局收益：`{"toxicAura":120}`。代价：`{"stats":{"spd":-0.25},"ban":["dash"]}`。

5级：`{"contactSlime":true}`；8级：`{"puddleBuff":0.2}`。Z：`toxicEruption`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 连续破壳刺（90）

开局收益：`{"moves":{"projectile":{"count":1}},"stats":{"defense":0.4}}`。代价：`{"postZWeakness":1.3}`。

5级：`{"iceCounter":6}`；8级：`{"lastHitCrit":true}`。Z：`shellSmash`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 幽冥虚体（92）

开局收益：`{"phaseTerrain":true,"projectileTerrain":true,"rangedIncoming":0.8}`。代价：`{"stats":{"hp":-0.25,"defense":-0.3}}`。

5级：`{"statusDamage":1.25}`；8级：`{"killGuard":0.3}`。Z：`shadowBall`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 岩崩巨碾（95）

开局收益：`{"stats":{"defense":0.5},"moves":{"melee":{"range":1.6}},"defMelee":0.12}`。代价：`{"stats":{"spd":-0.25},"moves":{"dash":{"range":0.7}},"specialIncoming":1.3}`。

5级：`{"hitCap":0.3}`；8级：`{"meleeIntercept":true}`。Z：`titanTail`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 摄魂摆锤（96）

开局收益：`{"moves":{"aura":{"radius":1.5}},"dreamAura":true}`。代价：`{"stats":{"spd":-0.2},"incomingTypes":{"ghost":1.35,"dark":1.35}}`。

5级：`{"stunVulnerable":0.2}`；8级：`{"dreamPP":2}`。Z：`dreamFeast`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 巨钳断头台（98）

开局收益：`{"stats":{"atk":0.3},"attackDebuffImmune":true,"meleeShield":0.2}`。代价：`{"cooldown":1.2,"ban":["beam","nova"]}`。

5级：`{"meleeShieldGain":0.025}`；8级：`{"executionFury":true}`。Z：`guillotine`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 极速雷爆（100）

开局收益：`{"stats":{"spd":0.35},"moves":{"dash":{"cd":0.75}},"dashLightning":true,"deathNova":true}`。代价：`{"stats":{"hp":-0.25},"stationaryDrain":0.005}`。

5级：`{"dashInvuln":true}`；8级：`{"stats":{"spd":0.15},"overloadShield":true}`。Z：`overload`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 投掷丰收（102）

开局收益：`{"moves":{"meteor":{"count":1}},"fruitChance":0.3}`。代价：`{"incomingTypes":{"bug":1.6},"moves":{"dash":{"cd":1.3}}}`。

5级：`{"fruitSpeed":0.2}`；8级：`{"sunHarvest":true}`。Z：`harvest`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 回力骨棒（104）

开局收益：`{"moves":{"boomerang":{"width":1.5}},"returnPull":true,"hurtAttack":0.1}`。代价：`{"stats":{"spa":-0.3,"stamina":-0.2}}`。

5级：`{"moves":{"melee":{"critMul":2},"boomerang":{"critMul":2}}}`；8级：`{"boneGuard":true,"returnCrit":true}`。Z：`boneCyclone`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 巨舌缠缚（108）

开局收益：`{"slowImmune":true,"moves":{"melee":{"range":1.8,"slow":0.3}}}`。代价：`{"stats":{"spd":-0.2},"cooldown":1.15}`。

5级：`{"tongueStun":0.2}`；8级：`{"stats":{"hp":0.2},"contactReflect":0.25}`。Z：`tongueSweep`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 化学气体（109）

开局收益：`{"gasAura":150}`。代价：`{"dotIncoming":1.3,"specialCooldown":1.15}`。

5级：`{"groundImmune":true}`；8级：`{"gasDouble":true,"gasGuard":2}`。Z：`gasDetonation`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 坚硬岩铠（111）

开局收益：`{"weakReduction":0.25,"dashGuard":0.35}`。代价：`{"stats":{"spd":-0.25},"moves":{"dash":{"cd":1.25}},"incomingTypes":{"water":1.5,"grass":1.5}}`。

5级：`{"immune":["electric"],"lightningRodAttack":0.15}`；8级：`{"rockCannon":4}`。Z：`rockRush`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 再生藤蔓（114）

开局收益：`{"regenRate":1.75,"meleeLeech":0.04}`。代价：`{"stats":{"spd":-0.2},"incomingTypes":{"fire":1.35,"ice":1.35}}`。

5级：`{"sunRegen":1.5,"sunStats":0.2}`；8级：`{"safeRegen":2,"safeDefense":0.3}`。Z：`thornField`。

估算边界：吸血按有效伤害结算并受每秒治疗预算限制。
### 亲子爱连击（115）

开局收益：`{"echo":0.35}`。代价：`{"firstDamage":0.9,"physicalIncoming":1.2}`。

5级：`{"echoHeal":0.002}`；8级：`{"echoStun":0.5}`。Z：`parentFury`。

估算边界：基础总段伤害0.90×1.35=1.215；进阶回血受统一治疗预算限制。
### 狙击龙卷（116）

开局收益：`{"critMultiplier":2.25,"moves":{"projectile":{"crit":0.25},"meteor":{"crit":0.25}}}`。代价：`{"nonCritDamage":0.85,"stats":{"hp":-0.15}}`。

5级：`{"contactPoison":2}`；8级：`{"rainCrit":0.2,"critPP":0.25}`。Z：`dragonVortex`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 避雷金角（118）

开局收益：`{"immune":["electric"],"rodAgility":0.25,"shieldDamage":1.6}`。代价：`{"stats":{"spdef":-0.25},"dryGrassIncoming":1.35}`。

5级：`{"dashEndSpeed":0.35}`；8级：`{"dashExecute":0.2}`。Z：`goldenDrill`。

估算边界：免疫收益依赖敌人攻击属性，不能折算为所有战斗的固定免伤。
### 核心解析（120）

开局收益：`{"orbitIntercept":true,"castingDamage":1.3}`。代价：`{"stats":{"hp":-0.2,"defense":-0.25}}`。

5级：`{"endHeal":0.15,"endCleanse":true}`；8级：`{"eightBeamsCrit":true}`。Z：`eightBeams`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 反射晶壁（122）

开局收益：`{"neutralReduction":0.2,"screenAura":160}`。代价：`{"stats":{"atk":-0.15,"spa":-0.15},"cooldown":1.1}`。

5级：`{"soundImmune":true}`；8级：`{"screenShieldRegen":0.015,"slowImmune":true}`。Z：`mirrorWave`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 技师连斩（123）

开局收益：`{"technician":1.35,"moves":{"melee":{"cd":0.8}}}`。代价：`{"incomingTypes":{"fire":1.6},"ban":["nova"]}`。

5级：`{"meleeSpeed":0.25}`；8级：`{"bladeWaves":2}`。Z：`crossSlash`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 恶魔霜吻（124）

开局收益：`{"moves":{"cone":{"range":1.4,"slow":0.4}}}`。代价：`{"stats":{"defense":-0.3},"incomingTypes":{"fire":1.35,"dark":1.35}}`。

5级：`{"slowImmune":true,"snowSpeed":0.25}`；8级：`{"immune":["water"],"waterHeal":0.5}`。Z：`frostKiss`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 电气引擎拳（125）

开局收益：`{"immune":["electric"],"electricEngine":0.06}`。代价：`{"incomingTypes":{"ground":1.4},"stats":{"stamina":-0.2}}`。

5级：`{"contactStun":0.3}`；8级：`{"thunderFistsGlobal":true}`。Z：`thunderFists`。

估算边界：免疫收益依赖敌人攻击属性，不能折算为所有战斗的固定免伤。
### 炎体加农炮（126）

开局收益：`{"moves":{"projectile":{"radius":1.5,"burn":2},"meteor":{"radius":1.5,"burn":2}},"fireDamage":1.3}`。代价：`{"rainDamage":0.75,"stats":{"spd":-0.2}}`。

5级：`{"contactBurn":3}`；8级：`{"fireFormation":true}`。Z：`fireCannon`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 自信头冠夹（127）

开局收益：`{"killAttack":0.01,"moves":{"melee":{"knock":1.6}}}`。代价：`{"stats":{"spdef":-0.3},"incomingTypes":{"fire":1.25,"flying":1.25,"rock":1.25}}`。

5级：`{"ignoreDefenseBuffs":true}`；8级：`{"throwCrit":true}`。Z：`titanThrow`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 愤怒狂冲（128）

开局收益：`{"moves":{"dash":{"range":1.6,"damage":1.4}},"heavyFury":true}`。代价：`{"physicalIncoming":1.3,"dashRecovery":0.2}`。

5级：`{"dashIntimidate":0.25}`；8级：`{"dashInvuln":true,"stampedeBoss":1.5}`。Z：`stampede`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 跃鲤狂龙（129）

开局收益：`{"magikarpGrowth":1.5,"gyaradosAttack":0.4}`。代价：`{"incomingTypes":{"electric":1.6},"gyaradosSpdef":0.8}`。

5级：`{"gyaradosCritWave":true}`；8级：`{"eliteReset":true}`。Z：`dragonRoar`。

估算边界：鲤鱼王共享宝可梦经验×1.5，暴鲤龙改为攻击×1.4，两形态收益不叠加。
### 乘风圣咏（131）

开局收益：`{"immune":["water","ice"],"absorbedHeal":0.15,"waterCurtain":200}`。代价：`{"stats":{"spd":-0.25},"moves":{"dash":{"cd":1.25}}}`。

5级：`{"heavyShield":0.15}`；8级：`{"frozenBeam":1.6}`。Z：`seaHymn`。

估算边界：免疫收益依赖敌人攻击属性，不能折算为所有战斗的固定免伤。
### 变身幻象（132）

开局收益：`{"dittoCopy":true}`。代价：`{"captainHp":0.7,"noItems":true}`。

5级：`{"contactStun":0.35}`；8级：`{"quantumCrit":0.3}`。Z：`quantumEcho`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 九彩适应力（133）

开局收益：`{"stabDamage":1.5,"typeResist":0.025}`。代价：`{"nonStabDamage":0.65,"nonStabCooldown":1.2}`。

5级：`{"weakReduction":0.2}`；8级：`{"prismFury":true}`。Z：`prismNova`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 代码下载（137）

开局收益：`{"download":0.35}`。代价：`{"incomingTypes":{"fighting":1.4},"stats":{"stamina":-0.15}}`。

5级：`{"homingTurns":2}`；8级：`{"dataFreeBeam":true}`。Z：`dataOverflow`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 多刺硬壳（138）

开局收益：`{"hitCap":0.35,"moves":{"projectile":{"count":1}},"mineDamage":1.3}`。代价：`{"stats":{"spd":-0.2},"incomingTypes":{"grass":1.6}}`。

5级：`{"counterSpikes":4}`；8级：`{"spikesShieldBreak":true}`。Z：`ancientSpikes`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 战斗利镰（140）

开局收益：`{"meleeLeech":0.05,"moves":{"melee":{"crit":0.25}}}`。代价：`{"dryCooldown":1.15,"incomingTypes":{"grass":1.6}}`。

5级：`{"lowDefense":1}`；8级：`{"rainLeech":0.05,"rainSpeed":0.3}`。Z：`scytheDance`。

估算边界：吸血按有效伤害结算并受每秒治疗预算限制。
### 远古天威（142）

开局收益：`{"stats":{"spd":0.3},"groundImmune":true,"pressure":0.35}`。代价：`{"stats":{"hp":-0.25},"incomingTypes":{"ice":1.25,"water":1.25,"electric":1.25,"steel":1.25,"rock":1.25}}`。

5级：`{"recoilImmune":true}`；8级：`{"meteorCover":true}`。Z：`ancientMeteors`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 贪吃腹鼓（143）

开局收益：`{"stats":{"hp":0.6},"incomingTypes":{"fire":0.65,"ice":0.65}}`。代价：`{"stats":{"spd":-0.25},"incomingTypes":{"fighting":1.4}}`。

5级：`{"rice":true}`；8级：`{"deathHeal":0.4}`。Z：`bellyDrum`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 极霜神域（144）

开局收益：`{"weather":"snow","iceAura":220}`。代价：`{"incomingTypes":{"rock":1.6},"moves":{"dash":{"cd":1.25}}}`。

5级：`{"frozenVulnerable":0.2}`；8级：`{"blizzardHeal":0.05}`。Z：`blizzard`。

估算边界：天气同时影响敌我双方，收益需按双方属性及天气规则计算。
### 雷霆天罚（145）

开局收益：`{"weather":"rain","electricCrit":0.25}`。代价：`{"incomingTypes":{"ice":1.35,"rock":1.35},"stats":{"defense":-0.2}}`。

5级：`{"contactLightning":true}`；8级：`{"stormFury":true}`。Z：`thunderstorm`。

估算边界：天气同时影响敌我双方，收益需按双方属性及天气规则计算。
### 涅槃不死火（146）

开局收益：`{"weather":"sun","movingTrail":"fire","phoenixRescue":true}`。代价：`{"incomingTypes":{"rock":1.6},"rainDamage":0.75}`。

5级：`{"contactBurn":3}`；8级：`{"burnDamage":1.5,"phoenixCrit":true}`。Z：`phoenixStorm`。

估算边界：天气同时影响敌我双方，收益需按双方属性及天气规则计算。
### 多重鳞片逆鳞（147）

开局收益：`{"fullHpReduction":0.45,"moves":{"dash":{"range":1.5},"melee":{"range":1.5}}}`。代价：`{"incomingTypes":{"ice":1.6},"ban":["mine"]}`。

5级：`{"statusDefense":0.4}`；8级：`{"outrageInvuln":true}`。Z：`outrage`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 精神利刃主宰（150）

开局收益：`{"stats":{"spa":0.25},"psychicPenetration":0.25}`。代价：`{"allyDamage":0.85,"captainIncomingTypes":{"dark":1.4,"ghost":1.4}}`。

5级：`{"globalPressure":0.2}`；8级：`{"deathHeal":0.4,"psychicStopCrit":true}`。Z：`psychicStop`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。
### 万物始源（151）

开局收益：`{"allMoves":true,"stats":{"agility":0.3},"ppDiscount":1}`。代价：`{"stats":{"hp":-0.2},"singleTypeDamage":0.75}`。

5级：`{"synchronize":true}`；8级：`{"genesisNova":true}`。Z：`genesis`。

估算边界：范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。

## 已确认的规则转换

喵喵每20队伍击杀，战后获得1G，每战最多2G；精英额外道具按事件胜利一次；刷新费×1.5向上取整。蛋树治愈果仅由特性产出，队伍2秒最多一颗、地上6颗，拾取恢复8%已损生命和1PP。卡比兽每20击杀一份米饭，每战最多2份，拾取恢复10%最大生命。敌方暴击条件改重击／伤害上限。伊布本系独立×1.5。非法固定招式优先用本种合法招式替换；梦幻全招式池进入技能修炼。

## 实施与验证状态

此文件先于运行时代码生成。实施完成后在 DEVELOPMENT.md 记录实际覆盖、必要验证结果与仍存在的限制。
