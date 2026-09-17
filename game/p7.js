
/* =========================================================
   CHARACTER RIGS — upright chibi models with bold ink lines,
   hard cel shading and per-character silhouettes
   (origin = feet, +x = facing direction, y up is negative)
   ========================================================= */
let X = null; // active rig context (main canvas or the hero-select model stage)
const INK = '#0b0910';
const easeOut = t => 1 - (1 - t) * (1 - t);
function cel(x0, y0, x1, y1, lit, shade, split = .55) {
  const g = X.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, lit); g.addColorStop(split, lit); g.addColorStop(Math.min(1, split + .01), shade); g.addColorStop(1, shade);
  return g;
}
function inkFill(fill, lw = 2) { X.fillStyle = fill; X.fill(); X.lineWidth = lw; X.strokeStyle = INK; X.stroke(); }
function shape(fn, fill, lw = 2) { X.beginPath(); fn(); inkFill(fill, lw); }
function limb(x1, y1, x2, y2, w, col, bend = 0) {
  X.lineCap = 'round'; X.lineJoin = 'round';
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  for (const [c, lw] of [[INK, w + 3], [col, w]]) { X.strokeStyle = c; X.lineWidth = lw; X.beginPath(); X.moveTo(x1, y1); X.quadraticCurveTo(mx, my, x2, y2); X.stroke(); }
}
function circle(x, y, r, fill, lw = 2) { shape(() => X.arc(x, y, r, 0, TAU), fill, lw); }
function glow(x, y, r, col, a = 1) { X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha *= a; X.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); X.restore(); }
function animeEye(x, y, s, iris, angry = 0) {
  X.save(); X.translate(x, y);
  shape(() => X.ellipse(0, 0, s * .75, s, 0, 0, TAU), '#ffffff', 1.4);
  X.fillStyle = iris; X.beginPath(); X.ellipse(s * .18, s * .12, s * .5, s * .78, 0, 0, TAU); X.fill();
  X.fillStyle = INK; X.beginPath(); X.ellipse(s * .24, s * .2, s * .25, s * .42, 0, 0, TAU); X.fill();
  X.fillStyle = '#fff'; X.beginPath(); X.arc(s * .02, -s * .3, s * .2, 0, TAU); X.fill(); X.beginPath(); X.arc(s * .38, s * .42, s * .09, 0, TAU); X.fill();
  X.strokeStyle = INK; X.lineWidth = 2; X.lineCap = 'round';
  X.beginPath(); X.moveTo(-s * .8, -s * (1.1 + angry * .1) + angry * s * -.2); X.lineTo(s * .9, -s * 1.15 + angry * s * .45); X.stroke();
  X.restore();
}
function glowEye(x, y, col, s = 2.4) { glow(x, y, s * 4, col, .9); X.fillStyle = '#ffffff'; X.beginPath(); X.ellipse(x, y, s, s * .55, 0, 0, TAU); X.fill(); }
function feet(P, hip, spread, len, w, col, colB, boot, crouch = 0) {
  const sw = Math.sin(P.ph) * P.m, lift = Math.cos(P.ph) * P.m;
  const bx = -spread + sw * 8, fx = spread - sw * 8;
  const by = -Math.max(0, lift) * 4, fy = -Math.max(0, -lift) * 4;
  limb(-spread * .4, hip, bx, by - 3, w, colB, crouch * .25);
  shape(() => X.ellipse(bx + 2, by - 2, w * .85, w * .5, 0, 0, TAU), boot, 1.6);
  limb(spread * .4, hip, fx, fy - 3, w, col, crouch * .25);
  shape(() => X.ellipse(fx + 2, fy - 2, w * .85, w * .5, 0, 0, TAU), boot, 1.6);
}
function pose(u, T) {
  if (Math.abs(Math.cos(u.face)) > .2) u.dirX = Math.cos(u.face) > 0 ? 1 : -1;
  const m = u.moving ? 1 : 0;
  return {
    m, ph: u.anim || 0, T, id: u.id || 0, dir: u.dirX || 1,
    bob: m ? -Math.abs(Math.sin(u.anim || 0)) * 2.2 : Math.sin(T * 2.4 + (u.id || 0)) * .8,
    aim: clamp(Math.atan2(Math.sin(u.face), Math.abs(Math.cos(u.face))), -1.2, 1.2),
    windK: u.wind ? u.wind.t / u.wind.dur : 0,
    swingK: u.swing > 0 ? 1 - u.swing / .28 : -1,
    cast: u.casting ? Math.min(1, u.casting.t / u.casting.dur) : 0,
    alt: (u.atkCount || 0) % 2,
  };
}
function meleeAng(P, rest) {
  if (P.windK > 0) return lerp(rest, -2.35, easeOut(P.windK)) + P.aim * .3;
  if (P.swingK >= 0) return P.swingK < .25 ? lerp(-2.35, 1.7, P.swingK / .25) + P.aim * .3 : lerp(1.7, rest, (P.swingK - .25) / .75);
  if (P.cast) return lerp(rest, -1.5, P.cast);
  return rest + Math.sin(P.T * 2 + P.id) * .06;
}
function aimAng(P, rest) {
  if (P.windK > 0 || (P.swingK >= 0 && P.swingK < .6)) return P.aim;
  if (P.cast) return lerp(rest, -1.3, P.cast);
  return rest + Math.sin(P.T * 2 + P.id) * .06;
}
const pull = P => P.windK > 0 ? easeOut(P.windK) : 0;
const snap = P => P.swingK >= 0 && P.swingK < .5 ? 1 - P.swingK * 2 : 0;
function armTo(sx, sy, ang, len, w, col, bend = .12) { const hx = sx + Math.cos(ang) * len, hy = sy + Math.sin(ang) * len; limb(sx, sy, hx, hy, w, col, bend); return [hx, hy]; }
function swoosh(sx, sy, r, from, to, col, k) {
  if (k <= 0) return;
  X.save(); X.globalCompositeOperation = 'lighter';
  X.strokeStyle = hexA(col, .85 * k); X.lineWidth = 14 * k + 2; X.lineCap = 'round';
  X.beginPath(); X.arc(sx, sy, r, Math.min(from, to), Math.max(from, to)); X.stroke();
  X.strokeStyle = `rgba(255,255,255,${.9 * k})`; X.lineWidth = 3 * k + 1;
  X.beginPath(); X.arc(sx, sy, r + 2, Math.min(from, to) + .15, Math.max(from, to)); X.stroke();
  // anime speed ticks along the arc
  X.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) { const a = lerp(from, to, i / 5); X.beginPath(); X.moveTo(sx + Math.cos(a) * (r + 6), sy + Math.sin(a) * (r + 6)); X.lineTo(sx + Math.cos(a) * (r + 14), sy + Math.sin(a) * (r + 14)); X.stroke(); }
  X.restore();
}

