/* =========================================================
   ONLINE CLIENT — lobby, input relay and snapshot rendering.
   The server owns the simulation; this file turns the local
   game into a viewer that draws server state and sends orders.
   ========================================================= */
const NET = {
  on: false, ws: null, slot: -1, room: null, name: '', you: 0,
  serverT: 0, snapAt: 0, snapDt: 1 / 15, ping: 0, seq: 0,
  ids: new Map(), started: false, overShown: false, connected: false, error: '',
};
const NETQ = []; // outbound queue while connecting
// your own champion is simulated locally so it answers the mouse immediately;
// the server's position pulls it back into line every snapshot
const PRED = { on: false, path: [], err: 0, snaps: 0, corr: 0 };

/* ---------- the client never mutates the simulation ---------- */
const _damage = damage; damage = (s, t, a, o) => NET.on ? 0 : _damage(s, t, a, o);
const _heal = heal; heal = (u, a, s) => { if (!NET.on) return _heal(u, a, s); };
const _shieldU = shieldU; shieldU = (u, a, t) => { if (!NET.on) return _shieldU(u, a, t); };
const _stunU = stunU; stunU = (u, d) => { if (!NET.on) return _stunU(u, d); };
const _slowU = slowU; slowU = (u, a, d) => { if (!NET.on) return _slowU(u, a, d); };
const _rootU = rootU; rootU = (u, d) => { if (!NET.on) return _rootU(u, d); };
const _knockU = knockU; knockU = (u, d) => { if (!NET.on) return _knockU(u, d); };
const _buff = buff; buff = (u, k, t, o) => { if (!NET.on) return _buff(u, k, t, o); };
const _giveGold = giveGold; giveGold = (h, a, x, y) => { if (!NET.on) return _giveGold(h, a, x, y); };
const _giveXp = giveXp; giveXp = (h, a) => { if (!NET.on) return _giveXp(h, a); };
const _kill = kill; kill = (u, s) => { if (!NET.on) return _kill(u, s); };
const _zone = zone; zone = o => { if (!NET.on) return _zone(o); };
const _skillshot = skillshot; skillshot = (h, x, y, o) => { if (!NET.on) return _skillshot(h, x, y, o); };
const _dashU = dashU; dashU = (u, x, y, s, o) => { if (!NET.on) return _dashU(u, x, y, s, o); };
const _blinkTo = blinkTo; blinkTo = (h, x, y, r, c) => { if (NET.on) { burst(h.x, h.y, c, 18, 200, 10, .5); ring(h.x, h.y, c, 50, .4); SFX.play('blink'); return; } return _blinkTo(h, x, y, r, c); };
const _spawnPet = spawnPet; spawnPet = (o, k, x, y, opt) => NET.on ? null : _spawnPet(o, k, x, y, opt);
const _placeMine = placeMine; placeMine = (h, x, y, r) => { if (!NET.on) return _placeMine(h, x, y, r); };
const _spawnWave = spawnWave; spawnWave = () => { if (!NET.on) return _spawnWave(); };
const _spawnMonster = spawnMonster; spawnMonster = (...a) => NET.on ? null : _spawnMonster(...a);
const _attack = attack; attack = (u, t) => { if (!NET.on) return _attack(u, t); };
const _fireAttack = fireAttack; fireAttack = (u, t) => { if (!NET.on) return _fireAttack(u, t); };
const _onAttackHit = onAttackHit; onAttackHit = (u, t) => { if (!NET.on) return _onAttackHit(u, t); };
const _interrupt = interrupt; interrupt = u => { if (!NET.on) return _interrupt(u); };
const _reveal = reveal; reveal = (u, t) => { if (!NET.on) return _reveal(u, t); };
const _altarHeal = altarHeal; altarHeal = h => { if (!NET.on) return _altarHeal(h); };

