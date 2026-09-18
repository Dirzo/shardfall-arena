/* =========================================================
   Shardfall Arena — online game server.
   Serves the client from ./public and hosts authoritative
   matches: the simulation runs here, clients send orders and
   render the snapshots they get back.
   No dependencies beyond Node itself.
   ========================================================= */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachWebSocket } from './wsserver.mjs';
import { createSim } from './sim.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'public');
const PORT = process.env.PORT || 8080;

const TICK = 1 / 30;          // simulation steps per second
const SNAP_EVERY = 2;         // send a snapshot every N ticks (15/s)
const IDLE_CLOSE = 120;       // seconds an empty room lingers
const MAX_ROOMS = 40;
const SPEED = Math.max(1, Math.min(10, +(process.env.SPEED || 1))); // test knob: run matches faster than real time

/* ---------------- static files ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (p === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok ' + rooms.size + ' rooms'); return; }
  if (p === '/') p = '/index.html';
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end('no'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

/* ---------------- rooms ---------------- */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); } while (rooms.has(c));
  return c;
};

function makeRoom() {
  const code = newCode();
  const room = {
    code, sim: null, started: false, over: false, seq: 0, ticks: 0, idle: 0,
    slots: Array.from({ length: 6 }, (_, i) => ({ i, team: i < 3 ? 0 : 1, name: '', heroId: null, ready: false, conn: null, host: false })),
    events: [], known: new Map(), heroIx: [], lastTick: 0,
  };
  rooms.set(code, room);
  return room;
}

const liveConns = new Set();
server.__conns = liveConns;

function send(conn, o) { try { conn.send(JSON.stringify(o)); } catch { } }
function roomBroadcast(room, o) {
  const msg = JSON.stringify(o);
  for (const s of room.slots) if (s.conn && s.conn.open) { try { s.conn.send(msg); } catch { } }
}
function lobbyState(room) {
  return {
    t: 'lobby', code: room.code, started: room.started,
    slots: room.slots.map(s => ({ name: s.name, heroId: s.heroId, ready: s.ready, open: !s.conn, host: s.host, team: s.team })),
  };
}
function pushLobby(room) {
  for (const s of room.slots) if (s.conn) send(s.conn, { ...lobbyState(room), you: s.i });
}
function freeSlot(room, team) {
  const order = team === undefined
    ? [...room.slots].sort((a, b) => teamCount(room, a.team) - teamCount(room, b.team) || a.i - b.i)
    : room.slots.filter(s => s.team === team);
  return order.find(s => !s.conn) || null;
}
const teamCount = (room, team) => room.slots.filter(s => s.team === team && s.conn).length;
const humans = room => room.slots.filter(s => s.conn);

/* ---------------- match ---------------- */
function startMatch(room) {
  const taken = new Set(room.slots.map(s => s.heroId).filter(Boolean));
  const pool = META.heroIds.filter(id => !taken.has(id));
  for (const s of room.slots) {
    if (!s.heroId) { s.heroId = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : META.heroIds[s.i % META.heroIds.length]; }
  }
  const api = createSim();
  room.sim = api;
  const a = [room.slots[0].heroId, room.slots[1].heroId, room.slots[2].heroId];
  const b = [room.slots[3].heroId, room.slots[4].heroId, room.slots[5].heroId];
  api.newGame(a[0], b, a.slice(1), false, 1);
  const G = api.G;
  G.player = null;
  // G.heroes order matches slot order: team A (0,1,2) then team B (3,4,5)
  room.heroIx = G.heroes.map(h => h);
  room.slots.forEach((s, i) => {
    const h = G.heroes[i];
    s.hero = h;
    h.ai = !s.conn;
    h.netName = s.name || null;
  });
  room.started = true; room.over = false; room.seq = 0; room.ticks = 0;
  room.known = new Map();
  room.events = [];
  api.hook(e => { if (room.events.length < 200) room.events.push(e); });
  room.lastTick = Date.now();
  for (const s of room.slots) if (s.conn) send(s.conn, { t: 'start', a, b, you: s.i, tt: G.t, code: room.code });
  log(`room ${room.code}: match started (${humans(room).length} players)`);
}

