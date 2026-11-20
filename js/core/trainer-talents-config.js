/* Source builds fetch the same data snapshot that production embeds. */
G.TrainerTalentsReady=fetch('config/trainer_talents.json',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw Error('Trainer talents HTTP '+r.status);return r.json();})
  .then(c=>(G.TrainerTalentsConfig=c))
  .catch(e=>{console.error(e);return null;});
