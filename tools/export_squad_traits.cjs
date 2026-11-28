/* Export the current supplied design, without regenerating or reshuffling it. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
require('./import_trait_rework.cjs');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/trait_rework_index.json'),'utf8'));
const rows=data.families.map(f=>'| '+f.rootDex+' | '+f.quality+' | '+f.members.map(m=>m.nameZh+' (#'+m.dex+')').join('、')+' | '+[1,2,3].map(n=>f.descriptionsByStar[n]).join(' | ')+' |');
const text=['# 远征队员特性目录（v3 · 方案B）','','来源：`data/trait_rework_index.json` v'+data.version+'（Plan '+(data.plan||'B')+'）；本表由 `node tools/export_squad_traits.cjs` 导出。','','509家族、966物种，同进化链固定特性。全部143个5品质家族冻结不变；1—4品质替换190个终端家族（保留3/4品质小火龙、树枕尾熊、嘟嘟、天蝎、滴蛛、铝钢龙共6家族12物种），最终按物种为773∶193（80.02%∶19.98%），按家族为368∶141（72.30%∶27.70%）。队长保留特性勋章。','','实施口径：仅上阵存活队员触发；复活特性可在倒下时生效。普通施法与击杀按持有者自身跨战斗累计（不计炮台/地雷/光柱跳伤/环绕命中/额外连发）；未激活、冷却或达到上限时计数停在门槛前一次。周围指编队前后各1位，不含自身。新增经济与支援模板具备明确单场/每周期边界；所有数字已按星级/品质预计算，UI不重复相乘。','','每10/50层按完整组数结算，不足一组不提供对应增益。神兽全属性为生命/双攻/双防，体型同步增大；幻兽复活次数每场重置，3游戏秒后满血复活。','','| 家族根 | 品质 | 成员 | 1星效果 | 2星效果 | 3星效果 |','| ---: | ---: | --- | --- | --- | --- |',...rows,''].join('\n');
fs.writeFileSync(path.join(root,'docs/TRAIT_CATALOG.md'),text);console.log('Exported '+data.families.length+' JSON family assignments.');