function resetRoom(room) {           // back to the lobby after a match ends
  room.sim = null; room.started = false; room.over = false;
  room.known = new Map(); room.events = []; room.seq = 0; room.ticks = 0;
  for (const s of room.slots) { s.hero = null; s.inq = []; s.ready = false; if (!s.conn) { s.name = ''; s.heroId = null; } }
}

/* per-slot input queue */
function queueInput(slot, m) {
  slot.inq = slot.inq || [];
  if (slot.inq.length < 24) slot.inq.push(m);
}

function applyInputs(room) {
  const api = room.sim, G = api.G;
  for (const s of room.slots) {
    const h = s.hero;
    if (!h || !s.inq || !s.inq.length) continue;
    const q = s.inq; s.inq = [];
    if (!s.conn || h.ai) continue;
    for (const m of q) {
      try { applyOne(api, G, h, m, room, s); } catch (e) { log('input error: ' + e.message); }
    }
  }
}
function applyOne(api, G, h, m, room, slot) {
  switch (m.a) {
    case 'order': {
      if (h.dead) return;
      const prev = G.player; G.player = h;
      api.issueOrder(+m.x || 0, +m.y || 0, !!m.r);
      G.player = prev;
      break;
    }
    case 'amove': {
      if (h.dead) return;
      h.amove = { x: +m.x || 0, y: +m.y || 0 };
      h.attackTarget = null; h.hold = false; h.channel = null;
      h.path = api.findPath(h.x, h.y, h.amove.x, h.amove.y);
      break;
    }
    case 'hold': h.hold = true; h.path = []; h.amove = null; break;
    case 'stop': h.path = []; h.attackTarget = null; h.autoAcq = false; h.amove = null; h.hold = false; h.wind = null; break;
    case 'cast': {
      if (h.dead) return;
      const k = String(m.k || '').toUpperCase();
      if (!['Q', 'W', 'E', 'R', 'D', 'F'].includes(k)) return;
      api.cast(h, k, +m.x || 0, +m.y || 0);
      break;
    }
    case 'item': {
      if (h.dead) return;
      const i = m.i | 0;
      if (i >= 0 && i < 6) api.useItem(h, i, +m.x || 0, +m.y || 0);
      break;
    }
    case 'recall': if (!h.dead) api.startRecall(h); break;
    case 'buy': if (typeof m.id === 'string' && api.ITEM[m.id]) api.buyItem(h, m.id); break;
    case 'sell': api.sellItem(h, m.i | 0); break;
    case 'undo': api.undoShop(h); break;
    case 'learn': {
      const node = findNode(api, m.id);
      if (node && api.canLearn(h, node)) api.learn(h, node);
      break;
    }
    case 'reset': {
      const prev = G.player; G.player = h;
      api.resetTalents();
      G.player = prev;
      break;
    }
    case 'surrender': {
      if (G.t < 900) return;
      G.over = true; G.winner = 1 - h.team;
      room.events.push(['fd', `<span class="${h.team ? 'e' : 'a'}">${escapeHtml(slot.name || 'A team')}</span> surrendered`]);
      break;
    }
  }
}
function findNode(api, id) {
  for (const tree of api.TREES) for (const n of tree.nodes) if (n.id === id) return n;
  return null;
}
const escapeHtml = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------------- snapshots ---------------- */
function unitRow(u, G) {
  const bits = (u.dead ? 1 : 0) | (u.moving ? 2 : 0) | (u.stealth > 0 ? 4 : 0)
    | ((u.stun > 0 || u.root > 0 || u.kup > 0) ? 8 : 0) | (u.empowered ? 16 : 0)
    | (u.reset ? 32 : 0) | (u.channel ? 64 : 0) | ((u.stasis > G.t || u.invulnT > G.t) ? 128 : 0);
  const tgt = (u.wind && u.wind.tgt) || u.attackTarget || u.target;
  const row = [
    u.id, Math.round(u.x), Math.round(u.y), Math.round(u.face * 100), Math.round(u.hp), bits,
    tgt && !tgt.dead ? tgt.id : 0,
    u.wind ? Math.max(1, Math.round(u.wind.t / u.wind.dur * 100)) : 0,
    u.swing > 0 ? Math.round(u.swing * 1000) : 0,
    u.casting ? Math.max(1, Math.round(u.casting.t / u.casting.dur * 100)) : 0,
    Math.round(u.shields.reduce((s, x) => s + x.a, 0)),
  ];
  while (row.length > 6 && !row[row.length - 1]) row.pop();
  return row;
}
function spawnRow(u) {
  const d = { i: u.id, k: u.kind, tm: u.team, x: Math.round(u.x), y: Math.round(u.y), r: Math.round(u.r), mh: Math.round(u.maxHp), nm: u.name || '' };
  if (u.kind === 'minion') {
    d.mt = u.mtype; if (u.ranged) d.rg = 1; if (u.lane) d.ln = u.lane; if (u.empowered) d.emp = 1;
    if (u.pet) { d.pet = 1; if (u.owner) d.ow = u.owner.id; }
    d.ms = Math.round(u.ms); d.rn = Math.round(u.range);
  }
  if (u.kind === 'monster') { d.mt = u.mtype; if (u.boss) d.bo = 1; if (u.color) d.co = u.color; if (u.elem) d.el = u.elem; }
  return d;
}
function heroRow(h) {
  return [
    h.id, h.level, Math.round(h.hp), Math.round(h.maxHp), Math.round(h.mana), Math.round(h.maxMana),
    h.k | 0, h.dth | 0, h.as_ | 0, h.cs | 0, Math.round(Math.max(0, h.respawn) * 10),
    Object.keys(h.buffs).join('|'), h.items.join('|'), Math.round(h.gold),
  ];
}
function meRow(h) {
  const s = h.s;
  return {
    g: Math.round(h.gold), xp: Math.round(h.xp), pts: h.pts | 0,
    it: h.items.join('|'), st: h.stacks, ic: h.itemCd, tl: h.talents,
    cd: Object.fromEntries(Object.entries(h.cds).map(([k, v]) => [k, Math.round(Math.max(0, v) * 10) / 10])),
    am: h.amove ? [Math.round(h.amove.x), Math.round(h.amove.y)] : null,
    hd: h.hold ? 1 : 0,
    ch: h.channel ? [h.channel.kind, Math.round(h.channel.t * 10) / 10, h.channel.max, h.channel.name || ''] : null,
    un: h.undo && h.undo.length ? 1 : 0,
    hp: Math.round(h.hp), mh: Math.round(h.maxHp), mn: Math.round(h.mana), mm: Math.round(h.maxMana),
    dd: h.dead ? 1 : 0, rs: Math.round(Math.max(0, h.respawn) * 10) / 10,
  };
}
function worldRow(G) {
  return {
    k: G.kills, tw: G.towersLeft, n: Math.round(G.night * 100) / 100,
    al: G.altars.map(a => [a.owner, Math.round(a.prog[0] * 10), Math.round(a.prog[1] * 10), Math.round(a.unlock)]),
    rl: [G.relic.up ? 1 : 0, Math.round(G.relic.next)],
    vm: [G.voidmaw.unit && !G.voidmaw.unit.dead ? 1 : 0, Math.round(G.voidmaw.next)],
    dk: [G.drake.unit && !G.drake.unit.dead ? 1 : 0, Math.round(Number.isFinite(G.drake.next) ? G.drake.next : 1e9)],
    rv: G.reveal.map(x => Math.round(x)),
    ov: G.over ? 1 : 0, wn: G.winner == null ? -1 : G.winner,
  };
}

