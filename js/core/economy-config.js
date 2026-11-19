/* Development reads the external table; builds embed the same JSON snapshot. */
G.EconomyReady=fetch('config/economy_config.json',{cache:'no-store'})
  .then(response=>{if(!response.ok)throw Error('Economy configuration: '+response.status);return response.json();})
  .then(config=>(G.EconomyConfig=config))
  .catch(error=>{console.error(error);G.economyLoadError=true;return null;});
