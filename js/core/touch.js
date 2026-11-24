/* Independent movement and aim sticks; HUD buttons use the same screen layout. */
G.Touch=(()=>{
 let cv=null,stick=null,aimStick=null,active=G.Settings.touch,buttons=[];
 const manual=()=>!!G.Settings.get('manualAim'),playing=()=>G.Game?.state==='playing';
 function controls(w=innerWidth,h=innerHeight){
  const safe=safeArea(),isLandscape=h<=500&&w>=h;
  const rScale=G.Settings.get('stick')||1;
  const r=isLandscape?Math.min(40*rScale,h*.16,42):Math.min(56*rScale,Math.max(30,w*.12),h*.15);
  const size=isLandscape?38:(w<360?40:44),gap=isLandscape?8:12,rowGap=isLandscape?(size+14):(size+28);
  const aim={x:w-safe.right-r-(isLandscape?12:16),y:h-safe.bottom-r-(isLandscape?14:24),r};
  const left=aim.x-r-(isLandscape?12:18)-size*2-gap;
  const moves=Array.from({length:4},(_,i)=>({x:left+(i%2)*(size+gap),y:aim.y-size-(isLandscape?10:20)+Math.floor(i/2)*rowGap,w:size,h:size}));
  return {aim,moves,item:{x:aim.x-size/2,y:aim.y-r-size-(isLandscape?12:24),w:size,h:size},size};
 }
 function hit(x,y){for(let i=buttons.length-1;i>=0;i--){const b=buttons[i];if(x>=b.x-b.pad&&x<=b.x+b.w+b.pad&&y>=b.y-b.pad&&y<=b.y+b.h+b.pad)return b;}return null;}
 let lastKey='',lastAt=0;
 function press(b){const key=Math.round(b.x)+','+Math.round(b.y),now=performance.now();if(key===lastKey&&now-lastAt<350)return;lastKey=key;lastAt=now;b.fn();}
 function start(id,x,y,touchId=null){
  if(!playing())return;const l=controls(),near=Math.hypot(x-l.aim.x,y-l.aim.y)<=l.aim.r+12;
  if(near){if(manual()&&!aimStick)aimStick={id,touchId,ox:l.aim.x,oy:l.aim.y,x,y,aim:true};return;}
  if(stick||manual()&&x>innerWidth/2)return;
  stick={id,touchId,ox:x,oy:y,x,y,aim:false};
 }
 function change(s,x,y){s.x=x;s.y=y;const dx=x-s.ox,dy=y-s.oy,d=Math.hypot(dx,dy),r=controls().aim.r;if(!s.aim&&d>r){s.ox=x-dx/d*r;s.oy=y-dy/d*r;}}
 function down(e){
  const touchy=e.pointerType!=='mouse';if(touchy&&!active){active=true;document.body.classList.add('touch');}
  const b=hit(e.clientX,e.clientY);if(b){e.preventDefault();press(b);return;}if(!touchy)return;
  e.preventDefault();start(e.pointerId,e.clientX,e.clientY);try{cv.setPointerCapture(e.pointerId);}catch{}
 }
 function move(e){for(const s of [stick,aimStick])if(s&&s.id===e.pointerId)change(s,e.clientX,e.clientY);}
 function up(e){if(stick?.id===e.pointerId)stick=null;if(aimStick?.id===e.pointerId)aimStick=null;}
 function reset(){stick=aimStick=null;}
 function init(canvas){
  cv=canvas;if(active)document.body.classList.add('touch');
  cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);for(const ev of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(ev,up);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('touchstart',e=>{
   if(e.cancelable)e.preventDefault();if(!active){active=true;document.body.classList.add('touch');}
   for(const t of e.changedTouches){const b=hit(t.clientX,t.clientY);if(b){press(b);continue;}
    const prior=[stick,aimStick].find(s=>s&&Math.hypot(s.x-t.clientX,s.y-t.clientY)<8&&s.touchId==null);
    if(prior)prior.touchId=t.identifier;else start('touch:'+t.identifier,t.clientX,t.clientY,t.identifier);
   }
  },{passive:false});
  cv.addEventListener('touchmove',e=>{if(e.cancelable)e.preventDefault();for(const t of e.changedTouches)for(const s of [stick,aimStick])if(s&&s.touchId===t.identifier)change(s,t.clientX,t.clientY);},{passive:false});
  for(const ev of ['touchend','touchcancel'])cv.addEventListener(ev,e=>{for(const t of e.changedTouches){if(stick?.touchId===t.identifier)stick=null;if(aimStick?.touchId===t.identifier)aimStick=null;}});
  document.addEventListener('selectstart',e=>{if(!e.target.closest?.('input,textarea,[contenteditable]'))e.preventDefault();});
  addEventListener('blur',reset);addEventListener('resize',reset);document.addEventListener('visibilitychange',reset);
  G.Settings.on(key=>{if(['manualAim','stick'].includes(key))reset();});
 }
 function vectorOf(s){if(!s||!playing())return null;const dx=s.x-s.ox,dy=s.y-s.oy,d=Math.hypot(dx,dy),r=controls().aim.r;if(d<7)return [0,0];const k=Math.min(1,(d-7)/(r*.5-7));return [dx/d*k,dy/d*k];}
 const vector=()=>vectorOf(stick),aimVector=()=>manual()?vectorOf(aimStick):null;
  /** Márgenes del iPhone (barra de inicio abajo, muesca a los lados), en px. */
  let safe = null;
  function safeArea() {
    if (safe) return safe;
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(d);
    const cs = getComputedStyle(d);
    safe = { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0,
             bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
    d.remove();
    return safe;
  }
  addEventListener('resize', () => { safe = null; });
  addEventListener('orientationchange', () => { safe = null; });


 function clearButtons(){buttons=[];}
 function addButton(x,y,w,h,fn,pad=6){buttons.push({x,y,w,h,fn,pad});}
 function wheel(ctx,s,r,color){const dx=s.x-s.ox,dy=s.y-s.oy,d=Math.hypot(dx,dy),k=d>r?r/d:1;ctx.fillStyle='rgba(10,20,48,.48)';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.ox,s.oy,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.globalAlpha=.85;ctx.fillStyle=color;ctx.beginPath();ctx.arc(s.ox+dx*k,s.oy+dy*k,r*.34,0,Math.PI*2);ctx.fill();}
 function draw(ctx){
  if(!playing()||G.Judgment?.cinematic){reset();return;}if(!active)return;const l=controls();ctx.save();ctx.globalAlpha=.6;
  if(stick)wheel(ctx,stick,l.aim.r,'#ffd23f');
  const a=aimStick||{ox:l.aim.x,oy:l.aim.y,x:l.aim.x,y:l.aim.y};wheel(ctx,a,l.aim.r,manual()?'#8be8ff':'#a8b8ce');
  if(!aimStick){ctx.fillStyle='#14283d';ctx.textAlign='center';ctx.font='700 11px Pixelify,"Segoe UI",sans-serif';ctx.fillText(G.T(manual()?'Apuntar':'Auto'),l.aim.x,l.aim.y+4);}
  ctx.restore();
 }
 return {init,vector,aimVector,draw,controls,clearButtons,addButton,reset,safeArea,get active(){return active;},get stick(){return stick;}};
})();
