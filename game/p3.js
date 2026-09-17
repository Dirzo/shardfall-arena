
/* =========================================================
   WORLD — "The Hollow Weald": two lanes wrapped around a
   central jungle, twin altars, a relic and a boss lair
   ========================================================= */
const W = 4500, H = 2500, CELL = 50, GW = W / CELL, GH = H / CELL;
const RX = W / 2, RY = H / 2;
const LANE_Y = { top: 320, bot: 2180 };
const BASE = [{ x: 380, y: RY }, { x: W - 380, y: RY }];
const FOUNT = [{ x: 150, y: RY }, { x: W - 150, y: RY }];
const ANC = [{ x: 520, y: RY }, { x: W - 520, y: RY }];
const mirX = p => [W - p[0], p[1]];
// lanes: long "double-wave" curves — they crest near the outer towers and sag toward the middle
const TOPL = [[520, 1250], [600, 1010], [820, 560], [1150, 320], [1600, 250], [2250, 370], [2900, 250], [3350, 320], [3680, 560], [3900, 1010], [3980, 1250]];
const LANES = { top: TOPL, bot: TOPL.map(([x, y]) => [x, H - y]) };
const PIT_VOID = { x: RX, y: 760 };
const PIT_DRAKE = { x: -9999, y: -9999 }; // no drake on this map
const RELIC = { x: RX, y: RY };
const SPEED_SHRINE = { x: RX, y: 1860 };
const ALTARS = [{ x: 1500, y: RY, name: 'West Altar' }, { x: W - 1500, y: RY, name: 'East Altar' }];
const RUNE_SPOTS = [];
const GATES = [];
const SEGS = [], CIRCS = [];
function addPath(pts, hw) { for (let i = 0; i < pts.length - 1; i++) SEGS.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hw]); }
for (const k in LANES) addPath(LANES[k], 115);
BASE.forEach(b => CIRCS.push([b.x, b.y, 430]));
// jungle: narrow, winding corridors [points, half-width]; authored for the west half and mirrored
const JPATHS = [
  [[[800, 1250], [980, 1180], [1150, 1300], [1330, 1220], [1500, 1250]], 68],       // base → west altar
  [[[1500, 1250], [1700, 1330], [1880, 1190]], 62],                                  // altar → centre (first bend)
  [[[1880, 1190], [1970, 1215]], 46],                                                // chokepoint
  [[[1970, 1215], [2090, 1290], [RX, 1250]], 62],                                    // → relic
  [[[1150, 780], [1080, 620], [1230, 500], [1180, 380]], 56],                        // wraiths → top lane (side entrance)
  [[[1150, 780], [1300, 900], [1260, 1060], [1500, 1250]], 62],                      // wraiths → altar
  [[[1150, 780], [1450, 720], [1780, 950]], 56],                                     // wraiths → wolves
  [[[1780, 950], [1990, 880], [2150, 950]], 56],                                     // wolves → lair approach
  [[[2150, 950], [RX, 960], [RX, 760]], 48],                                         // lair mouth (chokepoint)
  [[[1780, 950], [1960, 1080], [2080, 1120]], 46],                                   // wolves → centre (narrow cut)
  [[[1600, 260], [1650, 470], [1560, 640], [1780, 950]], 52],                        // top lane → wolves (side entrance)
  [[[700, 900], [950, 860], [1150, 780]], 52],                                       // inner top lane → wraiths
  [[[1150, 1720], [1060, 1880], [1220, 2010], [1180, 2120]], 56],                    // golems → bottom lane (side entrance)
  [[[1150, 1720], [1320, 1580], [1270, 1420], [1500, 1250]], 62],                    // golems → altar
  [[[1150, 1720], [1500, 1800], [1760, 1660], [2000, 1760], [RX, 1860]], 56],        // golems → speed shrine
  [[[1650, 2240], [1620, 2020], [1760, 1660]], 52],                                  // bottom lane → shrine corridor (side entrance)
  [[[700, 1600], [950, 1640], [1150, 1720]], 52],                                    // inner bottom lane → golems
  [[[RX, 1250], [2160, 1450], [2340, 1620], [RX, 1860]], 50],                        // relic ↔ shrine (braided)
  [[[RX, 1860], [RX, 2130]], 58],                                                    // shrine → bottom lane
];
const JCLEAR = [[1500, 1250, 150], [RX, 1250, 170], [1150, 780, 130], [1780, 950, 115], [1150, 1720, 130], [RX, 1860, 110], [RX, 760, 215]];
for (const M of [p => p, mirX]) {
  JPATHS.forEach(([pa, hw]) => addPath(pa.map(p => M(p)), hw));
  JCLEAR.forEach(c => CIRCS.push([...M(c), c[2]]));
}
// tall grass: ambush pockets at corridor bends, plus a clump either side of every lane tower
function lanePoint(pts, x, off) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if ((x - x0) * (x - x1) <= 0 && x0 !== x1) {
      const t = (x - x0) / (x1 - x0), y = y0 + (y1 - y0) * t, l = Math.hypot(x1 - x0, y1 - y0);
      return [x - (y1 - y0) / l * off, y + (x1 - x0) / l * off];
    }
  }
  return null;
}
const BUSH_W = [[1150, 1300], [1880, 1190], [1230, 500], [1300, 900], [1450, 720], [1990, 880], [1270, 1420], [1500, 1800], [2000, 1760], [2160, 1450], [950, 860], [950, 1640], [1560, 640], [1620, 2020], [1700, 1330]];
const BUSH_T = [];
for (const [lane, xs] of [['top', [1700, 1050, 730]], ['bot', [1700, 1050, 730]]]) for (const x of xs) {
  const pts = LANES[lane];
  for (const [dx, off] of [[150, 80], [-110, -80]]) { const p = lanePoint(pts, x + dx, lane === 'top' ? off : -off); if (p) BUSH_T.push(p); }
}
const BUSHES = [...BUSH_W, ...BUSH_T].flatMap(p => [p, mirX(p)]).concat([[RX, 330], [RX, 2170]]).map(([x, y]) => ({ x, y, r: 72 }));