/* ---------- player actions travel to the server ---------- */
function netSend(o) {
  if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(o));
  else NETQ.push(o);
}
const mine = h => NET.on && G.player && h === G.player;
const _issueOrder = issueOrder;
issueOrder = (wx, wy, repeat) => {
  if (!NET.on) return _issueOrder(wx, wy, repeat);
  const h = G.player; if (!h || h.dead || G.over) return;
  const u = unitAt(wx, wy, h.team);
  if (u && !(isStruct(u) && structProtected(u))) {
    netSend({ t: 'in', a: 'order', x: Math.round(wx), y: Math.round(wy), r: repeat ? 1 : 0 });
    if (!repeat) G.marks.push({ x: u.x, y: u.y, t: .4, col: '#ff5a48', r: u.r + 10 });
    predStop();
    return;
  }
  netSend({ t: 'in', a: 'order', x: Math.round(wx), y: Math.round(wy), r: repeat ? 1 : 0 });
  if (!repeat) G.marks.push({ x: wx, y: wy, t: .45, col: '#9be870', r: 22 });
  predMoveTo(wx, wy);
};
function predMoveTo(wx, wy) {
  const h = G.player;
  if (!h || h.dead || h.stunned || h.channel) { PRED.on = false; return; }
  PRED.path = findPath(h.x, h.y, wx, wy) || [];
  PRED.on = PRED.path.length > 0;
}
function predStop() { PRED.on = false; PRED.path = []; }
const _cast = cast;
cast = (h, key, tx, ty) => {
  if (!NET.on) return _cast(h, key, tx, ty);
  if (!mine(h) || h.dead) return false;
  netSend({ t: 'in', a: 'cast', k: key, x: Math.round(tx), y: Math.round(ty) });
  // show the cooldown starting right away; the next server update sets the real one
  const ab = key === 'D' || key === 'F' ? SPELLS[key] : ABIL[h.def.ab[key]];
  if (ab && !(h.cds[key] > 0) && (!ab.mana || h.mana >= ab.mana) && (key === 'D' || key === 'F' || rank(h, key))) {
    h.cds[key] = .3;
    if (ab.moves || (SHAPE[h.def.ab[key]] || {}).s === 'line') predStop();
  }
  return true;
};
const _useItem = useItem;
useItem = (h, i, x, y) => {
  if (!NET.on) return _useItem(h, i, x, y);
  if (mine(h)) netSend({ t: 'in', a: 'item', i, x: Math.round(x), y: Math.round(y) });
  return true;
};
const _buyItem = buyItem;
buyItem = (h, id) => { if (!NET.on) return _buyItem(h, id); if (mine(h)) netSend({ t: 'in', a: 'buy', id }); return true; };
const _sellItem = sellItem;
sellItem = (h, i) => { if (!NET.on) return _sellItem(h, i); if (mine(h)) netSend({ t: 'in', a: 'sell', i }); return true; };
const _undoShop = undoShop;
undoShop = h => { if (!NET.on) return _undoShop(h); if (mine(h)) netSend({ t: 'in', a: 'undo' }); return true; };
const _learn = learn;
learn = (h, n) => { if (!NET.on) return _learn(h, n); if (mine(h)) netSend({ t: 'in', a: 'learn', id: n.id }); return true; };
const _resetTalents = resetTalents;
resetTalents = () => { if (!NET.on) return _resetTalents(); netSend({ t: 'in', a: 'reset' }); };
const _startRecall = startRecall;
startRecall = h => { if (!NET.on) return _startRecall(h); if (mine(h)) { netSend({ t: 'in', a: 'recall' }); predStop(); } };

