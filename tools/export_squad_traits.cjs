/* Export the current supplied design, without regenerating or reshuffling it. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
require('./import_trait_rework.cjs');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/trait_rework_index.json'),'utf8'));
const rows=data.families.map(f=>'| '+f.rootDex+' | '+f.quality+' | '+f.members.map(m=>m.nameZh+' (#'+m.dex+')').join('、')+' | '+[1,2,3].map(n=>f.descriptionsByStar[n]).join(' | ')+' |');
const text=['# 远征队员特性目录（v2）','','来源：`data/trait_rework_index.json` v'+data.version+'；本表由 `node tools/export_squad_traits.cjs` 导出，不重新分配家族。','','509家族、966物种，同进化链固定特性。独立特性356家族，条件特性153家族；数值以JSON各星级整数为准。队长保留特性勋章。','','实施口径：仅上阵存活队员触发；复活特性可在倒下时生效。施法/击杀按持有者自身跨战斗累计；全队队员升星或队长进化升星触发升星条件。周围指编队前后各1位，不含自身；邻位共享的同一羁绊每次触发只增加一次。最高层属性从全队已激活属性中选一条，同层按属性固定顺序。永久增益只留在本局实际受益实体，不补给后来的队员；双攻点数按面板原始属性点转换为内部伤害单位。','','每10/50层按完整组数结算，不足一组不提供对应增益。神兽全属性为生命/双攻/双防/移速/敏捷/耐力，体型同步增大；幻兽复活次数每场重置，3游戏秒后满血复活。新表金币、经验、免费刷新全部启用；所有数字已包括新星级/品质/条件权重，UI不重复相乘，也不显示特性名/类别/公式。','','| 家族根 | 品质 | 成员 | 1星效果 | 2星效果 | 3星效果 |','| ---: | ---: | --- | --- | --- | --- |',...rows,''].join('\n');
fs.writeFileSync(path.join(root,'docs/TRAIT_CATALOG.md'),text);console.log('Exported '+data.families.length+' JSON family assignments.');
