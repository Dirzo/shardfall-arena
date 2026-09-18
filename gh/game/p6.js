
/* =========================================================
   SOUND (tiny synth)
   ========================================================= */
const SFX = {
  ac: null, on: true, last: {},
  init() { if (this.ac) return; try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ac.createGain(); this.master.gain.value = .22; this.master.connect(this.ac.destination); } catch (e) { this.ac = null; } },
  tone(f0, f1, dur, type = 'sine', vol = .5, delay = 0) {
    const a = this.ac, t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol = .4, hp = 400, delay = 0) {
    const a = this.ac, t = a.currentTime + delay, n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  play(n) {
    if (!this.on || !this.ac || (G && G.demo)) return;
    const now = performance.now(); if (now - (this.last[n] || 0) < 70) return; this.last[n] = now;
    try {
      switch (n) {
        case 'hit': this.noise(.12, .5, 300); this.tone(180, 60, .15, 'square', .2); break;
        case 'swing': this.noise(.08, .2, 1500); break;
        case 'shoot': this.tone(700, 300, .08, 'triangle', .15); break;
        case 'cast': this.tone(420, 840, .15, 'triangle', .2); break;
        case 'zap': this.noise(.1, .25, 3000); this.tone(1200, 200, .1, 'sawtooth', .08); break;
        case 'bow': this.tone(300, 900, .06, 'triangle', .2); this.noise(.06, .15, 2500); break;
        case 'boom': this.tone(120, 30, .5, 'sine', .7); this.noise(.4, .4, 80); break;
        case 'blink': this.tone(300, 1500, .2, 'sine', .25); break;
        case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, f, .25, 'sine', .15, i * .06)); break;
        case 'level': [392, 523, 659, 784].forEach((f, i) => this.tone(f, f * 1.01, .35, 'triangle', .2, i * .08)); break;
        case 'kill': this.tone(220, 110, .4, 'sawtooth', .15); this.tone(330, 165, .4, 'square', .08, .05); break;
        case 'tower': this.noise(.8, .5, 60); this.tone(90, 30, .9, 'sine', .6); break;
        case 'horn': this.tone(146, 146, .9, 'sawtooth', .12); this.tone(220, 220, .9, 'sawtooth', .08, .1); break;
        case 'horn2': this.tone(110, 140, .5, 'sawtooth', .15); break;
        case 'rune': [660, 880, 1320].forEach((f, i) => this.tone(f, f, .2, 'sine', .15, i * .05)); break;
        case 'buy': this.tone(1200, 1800, .1, 'square', .08); this.tone(1800, 2400, .1, 'square', .06, .06); break;
        case 'ui': this.tone(600, 700, .05, 'triangle', .12); break;
        case 'coin': this.tone(1760, 2200, .06, 'square', .06); this.tone(2640, 2640, .12, 'sine', .08, .05); break;
        case 'clang': this.noise(.1, .4, 2200); this.tone(900, 600, .18, 'square', .1); this.tone(1400, 1100, .2, 'sine', .08); break;
        case 'slice': this.noise(.07, .35, 4000); this.tone(1800, 900, .06, 'sawtooth', .05); break;
        case 'chop': this.noise(.14, .6, 180); this.tone(140, 50, .2, 'square', .25); break;
        case 'thwip': this.noise(.05, .3, 3000); this.tone(1200, 500, .07, 'triangle', .12); break;
        case 'leaf': this.noise(.12, .25, 1500); this.tone(500, 900, .1, 'sine', .12); break;
        case 'zapS': this.noise(.06, .3, 5000); this.tone(1600, 300, .08, 'sawtooth', .06); break;
        case 'crit': this.tone(220, 80, .25, 'square', .25); this.noise(.2, .5, 600); this.tone(1200, 1800, .15, 'triangle', .1, .03); break;
      }
    } catch (e) { }
  },
};

/* =========================================================
   UI
   ========================================================= */
const BUFFS = {
  mindwell: ['orb', '#6fb8ff', 'Mindwell Blessing'], ember: ['flame', '#ff7a3a', 'Emberheart Blessing'], voidhand: ['void', '#b36bff', 'Hand of the Void'],
  haste: ['boot', '#ffe066', 'Rune of Haste'], dd: ['blade', '#ff5a48', 'Rune of Fury'], regenRune: ['heart', '#7dff9a', 'Rune of Renewal'], arcane: ['hourglass', '#c08cff', 'Rune of Arcana'],
  warcry: ['horn', '#ff6a3d', 'War Cry'], venom: ['venom', '#7dff6a', 'Venom Blades'], rage: ['flame', '#ff3a2a', 'Bloodrage'], wild: ['wind', '#c8ff9a', 'Wild Growth'],
  sanct: ['sanct', '#9dff8a', 'Sanctuary'], veil: ['veil', '#b36bff', 'Veiled'], mend: ['heal', '#7dff9a', 'Mend'], homeguard: ['boot', '#4cc3ff', 'Homeguard'],
  rampage: ['flame', '#ff7a45', 'Rampage'], shrine: ['wind', '#8ff0e0', 'Speed Shrine'], potion: ['drop', '#ff5a6a', 'Healing Draught'],
  elixWrath: ['flame', '#ff7a45', 'Tonic of Fury'], elixSorc: ['rune', '#b58cff', 'Tonic of Sorcery'], elixIron: ['armor', '#9aa8b8', 'Tonic of Iron'], tumble: ['tumble', '#8ff0e0', 'Tumble — empowered shot'], tumbleDR: ['shield', '#8ff0e0', 'Evasion'], twin: ['dagger', '#b36bff', 'Twin Shadows — recast Q'],
};
const CAPKEY = { kael: ['Q', 'W', 'E'], vesp: ['Q', 'W', 'R'], nyx: ['R', 'E', 'Q'], oryn: ['Q', 'W', 'E'], brak: ['Q', 'R', 'E'], sylv: [null, 'E', 'W'] };
const iconCache = new Map();
function iconFor(glyph, color, size = 96) { const k = glyph + color + size; if (!iconCache.has(k)) iconCache.set(k, iconCanvas(glyph, color, size)); return iconCache.get(k); }
function cloneCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  dirty: true, selHero: 'kael', diff: 1, sel: null,
  announce(big, sub, cls) {
    const el = $('#announce');
    el.innerHTML = `<div class="big ${cls}">${esc(big)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}`;
  },
  miniAnnounce(text, good) { if (G.demo) return; UI.feed(`<span class="${good ? 'a' : 'e'}">${esc(text)}</span>`); },
  toast(msg) { UI.feed(`<span class="n">${esc(msg)}</span>`); },
  feed(html) {
    if (!G || G.demo) return;
    const f = $('#feed'); const d = document.createElement('div'); d.className = 'kf'; d.innerHTML = html; f.appendChild(d);
    while (f.children.length > 5) f.firstChild.remove();
    setTimeout(() => d.remove(), 5000);
  },
  show(id) { for (const s of ['title', 'select', 'versus', 'end']) $('#' + s).hidden = s !== id; $('#hud').hidden = id !== null; },
  endGame() {
    const win = G.winner === G.player.team;
    $('#endH').textContent = win ? 'Victory' : 'Defeat';
    $('#endH').className = win ? 'win' : 'loss';
    $('#endSub').textContent = `${win ? 'The Duskborn Ancient lies shattered' : 'The Dawnguard Ancient has fallen'} · ${fmtT(G.t)}`;
    $('#endT').innerHTML = scoreTable();
    for (const m of ['talents', 'shop', 'score', 'pause']) $('#' + m).hidden = true;
    UI.show('end'); $('#hud').hidden = true;
    SFX.play('horn');
  },
};

