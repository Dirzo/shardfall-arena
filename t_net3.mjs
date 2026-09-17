import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const errs = []; const results = [];
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://localhost:8080/'); await p.waitForTimeout(1400);
await p.click('#bOnline'); await p.fill('#netName', 'Tester'); await p.click('#netCreate');
await p.waitForSelector('#netBar:not([hidden])');
await p.click('.hcard[data-id="brak"]'); await p.click('#bLock'); await p.waitForTimeout(300);
await p.click('#netStart'); await p.waitForTimeout(2500);
const ok = (name, v) => results.push(`${v ? 'PASS' : 'FAIL'}  ${name}`);

// movement: click a spot and check we travel toward it
const moved = await p.evaluate(async () => {
  const p0 = [G.player.x, G.player.y];
  const w = { x: G.player.x + 600, y: G.player.y };
  netSend({ t: 'in', a: 'order', x: Math.round(w.x), y: Math.round(w.y), r: 0 });
  await new Promise(r => setTimeout(r, 2500));
  return Math.hypot(G.player.x - p0[0], G.player.y - p0[1]);
});
ok(`walks on order (moved ${moved | 0}px)`, moved > 120);

// ability: cast and watch the cooldown + mana
const casted = await p.evaluate(async () => {
  const before = { mana: G.player.mana, cd: G.player.cds.Q };
  netSend({ t: 'in', a: 'cast', k: 'Q', x: Math.round(G.player.x + 150), y: Math.round(G.player.y) });
  await new Promise(r => setTimeout(r, 900));
  return { before, after: { mana: G.player.mana, cd: G.player.cds.Q } };
});
ok(`ability casts (cd ${casted.after.cd}s, mana ${Math.round(casted.before.mana)}→${Math.round(casted.after.mana)})`, casted.after.cd > 0 && casted.after.mana < casted.before.mana);

// hold / stop / attack-move flags round-trip through the server
const flags = await p.evaluate(async () => {
  netSend({ t: 'in', a: 'hold' });
  await new Promise(r => setTimeout(r, 500));
  const hold = !!G.player.hold;
  netSend({ t: 'in', a: 'amove', x: Math.round(G.player.x + 400), y: Math.round(G.player.y + 200) });
  await new Promise(r => setTimeout(r, 500));
  const am = !!G.player.amove;
  netSend({ t: 'in', a: 'stop' });
  await new Promise(r => setTimeout(r, 500));
  return { hold, am, stopped: !G.player.hold && !G.player.amove };
});
ok('hold order', flags.hold); ok('attack-move order', flags.am); ok('stop order', flags.stopped);

// talents: spend a point once we have one
const tal = await p.evaluate(async () => {
  for (let i = 0; i < 90 && !G.player.pts; i++) await new Promise(r => setTimeout(r, 500));
  if (!G.player.pts) return { skipped: true };
  const before = Object.keys(G.player.talents).length;
  netSend({ t: 'in', a: 'learn', id: 'keen' });
  await new Promise(r => setTimeout(r, 700));
  return { before, after: Object.keys(G.player.talents).length, rank: G.player.talents.keen | 0 };
});
ok(`talent learned (rank ${tal.rank || 0})`, tal.skipped ? false : tal.after > tal.before);

// shop: recall home, then buy
const shop = await p.evaluate(async () => {
  netSend({ t: 'in', a: 'recall' });
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 500)); if (atShop(G.player)) break; }
  const home = atShop(G.player), g0 = G.player.gold, n0 = G.player.items.length;
  netSend({ t: 'in', a: 'buy', id: 's_blade' });
  await new Promise(r => setTimeout(r, 500));
  netSend({ t: 'in', a: 'buy', id: 'pot' });
  await new Promise(r => setTimeout(r, 900));
  return { home, g0: Math.round(g0), g1: Math.round(G.player.gold), n0, n1: G.player.items.length, items: G.player.items };
});
ok(`recall reaches the fountain`, shop.home);
ok(`item bought (${shop.items.join(',')} · ${shop.g0}→${shop.g1} gold)`, shop.n1 > shop.n0 && shop.g1 < shop.g0);

// enemy champions are simulated and fighting
const world = await p.evaluate(() => ({
  heroes: G.heroes.length, levels: G.heroes.map(h => h.level), kills: G.kills,
  minions: G.units.filter(u => u.kind === 'minion').length, t: Math.round(G.t),
}));
ok(`match progresses (t=${world.t}s, minions ${world.minions}, levels ${world.levels.join('/')})`, world.t > 30 && world.levels.some(l => l > 1));
console.log(results.join('\n'));
console.log(errs.length ? 'ERRORS: ' + [...new Set(errs)].slice(0, 6).join(' | ') : 'NO ERRORS');
await b.close();
