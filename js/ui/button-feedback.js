/* Delegated feedback survives screen rerenders and works for mouse, touch and keyboard. */
G.ButtonFeedback=(()=>{
 const selector='button,input[type=button],input[type=submit],[role=button],summary,.menu-item,.card',last=new WeakMap(),active=[];
 function pulse(el,x,y){if(el.disabled||el.getAttribute('aria-disabled')==='true')return;const now=performance.now();if(now-(last.get(el)||-1000)<120)return;last.set(el,now);const calm=G.Settings?.get('calm')||matchMedia('(prefers-reduced-motion: reduce)').matches;el.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.28)'},{filter:'brightness(1)'}],{duration:calm?140:260});const r=el.getBoundingClientRect(),mark=document.createElement('span');mark.className='ui-button-burst'+(calm?' calm':'');mark.style.left=(Number.isFinite(x)?x:r.left+r.width/2)+'px';mark.style.top=(Number.isFinite(y)?y:r.top+r.height/2)+'px';mark.setAttribute('aria-hidden','true');document.body.append(mark);active.push(mark);while(active.length>16)active.shift().remove();setTimeout(()=>{mark.remove();const i=active.indexOf(mark);if(i>=0)active.splice(i,1);},420);}
 document.addEventListener('pointerdown',e=>{if(e.button>0)return;const b=e.target.closest?.(selector);if(b)pulse(b,e.clientX,e.clientY);},true);
 document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||!['Enter',' '].includes(e.key)||e.target.matches?.('input:not([type=button]):not([type=submit]),textarea,select,[contenteditable=true]'))return;const b=e.target.closest?.(selector);if(b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'){e.preventDefault();pulse(b);b.click();}},true);
 document.addEventListener('click',e=>{if(e.detail!==0)return;const b=e.target.closest?.(selector);if(b)pulse(b);},true);
 return {pulse};
})();