const grid = new Uint8Array(GW * GH);
(function buildGrid() {
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
    let ok = false;
    for (const s of SEGS) if (segDist(x, y, s[0], s[1], s[2], s[3]) <= s[4] + 6) { ok = true; break; }
    if (!ok) for (const c of CIRCS) if (Math.hypot(x - c[0], y - c[1]) <= c[2] + 6) { ok = true; break; }
    if (gx === 0 || gy === 0 || gx === GW - 1 || gy === GH - 1) ok = false;
    grid[gy * GW + gx] = ok ? 1 : 0;
  }
})();
function walk(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return false; return grid[(y / CELL | 0) * GW + (x / CELL | 0)] === 1; }
function los(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 14);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!walk(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
  return true;
}
function nearestWalkable(x, y) {
  if (walk(x, y)) return { x, y };
  for (let r = CELL; r < 800; r += CELL / 2) {
    for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * TAU) * r, py = y + Math.sin(a / 16 * TAU) * r; if (walk(px, py)) return { x: px, y: py }; }
  }
  return { x: BASE[0].x, y: BASE[0].y };
}
const PF = { g: new Float32Array(GW * GH), from: new Int32Array(GW * GH), stamp: new Uint32Array(GW * GH), closed: new Uint32Array(GW * GH), gen: 0 };
function findPath(sx, sy, tx, ty) {
  const t0 = nearestWalkable(tx, ty); tx = t0.x; ty = t0.y;
  if (los(sx, sy, tx, ty)) return [{ x: tx, y: ty }];
  const s0 = nearestWalkable(sx, sy);
  const S = (s0.y / CELL | 0) * GW + (s0.x / CELL | 0), T = (ty / CELL | 0) * GW + (tx / CELL | 0);
  const gen = ++PF.gen; const { g, from, stamp, closed } = PF;
  const heap = []; // [f, idx]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const tgx = T % GW, tgy = (T / GW) | 0;
  const hfn = i => { const dx = Math.abs(i % GW - tgx), dy = Math.abs(((i / GW) | 0) - tgy); return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); };
  stamp[S] = gen; g[S] = 0; from[S] = -1; push(hfn(S), S);
  let found = false, iter = 0;
  while (heap.length && iter++ < 6000) {
    const [, cur] = pop();
    if (closed[cur] === gen) continue; closed[cur] = gen;
    if (cur === T) { found = true; break; }
    const cx = cur % GW, cy = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx; if (!grid[ni] || closed[ni] === gen) continue;
      if (dx && dy && (!grid[cy * GW + nx] || !grid[ny * GW + cx])) continue;
      const ng = g[cur] + (dx && dy ? 1.414 : 1);
      if (stamp[ni] !== gen || ng < g[ni]) { stamp[ni] = gen; g[ni] = ng; from[ni] = cur; push(ng + hfn(ni), ni); }
    }
  }
  if (!found) return [{ x: tx, y: ty }];
  const cells = []; for (let c = T; c !== -1; c = from[c]) cells.push(c);
  cells.reverse();
  const pts = cells.map(c => ({ x: (c % GW) * CELL + CELL / 2, y: ((c / GW) | 0) * CELL + CELL / 2 }));
  pts[pts.length - 1] = { x: tx, y: ty };
  // string-pull
  const out = []; let ax = sx, ay = sy, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !los(ax, ay, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]); ax = pts[j].x; ay = pts[j].y; i = j + 1;
  }
  return out;
}

/* =========================================================
   GAME STATE & ENTITIES
   ========================================================= */
let G = null;
let UID = 0;
class Unit {
  constructor(o) {
    this.id = ++UID; this.x = 0; this.y = 0; this.r = 18; this.team = 2; this.kind = ''; this.hp = 100; this.maxHp = 100;
    this.armor = 0; this.power = 10; this.as = 1; this.range = 100; this.ms = 300; this.atkCd = 0; this.target = null; this.dead = false;
    this.face = 0; this.stun = 0; this.root = 0; this.kup = 0; this.slows = []; this.stealth = 0; this.shields = []; this.buffs = {};
    this.hitT = 0; this.vis = [true, true]; this.revealT = 0; this.bush = -1; this.swing = 0; this.dots = []; this.deadT = 0; this.moving = false; this.anim = rnd(10);
    Object.assign(this, o);
  }
}
const xpNeed = l => 80 + 48 * (l - 1);
const MAXLVL = 15;
const rank = (h, k) => k === 'R' ? (h.level >= 14 ? 3 : h.level >= 10 ? 2 : h.level >= 6 ? 1 : 0) : Math.min(5, 1 + Math.floor((h.level - 1) / 3));
const hasCap = (h, i) => !!h.talents && (h.talents[['capF', 'capR', 'capS'][i]] | 0) > 0;
const alive = u => u && !u.dead;
const isStruct = u => u.kind === 'tower' || u.kind === 'ancient' || u.kind === 'inhib';

