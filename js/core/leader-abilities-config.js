/* Production/offline builds embed this same snapshot. Fail closed on missing data. */
G.LeaderAbilitiesReady=Promise.all([1,2].map(g=>fetch('config/leader_abilities_gen'+g+'.json',{cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('Leader abilities HTTP '+r.status);return r.json();})))
 .then(([one,two])=>(G.LeaderAbilitiesConfig={...one,families:[...one.families,...two.families]}));