function sendSnapshots(room) {
  const api = room.sim, G = api.G;
  const units = [], spawns = [], seen = new Set();
  for (const u of G.units) {
    seen.add(u.id);
    if (!room.known.has(u.id)) { room.known.set(u.id, 1); if (u.kind !== 'hero') spawns.push(spawnRow(u)); }
    units.push(unitRow(u, G));
  }
  const removed = [];
  for (const id of room.known.keys()) if (!seen.has(id)) { removed.push(id); room.known.delete(id); }
  const projs = G.projs.filter(p => !p.dead).map(p => {
    const row = [p.id || 0, Math.round(p.x), Math.round(p.y), p.style || 'bolt', p.color || '#fff', p.team,
      Math.round(Math.atan2(p.vy || 0, p.vx || 1) * 100), Math.round(p.w || 24),
      Math.round(Math.max(0, (p.range || 0) - (p.trav || 0))), p.homing ? 1 : 0];
    return row;
  });
  const zones = G.zones.filter(z => !z.dead).map(z => [
    z.id || 0, Math.round(z.x), Math.round(z.y), Math.round(z.r), z.style || 'quake', z.color || '#fff',
    z.team, Math.round(z.t * 10), Math.round((z.dur || 0) * 10), Math.round((z.delay || 0) * 10),
  ]);
  const heroes = G.heroes.map(heroRow);
  const world = worldRow(G);
  const events = room.events; room.events = [];
  const base = { t: 'snap', s: ++room.seq, tt: Math.round(G.t * 100) / 100, u: units, h: heroes, w: world, p: projs, z: zones };
  if (spawns.length) base.sp = spawns;
  if (removed.length) base.rm = removed;
  if (events.length) base.ev = events;
  for (const s of room.slots) {
    if (!s.conn || !s.conn.open || !s.hero) continue;
    send(s.conn, { ...base, me: meRow(s.hero) });
  }
}

