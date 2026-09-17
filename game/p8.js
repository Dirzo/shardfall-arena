
/* =========================================================
   NEW CHAMPIONS — Summoner · Specialist · Warden · Duelist
   ========================================================= */
HEROES.push(
  { id: 'mar', name: 'Marrowin', title: 'The Bonecaller', role: ['Summoner', 'Ranged'], diff: 2,
    c1: '#6fe0a8', c2: '#0f3a2a', eye: '#c8ffe0', cloak: '#10261e',
    lore: 'He buried an army once. They did not stay buried, and neither did he.',
    art: { helm: 'skullcrown', weapon: 'skullstaff', fx: 'soul' },
    stats: { hp: 560, hpG: 80, mana: 420, manaG: 34, power: 28, powerG: 3.2, as: .65, range: 500, ms: 300, armor: 12, armorG: 1.8, regen: 2.8 },
    bars: { Damage: 3, Toughness: 2, Mobility: 1, Control: 4 },
    ab: { Q: 'bonespear', W: 'thralls', E: 'gravechill', R: 'legion' },
    caps: ['Splintering Spear', 'Unyielding Dead', 'Grave Tide'],
    start: 's_ring', build: ['b_sorc', 'mask', 'stormstaff', 'archcrown', 'frostscepter', 'voidstaff'] },
  { id: 'tink', name: 'Tinka', title: 'Gearwright of Cogsbury', role: ['Specialist', 'Ranged'], diff: 3,
    c1: '#ffb347', c2: '#5a3208', eye: '#fff0c0', cloak: '#3a2410',
    lore: 'Her first invention was a better mousetrap. Her second was a smaller army.',
    art: { helm: 'goggles', weapon: 'wrench', fx: 'spark' },
    stats: { hp: 550, hpG: 78, mana: 400, manaG: 32, power: 31, powerG: 3.1, as: .7, range: 540, ms: 305, armor: 12, armorG: 1.8, regen: 2.6 },
    bars: { Damage: 4, Toughness: 1, Mobility: 2, Control: 4 },
    ab: { Q: 'salvo', W: 'turret', E: 'mine', R: 'mortar' },
    caps: ['Payload', 'Reinforced Plating', 'Cluster Mines'],
    start: 's_ring', build: ['b_sorc', 'stormstaff', 'archcrown', 'gunblade', 'voidstaff', 'hourglass'] },
  { id: 'aur', tithe: 1.8, name: 'Aurelle', title: 'Sunward Paladin', role: ['Warden', 'Melee'], diff: 2,
    c1: '#ffe27a', c2: '#6a4a10', eye: '#fff6d0', cloak: '#6a5a3a',
    lore: 'She swore to stand between her friends and every blade. So far the blades keep losing.',
    art: { helm: 'winged', weapon: 'lance', pauldron: true, fx: 'ember' },
    stats: { hp: 700, hpG: 92, mana: 340, manaG: 26, power: 38, powerG: 3.6, as: .78, range: 150, ms: 310, armor: 20, armorG: 2.6, regen: 4 },
    bars: { Damage: 2, Toughness: 4, Mobility: 3, Control: 3 },
    ab: { Q: 'radiant', W: 'oath', E: 'charge', R: 'sunwall' },
    caps: ['Judgment', 'Martyr', 'Dawnbreak'],
    start: 's_shield', build: ['b_merc', 'aegispendant', 'soulward', 'brambleguard', 'mountain', 'cinderplate'] },
  { id: 'juro', name: 'Juro', title: 'The Wandering Blade', role: ['Duelist', 'Melee'], diff: 3,
    c1: '#ff6a7a', c2: '#4a0e1a', eye: '#ffd0d8', cloak: '#5a1420',
    lore: 'He has crossed blades with a hundred masters, and remembers every one who made him bleed.',
    art: { helm: 'kasa', weapon: 'katana', fx: 'petal' },
    stats: { hp: 660, hpG: 90, mana: 280, manaG: 22, power: 44, powerG: 4.5, as: .86, range: 145, ms: 340, armor: 20, armorG: 2.5, regen: 3.4 },
    bars: { Damage: 5, Toughness: 2, Mobility: 4, Control: 2 },
    ab: { Q: 'rising', W: 'riposte', E: 'flow', R: 'petals' },
    caps: ['Killing Stroke', 'Perfect Guard', 'Falling Petals'],
    start: 's_blade', build: ['b_zerk', 'drownedking', 'titanbreaker', 'thirster', 'stormcrown', 'ironresolve'] },
);
for (const h of HEROES) HERO[h.id] = h;
Object.assign(CAPDESC, {
  mar: ['Bone Spear deals 40% more damage.', 'Thralls have 50% more health and last 4s longer.', 'Grave Chill is 40% wider.'],
  tink: ['Rocket Salvo fires five rockets.', 'Turrets have 60% more health and last 50% longer.', 'Spring Mine drops three mines.'],
  aur: ['Radiant Strike deals 50% more damage.', "Guardian's Oath redirects 50% of damage and doubles its shield.", 'Sunwall lasts 1.5s longer.'],
  juro: ['Rising Draw deals double damage to targets below 30% health.', 'Riposte lasts 0.5s longer and heals 10% on a counter.', 'Hundred Petals strikes up to 8 targets.'],
});