function newGame(playerHeroId, enemyIds, allyIds, demo, diff = 1) {
  UID = 0;
  G = {
    t: 0, demo, diff, units: [], heroes: [], projs: [], zones: [], parts: [], texts: [], timers: [], marks: [],
    kills: [0, 0], drakes: [[], []], towersLeft: [7, 7], voidhand: [0, 0], reveal: [0, 0],
    nextWave: 45, waveN: 0, paused: false, over: false, player: null, shake: 0, night: 0, nightState: false,
    cam: { x: W / 2, y: H / 2, z: 1, free: false }, drake: { unit: null, next: Infinity, elem: 'Infernal' },
    voidmaw: { unit: null, next: 600 }, runes: [],
    altars: ALTARS.map(a => ({ ...a, owner: -1, prog: [0, 0], unlock: 150 })), relic: { ...RELIC, up: false, next: 150 },
    camps: [], firstBlood: false, teamObj: [null, null], objT: 25,
    feed: [], aim: null, armed: null, aiSkill: [.8, .8], aiBold: [1, 1], lastKill: {},
  };
  G.aiSkill = demo ? [.85, .85] : [.8, [.5, .82, 1][diff]];
  G.aiBold = demo ? [1, 1] : [1, [.8, 1, 1.25][diff]];
  const lanesA = ['top', 'bot', 'jungle'], lanesB = ['top', 'bot', 'jungle'];
  const teamA = [playerHeroId, ...allyIds], teamB = enemyIds;
  teamA.forEach((id, i) => { const h = makeHero(HERO[id], 0, demo || i > 0, lanesA[i]); if (!demo && i === 0) G.player = h; addUnit(h); G.heroes.push(h); });
  teamB.forEach((id, i) => { const h = makeHero(HERO[id], 1, true, lanesB[i]); if (!demo) h.statBoost = [.88, 1, 1.12][diff]; addUnit(h); G.heroes.push(h); });
  // an AI support duo-lanes: its teammates take the two lanes and it shadows the bottom laner
  for (const team of [0, 1]) {
    const mates = G.heroes.filter(h => h.team === team), sup = mates.find(h => h.ai && h.def.support);
    const sin = mates.find(h => h.ai && h.def.role[0] === 'Assassin');
    if (sup) {
      sup.lane = 'support';
      mates.filter(h => h !== sup).sort((a, b) => (b === sin) - (a === sin)).forEach((h, i) => { h.lane = ['bot', 'top'][i]; }); // an assassin takes the support along on its roams
    } else if (sin && sin.lane !== 'jungle') { // assassins roam from the jungle
      const j = mates.find(h => h.lane === 'jungle'); if (j) j.lane = sin.lane; sin.lane = 'jungle';
    }
  }
  // structures
  const T = [
    ['top', 3, 1700, 268, 'Outer top tower'], ['top', 2, 1050, 395, 'Inner top tower'], ['top', 1, 730, 735, 'Top inhibitor tower'],
    ['bot', 3, 1700, 2232, 'Outer bottom tower'], ['bot', 2, 1050, 2105, 'Inner bottom tower'], ['bot', 1, 730, 1765, 'Bottom inhibitor tower'],
    ['base', 0, 745, 1250, 'Nexus tower'],
  ];
  for (const team of [0, 1]) {
    for (const [lane, tier, x, y, name] of T) {
      const hp = [3000, 2600, 2200, 1800][tier];
      addUnit(new Unit({ kind: 'tower', team, lane, tier, x: team ? W - x : x, y, r: 34, hp, maxHp: hp, armor: 40, mr: 40, power: tier === 0 ? 180 : 150, as: .85, range: 620, name }));
    }
    for (const [lane, y] of [['top', 1010], ['bot', 1490]]) {
      addUnit(new Unit({ kind: 'inhib', team, lane, x: team ? W - 600 : 600, y, r: 36, hp: 2000, maxHp: 2000, armor: 20, mr: 20, power: 0, as: 0, range: 0, ms: 0, name: (lane === 'top' ? 'Top' : 'Bottom') + ' inhibitor' }));
    }
    addUnit(new Unit({ kind: 'ancient', team, x: ANC[team].x, y: ANC[team].y, r: 58, hp: 4500, maxHp: 4500, armor: 40, mr: 40, power: 220, as: .6, range: 640, name: TEAMNAME[team] + ' Ancient' }));
  }
  // camps
  const campDefs = [
    { type: 'wraiths', x: 1150, y: 780, mem: ['wraith', 'wraithS', 'wraithS', 'wraithS'] },
    { type: 'wolves', x: 1780, y: 950, mem: ['wolf', 'wolfS', 'wolfS'] },
    { type: 'golems', x: 1150, y: 1720, mem: ['golem', 'golemS'] },
  ];
  for (const flip of [false, true]) for (const c of campDefs) {
    G.camps.push({ ...c, x: flip ? W - c.x : c.x, side: flip ? 1 : 0, next: 65, units: [], respawn: 75 });
  }
  document.getElementById('game').classList.remove('dead');
}
function addUnit(u) { G.units.push(u); return u; }

function makeHero(def, team, ai, lane) {
  const s = def.stats, f = FOUNT[team];
  const h = new Unit({
    kind: 'hero', def, team, ai, lane, name: def.name, x: f.x + (team ? -40 : 40), y: f.y + rnd(-60, 60), r: 24,
    level: 1, xp: 0, gold: 500, items: [], stacks: {}, itemCd: {}, undo: [], talents: {}, pts: 0, cds: { Q: 0, W: 0, E: 0, R: 0, D: 0, F: 0 },
    k: 0, dth: 0, as_: 0, cs: 0, respawn: 0, path: [], attackTarget: null, channel: null, dash: null, assist: new Map(),
    atkCount: 0, ranged: s.range > 300, prevMax: 0, lastHurt: -99, aiT: rnd(.3), aiState: 'lane', streak: 0, repathT: 0,
    statBoost: 1, gateCd: 0, stoneCd: 0, sblade: 0, ambush: 0, autoT: 0, dmgDone: 0,
  });
  h.hp = 1; calcStats(h); h.hp = h.maxHp; h.mana = h.maxMana;
  return h;
}

function calcStats(h) {
  const b = h.def.stats, L = h.level - 1, B = h.buffs;
  const s = {
    maxHp: b.hp + b.hpG * L, hpMult: 1, maxMana: b.mana + b.manaG * L, power: b.power + b.powerG * L, ap: 0, apMult: 0, asMult: 1 + .03 * L, ms: b.ms, msMult: 1,
    armor: b.armor + b.armorG * L, mr: (b.mr || 30) + 1.3 * L, regen: b.regen + .35 * L, manaRegen: 3 + .4 * L, cdr: 0, ah: 0, lifesteal: 0, omni: 0, dmgMult: 1, abilMult: 1,
    dmgTaken: 1, xpMult: 1, goldPs: 0, monsterMult: 1, execMult: 0, ccMult: 1, healMult: 1, range: b.range,
    crit: 0, critDmg: .75, pen: 0, mpen: 0, onhit: 0, onhitPct: 0, thorns: 0, itemBlade: 0, burn: 0, frost: 0, antiheal: 0, lifeline: 0, aura: 0, hpToAd: 0, manaHit: 0,
  };
  const baseHp = s.maxHp;
  applyItems(h, s);
  for (const k in h.talents) { const r = h.talents[k]; if (r > 0 && TAL[k].fx) TAL[k].fx(s, r); }
  if (B.mindwell) { s.cdr += .15; s.manaRegen += 6; }
  if (B.voidhand) { s.power += 25; s.ap += 40; }
  if (B.haste) s.msMult *= 1.55;
  if (B.shrine) s.msMult *= 1.3;
  if (B.dd) s.dmgMult *= 1.5;
  if (B.regenRune) s.regen += s.maxHp * .035;
  if (B.arcane) s.cdr += .3;
  if (B.warcry) { s.asMult += .4; s.msMult *= 1.2; }
  if (B.venom) s.asMult += B.venom.v;
  if (B.rage) { s.lifesteal += .3; s.dmgMult *= 1.3; }
  if (B.wild) s.msMult *= 1.3;
  if (B.sanct) s.dmgTaken *= .75;
  if (B.sunwall) s.dmgTaken *= .5;
  if (b.range < 300) s.dmgTaken *= .85; // melee resilience
  if (h.def.tithe) s.goldPs += h.def.tithe; // support passive
  if (B.veil) s.msMult *= 1.4;
  if (B.mend) s.msMult *= 1.25;
  if (B.homeguard) s.msMult *= 1.6;
  if (B.rampage) s.msMult *= 1.3;
  if (B.tumbleDR) s.dmgTaken *= .7;
  if (B.elixWrath) { s.power += 15; s.omni += .08; }
  if (B.elixSorc) { s.ap += 40; s.ah += 15; }
  if (B.elixIron) { s.maxHp += 300; s.ccMult *= .75; }
  const alt = G.altars ? G.altars.filter(a => a.owner === h.team).length : 0;
  if (alt >= 1) s.msMult *= 1.10;
  s.maxHp *= s.hpMult * (h.statBoost || 1);
  s.power += (s.maxHp - baseHp) * s.hpToAd;
  s.power *= (h.statBoost || 1);
  s.ap *= (1 + s.apMult) * (h.statBoost || 1);
  s.cdr = Math.min(.6, 1 - (1 - Math.min(.45, s.cdr)) * (100 / (100 + s.ah)));
  s.crit = Math.min(1, s.crit);
  s.pen = Math.min(.6, s.pen); s.mpen = Math.min(.6, s.mpen);
  s.as = Math.min(2.5, b.as * s.asMult);
  if (h.prevMax && s.maxHp > h.prevMax) h.hp += s.maxHp - h.prevMax;
  h.prevMax = s.maxHp;
  h.s = s; h.maxHp = s.maxHp; h.maxMana = s.maxMana; h.armor = s.armor; h.mr = s.mr; h.atk = s.power; h.power = s.power + s.ap; h.as = s.as; h.range = s.range;
  h.hp = Math.min(h.hp, h.maxHp); h.mana = Math.min(h.mana, h.maxMana);
  h.scale = B.rage ? 1.25 : 1;
}