/* ---------- lobby UI ---------- */
const NETUI = {};
function netInjectUI() {
  const css = document.createElement('style');
  css.textContent = `
#netModal{position:fixed;inset:0;background:rgba(4,6,10,.82);backdrop-filter:blur(6px);display:grid;place-items:center;z-index:60}
#netModal .box{width:min(460px,92vw);padding:22px;display:grid;gap:12px;background:linear-gradient(180deg,#141a24,#0d1218);border:1px solid #ffffff1f;border-radius:14px;box-shadow:0 30px 80px #000a}
#netModal h3{margin:0;font-family:var(--fd,serif);font-size:30px}
#netModal p{margin:0;color:#a9a18f;font-size:13.5px;line-height:1.4}
#netModal input{padding:10px 12px;border-radius:8px;border:1px solid #ffffff22;background:#0a0e14;color:#efe6d2;font-size:15px;font-family:inherit;width:100%}
#netModal .row{display:flex;gap:8px}
#netModal .row .btn{flex:1;padding:10px 14px}
#netErr{color:#ff8a7a;font-size:13px;min-height:16px}
#netAdv{font-size:12.5px;color:#a9a18f}
#netAdv summary{cursor:pointer;color:#f3d892;letter-spacing:.06em}
#netAdv code{color:#efe6d2}
#netBar{position:fixed;left:0;right:0;bottom:0;z-index:40;padding:8px 12px;display:flex;gap:8px;align-items:center;justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;background:linear-gradient(180deg,#0b0f1580,#0b0f15f0);border-top:1px solid #ffffff14}
#netBar .code{font-family:var(--fu,monospace);letter-spacing:.3em;font-size:18px;color:#f3d892}
#netBar .slots{display:flex;gap:6px;flex-wrap:nowrap}
#netBar>*{flex:0 0 auto}
#netBar .sl{padding:5px 9px;border-radius:8px;border:1px solid #ffffff1c;background:#111823;font-size:12px;display:grid;gap:1px;min-width:92px}
#netBar .sl b{font-size:13px;color:#efe6d2}
#netBar .sl.t0{border-left:3px solid #6fb7ff}
#netBar .sl.t1{border-left:3px solid #ff7a6a}
#netBar .sl.me{background:#1a2432}
#netBar .sl small{color:#a9a18f}
#netBar .sl .rd{color:#7dff9a}
#netBar .sl .wt{color:#a9a18f}
#netBar .sl .ai{color:#c9a2ff}
#netPing{position:fixed;right:12px;top:8px;z-index:41;font:12px/1.2 var(--fu,monospace);color:#a9a18f;letter-spacing:.1em}`;
  document.head.append(css);

  const modal = document.createElement('div');
  modal.id = 'netModal'; modal.hidden = true;
  modal.innerHTML = `<div class="box">
    <span class="eyebrow">Shardfall online</span>
    <h3>Play with friends</h3>
    <p>Create a room and share the four-letter code, or join a friend's code. Empty slots are filled by the computer.</p>
    <input id="netName" maxlength="14" placeholder="Your name" autocomplete="off">
    <div class="row"><button class="btn" id="netCreate">Create room</button></div>
    <div class="row"><input id="netCode" maxlength="4" placeholder="CODE" autocomplete="off" style="text-transform:uppercase;letter-spacing:.3em;width:120px"><button class="btn ghost" id="netJoin">Join</button></div>
    <details id="netAdv"><summary>Server address</summary>
      <p style="margin:6px 0">Leave this empty when the game is served by your own server. Fill it in when this page lives somewhere else, such as GitHub Pages — for example <code>wss://your-app.onrender.com</code>.</p>
      <input id="netServer" placeholder="wss://your-server" autocomplete="off">
    </details>
    <div id="netErr"></div>
    <div class="row"><button class="btn ghost" id="netCancel">Back</button></div>
  </div>`;
  document.body.append(modal);

  const bar = document.createElement('div');
  bar.id = 'netBar'; bar.hidden = true;
  bar.innerHTML = `<span class="eyebrow">Room</span><span class="code" id="netRoomCode">----</span>
    <div class="slots" id="netSlots"></div>
    <button class="btn ghost" id="netSwap" style="padding:8px 14px">Switch team</button>
    <button class="btn" id="netStart" style="padding:8px 18px">Start match</button>
    <button class="btn ghost" id="netLeave" style="padding:8px 14px">Leave</button>`;
  document.body.append(bar);

  const ping = document.createElement('div');
  ping.id = 'netPing'; ping.hidden = true; document.body.append(ping);

  NETUI.modal = modal; NETUI.bar = bar; NETUI.ping = ping;
  const $$ = id => document.getElementById(id);
  $$('netName').value = (() => { try { return localStorage.getItem('shardfall-name') || ''; } catch { return ''; } })();
  netResolveServer();
  $$('netServer').value = NET.server || '';
  if (NET.needsServer) { $$('netAdv').open = true; netError('This page needs the address of a game server.'); }
  $$('netCreate').onclick = () => netStart('create');
  $$('netJoin').onclick = () => netStart('join');
  $$('netCode').addEventListener('keydown', e => { if (e.key === 'Enter') netStart('join'); });
  $$('netName').addEventListener('keydown', e => { if (e.key === 'Enter') netStart('create'); });
  $$('netCancel').onclick = () => { modal.hidden = true; if (NET.ws) { NET.ws.close(); NET.ws = null; } };
  $$('netStart').onclick = () => netSend({ t: 'start' });
  $$('netSwap').onclick = () => netSend({ t: 'team' });
  $$('netLeave').onclick = () => location.reload();

  // "Play online" button on the title screen
  const play = document.getElementById('bPlay');
  if (play) {
    const b = document.createElement('button');
    b.className = 'btn'; b.id = 'bOnline'; b.textContent = 'Play online';
    b.onclick = () => { SFX.init(); SFX.play('ui'); modal.hidden = false; document.getElementById('netName').focus(); };
    play.parentNode.insertBefore(b, play.nextSibling);
  }
}

function netStart(mode) {
  const nameEl = document.getElementById('netName'), codeEl = document.getElementById('netCode');
  const name = (nameEl.value || 'Champion').trim().slice(0, 14);
  try { localStorage.setItem('shardfall-name', name); } catch { }
  NET.name = name;
  const srvEl = document.getElementById('netServer');
  NET.server = (srvEl.value || '').trim();
  try { if (NET.server) localStorage.setItem('shardfall-server', NET.server); else localStorage.removeItem('shardfall-server'); } catch { }
  const code = (codeEl.value || '').trim().toUpperCase();
  NET.lastCode = mode === 'join' ? code : null;
  if (mode === 'join' && code.length !== 4) return netError('Enter the four-letter room code.');
  netError('Connecting…');
  netConnect(() => netSend(mode === 'create' ? { t: 'create', name } : { t: 'join', code, name }));
}
function netError(msg) { const e = document.getElementById('netErr'); if (e) e.textContent = msg || ''; }

/* The page can be served by the game server itself, or from any static host
   (GitHub Pages, Cloudflare Pages) with the server somewhere else. */
