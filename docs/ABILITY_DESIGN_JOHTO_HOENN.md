# 城都与丰缘五星宝可梦特性设计表

核对日期：2026-10-15。范围依据本仓库 `js/data/pokedex.js` 中 gen=2/3、rarity=5 的实际名单：城都 7 只，丰缘 13 只。包含游戏同档的非传说宝可梦（以 ★ 标记）。下列为主系列普通形态的普通/隐藏特性与原版战斗效果；暂不包括 Mega、原始回归和未实装的其他形态。按现代主系列规则归纳，非指第二/三世代当时即有这些隐藏特性。

**状态：用户设计已在 v0.4.0 实现。** 原版效果与用户移植设计分别列示。仍按每只宝可梦每个特性一枚勋章、同时只装备一枚的既定规则。相同特性是否沿用已确认的游戏效果，由用户决定。

## 城都：7 只，13 枚候选勋章

| 图鉴编号 | 宝可梦（图鉴来源） | 普通特性 | 隐藏特性 | 用户设计 |
|---|---|---|---|---|
| 243 | [雷公](https://pokemondb.net/pokedex/raikou) | 压迫感 | 精神力 | 已实现 |
| 244 | [炎帝](https://pokemondb.net/pokedex/entei) | 压迫感 | 精神力 | 已实现 |
| 245 | [水君](https://pokemondb.net/pokedex/suicune) | 压迫感 | 精神力 | 已实现 |
| 248 | [班基拉斯](https://pokemondb.net/pokedex/tyranitar) ★ | 扬沙 | 紧张感 | 已实现 |
| 249 | [洛奇亚](https://pokemondb.net/pokedex/lugia) | 压迫感 | 多重鳞片 | 已实现 |
| 250 | [凤王](https://pokemondb.net/pokedex/ho-oh) | 压迫感 | 再生力 | 已实现 |
| 251 | [时拉比](https://pokemondb.net/pokedex/celebi) | 自然回复 | 无 | 已实现 |

## 丰缘：13 只，18 枚候选勋章

| 图鉴编号 | 宝可梦（图鉴来源） | 普通特性 | 隐藏特性 | 用户设计 |
|---|---|---|---|---|
| 289 | [请假王](https://pokemondb.net/pokedex/slaking) ★ | 懒惰 | 无 | 已实现 |
| 373 | [暴飞龙](https://pokemondb.net/pokedex/salamence) ★ | 威吓 | 自信过度 | 已实现 |
| 376 | [巨金怪](https://pokemondb.net/pokedex/metagross) ★ | 恒净之躯 | 轻金属 | 已实现 |
| 377 | [雷吉洛克](https://pokemondb.net/pokedex/regirock) | 恒净之躯 | 结实 | 已实现 |
| 378 | [雷吉艾斯](https://pokemondb.net/pokedex/regice) | 恒净之躯 | 冰冻之躯 | 已实现 |
| 379 | [雷吉斯奇鲁](https://pokemondb.net/pokedex/registeel) | 恒净之躯 | 轻金属 | 已实现 |
| 380 | [拉帝亚斯](https://pokemondb.net/pokedex/latias) | 飘浮 | 无 | 已实现 |
| 381 | [拉帝欧斯](https://pokemondb.net/pokedex/latios) | 飘浮 | 无 | 已实现 |
| 382 | [盖欧卡](https://pokemondb.net/pokedex/kyogre) | 降雨 | 无 | 已实现 |
| 383 | [固拉多](https://pokemondb.net/pokedex/groudon) | 日照 | 无 | 已实现 |
| 384 | [烈空坐](https://pokemondb.net/pokedex/rayquaza) | 气闸 | 无 | 已实现 |
| 385 | [基拉祈](https://pokemondb.net/pokedex/jirachi) | 天恩 | 无 | 已实现 |
| 386 | [代欧奇希斯](https://pokemondb.net/pokedex/deoxys) | 压迫感 | 无 | 已实现 |

## 原版效果参考

以下均为原版回合制战斗效果，非本游戏秒数或百分比设计。

| 特性（效果来源） | 原版战斗效果 | 用户确认的游戏效果 |
|---|---|---|
| [压迫感](https://pokemondb.net/ability/pressure) | 对手对自身使用招式时额外消耗 1 点 PP。 |沿用之前的
| [精神力](https://pokemondb.net/ability/inner-focus) | 防止畏缩；现代规则还免疫威吓造成的攻击下降。 |沿用之前的
| [扬沙](https://pokemondb.net/ability/sand-stream) | 登场时发动沙暴，现代规则通常持续 5 回合，可被道具延长。 |每隔40s，召唤持续时长20s的沙暴天气
| [紧张感](https://pokemondb.net/ability/unnerve) | 使对手无法食用树果。 |沿用之前的
| [多重鳞片](https://bulbapedia.bulbagarden.net/wiki/Multiscale_(Ability)) | 满血时，受到的攻击伤害减半。 |沿用之前的
| [再生力](https://pokemondb.net/ability/regenerator) | 替换退场时，恢复自身最大 HP 的 1/3。 |一段时间5s没受到伤害后，每秒恢复5%最大生命
| [自然回复](https://pokemondb.net/ability/natural-cure) | 替换退场时，解除自身异常状态。 |免疫减速效果，直到受到伤害（一段时间20s未受到伤害后恢复）
| [懒惰](https://pokemondb.net/ability/truant) | 每行动一回合，下一回合就会偷懒，无法使用招式。 |每3次发动技能后，下次发动技能冷却增加100%，并回复5%最大生命
| [威吓](https://pokemondb.net/ability/intimidate) | 登场时，使对手攻击降低 1 级。 |攻击对敌人附加害怕debuff，使其伤害降低20%，持续3s，重复命中刷新
| [自信过度](https://pokemondb.net/ability/moxie) | 击倒对手后，自身攻击提升 1 级。 |击倒敌人后，获得自信buff：攻击+10%，持续3s，最多叠加5层，每层时间独立
| [恒净之躯](https://pokemondb.net/ability/clear-body) | 防止其他宝可梦降低自身能力等级；不阻止自己招式的降能力副作用。 |获得的增益效果持续时间延长50%
| [轻金属](https://pokemondb.net/ability/light-metal) | 自身体重减半，影响按体重计算效果的招式。 |受到伤害时，获得加速buff：移速提高20%，持续5s，最多叠加3层，重复获得刷新时间
| [结实](https://pokemondb.net/ability/sturdy) | 满血时受到致命攻击可保留 1 HP；免疫一击必杀类招式。 |受到致命攻击时保留1hp，然后恢复50%最大生命，每个地表阶段限一次，进出裂隙不刷新
| [冰冻之躯](https://pokemondb.net/ability/ice-body) | 冰雹/雪天时，每回合恢复最大 HP 的 1/16；旧作还免疫冰雹伤害。 |雪天时，每秒恢复最大 HP 的 3%
| [飘浮](https://pokemondb.net/ability/levitate) | 处于离地状态，通常免疫地面招式及撒菱、毒菱等地面效果。 |可以越过障碍物，但是期间无法发动技能；穿越期间减速50%，开始与结束各减速70%持续0.3s，两档不叠乘
| [降雨](https://pokemondb.net/ability/drizzle) | 登场时发动下雨天气，现代规则通常持续 5 回合，可被道具延长。 |每隔40s，召唤持续时长20s的下雨天气
| [日照](https://pokemondb.net/ability/drought) | 登场时发动大晴天天气，现代规则通常持续 5 回合，可被道具延长。 |每隔40s，召唤持续时长20s的晴天天气
| [气闸](https://pokemondb.net/ability/air-lock) | 在场时使天气产生的效果无效，天气本身并未被清除。 |使天气效果无效，没有天气时暴击伤害提高50%
| [天恩](https://pokemondb.net/ability/serene-grace) | 招式追加效果的触发概率翻倍，如灼伤、畏缩或能力变化；不提升暴击率。 |造成伤害时有10%概率随机施加一个debuff

## 沿用的本游戏同名效果

| 特性 | 已实现效果 |
|---|---|
| 压迫感 | 周围 240 范围内敌人攻击频率降低 20%。 |
| 精神力 | v0.25.0 起：未使用技能 PP 恢复额外 ×1.2，不再提供后台冷却。 |
| 紧张感 | 命中目标后施加 3 秒紧张：受到治疗降低 50%。 |
| 多重鳞片 | 满血时受到的攻击伤害减半，回满后重新生效。 |

用户已确认：害怕持续 3 秒、重复刷新；结实只在地表阶段更新时刷新，进出裂隙不刷新；天恩从减速（20%/3 秒）、普通灼伤（1 层/3 秒）、中毒（1 层/4 秒）、静电（2 秒）、紧张（3 秒）、害怕（3 秒）中等概率选择。飘浮起止各减速 70% 持续 0.3 秒，持续穿越减速 50%，两档不叠乘。实现边界和验证记录见 `DEVELOPMENT.md` 的 v0.4.0 条目。
