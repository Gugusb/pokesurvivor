const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),noop=()=>{};
function context(lang = 'zh', neutralStats = true) {
  const storage = new Map([['ps.lang', lang]]);
  const s = { console, Math: Object.create(Math), Map, Set, JSON, Date, Object, Array, Number, String, RegExp,
    Uint8Array, TextEncoder, Promise, performance: { now: () => 1000 },
    setTimeout: noop, clearTimeout: noop, setInterval: noop, addEventListener: noop, matchMedia: () => ({ matches: false }),
    location: { pathname: '/', protocol: 'file:', reload: noop }, navigator: { language: 'zh-CN' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    document: { documentElement: {}, addEventListener: noop }, CanvasRenderingContext2D: function () {}, confirm: noop, alert: noop };
  s.window = s; s.G = {}; s.players = []; s.enemies = [];
  vm.createContext(s);
  s.load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), s, { filename: file });
  for (const file of ['js/core/util.js', 'js/core/i18n.js', 'js/data/lang-en.js', 'js/data/lang-zh.js',
    'js/data/pokedex.js', 'js/data/evolutions.js', 'js/data/sprites-meta.js', 'js/data/moves.js', 'js/data/items.js','js/systems/boss-rewards.js','js/systems/specialization.js', 'js/systems/equipment.js', 'js/data/abilities.js', 'js/data/upgrades.js']) s.load(file);
  const G = s.G;
  G.FIREBASE_CONFIG = null;
  G.FX = new Proxy({}, { get: () => noop }); G.Audio = { sfx: noop }; G.Camera = { kick: noop, sees: () => false };
  G.World = { liquidEffect: () => ({ slow: 0.5 }), isLiquid: () => false, collide: () => false };
  G.Weather = { speedFor: () => 1, mult: () => 1 }; G.Types = { mult: () => 1, label: () => null };
  G.Coop = { active: false, isHost: false, toHost: ev => (s.events ||= []).push(ev), status: noop };
  G.Dev = { canUse: () => false, invincible: false };
  G.Game = { everyone: () => s.players }; G.Path = { dirFor: () => null };
  G.Judgment = { noteDmg: noop }; G.Events = { golden: false };
  G.Projectiles = { clearOrbs: noop }; G.UI = { toast: noop };
  G.Sprites = { hasShiny: () => true, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false,
    dirFromAngle: () => 0, animMeta: () => null, PX: 2, Animator: class { play() {} update() {} loop() {} busy() { return false; } } };
  // Exponer privados sólo en el entorno de prueba, sin ampliar la API publicada.
  const db = fs.readFileSync(path.join(ROOT, 'js/core/db.js'), 'utf8').replace(
    'ready, register, login,', '_test: {newSave, migrate, sanitize}, ready, register, login,');
  vm.runInContext(db, s, { filename: 'js/core/db.js' }); G.DB.playAsGuest();
  s.load('js/systems/progression-mon.js');
  for (const file of ['js/systems/abilities.js', 'js/systems/gacha.js', 'js/systems/ability-gacha.js', 'js/entities/player.js', 'js/entities/enemy.js']) s.load(file);
  G.EnemyMgr = { all: () => s.enemies, queryCircle: (x,y,r) => s.enemies.filter(e => !e.dead && (e.x-x)**2+(e.y-y)**2 <= r*r) };
  s.player = (dex, ability) => {
    const p = new G.Player(G.DEX_BY[dex]); p.ability = ability || null;
    // These legacy modifier tests use neutral defenses and equal base attacks.
    if(neutralStats){p.baseDefense=p.baseSpDef=1;p.baseSpa=p.baseAtk;p.baseAgility=80;}
    s.players = [p]; return p;
  };
  s.enemy = () => {
    const e = new G.Enemy({ dex: 1, hp: 500, spd: 0, dmg: 10, xp: 1, behavior: 'ranged', shotCd: 2, range: 300 }, 100, 0, { hp: 1, spd: 1, dmg: 1 });
    if(neutralStats)e.defense=e.spdef=1;
    s.enemies.push(e); return e;
  };
  s.random = values => { let i = 0; s.Math.random = () => values[i++] ?? 0.5; };
  return s;
}
module.exports={context};