/* ---------------- champions ---------------- */
const RIG = {
  kael(P) { // Iron Warden: tower shield, horned great-helm, crimson cape
    const b = P.bob;
    const sway = Math.sin(P.T * 3 + P.ph) * 3 * (P.m + .3);
    shape(() => { X.moveTo(-6, -46 + b); X.quadraticCurveTo(-20, -30, -24 + sway, -4); X.lineTo(-10, -2); X.quadraticCurveTo(-6, -24, 4, -44 + b); X.closePath(); }, cel(-24, 0, -4, 0, '#a8321f', '#5a160c', .45));
    feet(P, -22 + b, 7, 20, 7, '#9aa2b4', '#6a7284', '#3a3e4a');
    const bA = -.2 + (P.windK > 0 ? -.3 * P.windK : 0);
    armTo(-5, -40 + b, 1.6 + bA, 12, 7, '#7a8294');
    // torso plate
    shape(() => { X.moveTo(-12, -46 + b); X.lineTo(12, -46 + b); X.lineTo(10, -20 + b); X.lineTo(-10, -20 + b); X.closePath(); }, cel(-12, 0, 12, 0, '#dfe3ec', '#7d8597', .5));
    shape(() => X.rect(-10, -24 + b, 20, 5), '#f0b453', 1.5);
    shape(() => { X.moveTo(-6, -38 + b); X.lineTo(8, -38 + b); X.lineTo(6, -14 + b); X.lineTo(-4, -14 + b); X.closePath(); }, cel(-6, 0, 8, 0, '#8a5a2a', '#52331a'), 1.5);
    X.fillStyle = '#f0b453'; X.beginPath(); X.moveTo(1, -34 + b); X.lineTo(4, -30 + b); X.lineTo(1, -26 + b); X.lineTo(-2, -30 + b); X.fill();
    circle(-8, -45 + b, 7, cel(-15, 0, -1, 0, '#e6e9f0', '#8a92a4'));
    // great-helm with horns
    const hy = -56 + b;
    X.lineCap = 'round';
    for (const [c, w] of [[INK, 7], ['#efe2c0', 4]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(-4, hy - 6); X.quadraticCurveTo(-16, hy - 14, -14, hy - 26); X.stroke(); X.beginPath(); X.moveTo(6, hy - 8); X.quadraticCurveTo(14, hy - 18, 10, hy - 28); X.stroke(); }
    shape(() => { X.moveTo(-10, hy + 10); X.lineTo(-11, hy - 4); X.quadraticCurveTo(0, hy - 16, 11, hy - 4); X.lineTo(12, hy + 9); X.quadraticCurveTo(0, hy + 13, -10, hy + 10); X.closePath(); }, cel(-11, 0, 12, 0, '#e2e6ee', '#7d8597', .55));
    X.fillStyle = '#1a1410'; X.fillRect(1, hy - 2, 11, 3); X.fillRect(5, hy - 2, 3, 9);
    glow(8, hy - .5, 7, '#ffd978', .9);
    X.fillStyle = '#f0b453'; X.fillRect(-2, hy - 12, 3, 22);
    // tower shield (off-hand, in front)
    const sx = 10 + snap(P) * 4 - pull(P) * 2, sy = -30 + b;
    shape(() => { X.moveTo(sx - 5, sy - 16); X.lineTo(sx + 6, sy - 15); X.lineTo(sx + 7, sy + 8); X.quadraticCurveTo(sx + 1, sy + 18, sx - 5, sy + 10); X.closePath(); }, cel(sx - 5, 0, sx + 7, 0, '#a07a44', '#5e4520', .45));
    X.strokeStyle = '#f0b453'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(sx + 1, sy - 12); X.lineTo(sx + 1, sy + 10); X.stroke();
    // sword arm
    const a = meleeAng(P, .95), [hx, hy2] = armTo(4, -41 + b, a, 13, 7, '#9aa2b4');
    swoosh(4, -41 + b, 40, -2.35, a, '#ffd978', snap(P));
    X.save(); X.translate(hx, hy2); X.rotate(a - .45);
    shape(() => { X.moveTo(3, -2.5); X.lineTo(34, -2); X.lineTo(38, 0); X.lineTo(34, 2); X.lineTo(3, 2.5); X.closePath(); }, cel(0, -3, 0, 3, '#ffffff', '#aeb6c6', .45), 1.6);
    shape(() => X.rect(1, -7, 3, 14), '#f0b453', 1.4);
    shape(() => X.rect(-7, -2, 8, 4), '#5a3a20', 1.2);
    X.restore();
  },

  vesp(P) { // Stormcaller: floating, tall curled hood, lightning staff
    const f = Math.sin(P.T * 2.2 + P.id) * 2.5 - 6;
    glow(0, -26 + f, 26, '#4f9fff', .35);
    // robe with jagged hem
    shape(() => {
      X.moveTo(-8, -44 + f); X.lineTo(8, -44 + f); X.quadraticCurveTo(12, -24 + f, 16, -6 + f);
      for (let i = 0; i <= 6; i++) X.lineTo(16 - i * 5.3, -6 + f + (i % 2 ? -5 : 1) + Math.sin(P.T * 6 + i) * 1.2);
      X.quadraticCurveTo(-12, -24 + f, -8, -44 + f); X.closePath();
    }, cel(-16, 0, 16, 0, '#4a74d8', '#1b2c66', .52));
    X.strokeStyle = '#9fe0ff'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(0, -40 + f); X.lineTo(3, -30 + f); X.lineTo(-2, -24 + f); X.lineTo(2, -12 + f); X.stroke();
    glow(1, -28 + f, 8, '#9fe0ff', .6);
    // back hand spark
    const [bx, by] = armTo(-4, -40 + f, 2.2 - P.cast * 1.2, 10, 5, '#2c4690');
    glow(bx, by, 7 + Math.sin(P.T * 9) * 2, '#bfe6ff', .9);
    // hood
    const hy = -54 + f;
    shape(() => { X.moveTo(-12, hy + 12); X.quadraticCurveTo(-15, hy - 6, -6, hy - 14); X.quadraticCurveTo(-2, hy - 26, -14, hy - 30); X.quadraticCurveTo(4, hy - 30, 8, hy - 12); X.quadraticCurveTo(14, hy - 2, 12, hy + 12); X.closePath(); }, cel(-15, 0, 12, 0, '#3b5fbf', '#152258', .5));
    shape(() => X.ellipse(4, hy + 2, 7, 8, 0, 0, TAU), '#0a0f22', 1.2);
    glowEye(4, hy + 1, '#dff4ff', 2); glowEye(9, hy + 1.5, '#dff4ff', 1.6);
    // staff
    const a = aimAng(P, .5), [hx, hy2] = armTo(5, -40 + f, a, 12, 5, '#3b5fbf');
    X.save(); X.translate(hx, hy2); X.rotate(a - 1.35);
    limb(0, 18, 0, -30, 3, '#7a5530', 0);
    shape(() => { X.moveTo(-5, -30); X.quadraticCurveTo(-7, -40, 0, -44); X.quadraticCurveTo(7, -40, 5, -30); }, '#c9a45c', 1.4);
    const orb = 5 + pull(P) * 6 + snap(P) * 4;
    glow(0, -37, orb * 3.4, '#8fd0ff');
    X.fillStyle = '#eaf7ff'; X.beginPath(); X.arc(0, -37, orb * .75, 0, TAU); X.fill();
    if (pull(P) > .2 || snap(P) > .3) { X.strokeStyle = '#eaf7ff'; X.lineWidth = 1.5; for (let i = 0; i < 3; i++) { X.beginPath(); let px = 0, py = -37; X.moveTo(px, py); for (let j = 0; j < 4; j++) { px += rnd(-7, 7); py += rnd(-8, 2); X.lineTo(px, py); } X.stroke(); } }
    X.restore();
  },

  nyx(P) { // Shadeblade: crouched, trailing anime scarf, reverse-grip daggers
    const b = P.bob + 3, lean = .18 + P.m * .12;
    // scarf ribbon
    const len = 26 + P.m * 14;
    X.save();
    X.beginPath(); X.moveTo(0, -44 + b);
    const tipX = -len, tipY = -40 + b + Math.sin(P.T * 7) * 5;
    X.bezierCurveTo(-len * .35, -48 + b + Math.sin(P.T * 6) * 4, -len * .7, -36 + b + Math.sin(P.T * 6 + 1) * 5, tipX, tipY);
    X.lineTo(tipX + 2, tipY + 6);
    X.bezierCurveTo(-len * .7, -30 + b + Math.sin(P.T * 6 + 1) * 5, -len * .35, -40 + b, 2, -39 + b);
    X.closePath(); inkFill(cel(0, -48, 0, -30, '#c48bff', '#6a3dbd', .5), 1.6);
    X.restore();
    feet(P, -18 + b, 9, 16, 6, '#4a3470', '#2e1d48', '#1a1028', 1);
    X.save(); X.translate(0, -18 + b); X.rotate(lean);
    armTo(-3, -20, 1.2 + (P.alt ? meleeAng(P, 1.0) - 1 : 0) * .8, 11, 5, '#241638');
    shape(() => { X.moveTo(-8, -24); X.lineTo(8, -24); X.lineTo(7, 0); X.lineTo(-7, 0); X.closePath(); }, cel(-8, 0, 8, 0, '#6a4a9a', '#2e1d48', .5));
    shape(() => X.rect(-7, -4, 14, 4), '#b36bff', 1.2);
    X.strokeStyle = '#b36bff'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(-6, -22); X.lineTo(6, -4); X.stroke();
    // head: cowl + mask + one sharp anime eye + white hair tuft
    const hy = -33;
    shape(() => { X.moveTo(-10, hy - 2); X.quadraticCurveTo(-4, hy - 18, 6, hy - 12); X.lineTo(12, hy - 18); X.lineTo(10, hy - 8); X.quadraticCurveTo(13, hy, 9, hy + 8); X.quadraticCurveTo(0, hy + 12, -10, hy + 6); X.closePath(); }, cel(-10, 0, 12, 0, '#f1e3ff', '#b19bd0', .5), 1.8);
    shape(() => X.arc(0, hy, 10, 0, TAU), cel(-10, 0, 10, 0, '#5a3a86', '#2a1a44', .5));
    shape(() => { X.moveTo(-2, hy + 1); X.lineTo(10, hy + 1); X.quadraticCurveTo(10, hy + 9, 2, hy + 10); X.closePath(); }, '#1a1028', 1.2);
    X.save(); X.translate(5, hy - 3); X.scale(1, .55); animeEye(0, 0, 3.4, '#c48bff', 1); X.restore();
    // daggers
    const lead = P.alt ? 1 : 0;
    for (const which of [0, 1]) {
      const act = which === lead;
      const a = act ? meleeAng(P, .6) : .9 + Math.sin(P.T * 3) * .05;
      const [hx, hy2] = armTo(which ? -1 : 3, -20, a, 11, 5, which ? '#241638' : '#34224e');
      X.save(); X.translate(hx, hy2); X.rotate(a + 1.9);
      shape(() => { X.moveTo(0, -2); X.lineTo(18, -1); X.lineTo(22, 1); X.lineTo(0, 2); X.closePath(); }, cel(0, -2, 0, 2, '#ffffff', '#c9b6ea', .5), 1.3);
      X.restore();
      if (act) swoosh(2, -20, 26, -2.35, a, '#b36bff', snap(P));
    }
    X.restore();
  },

  oryn(P) { // Grovekeeper: walking tree, antlers, lantern-seed staff
    const b = P.bob * .7;
    // root legs
    feet(P, -20 + b, 9, 18, 9, '#6a4a2e', '#4a321e', '#3a2616');
    const bA = P.cast ? -1.4 * P.cast + 1.8 : 1.8 + Math.sin(P.T * 2) * .05;
    const [lx, ly] = armTo(-9, -44 + b, bA, 16, 7, '#5a3e24', .2);
    for (let i = 0; i < 3; i++) { X.fillStyle = i % 2 ? '#7fe08a' : '#b9f58a'; X.beginPath(); X.ellipse(lx + Math.cos(i * 2) * 4, ly + Math.sin(i * 2) * 4, 4, 2.2, i, 0, TAU); X.fill(); }
    // barrel trunk
    shape(() => { X.moveTo(-14, -50 + b); X.quadraticCurveTo(-18, -34 + b, -12, -18 + b); X.lineTo(12, -18 + b); X.quadraticCurveTo(18, -34 + b, 14, -50 + b); X.closePath(); }, cel(-18, 0, 18, 0, '#8a6a44', '#4a321e', .5));
    X.strokeStyle = 'rgba(30,18,8,.6)'; X.lineWidth = 1.4;
    for (const xx of [-8, -2, 5, 10]) { X.beginPath(); X.moveTo(xx, -48 + b); X.quadraticCurveTo(xx + 2, -34 + b, xx - 1, -20 + b); X.stroke(); }
    glow(2, -34 + b, 11, '#9dff8a', .8); X.fillStyle = '#eaffd0'; X.beginPath(); X.ellipse(2, -34 + b, 3, 4, 0, 0, TAU); X.fill();
    // moss shoulders
    for (const sx of [-10, 10]) shape(() => X.ellipse(sx, -50 + b, 9, 5, 0, 0, TAU), cel(0, -55, 0, -45, '#8ee07a', '#3f8a44'), 1.5);
    // long face + leaf beard + antlers
    const hy = -64 + b;
    X.strokeStyle = INK; X.lineCap = 'round';
    const antler = (s) => { for (const [c, w] of [[INK, 5], ['#e0cfa2', 2.6]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(s * 3, hy - 8); X.lineTo(s * 9 - 2, hy - 22); X.lineTo(s * 8 - 2, hy - 32); X.moveTo(s * 8 - 2, hy - 18); X.lineTo(s * 16 - 2, hy - 24); X.moveTo(s * 9 - 2, hy - 25); X.lineTo(s * 3 - 2, hy - 30); X.stroke(); } };
    antler(-1); antler(1);
    shape(() => X.ellipse(2, hy, 9, 12, 0, 0, TAU), cel(-7, 0, 11, 0, '#9a7a54', '#5a3e24', .55));
    for (let i = 0; i < 5; i++) shape(() => X.ellipse(-2 + i * 2.8, hy + 10 + (i % 2) * 3, 3, 5, .3 * (i - 2), 0, TAU), i % 2 ? '#6fc36a' : '#4a9a4a', 1);
    glowEye(4, hy - 2, '#d8ffb0', 1.8); glowEye(9, hy - 1.5, '#d8ffb0', 1.5);
    for (let i = 0; i < 3; i++) { const a = P.T * 1.5 + i * 2.1; X.fillStyle = '#b9f58a'; X.beginPath(); X.ellipse(Math.cos(a) * 20, hy - 10 + Math.sin(a * 1.3) * 12, 3, 1.6, a, 0, TAU); X.fill(); }
    // staff
    const a = aimAng(P, .7), [hx, hy2] = armTo(8, -44 + b, a, 15, 7, '#6a4a2e', .15);
    X.save(); X.translate(hx, hy2); X.rotate(a - 1.3);
    limb(0, 20, 2, -26, 4, '#5a3a1a', .1);
    const s2 = 4 + pull(P) * 5 + snap(P) * 3;
    glow(2, -30, s2 * 3.5, '#9dff8a');
    shape(() => X.ellipse(2, -30, s2 * .8, s2, 0, 0, TAU), '#eaffd0', 1.2);
    X.restore();
  },

  brak(P) { // Warchief: hulking orc, war paint, spiked pauldron, great axe
    const b = P.bob * 1.2;
    feet(P, -18 + b, 10, 16, 9, '#5d9a3a', '#3d6e26', '#3a2414');
    shape(() => { X.moveTo(-10, -22 + b); X.lineTo(10, -22 + b); X.lineTo(7, -8 + b); X.lineTo(-7, -8 + b); X.closePath(); }, cel(-10, 0, 10, 0, '#c0392b', '#6a1a12'), 1.5);
    const bA = 1.5 + (P.windK > 0 ? -.8 * P.windK : 0);
    armTo(-11, -44 + b, bA, 15, 9, '#4f8a30', .15);
    // massive torso, hunched forward
    shape(() => { X.moveTo(-18, -50 + b); X.quadraticCurveTo(0, -58 + b, 16, -46 + b); X.quadraticCurveTo(14, -30 + b, 10, -20 + b); X.lineTo(-10, -20 + b); X.quadraticCurveTo(-18, -34 + b, -18, -50 + b); X.closePath(); }, cel(-18, 0, 16, 0, '#7cc052', '#3d6e26', .5));
    X.strokeStyle = '#3a2414'; X.lineWidth = 4; X.beginPath(); X.moveTo(-12, -48 + b); X.lineTo(10, -22 + b); X.stroke();
    shape(() => X.rect(-11, -24 + b, 22, 5), '#3a2414', 1.4);
    circle(0, -21.5 + b, 3.2, '#efe2c0', 1.2);
    // spiked pauldron (rear shoulder)
    shape(() => X.ellipse(-12, -50 + b, 11, 8, -.2, 0, TAU), cel(-22, 0, -2, 0, '#9a5a32', '#4a220e', .5));
    for (let i = 0; i < 3; i++) shape(() => { const x0 = -20 + i * 7; X.moveTo(x0, -54 + b); X.lineTo(x0 + 1, -66 + b + i); X.lineTo(x0 + 5, -54 + b); X.closePath(); }, '#e8e0cc', 1.2);
    // head set low and forward
    const hx0 = 8, hy = -54 + b;
    X.lineCap = 'round';
    const tk = Math.sin(P.T * 4 + P.ph) * 3;
    for (const [c, w] of [[INK, 7], ['#1e1a18', 4]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(hx0 - 3, hy - 11); X.quadraticCurveTo(hx0 - 14, hy - 18, hx0 - 20 + tk, hy - 4); X.stroke(); }
    shape(() => { X.moveTo(hx0 - 9, hy - 4); X.quadraticCurveTo(hx0 - 8, hy - 13, hx0 + 2, hy - 12); X.quadraticCurveTo(hx0 + 12, hy - 10, hx0 + 12, hy + 1); X.quadraticCurveTo(hx0 + 12, hy + 10, hx0 + 2, hy + 10); X.quadraticCurveTo(hx0 - 8, hy + 8, hx0 - 9, hy - 4); X.closePath(); }, cel(hx0 - 9, 0, hx0 + 12, 0, '#8ed064', '#4f8a30', .55));
    shape(() => X.ellipse(hx0 - 3, hy - 13, 3, 3, 0, 0, TAU), '#1e1a18', 1.2);
    X.strokeStyle = '#d42a1a'; X.lineWidth = 2; for (const yy of [-2, 2]) { X.beginPath(); X.moveTo(hx0 - 4, hy + yy); X.lineTo(hx0 + 10, hy + yy + 1); X.stroke(); }
    shape(() => X.rect(hx0 - 2, hy - 7, 14, 3), '#2f5a1e', 1);
    glowEye(hx0 + 7, hy - 3, '#ffb070', 1.6);
    for (const tx of [hx0 + 5, hx0 + 10]) shape(() => { X.moveTo(tx - 1.5, hy + 8); X.quadraticCurveTo(tx - 1, hy + 2, tx + 1, hy + 1); X.lineTo(tx + 1.5, hy + 8); X.closePath(); }, '#f4ecd6', 1.1);
    // great axe
    const a = meleeAng(P, 1.1), [hx, hy2] = armTo(6, -44 + b, a, 15, 9, '#6aac44', .1);
    swoosh(6, -44 + b, 52, -2.35, a, '#ff6a3d', snap(P));
    X.save(); X.translate(hx, hy2); X.rotate(a - .2);
    limb(-8, 0, 40, 0, 4, '#6a4424', 0);
    shape(() => { X.moveTo(28, -2); X.quadraticCurveTo(30, -20, 44, -22); X.quadraticCurveTo(40, -8, 46, 0); X.quadraticCurveTo(40, 8, 44, 22); X.quadraticCurveTo(30, 20, 28, 2); X.closePath(); }, cel(28, -22, 46, 22, '#e8ecf4', '#8a92a4', .5), 1.8);
    X.strokeStyle = '#d42a1a'; X.lineWidth = 2; X.beginPath(); X.moveTo(34, -8); X.lineTo(38, 8); X.stroke();
    X.restore();
  },

  sylv(P) { // Windrunner: elf ranger, flowing silver ponytail, recurve bow
    const b = P.bob;
    const wind = Math.sin(P.T * 5 + P.id);
    // ponytail + short cape behind
    X.beginPath(); X.moveTo(-4, -60 + b); X.bezierCurveTo(-16, -60 + b + wind * 2, -22, -50 + b, -28 - P.m * 6, -44 + b + wind * 5);
    X.lineTo(-24 - P.m * 6, -40 + b + wind * 4); X.bezierCurveTo(-16, -46 + b, -12, -50 + b, -4, -52 + b); X.closePath();
    inkFill(cel(0, -60, 0, -40, '#f4fbfa', '#9ab8b8', .5), 1.6);
    shape(() => { X.moveTo(-6, -46 + b); X.quadraticCurveTo(-16, -34, -16 + wind * 2, -20 + b); X.lineTo(-6, -22 + b); X.closePath(); }, cel(-16, 0, -4, 0, '#2a8a80', '#0f3b3c'));
    // quiver
    X.save(); X.translate(-7, -36 + b); X.rotate(-.5);
    shape(() => X.rect(-3, -12, 6, 20), '#6a4424', 1.4);
    for (let i = 0; i < 3; i++) shape(() => { X.moveTo(-2 + i * 2, -12); X.lineTo(-3 + i * 2, -17); X.lineTo(-1 + i * 2, -17); X.closePath(); }, '#bffff0', 1);
    X.restore();
    feet(P, -24 + b, 6, 22, 5, '#3d5a50', '#2a4038', '#5a3a20');
    // string hand (rear)
    const a = aimAng(P, .6);
    const pl = pull(P);
    const rx = 4 + Math.cos(a) * (14 - pl * 12), ry = -42 + b + Math.sin(a) * (14 - pl * 12);
    limb(-3, -42 + b, rx, ry, 4.5, '#3d6a60', .15);
    // torso tunic
    shape(() => { X.moveTo(-7, -46 + b); X.lineTo(7, -46 + b); X.lineTo(8, -24 + b); X.lineTo(-7, -24 + b); X.closePath(); }, cel(-7, 0, 8, 0, '#3aa596', '#1a5a54', .5));
    shape(() => X.rect(-7, -28 + b, 15, 3), '#6a4424', 1.2);
    // head
    const hy = -55 + b;
    shape(() => { X.moveTo(-4, hy - 2); X.lineTo(-17, hy - 10); X.lineTo(-6, hy + 3); X.closePath(); }, '#f2d2b4', 1.4);
    circle(1, hy, 9.5, cel(-8, 0, 10, 0, '#fbe3cc', '#dcae8c', .6));
    shape(() => { X.moveTo(-9, hy + 2); X.quadraticCurveTo(-9, hy - 12, 3, hy - 11); X.quadraticCurveTo(12, hy - 10, 11, hy - 1); X.lineTo(8, hy - 5); X.lineTo(6, hy - 1); X.lineTo(3, hy - 6); X.quadraticCurveTo(-3, hy - 4, -9, hy + 2); X.closePath(); }, cel(0, hy - 12, 0, hy, '#ffffff', '#b8d4d4', .5), 1.5);
    animeEye(5.5, hy + 1.5, 3.2, '#2fd6c0');
    X.strokeStyle = INK; X.lineWidth = 1; X.beginPath(); X.moveTo(6, hy + 6.5); X.lineTo(8, hy + 6.5); X.stroke();
    // bow arm
    const [hx, hy2] = armTo(3, -42 + b, a, 12, 4.5, '#3d6a60', .05);
    X.save(); X.translate(hx, hy2); X.rotate(a);
    X.lineCap = 'round';
    for (const [c, w] of [[INK, 5], ['#7ad7c8', 3]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(-4, -22); X.quadraticCurveTo(8, -12, 2, 0); X.quadraticCurveTo(8, 12, -4, 22); X.stroke(); }
    const sx = -4 - pl * 12;
    X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 1; X.beginPath(); X.moveTo(-4, -22); X.lineTo(sx, 0); X.lineTo(-4, 22); X.stroke();
    if (pl > 0) { limb(sx, 0, 22, 0, 1.6, '#eafffb', 0); glow(22, 0, 6 + pl * 8, '#8ff0e0'); }
    if (snap(P) > .5) glow(10, 0, 18, '#bffff0', snap(P));
    X.restore();
  },
};

/* ---------------- minions: two factions ---------------- */
const MRIG = {
  0: { // Dawnguard: footmen, acolytes, ballistae, crystal guardians
    melee(P) {
      const b = P.bob;
      feet(P, -12 + b, 4, 11, 4, '#9aa2b4', '#6a7284', '#3a3e4a');
      shape(() => X.ellipse(-3, -20 + b, 7, 8, 0, 0, TAU), cel(-10, 0, 4, 0, '#3f8fd8', '#1a4a80'), 1.5); // round shield behind
      X.fillStyle = '#f3d892'; X.beginPath(); X.arc(-3, -20 + b, 2, 0, TAU); X.fill();
      shape(() => { X.moveTo(-6, -27 + b); X.lineTo(6, -27 + b); X.lineTo(5, -11 + b); X.lineTo(-5, -11 + b); X.closePath(); }, cel(-6, 0, 6, 0, '#4cc3ff', '#1f6aa8', .5), 1.5);
      shape(() => X.rect(-5, -15 + b, 10, 2.5), '#f3d892', 1);
      const hy = -32 + b;
      shape(() => { X.moveTo(-7, hy + 5); X.quadraticCurveTo(-7, hy - 8, 1, hy - 8); X.quadraticCurveTo(8, hy - 8, 8, hy + 5); X.closePath(); }, cel(-7, 0, 8, 0, '#e2e6ee', '#7d8597', .55), 1.6);
      X.fillStyle = '#12161e'; X.fillRect(1, hy - 1, 7, 2);
      shape(() => { X.moveTo(-2, hy - 8); X.quadraticCurveTo(-10, hy - 14, -12, hy - 6); X.quadraticCurveTo(-6, hy - 9, -2, hy - 5); }, '#4cc3ff', 1.2);
      const a = meleeAng(P, .9), [hx, hy2] = armTo(3, -25 + b, a, 7, 4, '#9aa2b4');
      swoosh(3, -25 + b, 22, -2.35, a, '#9fe0ff', snap(P));
      X.save(); X.translate(hx, hy2); X.rotate(a - .5);
      shape(() => { X.moveTo(2, -1.5); X.lineTo(17, -1); X.lineTo(19, 0); X.lineTo(17, 1); X.lineTo(2, 1.5); X.closePath(); }, '#eef2f8', 1.2);
      X.restore();
    },
    caster(P) {
      const b = P.bob;
      shape(() => { X.moveTo(-5, -26 + b); X.lineTo(5, -26 + b); X.lineTo(9, -1); X.lineTo(-9, -1); X.closePath(); }, cel(-9, 0, 9, 0, '#eef4ff', '#8aa6c8', .5), 1.5);
      X.strokeStyle = '#4cc3ff'; X.lineWidth = 2; X.beginPath(); X.moveTo(0, -24 + b); X.lineTo(0, -2); X.stroke();
      const hy = -31 + b;
      shape(() => { X.moveTo(-7, hy + 5); X.quadraticCurveTo(-8, hy - 6, -2, hy - 9); X.lineTo(-6, hy - 16); X.quadraticCurveTo(6, hy - 12, 7, hy - 2); X.lineTo(7, hy + 5); X.closePath(); }, cel(-8, 0, 7, 0, '#4cc3ff', '#1f5a90', .55), 1.5);
      shape(() => X.ellipse(3, hy + 1, 4, 4.5, 0, 0, TAU), '#f6dcc0', 1.1);
      X.fillStyle = INK; X.fillRect(4, hy, 1.5, 2.2);
      const a = aimAng(P, .4), [hx, hy2] = armTo(3, -23 + b, a, 7, 3.5, '#dfe8f6');
      X.save(); X.translate(hx, hy2); X.rotate(a - 1.3);
      limb(0, 10, 0, -14, 2, '#8a6a44', 0);
      const o = 3 + pull(P) * 4 + snap(P) * 2; glow(0, -16, o * 3.5, '#4cc3ff'); X.fillStyle = '#eaf7ff'; X.beginPath(); X.arc(0, -16, o * .7, 0, TAU); X.fill();
      X.restore();
    },
    siege(P) {
      const r = snap(P) * 4;
      for (const wx of [-10, 10]) { circle(wx, -6, 6, '#4a3622', 1.6); X.strokeStyle = '#8a6a44'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(wx - 5, -6); X.lineTo(wx + 5, -6); X.moveTo(wx, -11); X.lineTo(wx, -1); X.stroke(); }
      shape(() => X.rect(-16, -18, 30, 8), cel(0, -18, 0, -10, '#a07a50', '#5e4428'), 1.6);
      X.save(); X.translate(4 - r, -22);
      shape(() => X.rect(-10, -3, 26, 5), '#7a5a36', 1.4);
      X.lineCap = 'round'; for (const [c, w] of [[INK, 4], ['#c9ccd6', 2]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(12, -12); X.quadraticCurveTo(18, 0, 12, 12); X.stroke(); }
      X.strokeStyle = '#fff'; X.lineWidth = .8; X.beginPath(); X.moveTo(12, -12); X.lineTo(6 - pull(P) * 6, 0); X.lineTo(12, 12); X.stroke();
      X.restore();
      limb(-14, -18, -14, -40, 1.8, '#5e4428', 0);
      shape(() => { X.moveTo(-14, -40); X.lineTo(-2, -36 + Math.sin(P.T * 6) * 1.5); X.lineTo(-14, -32); X.closePath(); }, '#4cc3ff', 1.2);
    },
    super(P) {
      const b = P.bob;
      glow(0, -24, 30, '#9fe0ff', .45);
      feet(P, -14 + b, 6, 13, 6, '#c9d6e6', '#8a9aae', '#5a6474');
      shape(() => { X.moveTo(-10, -36 + b); X.lineTo(10, -36 + b); X.lineTo(8, -14 + b); X.lineTo(-8, -14 + b); X.closePath(); }, cel(-10, 0, 10, 0, '#f4f8ff', '#8aa6c8', .5));
      glow(0, -26 + b, 9, '#4cc3ff'); X.fillStyle = '#eaf7ff'; X.beginPath(); X.moveTo(0, -31 + b); X.lineTo(3, -26 + b); X.lineTo(0, -21 + b); X.lineTo(-3, -26 + b); X.fill();
      for (const sx of [-10, 10]) shape(() => { X.moveTo(sx - 6, -34 + b); X.lineTo(sx, -44 + b); X.lineTo(sx + 6, -34 + b); X.closePath(); }, '#f3d892', 1.3);
      const hy = -42 + b;
      shape(() => X.rect(-5, hy - 7, 12, 11), cel(-5, 0, 7, 0, '#f4f8ff', '#8aa6c8'), 1.5);
      glow(4, hy - 2, 5, '#9fe0ff');
      const a = meleeAng(P, .9), [hx, hy2] = armTo(5, -32 + b, a, 10, 6, '#c9d6e6');
      swoosh(5, -32 + b, 34, -2.35, a, '#9fe0ff', snap(P));
      X.save(); X.translate(hx, hy2); X.rotate(a - .4);
      shape(() => { X.moveTo(2, -3); X.lineTo(28, -2); X.lineTo(32, 0); X.lineTo(28, 2); X.lineTo(2, 3); X.closePath(); }, cel(0, -3, 0, 3, '#ffffff', '#9fe0ff'), 1.4);
      X.restore();
    },
  },
  1: { // Duskborn: imps, cultists, bone catapults, hellforged brutes
    melee(P) {
      const b = P.bob;
      const tail = Math.sin(P.T * 5 + P.id);
      X.lineCap = 'round'; for (const [c, w] of [[INK, 4], ['#b8321f', 2]]) { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.moveTo(-4, -12 + b); X.quadraticCurveTo(-12, -10, -14, -18 + tail * 3); X.stroke(); }
      feet(P, -11 + b, 4, 10, 4, '#c0392b', '#8a2418', '#2a1010', .5);
      shape(() => { X.moveTo(-6, -24 + b); X.quadraticCurveTo(0, -28 + b, 7, -23 + b); X.lineTo(5, -10 + b); X.lineTo(-5, -10 + b); X.closePath(); }, cel(-6, 0, 7, 0, '#e0503c', '#8a2418', .5), 1.5);
      shape(() => X.rect(-5, -13 + b, 10, 3), '#1e1418', 1);
      const hy = -29 + b;
      circle(2, hy, 7, cel(-5, 0, 9, 0, '#f06a52', '#a02a1a', .55), 1.6);
      for (const [hx, d] of [[-2, -1], [5, 1]]) shape(() => { X.moveTo(hx - 2, hy - 5); X.quadraticCurveTo(hx + d * 2, hy - 12, hx + d * 5 - 2, hy - 13); X.quadraticCurveTo(hx + d, hy - 8, hx + 2, hy - 5); X.closePath(); }, '#f4ecd6', 1);
      X.save(); X.translate(5, hy - .5); X.scale(1, .7); animeEye(0, 0, 2.4, '#ffd24a', 1); X.restore();
      X.fillStyle = '#fff'; X.beginPath(); X.moveTo(3, hy + 3); X.lineTo(8, hy + 3); X.lineTo(6.5, hy + 5); X.lineTo(5, hy + 3.5); X.lineTo(4, hy + 5); X.fill();
      const a = meleeAng(P, .9), [hx2, hy2] = armTo(3, -22 + b, a, 7, 3.5, '#c0392b');
      swoosh(3, -22 + b, 22, -2.35, a, '#ff8a6a', snap(P));
      X.save(); X.translate(hx2, hy2); X.rotate(a - .5);
      shape(() => { X.moveTo(1, -1); X.lineTo(10, -1); X.lineTo(15, -6); X.lineTo(16, 3); X.lineTo(1, 2); X.closePath(); }, cel(0, -6, 0, 3, '#d8dce4', '#6a7284'), 1.2);
      X.restore();
    },
    caster(P) {
      const b = P.bob;
      shape(() => { X.moveTo(-5, -26 + b); X.lineTo(5, -26 + b); X.lineTo(9, -1); for (let i = 0; i < 4; i++) X.lineTo(9 - (i + .5) * 4.5, -1 + (i % 2 ? 0 : 3)); X.lineTo(-9, -1); X.closePath(); }, cel(-9, 0, 9, 0, '#7a1a26', '#2a0810', .5), 1.5);
      X.strokeStyle = '#ff5a48'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(-3, -20 + b); X.lineTo(3, -14 + b); X.moveTo(3, -20 + b); X.lineTo(-3, -14 + b); X.stroke();
      const hy = -31 + b;
      shape(() => { X.moveTo(-7, hy + 6); X.quadraticCurveTo(-9, hy - 8, 1, hy - 10); X.quadraticCurveTo(9, hy - 8, 8, hy + 6); X.closePath(); }, cel(-8, 0, 8, 0, '#5a1420', '#1e060a', .55), 1.5);
      shape(() => X.ellipse(3, hy + 1, 4, 4.5, 0, 0, TAU), '#08040a', 1);
      glowEye(3, hy, '#ff5a48', 1.2); glowEye(6, hy + .4, '#ff5a48', 1);
      const a = aimAng(P, .4), [hx, hy2] = armTo(3, -23 + b, a, 7, 3.5, '#5a1420');
      X.save(); X.translate(hx, hy2); X.rotate(a - 1.3);
      limb(0, 10, 0, -12, 2, '#3a2a2a', 0);
      circle(0, -15, 3.5, '#efe2c0', 1.1); X.fillStyle = INK; X.fillRect(-1.8, -16, 1.4, 1.4); X.fillRect(.6, -16, 1.4, 1.4);
      const o = 3 + pull(P) * 4 + snap(P) * 2; glow(0, -20, o * 3.5, '#ff5a3a'); glow(0, -21, o * 1.5, '#ffe06a');
      X.restore();
    },
    siege(P) {
      const r = snap(P);
      for (const wx of [-10, 10]) { circle(wx, -6, 6, '#241a1e', 1.6); X.fillStyle = '#e8e0cc'; X.beginPath(); X.arc(wx, -6, 2, 0, TAU); X.fill(); }
      shape(() => X.rect(-16, -18, 30, 8), cel(0, -18, 0, -10, '#4a3438', '#1e1216'), 1.6);
      for (let i = 0; i < 4; i++) shape(() => { X.moveTo(-14 + i * 8, -18); X.lineTo(-12 + i * 8, -23); X.lineTo(-10 + i * 8, -18); X.closePath(); }, '#e8e0cc', 1);
      X.save(); X.translate(-4, -20); X.rotate(-.3 - r * 1.2 + pull(P) * .5);
      limb(0, 0, 20, -2, 3, '#5a3a2a', 0);
      shape(() => X.ellipse(21, -4, 5, 3, 0, 0, TAU), '#3a2a2a', 1.2);
      if (r < .3) { circle(21, -8, 3.5, '#efe2c0', 1); glow(21, -8, 8, '#ff5a3a', .7); }
      X.restore();
      limb(12, -18, 12, -40, 1.8, '#2a1a1e', 0);
      shape(() => { X.moveTo(12, -40); X.lineTo(22, -36 + Math.sin(P.T * 6) * 1.5); X.lineTo(12, -32); X.closePath(); }, '#ff5a48', 1.2);
    },
    super(P) {
      const b = P.bob;
      glow(0, -24, 30, '#ff5a3a', .45);
      feet(P, -14 + b, 7, 13, 7, '#7a2418', '#4a140c', '#1e1010');
      shape(() => { X.moveTo(-12, -38 + b); X.quadraticCurveTo(0, -44 + b, 12, -36 + b); X.lineTo(9, -14 + b); X.lineTo(-9, -14 + b); X.closePath(); }, cel(-12, 0, 12, 0, '#3a2a2e', '#140a0e', .5));
      X.strokeStyle = '#ff5a3a'; X.lineWidth = 2; X.beginPath(); X.moveTo(-6, -32 + b); X.lineTo(0, -24 + b); X.lineTo(6, -32 + b); X.stroke();
      glow(0, -26 + b, 8, '#ff5a3a', .8);
      const hy = -44 + b;
      circle(3, hy, 8, cel(-5, 0, 11, 0, '#c0392b', '#6a1a12', .55), 1.6);
      for (const d of [-1, 1]) shape(() => { X.moveTo(3 + d * 4, hy - 5); X.quadraticCurveTo(3 + d * 12, hy - 8, 3 + d * 12, hy - 18); X.quadraticCurveTo(3 + d * 7, hy - 10, 3 + d * 1, hy - 7); X.closePath(); }, '#e8e0cc', 1.2);
      glowEye(7, hy - 1, '#ffe06a', 1.5);
      const a = meleeAng(P, 1), [hx, hy2] = armTo(6, -34 + b, a, 10, 7, '#a02a1a');
      swoosh(6, -34 + b, 36, -2.35, a, '#ff6a3d', snap(P));
      X.save(); X.translate(hx, hy2); X.rotate(a - .2);
      limb(-4, 0, 24, 0, 3, '#3a2a2a', 0);
      shape(() => { X.moveTo(18, -2); X.lineTo(22, -12); X.lineTo(30, -10); X.lineTo(32, 0); X.lineTo(30, 10); X.lineTo(22, 12); X.lineTo(18, 2); X.closePath(); }, cel(18, -12, 32, 12, '#4a4450', '#1e1a22'), 1.5);
      X.restore();
    },
  },
};

/* ---------------- drawing entry points ---------------- */
function drawHero(h, T) {
  X = ctx;
  const d = h.def, sc = h.scale || 1, s = h.r * sc;
  let lift = 0;
  if (h.dash && h.dash.arc) { const pr = 1 - h.dash.left / (h.dash.total || 1); lift = Math.sin(pr * Math.PI) * h.dash.arc; }
  if (h.kup > 0) lift = Math.sin(Math.min(1, h.kup) * Math.PI) * 30;
  const ringCol = h === G.player ? '#9be870' : relCol(h) === '#f3d892' ? '#9be870' : relCol(h);
  drawShadow(h.x, h.y, s * 1.1 * (1 - lift / 200), s * .5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .3; ctx.drawImage(glowSprite(ringCol), h.x - s * 2, h.y - s * 1.1, s * 4, s * 2.2); ctx.restore();
  ctx.strokeStyle = ringCol; ctx.lineWidth = h === G.player ? 3 : 2;
  ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, s * 1.3, s * .6, 0, 0, TAU); ctx.stroke();
  if ((h.buffs.homeguard || h.buffs.haste || h.buffs.wild || h.buffs.shrine) && h.moving && Math.random() < .6) part({ kind: 'speed', x: h.x - (h.dirX || 1) * 16, y: h.y - rnd(8, 50), vx: -(h.dirX || 1) * 120, color: '#ffffff', size: 16, life: .25, max: .25 });
  if (d.id === 'nyx' && h.moving && Math.random() < .5) part({ x: h.x - (h.dirX || 1) * 10 + rnd(-6, 6), y: h.y - rnd(10, 40), color: '#6a3dbd', size: 16, life: .45, max: .45 });
  if (h.dash && Math.random() < .9) part({ kind: 'speed', x: h.x - h.dash.dx * 20, y: h.y - rnd(6, 56), vx: -h.dash.dx * 300, vy: -h.dash.dy * 300, color: d.c1, size: 26, life: .22, max: .22 });
  ctx.save();
  ctx.translate(h.x, h.y - lift);
  if (h.buffs.rage) glowAt(0, -34, 70, '#ff2a1a', .6 + .2 * Math.sin(T * 8));
  if (h.buffs.dd) glowAt(0, -34, 60, '#ff5a48', .4);
  if (h.buffs.voidhand) glowAt(0, -34, 60, '#b36bff', .35);
  const P = pose(h, T);
  ctx.scale(P.dir * sc, sc);
  if (h.hitT > 0) ctx.translate(-h.hitT * 25, 0);
  RIG[d.id](P, h);
  ctx.restore();
  if (h.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = h.hitT * 5; ctx.drawImage(glowSprite('#ffffff'), h.x - s * 1.2, h.y - 34 * sc - s * 1.2 - lift, s * 2.4, s * 2.4); ctx.restore(); }
  drawStatusFx(h, T, s, lift);
  if (h.stasis > G.t) { ctx.save(); ctx.fillStyle = 'rgba(243,216,146,.35)'; ctx.strokeStyle = '#f3d892'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y - 32, s * 1.3, 40, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if (h.channel) { ctx.strokeStyle = '#8fc4ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y - 30, s * 1.9, -Math.PI / 2, -Math.PI / 2 + TAU * h.channel.t / h.channel.max); ctx.stroke(); }
}
function glowAt(x, y, r, col, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a; ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); ctx.restore(); }
function drawMinion(m, T) {
  X = ctx;
  const s = m.r, k = m.r / (m.mtype === 'siege' ? 19 : m.mtype === 'super' ? 20 : m.mtype === 'caster' || m.mtype === 'thrall' ? 13 : m.mtype === 'turretT' ? 15 : 15);
  drawShadow(m.x, m.y, s, s * .45);
  ctx.strokeStyle = hexA(relCol(m), .7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, s * 1.2, s * .55, 0, 0, TAU); ctx.stroke();
  if (m.empowered) glowAt(m.x, m.y - 16, s * 2.4, '#b36bff', .5);
  ctx.save(); ctx.translate(m.x, m.y);
  const P = pose(m, T);
  ctx.scale(P.dir * k, k);
  if (m.hitT > 0) ctx.translate(-m.hitT * 20, 0);
  (MRIG[m.team] || MRIG[0])[m.mtype](P, m);
  ctx.restore();
  if (m.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = m.hitT * 4; ctx.drawImage(glowSprite('#ffffff'), m.x - s, m.y - 16 - s, s * 2, s * 2); ctx.restore(); }
  if (m.stun > 0 || m.root > 0 || m.kup > 0) drawStatusFx(m, T, s);
}
function unitTop(u) { return u.kind === 'hero' ? 72 * (u.scale || 1) : u.kind === 'minion' ? 40 * (u.r / 15) : u.r * 1.5; }

/* ---------------- hero-select model stage ---------------- */
const MODEL = { t: 0, u: null };
function drawModelStage(c, hero, dt) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  x.clearRect(0, 0, w, h);
  MODEL.t += dt;
  if (!MODEL.u || MODEL.u.def !== hero) MODEL.u = { def: hero, id: 7, face: 0, anim: 0, moving: false, swing: 0, wind: null, casting: null, dirX: 1, atkCount: 0, r: 24 };
  const u = MODEL.u, cyc = MODEL.t % 3.2;
  u.moving = cyc < 1.2; if (u.moving) u.anim += dt * 10;
  u.face = Math.sin(MODEL.t * .4) * .3;
  u.wind = cyc > 1.6 && cyc < 1.95 ? { t: cyc - 1.6, dur: .35 } : null;
  u.swing = cyc >= 1.95 && cyc < 2.23 ? .28 - (cyc - 1.95) : 0;
  if (cyc >= 1.95 && !u.fired) { u.fired = true; u.atkCount++; }
  if (cyc < 1.95) u.fired = false;
  X = x;
  x.save();
  const g = x.createRadialGradient(w / 2, h * .82, 4, w / 2, h * .82, w * .45); g.addColorStop(0, hexA(hero.c1, .45)); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = hexA(hero.c1, .7); x.lineWidth = 2; x.beginPath(); x.ellipse(w / 2, h * .82, w * .3, w * .08, 0, 0, TAU); x.stroke();
  x.translate(w / 2, h * .82);
  const sc = h / 105;
  x.scale(sc, sc);
  const P = pose(u, MODEL.t); P.T = MODEL.t;
  RIG[hero.id](P, u);
  x.restore();
  X = ctx;
}

/* ---------------- satisfying auto-attack impacts ---------------- */
const IMPACT = {
  kael: { col: '#ffd978', snd: 'clang', slash: 2, star: 8, ring: 1 },
  vesp: { col: '#8fd0ff', snd: 'zapS', zap: 1, star: 6 },
  nyx: { col: '#c48bff', snd: 'slice', slash: 3, star: 4 },
  oryn: { col: '#9dff8a', snd: 'leaf', leaves: 1, star: 6 },
  brak: { col: '#ff6a3d', snd: 'chop', slash: 1, star: 8, ring: 1, shake: 1 },
  sylv: { col: '#8ff0e0', snd: 'thwip', pierce: 1, star: 4 },
};
function heroImpact(u, t, crit) {
  const S = IMPACT[u.def.id] || IMPACT.kael;
  const ang = Math.atan2(t.y - u.y, t.x - u.x), ty = t.y - (t.kind === 'hero' || t.kind === 'minion' ? unitTop(t) * .45 : 10);
  const big = crit ? 1.6 : 1;
  const mine = u === G.player || t === G.player;
  if (S.slash) for (let i = 0; i < (S.slash === 3 ? 2 : 1); i++) part({ kind: 'slash', x: t.x, y: ty, ang: ang + (S.slash === 3 ? (i ? .7 : -.7) : 0), size: (t.r + 22) * big, color: S.col, w: S.slash === 1 ? 12 : 9, life: .26, max: .26, flip: (u.atkCount + i) % 2 });
  if (S.slash === 2) part({ kind: 'slash', x: t.x, y: ty, ang: ang + Math.PI / 2, size: (t.r + 16) * big, color: '#ffffff', w: 5, life: .2, max: .2, flip: 1 });
  part({ kind: 'star', x: t.x + rnd(-4, 4), y: ty + rnd(-4, 4), color: crit ? '#ffb13a' : S.col, size: (t.r + 14) * big, pts: S.star, rot: rnd(TAU), life: .2, max: .2 });
  if (S.ring) ring(t.x, ty, S.col, (t.r + 18) * big, .3, 4);
  if (S.zap) { zap(t.x + rnd(-20, 20), ty - 90, t.x, ty); burst(t.x, ty, '#bfe6ff', 6, 160, 6, .3); }
  if (S.leaves) for (let i = 0; i < 6; i++) { const a = rnd(TAU); part({ x: t.x, y: ty, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 - 40, grav: 200, color: i % 2 ? '#7fe08a' : '#d8ffb0', size: 7, life: .5, max: .5 }); }
  if (S.petals) petalBurst(t.x, ty, 6);
  if (S.pierce) { part({ kind: 'beam', x: t.x - Math.cos(ang) * 30, y: ty - Math.sin(ang) * 30, x2: t.x + Math.cos(ang) * 50, y2: ty + Math.sin(ang) * 50, color: S.col, w: 4, life: .15, max: .15 }); }
  for (let i = 0; i < 6; i++) { const a = ang + rnd(-.8, .8), v = rnd(160, 340) * big; part({ x: t.x, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: S.col, size: 5, life: .25, max: .25, drag: .85 }); }
  if (mine) {
    SFX.play(crit ? 'crit' : S.snd);
    G.hitstop = Math.max(G.hitstop || 0, crit ? .08 : t.kind === 'hero' ? .045 : .02);
    G.shake = Math.max(G.shake, crit ? 7 : S.shake ? 4 : 2);
    if (crit) floatText(t.x, ty - 40, 'CRIT', '#ffb13a', 14, { vy: -40 });
  }
}
