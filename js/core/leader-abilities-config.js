/* Production/offline builds embed this same snapshot. Fail closed on missing data. */
G.LeaderAbilitiesReady=fetch('config/leader_abilities_gen1.json',{cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('Leader abilities HTTP '+r.status);return r.json();})
 .then(c=>(G.LeaderAbilitiesConfig=c));