/* ---------------- tick loop ---------------- */
let projId = 1;
function tickRoom(room, dt) {
  const api = room.sim;
  if (!api) return;
  const G = api.G;
  applyInputs(room);
  api.update(dt * api.SIM_SPEED);
  // stable ids for projectiles / zones so clients can match them up
  for (const p of G.projs) if (!p.id) p.id = ++projId;
  for (const z of G.zones) if (!z.id) z.id = ++projId;
  room.ticks++;
  if (room.ticks % SNAP_EVERY === 0) sendSnapshots(room);
  if (G.over && !room.over) {
    room.over = true;
    log(`room ${room.code}: match over, winner team ${G.winner}`);
    sendSnapshots(room);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.started && !room.over) {
      const steps = Math.min(4, Math.max(1, Math.round((now - room.lastTick) / (TICK * 1000)))) * SPEED;
      room.lastTick = now;
      for (let i = 0; i < steps; i++) tickRoom(room, TICK);
    }
    if (!humans(room).length) {
      room.idle += TICK * 1;
      if (room.idle > IDLE_CLOSE) { rooms.delete(code); log(`room ${code}: closed (empty)`); }
    } else room.idle = 0;
  }
}, TICK * 1000);

// round-trip time probes
setInterval(() => {
  for (const room of rooms.values()) for (const s of room.slots) {
    if (!s.conn || !s.conn.open) continue;
    s.pingAt = Date.now();
    send(s.conn, { t: 'ping', s: s.pingAt });
  }
}, 3000);

/* ---------------- connections ---------------- */
let META = { heroIds: [] };
function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