/* ---------------- minions ---------------- */
const MINION = {
  melee: { hp: 440, power: 20, range: 55, as: .8, r: 15, armor: 8, ms: 285, gold: 22, xp: 34 },
  caster: { hp: 300, power: 26, range: 360, as: .7, r: 13, armor: 0, ms: 285, gold: 17, xp: 26 },
  siege: { hp: 820, power: 46, range: 420, as: .5, r: 19, armor: 22, ms: 270, gold: 50, xp: 60 },
  super: { hp: 1600, power: 80, range: 70, as: .85, r: 22, armor: 40, ms: 290, gold: 60, xp: 90 },
};
function spawnWave() {
  G.waveN++;
  const types = ['melee', 'melee', 'melee', 'caster', 'caster'];
  if (G.waveN % 3 === 0) types.splice(3, 0, 'siege');
  const sc = 1 + G.t / 600 * .6;
  for (const team of [0, 1]) for (const lane in LANES) {
    const path = team ? [...LANES[lane]].reverse() : LANES[lane];
    const emp = G.voidhand[team] > G.t;
    const inhibDown = G.units.some(u => u.kind === 'inhib' && u.team !== team && u.lane === lane && u.dead);
    const list = inhibDown ? ['super', ...types] : types;
    list.forEach((ty, i) => {
      const d = MINION[ty], [sx, sy] = path[0], [nx, ny] = path[1];
      const ang = Math.atan2(ny - sy, nx - sx), back = i * 34;
      addUnit(new Unit({
        kind: 'minion', mtype: ty, team, lane, lpath: path, wp: 1, x: sx - Math.cos(ang) * back + rnd(-8, 8), y: sy - Math.sin(ang) * back + rnd(-8, 8),
        r: d.r * (emp ? 1.25 : 1), hp: d.hp * sc * (emp ? 1.6 : 1), maxHp: d.hp * sc * (emp ? 1.6 : 1), power: d.power * (1 + G.t / 600 * .5), as: d.as,
        range: d.range, armor: d.armor, ms: d.ms, gold: d.gold, xp: d.xp, empowered: emp, face: ang, ranged: ty === 'caster' || ty === 'siege', prog: -back,
      }));
    });
  }
}

/* ---------------- neutral monsters ---------------- */
const MON = {
  wolf: { name: 'Duskfang Alpha', hp: 760, power: 34, as: .9, range: 60, r: 20, armor: 10, ms: 330, gold: 42, xp: 70, color: '#8a93a8' },
  wolfS: { name: 'Duskfang', hp: 330, power: 16, as: 1, range: 50, r: 13, armor: 5, ms: 340, gold: 16, xp: 24, color: '#6f7890' },
  wraith: { name: 'Hollow Wraith', hp: 620, power: 30, as: .75, range: 320, r: 19, armor: 8, ms: 300, gold: 40, xp: 70, color: '#8fe3d0', ranged: true },
  wraithS: { name: 'Lesser Wraith', hp: 240, power: 14, as: .8, range: 280, r: 12, armor: 4, ms: 310, gold: 12, xp: 20, color: '#6fc7b8', ranged: true },
  golem: { name: 'Rubble Golem', hp: 1150, power: 44, as: .6, range: 70, r: 26, armor: 25, ms: 240, gold: 60, xp: 90, color: '#a08d74' },
  golemS: { name: 'Pebble', hp: 460, power: 22, as: .7, range: 55, r: 15, armor: 15, ms: 250, gold: 22, xp: 34, color: '#8d7c66' },
  mindwell: { name: 'Mindwell Sentinel', hp: 1650, power: 48, as: .7, range: 300, r: 30, armor: 20, ms: 240, gold: 100, xp: 130, color: '#6fb8ff', buff: 'mindwell', ranged: true },
  ember: { name: 'Emberheart Brute', hp: 1800, power: 62, as: .7, range: 80, r: 32, armor: 24, ms: 250, gold: 100, xp: 130, color: '#ff7a3a', buff: 'ember' },
  drake: { name: 'River Drake', hp: 3800, power: 85, as: .6, range: 240, r: 48, armor: 30, ms: 220, gold: 0, xp: 320, color: '#ff8a3a', boss: true, ranged: true },
  voidmaw: { name: 'Voidmaw', hp: 9000, power: 120, as: .5, range: 280, r: 64, armor: 45, ms: 0, gold: 0, xp: 520, color: '#b36bff', boss: true, ranged: true },
};
const DRAKECOL = { Infernal: '#ff6a2a', Tidal: '#3fc8ff', Gale: '#b8ffe8', Stone: '#c7a37a' };
function spawnMonster(type, x, y, extra = {}) {
  const d = MON[type], sc = 1 + G.t / 900;
  return addUnit(new Unit({
    kind: 'monster', mtype: type, team: 2, x, y, home: { x, y }, r: d.r, hp: d.hp * sc, maxHp: d.hp * sc, power: d.power * (1 + G.t / 1200),
    as: d.as, range: d.range, armor: d.armor, ms: d.ms, gold: d.gold, xp: d.xp, name: d.name, color: d.color, boss: d.boss, ranged: d.ranged,
    aggro: null, reset: false, leash: d.boss ? 560 : 460, skillT: 4, face: Math.PI / 2, ...extra,
  }));
}

