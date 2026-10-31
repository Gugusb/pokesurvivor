/* Private per-difficulty assistance; never presented as a player-facing stat. */
G.FailureProtection=(()=>{
  const states=new WeakMap(),MAX=100,EARLY=600,RESET=720;
  const valid=n=>Number.isInteger(n)&&n>=1&&n<=8;
  const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0?Math.min(n,max):0;
  function normalize(s){
    const input=s.failureProtection,out={};
    if(input&&typeof input==='object'&&!Array.isArray(input))for(let n=1;n<=8;n++){
      const r=input[n];if(!r||typeof r!=='object'||Array.isArray(r))continue;
      out[n]={losses:integer(r.losses,1000),points:integer(r.points,MAX),rev:integer(r.rev,1e9),at:integer(r.at,Number.MAX_SAFE_INTEGER),last:typeof r.last==='string'?r.last.slice(0,100):''};
    }
    s.failureProtection=out;return out;
  }
  function merge(a,b){
    const left=normalize({failureProtection:a.failureProtection}),right=normalize({failureProtection:b.failureProtection}),out={};
    for(let n=1;n<=8;n++){
      const x=left[n],y=right[n];if(!x&&!y)continue;
      const r=!x?y:!y?x:x.rev!==y.rev?(x.rev>y.rev?x:y):x.at!==y.at?(x.at>y.at?x:y):(x.last>=y.last?x:y);
      out[n]={...r};
    }
    return {failureProtection:out};
  }
  function record(s,n,time,{failed=false,ended=false,clean=true,id=''}={},at=Date.now()){
    if(!valid(n)||!Number.isFinite(time)||time<0||!clean)return false;
    id=typeof id==='string'?id.slice(0,100):'';
    normalize(s);const old=s.failureProtection[n]||{losses:0,points:0,rev:0,at:0,last:''};
    if(id&&old.last===id)return false;
    let losses=old.losses,points=old.points;
    if(time>RESET){losses=0;points=0;}
    else if(!ended)return false;
    else if(failed&&time<EARLY){losses=Math.min(1000,losses+1);if(losses>2)points=Math.min(MAX,points+5*(losses-2));}
    else losses=0;
    if(!ended&&losses===old.losses&&points===old.points)return false;
    s.failureProtection[n]={losses,points,rev:old.rev+1,at:integer(at,Number.MAX_SAFE_INTEGER),last:id.slice(0,100)};
    return true;
  }
  function begin(p,s,n,id=''){
    const rows=normalize(s);states.set(p,{stars:n,points:valid(n)?rows[n]?.points||0:0,time:0,id,cleared:false,finished:false});
  }
  function advance(p,s,time,clean=true){
    const r=states.get(p);if(!r||r.finished||!Number.isFinite(time)||time<r.time)return false;
    r.time=time;
    if(time>RESET&&!r.cleared&&clean){r.cleared=true;return record(s,r.stars,time,{clean,id:r.id});}
    return false;
  }
  function finish(p,s,{time,failed,clean,id}={}){
    const r=states.get(p);if(!r||r.finished)return false;r.finished=true;
    return record(s,r.stars,time??r.time,{failed,ended:true,clean,id:id||r.id});
  }
  const strength=p=>{const r=states.get(p);return r&&!p.remote&&!r.finished&&r.time<EARLY?r.points/MAX:0;};
  const xpFactor=p=>1+.3*strength(p),lootBonus=p=>.8*strength(p);
  function avoidLethal(p,damage,rng=Math.random){
    const chance=.1*strength(p);
    if(!(chance>0)||p.dead||!(p.hp>0)||!Number.isFinite(damage)||damage<p.hp||rng()>=chance)return false;
    p.invuln=Math.max(p.invuln||0,.45);return true;
  }
  return {MAX,EARLY,RESET,normalize,merge,record,begin,advance,finish,strength,xpFactor,lootBonus,avoidLethal};
})();
