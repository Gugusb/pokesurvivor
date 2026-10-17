const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const s = { console, Math, Date, JSON, Promise, G: {}, localStorage: { getItem:()=>null, setItem:()=>{} } };
vm.createContext(s); s.G.DB = { save: { owned: { 1: { iv: [1, 16, 31] } } }, ivOf(d) { return this.save.owned[d]?.iv; }, owns:()=>false, grant:()=>{} };
s.G.DEX_BY = { 1:{dex:1,hp:90,atk:1,spd:100,types:['grass']}, 2:{dex:2,hp:100,atk:1.2,spd:105,types:['grass']}, 3:{dex:3,hp:120,atk:1.4,spd:110,types:['grass']} };
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js/systems/progression-mon.js'),'utf8'), s);
test('IV curve endpoints and evolution stages', () => { const M=s.G.MonProgression; assert.equal(M.ivMod(1),.75); assert.equal(M.ivMod(31),1.4); assert.equal(M.stageFor(1,1),1); assert.equal(M.stageFor(1,4),2); assert.equal(M.stageFor(1,7),3); });