/* ---------------- effects helpers ---------------- */
function after(t, fn) { G.timers.push({ t, fn }); }
function part(o) { if (G.parts.length > 900) return; G.parts.push(Object.assign({ vx: 0, vy: 0, life: .6, max: .6, size: 10, color: '#ffffff', add: true, drag: .9, grav: 0, kind: 'glow' }, o)); }
function burst(x, y, color, n = 14, sp = 220, size = 10, life = .5) {
  for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(.3, 1) * sp; part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, size: size * rnd(.6, 1.3), life: life * rnd(.6, 1.2), max: life }); }
}
function ring(x, y, color, r = 80, life = .45, w = 4) { part({ x, y, kind: 'ring', color, size: r, life, max: life, w }); }
function floatText(x, y, txt, color = '#fff', size = 16, o = {}) {
  if (G.texts.length > 80) G.texts.shift();
  G.texts.push({ x: x + rnd(-10, 10), y, txt, color, size, life: 1.1, max: 1.1, vy: -60, ...o });
}
const involvesPlayer = (...us) => G.player && us.some(u => u === G.player);
function addFeed(html) { G.feed.push(html); UI.feed(html); }
function announce(big, sub = '', cls = '') { if (!G.demo) UI.announce(big, sub, cls); }

/* ---------------- status ---------------- */
function ccImmune(u) { return u.dead || isStruct(u) || u.boss || (u.buffs.rage && u.kind === 'hero' && hasCap(u, 1)); }
function ccScale(u, d) { return d * (u.s ? u.s.ccMult : 1); }
function interrupt(u) { u.channel = null; u.casting = null; u.wind = null; }
function callout(u, txt, col) { if (G.demo || u.kind !== 'hero' || (u.calloutT || 0) > G.t) return; u.calloutT = G.t + .5; floatText(u.x, u.y - 128, txt, col, 13, { vy: -18, label: 1 }); }
function stunU(u, d) { if (ccImmune(u)) return; callout(u, 'STUNNED', '#ffe066'); u.stun = Math.max(u.stun, ccScale(u, d)); interrupt(u); u.path = []; if (u.dash && !u.dash.self) u.dash = null; }
function rootU(u, d) { if (ccImmune(u)) return; callout(u, 'ROOTED', '#8aff7a'); u.root = Math.max(u.root, ccScale(u, d)); interrupt(u); }
function slowU(u, amt, d) { if (ccImmune(u) && !u.boss) return; if (amt >= .25) callout(u, 'SLOWED', '#9fc8ff'); if (u.boss) amt *= .5; u.slows.push({ a: amt, t: ccScale(u, d) }); }
function knockU(u, d) { if (ccImmune(u)) return; callout(u, 'AIRBORNE', '#ffe066'); u.kup = Math.max(u.kup, ccScale(u, d)); interrupt(u); u.path = []; }
function buff(u, name, t, extra = {}) { u.buffs[name] = Object.assign(u.buffs[name] || {}, { t, max: t }, extra); }
function heal(u, amt, src) {
  if (u.dead) return; amt *= (u.s ? u.s.healMult : 1); if (u.gwT > G.t) amt *= .6;
  const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amt);
  if (u.hp - before > 25 && involvesPlayer(u, src) && !G.demo) floatText(u.x, u.y - 40, '+' + Math.round(u.hp - before), '#7dff9a', 15);
}
function shieldU(u, amt, t) { if (u.dead) return; u.shields.push({ a: amt * (u.s ? u.s.healMult : 1), t }); }
function shieldAmt(u) { let s = 0; for (const x of u.shields) s += x.a; return s; }
function reveal(u, t = 1.2) { u.revealT = Math.max(u.revealT, t); if (u.stealth > 0 && t > 0) { u.stealth = 0; delete u.buffs.veil; } }

function structProtected(u) {
  const alive = f => G.units.some(t => t.team === u.team && !t.dead && f(t));
  if (u.kind === 'tower' && (u.tier === 1 || u.tier === 2)) return alive(t => t.kind === 'tower' && t.lane === u.lane && t.tier === u.tier + 1);
  if (u.kind === 'inhib') return alive(t => t.kind === 'tower' && t.lane === u.lane && t.tier === 1);
  if (u.kind === 'tower' && u.tier === 0) return !G.units.some(t => t.team === u.team && t.kind === 'inhib' && t.dead);
  if (u.kind === 'ancient') return alive(t => t.kind === 'tower' && t.tier === 0) || !G.units.some(t => t.team === u.team && t.kind === 'inhib' && t.dead);
  return false;
}

