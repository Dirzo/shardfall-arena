
/* =========================================================
   SIMULATION
   ========================================================= */
const RUNES = {
  haste: { name: 'Haste', color: '#ffe066', t: 15, text: '+55% move speed' },
  dd: { name: 'Fury', color: '#ff5a48', t: 20, text: '+50% damage' },
  regenRune: { name: 'Renewal', color: '#7dff9a', t: 8, text: 'rapid regeneration' },
  arcane: { name: 'Arcana', color: '#c08cff', t: 25, text: '+30% cooldown reduction' },
  bounty: { name: 'Bounty', color: '#f3d892', t: 0, text: '+120 gold' },
};
const ALTAR_CAP = 9;
function update(dt) {
  if (!G || G.paused) return;
  G.t += dt;
  // day / night (4 min cycle, night 150→240)
  const cyc = G.t % 240, isNight = cyc > 150;
  G.night += ((isNight ? 1 : 0) - G.night) * Math.min(1, dt * .4);
  if (isNight !== G.nightState) { G.nightState = isNight; announce(isNight ? 'Night falls' : 'Dawn breaks', isNight ? 'Sight shrinks · monsters strike 20% harder' : 'The rift wakes to light'); }
  if (G.t >= G.nextWave) { spawnWave(); G.nextWave += 30; }
  for (const c of G.camps) {
    if (!c.units.length && G.t >= c.next) {
      c.mem.forEach((ty, i) => { const a = i / c.mem.length * TAU + .6; const m = spawnMonster(ty, c.x + (i ? Math.cos(a) * 50 : 0), c.y + (i ? Math.sin(a) * 50 : 0)); m.camp = c; c.units.push(m); });
    }
  }
  if (!G.drake.unit && G.t >= G.drake.next) {
    const e = G.drake.elem;
    G.drake.unit = spawnMonster('drake', PIT_DRAKE.x, PIT_DRAKE.y, { elem: e, color: DRAKECOL[e], name: e + ' Drake' });
    announce(`The ${e} Drake awakens`, 'Southern river pit — ' + drakeBonusText(e) + ' for the team that slays it');
    addFeed(`<span class="n">${e} Drake</span> has spawned`);
  }
  if (!G.voidmaw.unit && G.t >= G.voidmaw.next) {
    G.voidmaw.unit = spawnMonster('voidmaw', PIT_VOID.x, PIT_VOID.y);
    announce('Voidmaw has emerged', 'Northern pit — its hand empowers your minions');
    addFeed(`<span class="n">Voidmaw</span> has emerged`);
    SFX.play('horn');
  }
  // altars (capture by standing uncontested for 4s)
  if (!G.altarAnn && G.t >= 150) { G.altarAnn = true; announce('The altars awaken', 'Stand on an altar for 9s to claim it — more allies claim it faster'); }
  for (const A of G.altars) {
    if (G.t < A.unlock) { A.prog = [0, 0]; continue; }
    const n = [heroesNear(0, A.x, A.y, 150).length, heroesNear(1, A.x, A.y, 150).length];
    for (const tm of [0, 1]) {
      if (A.owner === tm) { A.prog[tm] = 0; continue; }
      if (n[tm] && !n[1 - tm]) A.prog[tm] += dt * (1 + .5 * (n[tm] - 1)); else if (!n[tm]) A.prog[tm] = Math.max(0, A.prog[tm] - dt);
      if (A.prog[tm] >= ALTAR_CAP) {
        A.owner = tm; A.prog = [0, 0]; A.unlock = G.t + 90;
        heroesNear(tm, 0, 0, 99999).forEach(h => giveGold(h, 80));
        burst(A.x, A.y, TEAMCOL[tm], 50, 420, 14, 1.1); ring(A.x, A.y, TEAMCOL[tm], 160, .8, 8);
        const good = G.player && tm === G.player.team, both = G.altars.every(a => a.owner === tm);
        announce(good ? `${A.name} claimed` : `Enemy claimed the ${A.name}`, both ? `${TEAMNAME[tm]} hold both altars — kills restore 1% max health` : `${TEAMNAME[tm]} gain 10% move speed · 80 gold each`, good ? 'blue' : 'red');
        addFeed(`<span class="${tm ? 'e' : 'a'}">${TEAMNAME[tm]}</span> claimed the <span class="n">${A.name}</span>`);
        SFX.play('rune');
      }
    }
  }
  // heartwood relic
  const Rl = G.relic;
  if (!Rl.up && G.t >= Rl.next) Rl.up = true;
  if (Rl.up) {
    const h = G.heroes.find(h => !h.dead && Math.hypot(h.x - Rl.x, h.y - Rl.y) < 60);
    if (h) {
      Rl.up = false; Rl.next = G.t + 90;
      heal(h, h.maxHp * .22, h); h.mana = Math.min(h.maxMana, h.mana + h.maxMana * .22); buff(h, 'regenRune', 4);
      burst(Rl.x, Rl.y, '#9dff8a', 30, 260, 12, .9); ring(Rl.x, Rl.y, '#9dff8a', 90, .6, 5);
      if (h === G.player) { announce('Heartwood relic', 'Restored 22% health and mana', 'blue'); SFX.play('rune'); }
    }
  }
  // speed shrine
  for (const h of G.heroes) {
    if (h.dead || (h.shrineCd || 0) > G.t) continue;
    for (const sp of [SPEED_SHRINE]) if (Math.hypot(h.x - sp.x, h.y - sp.y) < 95) { buff(h, 'shrine', 4); h.shrineCd = G.t + 15; ring(sp.x, sp.y, '#8ff0e0', 100, .5, 5); if (h === G.player) SFX.play('blink'); }
  }
  G.objT -= dt;
  if (G.objT <= 0) { G.objT = 6; teamBrain(0); teamBrain(1); }
  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }

  for (const u of G.units) {
    u.bush = -1;
    if (!u.dead && !isStruct(u)) for (let i = 0; i < BUSHES.length; i++) { const b = BUSHES[i]; if (Math.abs(u.x - b.x) < b.r && Math.hypot(u.x - b.x, u.y - b.y) < b.r) { u.bush = i; break; } }
    const px = u.x, py = u.y;
    updUnit(u, dt);
    if (u.kind === 'hero') { u.vel = { x: (u.x - px) / dt, y: (u.y - py) / dt }; }
  }
  updProjectiles(dt);
  updZones(dt);
  separate();
  G.units = G.units.filter(u => !(u.dead && (u.kind === 'minion' || u.kind === 'monster') && u.deadT > 1.2));
  for (const p of G.parts) {
    if (p.kind === 'coin') { updCoin(p, dt); continue; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60); p.vy += p.grav * dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= .96; }
  G.texts = G.texts.filter(t => t.life > 0);
  for (const m of G.marks) m.t -= dt;
  G.marks = G.marks.filter(m => m.t > 0);
  G.shake *= Math.pow(.02, dt);
  computeVision();
}

function unitSpeed(u) {
  let sl = 0; for (const s of u.slows) sl = Math.max(sl, s.a);
  const base = u.kind === 'hero' ? u.s.ms * u.s.msMult : u.ms;
  return base * (1 - sl);
}
function moveToward(u, tx, ty, dt, sp) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, sp * dt), nx = u.x + dx / d * step, ny = u.y + dy / d * step;
  if (walk(nx, ny)) { u.x = nx; u.y = ny; } else if (walk(nx, u.y)) u.x = nx; else if (walk(u.x, ny)) u.y = ny;
  u.face = Math.atan2(dy, dx); u.moving = true; u.anim += dt * sp / 30;
  return step >= d - .5;
}
function follow(u, dt) {
  if (!u.path.length) return;
  const p = u.path[0];
  if (moveToward(u, p.x, p.y, dt, unitSpeed(u))) u.path.shift();
}

function updUnit(u, dt) {
  if (u.dead) { u.deadT += dt; if (u.kind === 'hero') { u.respawn -= dt; if (u.respawn <= 0 && !G.over) respawnHero(u); } return; }
  u.atkCd -= dt; u.swing = Math.max(0, u.swing - dt); u.hitT -= dt; u.revealT -= dt; u.moving = false;
  if (u.stun > 0) u.stun -= dt; if (u.root > 0) u.root -= dt; if (u.kup > 0) u.kup -= dt; if (u.stealth > 0) u.stealth -= dt;
  if (u.slows.length) { for (const s of u.slows) s.t -= dt; u.slows = u.slows.filter(s => s.t > 0); }
  if (u.shields.length) { for (const s of u.shields) s.t -= dt; u.shields = u.shields.filter(s => s.t > 0); }
  if (u.dots.length) {
    for (const d of u.dots) { d.t -= dt; d.acc += dt; if (d.acc >= .5) { d.acc -= .5; damage(d.src, u, d.dps * .5, { dot: 1, abil: 1 }); if (u.dead) return; if (Math.random() < .6) part({ x: u.x + rnd(-10, 10), y: u.y - 10, vy: -40, color: d.col || '#ff7a3a', size: 7, life: .5, max: .5 }); } }
    u.dots = u.dots.filter(d => d.t > 0);
  }
  for (const k in u.buffs) { const b = u.buffs[k]; b.t -= dt; if (b.t <= 0) delete u.buffs[k]; }
  if (u.hpLag === undefined || u.hp > u.hpLag) u.hpLag = u.hp; else u.hpLag += (u.hp - u.hpLag) * Math.min(1, dt * 2.2);
  if (u.wind) {
    const w = u.wind, t = w.tgt;
    if (u.stun > 0 || u.kup > 0 || u.dash || u.casting || t.dead || t.reset || Math.hypot(t.x - u.x, t.y - u.y) > u.range + t.r + 90) { u.wind = null; u.atkCd = Math.min(u.atkCd, .15); }
    else {
      w.t += dt; u.face = Math.atan2(t.y - u.y, t.x - u.x);
      if (w.t >= w.dur) { u.wind = null; fireAttack(u, t); }
      else if (u.kind !== 'hero') return;
    }
  }
  if (u.dash) { doDash(u, dt); return; }
  switch (u.kind) {
    case 'hero': updHero(u, dt); break;
    case 'minion': updMinion(u, dt); break;
    case 'monster': updMonster(u, dt); break;
    case 'tower': case 'ancient': updTower(u, dt); break;
  }
}

function doDash(u, dt) {
  const d = u.dash;
  d.total = d.total || d.left;
  const step = Math.min(d.left, d.speed * dt);
  const nx = u.x + d.dx * step, ny = u.y + d.dy * step;
  if (!d.ghost && !walk(nx, ny)) d.left = 0;
  else { u.x = nx; u.y = ny; d.left -= step; }
  if (d.trail && Math.random() < .9) part({ x: u.x + rnd(-8, 8), y: u.y + rnd(-8, 8), color: d.trail, size: 16, life: .35, max: .35 });
  if (d.onPass) {
    for (const f of foes(u.team, u.x, u.y, u.r + 12)) {
      if (d.hit.has(f)) continue; d.hit.add(f);
      if (d.onPass(f) === 'stop') { d.left = 0; break; }
    }
  }
  if (d.left <= 0) { u.dash = null; if (d.onEnd) d.onEnd(); if (!walk(u.x, u.y)) { const p = nearestWalkable(u.x, u.y); u.x = p.x; u.y = p.y; } }
}

