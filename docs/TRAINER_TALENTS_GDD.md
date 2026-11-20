# 远征训练家等级奖励系统（训练家潜能 / 海克斯系统）设计与落地规范

> **文档标识**：`docs/TRAINER_TALENTS_GDD.md`  
> **适用版本**：PokéSurvivor-Next 远征模式（`codex/expedition-next`）  
> **设计定位**：融合“云顶之弈强化符文（海克斯）”的阶段质变感与“自走棋（万象棋/酒馆战棋）”的升级即时决策，解决训练家升本仅增加人口的平淡感，构建每级升级的策略爆发点（Power Spike）。

---

## 目录
1. [系统概述与设计原则](#一系统概述与设计原则)
2. [等级阶梯与稀有度划分](#二等级阶梯与稀有度划分)
3. [核心选卡机制与决策规则](#三核心选卡机制与决策规则)
4. [四维词条库规范与落地表](#四四维词条库规范与落地表)
5. [数据结构与接口契约 (JSON Schema)](#五数据结构与接口契约-json-schema)
6. [运行周期与系统钩子接入 (Hook Architecture)](#六运行周期与系统钩子接入-hook-architecture)
7. [界面表现与交互规范 (UI/UX)](#七界面表现与交互规范-uiux)
8. [工程分期与自动化验证方案](#八工程分期与自动化验证方案)

---

## 一、系统概述与设计原则

### 1.1 背景痛点
当前小队远征的训练家等级（Trainer Level 1~10）核心收益为：
1. 上阵人口扩充（`squadCap: 1 -> 10`）
2. 商店高费概率解锁（`odds`）
3. 队长在 Lv.5、Lv.8 触发升阶进化（`captainEvolutionLevels: [5, 8]`）

**问题**：玩家在多数升级节点（如 Lv.2、3、4、6、7、9、10）只获得被动的人口上限，缺少**“升本即时带来质变决策”**的兴奋感与逆风翻盘点。

### 1.2 核心设计哲学
- **万象升级即有奖（Upgrade-to-Pick）**：每次训练家等级提升，立即进入三选一界面，提供即战力或长线运营资源。
- **云顶阶梯质变感（Tier Escalation）**：将海克斯稀有度自然绑定到训练家等级阶梯上。前期低阶稳运营，中期核心定流派，后期高阶破规则。
- **宝可梦宇宙代入（Pokémon Immersion）**：抛弃冰冷的泛用词汇，将稀有度命名为**精灵球（白银）、超级球（黄金）、高级球（钻石）、大师球（炫彩）**，词条均以宝可梦对战道具、特性、招式、培育家及得文/西尔佛科技为包装。

---

## 二、等级阶梯与稀有度划分

根据 `config/economy_config.json` 的升级曲线（经验需求：4/6/10/16/24/36/52/72/96），将全周期 9 次升级奖励分为 4 档品质：

```
[Lv.2] ─── 精灵球 (Silver)  ─── 基础特训、红白球金币、微观运营
[Lv.3] ─── 精灵球 (Silver)  ─── 基础属性、小额经验、前期平稳过渡
[Lv.4] ─── 超级球 (Gold)    ─── 阵容初成、属性徽章(心)、特定机制启动
[Lv.5] ─── 超级球 (Gold)    ─── 【队长一阶进化节点】、职业核心强化
[Lv.6] ─── 超级球 (Gold)    ─── 中期发力、高阶利息、合成特训
[Lv.7] ─── 高级球 (Ultra)   ─── 终局前瞻、高级转职、王牌技能解放
[Lv.8] ─── 高级球 (Ultra)   ─── 【队长二阶进化节点】、双特性/全员超武
[Lv.9] ─── 大师球 (Prismatic) ─ 极巨化/终极天候/全图暴走/逆转规则
[Lv.10] ── 大师球 (Prismatic) ─ 终极羁绊冠位、无限PP/百搭光环
```

### 2.1 品质分布概率表（允许出现“高跳”惊喜）
为了保持升级时的惊喜感（类似云顶彩色开局），每个等级采用**主保底品质 + 小概率跃迁**的机制：

| 升至等级 | 精灵球 (Silver) | 超级球 (Gold) | 高级球 (Ultra) | 大师球 (Prismatic) | 备注与节奏 |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Lv.2** | **90%** | 10% | - | - | 前期开荒润滑 |
| **Lv.3** | **80%** | 20% | - | - | 确定开局思路 |
| **Lv.4** | 15% | **80%** | 5% | - | 进阶中期，定型流派 |
| **Lv.5** | - | **85%** | 15% | - | **队长进化爆发期** |
| **Lv.6** | - | **75%** | 25% | - | 中后期过渡 |
| **Lv.7** | - | 20% | **75%** | 5% | 高阶强化启动 |
| **Lv.8** | - | - | **80%** | 20% | **队长终极进化爆发期** |
| **Lv.9** | - | - | 15% | **85%** | 终极海克斯决战 |
| **Lv.10** | - | - | - | **100%** | 满级终极规则神仙打架 |

---

## 三、核心选卡机制与决策规则

### 3.1 选卡窗口呈现规则（三选一）
每次升级判定触发时，系统从对应品质的池子中随机生成 **3 张互不相同** 的训练家潜能卡片。

### 3.2 智能定向发牌算法（Smart Tailoring）
避免纯火系队伍连续抽到“水系强化”或“近战强化”的死局，每次抽取 3 张卡遵循 **“2 定向 + 1 通用”** 槽位逻辑：
- **槽位 1（主羁绊/队长定向）**：读取当前出战队伍中**层数最高/人数最多的属性羁绊**，或队长的属性/职业，权重加权抽取该分类专属强化。
- **槽位 2（阵容/战力相关）**：抽取小队战力、防御、异常状态、PP/冷却等通用战斗强化。
- **槽位 3（经济/卡池/通用中立）**：抽取金币、免费刷新、扩容、经验、掉落等运营类词条。

### 3.3 训练家重掷（Reroll）机制
- **局内重掷次数**：每场远征默认提供 **2 次** 免费重掷机会（可通过特定词条增加）。
- **重掷范围**：点击【重掷】后，当前展示的 3 张卡全部重新随机，保持当次升级的品质档位不变。已重掷过的卡片在本次选择中不再重复出现。

### 3.4 连跨多级的队列机制（Upgrade Queue）
若玩家在商店一口气连买经验跨越多个等级（例如从 Lv.3 直接跳到 Lv.5）：
- 系统将待选奖励压入 `run.pendingTalentPicks = [ { targetLevel: 4, tier: 'great' }, { targetLevel: 5, tier: 'great' } ]`。
- 界面按顺序一次弹出一个，选完第一个后无缝弹出下一个，**绝不吞奖励、不覆盖选择**。

---

## 四、四维词条库规范与落地表

词条按四类维度划分：
1. `BONDS`：羁绊与转职类
2. `ECONOMY`：经济与资源类
3. `COMBAT`：战斗与机制类
4. `CAPTAIN`：队长与王牌特化类

---

### 4.1 精灵球级（Silver / Tier 1）

| ID | 名称 (中/EN) | 维度 | 效果描述 | 技术落地参数 |
| :--- | :--- | :---: | :--- | :--- |
| `silver_pokeball_pack` | **红白球补给**<br>Pokéball Supply | ECONOMY | 立即获得 6G 金币与 2 张免费商店刷新券。 | `{ gold: 6, freeRefreshes: 2 }` |
| `silver_basic_training` | **基础体能特训**<br>Basic Conditioning | COMBAT | 全体出战成员基础攻击力 +8%，移动速度 +10%。 | `{ atkPct: 0.08, moveSpeedPct: 0.10 }` |
| `silver_exp_share` | **学习装置**<br>Exp. Share | ECONOMY | 每次战斗获胜后，额外获得 +1 训练家经验与 +15 宝可梦经验罐储存。 | `{ bonusTrainerXp: 1, bonusReserveXp: 15 }` |
| `silver_potion_kit` | **应急伤药箱**<br>Field Medic Kit | COMBAT | 立即恢复 20 点小队生命，并提升 10 点小队生命上限。 | `{ healSquadHp: 20, maxSquadHpBonus: 10 }` |
| `silver_scout_whistle` | **集结哨**<br>Rallying Whistle | BONDS | 战斗中队员脱战聚拢时间由 0.22s 缩短至 0.10s，聚拢期间所受伤害降低 25%。 | `{ gatherDelay: 0.10, gatherDmgReduction: 0.25 }` |
| `silver_savings_plan` | **定期储蓄**<br>Savings Plan | ECONOMY | 基础利息结算阈值由每 10G+1 降低为每 8G+1（上限仍为 5G）。 | `{ interestDivisor: 8 }` |
| `silver_iron_defense` | **铁壁展开**<br>Vanguard Shell | COMBAT | 每次进入战斗时，前排队员获得相当于自身最大生命 20% 的临时护盾，持续 12 秒。 | `{ combatStartShieldPct: 0.20, durationSec: 12 }` |

---

### 4.2 超级球级（Gold / Tier 2）

| ID | 名称 (中/EN) | 维度 | 效果描述 | 技术落地参数 |
| :--- | :--- | :---: | :--- | :--- |
| `gold_crest_<type>` | **<属性>徽章（18种）**<br><Type> Crest | BONDS | 对应属性羁绊的生效计数永久 +1，并随机获得 1 只该属性的一阶宝可梦。 | `{ typeBondBonus: "<type>", grantTier1Mon: "<type>" }` |
| `gold_eviolite` | **进化奇石**<br>Eviolite Ward | COMBAT | 队伍中未达到最终形态的宝可梦，受到伤害降低 25%，造成伤害提升 20%。 | `{ nfeDmgReduction: 0.25, nfeDmgBonus: 0.20 }` |
| `gold_shop_vip` | **友好商店 VIP**<br>PokéMart VIP | ECONOMY | 商店刷新费用永久降低 1G（最低 1G），且每次进店首个宝可梦享受 5 折。 | `{ refreshCostDiscount: 1, firstSlotDiscountPct: 0.5 }` |
| `gold_blaze_instinct` | **逆境本能**<br>Pinch Instinct | COMBAT | 小队生命低于 50% 时，全员攻击速度与暴击率提升 30%，击杀敌人小额回复小队生命。 | `{ lowHpThreshold: 0.5, atkSpdPct: 0.3, critPct: 0.3, killHealSquadHp: 0.2 }` |
| `gold_captain_link` | **连携主将**<br>Coordinated Lead | CAPTAIN | 队长每次释放招式，为距离最近的 2 名队友缩减该招式 15% 的冷却时间。 | `{ captainCastCdrAllyPct: 0.15, targets: 2 }` |
| `gold_devon_investment` | **得文公司风险投资**<br>Devon Venture | ECONOMY | 立即失去当前 50% 的金币；接下来连续 4 天每场战斗结算额外获得 10G。 | `{ instantGoldCostPct: 0.50, wageBonus: 10, remainingDays: 4 }` |
| `gold_dual_screen` | **双墙守卫（反射壁/光墙）**<br>Screen Synergy | COMBAT | 队伍受到的接触碰撞伤害与预警爆炸伤害固定削减 20%。 | `{ contactDmgReduction: 0.20, projectileDmgReduction: 0.20 }` |

---

### 4.3 高级球级（Ultra / Tier 3）

| ID | 名称 (中/EN) | 维度 | 效果描述 | 技术落地参数 |
| :--- | :--- | :---: | :--- | :--- |
| `ultra_crown_<type>` | **<属性>王冠（18种）**<br><Type> Crown | BONDS | 对应属性羁绊计数 +2，且该属性全员每次造成属性克制伤害时引发范围脉冲。 | `{ typeBondBonus: 2, typePulseOnHit: "<type>", pulsePct: 0.4 }` |
| `ultra_fourth_move` | **超越极限**<br>Beyond Limits | CAPTAIN | 队长立即解锁第 4 个技能栏位，并当场从队长可用招式池中自选 1 个高级招式。 | `{ unlockCaptainFourthMove: true, promptMoveDraft: true }` |
| `ultra_dual_ability` | **特性觉醒**<br>Trait Awakening | CAPTAIN | 队长的初始特性数值效果提升 100%，且额外获得其物种的隐藏特性。 | `{ doubleCaptainTrait: true, unlockHiddenTrait: true }` |
| `ultra_bench_reserves` | **战备战术扩容**<br>Tactical Reserves | ECONOMY | 候补仓库上限扩充（4 -> 6）；候补席的宝可梦亦可提供 40% 的支援特性加成。 | `{ reserveCapBonus: 2, benchSupportRatio: 0.40 }` |
| `ultra_overclock_all` | **全员突破驱动**<br>Overclock Matrix | COMBAT | 所有 3 星队员的招式等级上限额外 +1，且释放超武无需消耗备用 PP。 | `{ maxStarSkillLevelBonus: 1, freeSuperMovePP: true }` |
| `ultra_reroll_master` | **战术大师**<br>Tactical Genius | ECONOMY | 立即获得 3 次重掷机会；每次刷新商店有 20% 概率刷出高一阶的宝可梦商品。 | `{ grantRerolls: 3, upgradeShopSlotChance: 0.20 }` |

---

### 4.4 大师球级（Prismatic / Tier 4 - 终极规则逆转）

| ID | 名称 (中/EN) | 维度 | 效果描述 | 技术落地参数 |
| :--- | :--- | :---: | :--- | :--- |
| `master_dynamax_ace` | **极巨化王牌**<br>Dynamax Ace | CAPTAIN | 战斗开始时队长体型放大 60%，基础生命与双防提升 150%，攻击判定范围翻倍并免疫击退。 | `{ scaleMult: 1.6, hpMult: 2.5, defMult: 2.5, hitRadiusMult: 2.0, immuneKnockback: true }` |
| `master_omni_bond` | **全属性共鸣（百搭同盟）**<br>Prismatic Prism | BONDS | 队长获得【全能标签】，自动计入当前队伍中所有已点亮羁绊（每种羁绊计数均 +1）。 | `{ captainOmniTag: true }` |
| `master_sacred_ash` | **圣灰奇迹**<br>Sacred Ash | COMBAT | 致命保护：当小队生命或队长生命归零时，免死并爆发全场净化闪光消灭所有非BOSS敌人，恢复 40 小队生命（整局限 1 次）。 | `{ cheatDeathSquadHp: 40, wipeMinions: true, charges: 1 }` |
| `master_infinite_pp` | **无限活力矩阵**<br>Infinite Power | COMBAT | 全体队员招式冷却缩减 35%，技能施放不再受 PP 限制，进入常态超武狂轰模式。 | `{ cdrPct: 0.35, ignorePPRequirement: true }` |
| `master_silph_syndicate` | **西尔佛全资收购**<br>Silph Monopoly | ECONOMY | 立即获得 40G 金币；利息上限突破至 12G；商店每次刷新必定出现至少 1 张 5 费传说宝可梦。 | `{ instantGold: 40, maxInterest: 12, guaranteedTier5Slot: true }` |

---

## 五、数据结构与接口契约 (JSON Schema)

### 5.1 配置文件定位
配置文件放置于：`config/trainer_talents.json`。标准构建时经打包内嵌，确保离线与网络端一致。

### 5.2 `trainer_talents.json` 数据规范

```json
{
  "version": "1.0.0",
  "tiers": {
    "silver": { "name": "精灵球级", "color": "#e0e0e0", "badge": "ball_poke" },
    "great": { "name": "超级球级", "color": "#4da6ff", "badge": "ball_great" },
    "ultra": { "name": "高级球级", "color": "#ffd11a", "badge": "ball_ultra" },
    "master": { "name": "大师球级", "color": "#cc66ff", "badge": "ball_master" }
  },
  "levelDropOdds": {
    "2": { "silver": 90, "great": 10, "ultra": 0, "master": 0 },
    "3": { "silver": 80, "great": 20, "ultra": 0, "master": 0 },
    "4": { "silver": 15, "great": 80, "ultra": 5, "master": 0 },
    "5": { "silver": 0,  "great": 85, "ultra": 15, "master": 0 },
    "6": { "silver": 0,  "great": 75, "ultra": 25, "master": 0 },
    "7": { "silver": 0,  "great": 20, "ultra": 75, "master": 5 },
    "8": { "silver": 0,  "great": 0,  "ultra": 80, "master": 20 },
    "9": { "silver": 0,  "great": 0,  "ultra": 15, "master": 85 },
    "10": { "silver": 0, "great": 0,  "ultra": 0,  "master": 100 }
  },
  "talents": [
    {
      "id": "silver_pokeball_pack",
      "tier": "silver",
      "category": "ECONOMY",
      "name": { "zh": "红白球补给", "en": "Pokéball Supply", "es": "Suministro Poké Ball" },
      "desc": { "zh": "立即获得 6G 金币与 2 张免费商店刷新券。", "en": "Gain 6G and 2 free shop refreshes immediately.", "es": "Gana 6G y 2 actualizaciones de tienda gratis." },
      "effects": {
        "instantGold": 6,
        "freeRefreshes": 2
      }
    },
    {
      "id": "gold_crest_fire",
      "tier": "great",
      "category": "BONDS",
      "tagType": "fire",
      "name": { "zh": "火之徽章", "en": "Fire Crest", "es": "Medalla Fuego" },
      "desc": { "zh": "火属性羁绊生效数 +1，并获得 1 只小火龙。", "en": "Fire bond count +1, and receive a Charmander.", "es": "Vínculo Fuego +1, recibe un Charmander." },
      "effects": {
        "typeBondOffset": { "fire": 1 },
        "grantSpeciesDex": 4
      }
    }
  ]
}
```

### 5.3 运行态状态（`run` 对象挂载）

```javascript
// 在远征实例 run 中扩充字段
run.trainerTalents = [
  // 已经生效的潜能实例
  { id: "silver_savings_plan", tier: "silver", acquiredAtLevel: 2, timestamp: 1732100000 }
];
run.pendingTalentPicks = [
  // 升级排队待选
  // { targetLevel: 3, tier: "silver" }
];
run.talentRerolls = 2; // 当前剩余重掷次数
```

---

## 六、运行周期与系统钩子接入 (Hook Architecture)

系统与现有系统的挂接点（Hook points）设计如下：

```
                [经验增加: addXp(amount)]
                          │
                   (检查是否跨级)
                          ▼
           [产生 pendingTalentPicks 队列]
                          │
     ┌────────────────────┴────────────────────┐
     ▼                                         ▼
【战斗中升级】                             【商店/日程中购买经验】
战后收拢结算时暂停                         立即暂停商店操作
在 renderLoot() 之前弹出选卡               直接触发选卡模态弹窗
     │                                         │
     └────────────────────┬────────────────────┘
                          ▼
                  [玩家确认 3 选 1]
                          │
              ├── 即时效果 (发钱/加血/送卡/开技能)
              ├── 状态持久化 (加入 run.trainerTalents)
              └── 静态属性重算 (syncTrainer & recountBonds)
```

### 6.1 关键拦截点与代码伪代码

#### 1. `js/systems/economy.js` - 经验溢出与升级侦测
```javascript
function addXp(s, amount) {
  const oldLevel = s.trainerLevel;
  s.trainerXp += Math.max(0, amount);
  const nextTarget = () => levelRow(s.trainerLevel).xpToNext;
  
  while (s.trainerLevel < maxLevel(s) && s.trainerXp >= nextTarget()) {
    s.trainerXp -= nextTarget();
    s.trainerLevel++;
    // 触发升级钩子，入队奖励
    G.TrainerTalents?.onLevelUp(s, s.trainerLevel);
  }
  // ...保持原有封顶与返回...
}
```

#### 2. `js/systems/expedition.js` - 队列展示与时序
- **战斗中升本**：战斗过程中即使拾取经验升级，也不在战斗中弹窗打断走位，统一在战斗结束清场、存入经验罐并进入战利品阶段时处理：
  ```javascript
  if (run.pendingTalentPicks && run.pendingTalentPicks.length > 0) {
    G.TrainerTalents.showPickModal(() => {
      // 选完后恢复原流程
      renderLoot();
    });
  }
  ```
- **商店里买经验升本**：点击【购买经验】按钮如果触发升级，商店界面立即锁定，弹出三选一，选完后刷新商店羁绊与战力。

---

## 七、界面表现与交互规范 (UI/UX)

### 7.1 三选一弹窗规范
- **模态遮罩**：深色半透明遮罩（`rgba(0, 0, 0, 0.75)`），伴随清脆的“等级提升”音效与对应球种光效展开。
- **卡片布局**：横向排布 3 张大卡片，适配 PC 宽屏与手机触屏竖向排布（Flex 响应式折行）。
- **卡片要素**：
  1. 顶部球种徽标（精灵球/超级球/高级球/大师球纹章）
  2. 潜能分类标签（【羁绊】、【运营】、【战力】、【主将】）
  3. 卡片名称与中英双语说明
  4. 底部大按钮【选择】
- **辅助操作**：
  - 弹窗底部显示：`剩余重掷次数: X`，右侧带【🎲 重掷候选】按钮。
  - 支持键盘快捷键：数字键 `1`, `2`, `3` 快速选卡，`R` 键触发重掷。

### 7.2 局内状态展示（HUD 与小队页）
- **HUD 快捷查看**：在战斗左侧 HUD 经验条下方，展示已激活潜能的球种圆形小图标。悬浮/点击展示已激活效果摘要。
- **小队详情页 Tab**：在 `T` 键小队编队页面右侧，新增【训练家潜能】专属栏位，清晰罗列本局获取的全部海克斯。

---

## 八、工程分期与自动化验证方案

### 8.1 分期落地计划

| 阶段 | 周期 | 核心目标 | 落地内容 |
| :---: | :---: | :--- | :--- |
| **Phase 1** | 第 1 周 | **骨架贯通与通用池** | 1. 建立 `config/trainer_talents.json` 与 `trainer-talents.js`<br>2. 接入 `addXp` 升级事件与队列弹窗<br>3. 跑通白银级 7 个通用词条（金币、加血、属性、经验）与重掷。 |
| **Phase 2** | 第 2 周 | **羁绊徽章与商店机制** | 1. 接入 18 属性徽章（转职+1）与智能定向权重算法<br>2. 接入得文投资、商店折算、扩容等高阶经济词条<br>3. 适配手机端/桌面端 UI 响应式布局。 |
| **Phase 3** | 第 3 周 | **队长特化与大师球大招** | 1. 接入第 4 技能栏位解锁、极巨化王牌、名刀免死等复杂机制<br>2. 接入完整的音效包与品质光效动效。 |

### 8.2 自动化测试用例（`tools/test_trainer_talents.cjs`）
遵循本项目既有的测试标准，编写自动化断言脚本：
1. **等级入队断言**：模拟 `addXp` 连升 2 级，验证 `pendingTalentPicks.length === 2`。
2. **定向权重断言**：在纯火系阵容下，模拟 1000 次抽取，验证火系徽章出现概率显著高于其他非相关属性。
3. **效果生效断言**：
   - 验证选择 `silver_pokeball_pack` 后，`run.gold` 正确 +6，刷新券正确 +2。
   - 验证选择 `gold_crest_fire` 后，`TypeBonds` 中火属性层数/人数正确 +1。
   - 验证免死词条在受到致死攻击时阻止 Game Over 并恢复指定血量。
4. **重掷防重断言**：验证重掷扣除次数，且新抽出的 3 张卡不包含被替换掉的旧卡。

---

*本规范严格遵循 `AGENTS.md` 约定的版本规范与隔离测试原则，代码接入时不修改稳定线（`main`），所有功能在 `codex/expedition-next` 闭环构建并验证。*