/* ---------------- damage ---------------- */
function damage(src, tgt, amt, o = {}) {
  if (!tgt || tgt.dead || amt <= 0) return 0;
  if (isStruct(tgt) && structProtected(tgt)) { return 0; }
  if (tgt.reset || tgt.stasis > G.t || tgt.invulnT > G.t) return 0;
  let m = 1;
  if (src) {
    if (src.s) {
      m *= src.s.dmgMult;
      if (o.abil) m *= src.s.abilMult;
      if (tgt.kind === 'monster' || isStruct(tgt)) m *= src.s.monsterMult;
      if (src.s.execMult && tgt.hp / tgt.maxHp < .4) m *= 1 + src.s.execMult;
    }
    if (src.kind === 'minion' && src.empowered) m *= 1.5;
    if (src.kind === 'minion' && isStruct(tgt)) m *= 1.3;
    if (src.kind === 'hero' && isStruct(tgt)) m *= .8;
    if (src.kind === 'hero' && tgt.kind === 'minion') m *= 1.25;
  }
  if (tgt.s) {
    m *= tgt.s.dmgTaken;
    if (tgt.s.laststand && tgt.hp / tgt.maxHp < .35) m *= .8;
  }
  if (tgt.kind === 'hero') {
    for (const a of G.heroes) if (a.team === tgt.team && !a.dead && a.s && a.s.guardian && Math.hypot(a.x - tgt.x, a.y - tgt.y) < 500) { m *= .94; break; }
  }
  if (tgt.kind === 'hero' && src && (src.kind === 'tower' || src.kind === 'ancient')) { // towers ramp on heroes
    tgt.towerHits = (tgt.towerHitT > G.t ? (tgt.towerHits || 0) + 1 : 0); tgt.towerHitT = G.t + 2.5; m *= 1 + .25 * Math.min(4, tgt.towerHits);
  }
  const magic = o.abil || o.magic;
  let arm = o.true ? 0 : Math.max(0, magic ? (tgt.mr ?? (tgt.armor || 0) * .7) : (tgt.armor || 0));
  if (src && src.s) arm *= 1 - (magic ? src.s.mpen : src.s.pen);
  let d = amt * m * (100 / (100 + arm));
  const oath = tgt.buffs && tgt.buffs.oath;
  if (oath && !o.redirect && oath.by && !oath.by.dead && oath.by !== tgt && Math.hypot(oath.by.x - tgt.x, oath.by.y - tgt.y) < 900) {
    const share = d * oath.pct; d -= share;
    damage(src, oath.by, share, { true: 1, redirect: 1 });
  }
  let absorbed = 0;
  for (const s of tgt.shields) { const k = Math.min(s.a, d - absorbed); s.a -= k; absorbed += k; if (absorbed >= d) break; }
  tgt.shields = tgt.shields.filter(s => s.a > .5);
  const real = d - absorbed;
  tgt.hp -= real;
  tgt.hitT = .12;
  if (src) {
    if (src.kind === 'hero') {
      src.dmgDone += d; reveal(src, .8);
      if (src.s.lifesteal) heal(src, d * src.s.lifesteal * (o.abil || o.dot ? .5 : 1));
      if (src.s.omni) heal(src, d * src.s.omni * (o.dot ? .3 : 1));
      if (o.abil && !o.dot && !isStruct(tgt)) {
        if (src.s.burn) { tgt.dots = tgt.dots.filter(x => !(x.src === src && x.tag === 'burn')); tgt.dots.push({ src, dps: Math.min(90, tgt.maxHp * .02), t: 3, acc: 0, col: '#ff7a3a', tag: 'burn' }); }
        if (src.s.frost) slowU(tgt, .3, 1);
      }
      if (src.s.antiheal && !o.dot && (o.abil ? src.s.antiheal & 2 : src.s.antiheal & 1)) tgt.gwT = G.t + 3;
      if (tgt.kind === 'hero') { tgt.assist.set(src, G.t); src.aggroHeroT = G.t; }
    }
    if (tgt.kind === 'hero') { tgt.lastHurt = G.t; if (tgt.channel && tgt.channel.kind !== 'none') tgt.channel = null; }
    if (tgt.kind === 'monster' && src.team !== 2) monsterAggro(tgt, src);
    const show = !G.demo && (src === G.player || tgt === G.player || (o.owner && o.owner === G.player));
    if (show && d >= 1) {
      const col = tgt === G.player ? '#ff6b5b' : o.true ? '#ffffff' : o.abil ? '#c9a2ff' : o.crit ? '#ffcf4a' : '#f3e7cf';
      const ty = tgt.y - (tgt.kind === 'hero' || tgt.kind === 'minion' ? unitTop(tgt) * .7 : tgt.r + 12);
      floatText(tgt.x, ty, Math.round(d) + (o.crit ? '!' : ''), o.crit ? '#ffb13a' : col, o.crit ? 28 : o.abil ? 18 : 16, { crit: o.crit, vy: o.crit ? -90 : -60 });
    }
  }
  if (tgt.kind === 'hero' && tgt.s && tgt.s.stonewall && tgt.hp > 0 && tgt.hp / tgt.maxHp < .3 && tgt.stoneCd <= G.t) {
    tgt.stoneCd = G.t + 45; shieldU(tgt, tgt.maxHp * .15, 4); ring(tgt.x, tgt.y, '#5fd4c4', 60);
  }
  if (tgt.kind === 'hero' && tgt.s && tgt.s.lifeline && tgt.hp > 0 && tgt.hp / tgt.maxHp < .3 && (tgt.lifeCd || 0) <= G.t) {
    tgt.lifeCd = G.t + 60; shieldU(tgt, 150 + tgt.maxHp * tgt.s.lifeline, 4); ring(tgt.x, tgt.y, '#f3d892', 70, .6, 6); callout(tgt, 'LIFELINE', '#f3d892');
  }
  if (tgt.hp <= 0) kill(tgt, src);
  return d;
}

function monsterAggro(m, src) {
  const who = src.kind === 'hero' ? src : null;
  if (!who) return;
  const camp = m.camp;
  const list = camp ? camp.units : [m];
  for (const u of list) if (!u.dead && !u.reset && (!u.aggro || u.aggro.dead)) u.aggro = who;
  m.lastAggroT = G.t;
}

/* ---------------- death & rewards ---------------- */
function heroesNear(team, x, y, r) { return G.heroes.filter(h => h.team === team && !h.dead && Math.hypot(h.x - x, h.y - y) <= r); }
function giveGold(h, g, x, y) { if (!h || g <= 0) return; h.gold += g; h.goldEarned = (h.goldEarned || 0) + g; if (h === G.player) { floatText(x ?? h.x, (y ?? h.y) - 44, '+' + Math.round(g), '#ffd24a', g >= 20 ? 19 : 15, { vy: -55, coin: 1 }); UI.goldPop = true; } }
function coinBurst(from, to, n) {
  if (G.demo || !G.player || to.team !== G.player.team) return;
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rnd(-1.1, 1.1), v = rnd(140, 280); G.parts.push({ kind: 'coin', x: from.x, y: from.y - 16, vx: Math.cos(a) * v, vy: Math.sin(a) * v, home: to, life: 2, max: 2, size: rnd(3.5, 5), spin: rnd(TAU), age: -i * .02 }); }
}
function updCoin(p, dt) {
  p.age += dt; p.spin += dt * 14;
  if (p.age < 0) return;
  if (p.age < .35) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; return; }
  const t = p.home; if (!t || t.dead) { p.life = 0; return; }
  const dx = t.x - p.x, dy = t.y - 30 - p.y, d = Math.hypot(dx, dy), sp = 300 + (p.age - .35) * 1800;
  if (d < sp * dt + 6) { p.life = 0; if (t === G.player) part({ x: t.x, y: t.y - 30, color: '#ffd24a', size: 20, life: .2, max: .2 }); return; }
  p.x += dx / d * sp * dt; p.y += dy / d * sp * dt;
}
function giveXp(h, amt) {
  if (!h || h.dead || h.level >= MAXLVL) return;
  h.xp += amt * (h.s ? h.s.xpMult : 1);
  while (h.level < MAXLVL && h.xp >= xpNeed(h.level)) {
    h.xp -= xpNeed(h.level); h.level++; h.pts++;
    calcStats(h);
    ring(h.x, h.y, '#f3d892', 70, .7, 3); burst(h.x, h.y, '#f3d892', 18, 180, 8, .7);
    if (h.ai) aiSpendTalents(h);
    if (h === G.player) {
      SFX.play('level');
      if (h.level === 6) announce('Ultimate unlocked', `${ABIL[h.def.ab.R].name} is ready — press R`);
      else floatText(h.x, h.y - 60, 'LEVEL ' + h.level, '#f3d892', 20, { vy: -30 });
      UI.dirty = true;
    }
  }
  if (h.level >= MAXLVL) h.xp = 0;
}