function updHero(h, dt) {
  calcStats(h);
  const s = h.s;
  h.hp = Math.min(h.maxHp, h.hp + s.regen * dt);
  h.mana = Math.min(h.maxMana, h.mana + s.manaRegen * dt);
  const f = FOUNT[h.team], ef = FOUNT[1 - h.team];
  if (Math.hypot(h.x - f.x, h.y - f.y) < 280) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .15 * dt); h.mana = Math.min(h.maxMana, h.mana + h.maxMana * .15 * dt); }
  if (Math.hypot(h.x - ef.x, h.y - ef.y) < 300) damage(null, h, 500 * dt, { true: 1 });
  if (h.buffs.potion) h.hp = Math.min(h.maxHp, h.hp + 10 * dt);
  if (h.undo.length && !atShop(h)) h.undo = [];
  if (s.aura) {
    h.auraT = (h.auraT || 0) - dt;
    if (h.auraT <= 0) { h.auraT = 1; const bonus = Math.max(0, h.maxHp - (h.def.stats.hp + h.def.stats.hpG * (h.level - 1))); for (const u of foes(h.team, h.x, h.y, 330)) damage(h, u, s.aura + bonus * .01, { magic: 1, dot: 1 }); if (Math.random() < .5) ring(h.x, h.y, '#ff7a3a', 330, .5, 2); }
  }
  if (G.t > 20) { h.gold += (3.4 + s.goldPs) * dt; giveXp(h, 2 * dt); }
  for (const k in h.cds) if (h.cds[k] > 0) h.cds[k] -= dt;
  h.gateCd -= dt;
  if (h.stasis > G.t) { h.path = []; h.moving = false; return; }
  if (h.channel) {
    const c = h.channel; c.t += dt;
    if (c.kind === 'recall' && Math.random() < .5) part({ x: h.x + rnd(-20, 20), y: h.y + rnd(-5, 10), vy: -120, color: '#8fc4ff', size: 10, life: .6, max: .6 });
    if (c.kind === 'gate' && Math.random() < .6) part({ x: h.x + rnd(-24, 24), y: h.y + rnd(-10, 10), vy: -90, color: '#e2b8ff', size: 10, life: .5, max: .5 });
    if (c.t >= c.max) {
      h.channel = null;
      if (c.kind === 'recall') { burst(h.x, h.y, '#8fc4ff', 24, 200, 10); h.x = f.x + (h.team ? -30 : 30); h.y = f.y + rnd(-40, 40); buff(h, 'homeguard', 6); ring(h.x, h.y, '#8fc4ff', 70); if (h === G.player) { G.cam.free = false; SFX.play('blink'); } }
      if (c.kind === 'gate') { const g2 = GATES[c.gate.to]; burst(h.x, h.y, '#e2b8ff', 24, 220, 10); h.x = g2.x + (g2.x < W / 2 ? 60 : -60); h.y = g2.y; h.gateCd = 12; burst(h.x, h.y, '#e2b8ff', 24, 220, 10); if (h === G.player) { G.cam.free = false; SFX.play('blink'); } }
    }
    return;
  }
  if (h.stun > 0 || h.kup > 0) return;
  if (h.casting) { castTick(h, dt); if (h.casting) return; }
  if (h.queued && !h.casting && !h.dash) { const q = h.queued; h.queued = null; if (G.t < q.until) cast(h, q.key, q.tx, q.ty); if (h.casting) return; }
  if (h.ai) aiHero(h, dt); else playerThink(h, dt);
  heroAct(h, dt);
  if (!h.ai && !h.path.length && !h.attackTarget && h.gateCd <= 0 && !h.channel) {
    for (const g of GATES) if (Math.hypot(h.x - g.x, h.y - g.y) < 50) { h.channel = { kind: 'gate', t: 0, max: 1.2, gate: g, name: 'Leyline gate' }; break; }
  }
}
function heroAct(h, dt) {
  if (h.wind) return;
  const t = h.attackTarget;
  if (t) {
    if (t.dead || t.reset || (!t.vis[h.team] && !isStruct(t)) || (isStruct(t) && structProtected(t)) || t.team === h.team) { h.attackTarget = null; }
    else {
      const d = dist(h, t);
      if (d <= h.range + t.r) { h.path = []; attack(h, t); }
      else if (h.root <= 0) {
        if (!h.chaseT || G.t > h.chaseT) { h.path = findPath(h.x, h.y, t.x, t.y); h.chaseT = G.t + .3; }
        follow(h, dt);
      }
      return;
    }
  }
  if (h.path.length && h.root <= 0) follow(h, dt);
}
function attack(u, t) {
  u.face = Math.atan2(t.y - u.y, t.x - u.x);
  if (u.atkCd > 0 || u.wind) return;
  u.atkCd = 1 / u.as;
  const dur = u.kind === 'hero' ? clamp(.26 / Math.max(.5, u.as), .13, .36) : isStruct(u) ? .42 : u.boss ? .45 : u.kind === 'monster' ? .32 : .28;
  u.wind = { t: 0, dur, tgt: t };
}
// windup pose: -1 (fully cocked) .. +1 (strike), 0 = rest
function atkPose(u) {
  if (u.wind) return -Math.min(1, u.wind.t / u.wind.dur);
  if (u.swing > 0) { const k = 1 - u.swing / .28; return k < .22 ? lerp(-1, 1, k / .22) : lerp(1, 0, (k - .22) / .78); }
  if (u.casting) return -Math.min(1, u.casting.t / u.casting.dur) * .8;
  return 0;
}
function fireAttack(u, t) {
  u.swing = .28;
  if (u.kind === 'hero') { reveal(u, 1); if (u.stealth > 0) { u.stealth = 0; delete u.buffs.veil; } }
  if (u.ranged || isStruct(u)) {
    const style = isStruct(u) ? 'tower' : u.kind === 'hero' ? ({ vesp: 'orbzap', sylv: 'arrowb', oryn: 'seed', mar: 'soul', tink: 'shell' }[u.def.id] || 'hbolt') : u.mtype === 'voidmaw' ? 'void' : u.mtype === 'drake' ? 'fire' : u.kind === 'monster' ? 'orb' : u.mtype === 'siege' || u.mtype === 'turretT' ? 'cannon' : 'orb';
    const col = u.kind === 'hero' ? u.def.c1 : u.team < 2 ? TEAMCOL[u.team] : u.color;
    const sy = isStruct(u) ? (u.kind === 'tower' ? -78 : -90) : 0;
    const px = u.x + Math.cos(u.face) * u.r * 1.3, py = u.y + Math.sin(u.face) * u.r * 1.3 + sy;
    G.projs.push({ homing: t, x: px, y: py, speed: isStruct(u) ? 950 : 1000, owner: u, team: u.team, style, color: col, onHit: () => onAttackHit(u, t) });
    part({ x: px, y: py, color: col, size: isStruct(u) ? 50 : u.kind === 'hero' ? 30 : 18, life: .14, max: .14 });
    if (isStruct(u)) part({ kind: 'beam', x: px, y: py, x2: t.x, y2: t.y, color: col, w: 4, life: .12, max: .12 });
    if (u === G.player) SFX.play('shoot');
  } else {
    onAttackHit(u, t);
    if (u === G.player) SFX.play('swing');
  }
}
function onAttackHit(u, t) {
  if (t.dead) return;
  if (t.buffs && t.buffs.parry && !isStruct(u) && t.kind === 'hero') {
    const pr = t.buffs.parry.r || 1; delete t.buffs.parry;
    damage(t, u, 30 + 30 * pr + .8 * t.power, { abil: 1 }); stunU(u, .75);
    if (hasCap(t, 1)) heal(t, t.maxHp * .1, t);
    part({ kind: 'star', x: t.x, y: t.y - 36, color: '#ffffff', size: 40, pts: 4, rot: 0, life: .3, max: .3 }); callout(t, 'PARRY', '#ffffff');
    if (t === G.player || u === G.player) { SFX.play('clang'); G.hitstop = Math.max(G.hitstop || 0, .08); }
    return;
  }
  let dmg = u.kind === 'hero' ? u.atk : u.power; const o = { atk: 1 };
  let extra = 0;
  if (u.kind === 'hero') {
    if (u.ambush && G.t < u.ambush) { dmg *= 1.5; u.ambush = 0; o.crit = 1; burst(t.x, t.y, '#b36bff', 14, 220, 10); }
    if (u.sblade && G.t < u.sblade) {
      const r = u.s.spellblade || 0, baseAd = u.def.stats.power + u.def.stats.powerG * (u.level - 1);
      extra += 25 * r + .2 * r * u.power + u.s.itemBlade * baseAd; u.sblade = 0; ring(t.x, t.y, '#b58cff', 44, .35, 5);
    }
    if (u.buffs.tumble) { dmg += u.buffs.tumble.v; delete u.buffs.tumble; o.crit = 1; }
    if (u.buffs.flow) { dmg = (dmg + u.buffs.flow.v) * (1 + u.s.critDmg); delete u.buffs.flow; o.crit = 1; petalBurst(t.x, t.y - 20, 10); }
    u.atkCount++;
    if (u.def.id === 'sylv' && hasCap(u, 0) && u.atkCount % 4 === 0) { dmg *= 2; o.crit = 1; }
    if (u.s.crit && !isStruct(t) && Math.random() < u.s.crit) { dmg *= 1 + u.s.critDmg; o.crit = 1; } // structures can't be crit
    extra += u.s.onhit + Math.min(t.kind === 'hero' ? 9999 : 60, u.s.onhitPct * t.hp);
    if (u.def.id === 'oryn') extra += 12 + .25 * u.power; // Thornseed
    else if (u.def.id === 'aur') extra += .025 * u.maxHp; // Sunforged
    if (u.buffs.venom) { t.dots = t.dots.filter(d => !(d.src === u && d.tag === 'venom')); t.dots.push({ src: u, dps: u.buffs.venom.dps, t: 3, acc: 0, col: '#7dff6a', tag: 'venom' }); }
    if (u.buffs.ember) { t.dots = t.dots.filter(d => !(d.src === u && d.tag === 'ember')); t.dots.push({ src: u, dps: 8 + 3 * u.level, t: 3, acc: 0, col: '#ff7a3a', tag: 'ember' }); slowU(t, .12, 1); }
  }
  if (t.s && t.s.atkDr) dmg *= 1 - t.s.atkDr;
  if (t.s && t.s.thorns && !isStruct(u) && !t.dead) { damage(t, u, t.s.thorns + t.armor * .1, { magic: 1, dot: 1 }); if (t.s.antiheal & 1) u.gwT = G.t + 3; }
  if (extra > 0) after(0, () => damage(u, t, extra, { magic: 1 }));
  if (u.kind === 'monster' && G.night > .5) dmg *= 1.2;
  if (isStruct(u)) dmg *= 1 + G.t / 900;
  damage(u, t, dmg, o);
  const hc = u.kind === 'hero' ? u.def.c1 : u.team < 2 ? TEAMCOL[u.team] : u.color || '#fff';
  const ang = Math.atan2(t.y - u.y, t.x - u.x);
  if (u.kind === 'hero') heroImpact(u, t, o.crit);
  else if (!u.ranged && !isStruct(u)) part({ kind: 'slash', x: t.x, y: t.y - 6, ang, size: t.r + (u.kind === 'hero' || u.boss ? 18 : 10), color: hc, w: u.kind === 'hero' || u.kind === 'monster' ? 8 : 4, life: .24, max: .24, flip: (u.atkCount || 0) % 2 });
  else part({ kind: 'ring', x: t.x, y: t.y - 4, color: hc, size: t.r + 10, life: .22, max: .22, w: 3 });
  part({ x: t.x + rnd(-6, 6), y: t.y + rnd(-6, 6), color: hc, size: u.kind === 'hero' ? 26 : 14, life: .18, max: .18 });
}

function autoTarget(h) {
  let best = null, bs = 1e9;
  for (const u of G.units) {
    if (u.dead || u.team === h.team || u.reset || !u.vis[h.team]) continue;
    const d = dist(h, u); if (d > h.range + u.r + 10) continue;
    if (u.kind === 'monster' && !(u.aggro && u.aggro.team === h.team)) continue;
    if (isStruct(u) && structProtected(u)) continue;
    const pri = u.kind === 'hero' ? 0 : u.kind === 'minion' ? 1000 : u.kind === 'monster' ? 1500 : 2000;
    if (pri + d < bs) { bs = pri + d; best = u; }
  }
  return best;
}
function playerThink(h, dt) {
  if (h.amove && !h.attackTarget) {
    let t = null, bd = 1e9;
    for (const u of G.units) { if (u.dead || u.team === h.team || u.reset || !u.vis[h.team] || (isStruct(u) && structProtected(u)) || (u.kind === 'monster' && !(u.aggro && u.aggro.team === h.team))) continue; const d = dist(h, u) + (u.kind === 'hero' ? -80 : 0); if (d < h.range + u.r + 260 && d < bd) { bd = d; t = u; } }
    if (t) { h.attackTarget = t; h.autoAcq = false; h.path = []; }
    else if (!h.path.length) { if (Math.hypot(h.amove.x - h.x, h.amove.y - h.y) > 40) h.path = findPath(h.x, h.y, h.amove.x, h.amove.y); else h.amove = null; }
  }
  if (h.hold) { h.path = []; if (h.attackTarget && dist(h, h.attackTarget) > h.range + h.attackTarget.r + 5) h.attackTarget = null; }
  if (Input.down && !G.armed && G.t > Input.nextRepeat) { issueOrder(Input.wx, Input.wy, true); Input.nextRepeat = G.t + .18; }
  if (h.attackTarget && h.autoAcq && dist(h, h.attackTarget) > h.range + h.attackTarget.r + 30) h.attackTarget = null;
  if (!h.attackTarget && !h.path.length) { const t = autoTarget(h); if (t) { h.attackTarget = t; h.autoAcq = true; } }
}
function unitAt(wx, wy, team) {
  let best = null, bd = 1e9;
  for (const u of G.units) {
    if (u.dead || u.team === team || !u.vis[team]) continue;
    const cy = isStruct(u) ? u.y - 30 : u.kind === 'hero' || u.kind === 'minion' ? u.y - unitTop(u) * .45 : u.y;
    const d = Math.hypot(u.x - wx, cy - wy);
    if (d < u.r + (u.kind === 'hero' ? 26 : 16) && d < bd) { bd = d; best = u; }
  }
  return best;
}
function issueOrder(wx, wy, repeat) {
  const h = G.player; if (!h || h.dead || G.over) return;
  const u = unitAt(wx, wy, h.team);
  if (u && !(isStruct(u) && structProtected(u))) {
    if (h.attackTarget !== u) { h.attackTarget = u; h.autoAcq = false; h.path = []; h.wind = null; }
    if (!repeat) G.marks.push({ x: u.x, y: u.y, t: .4, col: '#ff5a48', r: u.r + 10 });
  } else {
    h.attackTarget = null; h.autoAcq = false; h.channel = null; h.wind = null; h.hold = false;
    if (!repeat) h.amove = null;
    const last = h.path[h.path.length - 1];
    if (!repeat || !last || Math.hypot(last.x - wx, last.y - wy) > 30) h.path = findPath(h.x, h.y, wx, wy);
    if (!repeat) G.marks.push({ x: wx, y: wy, t: .45, col: '#9be870', r: 22 });
  }
}

function pickMinionTarget(m) {
  let best = null, bs = 1e9;
  for (const u of G.units) {
    if (u.dead || u.team === m.team || u.team === 2 || !u.vis[m.team] || u.reset) continue;
    const d = Math.hypot(u.x - m.x, u.y - m.y); if (d > 440 + u.r) continue;
    let pri;
    if (u.kind === 'hero') pri = (G.t - (u.aggroHeroT || -9) < 2) ? 0 : 3000;
    else if (u.kind === 'minion') pri = 1000;
    else { if (structProtected(u)) continue; pri = 4000; }
    if (pri + d < bs) { bs = pri + d; best = u; }
  }
  return best;
}
function updMinion(m, dt) {
  if (m.pet) { updPet(m, dt); return; }
  if (m.stun > 0 || m.kup > 0) return;
  m.retT = (m.retT || 0) - dt;
  const t = m.target;
  if (!t || t.dead || m.retT <= 0 || !t.vis[m.team] || dist(m, t) > 560) { m.target = pickMinionTarget(m); m.retT = .6; }
  const T = m.target;
  if (T) {
    if (dist(m, T) <= m.range + T.r + m.r) attack(m, T);
    else if (m.root <= 0) { const bx = m.x, by = m.y; moveToward(m, T.x, T.y, dt, unitSpeed(m)); m.prog += Math.hypot(m.x - bx, m.y - by) * .5; }
    return;
  }
  if (m.root > 0) return;
  const wp = m.lpath[m.wp];
  if (!wp) return;
  const bx = m.x, by = m.y;
  if (moveToward(m, wp[0], wp[1], dt, unitSpeed(m)) || Math.hypot(m.x - wp[0], m.y - wp[1]) < 64) m.wp = Math.min(m.wp + 1, m.lpath.length - 1);
  m.prog += Math.hypot(m.x - bx, m.y - by);
}

function updTower(t, dt) {
  const sc = G.t;
  t.retT = (t.retT || 0) - dt;
  const inR = u => !u.dead && Math.hypot(u.x - t.x, u.y - t.y) <= t.range + u.r;
  let T = t.target;
  if (T && (!inR(T) || T.reset || (T.kind === 'hero' && !T.vis[t.team]))) T = t.target = null;
  if (t.retT <= 0) {
    t.retT = .25;
    // champion that hurts allied champions under the tower
    const agg = G.heroes.find(h => h.team !== t.team && inR(h) && h.vis[t.team] && G.t - (h.aggroHeroT || -9) < 1.5 && G.heroes.some(a => a.team === t.team && !a.dead && G.t - a.lastHurt < 1.5 && inR(a)));
    if (agg) T = t.target = agg;
    if (!T) {
      let best = null, bd = 1e9;
      for (const u of G.units) {
        if (u.team === t.team || u.team === 2 || isStruct(u) || !inR(u) || !u.vis[t.team]) continue;
        const d = Math.hypot(u.x - t.x, u.y - t.y) + (u.kind === 'hero' ? 2000 : 0);
        if (d < bd) { bd = d; best = u; }
      }
      T = t.target = best;
    }
  }
  if (T) attack(t, T);
}

