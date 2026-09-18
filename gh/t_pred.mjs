import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://localhost:8080/'); await p.waitForTimeout(1400);
await p.click('#bOnline'); await p.fill('#netName', 'Pred'); await p.click('#netCreate');
await p.waitForSelector('#netBar:not([hidden])');
await p.click('.hcard[data-id="brak"]'); await p.click('#bLock'); await p.waitForTimeout(300);
await p.click('#netStart'); await p.waitForTimeout(2500);

// how quickly does the champion start moving after a click?
const react = await p.evaluate(async () => {
  const h = G.player, out = [];
  for (let k = 0; k < 4; k++) {
    const x0 = h.x, y0 = h.y, t0 = performance.now();
    issueOrder(h.x + (k % 2 ? -420 : 420), h.y + 260, false);
    let moved = -1;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => requestAnimationFrame(r));
      if (Math.hypot(h.x - x0, h.y - y0) > 12) { moved = performance.now() - t0; break; }
    }
    out.push(Math.round(moved));
    await new Promise(r => setTimeout(r, 1400));
  }
  return out;
});
console.log('ms from click to champion moving:', JSON.stringify(react));

// drift between the predicted position and the server's
const drift = await p.evaluate(async () => {
  const h = G.player, samples = [];
  for (let i = 0; i < 40; i++) {
    issueOrder(h.x + (i % 2 ? 300 : -300), h.y + (i % 3 ? 180 : -180), false);
    await new Promise(r => setTimeout(r, 700));
    samples.push(Math.hypot(h.x - h.sx, h.y - h.sy));
  }
  samples.sort((a, b) => a - b);
  return { median: Math.round(samples[20]), worst: Math.round(samples[39]), ping: NET.ping };
});
console.log('prediction drift vs server (px):', JSON.stringify(drift));

// bandwidth with delta snapshots
const bw = await p.evaluate(async () => {
  let n = 0, msgs = 0, rows = 0;
  const ws = NET.ws, orig = ws.onmessage;
  ws.onmessage = e => { n += e.data.length; msgs++; try { const m = JSON.parse(e.data); if (m.u) rows += m.u.length; } catch { } return orig(e); };
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 10000));
  const secs = (performance.now() - t0) / 1000;
  return { kbPerSec: +(n / 1024 / secs).toFixed(1), msgsPerSec: +(msgs / secs).toFixed(1), rowsPerSnap: +(rows / msgs).toFixed(1), units: G.units.length };
});
console.log('traffic:', JSON.stringify(bw));
console.log(errs.length ? 'ERRORS: ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'NO ERRORS');
await b.close();