function scoreTable() {
  const rows = [0, 1].map(t => G.heroes.filter(h => h.team === t).map(h => {
    const worth = Math.round(h.gold + h.items.reduce((s, i) => s + ITEM[i].cost, 0));
    return `<tr class="${h === G.player ? 'me' : ''}"><td class="tm${t}">${esc(h.name)}${h === G.player ? ' (you)' : ''}</td><td>${h.level}</td><td>${h.k} / ${h.dth} / ${h.as_}</td><td>${h.cs}</td><td>${worth}</td><td style="color:var(--muted)">${h.items.map(i => ITEM[i].name).join(', ') || '—'}</td></tr>`;
  }).join('')).join('<tr><td colspan="6" style="height:6px;border:0"></td></tr>');
  return `<table class="tbl"><thead><tr><th>Champion</th><th>Lv</th><th>K / D / A</th><th>CS</th><th>Net worth</th><th>Items</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---------- hero select ---------- */
const splashC = $('#splash');
function buildRoster() {
  const r = $('#roster'); r.innerHTML = '';
  for (const h of HEROES) {
    const b = document.createElement('button'); b.className = 'hcard plate'; b.dataset.id = h.id; b.setAttribute('aria-label', h.name);
    const c = document.createElement('canvas'); c.width = 240; c.height = 268;
    drawPortrait(c.getContext('2d'), 240, 268, h, 1.3, { small: true });
    b.append(c);
    b.insertAdjacentHTML('beforeend', `<span class="rl">${h.role[0]}</span><span class="nm">${h.name}</span>`);
    b.onclick = () => { SFX.init(); SFX.play('ui'); selectHero(h.id); };
    r.append(b);
  }
  selectHero(UI.selHero);
}
function selectHero(id) {
  UI.selHero = id; const h = HERO[id];
  for (const b of $('#roster').children) b.classList.toggle('on', b.dataset.id === id);
  $('#sName').textContent = h.name; $('#sTitle').textContent = h.title; $('#sLore').textContent = h.lore;
  $('#sChips').innerHTML = h.role.map(r => `<span class="chip">${r}</span>`).join('') + `<span class="chip" style="color:${h.c1}">Difficulty ${'◆'.repeat(h.diff)}${'◇'.repeat(3 - h.diff)}</span>`;
  $('#sStats').innerHTML = Object.entries(h.bars).map(([k, v]) => `<span>${k}</span><i>${[1, 2, 3, 4, 5].map(i => `<b class="${i <= v ? 'f' : ''}"></b>`).join('')}</i>`).join('');
  const pas = [...(h.passive || [])]; if (h.stats.range < 300) pas.push(['Melee', 'takes 15% less damage.']);
  $('#sPlay').innerHTML = `<span class="eyebrow">How to play</span><ul>${(h.play || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` +
    pas.map(([n, t]) => `<p class="pas"><b>${esc(n)}:</b> ${esc(t)}</p>`).join('');
  const al = $('#sAbil'); al.innerHTML = '';
  for (const k of ['Q', 'W', 'E', 'R']) {
    const ab = ABIL[h.ab[k]];
    const row = document.createElement('div'); row.className = 'ab';
    row.append(cloneCanvas(iconFor(ab.icon, h.c1)));
    row.insertAdjacentHTML('beforeend', `<div><h4>${ab.name} <kbd>${k}</kbd>${k === 'R' ? '<span class="eyebrow" style="font-size:10px">Ultimate · lvl 6</span>' : ''}</h4><p>${esc(ab.desc(1))}</p></div>`);
    al.append(row);
  }
  document.documentElement.style.setProperty('--sel', h.c1);
}
function startMatch() {
  const pid = UI.selHero;
  const pool = HEROES.map(h => h.id).filter(i => i !== pid).sort(() => Math.random() - .5);
  const enemies = pool.slice(0, 3), allies = pool.slice(3, 5);
  const card = (id, you) => { const h = HERO[id]; const d = document.createElement('div'); d.className = 'vs-card plate'; const c = document.createElement('canvas'); c.width = 180; c.height = 240; drawPortrait(c.getContext('2d'), 180, 240, h, 2, { small: true }); d.append(c); d.insertAdjacentHTML('beforeend', `${you ? '<em>YOU</em>' : ''}<span>${h.name}</span>`); return d; };
  const A = $('#vsA'), B = $('#vsB'); A.innerHTML = ''; B.innerHTML = '';
  [pid, ...allies].forEach((id, i) => { const c = card(id, i === 0); c.style.animationDelay = i * .12 + 's'; A.append(c); });
  enemies.forEach((id, i) => { const c = card(id); c.style.animationDelay = (.4 + i * .12) + 's'; B.append(c); });
  UI.show('versus'); $('#hud').hidden = true;
  SFX.play('horn');
  setTimeout(() => {
    newGame(pid, enemies, allies, false, UI.diff);
    G.cam.z = VW < 700 ? .62 : .95; G.cam.x = G.player.x; G.cam.y = G.player.y;
    buildHUD();
    UI.show(null);
    announce('Welcome to the Hollow Weald', 'Minions march at 0:45 — take the top lane · P opens the Armory');
    SHOP.sel = null; SHOP.invSel = -1;
  }, 2600);
}

/* ---------- HUD ---------- */
const HUDC = {};
function buildHUD() {
  const p = G.player;
  drawPortrait($('#pport').getContext('2d'), 136, 136, p.def, 2, { small: true, fade: false });
  const ab = $('#abil'); ab.innerHTML = '';
  HUDC.slots = {};
  const keys = ['Q', 'W', 'E', 'R', '|', 'D', 'F'];
  for (const k of keys) {
    if (k === '|') { const s = document.createElement('div'); s.className = 'sep'; ab.append(s); continue; }
    const b = document.createElement('button'); b.className = 'slot' + (k === 'D' || k === 'F' ? ' sm' : ''); b.dataset.k = k;
    const info = k === 'D' || k === 'F' ? SPELLS[k] : ABIL[p.def.ab[k]];
    const col = k === 'D' || k === 'F' ? '#f3d892' : p.def.c1;
    b.append(cloneCanvas(iconFor(info.icon, col)));
    b.insertAdjacentHTML('beforeend', `<div class="cd"></div><span class="cdt"></span><span class="key">${k}</span>${info.mana ? `<span class="mn">${info.mana}</span>` : ''}`);
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); slotPress(k); });
    b.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') G.hoverKey = k; });
    b.addEventListener('pointerleave', () => { if (G.hoverKey === k) G.hoverKey = null; });
    tip(b, () => slotTip(k));
    const wrap = document.createElement('div'); wrap.className = 'sw'; wrap.append(b);
    wrap.insertAdjacentHTML('beforeend', `<span class="cap">${info.name}</span>`);
    ab.append(wrap); HUDC.slots[k] = { el: b, cd: b.querySelector('.cd'), cdt: b.querySelector('.cdt'), state: '', wasCd: false };
  }
  // allies/enemies roster
  const al = $('#allies'); al.innerHTML = '';
  HUDC.roster = [];
  for (const h of G.heroes) {
    if (h === G.player) continue;
    const d = document.createElement('div'); d.className = 'ally plate' + (h.team ? ' en' : '');
    const c = document.createElement('canvas'); c.width = 80; c.height = 80; drawPortrait(c.getContext('2d'), 80, 80, h.def, 2, { small: true, fade: false });
    d.append(c);
    d.insertAdjacentHTML('beforeend', `<div><div class="nm"><span>${h.name}</span><span class="lv"></span></div><div class="mb"><i></i></div></div><div class="dt" hidden></div>`);
    al.append(d);
    HUDC.roster.push({ h, lv: d.querySelector('.lv'), bar: d.querySelector('.mb i'), dt: d.querySelector('.dt') });
  }
  HUDC.itemsKey = null; HUDC.buffKey = null;
  $('#feed').innerHTML = ''; $('#announce').innerHTML = '';
  $('#tips').innerHTML = `<div><kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd> ${SETTINGS.quick ? 'quick cast at cursor' : 'hold to aim'}</div><div><kbd>A</kbd> attack-move · <kbd>H</kbd> hold · <kbd>S</kbd> stop</div><div>Minimap: left look · right move · <kbd>Space</kbd> recentre</div>` + '<div><kbd>1</kbd>–<kbd>6</kbd> use items · <kbd>P</kbd> armory</div><div><kbd>T</kbd> talents · <kbd>B</kbd> recall</div><div><kbd>Tab</kbd> scores · <kbd>Y</kbd> free camera · <kbd>Esc</kbd> pause</div>';
}
function slotPress(k) {
  SFX.init();
  const p = G.player; if (!p || p.dead) return;
  if (k === 'F') { cast(p, 'F', p.x, p.y); return; }
  const info = k === 'D' ? { type: 'point' } : ABIL[p.def.ab[k]];
  if (info.type === 'self') { cast(p, k, p.x, p.y); return; }
  G.armed = G.armed === k ? null : k;
}
function slotTip(k) {
  const p = G.player;
  if (k === 'D' || k === 'F') { const s = SPELLS[k]; return `<h5>${s.name}</h5><div class="m">Spell · ${Math.round(s.cd * (p.s.quicken ? .7 : 1))}s cooldown</div><p>${s.desc}</p>`; }
  const ab = ABIL[p.def.ab[k]], r = rank(p, k);
  return `<h5>${ab.name}</h5><div class="m">${k === 'R' ? 'Ultimate' : 'Ability'} · rank ${r || '—'} · ${ab.mana} mana · ${ab.cd[Math.max(0, r - 1)]}s</div><p>${esc(ab.desc(Math.max(1, r)))}</p>${r ? '' : '<p style="color:var(--gilt)">Unlocks at level 6.</p>'}`;
}
function tip(el, fn) {
  const t = $('#tooltip');
  el.addEventListener('pointerenter', e => { if (e.pointerType === 'touch') return; t.innerHTML = fn(); t.hidden = false; placeTip(el); });
  el.addEventListener('pointerleave', () => { t.hidden = true; });
}
function placeTip(el) {
  const t = $('#tooltip'), r = el.getBoundingClientRect(), app = $('#app').getBoundingClientRect();
  const tw = t.offsetWidth, th = t.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2 - app.left, y = r.top - th - 10 - app.top;
  if (y < 8) y = r.bottom + 10 - app.top;
  x = clamp(x, 8, app.width - tw - 8);
  t.style.left = x + 'px'; t.style.top = y + 'px';
}

let hudFrame = 0;
function updateHUD() {
  const p = G.player; if (!p) return;
  hudFrame++;
  const set = (id, v) => { const e = HUDC[id] || (HUDC[id] = $('#' + id)); if (e.textContent !== String(v)) e.textContent = v; };
  set('clock', fmtT(G.t));
  const cyc = G.t % 240;
  set('phase', cyc > 150 ? `Night · dawn in ${fmtT(240 - cyc)}` : `Day · dusk in ${fmtT(150 - cyc)}`);
  set('kA', G.kills[0]); set('kB', G.kills[1]);
  set('twA', G.towersLeft[0]); set('twB', G.towersLeft[1]);
  if (hudFrame % 20 === 0) {
    const pips = tm => G.altars.filter(a => a.owner === tm).map(a => `<i style="background:${TEAMCOL[tm]}" title="${a.name}"></i>`).join('');
    $('#dpA').innerHTML = pips(0); $('#dpB').innerHTML = pips(1);
    const vm = G.voidmaw;
    const row = (col, name, val, live) => `<div class="obj"><i style="background:${col}"></i><span>${name}</span><em class="${live ? 'live' : ''}">${val}</em></div>`;
    const alt = a => { const who = a.owner < 0 ? 'Neutral' : a.owner === p.team ? 'Ours' : 'Theirs'; const col = a.owner < 0 ? '#9a9486' : TEAMCOL[a.owner]; return row(col, a.name, G.t < a.unlock ? `${who} · ${fmtT(a.unlock - G.t)}` : a.owner === p.team ? 'Ours' : 'Open', G.t >= a.unlock && a.owner !== p.team); };
    $('#objs').innerHTML =
      row('#b36bff', 'Voidmaw', vm.unit && !vm.unit.dead ? 'Awake' : fmtT(vm.next - G.t), vm.unit && !vm.unit.dead) +
      G.altars.map(alt).join('') +
      row('#9dff8a', 'Heartwood relic', G.relic.up ? 'Ready' : fmtT(G.relic.next - G.t), G.relic.up) +
      (G.voidhand[0] > G.t ? row('#b36bff', 'Your Void hand', fmtT(G.voidhand[0] - G.t), true) : '') +
      (G.reveal[0] > G.t ? row('#4cc3ff', 'Enemies revealed', fmtT(G.reveal[0] - G.t), true) : '');
  }
  // roster
  if (hudFrame % 6 === 0) for (const r of HUDC.roster) {
    const h = r.h, seen = h.team === p.team || h.vis[p.team];
    r.lv.textContent = 'Lv ' + h.level;
    r.bar.style.width = (h.dead ? 0 : seen ? h.hp / h.maxHp * 100 : 100) + '%';
    r.bar.style.opacity = seen ? 1 : .25;
    r.dt.hidden = !h.dead; if (h.dead) r.dt.textContent = Math.ceil(h.respawn);
  }
  // abilities
  for (const k in HUDC.slots) {
    const S = HUDC.slots[k];
    const locked = k !== 'D' && k !== 'F' && !rank(p, k);
    const info = k === 'D' || k === 'F' ? SPELLS[k] : ABIL[p.def.ab[k]];
    const max = k === 'D' || k === 'F' ? info.cd * (p.s.quicken ? .7 : 1) : info.cd[Math.max(0, rank(p, k) - 1)] * (1 - p.s.cdr);
    const cd = Math.max(0, p.cds[k]);
    const nomana = info.mana && p.mana < info.mana;
    const state = `${locked}|${nomana}|${cd > 0}|${G.armed === k || G.aim === k}`;
    if (state !== S.state) {
      S.state = state;
      S.el.classList.toggle('locked', locked); S.el.classList.toggle('nomana', !!nomana && !locked);
      S.el.classList.toggle('ready', !locked && !nomana && cd <= 0); S.el.classList.toggle('armed', G.armed === k || G.aim === k);
    }
    if (S.wasCd && cd <= 0 && !locked) { S.el.classList.remove('flash'); void S.el.offsetWidth; S.el.classList.add('flash'); }
    S.wasCd = cd > 0;
    S.cd.style.setProperty('--p', cd > 0 ? Math.min(1, cd / max) : 0);
    const txt = cd > 0 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
    if (S.cdt.textContent !== String(txt)) S.cdt.textContent = txt;
  }
  // vitals
  const sh = shieldAmt(p), tot = Math.max(p.maxHp, p.hp + sh);
  $('#hpI').style.width = (p.hp / tot * 100) + '%';
  const shI = $('#shI'); shI.style.left = (p.hp / tot * 100) + '%'; shI.style.width = (sh / tot * 100) + '%';
  set('hpT', `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}${sh > 0 ? ` (+${Math.round(sh)})` : ''}`);
  $('#mpI').style.width = (p.mana / p.maxMana * 100) + '%';
  set('mpT', `${Math.floor(p.mana)} / ${Math.round(p.maxMana)}`);
  $('#xpring').setAttribute('stroke-dashoffset', 238.8 * (1 - (p.level >= MAXLVL ? 1 : p.xp / xpNeed(p.level))));
  set('plvl', p.level);
  set('gold', Math.floor(p.gold));
  if (UI.goldPop) { UI.goldPop = false; const ge = $('#gold'); ge.classList.remove('pop'); void ge.offsetWidth; ge.classList.add('pop'); }
  const tp = $('#tpts'); tp.hidden = !p.pts; if (p.pts) set('tpts', p.pts);
  if (hudFrame % 10 === 0) {
    const s = p.s;
    $('#stl').innerHTML = `<span>AD <b>${Math.round(s.power)}</b></span><span>AP <b>${Math.round(s.ap)}</b></span><span>AS <b>${s.as.toFixed(2)}</b></span><span>CRIT <b>${Math.round(s.crit * 100)}%</b></span><span>ARM <b>${Math.round(s.armor)}</b></span><span>MR <b>${Math.round(s.mr)}</b></span><span>MS <b>${Math.round(unitSpeed(p))}</b></span><span>CDR <b>${Math.round(s.cdr * 100)}%</b></span>`;
  }
  // items
  const ik = p.items.map(id => id + (p.stacks[id] || '')).join(',');
  if (ik !== HUDC.itemsKey) {
    HUDC.itemsKey = ik;
    const box = $('#items'); box.innerHTML = ''; HUDC.itemCds = [];
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('button'); d.className = 'it';
      const id = p.items[i];
      d.insertAdjacentHTML('beforeend', `<span class="k">${i + 1}</span>`);
      if (id) {
        const it = ITEM[id];
        d.prepend(cloneCanvas(iconFor(it.glyph, it.color)));
        if (p.stacks[id]) d.insertAdjacentHTML('beforeend', `<span class="st">${p.stacks[id]}</span>`);
        if (it.active || it.use) { d.classList.add('act'); d.insertAdjacentHTML('beforeend', '<span class="cd"></span>'); HUDC.itemCds.push([d.querySelector('.cd'), it.active || it.use]); }
        tip(d, () => `<h5>${esc(it.name)}</h5><div class="m">${it.active || it.use ? `Press ${i + 1} to use` : TIER_LABEL[it.tier]}</div><p>${statLines(it).join('<br>')}${it.text ? `<br><i>${esc(it.text)}</i>` : ''}</p>`);
        d.addEventListener('pointerdown', e => { e.stopPropagation(); if (it.active || it.use) useItem(p, i, Input.wx, Input.wy); else openShop(true); });
      }
      box.append(d);
    }
    if (!$('#shop').hidden) renderShop();
  }
  for (const [el, k] of HUDC.itemCds || []) { const left = (p.itemCd[k] || 0) - G.t; el.style.setProperty('--p', left > 0 ? left / ACTIVE_CD[k] : 0); }
  if (!$('#shop').hidden && hudFrame % 15 === 0) $('#shopGold').textContent = Math.floor(p.gold);
  // buffs
  const bk = Object.keys(p.buffs).filter(k => BUFFS[k]).join(',');
  if (bk !== HUDC.buffKey) {
    HUDC.buffKey = bk; const box = $('#buffs'); box.innerHTML = '';
    for (const k of bk ? bk.split(',') : []) {
      const [g, c, n] = BUFFS[k]; const d = document.createElement('div'); d.className = 'buff'; d.title = n; d.dataset.k = k;
      d.append(cloneCanvas(iconFor(g, c, 56))); d.insertAdjacentHTML('beforeend', '<span></span>'); box.append(d);
    }
  }
  if (hudFrame % 5 === 0) for (const d of $('#buffs').children) { const b = p.buffs[d.dataset.k]; if (b) d.lastChild.textContent = Math.ceil(b.t); }
  // death & channel
  const dm = $('#deathmsg');
  dm.hidden = !p.dead || G.over;
  if (p.dead) dm.innerHTML = `Respawning in ${Math.ceil(p.respawn)}<small>Your allies fight on</small>`;
  const ch = $('#channel');
  ch.hidden = !p.channel;
  if (p.channel) { set('chName', p.channel.name); $('#chBar').style.width = (p.channel.t / p.channel.max * 100) + '%'; }
  const atF = dist(p, FOUNT[p.team]) < 300;
  $('#bShop').style.boxShadow = atF ? 'inset 0 0 0 1px var(--gilt2), 0 0 10px #f3d89255' : '';
}

/* ---------- talents ---------- */
function openTalents(show) {
  const m = $('#talents'); m.hidden = show === undefined ? !m.hidden : !show;
  if (!m.hidden) renderTalents();
  $('#tooltip').hidden = true;
}
function renderTalents() {
  const p = G.player; const wrap = $('#trees'); wrap.innerHTML = '';
  $('#talSub').textContent = `${p.def.name} · level ${p.level}`;
  $('#tpLeft').textContent = p.pts;
  TREES.forEach((T, ti) => {
    const tree = document.createElement('div'); tree.className = 'tree'; tree.style.setProperty('--tc', T.color);
    const pts = treePoints(p, ti);
    tree.innerHTML = `<h3>${T.name}</h3><div class="tp">${pts} points invested</div>`;
    const grid = document.createElement('div'); grid.className = 'tgrid';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); grid.append(svg);
    const els = {};
    for (const n of T.nodes) {
      const b = document.createElement('button'); b.className = 'tnode';
      const r = p.talents[n.id] | 0;
      const isCap = n.tier === 4;
      let glyph = n.icon, col = T.color, name = n.name, desc;
      if (isCap) {
        b.classList.add('cap');
        const key = CAPKEY[p.def.id][ti];
        glyph = key ? ABIL[p.def.ab[key]].icon : 'star'; col = p.def.c1; name = p.def.caps[ti];
        desc = CAPDESC[p.def.id][ti];
      } else desc = n.d(Math.max(1, r));
      b.append(cloneCanvas(iconFor(glyph, col, 116)));
      b.insertAdjacentHTML('beforeend', `<span class="rk">${r}/${n.max}</span>`);
      const need = isCap ? 8 : n.tier * 2;
      if (r >= n.max) b.classList.add('max'); else if (r > 0) b.classList.add('some');
      if (canLearn(p, n)) b.classList.add('avail');
      b.setAttribute('aria-label', `${name}, rank ${r} of ${n.max}`);
      b.onclick = () => { if (learn(p, n)) { SFX.play('level'); ring(p.x, p.y, T.color, 60); renderTalents(); } };
      tip(b, () => `<h5>${esc(name)}</h5><div class="m">${isCap ? 'Crown talent · ' : ''}Rank ${p.talents[n.id] | 0} / ${n.max}${need ? ` · requires ${need} points in ${T.name}` : ''}</div><p>${esc(desc)}</p>${!isCap && r > 0 && r < n.max ? `<p style="color:var(--gilt2);margin-top:4px">Next rank: ${esc(n.d(r + 1))}</p>` : ''}`);
      grid.append(b); els[n.id] = b;
    }
    tree.append(grid); wrap.append(tree);
    requestAnimationFrame(() => {
      const gr = grid.getBoundingClientRect();
      const ctr = e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2 - gr.left, r.top + r.height / 2 - gr.top]; };
      const nodes = T.nodes; let s = '';
      const link = (a, b, on) => { const [x1, y1] = ctr(els[a.id]), [x2, y2] = ctr(els[b.id]); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? T.color : '#2a3440'}" stroke-width="${on ? 3 : 2}" ${on ? '' : 'stroke-dasharray="4 4"'}/>`; };
      for (let t = 0; t < 3; t++) for (let c = 0; c < 2; c++) link(nodes[t * 2 + c], nodes[(t + 1) * 2 + c], pts >= (t + 1) * 2);
      link(nodes[6], nodes[8], pts >= 8); link(nodes[7], nodes[8], pts >= 8);
      svg.innerHTML = s;
    });
  });
}
function resetTalents() {
  const p = G.player;
  if (dist(p, FOUNT[p.team]) > 300) { UI.toast('Return to your fountain to reset talents'); return; }
  let n = 0; for (const k in p.talents) n += p.talents[k]; p.talents = {}; p.pts += n; calcStats(p); renderTalents();
}

