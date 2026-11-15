/* Finite, account-wide packs. Server runs this same rule set atomically. */
G.CardPacks=(()=>{
 const PRICE=800;
 const themes=[['sprout','Primer brote','First Sprout','初芽', '#8bd5a5'],['ocean','Brisa marina','Sea Breeze','海风','#82d4ee'],['sunset','Atardecer','Sunset','落日','#ffa785'],['stars','Cielo estrellado','Starry Sky','星夜','#b6a4f5'],['snow','Nieve suave','Soft Snow','初雪','#bce8ed'],['forest','Bosque','Forest','林间','#71c5a4'],['flame','Chispa','Spark','火花','#f88a8d'],['thunder','Relámpago','Lightning','雷光','#f2d86b'],['sakura','Pétalos','Petals','樱雨','#f4a9cf'],['journey','Nuevo viaje','New Journey','启程','#cba77d']].map(([id,es,en,zh,color])=>({id,name:{es,en,zh},color}));
 const local=v=>v?.[G.I18n.lang]||v?.en||v;
 const cards=[...G.Upgrades.LIST.map(u=>({id:'stat:'+u.id,kind:'stat',key:u.id,max:u.max,name:u.name,desc:u.unit,icon:u.icon})),...G.STARTER_ITEMS.map(u=>({id:'item:'+u.id,kind:'item',key:u.id,max:1,name:u.name,desc:u.desc,icon:u.icon})),{id:'tickets',kind:'tickets',max:10,name:{es:'100 vales',en:'100 Draw Tickets',zh:'抽奖券 ×100'},icon:'ticket'},{id:'gems',kind:'gems',max:10,name:{es:'20 gemas',en:'20 Ability Gems',zh:'特性宝石 ×20'},icon:'gem'},...themes.map(u=>({id:'theme:'+u.id,kind:'theme',key:u.id,max:1,name:u.name,icon:'star'}))];
 const BY=Object.assign(Object.create(null),Object.fromEntries(cards.map(c=>[c.id,c])));
 function normalize(s){
   if(!s.cardPack||s.cardPack.v!==1){
     let refund=0;const records=Object.values(s.pupg||{});if(!records.length)records.push(s.upgrades||{});
     for(const record of records)for(const u of G.Upgrades.LIST){const n=Math.max(0,Math.min(u.max,Math.floor(+record?.[u.id]||0)));for(let i=0;i<n;i++)refund+=G.Upgrades.cost(u.id,i);}
     s.cardPack={v:1,refund,refundDue:refund,taken:{},disabled:{},theme:'',seq:0,pending:null};
   }
   s.pupg={};s.upgrades={};s.pupgDone=true;const p=s.cardPack;
   p.refundDue=Math.max(0,Number(p.refundDue)||0);const credit=Math.min(p.refundDue,Math.max(0,1e8-(s.coins||0)));s.coins=(s.coins||0)+credit;p.refundDue-=credit;
   const taken={};for(const c of cards)taken[c.id]=Math.max(0,Math.min(c.max,Math.floor(+p.taken?.[c.id]||0)));p.taken=taken;
   p.disabled=Object.fromEntries(G.STARTER_ITEMS.filter(i=>p.disabled?.[i.id]===true).map(i=>[i.id,true]));
   if(!themes.some(t=>t.id===p.theme&&p.taken['theme:'+t.id]))p.theme='';
   p.seq=Math.max(0,Math.min(1e9,Math.floor(+p.seq||0)));
   if(p.pending&&(!Number.isSafeInteger(p.pending.seq)||p.pending.seq!==p.seq||!Array.isArray(p.pending.options)||p.pending.options.length<1||p.pending.options.length>3||p.pending.options.some(id=>!BY[id]||taken[id]>=BY[id].max)))p.pending=null;
   return p;
 }
 const levels=s=>{const p=normalize(s);return Object.fromEntries(G.Upgrades.LIST.map(u=>[u.id,p.taken['stat:'+u.id]||0]));};
 const remaining=s=>{const p=normalize(s);return cards.reduce((n,c)=>n+c.max-p.taken[c.id],0);};
 function draw(s,rng=Math.random){const p=normalize(s);if(p.pending)return p.pending;if(!remaining(s))throw Error('Pack empty');if(s.coins<PRICE)throw Error('Not enough coins');
   const bag=[];for(const c of cards)for(let n=p.taken[c.id];n<c.max;n++)bag.push(c.id);const options=[];for(let i=0;i<3&&bag.length;i++){const k=Math.min(bag.length-1,Math.floor(rng()*bag.length));options.push(bag.splice(k,1)[0]);}
   s.coins-=PRICE;p.pending={seq:++p.seq,options};return p.pending;
 }
 function choose(s,seq,index){const p=normalize(s),offer=p.pending;if(!offer||seq!==offer.seq||!Number.isInteger(index)||index<0||index>=offer.options.length)throw Error('Invalid pack choice');const c=BY[offer.options[index]];if(c.kind==='tickets'&&s.tickets.t1+100>1e7||c.kind==='gems'&&s.abilityGems+20>1e8)throw Error('Wallet limit reached');p.taken[c.id]++;p.pending=null;if(c.kind==='tickets')s.tickets.t1+=100;if(c.kind==='gems')s.abilityGems+=20;return c.id;}
 function toggle(s,id){const p=normalize(s);if(!G.STARTER_ITEMS.some(i=>i.id===id)||!p.taken['item:'+id])throw Error('Item locked');p.disabled[id]=!p.disabled[id];}
 function equip(s,id){const p=normalize(s);if(id&&!themes.some(t=>t.id===id&&p.taken['theme:'+id]))throw Error('Theme locked');p.theme=id;}
 const enabled=(s,id)=>{const p=normalize(s);return !!p.taken['item:'+id]&&!p.disabled[id];};
 return {PRICE,cards,BY,themes,local,normalize,levels,remaining,draw,choose,toggle,equip,enabled};
})();
