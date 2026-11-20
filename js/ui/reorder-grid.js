/* Local pointer drag/drop component. Touch uses a grip so lists can still scroll. */
G.ReorderGrid=(()=>{
  function bind(root,{enabled=()=>true,onDrop=()=>{}}={}){
    let pending=null,ghost=null,target=null,blockClickUntil=0,scrollFrame=0,cursor=null;
    function dropAt(x,y){
      const hit=document.elementFromPoint(x,y)?.closest('[data-squad-drop]');
      return hit&&root.contains(hit)&&hit.dataset.squadDrop!=='locked'?hit:null;
    }
    function autoScroll(){
      scrollFrame=0;if(!ghost||!cursor)return;const pane=document.elementFromPoint(cursor.x,cursor.y)?.closest('.squad-battle-scroll,.squad-warehouse-strip');if(pane&&root.contains(pane)){const r=pane.getBoundingClientRect(),dy=cursor.y<r.top+36?-10:cursor.y>r.bottom-36?10:0;if(dy){pane.scrollTop+=dy;const next=dropAt(cursor.x,cursor.y);if(next!==target){target?.classList.remove('drop-target');target=next;target?.classList.add('drop-target');}}}scrollFrame=requestAnimationFrame(autoScroll);
    }
    function clear(){
      cancelAnimationFrame(scrollFrame);scrollFrame=0;cursor=null;
      pending?.element.classList.remove('dragging');target?.classList.remove('drop-target');ghost?.remove();
      pending=null;ghost=null;target=null;document.body.classList.remove('squad-drag-active');
    }
    function down(e){
      if(e.button>0||!enabled())return;const item=e.target.closest('[data-drag-key]');
      if(!item||!root.contains(item)||e.pointerType==='touch'&&!e.target.closest('.squad-drag-handle'))return;
      pending={key:item.dataset.dragKey,element:item,x:e.clientX,y:e.clientY,pointer:e.pointerId};
    }
    function move(e){
      if(!pending||e.pointerId!==pending.pointer)return;
      if(!enabled()){clear();return;}
      if(!ghost&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<7)return;
      e.preventDefault();
      if(!ghost){
        const rect=pending.element.getBoundingClientRect();ghost=pending.element.cloneNode(true);ghost.classList.add('squad-drag-ghost');
        const originals=pending.element.querySelectorAll('canvas');ghost.querySelectorAll('canvas').forEach((cv,i)=>{cv.getContext('2d').drawImage(originals[i],0,0);});
        ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';document.body.append(ghost);pending.element.classList.add('dragging');document.body.classList.add('squad-drag-active');
      }
      cursor={x:e.clientX,y:e.clientY};if(!scrollFrame)scrollFrame=requestAnimationFrame(autoScroll);
      ghost.style.left=(e.clientX-ghost.offsetWidth/2)+'px';ghost.style.top=(e.clientY-ghost.offsetHeight/2)+'px';
      const next=dropAt(e.clientX,e.clientY);
      if(next!==target){target?.classList.remove('drop-target');target=next;target?.classList.add('drop-target');}

    }
    function up(e){
      if(!pending||e.pointerId!==pending.pointer)return;
      const key=pending.key,dragged=!!ghost;
      const drop=dragged?dropAt(e.clientX,e.clientY)?.dataset.squadDrop:null;
      if(dragged){e.preventDefault();blockClickUntil=performance.now()+250;}clear();
      if(dragged&&drop&&enabled())onDrop(key,drop);
    }
    function cancel(){clear();}
    function click(e){if(performance.now()<blockClickUntil){e.preventDefault();e.stopImmediatePropagation();}}
    function key(e){if(e.key==='Escape'&&pending){e.preventDefault();e.stopImmediatePropagation();clear();}}
    root.addEventListener('pointerdown',down);root.addEventListener('click',click,true);
    window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);
    return {cancel,destroy(){clear();root.removeEventListener('pointerdown',down);root.removeEventListener('click',click,true);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);}};
  }
  return {bind};
})();
