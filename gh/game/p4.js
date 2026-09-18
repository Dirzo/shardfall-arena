
/* =========================================================
   ABILITIES
   ========================================================= */
const pw = p => `${Math.round(p * 100)}% power`;
function dirTo(h, tx, ty) { const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; }
function clampPt(h, tx, ty, range) { const [dx, dy, d] = dirTo(h, tx, ty); const k = Math.min(d, range); return [h.x + dx * k, h.y + dy * k]; }
function foes(team, x, y, r, o = {}) {
  return G.units.filter(u => !u.dead && u.team !== team && !u.reset && (o.structs || !isStruct(u)) && (!o.heroes || u.kind === 'hero') && Math.hypot(u.x - x, u.y - y) <= r + u.r);
}
function friends(team, x, y, r) { return G.heroes.filter(u => !u.dead && u.team === team && Math.hypot(u.x - x, u.y - y) <= r + u.r); }
function lead(h, t, speed) { // predictive aim
  const d = dist(h, t), tt = d / speed; const v = t.vel || { x: 0, y: 0 };
  return { x: t.x + v.x * tt * .8, y: t.y + v.y * tt * .8 };
}
function dashU(u, tx, ty, speed, o = {}) {
  const [dx, dy, d] = dirTo(u, tx, ty);
  u.dash = { dx, dy, left: d, speed, hit: new Set(), ...o };
  u.path = []; u.channel = null; u.face = Math.atan2(dy, dx);
}
function skillshot(h, tx, ty, o) {
  const [dx, dy] = dirTo(h, tx, ty);
  G.projs.push(Object.assign({ x: h.x + dx * 20, y: h.y + dy * 20, vx: dx * o.speed, vy: dy * o.speed, owner: h, team: h.team, trav: 0, hit: new Set(), w: 28, pierce: false, style: 'bolt', color: h.def.c1 }, o));
  h.face = Math.atan2(dy, dx);
}
function zone(o) { G.zones.push(Object.assign({ t: 0, delay: 0, tick: .5, acc: 0, fired: false, ticks: 0 }, o)); }