function updMonster(m, dt) {
  if (m.stun > 0 || m.kup > 0) return;
  const home = m.home;
  if (m.reset) {
    if (m.ms) moveToward(m, home.x, home.y, dt, m.ms * 1.6);
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * .3 * dt);
    if (Math.hypot(m.x - home.x, m.y - home.y) < 12 && m.hp >= m.maxHp) m.reset = false;
    return;
  }
  let t = m.aggro;
  const valid = u => u && !u.dead && Math.hypot(u.x - home.x, u.y - home.y) < m.leash + 80 && (m.ms || Math.hypot(u.x - m.x, u.y - m.y) < m.range + u.r + 120);
  if (t && !valid(t)) {
    const alt = G.heroes.filter(h => valid(h) && (G.t - (m.attackers?.get(h) ?? -99) < 8 || Math.hypot(h.x - m.x, h.y - m.y) < 200)).sort((a, b) => dist(a, m) - dist(b, m))[0];
    m.aggro = t = alt || null;
    if (!t) {
      const list = m.camp ? m.camp.units : [m];
      for (const u of list) if (!u.dead) { u.reset = true; u.aggro = null; u.dots = []; }
      return;
    }
  }
  if (!t) {
    if (m.ms && Math.hypot(m.x - home.x, m.y - home.y) > 8) moveToward(m, home.x, home.y, dt, m.ms * .6);
    else m.face += dt * .2;
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * .02 * dt);
    return;
  }
  if (m.boss) bossSkills(m, dt, t);
  if (dist(m, t) <= m.range + t.r + m.r * .5) attack(m, t);
  else if (m.ms && m.root <= 0) moveToward(m, t.x, t.y, dt, unitSpeed(m));
}
function bossSkills(m, dt, t) {
  m.skillT -= dt;
  if (m.skillT > 0) return;
  m.skillN = (m.skillN || 0) + 1;
  const pw = m.power * (G.night > .5 ? 1.2 : 1);
  if (m.mtype === 'drake') {
    m.skillT = 5.5;
    const col = m.color;
    if (m.skillN % 2) {
      const ang = Math.atan2(t.y - m.y, t.x - m.x); m.face = ang;
      zone({ x: m.x, y: m.y, r: 460, cone: ang, arc: .6, delay: 1, once: true, style: 'tele', color: col, owner: m, team: 2,
        onFire: z => { hitsInCone(z).forEach(u => { damage(m, u, pw * 2.2); u.dots.push({ src: m, dps: pw * .25, t: 3, acc: 0, col }); }); for (let i = 0; i < 40; i++) { const a = z.cone + rnd(-z.arc, z.arc), v = rnd(200, 700); part({ x: m.x, y: m.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: col, size: 26, life: .6, max: .6 }); } SFX.play('boom'); } });
    } else {
      zone({ x: m.x, y: m.y, r: 250, delay: 1.1, once: true, style: 'tele', color: col, owner: m, team: 2,
        onFire: z => { foes(2, z.x, z.y, z.r).forEach(u => { damage(m, u, pw * 1.8); knockU(u, .6); }); ring(z.x, z.y, col, 250, .5, 10); burst(z.x, z.y, col, 30, 400, 14); G.shake = Math.max(G.shake, 8); SFX.play('boom'); } });
    }
  } else if (m.mtype === 'voidmaw') {
    m.skillT = 6;
    if (m.skillN % 2) {
      G.heroes.filter(h => !h.dead && dist(h, m) < 800).forEach(h => {
        const px = h.x + (h.vel ? h.vel.x * .5 : 0), py = h.y + (h.vel ? h.vel.y * .5 : 0);
        zone({ x: px, y: py, r: 115, delay: 1.2, once: true, style: 'tele', color: '#b36bff', owner: m, team: 2,
          onFire: z => { foes(2, z.x, z.y, z.r).forEach(u => { damage(m, u, pw * 1.6); slowU(u, .4, 1.5); }); burst(z.x, z.y, '#b36bff', 26, 260, 14, .8); zone({ x: z.x, y: z.y, r: 115, dur: 3, owner: m, team: 2, style: 'acid', color: '#9a4dff', onTick: zz => foes(2, zz.x, zz.y, zz.r).forEach(u => damage(m, u, pw * .2)) }); } });
      });
    } else {
      zone({ x: m.x, y: m.y, r: 380, delay: 1.5, once: true, style: 'tele', color: '#b36bff', owner: m, team: 2,
        onFire: z => { foes(2, z.x, z.y, z.r).forEach(u => { damage(m, u, pw * 1.3); if (!ccImmune(u)) { const [dx, dy] = dirTo(m, u.x, u.y); dashU(u, u.x + dx * 220, u.y + dy * 220, 900, {}); } }); ring(z.x, z.y, '#b36bff', 380, .6, 12); G.shake = Math.max(G.shake, 12); SFX.play('boom'); } });
    }
  }
}
function hitsInCone(z) { return foes(2, z.x, z.y, z.r).filter(u => Math.abs(angDiff(z.cone, Math.atan2(u.y - z.y, u.x - z.x))) <= z.arc + .1); }

function updProjectiles(dt) {
  for (const p of G.projs) {
    if (p.homing) {
      const t = p.homing;
      if (t.dead) { p.dead = true; continue; }
      const ty = t.y - (isStruct(t) ? 30 : 0);
      const dx = t.x - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      p.ang = Math.atan2(dy, dx);
      if (d <= step + 6) { p.dead = true; p.onHit(); continue; }
      p.x += dx / d * step; p.y += dy / d * step;
      if (p.style === 'tower' || p.style === 'void' || p.style === 'fire') part({ x: p.x, y: p.y, color: p.color, size: 14, life: .25, max: .25 });
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.trav += p.speed * dt; p.ang = Math.atan2(p.vy, p.vx);
    if (p.trav >= p.range) { p.dead = true; continue; }
    for (const u of G.units) {
      if (u.dead || u.team === p.team || u.reset || isStruct(u) || p.hit.has(u)) continue;
      if (p.heroesOnly && u.kind !== 'hero') continue;
      if (Math.abs(u.x - p.x) > u.r + p.w && Math.abs(u.y - p.y) > u.r + p.w) continue;
      if (Math.hypot(u.x - p.x, u.y - p.y) < u.r + p.w / 2) {
        p.hit.add(u); p.onHit(u);
        if (!p.pierce) { p.dead = true; break; }
      }
    }
    if (Math.random() < .8) part({ x: p.x, y: p.y, color: p.color, size: p.style === 'bigarrow' ? 30 : 12, life: .3, max: .3 });
  }
  G.projs = G.projs.filter(p => !p.dead);
}
function updZones(dt) {
  for (const z of G.zones) {
    z.t += dt;
    if (z.t < z.delay) continue;
    if (z.once) { z.onFire(z); z.dead = true; continue; }
    if (!z.fired) { z.fired = true; z.acc = z.tick; }
    else z.acc += dt;
    while (z.acc >= z.tick && !z.dead) { z.acc -= z.tick; if (z.maxTicks && z.ticks >= z.maxTicks) break; z.ticks++; z.onTick(z); }
    if (z.t >= z.delay + z.dur) z.dead = true;
  }
  G.zones = G.zones.filter(z => !z.dead);
}
function separate() {
  const mob = G.units.filter(u => !u.dead && !isStruct(u) && !u.dash && u.ms > 0);
  const structs = G.units.filter(u => isStruct(u) && !u.dead);
  for (let i = 0; i < mob.length; i++) {
    const a = mob[i];
    for (let j = i + 1; j < mob.length; j++) {
      const b = mob[j], dx = b.x - a.x; if (Math.abs(dx) > 70) continue;
      if ((a.kind === 'hero') !== (b.kind === 'hero') && (a.kind === 'minion' || b.kind === 'minion')) continue;
      const dy = b.y - a.y, min = (a.r + b.r) * .85, d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 < .01) continue;
      const d = Math.sqrt(d2), push = (min - d) * .25, nx = dx / d * push, ny = dy / d * push;
      const wa = a.kind === 'hero' ? .5 : 1, wb = b.kind === 'hero' ? .5 : 1;
      if (walk(a.x - nx * wa, a.y - ny * wa)) { a.x -= nx * wa; a.y -= ny * wa; }
      if (walk(b.x + nx * wb, b.y + ny * wb)) { b.x += nx * wb; b.y += ny * wb; }
    }
    for (const s of structs) {
      const dx = a.x - s.x, dy = a.y - s.y, d = Math.hypot(dx, dy), min = s.r * .8 + a.r;
      if (d < min && d > .01) { const nx = s.x + dx / d * min, ny = s.y + dy / d * min; if (walk(nx, ny)) { a.x = nx; a.y = ny; } }
    }
  }
}

function computeVision() {
  const nightF = 1 - .3 * G.night;
  for (const team of [0, 1]) {
    const src = [];
    for (const u of G.units) {
      if (u.dead || u.team !== team) continue;
      const r = u.kind === 'hero' ? 780 * nightF : u.kind === 'minion' ? 460 * nightF : u.kind === 'tower' ? 800 : u.kind === 'ancient' ? 950 : u.kind === 'inhib' ? 600 : 0;
      if (r) src.push({ x: u.x, y: u.y, r, u });
    }
    if (team === 0) G.visSrc = src;
    const reveal = G.reveal[team] > G.t;
    for (const u of G.units) {
      if (u.team === team || isStruct(u)) { u.vis[team] = true; continue; }
      if (u.dead) { u.vis[team] = u.kind !== 'hero'; continue; }
      if (reveal && u.kind === 'hero') { u.vis[team] = true; continue; }
      let v = false;
      for (const s of src) { const dx = s.x - u.x, dy = s.y - u.y; if (dx * dx + dy * dy < s.r * s.r) { v = true; break; } }
      if (v && u.revealT <= 0) {
        if (u.stealth > 0) v = src.some(s => s.u.kind !== 'tower' && Math.hypot(s.x - u.x, s.y - u.y) < 130);
        else if (u.bush >= 0) v = src.some(s => (s.u.bush === u.bush && s.u.kind !== 'tower') || (s.u.kind !== 'tower' && Math.hypot(s.x - u.x, s.y - u.y) < 110));
      }
      u.vis[team] = v;
    }
  }
}

/* =========================================================
   RENDERING
   ========================================================= */
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
let VW = 800, VH = 600, DPR = 1;
const fogC = document.createElement('canvas'), fctx = fogC.getContext('2d');
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = cv.clientWidth || innerWidth; VH = cv.clientHeight || innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  fogC.width = Math.ceil(VW / 4); fogC.height = Math.ceil(VH / 4);
  if (G) G.cam.z = clamp(G.cam.z, zMin(), 1.4);
}
const zMin = () => Math.max(VW / W, VH / H, VW < 700 ? .5 : .6);
addEventListener('resize', resize);