/* ---------- shop (Armory) ---------- */
const SHOP = { tab: 'rec', cat: 'all', sel: null, q: '', invSel: -1 };
const TIER_LABEL = { starter: 'Starter', consumable: 'Consumable', basic: 'Basic', epic: 'Epic', legendary: 'Legendary', boots: 'Boots' };
function openShop(show) {
  const m = $('#shop'); m.hidden = show === undefined ? !m.hidden : !show;
  if (!m.hidden) { if (!SHOP.sel) SHOP.sel = G.player.def.build[0]; renderShop(); }
  $('#tooltip').hidden = true;
}
function itemTile(id, big) {
  const p = G.player, it = ITEM[id];
  const b = document.createElement('button');
  const plan = it.stack || it.elixir ? { cost: it.cost } : purchasePlan(p, id);
  const why = canBuy(p, id);
  const owned = p.items.includes(id);
  b.className = `stile t-${it.tier}${SHOP.sel === id ? ' sel' : ''}${owned ? ' owned' : ''}${why ? ' cant' : ''}`;
  b.append(cloneCanvas(iconFor(it.glyph, it.color, 96)));
  b.insertAdjacentHTML('beforeend', `<span class="c">${plan.cost}</span>${owned ? '<span class="ok">✓</span>' : ''}${big ? `<span class="n">${esc(it.name)}</span>` : ''}`);
  b.setAttribute('aria-label', `${it.name}, ${plan.cost} gold`);
  b.onclick = () => { SHOP.sel = id; SFX.play('ui'); renderShop(); };
  b.oncontextmenu = e => { e.preventDefault(); SHOP.sel = id; shopBuy(id); };
  b.ondblclick = () => shopBuy(id);
  tip(b, () => `<h5>${esc(it.name)}</h5><div class="m">${TIER_LABEL[it.tier]} · ${it.cost} gold${plan.cost !== it.cost ? ` · ${plan.cost} for you` : ''}</div><p>${statLines(it).join('<br>')}${it.text ? `<br><i>${esc(it.text)}</i>` : ''}</p><p style="color:var(--muted);margin-top:4px">Right-click or double-click to buy</p>`);
  return b;
}
function shopBuy(id) {
  const p = G.player;
  if (!atShop(p)) { UI.toast('Items can only be bought at your fountain — press B to recall'); return; }
  const why = canBuy(p, id);
  if (why) { UI.toast(why); SFX.play('ui'); return; }
  buyItem(p, id); SFX.play('buy'); renderShop();
}
function section(title, ids, note) {
  const d = document.createElement('section'); d.className = 'ssec';
  d.innerHTML = `<h4>${title}${note ? `<small>${note}</small>` : ''}</h4>`;
  const row = document.createElement('div'); row.className = 'srow';
  ids.forEach(id => row.append(itemTile(id)));
  d.append(row); return d;
}
function renderShop() {
  const p = G.player, at = atShop(p);
  $('#tooltip').hidden = true;
  $('#shopGold').textContent = Math.floor(p.gold);
  for (const b of document.querySelectorAll('#shopTabs button')) b.classList.toggle('on', b.dataset.tab === SHOP.tab);
  const cats = $('#shopCats'); cats.innerHTML = ''; cats.hidden = SHOP.tab !== 'all';
  for (const [k, label] of CATS) { const b = document.createElement('button'); b.textContent = label; b.className = SHOP.cat === k ? 'on' : ''; b.onclick = () => { SHOP.cat = k; renderShop(); }; cats.append(b); }
  const list = $('#shopList'); list.innerHTML = '';
  const q = SHOP.q.trim().toLowerCase();
  if (SHOP.tab === 'rec' && !q) {
    const d = p.def;
    list.append(section('Starting items', [d.start, 'pot', d.role[0] === 'Mage' || d.role[0] === 'Support' ? 'el_sorc' : d.role[0] === 'Vanguard' ? 'el_iron' : 'el_wrath'], 'buy at the start of the match'));
    list.append(section('Core build', d.build, `recommended for ${d.name} · ${d.role[0]}`));
    const comps = []; const walkC = id => ITEM[id].from.forEach(f => { if (!comps.includes(f)) comps.push(f); walkC(f); }); d.build.slice(0, 3).forEach(walkC);
    list.append(section('Build-path components', comps, 'pick these up on the way to your core items'));
    list.append(section('Boots', ITEMS.filter(i => i.tier === 'boots').map(i => i.id), 'one pair'));
    list.append(section('Situational', ['mercsash', 'brambleguard', 'soulward', 'hourglass', 'aegispendant', 'grievblade', 'grieforb', 'mountain'].filter(x => !d.build.includes(x)), 'answers to specific threats'));
  } else {
    const match = it => it.cats.has(SHOP.cat) && (!q || it.name.toLowerCase().includes(q) || statLines(it).join(' ').toLowerCase().includes(q) || (it.text || '').toLowerCase().includes(q));
    for (const t of ['starter', 'consumable', 'boots', 'basic', 'epic', 'legendary']) {
      const ids = ITEMS.filter(i => i.tier === t && match(i)).sort((a, b) => a.cost - b.cost).map(i => i.id);
      if (ids.length) list.append(section(TIER_LABEL[t], ids));
    }
    if (!list.children.length) list.innerHTML = `<p class="empty">No items match “${esc(SHOP.q)}”.</p>`;
  }
  renderDetail();
  const inv = $('#shopInv'); inv.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const id = p.items[i]; const b = document.createElement('button'); b.className = 'invs' + (SHOP.invSel === i && id ? ' sel' : '');
    if (id) {
      b.append(cloneCanvas(iconFor(ITEM[id].glyph, ITEM[id].color, 72)));
      if (p.stacks[id]) b.insertAdjacentHTML('beforeend', `<span class="st">${p.stacks[id]}</span>`);
      b.onclick = () => { SHOP.invSel = i; SHOP.sel = id; renderShop(); };
      b.oncontextmenu = e => { e.preventDefault(); SHOP.invSel = i; shopSell(); };
      tip(b, () => `<h5>${esc(ITEM[id].name)}</h5><div class="m">Sells for ${Math.floor(ITEM[id].cost * (ITEM[id].stack ? .4 : .7))} gold · right-click to sell</div>`);
    } else b.setAttribute('aria-label', 'Empty slot');
    inv.append(b);
  }
  $('#shopSell').disabled = !(at && p.items[SHOP.invSel]);
  $('#shopUndo').disabled = !(at && p.undo.length);
  $('#shopNote').innerHTML = at ? `<b>${6 - p.items.length}</b> free slots · right-click an item to buy, right-click your own to sell` : `Browsing only — items are sold at your fountain. Press <kbd>B</kbd> to recall.`;
}
function treeNode(id, pool) {
  const n = document.createElement('div'); n.className = 'tnode2';
  const i = pool.indexOf(id), have = i >= 0; if (have) pool.splice(i, 1);
  const b = itemTile(id); if (have) b.classList.add('have');
  n.append(b);
  if (!have && ITEM[id].from.length) {
    const kids = document.createElement('div'); kids.className = 'tkids';
    ITEM[id].from.forEach(f => kids.append(treeNode(f, pool)));
    n.append(kids);
  }
  return n;
}
function renderDetail() {
  const p = G.player, id = SHOP.sel, box = $('#shopDetail');
  box.innerHTML = '';
  if (!id) { box.innerHTML = '<p class="empty">Select an item to see its stats and build path.</p>'; return; }
  const it = ITEM[id];
  const plan = it.stack || it.elixir ? { cost: it.cost } : purchasePlan(p, id);
  const why = atShop(p) ? canBuy(p, id) : 'Return to your fountain to buy';
  const head = document.createElement('div'); head.className = 'dhead';
  head.append(cloneCanvas(iconFor(it.glyph, it.color, 128)));
  head.insertAdjacentHTML('beforeend', `<div><span class="tier t-${it.tier}">${TIER_LABEL[it.tier]}</span><h3>${esc(it.name)}</h3><span class="dcost">${it.cost} gold${it.from.length ? ` · recipe ${recipeCost(it)}` : ''}</span></div>`);
  box.append(head);
  const stats = statLines(it);
  box.insertAdjacentHTML('beforeend', `${stats.length ? `<ul class="dstats">${stats.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${it.text ? `<p class="dpass">${esc(it.text)}</p>` : ''}`);
  const buy = document.createElement('button'); buy.className = 'btn dbuy'; buy.textContent = why ? why : `Buy · ${plan.cost} gold`; buy.disabled = !!why;
  buy.onclick = () => shopBuy(id);
  box.append(buy);
  if (it.from.length) {
    const t = document.createElement('div'); t.className = 'dtree';
    t.insertAdjacentHTML('beforeend', '<h5>Build path <small>components you own are ticked</small></h5>');
    const root = document.createElement('div'); root.className = 'tnode2 root';
    root.append(itemTile(id));
    const kids = document.createElement('div'); kids.className = 'tkids';
    const pool = [...p.items];
    it.from.forEach(f => kids.append(treeNode(f, pool)));
    root.append(kids); t.append(root);
    box.append(t);
  }
  if (it.into.length) {
    const t = document.createElement('div'); t.className = 'dinto';
    t.insertAdjacentHTML('beforeend', '<h5>Builds into</h5>');
    const row = document.createElement('div'); row.className = 'srow'; it.into.forEach(x => row.append(itemTile(x))); t.append(row);
    box.append(t);
  }
}
function shopSell() {
  const p = G.player;
  if (!atShop(p)) return UI.toast('Sell items at your fountain');
  if (!p.items[SHOP.invSel]) return;
  sellItem(p, SHOP.invSel); SHOP.invSel = -1; SFX.play('buy'); renderShop();
}
$('#shopTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; SHOP.tab = b.dataset.tab; renderShop(); });
$('#shopSearch').addEventListener('input', e => { SHOP.q = e.target.value; if (SHOP.q && SHOP.tab === 'rec') SHOP.tab = 'all'; renderShop(); });
$('#shopSell').onclick = shopSell;
$('#shopUndo').onclick = () => { if (atShop(G.player) && undoShop(G.player)) { SFX.play('ui'); renderShop(); } };

/* =========================================================
   INPUT
   ========================================================= */
const Input = { sx: 0, sy: 0, wx: 0, wy: 0, down: false, nextRepeat: 0, keys: {}, inside: false, touch: false };
const SETTINGS = { quick: false };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('shardfall-settings') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('shardfall-settings', JSON.stringify(SETTINGS)); } catch (e) { } }
function refreshWorldMouse() { if (!G) return; const w = screenToWorld(Input.sx, Input.sy); Input.wx = w.x; Input.wy = w.y; }
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); Input.sx = e.clientX - r.left; Input.sy = e.clientY - r.top; Input.inside = true; Input.touch = e.pointerType === 'touch'; refreshWorldMouse(); });
cv.addEventListener('pointerleave', () => { Input.inside = false; Input.down = false; });
cv.addEventListener('pointerdown', e => {
  if (!G || G.demo || !G.player) return;
  SFX.init();
  const r = cv.getBoundingClientRect(); Input.sx = e.clientX - r.left; Input.sy = e.clientY - r.top; Input.touch = e.pointerType === 'touch'; refreshWorldMouse();
  if (G.armed) { const k = G.armed; G.armed = null; cast(G.player, k, Input.wx, Input.wy); return; }
  if (G.amoveArmed) {
    const p = G.player; G.amoveArmed = false;
    p.amove = { x: Input.wx, y: Input.wy }; p.attackTarget = null; p.hold = false; p.channel = null; p.path = findPath(p.x, p.y, Input.wx, Input.wy);
    G.marks.push({ x: Input.wx, y: Input.wy, t: .45, col: '#ff5a48', r: 26 });
    return;
  }
  issueOrder(Input.wx, Input.wy, false);
  Input.down = true; Input.nextRepeat = G.t + .25;
});
addEventListener('pointerup', () => { Input.down = false; });
cv.addEventListener('wheel', e => { if (!G || G.demo) return; e.preventDefault(); G.cam.z = clamp(G.cam.z * (e.deltaY > 0 ? .9 : 1.1), zMin(), 1.4); refreshWorldMouse(); }, { passive: false });
// minimap: left-click / drag looks around (Space snaps back), right-click moves; a tap on touch screens moves
const mmPos = e => { const r = $('#minimap').getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1) * W, clamp((e.clientY - r.top) / r.height, 0, 1) * H]; };
let mmLook = false;
$('#minimap').addEventListener('pointerdown', e => {
  if (!G || G.demo || !G.player) return; e.stopPropagation(); e.preventDefault();
  const [wx, wy] = mmPos(e);
  if (e.button === 2 || e.pointerType === 'touch') { issueOrder(wx, wy, false); return; }
  mmLook = true; G.cam.free = true; G.cam.x = wx; G.cam.y = wy; G.cam.snap = true;
  e.currentTarget.setPointerCapture(e.pointerId);
});
$('#minimap').addEventListener('pointermove', e => { if (!mmLook || !G) return; const [wx, wy] = mmPos(e); G.cam.x = wx; G.cam.y = wy; G.cam.snap = true; });
$('#minimap').addEventListener('pointerup', () => { mmLook = false; });
$('#minimap').addEventListener('contextmenu', e => e.preventDefault());

const anyModal = () => ['talents', 'shop', 'pause'].some(m => !$('#' + m).hidden);
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Escape') { e.target.blur(); openShop(false); } return; }
  if (!G || G.demo || !G.player || G.over) { if (e.key === 'Enter' && !$('#select').hidden) $('#bLock').click(); return; }
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  Input.keys[e.key] = true;
  if (k === 'Tab') { e.preventDefault(); if (!e.repeat) { $('#scoreT').innerHTML = scoreTable(); $('#score').hidden = false; } return; }
  if (k === 'Escape') {
    if (!$('#talents').hidden || !$('#shop').hidden) { openTalents(false); openShop(false); return; }
    if (G.armed || G.amoveArmed) { G.armed = null; G.amoveArmed = false; return; }
    const pz = $('#pause'); pz.hidden = !pz.hidden; G.paused = !pz.hidden; return;
  }
  if (G.paused) return;
  if (k === 'T') { openTalents(); openShop(false); return; }
  if (k === 'P') { openShop(); openTalents(false); return; }
  if (e.repeat) return;
  const p = G.player;
  if (['Q', 'W', 'E', 'R', 'D'].includes(k)) {
    SFX.init();
    const info = k === 'D' ? { type: 'point' } : ABIL[p.def.ab[k]];
    if (info.type === 'self' || SETTINGS.quick) cast(p, k, info.type === 'self' ? p.x : Input.wx, info.type === 'self' ? p.y : Input.wy);
    else G.aim = k;
    return;
  }
  if (k === 'F') { cast(p, 'F', p.x, p.y); return; }
  if (k >= '1' && k <= '6') { useItem(p, +k - 1, Input.wx, Input.wy); return; }
  if (k === 'B') { startRecall(p); return; }
  if (k === 'Y') { G.cam.free = !G.cam.free; UI.toast(G.cam.free ? 'Free camera — edge-pan or arrow keys, Space to recenter' : 'Camera locked to your champion'); return; }
  if (k === ' ') { e.preventDefault(); G.cam.free = false; return; }
  if (k === 'S') { p.path = []; p.attackTarget = null; p.autoAcq = false; p.amove = null; p.hold = false; p.wind = null; return; }
  if (k === 'A') { G.amoveArmed = true; return; }
  if (k === 'H') { p.hold = true; p.path = []; p.amove = null; if (p.attackTarget && dist(p, p.attackTarget) > p.range + p.attackTarget.r) p.attackTarget = null; return; }
});
addEventListener('keyup', e => {
  Input.keys[e.key] = false;
  if (!G || G.demo || !G.player) return;
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (k === 'Tab') { $('#score').hidden = true; return; }
  if (G.aim === k) { G.aim = null; if (!G.paused) cast(G.player, k, Input.wx, Input.wy); }
});
addEventListener('blur', () => { if (G) G.aim = null; Input.down = false; });

/* ---------- buttons ---------- */
$('#bPlay').onclick = () => { SFX.init(); SFX.play('ui'); UI.show('select'); $('#hud').hidden = true; };
$('#bHow').onclick = () => { $('#howto').hidden = !$('#howto').hidden; };
$('#bBack').onclick = () => { UI.show('title'); $('#hud').hidden = true; };
$('#bLock').onclick = () => { SFX.init(); startMatch(); };
for (const b of document.querySelectorAll('#diff button')) b.onclick = () => { UI.diff = +b.dataset.d; for (const x of document.querySelectorAll('#diff button')) x.classList.toggle('on', x === b); };
$('#bTal').onclick = () => { openTalents(); openShop(false); };
$('#bShop').onclick = () => { openShop(); openTalents(false); };
$('#bRec').onclick = () => { if (G && G.player) startRecall(G.player); };
$('#tReset').onclick = resetTalents;
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => { const id = b.dataset.close; $('#' + id).hidden = true; if (id === 'pause') G.paused = false; $('#tooltip').hidden = true; };
for (const id of ['talents', 'shop']) $('#' + id).addEventListener('pointerdown', e => { if (e.target.id === id) { $('#' + id).hidden = true; $('#tooltip').hidden = true; } });
$('#bRestart').onclick = () => { $('#pause').hidden = true; startDemo(); UI.show('select'); $('#hud').hidden = true; };
$('#bAgain').onclick = () => { startDemo(); UI.show('select'); $('#hud').hidden = true; };
function syncQuick() { $('#bQuick').textContent = SETTINGS.quick ? 'Casting: quick cast at cursor' : 'Casting: hold to aim, release to cast'; }
$('#bQuick').onclick = () => { SETTINGS.quick = !SETTINGS.quick; saveSettings(); syncQuick(); if (G && G.player && !G.demo) buildHUD(); };
syncQuick();
$('#bSurrender').onclick = () => {
  if (!G || G.demo || G.over) return;
  if (G.t < 900) { UI.toast(`Surrender opens at 15:00 (${fmtT(900 - G.t)} left)`); return; }
  $('#pause').hidden = true; G.paused = false; G.over = true; G.winner = 1 - G.player.team; UI.endGame();
};
$('#mute').onclick = () => { SFX.on = !SFX.on; $('#mute').textContent = SFX.on ? 'Sound on' : 'Sound off'; };

/* =========================================================
   LOOP & BOOT
   ========================================================= */
function startDemo() {
  const ids = HEROES.map(h => h.id).sort(() => Math.random() - .5);
  newGame(ids[0], ids.slice(3, 6), ids.slice(1, 3), true);
  G.t = 0;
  // fast-forward so the showcase opens mid-skirmish
  for (let i = 0; i < 60 * 80; i++) update(1 / 60);
  G.cam.z = VW < 700 ? .62 : .85;
  const f = G.heroes.find(h => !h.dead) || G.heroes[0]; G.cam.x = f.x; G.cam.y = f.y;
}
const SIM_SPEED = .8; // the whole battle runs a little slower than real time
let last = performance.now(), splashT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try {
    if (G) {
      if (!G.paused) { if (G.hitstop > 0) G.hitstop -= dt; else update(dt * SIM_SPEED); }
      if (G.demo && G.over) startDemo();
      updateCamera(dt);
      if (G.player && !G.cam.free) refreshWorldMouse();
      if (G.player && !G.demo) {
        G.hover = Input.inside && !Input.touch ? unitAt(Input.wx, Input.wy, G.player.team) : null;
        if (G.hover && isStruct(G.hover) && structProtected(G.hover)) G.hover = null;
        const cur = G.amoveArmed || G.armed ? 'cell' : G.hover ? 'pointer' : 'crosshair';
        if (cv.style.cursor !== cur) cv.style.cursor = cur;
      }
      render(now);
      if (!G.demo && G.player && !$('#hud').hidden) { if (hudFrame % 2 === 0) drawMinimap(); updateHUD(); }
    }
    if (!$('#select').hidden) {
      splashT += dt;
      const r = splashC.getBoundingClientRect(), w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
      if (w > 0 && (splashC.width !== w || splashC.height !== h)) { splashC.width = w; splashC.height = h; }
      if (w > 0) drawPortrait(splashC.getContext('2d'), w, h, HERO[UI.selHero], splashT);
      const mc = $('#model'), mr = mc.getBoundingClientRect(), mw = Math.round(mr.width * DPR), mh = Math.round(mr.height * DPR);
      if (mw > 0 && (mc.width !== mw || mc.height !== mh)) { mc.width = mw; mc.height = mh; }
      if (mw > 0) drawModelStage(mc, HERO[UI.selHero], dt);
    }
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
function boot() {
  resize();
  buildTerrain();
  buildRoster();
  startDemo();
  UI.show('title'); $('#hud').hidden = true;
  requestAnimationFrame(frame);
}
