import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';

const URL = process.env.URL || 'http://localhost:8080/';
const SECONDS = +(process.env.SECS || 25);
const b = await chromium.launch();
const errs = [];
async function client(tag, hero) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => errs.push(`[${tag}] ${e.message} :: ${(e.stack || '').split('\n')[1] || ''}`));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errs.push(`[${tag}] console: ${m.text().slice(0, 200)}`); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.click('#bOnline');
  await p.fill('#netName', tag);
  return { p, tag, hero };
}

const A = await client('Alice', 'kael');
const B = await client('Bob', 'sylv');
const C = await client('Cara', 'tink');

await A.p.click('#netCreate');
await A.p.waitForSelector('#netBar:not([hidden])', { timeout: 8000 });
const code = (await A.p.textContent('#netRoomCode')).trim();
console.log('room code', code);

for (const c of [B, C]) {
  await c.p.fill('#netCode', code);
  await c.p.click('#netJoin');
  await c.p.waitForSelector('#netBar:not([hidden])', { timeout: 8000 });
}
// team check: Bob should land on the other team, Cara back on Alice's
for (const c of [A, B, C]) {
  await c.p.click(`.hcard[data-id="${c.hero}"]`);
  await c.p.waitForTimeout(250);
  await c.p.click('#bLock');
  await c.p.waitForTimeout(250);
}
const lobby = await A.p.evaluate(() => NET.room.slots.map(s => (s.open ? 'ai' : s.name + ':' + s.heroId)));
console.log('lobby', JSON.stringify(lobby));

await A.p.click('#netStart');
await A.p.waitForTimeout(2500);
for (const c of [A, B, C]) {
  const st = await c.p.evaluate(() => ({ on: NET.on, hero: G.player && G.player.def.id, team: G.player && G.player.team, units: G.units.length }));
  console.log(c.tag, JSON.stringify(st));
}

// play: each client issues some orders and casts
async function act(c) {
  const box = await c.p.$('#game');
  const size = { w: 1280, h: 720 };
  for (const [x, y] of [[700, 400], [500, 300], [800, 500]]) {
    await c.p.mouse.click(x, y);
    await c.p.waitForTimeout(400);
  }
  for (const k of ['Q', 'W', 'E']) { await c.p.keyboard.press(k); await c.p.waitForTimeout(350); }
  await c.p.keyboard.press('A'); await c.p.mouse.click(760, 420);
}
const t0 = Date.now();
await Promise.all([act(A), act(B), act(C)]);
while (Date.now() - t0 < SECONDS * 1000) {
  await A.p.waitForTimeout(2000);
  await Promise.all([A, B, C].map(c => c.p.mouse.click(600 + Math.random() * 300 | 0, 300 + Math.random() * 200 | 0)));
}

for (const c of [A, B, C]) {
  const st = await c.p.evaluate(() => {
    const p = G.player;
    const moving = G.units.filter(u => Math.abs(u.nvx || 0) + Math.abs(u.nvy || 0) > 5).length;
    return {
      t: Math.round(G.t), ping: NET.ping, seq: NET.seq, units: G.units.length, moving,
      hero: p.def.id, level: p.level, gold: Math.round(p.gold), hp: Math.round(p.hp), items: p.items.length,
      cs: p.cs, k: p.k, d: p.dth, parts: G.parts.length, projs: G.projs.length, zones: G.zones.length,
      pos: [Math.round(p.x), Math.round(p.y)],
    };
  });
  console.log(c.tag, JSON.stringify(st));
  await c.p.screenshot({ path: `net_${c.tag}.png` });
}
// desync check: compare positions of a few units across clients
const snap = c => c.p.evaluate(() => G.units.slice(0, 12).map(u => [u.id, Math.round(u.x), Math.round(u.y), Math.round(u.hp)]));
const [sa, sb] = await Promise.all([snap(A), snap(B)]);
let maxd = 0;
for (const r of sa) { const o = sb.find(x => x[0] === r[0]); if (o) maxd = Math.max(maxd, Math.hypot(r[1] - o[1], r[2] - o[2])); }
console.log('max position spread between clients:', maxd.toFixed(0), 'px');
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n') : 'NO ERRORS');
await b.close();
