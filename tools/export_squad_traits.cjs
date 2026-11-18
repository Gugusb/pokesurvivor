/* Rebuild the reviewable trait catalogue from the same data as the game. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),s={G:{}};vm.createContext(s);
for(const f of ['js/data/pokedex.js','js/data/evolutions.js','js/systems/progression-mon.js','js/data/squad-traits.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),s,{filename:f});
const {G}=s,families=new Map(),totals={stacking:0,economic:0,terminal:0};
for(const m of G.DEX){const r=G.MonProgression.rootFor(m.dex);if(!families.has(r))families.set(r,[]);families.get(r).push(m);totals[G.SquadTraitDefs.forDex(m.dex).category]++;}
const events={kill:'自身击败15只敌人',hit:'自身招式命中60次',critical:'自身暴击10次',hurt:'自身实际受击3次',day:'每天自然结束',clear:'限时全歼',release:'放生其他伙伴',elite:'精英事件通关（每场一次）',merge:'队伍合成升阶',boss:'击败20/40/60天及后续周期BOSS',shop:'访问商店（每天一次）',discount:'招募优惠'};
const scopes={all:'自身全部已激活羁绊',first:'自身首属性已激活羁绊',skill:'自身职业已激活羁绊'};
const rows=G.SquadTraitDefs.LIST.map(d=>{
 let effect;if(d.category==='stacking')effect=scopes[d.scope]+' +'+d.base+'层'+(d.event==='release'?'（每2只）':'');
 else if(d.category==='economic')effect=d.id==='recruit-bargain'?'招募减价8%':d.id==='daily-interest'?'事件触发前钱包的5%':d.base+'金币'+(d.id==='elite-supplier'?' +1次免费刷新':d.id==='boss-recruiter'?' +1张定向招募券':'');
 else effect=Object.entries({power:'每层+0.8%独立增伤',haste:'每层+0.5%冷却缩减（上限40%）',execute:'每层0.4%斩杀线（普通敌人上限50%，精英/BOSS改为血线内增伤）',size:'每层+0.6%范围（上限+300%）',shield:'每层5%基础生命开战白盾'}).filter(([k])=>d[k]).map(([k,v])=>d.id==='terminal-balance'?(k==='power'?'每层+0.4%独立增伤':'每层2.5%基础生命开战白盾'):v).join('；');
 return '| '+d.name.zh+' | `'+d.id+'` | '+({stacking:'叠层',economic:'经济',terminal:'终端'}[d.category])+' | '+(events[d.event]||'自身已激活羁绊有效层数')+' | '+effect+' |';
});
const text=['# 远征首轮特性目录与分配','',
'由 `node tools/export_squad_traits.cjs` 从运行时数据生成；规则与限制见 [TRAIT_SYSTEM_GDD.md](TRAIT_SYSTEM_GDD.md)。金额、层数与终端系数乘阶级×品质权重，次数资源只乘阶级。表内为1阶1品底数。','',
'目录30项：叠层15、经济9、终端6，严格5:3:2。按进化链根编号的固定散列排序后循环分配，当前509家族为255/153/101；966物种为'+totals.stacking+'/'+totals.economic+'/'+totals.terminal+'。家族长短不同，因此物种比例约52.0%/29.5%/18.5%，不是逐物种精确配额。当前映射可复现；以后扩充图鉴时应审查本表的分配差异。','',
'| 名称 | ID | 类别 | 触发 | 基准效果 |','| --- | --- | --- | --- | --- |',...rows,'',
'## 全物种分配','',
'同一进化链（含分支）共用一个特性；合成保留特性，立即用新阶级及进化形态的品质计算后续收益，不补发历史收益。队长不使用本目录。','',
'| 家族根编号 | 特性 | 类别 | 当前图鉴成员（编号） |','| ---: | --- | --- | --- |',
...[...families].sort(([a],[b])=>a-b).map(([r,ms])=>{const d=G.SquadTraitDefs.forDex(ms[0].dex);return '| '+r+' | '+d.name.zh+' | '+({stacking:'叠层',economic:'经济',terminal:'终端'}[d.category])+' | '+ms.map(m=>m.name+' (#'+m.dex+')').join('、')+' |';}),''].join('\n');
fs.writeFileSync(path.join(root,'docs/TRAIT_CATALOG.md'),text);console.log('Exported 30 traits, '+families.size+' families, '+G.DEX.length+' species.');