attachWebSocket(server, (conn) => {
  liveConns.add(conn);
  const state = { room: null, slot: null };
  conn.on('message', text => {
    let m;
    try { m = JSON.parse(text); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    const room = state.room, slot = state.slot;
    switch (m.t) {
      case 'create': {
        if (room) return;
        if (rooms.size >= MAX_ROOMS) return send(conn, { t: 'err', m: 'The server is full — try again shortly.' });
        const r = makeRoom(), s = r.slots[0];
        s.conn = conn; s.name = cleanName(m.name); s.host = true;
        state.room = r; state.slot = s;
        log(`room ${r.code}: created by ${s.name}`);
        pushLobby(r);
        break;
      }
      case 'join': {
        if (room) return;
        const r = rooms.get(String(m.code || '').toUpperCase());
        if (!r) return send(conn, { t: 'err', m: 'No room with that code.' });
        if (r.started && r.over) resetRoom(r);
        if (r.started) {           // rejoin: take back your own champion
          const name = cleanName(m.name);
          const mineSlot = r.slots.find(x => !x.conn && x.name === name && x.hero);
          if (!mineSlot) return send(conn, { t: 'err', m: 'That match has already started.' });
          mineSlot.conn = conn; mineSlot.hero.ai = false;
          state.room = r; state.slot = mineSlot;
          r.known = new Map();     // resend every unit description to everyone
          send(conn, { t: 'start', a: r.slots.slice(0, 3).map(x => x.heroId), b: r.slots.slice(3).map(x => x.heroId), you: mineSlot.i, tt: r.sim.G.t, code: r.code });
          log(`room ${r.code}: ${name} rejoined slot ${mineSlot.i}`);
          return;
        }
        const s = freeSlot(r);
        if (!s) return send(conn, { t: 'err', m: 'That room is full.' });
        s.conn = conn; s.name = cleanName(m.name);
        if (!r.slots.some(x => x.host && x.conn)) s.host = true;
        state.room = r; state.slot = s;
        log(`room ${r.code}: ${s.name} joined slot ${s.i}`);
        pushLobby(r);
        break;
      }
      case 'pick': {
        if (!room || !slot || room.started) return;
        const id = String(m.id || '');
        if (!META.heroIds.includes(id)) return;
        if (room.slots.some(x => x !== slot && x.conn && x.heroId === id)) return send(conn, { t: 'err', m: 'A teammate already picked that champion.' });
        slot.heroId = id; slot.ready = true;
        pushLobby(room);
        break;
      }
      case 'team': {
        if (!room || !slot || room.started) return;
        const other = slot.team === 0 ? 1 : 0;
        const free = freeSlot(room, other);
        if (!free) return send(conn, { t: 'err', m: 'That side is full.' });
        free.conn = slot.conn; free.name = slot.name; free.heroId = slot.heroId; free.ready = slot.ready; free.host = slot.host;
        slot.conn = null; slot.name = ''; slot.heroId = null; slot.ready = false; slot.host = false;
        state.slot = free;
        pushLobby(room);
        break;
      }
      case 'start': {
        if (!room || !slot || !slot.host) return;
        if (room.started && room.over) { resetRoom(room); pushLobby(room); }
        if (room.started) return;
        const hs = humans(room);
        if (hs.some(s => !s.ready)) return send(conn, { t: 'err', m: 'Everyone needs to lock in a champion first.' });
        startMatch(room);
        break;
      }
      case 'in': {
        if (!room || !slot || !room.started || room.over) return;
        queueInput(slot, m);
        break;
      }
      case 'pong': {
        if (slot && slot.pingAt) { slot.rtt = Date.now() - slot.pingAt; send(conn, { t: 'rtt', ms: slot.rtt }); }
        break;
      }
    }
  });
  conn.on('close', () => {
    liveConns.delete(conn);
    const room = state.room, slot = state.slot;
    if (!room || !slot) return;
    slot.conn = null; slot.ready = false;
    if (room.started && slot.hero) { slot.hero.ai = true; log(`room ${room.code}: ${slot.name} left — champion handed to the computer`); }
    else log(`room ${room.code}: ${slot.name} left the lobby`);
    if (slot.host) { slot.host = false; const next = room.slots.find(s => s.conn); if (next) next.host = true; }
    if (!room.started) { slot.name = ''; slot.heroId = null; pushLobby(room); }
    else pushLobby(room);
  });
});
const cleanName = n => String(n || '').replace(/[^\w \-']/g, '').trim().slice(0, 14) || 'Champion';

/* ---------------- boot ---------------- */
{
  const api = createSim();
  META = { heroIds: api.HEROES.map(h => h.id) };
  log(`loaded ${META.heroIds.length} champions`);
}
server.listen(PORT, () => {
  log(`Shardfall server listening on http://localhost:${PORT}`);
});
