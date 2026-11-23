/* Reuse the compact reward-card layout for the one extra elite item choice. */
G.LeaderKalosUI=(()=>{
 const K=G.LeaderKalos,T=(zh,en,es=en)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='es'?es:en;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!=null)e.textContent=text;return e;};
 const old=G.HoennMarketUI.rewards;G.HoennMarketUI.rewards=parent=>{old(parent);if(!K.active())return;const r=G.Expedition.run,c=r.kalosItemChoice;if(!c||c.claimed)return;const panel=node('section','hoenn-market-panel');panel.dataset.kalosChoice='true';panel.append(node('h3','',T('金库密钥 · 选择一件道具','Vault key · choose one item','Llave de bóveda · elige un objeto')));const grid=node('div','hoenn-market-grid');for(const id of c.ids){const item=G.Items.BY[id],card=node('article','hoenn-move-card');card.append(G.ExpeditionEventUI.icon(G.Items.icon(id),38),node('h4','',G.T(item.name)),node('p','sub',G.T(item.desc)));const b=node('button','btn gold',T('领取','Claim','Recibir'));b.dataset.kalosItem=id;b.disabled=!G.Items.permitted(item)||!G.ExpeditionSupplies.canGain(r.captain,id);b.onclick=()=>{if(K.claimItem(id))G.Expedition.refreshScreen();};card.append(b);grid.append(card);}panel.append(grid);parent.append(panel);};
 return {};
})();