function netServerUrl() {
  const raw = (NET.server || '').trim();
  if (!raw) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  let u = raw;
  if (!/^(wss?|https?):\/\//i.test(u)) u = (location.protocol === 'https:' ? 'wss://' : 'ws://') + u;
  u = u.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  u = u.replace(/\/+$/, '');
  if (!/\/ws$/.test(u)) u += '/ws';
  return u;
}
function netResolveServer() {
  const q = new URLSearchParams(location.search).get('server');
  let saved = null;
  try { saved = localStorage.getItem('shardfall-server'); } catch { }
  NET.server = q || (typeof SHARDFALL_SERVER === 'string' ? SHARDFALL_SERVER : '') || saved || '';
  // a page opened from a file or a static host has no server of its own
  NET.needsServer = !NET.server && (location.protocol === 'file:' || !location.host);
}
function netConnect(then) {
  if (NET.ws && NET.ws.readyState <= 1) { then(); return; }
  const url = netServerUrl();
  if (location.protocol === 'https:' && url.startsWith('ws://')) {
    netError('A page loaded over https can only reach a wss:// server. Use the secure address (a Cloudflare tunnel gives you one).');
    return;
  }
  let ws;
  try { ws = new WebSocket(url); } catch (e) { netError('That server address looks wrong: ' + url); return; }
  NET.ws = ws;
  ws.onopen = () => { NET.connected = true; while (NETQ.length) ws.send(JSON.stringify(NETQ.shift())); then(); };
  ws.onmessage = e => { try { netMessage(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  ws.onclose = () => {
    NET.connected = false;
    if (NET.started) UI.toast('Disconnected from the server — your champion is now played by the computer');
    else netError('Connection closed.');
  };
  ws.onerror = () => netError('Could not reach the server.');
}

/* ---------- messages ---------- */
function netMessage(m) {
  switch (m.t) {
    case 'lobby': netLobby(m); break;
    case 'err': netError(m.m); UI.toast && NET.started && UI.toast(m.m); break;
    case 'start': netBegin(m); break;
    case 'snap': netSnap(m); break;
    case 'ping': netSend({ t: 'pong', s: m.s }); break;
    case 'rtt': NET.ping = m.ms; break;
  }
}

function netLobby(m) {
  NET.room = m; NET.slot = m.you;
  NETUI.modal.hidden = true;
  netError('');
  if (document.getElementById('select').hidden) { UI.show('select'); document.getElementById('hud').hidden = true; }
  NETUI.bar.hidden = false;
  document.getElementById('netRoomCode').textContent = m.code;
  const host = m.slots[m.you] && m.slots[m.you].host;
  document.getElementById('netStart').hidden = !host;
  const wrap = document.getElementById('netSlots');
  wrap.innerHTML = m.slots.map((s, i) => {
    const cls = `sl t${i < 3 ? 0 : 1}${i === m.you ? ' me' : ''}`;
    const who = s.open ? '<span class="ai">Computer</span>' : `<b>${netEsc(s.name)}</b>`;
    const pick = s.heroId ? (HERO[s.heroId] ? HERO[s.heroId].name : s.heroId) : '—';
    const state = s.open ? '' : s.ready ? '<span class="rd">ready</span>' : '<span class="wt">picking…</span>';
    return `<div class="${cls}">${who}<small>${netEsc(pick)}</small>${state}</div>`;
  }).join('');
  // the champion-select lock button becomes the ready button
  const lock = document.getElementById('bLock');
  const meSlot = m.slots[m.you];
  lock.textContent = meSlot && meSlot.ready ? 'Ready ✓ — change pick' : 'Lock in';
  // keep the lobby strip from covering the bottom of the select screen
  requestAnimationFrame(() => { document.getElementById('select').style.paddingBottom = (NETUI.bar.offsetHeight + 18) + 'px'; });
}
const netEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------- match start ---------- */
function netBegin(m) {
  NET.on = true; NET.started = true; NET.overShown = false;
  NET.ids = new Map();
  NETUI.bar.hidden = true; NETUI.modal.hidden = true; NETUI.ping.hidden = false;
  document.getElementById('select').style.paddingBottom = '';
  const a = m.a, b = m.b;
  newGame(a[0], b, a.slice(1), false, 1);
  G.player = G.heroes[m.you];
  G.netMine = m.you;
  for (const h of G.heroes) { h.ai = false; h.path = []; h.net = true; }
  for (const u of G.units) NET.ids.set(u.id, u);
  G.t = m.tt || 0;
  Object.defineProperty(G, 'paused', { get: () => false, set: () => { }, configurable: true }); // the world keeps running while a menu is open
  G.cam.x = G.player.x; G.cam.y = G.player.y; G.cam.z = 1;
  NET.serverT = G.t; NET.snapAt = performance.now();
  UI.show(null);
  document.getElementById('hud').hidden = false;
  buildHUD();
  UI.announce('Match start', 'Good luck — three towers and the Ancient stand between you and victory', 'blue');
  SFX.play('horn');
}

/* ---------- snapshots ---------- */
function netUnitById(id) { return NET.ids.get(id) || null; }

function netSnap(m) {
  if (!NET.on || !G) return;
  const now = performance.now();
  NET.snapDt = Math.max(.02, Math.min(.5, (now - NET.snapAt) / 1000));
  NET.snapAt = now;
  NET.serverT = m.tt;
  NET.seq = m.s;

  if (m.sp) for (const d of m.sp) netSpawn(d);
  if (m.rm) for (const id of m.rm) {
    const u = NET.ids.get(id);
    if (u) { u.dead = true; u.gone = true; NET.ids.delete(id); }
  }
  if (m.u) for (const row of m.u) netApplyUnit(row);
  for (const u of G.units) if (u.netAt !== NET.snapAt && u.sx !== undefined) { u.nvx = 0; u.nvy = 0; u.moving = false; }
  if (m.h) for (const row of m.h) netApplyHero(row);
  if (m.me) netApplyMe(m.me);
  if (m.w) netApplyWorld(m.w);
  if (m.p) netApplyProjs(m.p);
  if (m.z) netApplyZones(m.z);
  if (m.ev) for (const e of m.ev) netEvent(e);
  G.units = G.units.filter(u => !u.gone);
}

function netSpawn(d) {
  if (NET.ids.has(d.i)) return;
  const o = {
    kind: d.k, team: d.tm, x: d.x, y: d.y, r: d.r || 16, hp: d.mh || 100, maxHp: d.mh || 100,
    name: d.nm || '', ms: d.ms || 300, range: d.rn || 100, as: 1, power: 10, armor: 0,
  };
  if (d.k === 'minion') Object.assign(o, {
    mtype: d.mt, ranged: !!d.rg, lane: d.ln || 'top', empowered: !!d.emp, pet: !!d.pet,
    lpath: [[d.x, d.y], [d.x, d.y]], wp: 1, prog: 0, slot: 0, gold: 0, xp: 0,
  });
  if (d.k === 'monster') Object.assign(o, { mtype: d.mt, boss: !!d.bo, color: d.co || '#8a7a6a', elem: d.el, leash: 600, home: { x: d.x, y: d.y } });
  const u = new Unit(o);
  u.id = d.i;
  if (d.ow) u.owner = netUnitById(d.ow) || { team: d.tm, x: d.x, y: d.y };
  G.units.push(u);
  NET.ids.set(d.i, u);
  if (d.k === 'minion' && d.pet) { ring(d.x, d.y, d.mt === 'turretT' ? '#ffb347' : '#6fe0a8', 44, .5, 4); }
}

function netApplyUnit(row) {
  const u = NET.ids.get(row[0]);
  if (!u) return;
  const bits = row[5] | 0;
  const x = row[1], y = row[2];
  if (u.sx === undefined) { u.x = x; u.y = y; u.sx = x; u.sy = y; u.nvx = 0; u.nvy = 0; }
  else {
    const dt = Math.max(.03, (NET.snapAt - (u.netAt || NET.snapAt - NET.snapDt * 1000)) / 1000);
    u.nvx = (x - u.sx) / dt; u.nvy = (y - u.sy) / dt;
    if (Math.abs(u.nvx) < 4 && Math.abs(u.nvy) < 4) { u.nvx = 0; u.nvy = 0; }
    u.sx = x; u.sy = y;
  }
  u.netAt = NET.snapAt;
  u.face = (row[3] | 0) / 100;
  const hp = row[4] | 0;
  if (hp < u.hp - 1) u.hitT = .12;
  u.hp = hp;
  const wasDead = u.dead;
  u.dead = !!(bits & 1);
  u.moving = !!(bits & 2);
  u.stealth = (bits & 4) ? .5 : 0;
  u.stunned = !!(bits & 8);
  if (bits & 8) { u.stun = .2; } else u.stun = 0;
  u.empowered = !!(bits & 16);
  u.reset = !!(bits & 32);
  u.netSlowed = !!(bits & 256);
  if (!wasDead && u.dead) netDeathFx(u);
  if (wasDead && !u.dead) { u.deadT = 0; }
  if (u.dead) u.deadT += 1 / 30;
  const tgId = row[6] | 0;
  const tgt = tgId ? NET.ids.get(tgId) : null;
  const windPct = row[7] | 0, swingMs = row[8] | 0, castPct = row[9] | 0, shield = row[10] | 0;
  if (windPct > 0 && tgt) {
    const dur = u.kind === 'hero' ? .26 : .3;
    u.wind = { t: windPct / 100 * dur, dur, tgt };
  } else u.wind = null;
  if (swingMs > 0) {
    if (!u.swing || swingMs / 1000 > u.swing) { if (tgt && !u.ranged && !isStruct(u)) netMeleeFx(u, tgt); }
    u.swing = swingMs / 1000;
  }
  if (castPct > 0) {
    if (!u.casting) u.casting = { t: 0, dur: 1, key: 'Q', ab: null, id: '', r: 1, tx: u.x, ty: u.y };
    u.casting.t = castPct / 100; u.casting.dur = 1;
  } else u.casting = null;
  u.shields = shield > 0 ? [{ a: shield, t: 3 }] : [];
  u.attackTarget = tgt && tgt.team !== u.team ? tgt : null;
}

function netMeleeFx(u, t) {
  const hc = u.kind === 'hero' ? u.def.c1 : u.team < 2 ? TEAMCOL[u.team] : (u.color || '#fff');
  const ang = Math.atan2(t.y - u.y, t.x - u.x);
  u.atkCount = (u.atkCount || 0) + 1;
  if (u.kind === 'hero') heroImpact(u, t, false);
  else part({ kind: 'slash', x: t.x, y: t.y - 6, ang, size: t.r + (u.boss ? 18 : 10), color: hc, w: u.kind === 'monster' ? 8 : 4, life: .24, max: .24, flip: u.atkCount % 2 });
}
function netDeathFx(u) {
  if (u.kind === 'minion' || u.kind === 'monster') burst(u.x, u.y, u.team < 2 ? TEAMCOL[u.team] : (u.color || '#aaa'), u.kind === 'monster' ? 22 : 10, 200, 9, .5);
  if (u.kind === 'hero') { burst(u.x, u.y, '#ff5a48', 30, 300, 12, .8); if (u === G.player) SFX.play('death'); }
}

function netApplyHero(row) {
  const h = NET.ids.get(row[0]);
  if (!h || h.kind !== 'hero') return;
  h.level = row[1] | 0;
  h.hp = row[2] | 0; h.maxHp = row[3] | 0;
  h.mana = row[4] | 0; h.maxMana = row[5] | 0;
  h.k = row[6] | 0; h.dth = row[7] | 0; h.as_ = row[8] | 0; h.cs = row[9] | 0;
  h.respawn = (row[10] | 0) / 10;
  const buffs = row[11] || '', items = row[12] || '';
  h.gold = row[13] | 0;
  const keys = buffs ? buffs.split('|') : [];
  const old = h.buffs; h.buffs = {};
  for (const k of keys) h.buffs[k] = old[k] || { t: 2 };
  h.items = items ? items.split('|') : [];
  if (h !== G.player) { calcStats(h); h.hp = row[2] | 0; h.maxHp = row[3] | 0; h.maxMana = row[5] | 0; }
}

function netApplyMe(me) {
  const p = G.player; if (!p) return;
  p.gold = me.g; p.xp = me.xp; p.pts = me.pts;
  p.items = me.it ? me.it.split('|') : [];
  p.stacks = me.st || {}; p.itemCd = me.ic || {}; p.talents = me.tl || {};
  p.cds = me.cd || p.cds;
  p.amove = me.am ? { x: me.am[0], y: me.am[1] } : null;
  p.hold = !!me.hd;
  p.channel = me.ch ? { kind: me.ch[0], t: me.ch[1], max: me.ch[2], name: me.ch[3] } : null;
  p.undo = me.un ? [1] : [];
  calcStats(p);
  p.hp = me.hp; p.maxHp = me.mh; p.mana = me.mn; p.maxMana = me.mm;
  p.dead = !!me.dd; p.respawn = me.rs;
  if (!document.getElementById('shop').hidden) renderShop();
  if (!document.getElementById('talents').hidden) renderTalents();
}

function netApplyWorld(w) {
  G.kills = w.k; G.towersLeft = w.tw;
  G.night += (w.n - G.night) * .3;
  G.nightState = w.n > .5;
  w.al.forEach((a, i) => { const A = G.altars[i]; if (!A) return; A.owner = a[0]; A.prog = [a[1] / 10, a[2] / 10]; A.unlock = a[3]; });
  G.relic.up = !!w.rl[0]; G.relic.next = w.rl[1];
  G.voidmaw.next = w.vm[1];
  G.drake.next = w.dk ? w.dk[1] : Infinity;
  G.reveal = w.rv || [0, 0];
  if (w.ov && !NET.overShown) { NET.overShown = true; G.over = true; G.winner = w.wn; UI.endGame(); }
}

function netApplyProjs(list) {
  G.projs = list.map(r => ({
    id: r[0], x: r[1], y: r[2], style: r[3], color: r[4], team: r[5],
    ang: (r[6] | 0) / 100, w: r[7] || 24, range: r[8] || 0, trav: 0, homing: r[9] ? true : null,
    owner: { team: r[5], kind: 'hero' },
  }));
}
function netApplyZones(list) {
  G.zones = list.map(r => ({
    id: r[0], x: r[1], y: r[2], r: r[3], style: r[4], color: r[5], team: r[6],
    t: r[7] / 10, dur: r[8] / 10, delay: r[9] / 10, owner: { team: r[6] },
    tick: .5, acc: 0, fired: true, ticks: 0,
  }));
}

/* ---------- one-shot events ---------- */
function netEvent(e) {
  switch (e[0]) {
    case 'fx': {           // replay an ability's visuals locally
      const h = NET.ids.get(e[1]); const ab = ABIL[e[2]];
      if (!h || !ab) return;
      try { ab.cast(h, e[3], e[4], e[5] || 1); } catch (err) { }
      break;
    }
    case 'it': {           // an item was used
      const h = NET.ids.get(e[1]);
      if (h) { ring(h.x, h.y, '#f3d892', 60, .4, 4); SFX.play('buy'); }
      break;
    }
    case 'hit': {          // damage numbers for fights involving you
      const src = NET.ids.get(e[1]), tgt = NET.ids.get(e[2]);
      if (!tgt) return;
      const flags = e[4] | 0;
      if (G.player && (src === G.player || tgt === G.player)) {
        const col = tgt === G.player ? '#ff6b5b' : (flags & 4) ? '#ffffff' : (flags & 2) ? '#c9a2ff' : (flags & 1) ? '#ffcf4a' : '#f3e7cf';
        const ty = tgt.y - (tgt.kind === 'hero' || tgt.kind === 'minion' ? unitTop(tgt) * .7 : tgt.r + 12);
        floatText(tgt.x, ty, String(e[3]), (flags & 1) ? '#ffb13a' : col, (flags & 1) ? 28 : (flags & 2) ? 18 : 16, { crit: flags & 1, vy: (flags & 1) ? -90 : -60 });
      }
      break;
    }
    case 'ann': UI.announce(e[1], e[2], e[3] || ''); break;
    case 'fd': addFeedNet(e[1]); break;
    case 'co': { const u = NET.ids.get(e[1]); if (u) floatText(u.x, u.y - 128, e[2], e[3], 13, { vy: -18, label: 1 }); break; }
    case 'gold': { const h = NET.ids.get(e[1]); if (h === G.player) { floatText(h.x, h.y - 60, '+' + e[2], '#ffd24a', 15); SFX.play('coin'); } break; }
    case 'lvl': { const h = NET.ids.get(e[1]); if (h) { ring(h.x, h.y, '#f3d892', 70, .7, 3); burst(h.x, h.y, '#f3d892', 18, 180, 8, .7); if (h === G.player) SFX.play('level'); } break; }
    case 'snd': SFX.play(e[1]); break;
    case 'shk': G.shake = Math.max(G.shake, e[1]); break;
  }
}
function addFeedNet(html) { G.feed.push(html); UI.feed(html); }

/* the frame loop calls update(); online, that becomes a pure viewer step */
const _update = update;
update = dt => { if (NET.on) return netFrame(dt); return _update(dt); };

/* ---------- per-frame client update (no simulation) ---------- */
function netFrame(dt) {
  if (!G) return;
  const age = Math.min(.25, (performance.now() - NET.snapAt) / 1000);
  NET.serverT += dt;
  G.t = NET.serverT;
  if (G.player) predStep(dt);
  for (const u of G.units) {
    if (u.sx === undefined) continue;
    const local = u === G.player;
    if (local && PRED.on) { predCosmetics(u, dt); continue; }
    const ex = Math.min(age, .2);
    const tx = u.sx + (u.nvx || 0) * ex * (local ? 1 : .8);
    const ty = u.sy + (u.nvy || 0) * ex * (local ? 1 : .8);
    const k = Math.min(1, dt * (local ? 22 : 16));
    const bx = u.x, by = u.y;
    u.x += (tx - u.x) * k; u.y += (ty - u.y) * k;
    const moved = Math.hypot(u.x - bx, u.y - by);
    if (moved > .3) { u.anim += moved / 30; u.moving = true; }
    u.hitT -= dt; u.swing = Math.max(0, u.swing - dt);
    if (u.wind) u.wind.t = Math.min(u.wind.dur, u.wind.t + dt);
    if (u.hpLag === undefined || u.hp > u.hpLag) u.hpLag = u.hp; else u.hpLag += (u.hp - u.hpLag) * Math.min(1, dt * 2.2);
    u.bush = -1;
    if (!u.dead && !isStruct(u)) for (let i = 0; i < BUSHES.length; i++) { const b = BUSHES[i]; if (Math.abs(u.x - b.x) < b.r && Math.hypot(u.x - b.x, u.y - b.y) < b.r) { u.bush = i; break; } }
    for (const s of u.slows) s.t -= dt;
    u.slows = u.slows.filter(s => s.t > 0);
  }
  // holding the mouse keeps walking, the way the offline game repeats orders
  if (Input.down && !G.armed && !G.amoveArmed && !G.player.dead) {
    const now = performance.now();
    if (now > (NET.nextRepeat || 0)) { NET.nextRepeat = now + 170; issueOrder(Input.wx, Input.wy, true); }
  }
  // cosmetic timers queued by replayed ability visuals
  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); try { t.fn(); } catch (e) { } } }
  for (const p of G.parts) {
    if (p.kind === 'coin') { updCoin(p, dt); continue; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60); p.vy += p.grav * dt;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= .96; }
  G.texts = G.texts.filter(t => t.life > 0);
  for (const m of G.marks) m.t -= dt;
  G.marks = G.marks.filter(m => m.t > 0);
  for (const z of G.zones) z.t += dt;
  G.shake *= Math.pow(.02, dt);
  computeVision();
  if (NETUI.ping && !NETUI.ping.hidden) NETUI.ping.textContent = `${NET.ping | 0} ms${NET.connected ? '' : ' · offline'}`;
}

/* ---------- local prediction for your own champion ---------- */
function predCosmetics(u, dt) {   // the bookkeeping the interpolator would have done
  u.hitT -= dt; u.swing = Math.max(0, u.swing - dt);
  if (u.wind) u.wind.t = Math.min(u.wind.dur, u.wind.t + dt);
  if (u.hpLag === undefined || u.hp > u.hpLag) u.hpLag = u.hp; else u.hpLag += (u.hp - u.hpLag) * Math.min(1, dt * 2.2);
  u.bush = -1;
  if (!u.dead) for (let i = 0; i < BUSHES.length; i++) { const b = BUSHES[i]; if (Math.abs(u.x - b.x) < b.r && Math.hypot(u.x - b.x, u.y - b.y) < b.r) { u.bush = i; break; } }
}
function predStep(dt) {
  const h = G.player;
  if (!PRED.on || !h || h.sx === undefined) return;
  if (h.dead || h.stunned || h.channel || h.casting) {       // the server owns these moments
    if (h.dead || h.stunned) predStop();
    return;
  }
  const slow = h.netSlowed ? .62 : 1;
  let left = (h.s ? h.s.ms * h.s.msMult : 320) * slow * dt;
  h.moving = false;
  while (left > 0 && PRED.path.length) {
    const p0 = PRED.path[0];
    const dx = p0.x - h.x, dy = p0.y - h.y, d = Math.hypot(dx, dy);
    if (d < 3) { PRED.path.shift(); continue; }
    const step = Math.min(d, left);
    const nx = h.x + dx / d * step, ny = h.y + dy / d * step;
    if (!walk(nx, ny)) { PRED.path = []; break; }
    h.x = nx; h.y = ny; left -= step;
    h.face = Math.atan2(dy, dx); h.moving = true; h.anim += step / 30;
  }
  if (!PRED.path.length) PRED.on = false;
  // reconcile: drift back onto the server's position, or snap if we are far off
  const ex = h.sx - h.x, ey = h.sy - h.y, err = Math.hypot(ex, ey);
  PRED.err = err;
  if (err > 230) { h.x = h.sx; h.y = h.sy; predStop(); }
  else if (err > 3) { const k = Math.min(1, dt * 3.2); h.x += ex * k; h.y += ey * k; }
}

/* ---------- keys and clicks that would otherwise move us locally ---------- */
function netHookInput() {
  addEventListener('keydown', e => {
    if (!NET.on || !G || !G.player || G.over) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (k === 'A') { G.amoveArmed = true; e.stopPropagation(); }
    else if (k === 'H') { netSend({ t: 'in', a: 'hold' }); G.amoveArmed = false; predStop(); e.stopPropagation(); }
    else if (k === 'S') { netSend({ t: 'in', a: 'stop' }); G.amoveArmed = false; predStop(); e.stopPropagation(); }
  }, true);
  const cv2 = document.getElementById('game');
  cv2.addEventListener('pointerdown', e => {
    if (!NET.on || !G || !G.player || !G.amoveArmed) return;
    const r = cv2.getBoundingClientRect();
    Input.sx = e.clientX - r.left; Input.sy = e.clientY - r.top; refreshWorldMouse();
    G.amoveArmed = false;
    netSend({ t: 'in', a: 'amove', x: Math.round(Input.wx), y: Math.round(Input.wy) });
    G.marks.push({ x: Input.wx, y: Input.wy, t: .45, col: '#ff5a48', r: 26 });
    predMoveTo(Input.wx, Input.wy);
    e.stopPropagation();
  }, true);
  // play-again buttons restart the lobby instead of the offline showcase
  for (const id of ['bAgain', 'bRestart']) {
    const b = document.getElementById(id); if (!b) continue;
    const orig = b.onclick;
    b.onclick = () => { if (NET.on) { location.reload(); return; } orig && orig(); };
  }
}

/* ---------- wire the lobby into the existing screens ---------- */
function netHookUI() {
  const lock = document.getElementById('bLock');
  const origLock = lock.onclick;
  lock.onclick = () => {
    if (!NET.room) return origLock && origLock();
    SFX.init(); SFX.play('ui');
    netSend({ t: 'pick', id: UI.selHero });
  };
  const back = document.getElementById('bBack');
  const origBack = back.onclick;
  back.onclick = () => { if (NET.room) { NETUI.bar.hidden = true; document.getElementById('select').style.paddingBottom = ''; NET.room = null; if (NET.ws) NET.ws.close(); } if (origBack) origBack(); };
  // surrender / menu buttons talk to the server in online play
  const sur = document.getElementById('bSurrender');
  const origSur = sur.onclick;
  sur.onclick = () => { if (NET.on) { netSend({ t: 'in', a: 'surrender' }); document.getElementById('pause').hidden = true; G.paused = false; return; } origSur && origSur(); };
}

netInjectUI();
netHookUI();
netHookInput();
