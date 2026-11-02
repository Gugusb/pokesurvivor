const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {context}=require('./battle_fixture.cjs');
const scenarios=[
 ['early',{dead:true,time:40}],['growing',{dead:true,time:400}],['close',{dead:true,time:1000}],
 ['victory',{dead:false,time:1201,victory:true}],['endless',{dead:true,time:1600,completed:true}],
 ['arceus',{dead:true,time:1900,victory:true,judge:{time:100,bosses:1}}],
 ['record',{dead:false,time:1201,victory:true,record:true}],['departure',{dead:false,time:80}]
];
test('64 distinct localized result lines cover eight contexts without touching the result',()=>{
 for(const lang of ['es','en','zh']){
  const {G,load}=context(lang);load('js/data/fish-quips.js');const groups=G.FishQuips.groups,rows=Object.values(groups).flat();
  assert.equal(rows.length,64);assert.equal(new Set(rows.map(q=>q.id)).size,64);assert.equal(new Set(rows.map(q=>q.text[0])).size,64);
  for(const group of Object.values(groups)){assert.equal(group.length,8);for(const q of group){assert.equal(q.text.length,2);assert.ok(q.text.every(s=>s.length>15));if(lang==='zh')assert.match(G.T(q.text[0]),/[\u4e00-\u9fff]/);}}
  for(const [expected,r] of scenarios){const before=JSON.stringify(r),q=G.FishQuips.pick(r);assert.equal(q.group,expected);assert.equal(JSON.stringify(r),before);if(lang==='zh')assert.match(q.text,/[\u4e00-\u9fff]/);}
 }
});
test('victory after death and early personal records retain the correct context',()=>{
 const {G,load}=context();load('js/data/fish-quips.js');const category=G.FishQuips.category;
 assert.equal(category({dead:true,time:1300,victory:true,record:true}),'endless');
 assert.equal(category({dead:true,time:80,record:true}),'early');
 assert.equal(category({dead:true,time:500,record:true}),'growing');
 assert.equal(category({dead:true,time:1000,record:true}),'record');
 assert.equal(category({dead:false,time:1201,completed:true}),'victory');
 assert.equal(category({dead:false,time:1900,completed:true,judge:{}}),'arceus');
});
test('same-context results never repeat consecutively in one session',()=>{
 const {G,load,random}=context();load('js/data/fish-quips.js');random(Array(100).fill(0));let previous;
 for(let i=0;i<100;i++){const q=G.FishQuips.pick({dead:true,time:50});assert.notEqual(q.id,previous);previous=q.id;}
});
test('every result renders the quip through text nodes independently of support frequency',()=>{
 const {G,load}=context();load('js/data/fish-quips.js');const nodes=new Map();G.UI.$=id=>{if(id==='over-ask')return null;if(!nodes.has(id))nodes.set(id,{dataset:{},textContent:'',innerHTML:''});return nodes.get(id);};let shown;G.UI.show=id=>shown=id;G.Icons={html:()=>''};G.Funding=null;load('js/ui/run-ui.js');
 const r={dead:true,time:45,level:1,kills:2,bosses:0,coins:0,moves:[],breakdown:''};let calls=0;G.RunUI.showOver(r,()=>calls++);
 assert.equal(shown,'scr-over');assert.equal(nodes.get('over-fish-title').textContent,'大肥鱼吐槽');assert.match(nodes.get('over-fish-text').textContent,/[\u4e00-\u9fff]/);const first=nodes.get('over-fish').dataset.quip;
 G.RunUI.showOver(r,()=>calls++);assert.notEqual(nodes.get('over-fish').dataset.quip,first);assert.ok(!nodes.get('over-stats').innerHTML.includes('support-ask'));nodes.get('btn-again').onclick();assert.equal(calls,1);
 G.FishQuips.pick=()=>({id:'escaped',text:'<img src=x onerror=alert(1)>'});G.RunUI.showOver(r,()=>{});assert.equal(nodes.get('over-fish-text').textContent,'<img src=x onerror=alert(1)>');assert.equal(nodes.get('over-fish-text').innerHTML,'');
 const html=fs.readFileSync(path.join(__dirname,'../dev.html'),'utf8');assert.ok(html.indexOf('id="over-fish"')<html.indexOf('id="over-stats"'));assert.match(html,/<aside id="over-fish"[^>]*translate="no"/);
});