function kill(u, src) {
  if (u.dead) return;
  u.dead = true; u.hp = 0; u.deadT = 0;
  const killer = src && src.kind === 'hero' ? src : null;
  switch (u.kind) {
    case 'minion': {
      let bounty = u.gold + G.t / 60 * .6;
      // a champion with a bounty aura (supports) enriches everyone who fights beside them
      for (const a of G.heroes) if (a.def.bounty && a.team === 1 - u.team && !a.dead && Math.hypot(a.x - u.x, a.y - u.y) < 900) { bounty *= 1 + a.def.bounty; break; }
      if (killer) { altarHeal(killer); giveGold(killer, bounty, u.x, u.y); killer.cs++; coinBurst(u, killer, 9); if (killer === G.player) { SFX.play('coin'); G.hitstop = Math.max(G.hitstop || 0, .03); } }
      // tribute: champions nearby share the spoils even without the last hit
      for (const h of heroesNear(1 - u.team, u.x, u.y, 850)) if (h !== killer) { giveGold(h, bounty * (killer ? .3 : .55), u.x, u.y - 14); coinBurst(u, h, 3); if (h === G.player && !killer) SFX.play('coin'); }
      const near = heroesNear(1 - u.team, u.x, u.y, 900);
      near.forEach(h => giveXp(h, u.xp / Math.max(1, near.length * .75)));
      burst(u.x, u.y, TEAMCOL[u.team], 8, 140, 8, .4);
      break;
    }
    case 'hero': heroDied(u, src); break;
    case 'monster': monsterDied(u, killer || (src && src.kind === 'hero' ? src : null)); break;
    case 'tower': {
      G.towersLeft[u.team]--;
      heroesNear(1 - u.team, u.x, u.y, 99999).forEach(h => giveGold(h, 150));
      if (killer) giveGold(killer, 100);
      burst(u.x, u.y, TEAMCOL[u.team], 40, 380, 16, 1); burst(u.x, u.y, '#ffcf8a', 30, 260, 12, 1.2); G.shake = Math.max(G.shake, 14);
      SFX.play('tower');
      const mine = G.player && u.team === G.player.team;
      announce(mine ? 'Tower lost' : 'Tower destroyed', `${TEAMNAME[1 - u.team]} razed the ${u.name}`, mine ? 'red' : 'blue');
      addFeed(`<span class="${u.team ? 'a' : 'e'}">${TEAMNAME[1 - u.team]}</span> destroyed <span class="n">${u.name}</span>`);
      if (u.tier === 1) announce(mine ? 'Our inhibitor is exposed' : 'Their inhibitor is exposed', `Destroy it to unleash super minions in the ${u.lane === 'top' ? 'top' : 'bottom'} lane`, mine ? 'red' : 'blue');
      if (u.tier === 0) announce(mine ? 'Our Ancient is exposed' : 'Their Ancient is exposed', 'The nexus tower has fallen', mine ? 'red' : 'blue');
      break;
    }
    case 'inhib': {
      burst(u.x, u.y, TEAMCOL[u.team], 40, 380, 16, 1); G.shake = Math.max(G.shake, 12); SFX.play('tower');
      heroesNear(1 - u.team, u.x, u.y, 99999).forEach(h => giveGold(h, 50));
      const mine = G.player && u.team === G.player.team;
      announce(mine ? 'Inhibitor destroyed' : 'Enemy inhibitor destroyed', mine ? 'Enemy super minions are coming — it rebuilds in 3:00' : 'Super minions join your waves for 3:00', mine ? 'red' : 'blue');
      addFeed(`<span class="${u.team ? 'a' : 'e'}">${TEAMNAME[1 - u.team]}</span> destroyed the <span class="n">${u.name}</span>`);
      after(180, () => { if (G.over) return; u.dead = false; u.hp = u.maxHp; u.hpLag = u.hp; ring(u.x, u.y, TEAMCOL[u.team], 90, .8, 6); announce(u.team === (G.player ? G.player.team : 0) ? 'Inhibitor restored' : 'Enemy inhibitor restored', u.name); });
      break;
    }
    case 'ancient': {
      burst(u.x, u.y, TEAMCOL[u.team], 120, 700, 20, 2); G.shake = 30; SFX.play('tower');
      G.over = true; G.winner = 1 - u.team;
      after(2.5, () => UI.endGame());
      break;
    }
  }
}

