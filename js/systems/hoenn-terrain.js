/* Bounded temporary rocks reuse World collision, query and damage interfaces. */
(()=>{const H=G.LeaderHoenn,Z=G.LeaderAbilities._z;let rocks=[];const hit=(x,y,r=0)=>rocks.find(p=>p.hp>0&&Math.hypot(p.x-x,p.y-y)<p.r+r);
 H.addRock=(x,y,life=5)=>{if(rocks.length>=24||G.World.arenaContains?.(x,y,20)===false)return;rocks.push({hoennRock:true,type:'rock',x,y,r:20,hp:40,maxHp:40,left:life,solid:true});};
 if(G.World){const query=G.World.propsInCircle,block=G.World.projectileBlock,free=G.World.isFree,collide=G.World.collide,damage=G.World.damageProp;
 G.World.propsInCircle=(x,y,r)=>[...query(x,y,r),...rocks.filter(p=>Math.hypot(p.x-x,p.y-y)<r+p.r)];
 G.World.projectileBlock=(x,y,r)=>block(x,y,r)||hit(x,y,r)||null;
 G.World.isFree=(x,y,r,...rest)=>free(x,y,r,...rest)&&(!H.active()||!hit(x,y,r));
 G.World.collide=(e)=>{const result=collide?.(e);if(!H.active()||G.LeaderAbilities.phase(e))return result;let collided=false;for(const p of rocks){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),min=e.r+p.r;if(d<min){e.x=p.x+(d?dx/d:1)*min;e.y=p.y+(d?dy/d:0)*min;collided=true;}}return collided||result;};
 G.World.damageProp=(p,n,...args)=>{if(!p?.hoennRock)return damage(p,n,...args);if(p.hp<=0)return false;p.hp-=n;if(p.hp<=0){rocks=rocks.filter(x=>x!==p);if(H.active()&&H.f().rockHeal)for(const actor of Z.actors())if(H.proc(actor,'rockHeal',1))Z.heal(actor,actor.maxHp*H.f().rockHeal);}return true;};}
 const remove=G.Projectiles.remove;G.Projectiles.remove=(p)=>{const fragment=H.has(p?.owner)&&H.f().moonFragments&&(p.orb||p.bondOrbitShot)&&H.proc(p.owner,'moonFragment',1);remove(p);if(fragment)for(const a of [-.2,.2])Z.synthetic(p.owner,'projectile',{type:'rock',dmg:.3,count:1,homing:5,pierce:0},p.owner.aim+a);};
 H.wrap('beginBattle',old=>{rocks=[];old();});H.wrap('tick',(old,dt)=>{old(dt);if(!H.active())return;for(const p of rocks)p.left-=dt;rocks=rocks.filter(p=>p.left>0&&p.hp>0);});H.wrap('finishBattle',old=>{old();rocks=[];});
 H.wrap('draw',(old,ctx)=>{old(ctx);if(!H.active())return;for(const p of rocks){ctx.save();ctx.fillStyle='#778899';ctx.strokeStyle='#edcf83';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-p.r,p.y-G.LIFT);ctx.lineTo(p.x-p.r*.6,p.y-G.LIFT-45);ctx.lineTo(p.x+p.r*.4,p.y-G.LIFT-55);ctx.lineTo(p.x+p.r,p.y-G.LIFT);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}});
})();
