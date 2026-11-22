/* Analytical estimates, not simulated DPS. Keep the balancing assumptions reviewable. */
const fs=require('node:fs'),vm=require('node:vm');
const c=JSON.parse(fs.readFileSync('config/leader_abilities_gen1.json','utf8'));
const ctx=vm.createContext({G:{}});
vm.runInContext(fs.readFileSync('js/systems/progression-mon.js','utf8'),ctx);
const pct=x=>Math.round(x*100)+'%',n=x=>Number(x.toFixed(3));
const rows=c.families.map(f=>{
 const b=f.base,k=f.cost,s={...b.stats,...k.stats},moves=b.moves||{},damage=b.damage||1;
 const estimates={};
 for(const [kind,m] of Object.entries(moves)){
  const baseCount=['nova'].includes(kind)?8:3;
  estimates[kind]={singleHit:n(damage*(m.damage||1)),castRate:n(1/(m.cd||1)/(k.cooldown||1)),coverageRadius:m.radius||m.range||1,
   projectileCountRatio:n(((baseCount+(m.count||0))*(m.countFactor||1))/baseCount),tickRate:m.tickRate||1};
 }
 const defense=s.defense||0,hp=s.hp||0;
 const ehp=n((1+hp)*(1+defense)/(k.incoming||1));
 return {family:f.root,name:f.name.zh,estimates,physicalEhpRatio:ehp,statFactors:Object.fromEntries(Object.entries(s).map(([a,v])=>[a,n(1+v)])),
  ppCostByKind:k.extraPP||{},z:f.active.kind,chargeEvent:f.charge.event};
});
const text=['# 第一世代队长特性：实施前收益估算与调参',
'','日期：2026-11-22。覆盖设计文档实际的 74 个家族（原目录标注的 68 与正文不一致）。',
'','## 估算口径',
'','以下是实施前的静态估算，不是实测 DPS。各招式按常规 3 弹、全向 8 弹、80 敏捷／耐力估算；只比较命中同一目标的伤害、施法频率、覆盖半径、覆盖目标数、物理有效生命和 PP 消耗，不把范围面积直接算成单体增伤。增益与代价均按开局生效；进阶为训练家 5／8 级。',
'','Z 由家族勋章解锁，满充手动施放，最多一发。按匹配队伍的理论施法间隔／事件频率归一到约 60 秒战斗游戏时间；无对应行为不充能。首次从零开始，跨战斗保存。单次 Z 的直接伤害预算约为队长主技能的 10 秒基础输出，分摊到各段；附带控制／团队收益较强时减小直接伤害。并非保证每套队伍都恰好 60 秒。',
'','## 明显离群值的调整',
'','- 袋兽：原首段 0.75 × (1+0.35) = 1.0125，只有 1.25% 收益却承担接触易伤，首段改 0.90，合计 1.215 倍。',
'- 超梦：原特攻 1.5 倍且无视一半防御，约 3 倍输出，改为特攻 +25%、穿甲 25%，约 1.667 倍；队友减伤害的代价保留。',
'- 妙蛙：原半径 1.8、跳频 1.5，在均匀密度敌群的覆盖输出上限约 4.86 倍，改为半径 1.5、跳频 1.25，覆盖输出约 2.81 倍，单目标只增加 25% 跳频；移速代价降低至 20%。',
'- 杰尼龟：80 耐力降 35% 后 PP 回复约从 2.714/s 降到 2.238/s，加一 PP 的续航惩罚过大，改耐力 -20%，额外 PP 仍 +1。',
'- 卡比兽：原双倍生命叠火冰减半约为 4 倍对应属性有效生命，改生命 +60%、火冰受伤 ×0.65，约 2.46 倍。',
'- 大范围吸血统一受每秒每只最大生命 3% 的治疗预算限制；白盾最多最大生命 40%。百分比伤害对精英／BOSS按队长输出预算封顶，普通怪按设计比例；避免高生命首领被单次多段结算抹除。',
'- 长时间无冷却仍保留 0.15 秒调度间隔；同时最多 64 个特性领域、240 个特性弹丸。自动触发衍生攻击不再次充能，不形成回响／击杀循环。',
'- 全队常驻增伤、减防、伤害免疫及脆弱惩罚，逐家族在配置中收敛。下表以最终配置为准，原文保留在 source 供核对。',
'','## 逐家族开局收益',
'','`单击× / 施法× / 半径× / 数量× / 跳频×` 互为不同维度，不直接相乘冒充单体 DPS。物理有效生命比仅计生命、物防、通用易伤，不包含属性克制、白盾、控制和临时进阶。',
'','|家族|招式收益（单击／施法／半径／数量／跳频）|属性乘数|物理有效生命×|Z充能条件|',
'|---|---|---|---|---|',
...rows.map(r=>'|'+r.name+'|'+(Object.entries(r.estimates).map(([k,v])=>k+': '+Object.values(v).join(' / ')).join('<br>')||'条件机制，见配置及下列说明')+'|'+(Object.entries(r.statFactors).map(([k,v])=>k+'×'+v).join('，')||'1')+'|'+r.physicalEhpRatio+'|'+r.chargeEvent+'|'),
'','## 条件收益与资源约束',
'',...c.families.map(f=>'### '+f.name.zh+'（'+f.root+'）\n\n'+
 '开局收益：`'+JSON.stringify(f.base)+'`。代价：`'+JSON.stringify(f.cost)+'`。\n\n'+
 '5级：`'+JSON.stringify(f.five)+'`；8级：`'+JSON.stringify(f.eight)+'`。Z：`'+f.active.kind+'`。\n\n'+
 '估算边界：'+(f.base.meleeLeech||f.base.projectileLeech?'吸血按有效伤害结算并受每秒治疗预算限制。':f.base.immune?'免疫收益依赖敌人攻击属性，不能折算为所有战斗的固定免伤。':f.base.weather||f.eight.weather?'天气同时影响敌我双方，收益需按双方属性及天气规则计算。':f.base.bankDamage?'每20存款提高3%伤害（试玩封顶30%），附带经济与存款机会成本。':f.base.missingHealthPower?'80%失血时双攻／敏捷各增加48%；自然回复为零，满血输出有惩罚。':f.base.echo?'基础总段伤害0.90×1.35=1.215；进阶回血受统一治疗预算限制。':f.base.magikarpGrowth?'鲤鱼王共享宝可梦经验×1.5，暴鲤龙改为攻击×1.4，两形态收益不叠加。':'范围、异常、控制或特殊规则仅在对应招式／条件存在时兑现；Z平均收益取决于手动施放和命中。')),
'','## 已确认的规则转换',
'','喵喵每20队伍击杀，战后获得1G，每战最多2G；精英额外道具按事件胜利一次；刷新费×1.5向上取整。蛋树治愈果仅由特性产出，队伍2秒最多一颗、地上6颗，拾取恢复8%已损生命和1PP。卡比兽每20击杀一份米饭，每战最多2份，拾取恢复10%最大生命。敌方暴击条件改重击／伤害上限。伊布本系独立×1.5。非法固定招式优先用本种合法招式替换；梦幻全招式池进入技能修炼。',
'','## 实施与验证状态',
'','此文件先于运行时代码生成。实施完成后在 DEVELOPMENT.md 记录实际覆盖、必要验证结果与仍存在的限制。'];
fs.writeFileSync('docs/LEADER_ABILITIES_GEN1_BALANCE.md',text.join('\n')+'\n');
fs.writeFileSync('tools/cache/leader-gen1-estimates.json',JSON.stringify(rows,null,2));
console.log('Estimated '+rows.length+' leader families.');