function heroDied(h, src) {
  h.respawn = 5 + h.level * 1.6 + G.t / 60 * .35;
  h.path = []; h.attackTarget = null; h.channel = null; h.dash = null; h.dth++;
  h.shields = []; h.slows = []; h.dots = []; h.stun = 0; h.root = 0; h.kup = 0; h.stealth = 0;
  const keepBuffs = {};
  let killer = src && src.kind === 'hero' ? src : null;
  const assisters = [...h.assist.entries()].filter(([a, t]) => G.t - t < 10 && a.team !== h.team && !a.dead).map(([a]) => a);
  if (!killer && assisters.length) killer = assisters[0];
  const bounty = 300 + Math.min(4, h.streak) * 50;
  h.streak = 0;
  burst(h.x, h.y, h.def.c1, 30, 300, 14, 1); ring(h.x, h.y, h.def.c1, 120, .8, 5);
  if (killer) {
    killer.k++; killer.streak++;
    giveGold(killer, bounty, h.x, h.y);
    giveXp(killer, 120 + h.level * 25);
    // buff steal
    for (const b of ['mindwell', 'ember', 'voidhand']) if (h.buffs[b] && b !== 'voidhand') buff(killer, b, Math.max(40, h.buffs[b].t));
    if (killer.s.rampage) { heal(killer, killer.maxHp * .15); buff(killer, 'rampage', 3); }
    for (const a of assisters) if (a !== killer) { a.as_++; giveGold(a, 120, h.x, h.y); giveXp(a, 70 + h.level * 12); if (a.s.rampage) { heal(a, a.maxHp * .15); buff(a, 'rampage', 3); } }
    G.kills[killer.team]++;
    if (killer.def.id === 'nyx' && hasCap(killer, 0) && killer.lastMark && G.t - killer.lastMark.t < 3 && killer.lastMark.u === h) killer.cds.R = 0;
    const kc = killer.team === 0 ? 'a' : 'e', vc = h.team === 0 ? 'a' : 'e';
    addFeed(`<span class="${kc}">${killer.name}</span> slew <span class="${vc}">${h.name}</span>`);
    const mk = G.lastKill[killer.id]; let multi = 1;
    if (mk && G.t - mk.t < 10) multi = mk.n + 1;
    G.lastKill[killer.id] = { t: G.t, n: multi };
    const good = G.player && killer.team === G.player.team;
    const cls = good ? 'blue' : 'red';
    if (!G.firstBlood) { G.firstBlood = true; announce('First Blood', `${killer.name} draws first`, cls); giveGold(killer, 100); }
    else if (multi >= 2) announce(['', '', 'Double Kill', 'Triple Kill', 'Rift Rampage', 'Legendary'][Math.min(5, multi)], killer.name, cls);
    else if (killer.streak === 3) announce('Killing Spree', `${killer.name} is on a rampage`, cls);
    else if (killer.streak === 5) announce('Unstoppable', `${killer.name} cannot be stopped`, cls);
    else if (h === G.player) announce('You have been slain', `by ${killer.name}`, 'red');
    else if (killer === G.player) announce('Enemy slain', h.name, 'blue');
    else if (!G.demo) UI.miniAnnounce(`${killer.name} slew ${h.name}`, good);
    SFX.play('kill');
  } else {
    G.kills[1 - h.team]++;
    addFeed(`<span class="${h.team === 0 ? 'a' : 'e'}">${h.name}</span> was <span class="n">executed</span>`);
    if (h === G.player) announce('You have been slain', 'executed', 'red');
  }
  h.buffs = {};
  h.assist.clear();
  if (h === G.player) document.getElementById('game').classList.add('dead');
}
function respawnHero(h) {
  const f = FOUNT[h.team];
  h.dead = false; h.x = f.x + (h.team ? -30 : 30); h.y = f.y + rnd(-50, 50);
  calcStats(h); h.hp = h.maxHp; h.mana = h.maxMana; h.path = []; h.attackTarget = null; h.aiState = 'lane'; h.obj = null;
  buff(h, 'homeguard', 6);
  ring(h.x, h.y, TEAMCOL[h.team], 80, .8);
  if (h === G.player) { document.getElementById('game').classList.remove('dead'); G.cam.free = false; }
}

function monsterDied(m, killer) {
  const camp = m.camp;
  burst(m.x, m.y, m.color, m.boss ? 60 : 18, m.boss ? 500 : 220, m.boss ? 18 : 10, m.boss ? 1.4 : .6);
  if (m.boss) G.shake = Math.max(G.shake, 18);
  if (!killer) { // killed by something odd: just clear
  } else {
    altarHeal(killer);
    giveGold(killer, m.gold, m.x, m.y);
    const near = heroesNear(killer.team, m.x, m.y, 900);
    near.forEach(h => giveXp(h, m.xp / Math.max(1, near.length * .7)));
    if (!near.includes(killer)) giveXp(killer, m.xp * .5);
    killer.cs += m.boss ? 4 : 2;
    const MB = MON[m.mtype];
    if (MB.buff) {
      buff(killer, MB.buff, 90);
      if (killer === G.player) announce(MB.buff === 'mindwell' ? 'Mindwell Blessing' : 'Emberheart Blessing', MB.buff === 'mindwell' ? '+15% cooldown reduction · +6 mana/s · 90s' : 'Attacks burn and slow · 90s', 'blue');
    }
    const good = G.player && killer.team === G.player.team;
    if (m.mtype === 'drake') {
      const e = G.drake.elem; G.drakes[killer.team].push(e);
      heroesNear(killer.team, 0, 0, 99999).forEach(h => giveGold(h, 100));
      announce(`${e} Drake slain`, `${TEAMNAME[killer.team]} gain ${drakeBonusText(e)}${G.drakes[killer.team].length === 3 ? ' — DRAKESOUL awakened' : ''}`, good ? 'blue' : 'red');
      addFeed(`<span class="${killer.team ? 'e' : 'a'}">${killer.name}</span> slew the <span class="n">${e} Drake</span>`);
      G.drake.unit = null; G.drake.next = G.t + 150; G.drake.elem = pick(['Infernal', 'Tidal', 'Gale', 'Stone']);
      SFX.play('horn');
    }
    if (m.mtype === 'voidmaw') {
      heroesNear(killer.team, 0, 0, 99999).forEach(h => { giveGold(h, 250); if (!h.dead) buff(h, 'voidhand', 180); });
      G.voidhand[killer.team] = G.t + 180;
      announce('Voidmaw devoured', `${TEAMNAME[killer.team]} wield the Hand of the Void — empowered minions for 2:30`, good ? 'blue' : 'red');
      addFeed(`<span class="${killer.team ? 'e' : 'a'}">${killer.name}</span> slew <span class="n">Voidmaw</span>`);
      G.voidmaw.unit = null; G.voidmaw.next = G.t + 360;
      SFX.play('horn');
    }
  }
  if (m.mtype === 'drake' && !killer) { G.drake.unit = null; G.drake.next = G.t + 150; }
  if (m.mtype === 'voidmaw' && !killer) { G.voidmaw.unit = null; G.voidmaw.next = G.t + 360; }
  if (camp && camp.units.every(u => u.dead)) { camp.next = G.t + camp.respawn; camp.units = []; }
}
function altarHeal(h) { if (G.altars.every(a => a.owner === h.team)) heal(h, h.maxHp * .01); }
function drakeBonusText(e) { return { Infernal: '+6% damage', Tidal: '+3 health & 1.5 mana regen', Gale: '+4% move speed', Stone: '+9 armor' }[e]; }
