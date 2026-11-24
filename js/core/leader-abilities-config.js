/* Production/offline builds embed this same snapshot. Fail closed on missing data. */
G.LeaderAbilitiesReady=Promise.all([1,2,3,4,5,6,7,8].map(g=>fetch('config/leader_abilities_gen'+g+'.json',{cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('Leader abilities HTTP '+r.status);return r.json();})))
 .then(parts=>(G.LeaderAbilitiesConfig={...parts[0],families:parts.flatMap(p=>p.families)}));