// --- sprites
function makeSprite(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
const HOLE = makeSprite(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.75, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
function treeSprite(pal, seed) {
  const R = seeded(seed);
  return makeSprite(120, 120, (x) => {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(66, 70, 44, 38, 0, 0, TAU); x.fill();
    const blobs = 7;
    for (let i = 0; i < blobs; i++) {
      const a = i / blobs * TAU + R(), rr = 18 + R() * 8, cx = 58 + Math.cos(a) * 20, cy = 56 + Math.sin(a) * 18;
      const g = x.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, rr);
      g.addColorStop(0, pal[2]); g.addColorStop(.55, pal[1]); g.addColorStop(1, pal[0]);
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill();
    }
    const g = x.createRadialGradient(52, 48, 2, 58, 56, 26);
    g.addColorStop(0, pal[3]); g.addColorStop(.6, pal[1]); g.addColorStop(1, pal[0]);
    x.fillStyle = g; x.beginPath(); x.arc(58, 56, 24, 0, TAU); x.fill();
    for (let i = 0; i < 26; i++) { x.fillStyle = hexA(pal[3], .25 + R() * .3); x.beginPath(); x.arc(40 + R() * 36, 36 + R() * 34, 1.5 + R() * 2.5, 0, TAU); x.fill(); }
  });
}
const PAL_DAWN = [['#06140f', '#16402c', '#2f7a4f', '#7fd39a'], ['#071512', '#124036', '#237563', '#6fd1b8'], ['#08130d', '#1f4a24', '#3d7f35', '#9bd872']];
const PAL_DUSK = [['#1a0806', '#5a1a10', '#a4381c', '#ffae6a'], ['#170a06', '#5a2a0e', '#a8601c', '#ffcf7a'], ['#12090b', '#44141f', '#8a2b36', '#ff8f8a']];
const PAL_MID = [['#0a0f16', '#1c2f3e', '#3a5f73', '#9cc9d9'], ['#0d0a16', '#2e1f44', '#5a3f82', '#c1a2ff']];
let TREES_S = null, BUSH_S = null, TERRAIN = null, MINI = null;
const TS = .72; // terrain texture resolution relative to world units

function noiseTile(size, base, amp, seed) {
  const R = seeded(seed);
  return makeSprite(size, size, (x) => {
    const small = makeSprite(24, 24, (s) => { const id = s.createImageData(24, 24); for (let i = 0; i < id.data.length; i += 4) { const v = R(); id.data[i] = base[0] + v * amp[0]; id.data[i + 1] = base[1] + v * amp[1]; id.data[i + 2] = base[2] + v * amp[2]; id.data[i + 3] = 255; } s.putImageData(id, 0, 0); });
    x.imageSmoothingEnabled = true; x.drawImage(small, 0, 0, size, size);
    const id = x.getImageData(0, 0, size, size);
    for (let i = 0; i < id.data.length; i += 4) { const n = (R() - .5) * 18; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    x.putImageData(id, 0, 0);
  });
}

function buildTerrain() {
  TREES_S = { dawn: PAL_DAWN.flatMap((p, i) => [treeSprite(p, 11 + i), treeSprite(p, 31 + i)]), dusk: PAL_DUSK.flatMap((p, i) => [treeSprite(p, 51 + i), treeSprite(p, 71 + i)]), mid: PAL_MID.flatMap((p, i) => [treeSprite(p, 91 + i), treeSprite(p, 97 + i)]) };
  BUSH_S = makeSprite(180, 180, (x) => {
    const R = seeded(5);
    for (let i = 0; i < 170; i++) {
      const a = R() * TAU, r = Math.sqrt(R()) * 70, bx = 90 + Math.cos(a) * r, by = 96 + Math.sin(a) * r * .8;
      const h = 16 + R() * 20, lean = (R() - .5) * 14;
      x.strokeStyle = `hsl(${140 + R() * 40},${45 + R() * 20}%,${16 + R() * 22}%)`; x.lineWidth = 3 + R() * 2; x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + lean * .3, by - h * .6, bx + lean, by - h); x.stroke();
    }
  });
  const c = document.createElement('canvas'); c.width = Math.round(W * TS); c.height = Math.round(H * TS);
  const x = c.getContext('2d'); const R = seeded(1234); x.scale(TS, TS);
  // forest floor
  x.fillStyle = x.createPattern(noiseTile(256, [10, 22, 16], [14, 22, 14], 3), 'repeat'); x.fillRect(0, 0, W, H);
  // warm/cool side wash
  let g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(40,120,160,.10)'); g.addColorStop(.45, 'rgba(0,0,0,0)'); g.addColorStop(.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(170,60,30,.12)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // walkable ground: grass clearings
  const grass = x.createPattern(noiseTile(256, [34, 58, 34], [22, 30, 16], 7), 'repeat');
  const strokeAll = (style, extra, filter) => {
    x.strokeStyle = style; x.fillStyle = style; x.lineCap = 'round'; x.lineJoin = 'round';
    for (const s of SEGS) { if (filter && !filter(s)) continue; x.lineWidth = (s[4] + extra) * 2; x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); x.stroke(); }
    for (const q of CIRCS) { x.beginPath(); x.arc(q[0], q[1], q[2] + extra, 0, TAU); x.fill(); }
  };
  strokeAll('rgba(0,0,0,.55)', 34);
  strokeAll('#1b2a1c', 18);
  strokeAll(grass, 4);
  // flowers / pebbles on grass
  for (let i = 0; i < 2600; i++) {
    const px = R() * W, py = R() * H; if (!walk(px, py)) continue;
    x.fillStyle = R() < .5 ? `hsla(${R() < .5 ? 45 : 200 + R() * 80},70%,${60 + R() * 20}%,.55)` : 'rgba(20,30,20,.35)';
    x.beginPath(); x.arc(px, py, 1 + R() * 2, 0, TAU); x.fill();
  }
  // lanes (dirt)
  const dirt = x.createPattern(noiseTile(256, [74, 58, 40], [30, 24, 18], 9), 'repeat');
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (const k in LANES) {
    const pts = LANES[k];
    const path = () => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); };
    path(); x.strokeStyle = 'rgba(20,14,8,.5)'; x.lineWidth = 236; x.stroke();
    path(); x.strokeStyle = dirt; x.lineWidth = 204; x.stroke();
    path(); x.strokeStyle = 'rgba(255,230,180,.06)'; x.lineWidth = 80; x.stroke();
    // cart ruts
    x.setLineDash([30, 18]); path(); x.strokeStyle = 'rgba(30,20,10,.25)'; x.lineWidth = 4; x.stroke(); x.setLineDash([]);
  }
  // cobbles near bases
  for (let i = 0; i < 1400; i++) {
    const px = R() * W, py = R() * H; if (!walk(px, py)) continue;
    let near = false; for (const k in LANES) { const p = LANES[k]; for (let j = 0; j < p.length - 1; j++) if (segDist(px, py, p[j][0], p[j][1], p[j + 1][0], p[j + 1][1]) < 80) near = true; }
    if (!near) continue;
    x.fillStyle = `rgba(${150 + R() * 60},${130 + R() * 40},${100 + R() * 30},.18)`;
    x.beginPath(); x.ellipse(px, py, 3 + R() * 6, 2 + R() * 4, R() * 3, 0, TAU); x.fill();
  }
  // jungle trails
  const trail = x.createPattern(noiseTile(128, [56, 46, 34], [22, 18, 14], 21), 'repeat');
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (const M of [p => p, mirX]) for (const [pa, hw] of JPATHS) {
    const pp = pa.map(M);
    const tr = () => { x.beginPath(); pp.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); };
    tr(); x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = hw * 2 - 4; x.stroke();
    tr(); x.strokeStyle = trail; x.globalAlpha = .8; x.lineWidth = hw * 2 - 26; x.stroke(); x.globalAlpha = 1;
  }
  const stone = x.createPattern(noiseTile(128, [70, 72, 78], [30, 30, 34], 23), 'repeat');
  const plaza = (cx, cy, r, col) => {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(cx, cy, r + 10, 0, TAU); x.fill();
    x.fillStyle = stone; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
    for (let rr = 40; rr < r; rr += 38) { x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; x.beginPath(); x.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); }
    x.strokeStyle = hexA(col, .55); x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, r - 6, 0, TAU); x.stroke();
  };
  // Voidmaw lair
  {
    const p = PIT_VOID, col = '#6a2dbd';
    g = x.createRadialGradient(p.x, p.y, 20, p.x, p.y, 230);
    g.addColorStop(0, hexA(col, .55)); g.addColorStop(.7, 'rgba(12,8,20,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, 230, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(200,190,210,.3)'; x.lineWidth = 12; x.beginPath(); x.arc(p.x, p.y, 205, Math.PI * .62, Math.PI * 2.38); x.stroke();
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, r1 = 150 + (i % 3) * 22; x.strokeStyle = 'rgba(210,200,230,.12)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1); x.stroke(); }
    x.strokeStyle = hexA(col, .55); x.lineWidth = 2; for (const r1 of [60, 110, 160]) { x.beginPath(); x.arc(p.x, p.y, r1, 0, TAU); x.stroke(); }
  }
  // altars
  for (const A of ALTARS) {
    plaza(A.x, A.y, 150, '#c9a45c');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.save(); x.translate(A.x + Math.cos(a) * 118, A.y + Math.sin(a) * 118); x.rotate(a); x.fillStyle = 'rgba(243,216,146,.35)'; x.fillRect(-3, -9, 6, 18); x.restore(); }
  }
  // heartwood relic grove
  plaza(RELIC.x, RELIC.y, 175, '#9dff8a');
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; x.fillStyle = '#2c3330'; x.beginPath(); x.ellipse(RELIC.x + Math.cos(a) * 150, RELIC.y + Math.sin(a) * 150, 14, 10, a, 0, TAU); x.fill(); }
  // speed shrine
  plaza(SPEED_SHRINE.x, SPEED_SHRINE.y, 100, '#8ff0e0');
  x.strokeStyle = 'rgba(143,240,224,.45)'; x.lineWidth = 5;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.save(); x.translate(SPEED_SHRINE.x + Math.cos(a) * 62, SPEED_SHRINE.y + Math.sin(a) * 62); x.rotate(a + Math.PI / 2); x.beginPath(); x.moveTo(-10, 6); x.lineTo(0, -6); x.lineTo(10, 6); x.stroke(); x.restore(); }
  // bases
  for (const t of [0, 1]) {
    const b = BASE[t], col = TEAMCOL[t];
    g = x.createRadialGradient(b.x, b.y, 40, b.x, b.y, 430);
    g.addColorStop(0, t ? '#3a2622' : '#2a3440'); g.addColorStop(.85, t ? '#221412' : '#141c24'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(b.x, b.y, 430, 0, TAU); x.fill();
    // flagstones
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
    for (let r = 60; r < 420; r += 46) { x.beginPath(); x.arc(b.x, b.y, r, 0, TAU); x.stroke(); const n = Math.floor(r / 12); for (let i = 0; i < n; i++) { const a = i / n * TAU + r; x.beginPath(); x.moveTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); x.lineTo(b.x + Math.cos(a) * (r + 46), b.y + Math.sin(a) * (r + 46)); x.stroke(); } }
    x.strokeStyle = hexA(col, .5); x.lineWidth = 4; x.beginPath(); x.arc(b.x, b.y, 422, 0, TAU); x.stroke();
    // fountain pool
    const f = FOUNT[t];
    g = x.createRadialGradient(f.x, f.y, 5, f.x, f.y, 90);
    g.addColorStop(0, hexA(col, .9)); g.addColorStop(.5, hexA(col, .3)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(f.x, f.y, 90, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(220,210,190,.5)'; x.lineWidth = 6; x.beginPath(); x.arc(f.x, f.y, 70, 0, TAU); x.stroke();
  }
  // trees on unwalkable cells
  const trees = [];
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    if (grid[gy * GW + gx]) continue;
    const n = 1 + (R() < .5 ? 1 : 0);
    for (let k = 0; k < n; k++) trees.push([gx * CELL + CELL / 2 + (R() - .5) * 42, gy * CELL + CELL / 2 + (R() - .5) * 42, .75 + R() * .55, R()]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [tx, ty, s, v] of trees) {
    const side = tx < RX - 190 ? 'dawn' : tx > RX + 190 ? 'dusk' : 'mid';
    const set = TREES_S[side]; const spr = set[Math.floor(v * set.length)];
    const sz = 110 * s;
    x.drawImage(spr, tx - sz / 2, ty - sz / 2 - 10, sz, sz);
  }
  // dim the forest so the playable ground reads clearly
  const mask = makeSprite(GW, GH, (m) => { const id = m.createImageData(GW, GH); for (let i = 0; i < GW * GH; i++) { id.data[i * 4 + 3] = grid[i] ? 0 : 255; } m.putImageData(id, 0, 0); });
  x.save(); x.globalAlpha = .34; x.imageSmoothingEnabled = true; x.drawImage(mask, 0, 0, W, H); x.restore();
  // edge vignette
  g = x.createRadialGradient(W / 2, H / 2, H * .55, W / 2, H / 2, W * .62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  TERRAIN = c;
  MINI = makeSprite(720, 400, (m) => { m.drawImage(c, 0, 0, 720, 400); m.fillStyle = 'rgba(5,8,12,.2)'; m.fillRect(0, 0, 720, 400); });
}

// --- camera
function updateCamera(dt) {
  const c = G.cam;
  let tx = c.x, ty = c.y;
  if (G.demo) {
    c.tour = (c.tour || 0) - dt;
    if (c.tour <= 0 || !c.focus || c.focus.dead) { c.tour = 9; const cand = G.heroes.filter(h => !h.dead); const fights = cand.filter(h => h.aiState === 'fight'); c.focus = pick(fights.length ? fights : cand); }
    if (c.focus) { tx = c.focus.x; ty = c.focus.y; }
    c.z += ((VW < 700 ? .62 : .85) - c.z) * dt;
  } else if (G.player) {
    const p = G.player;
    if (!c.free) {
      tx = p.x + (Input.sx - VW / 2) / c.z * .12; ty = p.y + (Input.sy - VH / 2) / c.z * .12;
    } else {
      const e = 24, sp = 1100 / c.z * dt;
      if (Input.inside && !Input.touch) { if (Input.sx < e) c.x -= sp; if (Input.sx > VW - e) c.x += sp; if (Input.sy < e) c.y -= sp; if (Input.sy > VH - e) c.y += sp; }
      if (Input.keys.ArrowLeft) c.x -= sp; if (Input.keys.ArrowRight) c.x += sp; if (Input.keys.ArrowUp) c.y -= sp; if (Input.keys.ArrowDown) c.y += sp;
      tx = c.x; ty = c.y;
    }
  }
  const k = c.snap ? 1 : Math.min(1, dt * (G.demo ? 1.2 : 8)); c.snap = false;
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  const hw = VW / 2 / c.z, hh = VH / 2 / c.z;
  c.x = clamp(c.x, hw, W - hw); c.y = clamp(c.y, hh, H - hh);
}
const screenToWorld = (sx, sy) => ({ x: G.cam.x + (sx - VW / 2) / G.cam.z, y: G.cam.y + (sy - VH / 2) / G.cam.z });

function render(time) {
  const c = G.cam, z = c.z, T = G.t;
  const vw = VW / z, vh = VH / z, x0 = c.x - vw / 2, y0 = c.y - vh / 2;
  const view = { x0: x0 - 150, y0: y0 - 150, x1: x0 + vw + 150, y1: y0 + vh + 250 };
  const inView = u => u.x > view.x0 && u.x < view.x1 && u.y > view.y0 && u.y < view.y1;
  const shx = (Math.random() - .5) * G.shake, shy = (Math.random() - .5) * G.shake;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(DPR * z, 0, 0, DPR * z, (-x0 * z + shx) * DPR, (-y0 * z + shy) * DPR);
  const sx0 = clamp(x0, 0, W), sy0 = clamp(y0, 0, H), sw = clamp(x0 + vw, 0, W) - sx0, sh = clamp(y0 + vh, 0, H) - sy0;
  if (sw > 0 && sh > 0) ctx.drawImage(TERRAIN, sx0 * TS, sy0 * TS, sw * TS, sh * TS, sx0, sy0, sw, sh);
  const viewTeam = G.player ? G.player.team : null;
  const seen = u => viewTeam === null || u.vis[viewTeam];

  drawDecals(T, inView);
  // zones
  for (const zn of G.zones) drawZone(zn, T);
  // champions' cast indicators (hit areas)
  for (const h of G.heroes) {
    if (!h.casting || h.dead || !seen(h) || !inView(h)) continue;
    const c = h.casting;
    if (SHAPE[c.id] && SHAPE[c.id].s) drawShape(h, c.id, c.tx, c.ty, c.t / c.dur, relCol(h), false);
  }
  // aim indicator
  drawAim();
  // marks
  for (const m of G.marks) { const k = m.t / .45; ctx.strokeStyle = hexA(m.col.startsWith('#') ? m.col : '#ffffff', Math.min(1, k)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, (m.r || 22) * (0.4 + k * .6), 0, TAU); ctx.stroke(); if (m.t > 1) { ctx.beginPath(); ctx.arc(m.x, m.y, 90 + Math.sin(T * 6) * 10, 0, TAU); ctx.stroke(); } }
  // guardian tethers
  for (const h of G.heroes) { const ob = h.buffs.oath; if (!h.dead && ob && ob.by && !ob.by.dead && seen(h)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,226,122,${.5 + .3 * Math.sin(T * 8)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -T * 60; ctx.beginPath(); ctx.moveTo(ob.by.x, ob.by.y - 34); ctx.quadraticCurveTo((h.x + ob.by.x) / 2, Math.min(h.y, ob.by.y) - 80, h.x, h.y - 34); ctx.stroke(); ctx.restore(); } }
  // hovered enemy
  if (G.hover && !G.hover.dead) { const u = G.hover; ctx.save(); ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = 3; ctx.shadowColor = '#ff5a48'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(u.x, u.y + 2, u.r * 1.45 + 4, (u.r * 1.45 + 4) * .55, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  // attack-move range
  if (G.amoveArmed && G.player && !G.player.dead) { const p = G.player; ctx.save(); ctx.strokeStyle = 'rgba(255,90,72,.6)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(p.x, p.y, p.range + p.r, 0, TAU); ctx.stroke(); ctx.restore(); }
  // units
  const list = G.units.filter(u => inView(u) && (isStruct(u) || (!u.dead || u.deadT < 1.2)) && (u.dead || seen(u) || (u.team === viewTeam)));
  list.sort((a, b) => a.y - b.y);
  for (const u of list) {
    if (u.kind === 'hero' && u.dead) continue;
    ctx.save();
    if (u.dead) ctx.globalAlpha = Math.max(0, 1 - u.deadT / 1.2);
    if (u.stealth > 0 || u.bush >= 0 && u.team === viewTeam && u.kind === 'hero') ctx.globalAlpha *= u.stealth > 0 ? .4 : .75;
    switch (u.kind) {
      case 'hero': drawHero(u, T); break;
      case 'minion': drawMinion(u, T); break;
      case 'tower': drawTower(u, T); break;
      case 'ancient': drawAncient(u, T); break;
      case 'inhib': drawInhib(u, T); break;
      case 'monster': drawMonster(u, T); break;
    }
    ctx.restore();
  }
  // projectiles
  ctx.save();
  for (const p of G.projs) { if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue; drawProj(p, T); }
  ctx.restore();
  // particles
  ctx.save();
  for (const p of G.parts) {
    if (p.x < view.x0 - 400 || p.x > view.x1 + 400 || p.y < view.y0 - 400 || p.y > view.y1 + 400) continue;
    const k = Math.max(0, p.life / p.max);
    ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
    if (p.kind === 'glow') { const s = p.size * (0.5 + k * .8); ctx.globalAlpha = k; ctx.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2); }
    else if (p.kind === 'ring') { ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = p.w * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.1 - k * .5), 0, TAU); ctx.stroke(); }
    else if (p.kind === 'rocket') {
      const t = 1 - k, x = lerp(p.x0, p.x1, t), y = lerp(p.y0, p.y1, t) - Math.sin(t * Math.PI) * 140, x2 = lerp(p.x0, p.x1, t - .05), y2 = lerp(p.y0, p.y1, t - .05) - Math.sin((t - .05) * Math.PI) * 140;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(y - y2, x - x2));
      ctx.fillStyle = '#9aa8b8'; ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ffb347'), x2 - 10, y2 - 10, 20, 20);
      if (Math.random() < .6) G.parts.push({ kind: 'glow', x: x2, y: y2, vx: 0, vy: -20, life: .4, max: .4, size: 7, color: '#c8c8d0', add: false, drag: .9, grav: 0 });
    }
    else if (p.kind === 'petal') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k * 2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot || 0) + (1 - k) * 8); ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * .55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (p.kind === 'speed') { ctx.globalAlpha = k * .8; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .12, p.y - p.vy * .12); ctx.stroke(); }
    else if (p.kind === 'star') {
      const s = p.size * (1.25 - k * .6);
      ctx.globalAlpha = Math.min(1, k * 2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color; ctx.beginPath(); const n = p.pts || 8; for (let j = 0; j < n * 2; j++) { const r = j % 2 ? s * .22 : s * (j % 4 === 0 ? 1 : .6), a = j / (n * 2) * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s * .22, 0, TAU); ctx.fill();
      ctx.restore();
    }
    else if (p.kind === 'coin') {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const w = Math.abs(Math.cos(p.spin || 0)) * p.size + 1;
      ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#6a4208'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w, p.size, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(p.x - w * .25, p.y - p.size * .3, w * .3, p.size * .3, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; ctx.drawImage(glowSprite('#ffd24a'), p.x - 10, p.y - 10, 20, 20);
    }
    else if (p.kind === 'slash') {
      const sw = 1 - k, dir = p.flip ? -1 : 1, cx = p.x - Math.cos(p.ang) * p.size * .7, cy = p.y - Math.sin(p.ang) * p.size * .7;
      const a0 = p.ang - dir * (1.2 - sw * .4), a1 = p.ang + dir * (-.2 + sw * 1.4);
      ctx.globalAlpha = Math.min(1, k * 1.6); ctx.lineCap = 'round';
      ctx.strokeStyle = p.color; ctx.lineWidth = p.w * (.5 + k);
      ctx.beginPath(); ctx.arc(cx, cy, p.size, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, p.w * .35 * k);
      ctx.beginPath(); ctx.arc(cx, cy, p.size, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    }
    else if (p.kind === 'beam') { ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = p.w * k + 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if (p.kind === 'zap') { ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = p.w; ctx.shadowColor = '#8fd0ff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(p.x, p.y); const n = 7; for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(lerp(p.x, p.x2, t) + rnd(-18, 18), lerp(p.y, p.y2, t) + rnd(-10, 10)); } ctx.lineTo(p.x2, p.y2); ctx.stroke(); ctx.shadowBlur = 0; const s = 30; ctx.drawImage(glowSprite('#bfe6ff'), p.x2 - s, p.y2 - s, s * 2, s * 2); }
  }
  ctx.restore();
  // bushes (over units)
  for (let i = 0; i < BUSHES.length; i++) {
    const b = BUSHES[i]; if (b.x < view.x0 || b.x > view.x1 || b.y < view.y0 || b.y > view.y1) continue;
    const inside = G.player && G.player.bush === i;
    ctx.globalAlpha = inside ? .45 : .95;
    const sway = Math.sin(T * 1.5 + i) * 2;
    ctx.drawImage(BUSH_S, b.x - 95 + sway, b.y - 100, 190, 190);
    ctx.globalAlpha = 1;
  }
  // drifting ground mist
  ctx.save(); ctx.globalAlpha = .09 + .06 * G.night;
  for (let i = 0; i < 16; i++) {
    const mx = ((i * 811 + T * (14 + (i % 5) * 4)) % (W + 800)) - 400, my = 300 + (i * 347) % (H - 600) + Math.sin(T * .2 + i) * 40;
    if (mx < view.x0 - 500 || mx > view.x1 + 500 || my < view.y0 - 400 || my > view.y1 + 400) continue;
    ctx.drawImage(glowSprite('#a8b8c8'), mx - 380, my - 170, 760, 340);
  }
  ctx.restore();
  // night
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.night > .01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${lerp(255, 132, G.night) | 0},${lerp(255, 144, G.night) | 0},${lerp(255, 196, G.night) | 0})`;
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .28 * G.night;
    for (const u of list) {
      if (u.dead || !(u.kind === 'hero' || isStruct(u))) continue;
      const r = (isStruct(u) ? 170 : 120) * z, sx = (u.x - x0) * z, sy = (u.y - (isStruct(u) ? 60 : 0) - y0) * z;
      ctx.drawImage(glowSprite(u.kind === 'hero' ? '#ffd89a' : TEAMCOL[u.team]), sx - r, sy - r, r * 2, r * 2);
    }
    // fireflies
    ctx.globalAlpha = G.night;
    for (let i = 0; i < 30; i++) {
      const fx = ((i * 331.7 + Math.sin(T * .3 + i) * 80) % W), fy = ((i * 197.3 + Math.cos(T * .25 + i) * 60) % H);
      const sx = (fx - x0) * z, sy = (fy - y0) * z; if (sx < -20 || sy < -20 || sx > VW + 20 || sy > VH + 20) continue;
      const s = (6 + Math.sin(T * 3 + i) * 3) * z;
      ctx.drawImage(glowSprite('#dfff8a'), sx - s, sy - s, s * 2, s * 2);
    }
    ctx.restore();
  }
  // fog of war
  if (viewTeam !== null) {
    const fw = fogC.width, fh = fogC.height, fs = fw / VW;
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, fw, fh);
    fctx.fillStyle = `rgba(4,6,12,${.55 + .1 * G.night})`; fctx.fillRect(0, 0, fw, fh);
    fctx.globalCompositeOperation = 'destination-out';
    for (const s of G.visSrc) {
      const r = s.r * z * fs * 1.08, sx = (s.x - x0) * z * fs, sy = (s.y - y0) * z * fs;
      if (sx + r < 0 || sy + r < 0 || sx - r > fw || sy - r > fh) continue;
      fctx.drawImage(HOLE, sx - r, sy - r, r * 2, r * 2);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fogC, 0, 0, VW, VH);
  }
  // overlays in world space
  ctx.setTransform(DPR * z, 0, 0, DPR * z, (-x0 * z + shx) * DPR, (-y0 * z + shy) * DPR);
  for (const u of list) if (!u.dead) drawBars(u, z);
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    if (t.x < view.x0 || t.x > view.x1 || t.y < view.y0 || t.y > view.y1) continue;
    const k = t.life / t.max, pop = k > .85 ? 1 + (k - .85) * 3 : 1;
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = `700 ${t.size * pop / Math.max(.7, z)}px 'Barlow Semi Condensed', sans-serif`;
    ctx.lineWidth = (t.crit ? 5 : 3) / z; ctx.strokeStyle = t.crit ? 'rgba(80,20,0,.95)' : 'rgba(0,0,0,.8)'; ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
    if (t.coin) { const tw = ctx.measureText(t.txt).width, cr = t.size * .38 / Math.max(.7, z); const cx = t.x - tw / 2 - cr - 3, cy = t.y - cr * 1.1; const cg = ctx.createRadialGradient(cx - cr * .3, cy - cr * .3, 1, cx, cy, cr); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(.6, '#e8b040'); cg.addColorStop(1, '#8a5a10'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 1.2 / z; ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  // screen effects
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .45, VW / 2, VH / 2, Math.max(VW, VH) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (G.player && !G.player.dead && G.player.hp / G.player.maxHp < .3) {
    const a = (.3 - G.player.hp / G.player.maxHp) * 1.6 * (.7 + .3 * Math.sin(T * 6));
    g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .3, VW / 2, VH / 2, Math.max(VW, VH) * .7);
    g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(160,10,10,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}

function drawDecals(T, inView) {
  // ancient rune rings
  for (const t of [0, 1]) {
    const a = ANC[t]; if (!inView(a)) continue;
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(T * .2 * (t ? -1 : 1));
    ctx.strokeStyle = hexA(TEAMCOL[t], .35); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.stroke();
    ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(0, 0, 104, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillStyle = hexA(TEAMCOL[t], .5); ctx.fillRect(112, -4, 16, 8); }
    ctx.restore();
    const f = FOUNT[t];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const s = 110 + Math.sin(T * 2) * 8; ctx.globalAlpha = .5; ctx.drawImage(glowSprite(TEAMCOL[t]), f.x - s, f.y - s, s * 2, s * 2); ctx.restore();
    if (Math.random() < .3) part({ x: f.x + rnd(-50, 50), y: f.y + rnd(-30, 30), vy: -80, color: TEAMCOL[t], size: 8, life: 1, max: 1 });
  }
  // altars
  for (const A of G.altars) {
    if (!inView(A)) continue;
    const col = A.owner < 0 ? '#c9c2b0' : TEAMCOL[A.owner], locked = G.t < A.unlock;
    ctx.save(); ctx.translate(A.x, A.y);
    ctx.strokeStyle = hexA(col, locked ? .35 : .85); ctx.lineWidth = 4; ctx.setLineDash(locked ? [8, 10] : []);
    ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // obelisk
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(8, 6, 30, 12, 0, 0, TAU); ctx.fill();
    const og = ctx.createLinearGradient(-18, 0, 18, 0); og.addColorStop(0, '#2a2a32'); og.addColorStop(.5, '#6a6a78'); og.addColorStop(1, '#1e1e24');
    ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(-18, 4); ctx.lineTo(-10, -70); ctx.lineTo(0, -84); ctx.lineTo(10, -70); ctx.lineTo(18, 4); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const fl = 26 + Math.sin(T * 4) * 3;
    ctx.globalAlpha = locked ? .45 : .95; ctx.drawImage(glowSprite(col), -fl, -92 - fl, fl * 2, fl * 2);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -104 - Math.sin(T * 6) * 3); ctx.quadraticCurveTo(8, -92, 0, -84); ctx.quadraticCurveTo(-8, -92, 0, -104 - Math.sin(T * 6) * 3); ctx.fill();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const tm of [0, 1]) if (A.prog[tm] > 0) { ctx.strokeStyle = TEAMCOL[tm]; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 162 + tm * 12, -Math.PI / 2, -Math.PI / 2 + TAU * A.prog[tm] / ALTAR_CAP); ctx.stroke(); }
    if (locked && A.owner >= 0 || G.t < A.unlock) {
      ctx.font = `700 16px 'Barlow Semi Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
      const txt = 'Opens in ' + fmtT(A.unlock - G.t); ctx.strokeText(txt, 0, 128); ctx.fillStyle = '#e8dcc0'; ctx.fillText(txt, 0, 128);
    }
    ctx.restore();
  }
  // heartwood relic
  const Rl = G.relic;
  if (inView(Rl) && Rl.up) {
    const by = Rl.y - 24 + Math.sin(T * 2.5) * 6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#9dff8a'), Rl.x - 60, by - 60, 120, 120); ctx.restore();
    ctx.save(); ctx.translate(Rl.x, by); ctx.rotate(T);
    for (let i = 0; i < 5; i++) { ctx.rotate(TAU / 5); ctx.fillStyle = i % 2 ? '#b9f58a' : '#7fe08a'; ctx.beginPath(); ctx.ellipse(10, 0, 12, 5, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // speed shrine
  if (inView(SPEED_SHRINE)) {
    const sp = SPEED_SHRINE;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + .2 * Math.sin(T * 3);
    ctx.strokeStyle = '#8ff0e0'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const r = ((T * 60 + i * 33) % 100); ctx.globalAlpha = (1 - r / 100) * .8; ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  // pit ambience
  for (const [p, u] of [[PIT_DRAKE, G.drake.unit], [PIT_VOID, G.voidmaw.unit]]) {
    if (!u || u.dead || !inView(p)) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + .1 * Math.sin(T * 2);
    ctx.drawImage(glowSprite(u.color), p.x - 190, p.y - 190, 380, 380); ctx.restore();
    if (Math.random() < .4) part({ x: p.x + rnd(-150, 150), y: p.y + rnd(-150, 150), vy: -50, color: u.color, size: 8, life: 1.2, max: 1.2 });
  }
}

function drawZone(z, T) {
  const pre = z.t < z.delay, k = pre ? z.t / z.delay : 1;
  ctx.save();
  if (z.style === 'mine') {
    const P0 = G.player, mine = !P0 || z.team === P0.team;
    const spotted = mine || G.units.some(u => !u.dead && P0 && u.team === P0.team && u.kind !== 'tower' && Math.hypot(u.x - z.x, u.y - z.y) < 220);
    if (!spotted) { ctx.restore(); return; }
    const armed = z.t >= z.delay;
    ctx.globalAlpha = mine ? 1 : .55;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(z.x, z.y + 3, 16, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a7a8a'; ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(z.x, z.y, 14, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = armed ? (Math.sin(T * 8) > 0 ? '#ff5a48' : '#7a1a12') : '#ffd27a'; ctx.beginPath(); ctx.arc(z.x, z.y - 3, 3, 0, TAU); ctx.fill();
    if (mine) { ctx.strokeStyle = hexA(relCol(z.owner), .35); ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(z.x, z.y, 55, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore(); return;
  }
  if (z.style === 'chill' || z.style === 'blast') {
    const pk = Math.min(1, z.t / Math.max(.01, z.delay)), col = z.style === 'chill' ? '#bfffe8' : '#ffb347';
    ctx.fillStyle = hexA(col, .08 + .2 * pk); ctx.beginPath(); ctx.arc(z.x, z.y, z.r * pk, 0, TAU); ctx.fill();
  }
  if (z.style === 'sunwall') {
    const fade = Math.min(1, (z.dur - z.t) * 2, z.t * 4);
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(z.x, z.y - 40, 10, z.x, z.y, z.r); g.addColorStop(0, 'rgba(255,246,192,.35)'); g.addColorStop(.8, 'rgba(255,226,122,.12)'); g.addColorStop(1, 'rgba(255,226,122,.5)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,236,160,.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) { const aa = T * .6 + i / 10 * TAU; ctx.beginPath(); ctx.moveTo(z.x + Math.cos(aa) * 40, z.y + Math.sin(aa) * 24); ctx.lineTo(z.x + Math.cos(aa) * z.r, z.y + Math.sin(aa) * z.r); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (z.style === 'tele') {
    ctx.fillStyle = hexA('#ff3a2a', .16); ctx.strokeStyle = hexA('#ff5a3a', .8); ctx.lineWidth = 3;
    const shape = (rr) => { ctx.beginPath(); if (z.cone !== undefined) { ctx.moveTo(z.x, z.y); ctx.arc(z.x, z.y, rr, z.cone - z.arc, z.cone + z.arc); ctx.closePath(); } else ctx.arc(z.x, z.y, rr, 0, TAU); };
    shape(z.r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hexA('#ff5a3a', .3); shape(z.r * k); ctx.fill();
  } else if (z.style === 'static') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA('#8fd0ff', pre ? .4 + .4 * k : .8); ctx.lineWidth = pre ? 2 : 4;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (pre ? k : 1), 0, TAU); ctx.stroke();
    ctx.fillStyle = hexA('#4f9fff', pre ? .08 : .15); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    if (!pre) { ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = rnd(TAU); ctx.beginPath(); for (let j = 0; j <= 6; j++) { const aa = a + j * .12, rr = z.r * (.9 + rnd(-.06, .06)); j ? ctx.lineTo(z.x + Math.cos(aa) * rr, z.y + Math.sin(aa) * rr) : ctx.moveTo(z.x + Math.cos(aa) * rr, z.y + Math.sin(aa) * rr); } ctx.stroke(); } }
  } else if (z.style === 'tempest') {
    const fade = Math.min(1, (z.dur - z.t) * 2, z.t * 3);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(10,20,50,.45)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    for (let i = 0; i < 14; i++) { const a = T * 1.6 + i / 14 * TAU, rr = z.r * (.3 + (i % 3) * .25); const s = 60 + (i % 4) * 14; ctx.drawImage(glowSprite('#23385f'), z.x + Math.cos(a) * rr - s, z.y + Math.sin(a) * rr - s, s * 2, s * 2); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(143,208,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, T * 2, T * 2 + 5); ctx.stroke();
    if (Math.random() < .3) zap(z.x + rnd(-z.r, z.r) * .7, z.y - 380, z.x + rnd(-z.r, z.r) * .7, z.y + rnd(-z.r, z.r) * .7, true);
  } else if (z.style === 'sanct') {
    const fade = Math.min(1, (z.dur - z.t) * 2, z.t * 3);
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); g.addColorStop(0, 'rgba(157,255,138,.25)'); g.addColorStop(.85, 'rgba(90,200,90,.12)'); g.addColorStop(1, 'rgba(157,255,138,.45)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,170,.7)'; ctx.lineWidth = 3; ctx.setLineDash([20, 12]); ctx.lineDashOffset = -T * 30; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (Math.random() < .6) part({ x: z.x + rnd(-z.r, z.r) * .7, y: z.y + rnd(-z.r, z.r) * .7, vy: -60, color: '#b9f58a', size: 9, life: 1, max: 1 });
  } else if (z.style === 'quake') {
    ctx.globalAlpha = Math.min(1, (z.dur - z.t) * 2);
    ctx.strokeStyle = 'rgba(255,150,60,.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + z.x; ctx.beginPath(); ctx.moveTo(z.x, z.y); let px = z.x, py = z.y; for (let j = 1; j <= 4; j++) { px = z.x + Math.cos(a + Math.sin(j * 7 + i) * .3) * z.r * j / 4; py = z.y + Math.sin(a + Math.sin(j * 7 + i) * .3) * z.r * j / 4; ctx.lineTo(px, py); } ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,120,40,.1)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
  } else if (z.style === 'acid') {
    ctx.globalAlpha = Math.min(1, (z.dur - z.t) * 2);
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); g.addColorStop(0, 'rgba(150,70,255,.55)'); g.addColorStop(1, 'rgba(80,20,160,.1)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    if (Math.random() < .4) part({ x: z.x + rnd(-z.r, z.r) * .7, y: z.y + rnd(-z.r, z.r) * .6, vy: -30, color: '#b36bff', size: 10, life: .7, max: .7 });
  }
  if (z.style !== 'tele' && z.style !== 'mine' && z.owner) {
    ctx.restore(); ctx.save();
    const left = z.delay + (z.dur || 0) - z.t;
    ctx.globalAlpha = Math.max(0, Math.min(1, left * 3));
    ctx.strokeStyle = hexA(relCol(z.owner), .9); ctx.lineWidth = 3; ctx.setLineDash([18, 10]); ctx.lineDashOffset = -T * 40;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
    if (pre) { ctx.setLineDash([]); ctx.fillStyle = hexA(relCol(z.owner), .12 + .2 * k); ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

function relCol(u) {
  const p = G.player;
  if (!u) return '#ffffff';
  if (!p) return u.team === 2 ? '#ff9a3a' : TEAMCOL[u.team];
  if (u === p) return '#f3d892';
  return u.team === p.team ? '#4cc3ff' : u.team === 2 ? '#ff9a3a' : '#ff5a48';
}
// draws an ability's hit area. prog 0..1 fills it like a timer; preview = player's aiming ghost
function drawShape(h, id, tx, ty, prog, col, preview) {
  const ab = ABIL[id], sh = SHAPE[id]; if (!sh || !sh.s) return;
  const a = Math.atan2(ty - h.y, tx - h.x);
  let range = ab.range || 0; if (id === 'hook' && hasCap(h, 2)) range = 980;
  ctx.save();
  ctx.lineJoin = 'round';
  const fill = hexA(col, preview ? .2 : .12), fill2 = hexA(col, .32), line = hexA(col, .95);
  ctx.lineWidth = preview ? 2.5 : 3;
  if (sh.s === 'line') {
    const angs = id === 'arcbolt' && hasCap(h, 0) ? [a - .22, a, a + .22] : [a];
    const L = range, w = sh.w;
    for (const aa of angs) {
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(aa);
      ctx.fillStyle = fill; ctx.strokeStyle = line;
      ctx.beginPath(); ctx.rect(h.r * .6, -w / 2, L - h.r * .6, w); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L, -w / 2 - 8); ctx.lineTo(L + 22, 0); ctx.lineTo(L, w / 2 + 8); ctx.closePath(); ctx.fillStyle = line; ctx.fill();
      if (!preview) { ctx.fillStyle = fill2; ctx.fillRect(h.r * .6, -w / 2, (L - h.r * .6) * prog, w); }
      // chevrons show direction of travel
      ctx.strokeStyle = hexA(col, .5); ctx.lineWidth = 2;
      for (let d = 80; d < L - 20; d += 90) { const o = ((G.t * 160) % 90); ctx.beginPath(); ctx.moveTo(d + o - 8, -w * .28); ctx.lineTo(d + o, 0); ctx.lineTo(d + o - 8, w * .28); ctx.stroke(); }
      ctx.restore();
    }
  } else if (sh.s === 'circle') {
    let cx = h.x, cy = h.y;
    if (!sh.self) [cx, cy] = clampPt(h, tx, ty, range);
    let r = sh.r; if (id === 'tempest' && hasCap(h, 2)) r *= 1.4;
    if (!sh.self && ab.moves) { ctx.strokeStyle = hexA(col, .7); ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = preview ? 2.5 : 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (!preview) { ctx.fillStyle = fill2; ctx.beginPath(); ctx.arc(cx, cy, r * prog, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
  } else if (sh.s === 'cone') {
    const L = sh.len;
    ctx.fillStyle = fill; ctx.strokeStyle = line;
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, L, a - sh.arc, a + sh.arc); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!preview) { ctx.fillStyle = fill2; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, L * prog, a - sh.arc, a + sh.arc); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
function drawAim() {
  const p = G.player; const key = G.aim || G.armed || G.hoverKey;
  if (!p || p.dead || !key || key === 'F') return;
  const m = { x: Input.wx, y: Input.wy };
  ctx.save();
  ctx.strokeStyle = 'rgba(243,216,146,.5)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
  if (key === 'D') {
    ctx.beginPath(); ctx.arc(p.x, p.y, 420, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const [x, y] = clampPt(p, m.x, m.y, 420); ctx.fillStyle = 'rgba(243,216,146,.2)'; ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore(); return;
  }
  const id = p.def.ab[key], ab = ABIL[id], sh = SHAPE[id] || {};
  if (ab.range && !sh.self && ab.type !== 'dir') { ctx.beginPath(); ctx.arc(p.x, p.y, ab.range, 0, TAU); ctx.stroke(); }
  ctx.setLineDash([]);
  if (ab.type === 'ally') {
    ctx.fillStyle = 'rgba(243,216,146,.06)'; ctx.beginPath(); ctx.arc(p.x, p.y, ab.range, 0, TAU); ctx.fill();
    const c = friends(p.team, p.x, p.y, ab.range).filter(a => a !== p).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0] || p;
    ctx.strokeStyle = '#f3d892'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r + 16, (c.r + 16) * .55, 0, 0, TAU); ctx.stroke();
    if (c !== p) { ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(p.x, p.y - 30); ctx.lineTo(c.x, c.y - 30); ctx.stroke(); ctx.setLineDash([]); }
  } else if (ab.type === 'unit') {
    ctx.fillStyle = 'rgba(243,216,146,.08)'; ctx.beginPath(); ctx.arc(p.x, p.y, ab.range, 0, TAU); ctx.fill();
    const c = foes(p.team, p.x, p.y, ab.range, { heroes: 1 }).filter(u => u.vis[p.team]).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
    if (c) { ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 14, 0, TAU); ctx.stroke(); }
  } else if (sh.s) drawShape(p, id, m.x, m.y, 0, '#f3d892', true);
  else { ctx.strokeStyle = 'rgba(243,216,146,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 16, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

function drawShadow(x, y, rx, ry) { ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(x, y + ry * .4, rx, ry, 0, 0, TAU); ctx.fill(); }

function drawStatusFx(u, T, s, lift = 0) {
  const top = unitTop(u), rig = u.kind === 'hero' || u.kind === 'minion';
  const shield = shieldAmt(u);
  if (shield > 0) { ctx.save(); ctx.strokeStyle = 'rgba(240,240,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); if (rig) ctx.ellipse(u.x, u.y - top * .45 - lift, s * 1.3, top * .62, 0, 0, TAU); else ctx.arc(u.x, u.y - 6 - lift, s * 1.35, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .15; ctx.fillStyle = '#cfe6ff'; ctx.fill(); ctx.restore(); }
  if (u.stun > 0 || u.kup > 0) { for (let i = 0; i < 3; i++) { const a = T * 5 + i * 2.1; ctx.save(); ctx.translate(u.x + Math.cos(a) * s * .8, u.y - (rig ? top + 4 : s * 1.5) - lift + Math.sin(a) * 4); ctx.rotate(T * 4); ctx.fillStyle = '#ffe066'; ctx.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 1.8 : 4.5, aa = j / 10 * TAU; ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } ctx.fill(); ctx.restore(); } }
  if (u.root > 0) { ctx.strokeStyle = '#5ad24a'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(u.x + Math.cos(a) * s * 1.2, u.y + Math.sin(a) * s * .6); ctx.quadraticCurveTo(u.x + Math.cos(a + .5) * s * .6, u.y - s * .6, u.x + Math.cos(a + 1) * s * .4, u.y - s * .2); ctx.stroke(); } }
  if (u.slows.length && Math.random() < .15) part({ x: u.x + rnd(-s, s), y: u.y, vy: -20, color: '#9fc8ff', size: 6, life: .5, max: .5 });
  if (u.buffs && (u.buffs.mindwell || u.buffs.ember)) {
    const cols = []; if (u.buffs.mindwell) cols.push('#6fb8ff'); if (u.buffs.ember) cols.push('#ff7a3a');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    cols.forEach((col, i) => { const a = T * 3 + i * Math.PI; ctx.drawImage(glowSprite(col), u.x + Math.cos(a) * s * 1.2 - 8, u.y - 6 + Math.sin(a) * s * .6 - 8, 16, 16); });
    ctx.restore();
  }
}
function drawTower(t, T) {
  const col = TEAMCOL[t.team];
  if (t.dead) {
    ctx.fillStyle = '#26221e'; for (let i = 0; i < 7; i++) { const a = i * 1.3; ctx.beginPath(); ctx.ellipse(t.x + Math.cos(a) * 20, t.y + Math.sin(a) * 12, 14, 8, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(t.x, t.y, 40, 20, 0, 0, TAU); ctx.fill();
    return;
  }
  const P = G.player;
  if (P && !P.dead && Math.hypot(P.x - t.x, P.y - t.y) < t.range + 250) {
    const hostile = t.team !== P.team, targeting = t.target === P;
    ctx.save(); ctx.strokeStyle = hostile ? (targeting ? 'rgba(255,60,40,.9)' : 'rgba(255,90,72,.4)') : 'rgba(76,195,255,.25)'; ctx.lineWidth = targeting ? 4 : 2; ctx.setLineDash([16, 10]); ctx.lineDashOffset = T * 20;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, TAU); ctx.stroke(); ctx.restore();
  }
  drawShadow(t.x + 10, t.y, 44, 22);
  // base
  ctx.fillStyle = '#3a3a42'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; ctx.lineTo(t.x + Math.cos(a) * 38, t.y + Math.sin(a) * 22); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(col, .6); ctx.lineWidth = 2; ctx.stroke();
  // pillar
  const g = ctx.createLinearGradient(t.x - 20, 0, t.x + 20, 0);
  g.addColorStop(0, '#2a2a30'); g.addColorStop(.4, t.team ? '#6a5048' : '#586878'); g.addColorStop(1, '#1e1e24');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(t.x - 22, t.y); ctx.lineTo(t.x - 15, t.y - 62); ctx.lineTo(t.x + 15, t.y - 62); ctx.lineTo(t.x + 22, t.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 4; i++) ctx.fillRect(t.x - 20 + i * 1.5, t.y - 12 - i * 14, 40 - i * 3, 2);
  // prongs
  ctx.fillStyle = '#2a2a30';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(t.x + sx * 15, t.y - 60); ctx.lineTo(t.x + sx * 24, t.y - 92); ctx.lineTo(t.x + sx * 8, t.y - 64); ctx.fill(); }
  // crystal
  const cy = t.y - 82 + Math.sin(T * 2 + t.x) * 3;
  const ch = t.wind ? t.wind.t / t.wind.dur : 0, gs = 36 + ch * 30;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .75 + ch * .25;
  ctx.drawImage(glowSprite(col), t.x - gs, cy - gs, gs * 2, gs * 2);
  if (ch > 0) { ctx.strokeStyle = hexA(col, ch); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, cy, 46 * (1 - ch) + 10, 0, TAU); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = mixHex(col, '#ffffff', .5);
  ctx.beginPath(); ctx.moveTo(t.x, cy - 16); ctx.lineTo(t.x + 8, cy); ctx.lineTo(t.x, cy + 14); ctx.lineTo(t.x - 8, cy); ctx.closePath(); ctx.fill();
  if (structProtected(t)) {
    ctx.save(); ctx.strokeStyle = hexA(col, .3 + .15 * Math.sin(T * 3)); ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + T * .3; ctx.lineTo(t.x + Math.cos(a) * 46, t.y - 40 + Math.sin(a) * 60); } ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  if (t.target && !t.target.dead) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(col, .18 + ch * .6); ctx.lineWidth = 2 + ch * 3; ctx.beginPath(); ctx.moveTo(t.x, cy); ctx.lineTo(t.target.x, t.target.y); ctx.stroke(); ctx.restore();
  }
}
function drawInhib(u, T) {
  const col = TEAMCOL[u.team];
  if (u.dead) {
    ctx.fillStyle = '#1e1a1a'; for (let i = 0; i < 6; i++) { const k = i * 2.1; ctx.beginPath(); ctx.ellipse(u.x + Math.cos(k) * 22, u.y + Math.sin(k) * 12, 12, 7, k, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = hexA(col, .3); ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(u.x, u.y, 44, 24, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  drawShadow(u.x + 6, u.y, 44, 20);
  ctx.fillStyle = '#34343c'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 42, 22, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = hexA(col, .7); ctx.lineWidth = 3; ctx.stroke();
  const cy = u.y - 44 + Math.sin(T * 1.8 + u.y) * 3;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; ctx.drawImage(glowSprite(col), u.x - 46, cy - 46, 92, 92); ctx.restore();
  const g = ctx.createRadialGradient(u.x - 5, cy - 6, 2, u.x, cy, 16); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, col); g.addColorStop(1, mixHex(col, '#000000', .5));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u.x, cy, 15, 0, TAU); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = T * 1.2 + i * TAU / 3, px = u.x + Math.cos(a) * 30, py = cy + Math.sin(a) * 12;
    ctx.fillStyle = mixHex(col, '#ffffff', .4); ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 12); ctx.lineTo(px - 6, py); ctx.closePath(); ctx.fill();
  }
  if (structProtected(u)) { ctx.strokeStyle = hexA(col, .3 + .15 * Math.sin(T * 3)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(u.x, u.y - 30, 50, 58, 0, 0, TAU); ctx.stroke(); }
}
function drawAncient(a, T) {
  const col = TEAMCOL[a.team];
  if (a.dead) { ctx.fillStyle = '#1e1a1a'; for (let i = 0; i < 12; i++) { const k = i * 2.4; ctx.beginPath(); ctx.ellipse(a.x + Math.cos(k) * 40, a.y + Math.sin(k) * 24, 20, 10, k, 0, TAU); ctx.fill(); } return; }
  drawShadow(a.x + 10, a.y, 70, 34);
  ctx.fillStyle = '#2c2c34'; ctx.beginPath(); ctx.ellipse(a.x, a.y, 64, 34, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = hexA(col, .7); ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6 + .15 * Math.sin(T * 1.5);
  ctx.drawImage(glowSprite(col), a.x - 110, a.y - 170, 220, 220); ctx.restore();
  const shards = [[0, -90, 26, 70], [-30, -50, 16, 44], [32, -56, 16, 48], [-14, -30, 12, 30], [18, -24, 10, 26]];
  for (const [dx, dy, w, h] of shards) {
    const bob = Math.sin(T * 1.2 + dx) * 4, x = a.x + dx, y = a.y + dy + bob;
    const g = ctx.createLinearGradient(x - w, y, x + w, y);
    g.addColorStop(0, mixHex(col, '#000000', .5)); g.addColorStop(.45, mixHex(col, '#ffffff', .55)); g.addColorStop(1, mixHex(col, '#000000', .3));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y); ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (structProtected(a)) { ctx.save(); ctx.strokeStyle = hexA(col, .35 + .15 * Math.sin(T * 3)); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(a.x, a.y - 50, 80, 110, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (Math.random() < .2) part({ x: a.x + rnd(-40, 40), y: a.y - rnd(20, 100), vy: -40, color: col, size: 6, life: 1, max: 1 });
}

function drawMonster(m, T) {
  const s = m.r, col = m.color;
  drawShadow(m.x, m.y, s * 1.2, s * .55);
  ctx.save(); ctx.translate(m.x, m.y - 4);
  { const ap = atkPose(m), lg = m.ranged ? (ap > 0 ? -ap * 4 : 0) : (ap < 0 ? ap * 5 : ap * 14); ctx.translate(Math.cos(m.face) * lg, Math.sin(m.face) * lg); }
  if (m.reset) ctx.globalAlpha *= .6;
  switch (m.mtype) {
    case 'wolf': case 'wolfS': {
      ctx.rotate(m.face);
      const run = m.moving ? Math.sin(m.anim * 1.4) * 3 : 0;
      ctx.fillStyle = m.mtype === 'wolf' ? '#4c5468' : '#3c4254';
      ctx.beginPath(); ctx.ellipse(-s * .2, 0, s * 1.05, s * .6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a2e3a'; ctx.lineWidth = s * .25; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s * 1.1, 0); ctx.quadraticCurveTo(-s * 1.6, run, -s * 1.9, run * 2); ctx.stroke();
      ctx.fillStyle = '#5a6278'; ctx.beginPath(); ctx.moveTo(s * .5, -s * .45); ctx.lineTo(s * 1.35, 0); ctx.lineTo(s * .5, s * .45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2e3a'; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * .45, sy * s * .3); ctx.lineTo(s * .2, sy * s * .7); ctx.lineTo(s * .7, sy * s * .35); ctx.fill(); }
      ctx.fillStyle = '#ffd24a'; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(s * .85, sy * s * .15, 1.8, 0, TAU); ctx.fill(); }
      if (m.swing > 0) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s * 1.3, 0, s * .6, -1, 1); ctx.stroke(); }
      break;
    }
    case 'wraith': case 'wraithS': {
      const f = Math.sin(T * 3 + m.id) * 4; ctx.translate(0, -8 + f); ctx.rotate(m.face);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .5; ctx.drawImage(glowSprite(col), -s * 1.8, -s * 1.8, s * 3.6, s * 3.6); ctx.restore();
      ctx.fillStyle = hexA(col, .75);
      ctx.beginPath(); ctx.moveTo(s * .9, 0);
      ctx.bezierCurveTo(s * .9, -s, -s * .4, -s * 1.1, -s * .6, -s * .5);
      for (let i = 0; i < 4; i++) { const ty = -s * .5 + i * s / 3; ctx.lineTo(-s * (1.5 + Math.sin(T * 6 + i) * .25), ty + s / 6); ctx.lineTo(-s * .6, ty + s / 3); }
      ctx.bezierCurveTo(-s * .4, s * 1.1, s * .9, s, s * .9, 0); ctx.fill();
      ctx.fillStyle = '#eafffb'; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * .45, sy * s * .28, s * .14, s * .1, 0, 0, TAU); ctx.fill(); }
      break;
    }
    case 'golem': case 'golemS': {
      const wob = m.moving ? Math.sin(m.anim) * .08 : 0; ctx.rotate(wob);
      const pts = [[-1, -.6], [-.4, -1.05], [.5, -.95], [1.05, -.2], [.8, .7], [0, 1.05], [-.85, .75]];
      const g = ctx.createRadialGradient(-s * .3, -s * .4, 2, 0, 0, s * 1.1); g.addColorStop(0, '#c9b69a'); g.addColorStop(1, '#4a3e32');
      ctx.fillStyle = g; ctx.beginPath(); pts.forEach(([px, py]) => ctx.lineTo(px * s, py * s)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a221a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#4c7a3a'; ctx.beginPath(); ctx.ellipse(-s * .4, -s * .6, s * .35, s * .15, -.4, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .7 + .3 * Math.sin(T * 3); ctx.drawImage(glowSprite('#ffb04a'), -s * .5, -s * .5, s, s); ctx.restore();
      ctx.strokeStyle = 'rgba(255,170,70,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-s * .2, -s * .5); ctx.lineTo(0, 0); ctx.lineTo(s * .4, s * .3); ctx.stroke();
      break;
    }
    case 'mindwell': {
      const f = Math.sin(T * 2) * 5;
      ctx.translate(0, -10 + f);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#4f9fff'), -s * 2, -s * 2, s * 4, s * 4); ctx.restore();
      const g = ctx.createRadialGradient(-s * .3, -s * .3, 2, 0, 0, s); g.addColorStop(0, '#e8f6ff'); g.addColorStop(.5, '#4f8fe0'); g.addColorStop(1, '#10254a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -s * 1.1); ctx.lineTo(s * .8, 0); ctx.lineTo(0, s * 1.1); ctx.lineTo(-s * .8, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(180,220,255,.8)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * .45, T * (1 + i * .3) + i * 2, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -s * .1, 4, 0, TAU); ctx.fill();
      break;
    }
    case 'ember': {
      ctx.rotate(m.face);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .6; ctx.drawImage(glowSprite('#ff5a1a'), -s * 2, -s * 2, s * 4, s * 4); ctx.restore();
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, s); g.addColorStop(0, '#ffcf7a'); g.addColorStop(.4, '#c43a14'); g.addColorStop(1, '#3a0e06');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * .9, s, 0, 0, TAU); ctx.fill();
      for (const sy of [-1, 1]) { ctx.fillStyle = '#2a0e06'; ctx.beginPath(); ctx.arc(s * .1, sy * s * 1.0, s * .38, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffd7a0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * .6, sy * s * .3); ctx.quadraticCurveTo(s * 1.1, sy * s * .6, s * .9, sy * s * .95); ctx.stroke(); }
      ctx.fillStyle = '#ffe06a'; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(s * .65, sy * s * .15, 2.5, 0, TAU); ctx.fill(); }
      if (Math.random() < .4) part({ x: m.x + rnd(-s, s), y: m.y - 10, vy: -90, color: '#ff8a3a', size: 10, life: .5, max: .5 });
      break;
    }
    case 'drake': {
      const flap = Math.sin(T * 5) * .35;
      ctx.rotate(m.face);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .45; ctx.drawImage(glowSprite(col), -s * 2.4, -s * 2.4, s * 4.8, s * 4.8); ctx.restore();
      // wings
      for (const sy of [-1, 1]) {
        ctx.save(); ctx.rotate(sy * flap);
        ctx.fillStyle = hexA(mixHex(col, '#000000', .55).replace('rgb', 'rgb'), 1);
        ctx.fillStyle = mixHex(col, '#1a0a06', .6);
        ctx.beginPath(); ctx.moveTo(-s * .1, sy * s * .3); ctx.quadraticCurveTo(-s * .4, sy * s * 1.9, -s * 1.3, sy * s * 2.1); ctx.lineTo(-s * 1.0, sy * s * 1.4); ctx.lineTo(-s * 1.45, sy * s * 1.5); ctx.lineTo(-s * .9, sy * s * .9); ctx.lineTo(-s * .9, sy * s * .4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA(col, .7); ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = mixHex(col, '#000000', .45); ctx.lineWidth = s * .35; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * .6, 0); ctx.quadraticCurveTo(-s * 1.4, Math.sin(T * 2) * s * .4, -s * 2, Math.sin(T * 2 + 1) * s * .6); ctx.stroke();
      const g = ctx.createRadialGradient(0, -s * .2, 2, 0, 0, s); g.addColorStop(0, mixHex(col, '#ffffff', .35)); g.addColorStop(1, mixHex(col, '#000000', .55));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * .85, s * .55, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = s * .28; ctx.strokeStyle = mixHex(col, '#000000', .35); ctx.beginPath(); ctx.moveTo(s * .6, 0); ctx.lineTo(s * 1.15, 0); ctx.stroke();
      ctx.fillStyle = mixHex(col, '#000000', .3); ctx.beginPath(); ctx.moveTo(s * 1.0, -s * .28); ctx.lineTo(s * 1.65, 0); ctx.lineTo(s * 1.0, s * .28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6c0'; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 1.2, sy * s * .12, 2.5, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#efe2c0'; ctx.lineWidth = 3; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 1.0, sy * s * .2); ctx.lineTo(s * .7, sy * s * .5); ctx.stroke(); }
      break;
    }
    case 'voidmaw': {
      const open = m.wind ? .2 + .8 * m.wind.t / m.wind.dur : m.swing > 0 ? m.swing / .28 : .2 + .1 * Math.sin(T * 2);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + Math.sin(T * .7 + i) * .3;
        ctx.strokeStyle = i % 2 ? '#2a1242' : '#3d1a5e'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .8, Math.sin(a) * s * .6);
        ctx.bezierCurveTo(Math.cos(a) * s * 1.4, Math.sin(a) * s * 1.1 + Math.sin(T * 2 + i) * 12, Math.cos(a + .4) * s * 1.7, Math.sin(a + .4) * s * 1.3, Math.cos(a + .2 + Math.sin(T + i) * .3) * s * 2.0, Math.sin(a + .2) * s * 1.5);
        ctx.stroke();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .6; ctx.drawImage(glowSprite('#8a3dff'), -s * 2.2, -s * 2.2, s * 4.4, s * 4.4); ctx.restore();
      const g = ctx.createRadialGradient(0, -s * .3, 4, 0, 0, s); g.addColorStop(0, '#5a2a8a'); g.addColorStop(.7, '#1e0a30'); g.addColorStop(1, '#0a0412');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s, s * .8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#b36bff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#05010a'; ctx.beginPath(); ctx.ellipse(0, s * .15, s * .55, s * .45 * open + 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8dcff'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * s * .13 - 5, s * .15 - s * .45 * open); ctx.lineTo(i * s * .13, s * .15 - s * .45 * open + 12); ctx.lineTo(i * s * .13 + 5, s * .15 - s * .45 * open); ctx.fill(); }
      for (let i = 0; i < 6; i++) { const ex = Math.cos(i * 1.1 + 3.6) * s * .6, ey = -s * .45 + Math.sin(i * 1.7) * s * .12; const bl = Math.sin(T * 1.5 + i * 2) > .95 ? .2 : 1; ctx.fillStyle = '#ffec6a'; ctx.beginPath(); ctx.ellipse(ex, ey, 5, 5 * bl, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(ex - 1, ey - 3 * bl, 2, 6 * bl); }
      break;
    }
  }
  ctx.restore();
  if (m.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = m.hitT * 3; ctx.drawImage(glowSprite('#ffffff'), m.x - s, m.y - s - 4, s * 2, s * 2); ctx.restore(); }
  if (m.wind && m.ranged) { const k = m.wind.t / m.wind.dur, hx = m.x + Math.cos(m.face) * s * 1.1, hy = m.y - 4 + Math.sin(m.face) * s * 1.1, o = 8 + k * 30; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(col), hx - o, hy - o, o * 2, o * 2); ctx.restore(); }
  if (m.stun > 0 || m.root > 0 || m.slows.length) drawStatusFx(m, T, s);
}

function drawProj(p, T) {
  const a = p.ang || 0;
  if (!p.homing) {
    const col = relCol(p.owner), rem = Math.max(0, p.range - p.trav);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    ctx.fillStyle = hexA(col, .07); ctx.fillRect(0, -p.w / 2, rem, p.w);
    ctx.strokeStyle = hexA(col, .25); ctx.lineWidth = 1; ctx.strokeRect(0, -p.w / 2, rem, p.w);
    ctx.strokeStyle = hexA(col, .9); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-p.w * .7, -p.w / 2, p.w * 1.4, p.w, p.w / 2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  switch (p.style) {
    case 'bolt': ctx.drawImage(glowSprite('#8fd0ff'), p.x - 26, p.y - 26, 52, 52); ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); for (let i = 1; i < 5; i++) ctx.lineTo(p.x - Math.cos(a) * i * 12 + rnd(-5, 5), p.y - Math.sin(a) * i * 12 + rnd(-5, 5)); ctx.stroke(); break;
    case 'thorn': ctx.drawImage(glowSprite('#8aff7a'), p.x - 22, p.y - 22, 44, 44); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(T * 12); ctx.fillStyle = '#d8ffb0'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(12, 0); ctx.lineTo(0, 3); ctx.fill(); } ctx.restore(); break;
    case 'hook': { const o = p.owner; ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.strokeStyle = '#e0e0ea'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 10, -2, 2); ctx.stroke(); ctx.restore(); break; }
    case 'arrow': ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * 28, p.y - Math.sin(a) * 28); ctx.stroke(); ctx.drawImage(glowSprite(p.color), p.x - 12, p.y - 12, 24, 24); break;
    case 'bigarrow': ctx.drawImage(glowSprite('#8ff0e0'), p.x - 60, p.y - 60, 120, 120); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillStyle = '#eafffb'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(200,255,245,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-90, 0); ctx.stroke(); ctx.restore(); break;
    case 'tower': ctx.drawImage(glowSprite(p.color), p.x - 26, p.y - 26, 52, 52); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); break;
    case 'void': ctx.drawImage(glowSprite('#9a4dff'), p.x - 30, p.y - 30, 60, 60); ctx.fillStyle = '#1a0630'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.fill(); break;
    case 'fire': ctx.drawImage(glowSprite(p.color), p.x - 30, p.y - 30, 60, 60); ctx.drawImage(glowSprite('#ffffff'), p.x - 8, p.y - 8, 16, 16); break;
    case 'cannon': ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(p.color), p.x - 10, p.y - 10, 20, 20); break;
    case 'soul': ctx.drawImage(glowSprite('#6fe0a8'), p.x - 22, p.y - 22, 44, 44); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#efe8d2'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#0b0910'; ctx.fillRect(p.x - 2.5, p.y - 1.5, 1.6, 1.6); ctx.fillRect(p.x + .9, p.y - 1.5, 1.6, 1.6); if (Math.random() < .6) part({ x: p.x, y: p.y, vy: -30, color: '#6fe0a8', size: 8, life: .35, max: .35 }); break;
    case 'shell': ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ffb347'), p.x - 12, p.y - 12, 24, 24); if (Math.random() < .5) G.parts.push({ kind: 'glow', x: p.x, y: p.y, vx: 0, vy: -10, life: .35, max: .35, size: 6, color: '#b8b8c0', add: false, drag: .9, grav: 0 }); break;
    case 'bone': { ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillStyle = '#efe8d2'; ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(6, -5); ctx.lineTo(-22, -3); ctx.lineTo(-22, 3); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#6fe0a8'), p.x - 20, p.y - 20, 40, 40); break; }
    case 'orbzap': ctx.drawImage(glowSprite('#8fd0ff'), p.x - 24, p.y - 24, 48, 48); ctx.drawImage(glowSprite('#ffffff'), p.x - 7, p.y - 7, 14, 14); ctx.strokeStyle = '#eaf7ff'; ctx.lineWidth = 1.5; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + rnd(-14, 14), p.y + rnd(-14, 14)); ctx.stroke(); } part({ x: p.x, y: p.y, color: '#8fd0ff', size: 10, life: .2, max: .2 }); break;
    case 'arrowb': { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.strokeStyle = 'rgba(191,255,240,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-60, 0); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#eafffb'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.fill(); ctx.fillStyle = '#8ff0e0'; ctx.fillRect(-20, -3, 5, 6); ctx.restore(); break; }
    case 'seed': { ctx.drawImage(glowSprite('#9dff8a'), p.x - 20, p.y - 20, 40, 40); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(G.t * 14); ctx.globalCompositeOperation = 'source-over'; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.fillStyle = i ? '#7fe08a' : '#d8ffb0'; ctx.beginPath(); ctx.ellipse(6, 0, 6, 2.5, 0, 0, TAU); ctx.fill(); } ctx.restore(); if (Math.random() < .5) part({ x: p.x, y: p.y, vx: rnd(-30, 30), vy: rnd(-30, 30), color: '#b9f58a', size: 6, life: .4, max: .4 }); break; }
    case 'hbolt': ctx.drawImage(glowSprite(p.color), p.x - 18, p.y - 18, 36, 36); ctx.drawImage(glowSprite('#ffffff'), p.x - 5, p.y - 5, 10, 10); ctx.strokeStyle = hexA(p.color, .6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * 22, p.y - Math.sin(a) * 22); ctx.stroke(); break;
    default: ctx.drawImage(glowSprite(p.color), p.x - 12, p.y - 12, 24, 24);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawBars(u, z) {
  const inv = 1 / Math.max(.75, z);
  if (u.kind === 'hero') {
    const w = 78 * inv, h = 9 * inv, x = u.x - w / 2, y = u.y - unitTop(u) - 12 * inv;
    const col = u === G.player ? '#8ee06b' : u.team === (G.player ? G.player.team : 0) ? '#4cc3ff' : '#ff5a48';
    ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 6 * inv);
    const sh = shieldAmt(u), tot = Math.max(u.maxHp, u.hp + sh);
    ctx.fillStyle = col; ctx.fillRect(x, y, w * u.hp / tot, h);
    if (u.hpLag > u.hp + 1) { ctx.fillStyle = '#f6dc8c'; ctx.fillRect(x + w * u.hp / tot, y, w * Math.min(u.hpLag - u.hp, tot - u.hp) / tot, h); }
    if (sh > 0) { ctx.fillStyle = '#e8ecf4'; ctx.fillRect(x + w * u.hp / tot, y, w * sh / tot, h); }
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    for (let v = 200; v < tot; v += 200) ctx.fillRect(x + w * v / tot, y, v % 1000 ? .8 * inv : 1.6 * inv, h * (v % 1000 ? .5 : 1));
    ctx.fillStyle = '#4f82ff'; ctx.fillRect(x, y + h + 1 * inv, w * u.mana / u.maxMana, 3 * inv);
    // level badge
    ctx.fillStyle = '#0b1016'; ctx.fillRect(x - 17 * inv, y - 1, 15 * inv, h + 6 * inv);
    ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 1 * inv; ctx.strokeRect(x - 17 * inv, y - 1, 15 * inv, h + 6 * inv);
    ctx.fillStyle = '#f3d892'; ctx.font = `700 ${11 * inv}px 'Barlow Semi Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(u.level, x - 9.5 * inv, y + h / 2 + 2 * inv);
    ctx.font = `600 ${12 * inv}px 'Barlow Semi Condensed', sans-serif`; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3 * inv; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(u.name, u.x, y - 4 * inv);
    ctx.fillStyle = u === G.player ? '#f3d892' : '#eee6d4'; ctx.fillText(u.name, u.x, y - 4 * inv);
    const cl = u.castLabel;
    if (cl && G.t - cl.t < cl.dur) {
      const k = Math.min(1, (cl.dur - (G.t - cl.t)) * 4), rc = relCol(u);
      ctx.globalAlpha = k;
      ctx.font = `700 ${12 * inv}px 'Barlow Semi Condensed', sans-serif`;
      const tw = ctx.measureText(cl.name.toUpperCase()).width + 14 * inv, py = y - 30 * inv;
      ctx.fillStyle = 'rgba(8,10,14,.9)'; ctx.fillRect(u.x - tw / 2, py - 11 * inv, tw, 15 * inv);
      ctx.strokeStyle = rc; ctx.lineWidth = 1.5 * inv; ctx.strokeRect(u.x - tw / 2, py - 11 * inv, tw, 15 * inv);
      ctx.fillStyle = rc; ctx.fillText(cl.name.toUpperCase(), u.x, py);
      ctx.globalAlpha = 1;
    }
  } else if (u.kind === 'minion') {
    const P0 = G.player;
    const lastHit = P0 && !P0.dead && u.team !== P0.team && u.vis[P0.team] && Math.hypot(u.x - P0.x, u.y - P0.y) < 900 && u.hp <= P0.atk * 1.25 * (100 / (100 + u.armor * (1 - P0.s.pen)));
    if (u.hp >= u.maxHp && !lastHit) return;
    const w = 32 * inv, h = 4 * inv, x = u.x - w / 2, y = u.y - unitTop(u) - 6 * inv;
    ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = lastHit ? '#ffe7a0' : u.team === (G.player ? G.player.team : 0) ? '#4cc3ff' : '#ff5a48'; ctx.fillRect(x, y, w * u.hp / u.maxHp, h);
    if (lastHit) { ctx.strokeStyle = `rgba(255,210,74,${.7 + .3 * Math.sin(G.t * 12)})`; ctx.lineWidth = 1.5 * inv; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x - 6 * inv, y + h / 2, 3 * inv, 0, TAU); ctx.fill(); }
  } else if (isStruct(u)) {
    const w = (u.kind === 'ancient' ? 130 : u.kind === 'inhib' ? 80 : 96) * inv, h = 8 * inv, x = u.x - w / 2, y = u.y - (u.kind === 'ancient' ? 170 : u.kind === 'inhib' ? 84 : 118);
    ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = TEAMCOL[u.team]; ctx.fillRect(x, y, w * u.hp / u.maxHp, h);
    if (u.hpLag > u.hp + 1) { ctx.fillStyle = '#f6dc8c'; ctx.fillRect(x + w * u.hp / u.maxHp, y, w * (u.hpLag - u.hp) / u.maxHp, h); }
    if (structProtected(u)) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, w, h); }
  } else if (u.kind === 'monster') {
    if (u.hp >= u.maxHp && !u.boss) return;
    const w = (u.boss ? 150 : 56) * inv, h = (u.boss ? 9 : 5) * inv, x = u.x - w / 2, y = u.y - u.r - (u.boss ? 40 : 16) * inv;
    ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#e8c35a'; ctx.fillRect(x, y, w * u.hp / u.maxHp, h);
    if (u.hpLag > u.hp + 1) { ctx.fillStyle = '#fff2c4'; ctx.fillRect(x + w * u.hp / u.maxHp, y, w * (u.hpLag - u.hp) / u.maxHp, h); }
    if (u.boss) { ctx.font = `600 ${13 * inv}px 'Barlow Semi Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * inv; ctx.strokeStyle = '#000'; ctx.strokeText(u.name, u.x, y - 5 * inv); ctx.fillStyle = u.color; ctx.fillText(u.name, u.x, y - 5 * inv); }
  }
}

function drawMinimap() {
  const mc = document.getElementById('minimap'), m = mc.getContext('2d');
  const MW = 720, MH = 400, sx = MW / W, sy = MH / H;
  m.drawImage(MINI, 0, 0);
  const team = G.player ? G.player.team : null;
  if (team !== null) {
    m.save(); m.fillStyle = 'rgba(0,0,0,.42)'; m.beginPath(); m.rect(0, 0, MW, MH);
    for (const s of G.visSrc) { m.moveTo(s.x * sx + s.r * sx, s.y * sy); m.arc(s.x * sx, s.y * sy, s.r * sx, 0, TAU, true); }
    m.fill('evenodd'); m.restore();
  }
  const dia = (x, y, r, fill, stroke) => { m.beginPath(); m.moveTo(x, y - r); m.lineTo(x + r, y); m.lineTo(x, y + r); m.lineTo(x - r, y); m.closePath(); m.fillStyle = fill; m.fill(); if (stroke) { m.strokeStyle = stroke; m.lineWidth = 2; m.stroke(); } };
  for (const c of G.camps) { const al = c.units.some(u => !u.dead); m.fillStyle = al ? '#e8c35a' : '#3a3a3a'; m.beginPath(); m.arc(c.x * sx, c.y * sy, al ? 6 : 4, 0, TAU); m.fill(); if (al) { m.strokeStyle = '#000'; m.lineWidth = 1.5; m.stroke(); } }
  const vm = G.voidmaw.unit;
  dia(PIT_VOID.x * sx, PIT_VOID.y * sy, 11, vm && !vm.dead ? '#b36bff' : '#2a2034', '#000');
  for (const A of G.altars) { dia(A.x * sx, A.y * sy, 10, A.owner < 0 ? '#8a8578' : TEAMCOL[A.owner], G.t >= A.unlock ? '#f3d892' : '#000'); for (const tm of [0, 1]) if (A.prog[tm] > 0) { m.strokeStyle = TEAMCOL[tm]; m.lineWidth = 3; m.beginPath(); m.arc(A.x * sx, A.y * sy, 15, -Math.PI / 2, -Math.PI / 2 + TAU * A.prog[tm] / ALTAR_CAP); m.stroke(); } }
  m.fillStyle = G.relic.up ? '#9dff8a' : '#2a3a2a'; m.beginPath(); m.arc(RELIC.x * sx, RELIC.y * sy, 7, 0, TAU); m.fill(); m.strokeStyle = '#000'; m.lineWidth = 1.5; m.stroke();
  m.strokeStyle = '#8ff0e0'; m.lineWidth = 2; m.beginPath(); m.arc(SPEED_SHRINE.x * sx, SPEED_SHRINE.y * sy, 7, 0, TAU); m.stroke();
  for (const u of G.units) {
    if (u.kind === 'minion' && !u.dead && (team === null || u.vis[team])) { m.fillStyle = TEAMCOL[u.team]; m.fillRect(u.x * sx - 2.5, u.y * sy - 2.5, u.mtype === 'super' ? 7 : 5, u.mtype === 'super' ? 7 : 5); }
    else if (isStruct(u)) {
      const X = u.x * sx, Y = u.y * sy, col = u.dead ? '#333' : TEAMCOL[u.team];
      if (u.kind === 'inhib') dia(X, Y, 8, col, '#000');
      else { const s2 = u.kind === 'ancient' ? 16 : 11; m.fillStyle = col; m.fillRect(X - s2 / 2, Y - s2 / 2, s2, s2); m.strokeStyle = '#000'; m.lineWidth = 2; m.strokeRect(X - s2 / 2, Y - s2 / 2, s2, s2); }
    }
  }
  for (const h of G.heroes) {
    if (h.dead || (team !== null && !h.vis[team])) continue;
    const r = h === G.player ? 15 : 12, X = h.x * sx, Y = h.y * sy;
    m.fillStyle = h.def.c1; m.beginPath(); m.arc(X, Y, r, 0, TAU); m.fill();
    m.fillStyle = '#0b0f14'; m.font = `700 ${r}px 'Barlow Semi Condensed', sans-serif`; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(h.name[0], X, Y + 1);
    m.lineWidth = h === G.player ? 4 : 3; m.strokeStyle = h === G.player ? '#9be870' : TEAMCOL[h.team]; m.beginPath(); m.arc(X, Y, r, 0, TAU); m.stroke();
  }
  for (const k of G.marks) if (k.t > 1) { m.strokeStyle = k.col; m.lineWidth = 3; m.beginPath(); m.arc(k.x * sx, k.y * sy, 14 + ((4 - k.t) * 10) % 20, 0, TAU); m.stroke(); }
  const c = G.cam, vw = VW / c.z, vh = VH / c.z;
  m.strokeStyle = 'rgba(255,255,255,.85)'; m.lineWidth = 2; m.strokeRect((c.x - vw / 2) * sx, (c.y - vh / 2) * sy, vw * sx, vh * sy);
}
