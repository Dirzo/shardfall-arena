/* Loads the real game code headlessly in its own vm context and exposes the
   pieces the server needs. One Sim per room. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'game');
const PARTS = ['p2.js', 'p3.js', 'p4.js', 'p5.js', 'p7.js', 'p6.js', 'p8.js'];

const HOOKS = `
globalThis.__api = {
  get G() { return G; },
  setG(g) { G = g; },
  newGame, update, computeVision, calcStats, findPath, unitAt, issueOrder, playerThink,
  cast, useItem, buyItem, sellItem, undoShop, learn, canLearn, resetTalents, startRecall,
  rank, dist, isStruct, structProtected, atShop, heroesNear,
  HEROES, HERO, ABIL, ITEM, TAL, TREES, SIM_SPEED, W, H, MAXLVL, fmtT,
  /* Wrap the pieces of the simulation whose side effects the clients need to
     hear about: damage numbers, announcements, ability visuals, level-ups. */
  hook(cb) {
    const _damage = damage;
    damage = (s, t, a, o = {}) => {
      const r = _damage(s, t, a, o);
      if (t && r > 0 && (t.kind === 'hero' || (s && s.kind === 'hero')))
        cb(['hit', s ? s.id : 0, t.id, Math.round(r), (o.crit ? 1 : 0) | (o.abil ? 2 : 0) | (o.true ? 4 : 0)]);
      return r;
    };
    announce = (big, sub = '', cls = '') => cb(['ann', String(big), String(sub || ''), String(cls || '')]);
    addFeed = html => { G.feed.push(html); cb(['fd', String(html)]); };
    callout = (u, txt, col) => { if (u && u.kind === 'hero' && (u.calloutT || 0) <= G.t) { u.calloutT = G.t + .5; cb(['co', u.id, String(txt), String(col)]); } };
    const _giveGold = giveGold;
    giveGold = (h, amt, x, y) => { const r = _giveGold(h, amt, x, y); if (h && h.kind === 'hero' && amt >= 20) cb(['gold', h.id, Math.round(amt)]); return r; };
    const _giveXp = giveXp;
    giveXp = (h, amt) => { const lv = h ? h.level : 0; const r = _giveXp(h, amt); if (h && h.level > lv) cb(['lvl', h.id]); return r; };
    for (const id of Object.keys(ABIL)) {
      const ab = ABIL[id], f = ab.cast;
      ab.cast = function (h, tx, ty, r) {
        cb(['fx', h.id, id, Math.round(tx), Math.round(ty), r || 1]);
        return f.call(this, h, tx, ty, r);
      };
    }
    const _useItem = useItem;
    useItem = (h, i, x, y) => { const id = h.items[i]; const r = _useItem(h, i, x, y); if (r !== false && id) cb(['it', h.id, id, Math.round(x), Math.round(y)]); return r; };
  },
};
`;

const source = [
  fs.readFileSync(path.join(here, 'stubs.js'), 'utf8'),
  ...PARTS.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')),
  HOOKS,
].join('\n;\n');

const script = new vm.Script(source, { filename: 'shardfall-sim.js' });

export function createSim() {
  const sandbox = {
    console, Math, Date, JSON, performance,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Uint8Array, Uint8ClampedArray, Uint32Array, Int32Array, Float32Array, Float64Array, Map, Set, Promise,
  };
  const ctx = vm.createContext(sandbox);
  script.runInContext(ctx, { timeout: 30000 });
  return ctx.__api;
}
