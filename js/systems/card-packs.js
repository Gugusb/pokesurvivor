/* Finite, account-wide packs. Server runs this same rule set atomically. */
G.CardPacks=(()=>{
 const PRICE=800;
 const themes=[['sprout','Primer brote','First Sprout','初芽', '#8bd5a5'],['ocean','Brisa marina','Sea Breeze','海风','#82d4ee'],['sunset','Atardecer','Sunset','落日','#ffa785'],['stars','Cielo estrellado','Starry Sky','星夜','#b6a4f5'],['snow','Nieve suave','Soft Snow','初雪','#bce8ed'],['forest','Bosque','Forest','林间','#71c5a4'],['flame','Chispa','Spark','火花','#f88a8d'],['thunder','Relámpago','Lightning','雷光','#f2d86b'],['sakura','Pétalos','Petals','樱雨','#f4a9cf'],['journey','Nuevo viaje','New Journey','启程','#cba77d']].map(([id,es,en,zh,color])=>({id,name:{es,en,zh},color}));
 const local=v=>v?.[G.I18n.lang]||v?.en||v;
 const skills=[
  {key:'maxpp',icon:'berry',name:{es:'Reserva PP',en:'PP Capacity',zh:'PP上限'},desc:{es:'+1 PP máximo',en:'+1 maximum PP',zh:'所有技能最大PP +1'}},
  {key:'agility',icon:'clock',name:{es:'Agilidad',en:'Agility',zh:'敏捷成长'},desc:{es:'+5% de agilidad base',en:'+5% base agility',zh:'+5%基础敏捷'}},
  {key:'stamina',icon:'boot',name:{es:'Aguante',en:'Stamina',zh:'耐力成长'},desc:{es:'+5% de aguante base',en:'+5% base stamina',zh:'+5%基础耐力'}},
  {key:'retention',icon:'gem',name:{es:'Conservación PP',en:'PP Retention',zh:'PP留存率'},desc:{es:'+3% de no gastar PP',en:'+3% chance to spend no PP',zh:'施放时不消耗PP的概率 +3个百分点'}}
 ].map(u=>({...u,id:'skill:'+u.key,kind:'skill',max:6}));
 const items=[...G.STARTER_ITEMS,...(G.BREAKTHROUGH_ITEMS||[])];
 const itemCard=u=>({id:'item:'+u.id,kind:'item',key:u.id,max:1,name:u.name,desc:u.desc,icon:u.icon,boss:!!u.boss});
 const legacy={id:'stat:cd',kind:'stat',key:'cd',max:8,name:G.Upgrades.BY.cd.name,desc:G.Upgrades.BY.cd.unit,icon:'clock'};
 const packs=[
  {id:'beginner',price:800,name:{es:'Primeros pasos',en:'Beginner Pack',zh:'初心者包'},cards:[...G.Upgrades.LIST.filter(u=>u.id!=='cd').map(u=>({id:'stat:'+u.id,kind:'stat',key:u.id,max:u.max,name:u.name,desc:u.unit,icon:u.icon})),...G.STARTER_ITEMS.map(itemCard),{id:'tickets',kind:'tickets',max:10,name:{es:'100 vales',en:'100 Draw Tickets',zh:'抽奖券 ×100'},icon:'ticket'},{id:'gems',kind:'gems',max:10,name:{es:'20 gemas',en:'20 Ability Gems',zh:'特性宝石 ×20'},icon:'gem'},...themes.map(u=>({id:'theme:'+u.id,kind:'theme',key:u.id,max:1,name:u.name,icon:'star'}))]},
  {id:'breakthrough',price:2700,name:{es:'Superación de movimientos',en:'Move Breakthrough Pack',zh:'招式突破卡包'},cards:[...skills,...(G.BREAKTHROUGH_ITEMS||[]).map(itemCard),...[...new Set(G.DEX.map(m=>G.ZAccess?.root(m.dex)||m.dex))].sort((a,b)=>a-b).map(d=>({id:'z:'+d,kind:'z',key:d,max:1,name:G.DEX_BY[d].name,desc:{es:'Permiso Z para toda la familia evolutiva',en:'Z permission for this entire evolution family',zh:'解锁整条进化链携带Z石的权限'},icon:'gem'}))]}
 ];
 const speedCards=[1.5,2,3].map(value=>({id:'speed:'+value,kind:'speed',key:value,max:1,name:{es:'Velocidad '+value+'×',en:value+'× Speed',zh:value+'倍速权限'},desc:{es:'Desbloquea esta velocidad de juego',en:'Unlocks this game speed',zh:'解锁此游戏速度，可在操作设置中选择'},icon:'clock'}));
 packs[0].cards.push(...speedCards.slice(0,2));packs[1].cards.push(speedCards[2]);
 const cards=packs.flatMap(p=>p.cards),BY=Object.assign(Object.create(null),Object.fromEntries([...cards,legacy].map(c=>[c.id,c])));
 const packBy=Object.assign(Object.create(null),Object.fromEntries(packs.map(p=>[p.id,p])));
 const available=(s,p,c)=>Math.max(0,c.max-(p.taken[c.id]||0))*(c.kind==='z'&&G.ZAccess?.allowed(s,c.key)?0:1);
 function normalize(s){
   if(!s.cardPack||s.cardPack.v!==1){
     let refund=0;const records=Object.values(s.pupg||{});if(!records.length)records.push(s.upgrades||{});
     for(const record of records)for(const u of G.Upgrades.LIST){const n=Math.max(0,Math.min(u.max,Math.floor(+record?.[u.id]||0)));for(let i=0;i<n;i++)refund+=G.Upgrades.cost(u.id,i);}
     s.cardPack={v:1,refund,refundDue:refund,taken:{},disabled:{},theme:'',seq:0,pending:null};
   }
   s.pupg={};s.upgrades={};s.pupgDone=true;const p=s.cardPack;
   p.refundDue=Math.max(0,Number(p.refundDue)||0);const credit=Math.min(p.refundDue,Math.max(0,1e8-(s.coins||0)));s.coins=(s.coins||0)+credit;p.refundDue-=credit;
   const taken={};for(const c of [...cards,legacy])taken[c.id]=Math.max(0,Math.min(c.max,Math.floor(+p.taken?.[c.id]||0)));p.taken=taken;
   p.tokens=Object.fromEntries(packs.map(pack=>[pack.id,Math.max(0,Math.min(1e6,Math.floor(+p.tokens?.[pack.id]||0)))]));
   if(p.skillMigrated!==1){const bonus=taken['stat:cd']*.03,levels=Math.min(6,Math.floor((bonus+1e-9)/.05));taken['skill:agility']=levels;p.legacyAgility=Math.max(0,bonus-levels*.05);p.skillMigrated=1;}
   p.legacyAgility=Math.max(0,Math.min(.24,Number(p.legacyAgility)||0));
   p.disabled=Object.fromEntries(items.filter(i=>p.disabled?.[i.id]===true).map(i=>[i.id,true]));
   if(!themes.some(t=>t.id===p.theme&&taken['theme:'+t.id]))p.theme='';
   p.seq=Math.max(0,Math.min(1e9,Math.floor(+p.seq||0)));
   const offer=p.pending;
   if(offer){
    offer.pack ||= 'beginner';const pack=packBy[offer.pack];
    if(!pack||!Number.isSafeInteger(offer.seq)||offer.seq!==p.seq||!Array.isArray(offer.options)||!offer.options.length||offer.options.length>3||offer.options.some(id=>!BY[id]||!(pack.cards.includes(BY[id])||offer.pack==='beginner'&&id===legacy.id)||taken[id]>=BY[id].max))p.pending=null;
    else if(offer.options.some(id=>BY[id].kind==='z'&&!available(s,p,BY[id]))){
     // A duplicate acquisition may unlock a paid offer between drawing and claiming.
     const replacement=pack.cards.filter(c=>available(s,p,c)&&!offer.options.includes(c.id));
     offer.options=offer.options.flatMap(id=>BY[id].kind==='z'&&!available(s,p,BY[id])?(replacement.length?[replacement.shift().id]:[]):[id]);
     if(!offer.options.length){if(offer.token)p.tokens[pack.id]++;else p.refundDue+=pack.price;p.pending=null;}
    }
   }
   return p;
 }
 const levels=s=>{const p=normalize(s);return {...Object.fromEntries(G.Upgrades.LIST.map(u=>[u.id,u.id==='cd'?0:p.taken['stat:'+u.id]||0])),...Object.fromEntries(skills.map(c=>[c.key,p.taken[c.id]||0])),legacyAgility:p.legacyAgility};};
 const remaining=(s,id='beginner')=>{const p=normalize(s);return (packBy[id]?.cards||[]).reduce((n,c)=>n+available(s,p,c),0);};
 function draw(s,rng=Math.random,id='beginner',token=false){const p=normalize(s);if(p.pending)return p.pending;const pack=packBy[id];if(!pack)throw Error('Invalid pack');if(!remaining(s,id))throw Error('Pack empty');if(token?!p.tokens[id]:s.coins<pack.price)throw Error(token?'No pack owned':'Not enough coins');
   const bag=[];for(const c of pack.cards)for(let n=0;n<available(s,p,c);n++)bag.push(c.id);const options=[];for(let i=0;i<3&&bag.length;i++){const k=Math.max(0,Math.min(bag.length-1,Math.floor(rng()*bag.length)));options.push(bag.splice(k,1)[0]);}
   if(token)p.tokens[id]--;else s.coins-=pack.price;p.pending={seq:++p.seq,pack:id,options,...(token?{token:true}:{})};return p.pending;
 }
 function choose(s,seq,index){const p=normalize(s),offer=p.pending;if(!offer||seq!==offer.seq||!Number.isInteger(index)||index<0||index>=offer.options.length)throw Error('Invalid pack choice');const c=BY[offer.options[index]];if(c.kind==='tickets'&&s.tickets.t1+100>1e7||c.kind==='gems'&&s.abilityGems+20>1e8)throw Error('Wallet limit reached');p.taken[c.id]++;p.pending=null;if(c.id==='stat:cd')p.legacyAgility+=.03;if(c.kind==='tickets')s.tickets.t1+=100;if(c.kind==='gems')s.abilityGems+=20;if(c.kind==='z')G.ZAccess.unlock(s,c.key,'cardpack');return c.id;}
 function toggle(s,id){const p=normalize(s);if(!items.some(i=>i.id===id)||!p.taken['item:'+id])throw Error('Item locked');p.disabled[id]=!p.disabled[id];}
 function equip(s,id){const p=normalize(s);if(id&&!themes.some(t=>t.id===id&&p.taken['theme:'+id]))throw Error('Theme locked');p.theme=id;}
 const enabled=(s,id)=>{const p=normalize(s);return !!p.taken['item:'+id]&&!p.disabled[id];};
 const speedAllowed=(s,value)=>value===1||speedCards.some(c=>c.key===value&&normalize(s).taken[c.id]>0);
 const allowedSpeeds=s=>[1,...speedCards.filter(c=>normalize(s).taken[c.id]>0).map(c=>c.key)];
 function grantToken(s,id,n=1){const p=normalize(s);if(!packBy[id]||!Number.isSafeInteger(n)||n<1)return false;p.tokens[id]=Math.min(1e6,p.tokens[id]+n);return true;}
 function rollBoss(rift=false,rng=Math.random){return rng()<(rift?.2:.1)?(rng()<.75?'beginner':'breakthrough'):null;}
 return {speedAllowed,allowedSpeeds,grantToken,rollBoss,PRICE,packs,packBy,skills,items,cards,BY,themes,local,normalize,levels,remaining,draw,choose,toggle,equip,enabled};
})();