const ABIL = {
  /* ---- Kaelthorn ---- */
  bash: { name: 'Shield Bash', icon: 'bash', cd: [9, 8.5, 8, 7.5, 7], mana: 45, range: 340, type: 'dir', moves: true,
    desc: r => `Charge forward. The first enemy struck takes ${40 + 30 * r} (+${pw(.8)}) damage and is stunned for 0.9s.`,
    cast(h, tx, ty, r) {
      const cap = hasCap(h, 0), dmg = (40 + 30 * r + .8 * h.power) * (cap ? 1.5 : 1);
      const [x, y] = clampPt(h, tx, ty, 340);
      dashU(h, x, y, 1150, { onPass: u => { damage(h, u, dmg, { abil: 1 }); stunU(u, .9 + (cap ? .5 : 0)); burst(u.x, u.y, '#ffd27a', 16, 260, 10); G.shake = Math.max(G.shake, u === G.player || h === G.player ? 6 : 0); SFX.play('hit'); return 'stop'; }, trail: '#f0b453' });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 330 ? t : null },
  bulwark: { name: 'Iron Bulwark', icon: 'shield', cd: [14, 13, 12, 11, 10], mana: 50, type: 'self',
    desc: r => `Raise your shield: gain a ${40 + 40 * r} (+6% max health) shield for 3s.`,
    cast(h, tx, ty, r) {
      const amt = 40 + 40 * r + h.maxHp * .06; shieldU(h, amt, 3); ring(h.x, h.y, '#f3d892', 60, .5, 5);
      if (hasCap(h, 1)) friends(h.team, h.x, h.y, 500).forEach(a => { if (a !== h) { shieldU(a, amt * .5, 3); ring(a.x, a.y, '#f3d892', 45); } });
    },
    ai: (h, t, m) => (m === 'fight' || m === 'flee') && G.t - h.lastHurt < 1 && h.hp / h.maxHp < .85 ? h : null },
  shatter: { name: 'Earthshatter', icon: 'quake', cd: [8, 7.5, 7, 6.5, 6], mana: 40, range: 250, type: 'self', farm: true,
    desc: r => `Slam the ground, dealing ${30 + 30 * r} (+${pw(.6)}) damage around you and slowing by 40% for 1.5s.`,
    cast(h, tx, ty, r) {
      const dmg = 30 + 30 * r + .6 * h.power;
      after(.12, () => {
        if (h.dead) return;
        foes(h.team, h.x, h.y, 250).forEach(u => { damage(h, u, dmg, { abil: 1 }); slowU(u, .4, 1.5); });
        ring(h.x, h.y, '#e0a74a', 250, .5, 8); burst(h.x, h.y, '#b58a4a', 26, 320, 12, .6); G.shake = Math.max(G.shake, h === G.player ? 7 : 0);
        if (hasCap(h, 2)) zone({ x: h.x, y: h.y, r: 250, dur: 3, owner: h, team: h.team, style: 'quake', color: '#e0a74a', onTick: z => foes(h.team, z.x, z.y, z.r).forEach(u => { damage(h, u, (10 + 8 * r + .15 * h.power), { abil: 1 }); slowU(u, .25, .6); }) });
      });
    },
    ai: (h, t, m) => (m === 'fight' && dist(h, t) < 230) || (m === 'farm' && foes(h.team, h.x, h.y, 230).length >= 3) ? h : null },
  titanfall: { name: "Titan's Fall", icon: 'leap', cd: [70, 62, 55], mana: 100, range: 650, type: 'point', aoe: 300, moves: true,
    desc: r => `Leap to a location. On landing, deal ${100 * r + 100} (+${pw(1)}) damage in a wide area and knock enemies airborne for 1s.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 650); const p = nearestWalkable(x, y);
      dashU(h, p.x, p.y, Math.max(600, dist(h, p) / .55), { arc: 90, ghost: true, onEnd: () => {
        foes(h.team, h.x, h.y, 300).forEach(u => { damage(h, u, 100 + 100 * r + h.power, { abil: 1 }); knockU(u, 1); });
        ring(h.x, h.y, '#ffd27a', 300, .7, 10); ring(h.x, h.y, '#ffffff', 200, .4, 4); burst(h.x, h.y, '#f0b453', 50, 500, 16, .9);
        G.shake = Math.max(G.shake, 16); SFX.play('boom');
      } });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 600 && (t.hp / t.maxHp < .7 || foes(h.team, t.x, t.y, 300, { heroes: 1 }).length >= 2) ? t : null },

  /* ---- Vesper ---- */
  arcbolt: { name: 'Arc Bolt', icon: 'bolt', cd: [5, 5, 4.5, 4.5, 4], mana: 40, range: 950, type: 'dir', farm: true,
    desc: r => `Hurl a bolt of lightning that deals ${35 + 38 * r} (+${pw(.8)}) damage to the first enemy hit.`,
    cast(h, tx, ty, r) {
      const dmg = 35 + 38 * r + .8 * h.power;
      const base = Math.atan2(ty - h.y, tx - h.x);
      const angs = hasCap(h, 0) ? [base - .22, base, base + .22] : [base];
      for (const a of angs) skillshot(h, h.x + Math.cos(a) * 100, h.y + Math.sin(a) * 100, { speed: 1250, range: 950, w: 30, style: 'bolt', color: '#8fd0ff', onHit: u => { damage(h, u, dmg, { abil: 1 }); burst(u.x, u.y, '#bfe6ff', 12, 200, 8); } });
      SFX.play('zap');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 880 ? lead(h, t, 1250) : null },
  static: { name: 'Static Field', icon: 'field', cd: [10, 9.5, 9, 8.5, 8], mana: 60, range: 800, type: 'point', aoe: 190, farm: true,
    desc: r => `Charge an area. After 0.5s it discharges 3 times, each dealing ${20 + 20 * r} (+${pw(.35)}) damage and slowing 25%.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 800);
      zone({ x, y, r: 190, dur: 2, delay: .5, owner: h, team: h.team, style: 'static', color: '#8fd0ff', tick: .5, maxTicks: 3,
        onTick: z => {
          const hit = foes(h.team, z.x, z.y, z.r);
          hit.forEach(u => { damage(h, u, 20 + 20 * r + .35 * h.power, { abil: 1 }); slowU(u, .25, .6); zap(z.x + rnd(-40, 40), z.y - 200, u.x, u.y); });
          if (hasCap(h, 1) && hit.length) shieldU(h, Math.min(150, 30 * hit.length), 2);
          SFX.play('zap');
        } });
    },
    ai: (h, t, m) => (m === 'fight' && dist(h, t) < 780) ? lead(h, t, 1400) : (m === 'farm' ? farmSpot(h, 780, 190) : null) },
  blink: { name: 'Blink', icon: 'blink', cd: [16, 15, 14, 13, 12], mana: 50, range: 450, type: 'point', moves: true,
    desc: () => 'Teleport a short distance, passing over walls.',
    cast(h, tx, ty) { blinkTo(h, tx, ty, 450, '#8fd0ff'); },
    ai: (h, t, m) => m === 'flee' ? FOUNT[h.team] : null },
  tempest: { name: 'Tempest', icon: 'storm', cd: [90, 75, 60], mana: 120, range: 900, type: 'point', aoe: 280,
    desc: r => `Summon a storm for 3s. Enemies inside take ${26 * r + 28} (+${pw(.28)}) damage every 0.5s and are slowed 30%.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 900); const cap = hasCap(h, 2);
      zone({ x, y, r: cap ? 392 : 280, dur: cap ? 4 : 3, owner: h, team: h.team, style: 'tempest', color: '#8fd0ff', tick: .5,
        onTick: z => { const hit = foes(h.team, z.x, z.y, z.r); hit.forEach(u => { damage(h, u, 28 + 26 * r + .28 * h.power, { abil: 1 }); slowU(u, .3, .6); });
          if (hit.length) { const u = pick(hit); zap(u.x + rnd(-30, 30), u.y - 400, u.x, u.y, true); } SFX.play('zap'); } });
      SFX.play('boom');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 850 ? t : null },

  /* ---- Nyxra ---- */
  shadowstep: { name: 'Shadowstep', icon: 'dagger', cd: [7, 6.5, 6, 5.5, 5], mana: 35, range: 380, type: 'dir', moves: true, farm: true,
    desc: r => `Dash through enemies, dealing ${40 + 38 * r} (+${pw(.95)}) damage to each.`,
    cast(h, tx, ty, r) {
      const dmg = 40 + 38 * r + .95 * h.power; const [x, y] = clampPt(h, tx, ty, 380);
      dashU(h, x, y, 1450, { trail: '#b36bff', onPass: u => { damage(h, u, dmg, { abil: 1 }); burst(u.x, u.y, '#b36bff', 10, 200, 8); } });
      if (hasCap(h, 2)) { if (h.buffs.twin) { delete h.buffs.twin; } else { buff(h, 'twin', 3); return 'recast'; } }
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 360 ? { x: t.x + (t.x - h.x) * .3, y: t.y + (t.y - h.y) * .3 } : null },
  venom: { name: 'Venom Blades', icon: 'venom', cd: [12, 12, 11, 11, 10], mana: 40, type: 'self', keepStealth: true,
    desc: r => `For 5s gain ${20 + 10 * r}% attack speed and your attacks poison for ${8 + 6 * r} (+${pw(.12)}) damage per second.`,
    cast(h, tx, ty, r) { buff(h, 'venom', 5, { v: .2 + .1 * r, dps: 8 + 6 * r + .12 * h.power }); burst(h.x, h.y, '#7dff6a', 12, 120, 8); },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 260 ? h : null },
  veil: { name: 'Veil', icon: 'veil', cd: [16, 15, 14, 13, 12], mana: 60, type: 'self', keepStealth: true,
    desc: () => 'Vanish for 1.5s and gain 40% move speed. Your first attack out of the veil deals 50% more damage.',
    cast(h) {
      const d = hasCap(h, 1) ? 3 : 1.5; h.stealth = d; buff(h, 'veil', d); h.ambush = G.t + d + 1;
      if (hasCap(h, 1)) heal(h, h.maxHp * .1);
      burst(h.x, h.y, '#6a3dbd', 24, 160, 16, .8);
    },
    ai: (h, t, m) => m === 'flee' || (m === 'fight' && dist(h, t) > 250 && dist(h, t) < 550) ? h : null },
  deathmark: { name: 'Death Mark', icon: 'skull', cd: [60, 52, 45], mana: 100, range: 550, type: 'unit',
    desc: r => `Blink behind an enemy champion and strike for ${100 + 100 * r} (+${pw(1.2)}) damage plus 25% of their missing health.`,
    cast(h, tx, ty, r) {
      const cands = foes(h.team, h.x, h.y, 550, { heroes: 1 }).filter(u => u.vis[h.team]);
      if (!cands.length) return false;
      cands.sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty));
      const u = cands[0]; const [dx, dy] = dirTo(h, u.x, u.y);
      const p = nearestWalkable(u.x + dx * (u.r + 30), u.y + dy * (u.r + 30));
      burst(h.x, h.y, '#6a3dbd', 20, 200, 14); h.x = p.x; h.y = p.y; h.face = Math.atan2(u.y - h.y, u.x - h.x);
      h.lastMark = { t: G.t, u };
      after(.12, () => {
        if (h.dead || u.dead) return;
        damage(h, u, 100 + 100 * r + 1.2 * h.power, { abil: 1 }); damage(h, u, (u.maxHp - u.hp) * .25, { abil: 1, true: 1 });
        burst(u.x, u.y, '#e9c2ff', 40, 380, 14, .8); ring(u.x, u.y, '#b36bff', 120, .5, 6); G.shake = Math.max(G.shake, 10); SFX.play('boom');
      });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 540 && (t.hp / t.maxHp < .6 || h.huntT === t) ? t : null },

  /* ---- Oryn ---- */
  snare: { name: 'Thorn Snare', icon: 'thorn', cd: [10, 9.5, 9, 8.5, 8], mana: 45, range: 850, type: 'dir',
    desc: r => `Fling a seed that bursts into thorns on the first enemy hit: ${55 + 45 * r} (+${pw(.8)}) damage and root for 1.4s.`,
    cast(h, tx, ty, r) {
      const cap = hasCap(h, 0);
      skillshot(h, tx, ty, { speed: 1000, range: 850, w: 30, style: 'thorn', color: '#8aff7a', onHit: u => { damage(h, u, (55 + 45 * r + .8 * h.power) * (cap ? 1.6 : 1), { abil: 1 }); rootU(u, 1.4 + (cap ? .6 : 0)); u.rootFx = G.t; burst(u.x, u.y, '#5ad24a', 16, 160, 9); } });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 820 ? lead(h, t, 1000) : null },
  rejuv: { name: 'Rejuvenate', icon: 'heal', cd: [10, 9.5, 9, 8.5, 8], mana: 55, type: 'self', aoe: 450,
    desc: r => `Heal yourself and nearby allied champions for ${50 + 35 * r} (+${pw(.6)}) and shield them for 40% as much. Thorns burst from you, dealing ${40 + 30 * r} (+${pw(.5)}) damage to enemies within 300.`,
    cast(h, tx, ty, r) {
      const cap = hasCap(h, 1);
      friends(h.team, h.x, h.y, 450).forEach(a => { const amt = (50 + 35 * r + .6 * h.power) * (cap ? 1.4 : 1); heal(a, amt, h); shieldU(a, amt * .4, 4); if (cap) { a.slows = []; a.root = 0; } burst(a.x, a.y, '#9dff8a', 14, 120, 10, .8); ring(a.x, a.y, '#9dff8a', 50); });
      foes(h.team, h.x, h.y, 300).forEach(u => { damage(h, u, 40 + 30 * r + .5 * h.power, { abil: 1 }); burst(u.x, u.y, '#5ad24a', 8, 160, 7); });
      ring(h.x, h.y, '#9dff8a', 450, .6, 3); ring(h.x, h.y, '#5ad24a', 300, .4, 5);
    },
    ai: (h, t, m) => friends(h.team, h.x, h.y, 450).some(a => a.hp / a.maxHp < .7) || (m === 'fight' && dist(h, t) < 290) ? h : null },
  wild: { name: 'Wild Growth', icon: 'wind', cd: [14, 13.5, 13, 12.5, 12], mana: 40, type: 'self', aoe: 450,
    desc: r => `You and nearby allied champions gain 30% move speed and a ${30 + 20 * r} (+${pw(.25)}) shield for 2.5s.`,
    cast(h, tx, ty, r) { friends(h.team, h.x, h.y, 450).forEach(a => { buff(a, 'wild', 2.5); shieldU(a, (30 + 20 * r + .25 * h.power) * (hasCap(h, 2) ? 2 : 1), 2.5); burst(a.x, a.y, '#c8ff9a', 10, 150, 7); }); },
    ai: (h, t, m) => m === 'flee' || (m === 'fight' && dist(h, t) > h.range) ? h : null },
  sanctuary: { name: 'Sanctuary', icon: 'sanct', cd: [90, 75, 60], mana: 120, range: 700, type: 'point', aoe: 320,
    desc: r => `Grow a grove for 4s. Allies inside heal ${15 + 15 * r} (+${pw(.15)}) every 0.5s and take 25% less damage. Enemies inside are slowed 30% and take ${10 + 10 * r} (+${pw(.1)}) damage every 0.5s.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 700);
      zone({ x, y, r: 320, dur: 4, owner: h, team: h.team, style: 'sanct', color: '#9dff8a', tick: .5,
        onTick: z => { friends(h.team, z.x, z.y, z.r).forEach(a => { heal(a, 15 + 15 * r + .15 * h.power, h); buff(a, 'sanct', .6); }); foes(h.team, z.x, z.y, z.r).forEach(u => { slowU(u, .3, .6); damage(h, u, 10 + 10 * r + .1 * h.power, { abil: 1, dot: 1 }); }); } });
    },
    ai: (h, t, m) => m === 'fight' && friends(h.team, h.x, h.y, 600).some(a => a.hp / a.maxHp < .55) ? h : null },

  /* ---- Brakka ---- */
  cleave: { name: 'Cleave', icon: 'axe', cd: [6, 6, 5.5, 5.5, 5], mana: 30, range: 270, type: 'dir', farm: true,
    desc: r => `Swing in a wide arc for ${40 + 40 * r} (+${pw(1)}) damage. Heal for 15% of damage dealt.`,
    cast(h, tx, ty, r) {
      const a0 = Math.atan2(ty - h.y, tx - h.x); h.face = a0; h.swing = .35; h.cleaveFx = { a: a0, t: G.t };
      let tot = 0;
      foes(h.team, h.x, h.y, 270).forEach(u => {
        if (Math.abs(angDiff(a0, Math.atan2(u.y - h.y, u.x - h.x))) > 1.05) return;
        const d = damage(h, u, 40 + 40 * r + h.power, { abil: 1 }); tot += d;
        if (hasCap(h, 0)) u.dots.push({ src: h, dps: d * .4 / 3, t: 3, acc: 0, col: '#ff3a3a' });
        burst(u.x, u.y, '#ff6a3d', 8, 180, 8);
      });
      heal(h, tot * .15); SFX.play('hit');
    },
    ai: (h, t, m) => (m === 'fight' && dist(h, t) < 250) ? t : (m === 'farm' && foes(h.team, h.x, h.y, 250).length >= 2 ? farmSpot(h, 250, 150) : null) },
  warcry: { name: 'War Cry', icon: 'horn', cd: [16, 15, 14, 13, 12], mana: 50, type: 'self', aoe: 500,
    desc: () => 'Rally nearby allied champions: +40% attack speed and +20% move speed for 4s.',
    cast(h) { friends(h.team, h.x, h.y, 500).forEach(a => { buff(a, 'warcry', 4); ring(a.x, a.y, '#ff6a3d', 50); }); ring(h.x, h.y, '#ff6a3d', 500, .6, 4); SFX.play('horn2'); },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 450 ? h : null },
  hook: { name: 'Chain Hook', icon: 'hook', cd: [14, 13.5, 13, 12.5, 12], mana: 60, range: 700, type: 'dir',
    desc: r => `Throw a hook. The first enemy hit takes ${30 + 30 * r} (+${pw(.6)}) damage, is dragged to you and stunned 0.5s.`,
    cast(h, tx, ty, r) {
      const cap = hasCap(h, 2);
      skillshot(h, tx, ty, { speed: 1400, range: cap ? 980 : 700, w: 34, style: 'hook', color: '#ffb070', onHit: u => {
        damage(h, u, 30 + 30 * r + .6 * h.power, { abil: 1 }); stunU(u, cap ? 1 : .5);
        if (!ccImmune(u) && u.kind !== 'tower') { const [dx, dy] = dirTo(h, u.x, u.y); const tx2 = h.x + dx * (h.r + u.r + 10), ty2 = h.y + dy * (h.r + u.r + 10); dashU(u, tx2, ty2, 1600, { self: false }); }
        SFX.play('hit');
      } });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) > 220 && dist(h, t) < 680 ? lead(h, t, 1400) : null },
  bloodrage: { name: 'Bloodrage', icon: 'flame', cd: [80, 70, 60], mana: 80, type: 'self', keepStealth: true,
    desc: r => `Grow in size for 8s, gaining 30% lifesteal and dealing 30% more damage.`,
    cast(h) { buff(h, 'rage', 8); burst(h.x, h.y, '#ff3a2a', 40, 300, 14, 1); ring(h.x, h.y, '#ff3a2a', 120, .6, 8); SFX.play('horn2'); },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 300 ? h : null },

  /* ---- Sylvane ---- */
  pierce: { name: 'Piercing Arrow', icon: 'arrow', cd: [7, 6.5, 6, 5.5, 5], mana: 40, range: 1000, type: 'dir', farm: true,
    desc: r => `Loose an arrow that pierces all enemies in a line for ${35 + 35 * r} (+${pw(1)}) damage, 15% less per target.`,
    cast(h, tx, ty, r) {
      let n = 0;
      skillshot(h, tx, ty, { speed: 1700, range: 1000, w: 26, pierce: true, style: 'arrow', color: '#bffff0', onHit: u => { damage(h, u, (35 + 35 * r + 1 * h.power) * Math.max(.4, 1 - .15 * n++), { abil: 1 }); burst(u.x, u.y, '#bffff0', 6, 160, 7); } });
      SFX.play('bow');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 950 ? lead(h, t, 1700) : (m === 'farm' ? farmSpot(h, 800, 60) : null) },
  volley: { name: 'Volley', icon: 'volley', cd: [10, 9.5, 9, 8.5, 8], mana: 50, range: 700, type: 'dir', farm: true,
    desc: r => `Fire 7 arrows in a cone. Each enemy hit takes ${20 + 20 * r} (+${pw(.5)}) damage and is slowed 20%.`,
    cast(h, tx, ty, r) {
      const a0 = Math.atan2(ty - h.y, tx - h.x);
      const fire = () => { if (h.dead) return; const hs = new Set(); for (let i = -3; i <= 3; i++) { const a = a0 + i * .15; skillshot(h, h.x + Math.cos(a) * 100, h.y + Math.sin(a) * 100, { speed: 1300, range: 700, w: 18, style: 'arrow', color: '#bffff0', hit: hs, onHit: u => { damage(h, u, 20 + 20 * r + .5 * h.power, { abil: 1 }); slowU(u, .2, 1); } }); } SFX.play('bow'); };
      fire(); if (hasCap(h, 2)) after(.3, fire);
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 650 ? t : (m === 'farm' ? farmSpot(h, 600, 100) : null) },
  tumble: { name: 'Tumble', icon: 'tumble', cd: [13, 12, 11, 10, 9], mana: 30, range: 300, type: 'point', moves: true,
    desc: r => `Roll a short distance. Your next attack within 4s deals ${20 + 20 * r} (+${pw(.5)}) bonus damage.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 300);
      dashU(h, x, y, 1100, { trail: '#8ff0e0' }); buff(h, 'tumble', 4, { v: 20 + 20 * r + .5 * h.power });
      if (hasCap(h, 1)) buff(h, 'tumbleDR', 2);
    },
    ai: (h, t, m) => m === 'flee' ? FOUNT[h.team] : (m === 'fight' && t.ranged === false && dist(h, t) < 220 ? { x: h.x * 2 - t.x, y: h.y * 2 - t.y } : null) },
  barrage: { name: "Hunter's Barrage", icon: 'barrage', cd: [80, 70, 60], mana: 100, range: 2600, type: 'dir',
    desc: r => `Fire an enchanted arrow across the map. The first enemy champion hit takes ${110 * r + 125} (+${pw(1.3)}) damage and is stunned 1s.`,
    cast(h, tx, ty, r) {
      skillshot(h, tx, ty, { speed: 1800, range: 2600, w: 48, style: 'bigarrow', color: '#8ff0e0', heroesOnly: true, onHit: u => {
        damage(h, u, 125 + 110 * r + 1.3 * h.power, { abil: 1 }); stunU(u, 1); burst(u.x, u.y, '#dffff8', 40, 400, 12, .8); ring(u.x, u.y, '#8ff0e0', 140, .5, 6); G.shake = Math.max(G.shake, 8); SFX.play('boom');
      } });
      SFX.play('bow');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 1400 && t.hp / t.maxHp < .55 ? lead(h, t, 1800) : null },
};
const SPELLS = {
  D: { name: 'Blink', icon: 'blink', cd: 70, desc: 'Teleport up to 420 units toward the cursor, over walls.' },
  F: { name: 'Mend', icon: 'heal', cd: 100, desc: 'Heal for 80 + 20 per level and gain 25% move speed for 1.5s.' },
};

function blinkTo(h, tx, ty, range, col) {
  const [x, y] = clampPt(h, tx, ty, range);
  const p = nearestWalkable(x, y);
  burst(h.x, h.y, col, 18, 200, 10, .5); ring(h.x, h.y, col, 50, .4);
  h.x = p.x; h.y = p.y; h.path = []; h.dash = null;
  burst(h.x, h.y, col, 18, 200, 10, .5); ring(h.x, h.y, col, 60, .4);
  SFX.play('blink');
}
function zap(x1, y1, x2, y2, big) { part({ kind: 'zap', x: x1, y: y1, x2, y2, life: big ? .3 : .18, max: big ? .3 : .18, color: '#bfe6ff', w: big ? 4 : 2, add: true }); }
function farmSpot(h, range, rad) {
  const mins = foes(h.team, h.x, h.y, range).filter(u => u.kind === 'minion');
  if (mins.length < 3 || h.mana / h.maxMana < .5) return null;
  let best = null, bn = 0;
  for (const m of mins) { const n = mins.filter(o => Math.hypot(o.x - m.x, o.y - m.y) < rad + 30).length; if (n > bn) { bn = n; best = m; } }
  return bn >= 3 ? best : null;
}

// hit-area shapes used for cast indicators (all champions) and the player's aim preview
const SHAPE = {
  bash: { s: 'line', w: 56 }, shatter: { s: 'circle', r: 250, self: 1, ct: .2 }, titanfall: { s: 'circle', r: 300 },
  arcbolt: { s: 'line', w: 30 }, static: { s: 'circle', r: 190 }, blink: { s: 'circle', r: 36 }, tempest: { s: 'circle', r: 280 },
  shadowstep: { s: 'line', w: 56 }, snare: { s: 'line', w: 30 }, rejuv: { s: 'circle', r: 450, self: 1 }, wild: { s: 'circle', r: 450, self: 1 },
  sanctuary: { s: 'circle', r: 320 }, cleave: { s: 'cone', arc: 1.05, len: 270, ct: .22 }, warcry: { s: 'circle', r: 500, self: 1, ct: .15 },
  hook: { s: 'line', w: 34, ct: .3 }, pierce: { s: 'line', w: 26 }, volley: { s: 'cone', arc: .5, len: 700 }, tumble: { s: 'circle', r: 36 },
  barrage: { s: 'line', w: 48, ct: .5 }, bloodrage: { ct: .15 },
};
function castTick(h, dt) {
  const c = h.casting; c.t += dt;
  if (c.ab.type !== 'self') h.face = Math.atan2(c.ty - h.y, c.tx - h.x);
  if (c.t < c.dur) return;
  h.casting = null;
  const res = c.ab.cast(h, c.tx, c.ty, c.r);
  if (res === 'recast') h.cds[c.key] = .35;
  part({ x: h.x + Math.cos(h.face) * 26, y: h.y + Math.sin(h.face) * 26 - 6, color: h.def.c1, size: 34, life: .2, max: .2 });
}
function cast(h, key, tx, ty) {
  if (h.dead || h.stun > 0 || h.kup > 0 || G.over || h.stasis > G.t) return false;
  if (h.casting || (h.dash && key !== 'F')) { if (!h.ai) h.queued = { key, tx, ty, until: G.t + .45 }; return false; }
  if (h.cds[key] > 0) return false;
  if (key === 'D' || key === 'F') {
    const cd = SPELLS[key].cd * (h.s.quicken ? .7 : 1);
    if (key === 'D') { if (h.root > 0) return false; blinkTo(h, tx, ty, 420, '#f3d892'); }
    else { heal(h, 80 + 20 * h.level, h); buff(h, 'mend', 1.5); burst(h.x, h.y, '#7dff9a', 20, 160, 10, .8); SFX.play('heal'); }
    h.cds[key] = cd; h.channel = null; return true;
  }
  const id = h.def.ab[key], ab = ABIL[id]; const r = rank(h, key);
  if (!r) return false;
  if (h.mana < ab.mana) { if (h === G.player) UI.toast('Not enough mana'); return false; }
  if (h.dash && ab.moves) return false;
  if (h.root > 0 && ab.moves) return false;
  const sh = SHAPE[id] || {};
  const ct = sh.ct ?? (ab.type === 'self' || ab.type === 'unit' || ab.type === 'ally' ? 0 : key === 'R' ? .4 : ab.moves ? .14 : .26);
  let res;
  h.wind = null;
  if (ct > 0) { h.casting = { key, ab, id, r, tx, ty, t: 0, dur: ct }; if (ab.type !== 'self') h.face = Math.atan2(ty - h.y, tx - h.x); }
  else {
    res = ab.cast(h, tx, ty, r);
    if (res === false) { if (h === G.player) UI.toast('No champion in range'); return false; }
  }
  h.castLabel = { name: ab.name, t: G.t, dur: ct + .8 };
  h.mana -= ab.mana;
  h.cds[key] = res === 'recast' ? .35 : ab.cd[r - 1] * (1 - h.s.cdr);
  if (h.s.echo && key !== 'R' && Math.random() < .2) { h.cds[key] = .3; if (h === G.player) floatText(h.x, h.y - 50, 'Echo!', '#c9a2ff', 18); }
  if (h.s.spellblade || h.s.itemBlade) h.sblade = G.t + 4;
  if (!ab.keepStealth) reveal(h, .5);
  h.channel = null;
  h.castFx = { t: G.t, col: h.def.c1 };
  if (h === G.player) SFX.play('cast');
  return true;
}

function startRecall(h) {
  if (h.dead || h.channel) return;
  h.channel = { kind: 'recall', t: 0, max: 4.5, name: 'Recalling' }; h.path = []; h.attackTarget = null;
}

/* =========================================================
   AI
   ========================================================= */
function aiSpendTalents(h) {
  const role = h.def.role[0];
  const order = { Vanguard: [1, 0, 2], Support: [1, 2, 0], Mage: [2, 0, 1], Assassin: [0, 2, 1], Fighter: [0, 1, 2], Marksman: [0, 2, 1], Summoner: [2, 1, 0], Specialist: [2, 0, 1], Warden: [1, 2, 0], Duelist: [0, 1, 2] }[role] || [0, 1, 2];
  while (h.pts > 0) {
    let spent = false;
    for (const ti of order) {
      const opts = TREES[ti].nodes.filter(n => canLearn(h, n));
      if (opts.length) { const n = opts.sort((a, b) => (b.tier - a.tier) || (Math.random() - .5))[0]; learn(h, n); spent = true; break; }
    }
    if (!spent) break;
  }
}
function treePoints(h, ti) { let s = 0; for (const n of TREES[ti].nodes) s += h.talents[n.id] | 0; return s; }
function canLearn(h, n) {
  if (h.pts <= 0) return false;
  if ((h.talents[n.id] | 0) >= n.max) return false;
  const need = n.tier === 4 ? 8 : n.tier * 2;
  return treePoints(h, n.tree) >= need;
}
function learn(h, n) {
  if (!canLearn(h, n)) return false;
  h.talents[n.id] = (h.talents[n.id] | 0) + 1; h.pts--; calcStats(h); return true;
}
/* ---------------- shop core (shared by player UI and AI) ---------------- */
const atShop = h => Math.hypot(h.x - FOUNT[h.team].x, h.y - FOUNT[h.team].y) < 320;
const isBoots = id => ITEM[id].tier === 'boots';
// works out what buying `id` would cost given the components already in the bag
function purchasePlan(h, id) {
  const it = ITEM[id];
  const used = [];
  const take = cid => { const i = h.items.findIndex((x, j) => x === cid && !used.includes(j)); if (i >= 0) { used.push(i); return true; } return false; };
  const need = c => { if (take(c)) return 0; const ci = ITEM[c]; return recipeCost(ci) + ci.from.reduce((s, f) => s + need(f), 0); };
  const cost = recipeCost(it) + it.from.reduce((s, f) => s + need(f), 0);
  return { cost, used };
}
function canBuy(h, id) {
  const it = ITEM[id];
  if (it.elixir) return h.gold >= it.cost ? '' : `Need ${Math.ceil(it.cost - h.gold)} more gold`;
  if (it.stack) { const n = h.stacks[id] || 0; if (n >= it.stack) return 'You are carrying the maximum'; if (h.gold < it.cost) return `Need ${Math.ceil(it.cost - h.gold)} more gold`; if (!n && h.items.length >= 6) return 'Your inventory is full'; return ''; }
  const plan = purchasePlan(h, id);
  const after = h.items.filter((_, i) => !plan.used.includes(i));
  if (it.tier === 'legendary' && h.items.includes(id)) return 'Already owned — legendaries are unique';
  if (it.tier === 'starter' && after.some(x => ITEM[x].tier === 'starter')) return 'Only one starter item';
  if (isBoots(id) && after.some(isBoots)) return 'Only one pair of boots';
  if (after.length + 1 > 6) return 'Your inventory is full';
  if (h.gold < plan.cost) return `Need ${Math.ceil(plan.cost - h.gold)} more gold`;
  return '';
}
function buyItem(h, id) {
  if (canBuy(h, id)) return false;
  const it = ITEM[id];
  h.undo.push({ items: [...h.items], stacks: { ...h.stacks }, gold: h.gold, buffs: it.elixir ? it.elixir : null });
  if (it.elixir) { h.gold -= it.cost; buff(h, it.elixir, 180); calcStats(h); return true; }
  if (it.stack) { h.gold -= it.cost; if (!h.stacks[id]) h.items.push(id); h.stacks[id] = (h.stacks[id] || 0) + 1; calcStats(h); return true; }
  const plan = purchasePlan(h, id);
  h.gold -= plan.cost;
  h.items = h.items.filter((_, i) => !plan.used.includes(i));
  h.items.push(id);
  calcStats(h);
  return true;
}
function sellItem(h, idx) {
  const id = h.items[idx]; if (!id) return false;
  const it = ITEM[id];
  h.undo.push({ items: [...h.items], stacks: { ...h.stacks }, gold: h.gold });
  if (it.stack) { h.gold += it.cost * .4; h.stacks[id]--; if (h.stacks[id] <= 0) { delete h.stacks[id]; h.items.splice(idx, 1); } }
  else { h.gold += it.cost * .7; h.items.splice(idx, 1); }
  calcStats(h); return true;
}
function undoShop(h) {
  const u = h.undo.pop(); if (!u) return false;
  h.items = u.items; h.stacks = u.stacks; h.gold = u.gold;
  if (u.buffs) delete h.buffs[u.buffs];
  calcStats(h); return true;
}
/* ---------------- item actives (keys 1–6) ---------------- */
const ACTIVE_CD = { cleanse: 90, bolt: 40, stasis: 120, guard: 70, pot: 1 };
function useItem(h, idx, tx, ty) {
  const id = h.items[idx]; if (!id || h.dead) return false;
  const it = ITEM[id], kind = it.active || it.use; if (!kind) return false;
  if ((h.itemCd[kind] || 0) > G.t) return false;
  if (h.stasis > G.t) return false;
  if (kind !== 'cleanse' && (h.stun > 0 || h.kup > 0)) return false;
  switch (kind) {
    case 'pot':
      if (h.buffs.potion) { if (h === G.player) UI.toast('Already drinking a draught'); return false; }
      buff(h, 'potion', 15); h.stacks[id]--; if (h.stacks[id] <= 0) { delete h.stacks[id]; h.items.splice(idx, 1); }
      SFX.play('heal'); break;
    case 'cleanse':
      h.stun = 0; h.root = 0; h.kup = 0; h.slows = []; buff(h, 'mend', 1); ring(h.x, h.y, '#d8e8ff', 60, .5, 5); callout(h, 'CLEANSED', '#d8e8ff'); break;
    case 'bolt': {
      const c = foes(h.team, h.x, h.y, 700).filter(u => u.vis[h.team] && u.kind !== 'minion' || u.vis[h.team]).sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty))[0];
      if (!c) { if (h === G.player) UI.toast('No enemy in range'); return false; }
      G.projs.push({ homing: c, x: h.x, y: h.y, speed: 1400, owner: h, team: h.team, style: 'bolt', color: '#ffb070', onHit: () => { damage(h, c, 175 + .3 * h.s.ap, { magic: 1 }); slowU(c, .4, 2); burst(c.x, c.y, '#ffb070', 16, 220, 10); } });
      SFX.play('zap'); break;
    }
    case 'stasis':
      h.stasis = G.t + 2.5; h.path = []; h.attackTarget = null; h.casting = null; h.wind = null; h.channel = null; SFX.play('blink'); break;
    case 'guard':
      friends(h.team, h.x, h.y, 700).forEach(a => { shieldU(a, 250, 3); ring(a.x, a.y, '#f3d892', 50, .5, 4); }); ring(h.x, h.y, '#f3d892', 700, .6, 3); SFX.play('heal'); break;
  }
  h.itemCd[kind] = G.t + ACTIVE_CD[kind];
  return true;
}
function aiItems(h, tgt, mode) {
  const hp = h.hp / h.maxHp;
  h.items.forEach((id, i) => {
    const k = ITEM[id].active || ITEM[id].use; if (!k || (h.itemCd[k] || 0) > G.t) return;
    if (k === 'pot' && hp < .55 && !atShop(h)) useItem(h, i, h.x, h.y);
    else if (k === 'stasis' && hp < .2 && mode !== 'farm') useItem(h, i, h.x, h.y);
    else if (k === 'cleanse' && (h.stun > 0 || h.root > 0) && mode === 'flee') useItem(h, i, h.x, h.y);
    else if (k === 'bolt' && tgt && tgt.kind === 'hero' && dist(h, tgt) < 650) useItem(h, i, tgt.x, tgt.y);
    else if (k === 'guard' && mode === 'fight' && friends(h.team, h.x, h.y, 700).some(a => a.hp / a.maxHp < .5)) useItem(h, i, h.x, h.y);
  });
}
function aiShop(h) {
  if (!h.items.length && h.def.start) { buyItem(h, h.def.start); buyItem(h, 'pot'); buyItem(h, 'pot'); }
  for (let n = 0; n < 8; n++) {
    const goal = h.def.build.find(id => !h.items.includes(id));
    if (!goal) break;
    if (!canBuy(h, goal)) { buyItem(h, goal); continue; }
    // otherwise pick up the most expensive affordable missing component
    const comps = [];
    const walk = id => { for (const f of ITEM[id].from) { comps.push(f); walk(f); } };
    walk(goal);
    const owned = [...h.items];
    const missing = comps.filter(c => { const i = owned.indexOf(c); if (i >= 0) { owned.splice(i, 1); return false; } return true; });
    const opt = missing.filter(c => !canBuy(h, c)).sort((a, b) => ITEM[b].cost - ITEM[a].cost)[0];
    if (opt) { buyItem(h, opt); continue; }
    // bag full of starter? sell it
    const si = h.items.findIndex(x => ITEM[x].tier === 'starter' || x === 'pot');
    if (h.items.length >= 6 && si >= 0) { sellItem(h, si); continue; }
    break;
  }
  if ((h.stacks.pot || 0) < 1 && h.level < 9 && h.items.length < 6) buyItem(h, 'pot');
  h.undo = [];
}
function nextItemCost(h) { const goal = h.def.build.find(id => !h.items.includes(id)); return goal ? Math.min(purchasePlan(h, goal).cost, 1100) : 99999; }
function aiGo(h, x, y) {
  const last = h.path.length ? h.path[h.path.length - 1] : null;
  if (last && Math.hypot(last.x - x, last.y - y) < 60 && G.t < h.repathT) return;
  if (Math.hypot(h.x - x, h.y - y) < 20) { h.path = []; return; }
  h.path = findPath(h.x, h.y, x, y); h.repathT = G.t + 1.2;
}
function enemyTowerAt(team, x, y, pad = 0) { return G.units.find(u => isStruct(u) && !u.dead && u.team !== team && Math.hypot(u.x - x, u.y - y) < u.range + pad); }
function ownTowerAt(team, x, y) { return G.units.find(u => isStruct(u) && !u.dead && u.team === team && Math.hypot(u.x - x, u.y - y) < u.range); }
function laneFront(h) {
  let best = null;
  for (const m of G.units) if (m.kind === 'minion' && !m.dead && m.team === h.team && m.lane === h.lane && (!best || m.prog > best.prog)) best = m;
  return best;
}
function aiUse(h, t, mode) {
  if (Math.random() > G.aiSkill[h.team]) return;
  for (const k of ['R', 'Q', 'E', 'W']) {
    const ab = ABIL[h.def.ab[k]];
    if (h.cds[k] > 0 || h.mana < ab.mana || !rank(h, k) || !ab.ai) continue;
    if (mode === 'farm' && (!ab.farm || k === 'R')) continue;
    const p = ab.ai(h, t, mode);
    if (p && cast(h, k, p.x, p.y)) return true;
  }
  return false;
}
function heroThreat(u) { return u.hp * (1 + u.level * .12) * (u.power / 40) ** .5; }

function aiHero(h, dt) {
  h.aiT -= dt;
  if (h.aiT > 0) return;
  h.aiT = .22 + rnd(.1);
  const hpR = h.hp / h.maxHp, home = FOUNT[h.team];
  const visE = G.heroes.filter(e => e.team !== h.team && !e.dead && e.vis[h.team]);
  const near = visE.filter(e => dist(e, h) < 900);
  const atHome = dist(h, home) < 280;
  if (!atHome) aiItems(h, null, 'farm');
  if (atHome) {
    aiShop(h);
    if (h.pts) aiSpendTalents(h);
    if (hpR < .95 || h.mana / h.maxMana < .8) { h.path = []; h.attackTarget = null; return; }
    if (h.aiState === 'retreat') h.aiState = 'lane';
  }
  if (h.channel) { if (near.some(e => dist(e, h) < 700)) h.channel = null; else return; }
  // retreat
  const lowMana = h.mana / h.maxMana < .12 && hpR < .6;
  if (!atHome && (hpR < .28 || lowMana || h.aiState === 'retreat' && hpR < .75)) {
    h.aiState = 'retreat'; h.obj = null; h.attackTarget = null;
    const threat = near.filter(e => dist(e, h) < 800);
    if (!threat.length && dist(h, home) > 1000) { startRecall(h); return; }
    aiGo(h, home.x, home.y);
    if (threat.length) {
      const c = threat.sort((a, b) => dist(a, h) - dist(b, h))[0];
      aiUse(h, c, 'flee'); aiItems(h, c, 'flee');
      if (dist(c, h) < 320 && h.cds.D <= 0 && hpR < .2 && Math.random() < G.aiSkill[h.team]) cast(h, 'D', home.x, home.y);
      if (hpR < .25 && h.cds.F <= 0) cast(h, 'F', h.x, h.y);
      // desperate fight when caught
      if (dist(c, h) < h.range + c.r && c.hp / c.maxHp < .25) h.attackTarget = c;
    }
    return;
  }
  // big gold → go shop
  if (!near.length && h.gold >= nextItemCost(h) + 200 && hpR < .8 && dist(h, home) > 1200 && h.items.length < 6) { startRecall(h); return; }
  // assassins: hunt down killable champions and keep the snowball rolling
  if (h.def.role[0] === 'Assassin' && aiHunt(h)) return;
  // fight evaluation
  const targets = near.filter(e => dist(e, h) < 750 && e.kup <= 0);
  if (targets.length) {
    const allies = G.heroes.filter(a => a.team === h.team && !a.dead && dist(a, h) < 900);
    const mine = allies.reduce((s, a) => s + heroThreat(a), 0);
    const theirs = near.reduce((s, e) => s + heroThreat(e), 0);
    const tgt = targets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp) + (dist(a, h) - dist(b, h)) / 1500)[0];
    const underTower = enemyTowerAt(h.team, tgt.x, tgt.y, 60);
    const killable = tgt.hp < (h.def.role[0] === 'Assassin' ? assassinBurst(h) : h.power * 3.5 + 120);
    const inOwnTower = ownTowerAt(h.team, h.x, h.y);
    const brave = G.aiBold[h.team] * (inOwnTower ? 1.4 : 1) * (hpR > .6 ? 1.1 : .8);
    if ((mine * brave > theirs * .95 || (killable && hpR > .35)) && (!underTower || (killable && hpR > .6))) {
      h.aiState = 'fight';
      aiUse(h, tgt, 'fight'); aiItems(h, tgt, 'fight');
      if (h.cds.F <= 0 && hpR < .3) cast(h, 'F', h.x, h.y);
      h.attackTarget = tgt;
      return;
    }
    if (dist(tgt, h) < 560) {
      const t = ownTowerAt(h.team, h.x, h.y) ? h : null;
      if (!t) {
        const back = G.units.filter(u => u.kind === 'tower' && u.team === h.team && !u.dead).sort((a, b) => dist(a, h) - dist(b, h))[0] || home;
        aiGo(h, back.x, back.y); h.attackTarget = null;
        aiUse(h, tgt, 'flee');
        return;
      }
    }
  }
  h.aiState = 'lane';
  // objective
  const obj = G.teamObj[h.team];
  if (obj && obj.altar && obj.members.includes(h) && G.t < obj.until && obj.altar.owner !== h.team) {
    h.attackTarget = null; aiGo(h, obj.altar.x + rnd(-30, 30), obj.altar.y + rnd(-30, 30)); return;
  }
  if (obj && obj.unit && !obj.unit.dead && obj.members.includes(h) && G.t < obj.until) {
    const m = obj.unit;
    if (dist(h, m) > h.range + m.r + 20) { aiGo(h, m.x, m.y); h.attackTarget = null; }
    else { h.path = []; h.attackTarget = m; aiUse(h, m, 'farm'); for (const k of ['Q', 'E']) { const ab = ABIL[h.def.ab[k]]; if (h.cds[k] <= 0 && h.mana > ab.mana + 60 && rank(h, k) && !ab.moves && ab.type !== 'self' && ab.type !== 'unit') cast(h, k, m.x, m.y); } }
    return;
  }
  if (h.lane === 'jungle') aiJungle(h); else if (h.lane === 'support') aiSupport(h); else aiLane(h);
}

function aiJungle(h) {
  // capture a free altar nearby
  const alt = G.altars.filter(a => a.owner !== h.team && G.t >= a.unlock).sort((a, b) => dist(a, h) - dist(b, h))[0];
  if (alt && dist(alt, h) < 1400 && h.hp / h.maxHp > .5) { h.attackTarget = null; aiGo(h, alt.x, alt.y); return; }
  // farm own camps first, enemy camps once strong
  const camps = G.camps.filter(c => c.units.some(u => !u.dead && !u.reset) && (c.side === h.team || h.level >= 7));
  camps.sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) + (a.side === h.team ? 0 : 600) - Math.hypot(b.x - h.x, b.y - h.y) - (b.side === h.team ? 0 : 600));
  const c = camps[0];
  if (c && h.hp / h.maxHp > .35) {
    const m = c.units.filter(u => !u.dead).sort((a, b) => a.hp - b.hp)[0];
    if (dist(h, m) > h.range + m.r) { aiGo(h, m.x, m.y); h.attackTarget = null; }
    else { h.path = []; h.attackTarget = m; aiUse(h, m, 'farm'); for (const k of ['Q', 'E']) { const ab = ABIL[h.def.ab[k]]; if (h.cds[k] <= 0 && h.mana > ab.mana + 80 && rank(h, k) && !ab.moves && ab.type !== 'self' && ab.type !== 'unit') cast(h, k, m.x, m.y); } }
    return;
  }
  // nothing to farm: gank the lane where allies are fighting, else shadow a lane
  if (!h.gankLane || G.t > (h.gankT || 0)) { h.gankLane = pick(['top', 'bot']); h.gankT = G.t + 25; }
  const saved = h.lane; h.lane = h.gankLane; aiLane(h); h.lane = saved;
}

function aiLane(h) {
  const front = laneFront(h);
  let spot;
  if (front) {
    const wp = front.lpath[Math.min(front.wp, front.lpath.length - 1)];
    const [dx, dy] = dirTo(front, wp[0], wp[1]);
    spot = { x: front.x - dx * (h.ranged ? 170 : 90), y: front.y - dy * (h.ranged ? 170 : 90) };
  } else {
    const towers = G.units.filter(u => u.kind === 'tower' && u.team === h.team && u.lane === h.lane && !u.dead).sort((a, b) => b.tier - a.tier);
    const t = towers[0] || ANC[h.team];
    spot = { x: t.x + (h.team ? -60 : 60), y: t.y };
  }
  // targets
  const reach = h.range + 260;
  const mins = G.units.filter(u => u.kind === 'minion' && !u.dead && u.team !== h.team && u.vis[h.team] && Math.hypot(u.x - h.x, u.y - h.y) < reach);
  if (mins.length) {
    mins.sort((a, b) => a.hp - b.hp);
    const tg = mins[0];
    if (!enemyTowerAt(h.team, tg.x, tg.y, 30) || G.units.some(u => u.kind === 'minion' && u.team === h.team && !u.dead && dist(u, tg) < 300)) {
      h.attackTarget = tg; aiUse(h, tg, 'farm'); return;
    }
  }
  const tw = G.units.find(u => isStruct(u) && !u.dead && u.team !== h.team && dist(u, h) < Math.max(u.range, 300) + 200 && !structProtected(u));
  if (tw) {
    const tanks = G.units.filter(u => u.kind === 'minion' && u.team === h.team && !u.dead && dist(u, tw) < Math.max(tw.range, 300) - 20).length;
    if (tanks >= 2 || (tw.hp / tw.maxHp < .2)) { h.attackTarget = tw; return; }
    if (dist(h, tw) < tw.range + 30) { const back = { x: h.x + (h.team ? 1 : -1) * 250, y: h.y }; aiGo(h, back.x, back.y); h.attackTarget = null; return; }
  }
  // jungle when lane is quiet
  if (!mins.length && !front && h.level >= 2) {
    const camp = G.camps.find(c => c.units.length && c.units.some(u => !u.dead) && c.side === h.team && Math.hypot(c.x - h.x, c.y - h.y) < 1000);
    if (camp && h.hp / h.maxHp > .6) {
      const m = camp.units.find(u => !u.dead);
      if (dist(h, m) > h.range + m.r) { aiGo(h, m.x, m.y); h.attackTarget = null; } else { h.path = []; h.attackTarget = m; aiUse(h, m, 'farm'); }
      return;
    }
  }
  h.attackTarget = null;
  const et = enemyTowerAt(h.team, spot.x, spot.y, 40);
  if (et && !G.units.some(u => u.kind === 'minion' && u.team === h.team && !u.dead && dist(u, et) < et.range)) {
    const [dx, dy] = dirTo(et, spot.x, spot.y);
    spot = nearestWalkable(et.x + dx * (et.range + 80), et.y + dy * (et.range + 80));
  }
  aiGo(h, spot.x + rnd(-20, 20), spot.y + rnd(-20, 20));
}

/* assassin: roam for picks */
function assassinBurst(h) {
  const ab = h.def.ab; let b = h.atk * 3 + 60;
  for (const k of ['Q', 'R']) {
    const r = rank(h, k); if (!r || h.cds[k] > 1) continue;
    if (ab[k] === 'shadowstep') b += 40 + 38 * r + .95 * h.power;
    else if (ab[k] === 'deathmark') b += 180 + 100 * r + 1.2 * h.power;
    else b += h.power * 1.2;
  }
  if (rank(h, 'W') && h.cds.W <= 0) b += h.power * .8;
  return b * .8;
}
function aiHunt(h) {
  if (h.level < 3 || h.hp / h.maxHp < (h.huntT ? .45 : .65) || h.mana < 60) { h.huntT = null; return false; }
  const burst = assassinBurst(h);
  let best = null, bs = -1e9;
  for (const e of G.heroes) {
    if (e.team === h.team || e.dead || !e.vis[h.team] || dist(e, h) > 2400) continue;
    if (enemyTowerAt(h.team, e.x, e.y, 150) && e.hp > burst * .5) continue;
    const helpers = G.heroes.filter(x => x.team === e.team && !x.dead && x !== e && dist(x, e) < 800).length;
    const allies = G.heroes.filter(x => x.team === h.team && !x.dead && x !== h && dist(x, e) < 900).length;
    const kill = e.hp < burst * (1 + .5 * allies);
    const brawl = G.t - e.lastHurt < 3 && allies > 0;
    if (!kill && !brawl) continue;
    if (helpers > allies) continue;
    const sc = (kill ? 1000 : 0) + (e === h.huntT ? 300 : 0) - dist(e, h) * .3 - e.hp / e.maxHp * 300 + allies * 150 - helpers * 250;
    if (sc > bs) { bs = sc; best = e; }
  }
  h.huntT = best;
  if (!best) return false;
  h.aiState = 'fight'; h.obj = null;
  const d = dist(best, h);
  if (d > 700) {
    h.attackTarget = null; aiGo(h, best.x, best.y);
    if (d < 1100 && h.def.ab.E === 'veil' && !(h.stealth > 0) && h.cds.E <= 0 && rank(h, 'E') && h.mana >= ABIL.veil.mana + 60) cast(h, 'E', h.x, h.y);
  } else {
    h.attackTarget = best; aiUse(h, best, 'fight'); aiItems(h, best, 'fight');
  }
  return true;
}

/* support: shadow a lane partner, never farm, fight what they fight */
function supportBuddy(h) {
  const home = FOUNT[h.team];
  const ok = a => a.team === h.team && a !== h && !a.dead && Math.hypot(a.x - home.x, a.y - home.y) > 900;
  const cur = h.buddy;
  if (cur && ok(cur)) return cur;
  const allies = G.heroes.filter(ok);
  return allies.find(a => a.lane === 'bot') || allies.sort((a, b) => dist(a, h) - dist(b, h))[0] || null;
}
function aiSupport(h) {
  const b = h.buddy = supportBuddy(h);
  h.attackTarget = null;
  aiUse(h, b || h, 'support');
  if (!b) { // partner is dead or shopping: wait safely at our bottom tower
    const tw = G.units.filter(u => u.kind === 'tower' && u.team === h.team && u.lane === 'bot' && !u.dead).sort((x, y) => y.tier - x.tier)[0] || FOUNT[h.team];
    aiGo(h, tw.x + (h.team ? -80 : 80), tw.y); return;
  }
  const bt = b.attackTarget;
  if (bt && !bt.dead && (bt.kind === 'hero' || isStruct(bt)) && dist(bt, h) < h.range + bt.r + 220) {
    h.attackTarget = bt; if (bt.kind === 'hero') aiUse(h, bt, 'fight'); return;
  }
  // poke an enemy champion that walks up on the partner
  const e = G.heroes.find(x => x.team !== h.team && !x.dead && x.vis[h.team] && dist(x, b) < 420 && dist(x, h) < h.range + x.r && !enemyTowerAt(h.team, x.x, x.y, 30));
  if (e) { h.attackTarget = e; aiUse(h, e, 'fight'); return; }
  const home = FOUNT[h.team], [dx, dy] = dirTo(b, home.x, home.y);
  const spot = { x: b.x + dx * 160 - dy * 60, y: b.y + dy * 160 + dx * 60 };
  if (Math.hypot(spot.x - h.x, spot.y - h.y) > 70) aiGo(h, spot.x, spot.y); else h.path = [];
}

function teamBrain(team) {
  const obj = G.teamObj[team];
  if (obj && ((obj.unit && obj.unit.dead) || (obj.altar && obj.altar.owner === team) || G.t > obj.until)) G.teamObj[team] = null;
  if (G.teamObj[team]) return;
  const ais = G.heroes.filter(h => h.team === team && !h.dead && h.ai && h.hp / h.maxHp > .6);
  const all = G.heroes.filter(h => h.team === team && !h.dead);
  const avgL = G.heroes.filter(h => h.team === team).reduce((s, h) => s + h.level, 0) / 3;
  let unit = null, need = 2;
  if (G.voidmaw.unit && !G.voidmaw.unit.dead && avgL >= 9 && all.length === 3) { unit = G.voidmaw.unit; need = 3; }
  if (!unit) {
    const alt = G.altars.filter(a => a.owner !== team && G.t >= a.unlock && !G.heroes.some(e => e.team !== team && !e.dead && dist(e, a) < 700))[0];
    if (alt && Math.random() < .5) {
      const m = ais.filter(h => h.lane !== 'jungle' && h.aiState !== 'fight').sort((a, b) => dist(a, alt) - dist(b, alt))[0];
      if (m && dist(m, alt) < 1500) { G.teamObj[team] = { altar: alt, members: [m], until: G.t + 30 }; }
    }
    return;
  }
  if (Math.random() < .35) return;
  const enemiesClose = G.heroes.filter(e => e.team !== team && !e.dead && dist(e, unit) < 1100).length;
  if (enemiesClose >= 2) return;
  const members = ais.sort((a, b) => dist(a, unit) - dist(b, unit)).slice(0, need);
  if (members.length < Math.min(need, 2)) return;
  G.teamObj[team] = { unit, members, until: G.t + 50 };
  if (G.player && team === G.player.team && !G.demo) {
    UI.miniAnnounce(`Allies are moving on ${unit.name} — join them!`, true);
    G.marks.push({ x: unit.x, y: unit.y, t: 4, col: '#f3d892' });
  }
}