/* ---------------- pets (thralls, turrets) and mines ---------------- */
function spawnPet(owner, kind, x, y, o = {}) {
  const lvl = owner.level, isT = kind === 'turretT';
  const b = isT ? { hp: 340 + 40 * lvl, power: 13 + 2.1 * lvl + owner.power * .13, range: 470, as: 1, r: 16, armor: 25, ms: 0 }
    : { hp: 220 + 32 * lvl, power: 12 + 2.6 * lvl + owner.power * .15, range: 55, as: .95, r: 13, armor: 12, ms: 320 };
  const p = nearestWalkable(x, y), hp = b.hp * (o.hpMult || 1);
  const u = addUnit(new Unit({
    kind: 'minion', mtype: kind, pet: true, owner, team: owner.team, x: p.x, y: p.y, r: b.r, hp, maxHp: hp, power: b.power * (o.dmgMult || 1),
    as: b.as, range: b.range, armor: b.armor, ms: b.ms, gold: 8, xp: 10, life: o.life || 12, ranged: isT, face: owner.face,
    empowered: !!o.emp, lpath: [[p.x, p.y], [p.x, p.y]], wp: 1, prog: -1e9, slot: rnd(TAU),
  }));
  const col = isT ? '#ffb347' : '#6fe0a8';
  ring(p.x, p.y, col, 44, .5, 4); burst(p.x, p.y, col, 16, 180, 8, .6);
  return u;
}
function petsOf(h, kind) { return G.units.filter(u => u.pet && u.owner === h && u.mtype === kind && !u.dead); }
function updPet(m, dt) {
  m.life -= dt;
  const o = m.owner;
  if (m.life <= 0 || (o.dead && m.mtype === 'thrall')) { m.dead = true; m.deadT = 0; burst(m.x, m.y - 10, m.mtype === 'thrall' ? '#c8ffe0' : '#ffb347', 12, 160, 8, .5); return; }
  if (m.stun > 0 || m.kup > 0) return;
  m.retT = (m.retT || 0) - dt;
  if (m.retT <= 0 || !m.target || m.target.dead) {
    m.retT = .35;
    let best = null;
    const pref = o.attackTarget;
    if (pref && !pref.dead && pref.team !== m.team && dist(pref, m) < (m.ms ? 650 : m.range + pref.r) && !(isStruct(pref) && structProtected(pref))) best = pref;
    else {
      let bd = 1e9; const R = m.ms ? 460 : m.range;
      for (const u of G.units) {
        if (u.dead || u.team === m.team || u.team === 2 || isStruct(u) || u.reset || !u.vis[m.team]) continue;
        const d = Math.hypot(u.x - m.x, u.y - m.y) + (u.kind === 'hero' ? -60 : 0);
        if (d < R + u.r && d < bd) { bd = d; best = u; }
      }
    }
    m.target = best;
  }
  const T = m.target;
  if (T) {
    if (dist(m, T) <= m.range + T.r + m.r) attack(m, T);
    else if (m.ms && m.root <= 0) moveToward(m, T.x, T.y, dt, unitSpeed(m));
    return;
  }
  if (m.ms && !o.dead) {
    const tx = o.x + Math.cos(m.slot) * 70, ty = o.y + Math.sin(m.slot) * 50;
    if (Math.hypot(tx - m.x, ty - m.y) > 30) moveToward(m, tx, ty, dt, Math.max(unitSpeed(m), dist(m, o) > 300 ? 460 : 0));
  }
}
function placeMine(h, x, y, r) {
  const mines = G.zones.filter(z => z.style === 'mine' && z.owner === h);
  if (mines.length >= 5) mines[0].dead = true;
  const p = nearestWalkable(x, y);
  zone({ x: p.x, y: p.y, r: 70, dur: 45, delay: .6, owner: h, team: h.team, style: 'mine', tick: .1,
    onTick: z => {
      if (!foes(h.team, z.x, z.y, 55).some(u => !u.dead)) return;
      z.dead = true;
      foes(h.team, z.x, z.y, 170).forEach(u => { damage(h, u, 50 + 35 * r + .45 * h.power, { abil: 1 }); rootU(u, 1.2); });
      ring(z.x, z.y, '#ffb347', 170, .5, 8); burst(z.x, z.y, '#ffb347', 30, 360, 12, .7); burst(z.x, z.y, '#6a7a8a', 14, 200, 10, .6);
      G.shake = Math.max(G.shake, 6); SFX.play('boom');
    } });
}
function rocketArc(x0, y0, x1, y1, dur, col = '#ffb347') { part({ kind: 'rocket', x: x0, y: y0, x0, y0, x1, y1, life: dur, max: dur, color: col, add: false, size: 6 }); }

/* ---------------- abilities ---------------- */
Object.assign(ABIL, {
  /* Marrowin */
  bonespear: { name: 'Bone Spear', icon: 'bone', cd: [7, 6.5, 6, 5.5, 5], mana: 45, range: 900, type: 'dir', farm: true,
    desc: r => `Hurl a spear of bone that pierces every enemy in a line for ${45 + 36 * r} (+${pw(.65)}) damage and slows by 25%.`,
    cast(h, tx, ty, r) {
      const dmg = (45 + 36 * r + .65 * h.power) * (hasCap(h, 0) ? 1.4 : 1);
      skillshot(h, tx, ty, { speed: 1300, range: 900, w: 34, pierce: true, style: 'bone', color: '#e8e2cc', onHit: u => { damage(h, u, dmg, { abil: 1 }); slowU(u, .25, 1); burst(u.x, u.y - 10, '#c8ffe0', 8, 160, 7); } });
      SFX.play('bow');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 850 ? lead(h, t, 1300) : (m === 'farm' ? farmSpot(h, 800, 60) : null) },
  thralls: { name: 'Raise Thralls', icon: 'raise', cd: [16, 15, 14, 13, 12], mana: 70, range: 400, type: 'point',
    desc: r => `Raise two skeletal thralls for ${hasCapText('12s')} that fight beside you. They grow stronger with your level and power.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 400), cap = hasCap(h, 1);
      petsOf(h, 'thrall').slice(0, -4).forEach(p => { p.life = 0; });
      for (let i = 0; i < 2; i++) spawnPet(h, 'thrall', x + (i ? 30 : -30), y, { life: cap ? 16 : 12, hpMult: cap ? 1.5 : 1 });
      SFX.play('cast');
    },
    ai: (h, t, m) => (m === 'fight' && dist(h, t) < 600) ? t : (m === 'farm' && foes(h.team, h.x, h.y, 500).filter(u => u.kind === 'minion').length >= 2 ? h : null) },
  gravechill: { name: 'Grave Chill', icon: 'moon', cd: [10, 9.5, 9, 8.5, 8], mana: 55, range: 750, type: 'point', aoe: 200, farm: true,
    desc: r => `Frost erupts from the ground after 0.45s, dealing ${35 + 30 * r} (+${pw(.45)}) damage and slowing by 45% for 2s.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 750), rad = hasCap(h, 2) ? 280 : 200;
      zone({ x, y, r: rad, delay: .45, once: true, owner: h, team: h.team, style: 'chill',
        onFire: z => { foes(h.team, z.x, z.y, z.r).forEach(u => { damage(h, u, 35 + 30 * r + .45 * h.power, { abil: 1 }); slowU(u, .45, 2); }); ring(z.x, z.y, '#bfffe8', z.r, .6, 8); burst(z.x, z.y, '#bfffe8', 30, 300, 10, .8); SFX.play('zap'); } });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 720 ? lead(h, t, 1600) : (m === 'farm' ? farmSpot(h, 700, 200) : null) },
  legion: { name: 'Bone Legion', icon: 'banner', cd: [90, 80, 70], mana: 120, type: 'self', aoe: 160,
    desc: r => `Tear open the earth and raise three empowered thralls around you for 12s. They deal 70% more damage.`,
    cast(h, tx, ty, r) {
      const cap = hasCap(h, 1);
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; spawnPet(h, 'thrall', h.x + Math.cos(a) * 80, h.y + Math.sin(a) * 60, { life: cap ? 16 : 12, hpMult: (cap ? 1.5 : 1) * (1 + .25 * r), dmgMult: 1.15, emp: true }); }
      ring(h.x, h.y, '#6fe0a8', 220, .8, 8); G.shake = Math.max(G.shake, h === G.player ? 8 : 0); SFX.play('horn2');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 500 ? h : null },

  /* Tinka */
  salvo: { name: 'Rocket Salvo', icon: 'rocket', cd: [8, 7.5, 7, 6.5, 6], mana: 45, range: 800, type: 'point', aoe: 150, farm: true,
    desc: r => `Launch three rockets at an area. Each blast deals ${18 + 16 * r} (+${pw(.25)}) damage.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 800), n = hasCap(h, 0) ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const px = x + rnd(-80, 80), py = y + rnd(-60, 60), d = .35 + i * .09;
        rocketArc(h.x, h.y - 30, px, py, d);
        zone({ x: px, y: py, r: 110, delay: d, once: true, owner: h, team: h.team, style: 'blast',
          onFire: z => { foes(h.team, z.x, z.y, z.r).forEach(u => damage(h, u, 18 + 16 * r + .25 * h.power, { abil: 1 })); burst(z.x, z.y, '#ffb347', 18, 260, 11, .5); ring(z.x, z.y, '#ffd27a', 110, .35, 5); SFX.play('boom'); } });
      }
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 780 ? lead(h, t, 1400) : (m === 'farm' ? farmSpot(h, 780, 110) : null) },
  turret: { name: 'Deploy Turret', icon: 'turret', cd: [14, 13, 12, 11, 10], mana: 60, range: 350, type: 'point',
    desc: r => 'Build a turret that shoots nearby enemies for 8s. Up to two at once.',
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 350), cap = hasCap(h, 1);
      const old = petsOf(h, 'turretT'); if (old.length >= 2) old[0].life = 0;
      spawnPet(h, 'turretT', x, y, { life: cap ? 12 : 8, hpMult: cap ? 1.6 : 1, dmgMult: 1 + .05 * r });
      SFX.play('buy');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 650 ? { x: (h.x + t.x) / 2, y: (h.y + t.y) / 2 } : (m === 'farm' && foes(h.team, h.x, h.y, 600).filter(u => u.kind === 'minion').length >= 3 ? h : null) },
  mine: { name: 'Spring Mine', icon: 'mine', cd: [12, 11, 10, 9, 8], mana: 40, range: 500, type: 'point', aoe: 70,
    desc: r => `Drop a hidden mine that arms after 0.6s. When an enemy steps on it, it deals ${50 + 35 * r} (+${pw(.45)}) damage nearby and roots for 1.2s.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 500);
      placeMine(h, x, y, r);
      if (hasCap(h, 2)) { placeMine(h, x + 90, y + 40, r); placeMine(h, x - 90, y + 40, r); }
      SFX.play('ui');
    },
    ai: (h, t, m) => m === 'flee' ? h : (m === 'fight' && dist(h, t) < 480 ? lead(h, t, 900) : null) },
  mortar: { name: 'Mega Mortar', icon: 'barrage', cd: [80, 70, 60], mana: 110, range: 1800, type: 'point', aoe: 320,
    desc: r => `Call in six shells over a huge area far away. Each deals ${65 + 50 * r} (+${pw(.38)}) damage and slows by 30%.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 1800);
      for (let i = 0; i < 6; i++) {
        const a = rnd(TAU), rr = i ? rnd(60, 260) : 0, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr, d = .9 + i * .14;
        zone({ x: px, y: py, r: 130, delay: d, once: true, owner: h, team: h.team, style: 'blast',
          onFire: z => { foes(h.team, z.x, z.y, z.r).forEach(u => { damage(h, u, 65 + 50 * r + .38 * h.power, { abil: 1 }); slowU(u, .3, 1.5); }); burst(z.x, z.y, '#ff8a3a', 30, 380, 14, .7); ring(z.x, z.y, '#ffd27a', 130, .45, 7); G.shake = Math.max(G.shake, 5); SFX.play('boom'); } });
        after(d - .25, () => part({ kind: 'speed', x: px + 20, y: py - 300, vx: -80, vy: 1200, color: '#ffd27a', size: 30, life: .25, max: .25 }));
      }
      SFX.play('horn2');
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 1500 && (t.hp / t.maxHp < .6 || foes(h.team, t.x, t.y, 300, { heroes: 1 }).length >= 2) ? lead(h, t, 900) : null },

  /* Aurelle */
  radiant: { name: 'Radiant Strike', icon: 'sun', cd: [7, 6.5, 6, 5.5, 5], mana: 30, range: 220, type: 'self', farm: true,
    desc: r => `Strike around you with sunlight for ${55 + 40 * r} (+${pw(.9)}) damage, healing yourself and the most wounded nearby ally for ${40 + 25 * r} (+${pw(.3)}).`,
    cast(h, tx, ty, r) {
      const dmg = (55 + 40 * r + .9 * h.power) * (hasCap(h, 0) ? 1.5 : 1);
      foes(h.team, h.x, h.y, 220).forEach(u => { damage(h, u, dmg, { abil: 1 }); burst(u.x, u.y - 16, '#ffe27a', 10, 200, 8); });
      const amt = 40 + 25 * r + .3 * h.power;
      heal(h, amt, h);
      const ally = friends(h.team, h.x, h.y, 500).filter(a => a !== h).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (ally) { heal(ally, amt, h); part({ kind: 'beam', x: h.x, y: h.y - 30, x2: ally.x, y2: ally.y - 30, color: '#ffe27a', w: 5, life: .3, max: .3 }); }
      ring(h.x, h.y, '#ffe27a', 200, .45, 8); part({ kind: 'star', x: h.x, y: h.y - 30, color: '#fff6c0', size: 60, pts: 12, rot: 0, life: .3, max: .3 }); SFX.play('clang');
    },
    ai: (h, t, m) => (m === 'fight' && dist(h, t) < 210) || (m === 'farm' && foes(h.team, h.x, h.y, 220).length >= 3) ? h : null },
  oath: { name: "Guardian's Oath", icon: 'tether', cd: [14, 13, 12, 11, 10], mana: 50, range: 650, type: 'ally',
    desc: r => `Bind yourself to the ally nearest your cursor for 5s. They gain a ${70 + 45 * r} (+8% of your max health) shield and 30% of the damage they take is redirected to you.`,
    cast(h, tx, ty, r) {
      const cap = hasCap(h, 1);
      const ally = friends(h.team, h.x, h.y, 650).filter(a => a !== h).sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty))[0] || h;
      const amt = (70 + 45 * r + .08 * h.maxHp) * (cap ? 2 : 1);
      shieldU(ally, amt, 5);
      if (ally !== h) buff(ally, 'oath', 5, { by: h, pct: cap ? .5 : .3 });
      ring(ally.x, ally.y, '#ffe27a', 60, .5, 5); SFX.play('heal');
    },
    ai: (h, t, m) => { const a = friends(h.team, h.x, h.y, 650).filter(x => x !== h && x.hp / x.maxHp < .75 && G.t - x.lastHurt < 2)[0]; return a || (m === 'flee' ? h : null); } },
  charge: { name: 'Hallowed Charge', icon: 'bash', cd: [12, 11, 10, 9, 8], mana: 45, range: 450, type: 'dir', moves: true,
    desc: r => `Charge forward, dealing ${45 + 35 * r} (+${pw(.6)}) damage to enemies in your path. The first champion struck is stunned for 0.6s; others are slowed. Allies near where you land gain a ${40 + 30 * r} shield.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 450);
      dashU(h, x, y, 1300, { trail: '#ffe27a', onPass: u => { damage(h, u, 45 + 35 * r + .6 * h.power, { abil: 1 }); if (u.kind === 'hero' && !h.dash.stunned) { h.dash.stunned = 1; stunU(u, .6); } else slowU(u, .3, 1.2); },
        onEnd: () => { friends(h.team, h.x, h.y, 260).forEach(a => { shieldU(a, 40 + 30 * r + .2 * h.power, 3); ring(a.x, a.y, '#ffe27a', 45); }); ring(h.x, h.y, '#ffe27a', 260, .45, 5); } });
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) > 200 && dist(h, t) < 440 ? t : (m === 'flee' ? FOUNT[h.team] : null) },
  sunwall: { name: 'Sunwall', icon: 'sanct', cd: [100, 85, 70], mana: 110, type: 'self', aoe: 300,
    desc: r => `Raise a dome of light around you for 3s. Allies inside take 50% less damage; enemies inside are slowed by 20% and burn for ${30 + 25 * r} (+${pw(.3)}) damage per second.`,
    cast(h, tx, ty, r) {
      zone({ x: h.x, y: h.y, r: 300, dur: hasCap(h, 2) ? 4.5 : 3, owner: h, team: h.team, style: 'sunwall', tick: .25,
        onTick: z => { friends(h.team, z.x, z.y, z.r).forEach(a => buff(a, 'sunwall', .4)); foes(h.team, z.x, z.y, z.r).forEach(u => { slowU(u, .2, .4); damage(h, u, (30 + 25 * r + .3 * h.power) / 4, { abil: 1, dot: 1 }); }); } });
      G.shake = Math.max(G.shake, h === G.player ? 6 : 0); SFX.play('horn');
    },
    ai: (h, t, m) => m === 'fight' && friends(h.team, h.x, h.y, 300).some(a => a.hp / a.maxHp < .5) ? h : null },

  /* Juro */
  rising: { name: 'Rising Draw', icon: 'sword2', cd: [8, 7.5, 7, 6.5, 6], mana: 30, range: 360, type: 'dir', moves: true, farm: true,
    desc: r => `Dash forward, cutting every enemy you pass for ${40 + 35 * r} (+${pw(1)}) damage. You stop just past the first champion struck and heal for 25% of the damage. Killing a target resets the cooldown.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 360), cap = hasCap(h, 0), hit = [];
      dashU(h, x, y, 1600, { trail: '#ff9ab0', onPass: u => { const low = cap && u.hp / u.maxHp < .3; heal(h, damage(h, u, (40 + 35 * r + h.power) * (low ? 2 : 1), { abil: 1 }) * .25); hit.push(u); if (u.kind === 'hero' && h.dash) h.dash.left = Math.min(h.dash.left, 70); part({ kind: 'slash', x: u.x, y: u.y - 20, ang: Math.atan2(y - h.y, x - h.x), size: 40, color: '#ff9ab0', w: 8, life: .25, max: .25 }); } });
      after(.35, () => { if (hit.some(u => u.dead)) { h.cds.Q = Math.min(h.cds.Q, .25); callout(h, 'RESET', '#ff9ab0'); } });
      SFX.play('slice');
    },
    ai: (h, t, m) => (m === 'fight' && dist(h, t) < 340) ? t : (m === 'farm' ? farmSpot(h, 340, 80) : null) },
  riposte: { name: 'Riposte', icon: 'parry', cd: [12, 11, 10, 9, 8], mana: 40, type: 'self', keepStealth: true,
    desc: r => `Raise your blade for 0.9s. The next attack against you is parried: the attacker takes ${30 + 30 * r} (+${pw(.8)}) damage and is stunned for 0.75s.`,
    cast(h, tx, ty, r) { buff(h, 'parry', hasCap(h, 1) ? 1.4 : .9, { r }); ring(h.x, h.y, '#ffffff', 40, .3, 4); },
    ai: (h, t, m) => (m === 'fight' || m === 'flee') && dist(h, t) < 260 && G.t - h.lastHurt < .8 ? h : null },
  flow: { name: 'Flowing Step', icon: 'tumble', cd: [11, 10, 9, 8, 7], mana: 30, range: 250, type: 'point', moves: true,
    desc: r => `Glide a short distance. Your next attack within 3s is a guaranteed critical strike with ${20 + 15 * r} bonus damage.`,
    cast(h, tx, ty, r) { const [x, y] = clampPt(h, tx, ty, 250); dashU(h, x, y, 1300, { trail: '#ff9ab0' }); buff(h, 'flow', 3, { v: 20 + 15 * r }); },
    ai: (h, t, m) => m === 'flee' ? FOUNT[h.team] : (m === 'fight' && dist(h, t) > h.range + 20 && dist(h, t) < 420 ? t : null) },
  petals: { name: 'Hundred Petals', icon: 'petals', cd: [80, 70, 60], mana: 100, range: 500, type: 'point', aoe: 350,
    desc: r => `Vanish and strike 5 times, cycling through enemies near the target area (champions first). Each strike deals ${30 + 26 * r} (+${pw(.36)}) damage and heals you for 25% of it. You cannot be harmed while striking.`,
    cast(h, tx, ty, r) {
      const [x, y] = clampPt(h, tx, ty, 500);
      const uniq = foes(h.team, x, y, 350).filter(u => u.vis[h.team]).sort((a, b) => (b.kind === 'hero') - (a.kind === 'hero') || dist(a, h) - dist(b, h)).slice(0, 5);
      if (!uniq.length) return false;
      const list = []; for (let i = 0; i < (hasCap(h, 2) ? 8 : 5); i++) list.push(uniq[i % uniq.length]);
      h.invulnT = G.t + list.length * .14 + .25; h.path = []; h.attackTarget = null;
      burst(h.x, h.y - 20, '#ff9ab0', 20, 220, 10);
      list.forEach((u, i) => after(i * .14, () => {
        if (h.dead) return;
        if (!u.dead) {
          const a = rnd(TAU), p = nearestWalkable(u.x + Math.cos(a) * 50, u.y + Math.sin(a) * 30);
          h.x = p.x; h.y = p.y; h.face = Math.atan2(u.y - h.y, u.x - h.x); h.swing = .28; h.atkCount++;
          heal(h, damage(h, u, (30 + 26 * r + .36 * h.power) * (u.kind === 'hero' ? 1 : .6), { abil: 1 }) * .25);
          part({ kind: 'slash', x: u.x, y: u.y - 20, ang: a + Math.PI, size: 46, color: '#ff9ab0', w: 10, life: .28, max: .28, flip: i % 2 });
          petalBurst(u.x, u.y - 20, 8);
          SFX.play('slice'); if (h === G.player) G.hitstop = Math.max(G.hitstop || 0, .04);
        }
      }));
    },
    ai: (h, t, m) => m === 'fight' && dist(h, t) < 480 ? t : null },
});
function hasCapText(t) { return t; }
function petalBurst(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(80, 220); part({ kind: 'petal', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, grav: 160, drag: .92, color: i % 2 ? '#ffb8c8' : '#ff8aa2', size: 5, life: .9, max: .9, rot: rnd(TAU), add: false }); } }
Object.assign(SHAPE, {
  bonespear: { s: 'line', w: 34 }, thralls: { s: 'circle', r: 80 }, gravechill: { s: 'circle', r: 200 }, legion: { s: 'circle', r: 160, self: 1, ct: .3 },
  salvo: { s: 'circle', r: 150 }, turret: { s: 'circle', r: 40 }, mine: { s: 'circle', r: 70 }, mortar: { s: 'circle', r: 330, ct: .3 },
  radiant: { s: 'circle', r: 220, self: 1, ct: .2 }, charge: { s: 'line', w: 60 }, sunwall: { s: 'circle', r: 300, self: 1, ct: .25 },
  rising: { s: 'line', w: 60 }, flow: { s: 'circle', r: 36 }, petals: { s: 'circle', r: 350, ct: .15 },
});
Object.assign(CAPKEY, { mar: ['Q', 'W', 'E'], tink: ['Q', 'W', 'E'], aur: ['Q', 'W', 'R'], juro: ['Q', 'W', 'R'] });
Object.assign(BUFFS, {
  oath: ['tether', '#ffe27a', "Guardian's Oath"], sunwall: ['sanct', '#ffe27a', 'Sunwall'], parry: ['parry', '#ffffff', 'Riposte — parry ready'], flow: ['tumble', '#ff9ab0', 'Flowing Step — next attack crits'],
});
Object.assign(IMPACT, {
  mar: { col: '#6fe0a8', snd: 'zapS', star: 6 },
  tink: { col: '#ffb347', snd: 'hit', star: 6, ring: 1 },
  aur: { col: '#ffe27a', snd: 'clang', slash: 1, star: 8, ring: 1 },
  juro: { col: '#ff9ab0', snd: 'slice', slash: 3, star: 4, petals: 1 },
});

/* ---------------- champion models ---------------- */
function boneShard(x, y, a) { X.save(); X.translate(x, y); X.rotate(a); shape(() => { X.moveTo(-5, -1.5); X.lineTo(5, -1); X.lineTo(6, 0); X.lineTo(5, 1); X.lineTo(-5, 1.5); X.closePath(); }, '#efe8d2', 1.2); X.restore(); }
Object.assign(RIG, {
  mar(P) { // Bonecaller: ragged robe, skull face under a spiked hood, skull-lantern staff
    const b = P.bob;
    const shards = [0, 1, 2].map(i => { const a = P.T * 2 + i * 2.1; return [Math.cos(a) * 20, -32 + Math.sin(a) * 6 + b, a, Math.sin(a)]; });
    shards.filter(s => s[3] < 0).forEach(s => boneShard(s[0], s[1], s[2]));
    shape(() => { X.moveTo(-8, -46 + b); X.lineTo(8, -46 + b); X.quadraticCurveTo(12, -24, 13, -4); for (let i = 0; i <= 6; i++) X.lineTo(13 - i * 4.33, -4 + (i % 2 ? -5 : 1) + Math.sin(P.T * 5 + i) * 1.5); X.quadraticCurveTo(-12, -24, -8, -46 + b); X.closePath(); }, cel(-13, 0, 13, 0, '#2a5a48', '#0c1f18', .5));
    X.strokeStyle = '#e8e2cc'; X.lineWidth = 1.8; X.lineCap = 'round';
    for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(-5, -40 + i * 5 + b); X.quadraticCurveTo(0, -38 + i * 5 + b, 5, -40 + i * 5 + b); X.stroke(); }
    shape(() => X.rect(-8, -24 + b, 16, 4), '#3a2a1e', 1.2); circle(0, -22 + b, 2.6, '#efe8d2', 1);
    const [bx, by] = armTo(-4, -40 + b, 2.1 - P.cast * 1.4, 11, 4.5, '#16352b');
    glow(bx, by, 8 + Math.sin(P.T * 7) * 2, '#6fe0a8', .9);
    circle(-7, -44 + b, 5, '#efe8d2', 1.4);
    const hy = -54 + b;
    for (let i = 0; i < 3; i++) shape(() => { const x0 = -7 + i * 6; X.moveTo(x0 - 2, hy - 9); X.lineTo(x0, hy - 19 + (i === 1 ? -4 : 0)); X.lineTo(x0 + 2, hy - 9); X.closePath(); }, '#efe8d2', 1.2);
    shape(() => { X.moveTo(-12, hy + 12); X.quadraticCurveTo(-14, hy - 10, 0, hy - 12); X.quadraticCurveTo(13, hy - 10, 12, hy + 12); X.closePath(); }, cel(-14, 0, 13, 0, '#1f4a3c', '#0a1a14', .5));
    shape(() => X.ellipse(4, hy + 1, 6.5, 7.5, 0, 0, TAU), cel(-2, 0, 10, 0, '#f4eedc', '#bdb6a0', .55), 1.4);
    X.fillStyle = INK; X.beginPath(); X.ellipse(2.5, hy - .5, 2, 2.4, 0, 0, TAU); X.ellipse(7.5, hy - .5, 1.8, 2.2, 0, 0, TAU); X.fill();
    glowEye(2.5, hy - .5, '#6fe0a8', 1.1); glowEye(7.5, hy - .5, '#6fe0a8', 1);
    X.strokeStyle = INK; X.lineWidth = 1; for (let i = 0; i < 4; i++) { X.beginPath(); X.moveTo(1 + i * 2.2, hy + 5); X.lineTo(1 + i * 2.2, hy + 7.5); X.stroke(); }
    const a = aimAng(P, .45), [hx, hy2] = armTo(5, -40 + b, a, 12, 4.5, '#1f4a3c');
    X.save(); X.translate(hx, hy2); X.rotate(a - 1.35);
    limb(0, 20, 1, -30, 3, '#4a3a2a', .12);
    circle(1, -36, 5, '#efe8d2', 1.4); X.fillStyle = INK; X.fillRect(-1.5, -37, 1.5, 1.5); X.fillRect(1.8, -37, 1.5, 1.5);
    const fl = 6 + pull(P) * 8 + snap(P) * 5;
    glow(1, -44, fl * 3, '#6fe0a8'); X.fillStyle = '#d8ffe8'; X.beginPath(); X.moveTo(1, -44 - fl); X.quadraticCurveTo(5, -42, 1, -40); X.quadraticCurveTo(-3, -42, 1, -44 - fl); X.fill();
    X.restore();
    shards.filter(s => s[3] >= 0).forEach(s => boneShard(s[0], s[1], s[2]));
  },

  tink(P) { // Gearwright: small tinkerer, huge backpack, goggles, shoulder rocket tube
    const b = P.bob;
    X.save(); X.translate(0, 2);
    // backpack + chimney + gear
    shape(() => X.roundRect(-19, -44 + b, 13, 24, 3), cel(-19, 0, -6, 0, '#c9a45c', '#6d5327', .5), 1.6);
    shape(() => X.rect(-17, -54 + b, 4, 11), '#5a5a64', 1.2);
    for (let i = 0; i < 3; i++) { const k = ((P.T * .8 + i / 3) % 1); X.fillStyle = `rgba(200,200,210,${.5 * (1 - k)})`; X.beginPath(); X.arc(-15 - k * 6, -56 + b - k * 18, 2 + k * 4, 0, TAU); X.fill(); }
    X.save(); X.translate(-12, -32 + b); X.rotate(P.T * 3);
    shape(() => { for (let i = 0; i < 16; i++) { const r = i % 2 ? 5.5 : 7, aa = i / 16 * TAU; X.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } X.closePath(); }, '#8a8a94', 1.2);
    circle(0, 0, 2, '#3a3a44', 1);
    X.restore();
    feet(P, -17 + b, 5, 13, 5, '#c0702a', '#8a4e18', '#3a2410');
    // back arm + wrench
    const wa = 1.7 + Math.sin(P.T * 2) * .05, [wx, wy] = armTo(-3, -31 + b, wa, 9, 4, '#e8b890');
    X.save(); X.translate(wx, wy); X.rotate(wa - .2);
    limb(0, 0, 13, 0, 2.6, '#9aa2b4', 0);
    shape(() => { X.moveTo(12, -4); X.lineTo(18, -5); X.lineTo(17, -1.5); X.lineTo(14, -1.5); X.lineTo(14, 1.5); X.lineTo(17, 1.5); X.lineTo(18, 5); X.lineTo(12, 4); X.closePath(); }, '#b8c0cc', 1.2);
    X.restore();
    // body jumpsuit
    shape(() => X.roundRect(-8, -35 + b, 16, 19, 5), cel(-8, 0, 8, 0, '#ffa04a', '#b85a14', .5), 1.8);
    shape(() => X.rect(-8, -22 + b, 16, 3.5), '#5a3a20', 1.2);
    shape(() => X.rect(2, -21 + b, 5, 5), '#7a5030', 1);
    // head
    const hy = -45 + b, bounce = Math.sin(P.T * 6 + P.ph) * 2;
    for (const s of [-1, 1]) shape(() => X.ellipse(1 + s * 10, hy + 4 + bounce * (s > 0 ? 1 : -1), 3.5, 6, s * .5, 0, TAU), '#d8501e', 1.3);
    circle(1, hy, 10, cel(-8, 0, 10, 0, '#ffe2c4', '#e0b48e', .6), 1.8);
    shape(() => { X.moveTo(-9, hy + 1); X.quadraticCurveTo(-8, hy - 12, 2, hy - 11); X.quadraticCurveTo(12, hy - 10, 11, hy - 2); X.lineTo(7, hy - 5); X.lineTo(4, hy - 2); X.lineTo(1, hy - 6); X.quadraticCurveTo(-4, hy - 3, -9, hy + 1); X.closePath(); }, cel(0, hy - 12, 0, hy, '#ff7a3a', '#b03a10', .5), 1.5);
    X.strokeStyle = INK; X.lineWidth = 2.5; X.beginPath(); X.moveTo(-9, hy - 6); X.lineTo(11, hy - 7); X.stroke();
    for (const gx of [1, 7]) { circle(gx, hy - 7, 3.2, '#c9a45c', 1.4); X.fillStyle = '#8fe0ff'; X.beginPath(); X.arc(gx, hy - 7, 2, 0, TAU); X.fill(); X.fillStyle = '#fff'; X.fillRect(gx - 1, hy - 8.5, 1, 1); }
    animeEye(6, hy + 1.5, 3, '#3aa05a');
    X.strokeStyle = INK; X.lineWidth = 1; X.beginPath(); X.arc(7, hy + 5.5, 1.8, .2, 2.4); X.stroke();
    // shoulder rocket tube (front)
    const a = aimAng(P, -.25), rec = snap(P) * 4;
    X.save(); X.translate(2, -32 + b); X.rotate(a); X.translate(-rec, 0);
    shape(() => X.roundRect(-8, -4.5, 26, 9, 2), cel(0, -4.5, 0, 4.5, '#8a9aaa', '#4a5462', .5), 1.6);
    shape(() => X.rect(-10, -3, 3, 6), '#3a3a44', 1);
    shape(() => X.rect(17, -5, 4, 10), '#c9a45c', 1.2);
    if (pull(P) > 0) glow(22, 0, 6 + pull(P) * 10, '#ffb347');
    if (snap(P) > .5) { glow(24, 0, 16, '#ffe2a0', snap(P)); }
    X.restore();
    armTo(4, -30 + b, a + .6, 8, 4, '#e8b890');
    X.restore();
  },

  aur(P) { // Sunward Paladin: halo, winged helm, white cape, sun shield, lance
    const b = P.bob;
    X.save(); X.translate(-2, -58 + b); X.rotate(P.T * .4);
    X.strokeStyle = 'rgba(255,226,122,.75)'; X.lineWidth = 2; X.beginPath(); X.arc(0, 0, 15, 0, TAU); X.stroke();
    for (let i = 0; i < 12; i++) { X.rotate(TAU / 12); X.beginPath(); X.moveTo(17, 0); X.lineTo(i % 2 ? 21 : 24, 0); X.stroke(); }
    X.restore();
    glow(-2, -58 + b, 22, '#ffe27a', .35);
    const sway = Math.sin(P.T * 3 + P.ph) * 3 * (P.m + .3);
    shape(() => { X.moveTo(-6, -46 + b); X.quadraticCurveTo(-18, -30, -22 + sway, -3); X.lineTo(-8, -1); X.quadraticCurveTo(-5, -24, 4, -44 + b); X.closePath(); }, cel(-22, 0, -4, 0, '#fbf6ea', '#b8ae96', .45));
    // long golden hair
    shape(() => { X.moveTo(-2, -60 + b); X.quadraticCurveTo(-14, -52 + b, -12 + sway * .5, -34 + b); X.lineTo(-6, -38 + b); X.quadraticCurveTo(-6, -50 + b, 2, -54 + b); X.closePath(); }, cel(0, -60, 0, -34, '#fff0a8', '#d8a83a', .5), 1.5);
    feet(P, -22 + b, 6, 20, 6, '#f0c860', '#b88a2a', '#8a6420');
    // sun shield on back arm
    const sx = -2 - pull(P) * 2 + snap(P) * 3, sy = -32 + b;
    circle(sx, sy, 10, cel(sx - 10, 0, sx + 10, 0, '#fff0b0', '#c89a30', .5), 1.8);
    X.save(); X.translate(sx, sy); X.rotate(P.T);
    X.fillStyle = '#fffbe8'; X.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 2.5 : 6, aa = i / 16 * TAU; X.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } X.fill();
    X.restore();
    // torso
    shape(() => { X.moveTo(-9, -46 + b); X.lineTo(10, -46 + b); X.lineTo(8, -22 + b); X.lineTo(-8, -22 + b); X.closePath(); }, cel(-9, 0, 10, 0, '#fff0b0', '#c89a30', .5));
    shape(() => { X.moveTo(-3, -40 + b); X.lineTo(6, -40 + b); X.lineTo(5, -12 + b); X.lineTo(-2, -12 + b); X.closePath(); }, '#fbf6ea', 1.4);
    X.fillStyle = '#e8b030'; X.beginPath(); X.arc(1.5, -32 + b, 2.5, 0, TAU); X.fill();
    circle(8, -45 + b, 5.5, cel(3, 0, 13, 0, '#fff4c0', '#c89a30'), 1.6);
    // head + winged helm
    const hy = -55 + b;
    circle(2, hy, 9, cel(-7, 0, 11, 0, '#ffe6cc', '#e0b48e', .6), 1.8);
    animeEye(6, hy + 1.5, 3, '#e0a020');
    X.strokeStyle = INK; X.lineWidth = 1; X.beginPath(); X.moveTo(6, hy + 6); X.lineTo(8, hy + 6); X.stroke();
    shape(() => { X.moveTo(-8, hy - 1); X.quadraticCurveTo(-8, hy - 11, 2, hy - 11); X.quadraticCurveTo(12, hy - 11, 11, hy - 3); X.lineTo(4, hy - 4); X.quadraticCurveTo(-2, hy - 3, -8, hy - 1); X.closePath(); }, cel(-8, 0, 11, 0, '#fff0b0', '#c89a30', .5), 1.6);
    for (let i = 0; i < 3; i++) shape(() => { const yy = hy - 9 + i * 3; X.moveTo(-5, yy); X.quadraticCurveTo(-12 - i * 2, yy - 10 + i * 2, -20 + i * 2, yy - 12 + i * 3); X.quadraticCurveTo(-12, yy - 3, -5, yy + 2); X.closePath(); }, '#ffffff', 1.2);
    glow(3, hy - 9, 5, '#fff6c0', .8);
    // lance
    const a = meleeAng(P, .75), [hx, hy2] = armTo(5, -42 + b, a, 12, 6, '#f0c860');
    swoosh(5, -42 + b, 48, -2.35, a, '#ffe27a', snap(P));
    X.save(); X.translate(hx, hy2); X.rotate(a - .5);
    limb(-12, 0, 38, 0, 3, '#fbf6ea', 0);
    shape(() => { X.moveTo(36, -4); X.lineTo(50, 0); X.lineTo(36, 4); X.lineTo(38, 0); X.closePath(); }, cel(36, -4, 36, 4, '#ffffff', '#e8c860', .5), 1.4);
    shape(() => X.rect(30, -3.5, 4, 7), '#e8b030', 1);
    X.restore();
  },

  juro(P) { // Wandering Blade: straw hat, red coat, trailing scarf, iaido draw
    const b = P.bob;
    const len = 22 + P.m * 12;
    X.beginPath(); X.moveTo(-2, -46 + b);
    const tipY = -44 + b + Math.sin(P.T * 7) * 4;
    X.bezierCurveTo(-len * .4, -50 + b + Math.sin(P.T * 6) * 3, -len * .7, -40 + b, -len, tipY);
    X.lineTo(-len + 2, tipY + 5);
    X.bezierCurveTo(-len * .7, -35 + b, -len * .4, -43 + b, 0, -42 + b);
    X.closePath(); inkFill(cel(0, -50, 0, -35, '#ffe8ec', '#c8a8b0', .5), 1.5);
    feet(P, -20 + b, 7, 18, 5, '#2e2e44', '#1e1e30', '#3a2a20');
    shape(() => { X.moveTo(-7, -24 + b); X.lineTo(8, -24 + b); X.lineTo(12, -6 + b * .5); X.lineTo(-11, -6 + b * .5); X.closePath(); }, cel(-11, 0, 12, 0, '#3e3e5a', '#1e1e30', .5), 1.6);
    X.strokeStyle = 'rgba(0,0,0,.4)'; X.lineWidth = 1; for (const xx of [-4, 1, 6]) { X.beginPath(); X.moveTo(xx, -22 + b); X.lineTo(xx * 1.3, -7); X.stroke(); }
    // sheath
    X.lineCap = 'round'; for (const [c, w] of [[INK, 5], ['#2a1a18', 3]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(-14, -18 + b); X.lineTo(10, -28 + b); X.stroke(); }
    shape(() => X.rect(8, -30 + b, 3, 3), '#e8b030', 1);
    const bA = 1.9 + (P.windK > 0 ? -.4 * P.windK : 0);
    armTo(-4, -40 + b, bA, 11, 5, '#b02a3a', .15);
    // red coat with white trim
    shape(() => { X.moveTo(-9, -46 + b); X.lineTo(9, -46 + b); X.lineTo(10, -22 + b); X.lineTo(-10, -22 + b); X.closePath(); }, cel(-10, 0, 10, 0, '#e04858', '#7a1422', .5));
    X.strokeStyle = '#fbf6ea'; X.lineWidth = 2; X.beginPath(); X.moveTo(-2, -46 + b); X.lineTo(4, -30 + b); X.lineTo(-1, -22 + b); X.stroke();
    shape(() => X.rect(-10, -26 + b, 20, 4), '#1e1e30', 1.2);
    // head + straw hat
    const hy = -54 + b;
    shape(() => { X.moveTo(-4, hy - 2); X.quadraticCurveTo(-14, hy + 2, -16 + Math.sin(P.T * 5) * 2, hy + 10); X.lineTo(-11, hy + 8); X.quadraticCurveTo(-8, hy + 2, -3, hy + 3); X.closePath(); }, '#1a1418', 1.2);
    circle(2, hy + 1, 8.5, cel(-6, 0, 10, 0, '#f6d8bc', '#d0a888', .6), 1.8);
    X.save(); X.translate(5.5, hy + 2.5); X.scale(1, .6); animeEye(0, 0, 3, '#c0283a', 1); X.restore();
    X.strokeStyle = '#b02a3a'; X.lineWidth = 1; X.beginPath(); X.moveTo(-1, hy + 4); X.lineTo(1, hy + 8); X.stroke();
    shape(() => { X.moveTo(-17, hy - 2); X.lineTo(2, hy - 13); X.lineTo(21, hy - 2); X.quadraticCurveTo(2, hy + 1, -17, hy - 2); X.closePath(); }, cel(-17, hy - 13, 21, hy, '#f0d890', '#a8883a', .55), 1.8);
    X.strokeStyle = 'rgba(90,60,20,.6)'; X.lineWidth = .8; for (let i = 1; i < 5; i++) { X.beginPath(); X.moveTo(2, hy - 13); X.lineTo(-17 + i * 7.6, hy - 1.5); X.stroke(); }
    // blade: drawn from the sheath only while fighting
    const fighting = P.windK > 0 || P.swingK >= 0 || P.cast > 0;
    const a = fighting ? meleeAng(P, 1.1) : 2.4;
    const [hx, hy2] = armTo(5, -41 + b, fighting ? a : 2.5, fighting ? 12 : 9, 5, '#c83242', .12);
    if (fighting) {
      swoosh(5, -41 + b, 50, -2.35, a, '#ff9ab0', snap(P));
      X.save(); X.translate(hx, hy2); X.rotate(a - .5);
      shape(() => X.rect(-6, -1.8, 8, 3.6), '#2a1a18', 1);
      shape(() => X.ellipse(2.5, 0, 1.6, 4, 0, 0, TAU), '#e8b030', 1);
      shape(() => { X.moveTo(4, -1.6); X.quadraticCurveTo(24, -4, 44, -3.5); X.lineTo(47, -2); X.quadraticCurveTo(24, 1.4, 4, 1.6); X.closePath(); }, cel(0, -3, 0, 2, '#ffffff', '#c8ccd8', .5), 1.3);
      X.restore();
    }
  },
});

/* ---------------- pet models (shared by both teams, tinted by team ring) ---------------- */
for (const team of [0, 1]) Object.assign(MRIG[team], {
  thrall(P, m) {
    const b = P.bob;
    if (m && m.empowered) glow(0, -18, 22, '#6fe0a8', .5);
    feet(P, -11 + b, 4, 10, 2.6, '#efe8d2', '#bdb6a0', '#8a8470');
    shape(() => X.rect(-1, -24 + b, 2, 12), '#efe8d2', 1.2);
    X.strokeStyle = '#efe8d2'; X.lineWidth = 1.8; for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(-5, -22 + i * 3 + b); X.quadraticCurveTo(0, -20 + i * 3 + b, 5, -22 + i * 3 + b); X.stroke(); }
    const hy = -29 + b;
    circle(1, hy, 6, cel(-5, 0, 7, 0, '#f4eedc', '#bdb6a0', .55), 1.5);
    X.fillStyle = INK; X.beginPath(); X.arc(2.5, hy - .5, 1.6, 0, TAU); X.arc(-.5, hy - .5, 1.4, 0, TAU); X.fill();
    glowEye(2.5, hy - .5, '#6fe0a8', .9);
    shape(() => X.rect(-1, hy + 3, 6, 2.5), '#efe8d2', 1);
    const a = meleeAng(P, .9), [hx, hy2] = armTo(2, -22 + b, a, 7, 2.4, '#efe8d2');
    swoosh(2, -22 + b, 20, -2.35, a, '#6fe0a8', snap(P));
    X.save(); X.translate(hx, hy2); X.rotate(a - .5);
    shape(() => { X.moveTo(1, -1.5); X.lineTo(14, -1); X.lineTo(15, 1); X.lineTo(1, 1.5); X.closePath(); }, '#8a7a6a', 1.1);
    X.restore();
  },
  turretT(P, m) {
    const rec = snap(P) * 3;
    X.lineCap = 'round';
    for (const [x1] of [[-10], [10], [0]]) limb(0, -14, x1, 0, 2.5, '#5a5a64', 0);
    shape(() => X.ellipse(0, -16, 9, 5, 0, 0, TAU), cel(-9, 0, 9, 0, '#c9a45c', '#6d5327'), 1.5);
    const a = aimAng(P, 0);
    X.save(); X.translate(0, -20); X.rotate(a); X.translate(-rec, 0);
    shape(() => X.roundRect(-6, -5, 20, 10, 3), cel(0, -5, 0, 5, '#9aa8b8', '#4a5462', .5), 1.6);
    shape(() => X.rect(13, -3.5, 5, 7), '#3a3a44', 1.2);
    if (pull(P) > 0) glow(18, 0, 4 + pull(P) * 8, '#ffb347');
    X.restore();
    const col = m ? TEAMCOL[m.team] : '#ffb347';
    limb(-7, -18, -7, -34, 1.4, '#3a3a44', 0);
    shape(() => { X.moveTo(-7, -34); X.lineTo(1, -31 + Math.sin(P.T * 6) * 1.2); X.lineTo(-7, -28); X.closePath(); }, col, 1);
    const lifeK = m ? Math.max(0, m.life) / 15 : 1;
    X.fillStyle = '#ffb347'; X.fillRect(-8, -9, 16 * Math.min(1, lifeK), 2);
  },
});

/* ---------------- champion-select playstyle notes ---------------- */
const PLAY = {
  kael: { play: ['Frontline engager: soak tower shots and minion aggro so your carries can hit freely.', "Open fights with Titan's Fall onto two or more enemies, then Shield Bash whoever runs.", 'Build armor and health, and raise Iron Bulwark right as their burst lands.'] },
  vesp: { play: ['Stay at long range: poke with Arc Bolt and clear waves with Static Field.', 'Save Blink for escapes. You are fragile if you get caught.', 'Drop Tempest on clumped enemies or in narrow jungle paths.'] },
  nyx: { play: ["Roam, don't farm: hunt isolated or wounded champions and pick them off.", 'Veil to close in unseen, Shadowstep through them, then finish with Death Mark. It hits harder the lower they are.', 'Snowball: after a kill, keep moving while healthy. Avoid 1v2s and enemy towers.'] },
  oryn: { play: ['Duo-lane with a partner and leave minion kills to them. Tithe pays you anyway.', 'Land Thorn Snare to set up kills. Rejuvenate when allies dip; it also hurts enemies close to you.', 'Sanctuary wins teamfights: grow it under your frontline.'],
    passive: [['Tithe', '+3 gold per second.'], ['Thornseed', 'attacks deal 12 (+25% power) bonus magic damage.'], ['Bounty', 'allies fighting near you earn 25% more gold from minions.']] },
  brak: { play: ['Win side-lane duels: Cleave heals you through every trade.', 'Hook a priority target into your team, then War Cry so everyone can chase.', 'Pop Bloodrage in long brawls. You outlast most champions.'] },
  sylv: { play: ['Your attacks topple towers fastest: farm safely, then siege behind your minions.', 'Tumble away from divers and line up Piercing Arrow through several enemies.', "Snipe wounded champions from across the map with Hunter's Barrage."] },
  mar: { play: ['Keep thralls up in lane. They push waves and soak tower shots.', 'Slow with Grave Chill, then land Bone Spear. Stay behind your summons.', 'Bone Legion wins skirmishes: pick fights around objectives while it is ready.'] },
  tink: { play: ['Fight inside your setup: turrets and mines zone enemies out of the open.', 'Drop mines under towers and at chokepoints to root divers. Clear waves with Rocket Salvo.', 'Mega Mortar reaches very far: finish fleeing enemies or soften a teamfight.'] },
  aur: { play: ["Stay near your most vulnerable ally. Guardian's Oath takes a share of their damage.", 'Hallowed Charge stuns the first champion hit: use it to start a fight or peel a diver.', 'Sunwall halves damage for allies inside. Drop it the moment the enemy commits.'],
    passive: [['Tithe', '+1.8 gold per second.'], ['Sunforged', 'attacks deal bonus magic damage equal to 2.5% of her max health.']] },
  juro: { play: ['A strong 1v1 champion: take side-lane trades and punish anyone who overextends.', 'Riposte right before a big hit to parry and stun. Flowing Step makes your next attack a guaranteed critical strike.', 'Kills reset Rising Draw: chain through low targets, and use Hundred Petals to dodge damage.'] },
};
for (const id in PLAY) Object.assign(HERO[id], PLAY[id]);
