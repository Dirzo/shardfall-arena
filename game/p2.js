'use strict';
/* =========================================================
   SHARDFALL ARENA — utilities, data, procedural art
   ========================================================= */
const TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmtT = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(a, b, t) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const c = (s) => Math.round(lerp((x >> s) & 255, (y >> s) & 255, t)); return `rgb(${c(16)},${c(8)},${c(0)})`; }
function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

const TEAMCOL = ['#4cc3ff', '#ff5a48'];
const TEAMNAME = ['Dawnguard', 'Duskborn'];

/* ---------------- heroes ---------------- */
const HEROES = [
  { id: 'kael', name: 'Kaelthorn', title: 'The Iron Warden', role: ['Vanguard', 'Melee'], diff: 1,
    c1: '#f0b453', c2: '#5a3310', eye: '#ffd978', cloak: '#3a2a1c',
    lore: 'He held the Emberpass gate for nine days with a shield hammered from the gate itself.',
    art: { helm: 'horns', weapon: 'shield', pauldron: true, fx: 'ember' },
    stats: { hp: 740, hpG: 92, mana: 300, manaG: 22, power: 36, powerG: 3.4, as: .78, range: 135, ms: 305, armor: 22, armorG: 2.6, regen: 4 },
    bars: { Damage: 2, Toughness: 5, Mobility: 2, Control: 4 },
    ab: { Q: 'bash', W: 'bulwark', E: 'shatter', R: 'titanfall' },
    caps: ['Shattering Bash', 'Aegis Eternal', 'Aftershock'],
    start: 's_shield', build: ['b_steel', 'cinderplate', 'brambleguard', 'soulward', 'mountain', 'colossus'] },
  { id: 'vesp', name: 'Vesper', title: 'Stormcaller of the Spire', role: ['Mage', 'Ranged'], diff: 2,
    c1: '#6fb8ff', c2: '#1b2c66', eye: '#dff4ff', cloak: '#1a2340',
    lore: 'She climbed the lightning rod of the Spire at sixteen, and came down speaking in thunder.',
    art: { helm: 'hood', weapon: 'staff', fx: 'spark' },
    stats: { hp: 560, hpG: 78, mana: 460, manaG: 38, power: 30, powerG: 3.6, as: .66, range: 520, ms: 300, armor: 12, armorG: 1.8, regen: 2.6 },
    bars: { Damage: 5, Toughness: 1, Mobility: 3, Control: 3 },
    ab: { Q: 'arcbolt', W: 'static', E: 'blink', R: 'tempest' },
    caps: ['Forked Lightning', 'Grounding Field', 'Eye of the Storm'],
    start: 's_ring', build: ['b_sorc', 'stormstaff', 'archcrown', 'voidstaff', 'hourglass', 'mask'] },
  { id: 'nyx', name: 'Nyxra', title: 'Shadeblade of the Hollow', role: ['Assassin', 'Melee'], diff: 3,
    c1: '#b36bff', c2: '#2a0f45', eye: '#e9c2ff', cloak: '#170c24',
    lore: 'The Hollow Court keeps no records of her. That is how you know she is real.',
    art: { helm: 'cowl', weapon: 'daggers', fx: 'smoke' },
    stats: { hp: 640, hpG: 86, mana: 320, manaG: 26, power: 44, powerG: 4.2, as: .92, range: 140, ms: 340, armor: 18, armorG: 2.3, regen: 3 },
    bars: { Damage: 5, Toughness: 2, Mobility: 5, Control: 1 },
    ab: { Q: 'shadowstep', W: 'venom', E: 'veil', R: 'deathmark' },
    caps: ["Death's Embrace", 'Umbral Cloak', 'Twin Shadows'],
    start: 's_blade', build: ['b_lucid', 'thirster', 'titanbreaker', 'shademaw', 'ironresolve', 'stormcrown'] },
  { id: 'oryn', tithe: 3, support: true, bounty: .25, name: 'Oryn', title: 'Grovekeeper of Elderwild', role: ['Support', 'Ranged'], diff: 1,
    c1: '#7fe08a', c2: '#123d24', eye: '#d8ffb0', cloak: '#1d3322',
    lore: 'The oldest oak of Elderwild grew a voice. It chose to walk rather than wait.',
    art: { helm: 'antlers', weapon: 'branch', fx: 'leaf' },
    stats: { hp: 600, hpG: 84, mana: 440, manaG: 36, power: 40, powerG: 3.8, as: .66, range: 500, ms: 300, armor: 16, armorG: 2.2, regen: 3.4 },
    bars: { Damage: 2, Toughness: 3, Mobility: 2, Control: 5 },
    ab: { Q: 'snare', W: 'rejuv', E: 'wild', R: 'sanctuary' },
    caps: ['Bramblelash', 'Evergreen', 'Verdant Surge'],
    start: 's_ring', build: ['b_lucid', 'aegispendant', 'frostscepter', 'soulward', 'hourglass', 'mask'] },
  { id: 'brak', name: 'Brakka', title: 'Warchief of the Red Tusk', role: ['Fighter', 'Melee'], diff: 2,
    c1: '#ff6a3d', c2: '#4a120a', eye: '#ffb070', cloak: '#3a1a12',
    lore: 'Twelve clans, one horn. He blew it once, and the plains have not been quiet since.',
    art: { helm: 'tusks', weapon: 'axe', pauldron: true, fx: 'ember' },
    stats: { hp: 720, hpG: 98, mana: 280, manaG: 22, power: 42, powerG: 4, as: .76, range: 150, ms: 315, armor: 19, armorG: 2.6, regen: 4.2 },
    bars: { Damage: 4, Toughness: 4, Mobility: 2, Control: 3 },
    ab: { Q: 'cleave', W: 'warcry', E: 'hook', R: 'bloodrage' },
    caps: ['Rend', 'Unyielding', 'Grand Hook'],
    start: 's_blade', build: ['b_steel', 'triforce', 'cleaver', 'ironresolve', 'shademaw', 'brambleguard'] },
  { id: 'sylv', name: 'Sylvane', title: 'Windrunner Ranger', role: ['Marksman', 'Ranged'], diff: 2,
    c1: '#8ff0e0', c2: '#0f3b3c', eye: '#e8fff9', cloak: '#16302f',
    lore: 'She has never missed. The wind, she says, simply agrees with her.',
    art: { helm: 'ears', weapon: 'bow', fx: 'wind' },
    stats: { hp: 535, hpG: 78, mana: 330, manaG: 26, power: 37, powerG: 3.2, as: .7, range: 550, ms: 310, armor: 13, armorG: 1.9, regen: 2.8 },
    bars: { Damage: 5, Toughness: 1, Mobility: 4, Control: 2 },
    ab: { Q: 'pierce', W: 'volley', E: 'tumble', R: 'barrage' },
    caps: ['Headshot', 'Evasion', 'Rain of Arrows'],
    start: 's_blade', build: ['b_zerk', 'stormcrown', 'galewind', 'drownedking', 'titanbreaker', 'thirster'] },
];
const HERO = Object.fromEntries(HEROES.map(h => [h.id, h]));

/* ---------------- items (Armory) ----------------
   tiers: starter · consumable · basic · epic · legendary · boots
   stats: ad ap hp mana armor mr as crit ls omni ah ms msp regen mregen pen mpen ten onhit
   passives are flags read by the combat code; actives are used with keys 1–6 */
const STAT_LABEL = {
  ad: ['Attack Damage', ''], ap: ['Ability Power', ''], hp: ['Health', ''], mana: ['Mana', ''], armor: ['Armor', ''], mr: ['Magic Resist', ''],
  as: ['Attack Speed', '%'], crit: ['Critical Strike Chance', '%'], ls: ['Life Steal', '%'], omni: ['Omnivamp', '%'], ah: ['Ability Haste', ''],
  ms: ['Move Speed', ''], msp: ['Move Speed', '%'], regen: ['Health Regen /s', ''], mregen: ['Mana Regen /s', ''], pen: ['Armor Penetration', '%'],
  mpen: ['Magic Penetration', '%'], ten: ['Tenacity', '%'], onhit: ['On-hit Damage', ''], range: ['Attack Range', ''],
};
const PCT = new Set(['as', 'crit', 'ls', 'omni', 'msp', 'pen', 'mpen', 'ten']);
const CATS = [
  ['all', 'All items'], ['ad', 'Attack Damage'], ['crit', 'Critical Strike'], ['as', 'Attack Speed'], ['ls', 'Life Steal & Vamp'], ['pen', 'Penetration'],
  ['ap', 'Ability Power'], ['ah', 'Ability Haste'], ['mana', 'Mana'], ['hp', 'Health'], ['armor', 'Armor'], ['mr', 'Magic Resist'], ['ms', 'Movement'],
  ['active', 'Actives'], ['consumable', 'Consumables'],
];
const I = (id, name, tier, cost, glyph, color, stats, extra = {}) => ({ id, name, tier, cost, glyph, color, stats, from: [], ...extra });
const ITEMS = [
  // starters (one at a time)
  I('s_blade', "Warden's Shortblade", 'starter', 450, 'blade', '#d9a86a', { ad: 8, hp: 80, omni: .025 }),
  I('s_ring', "Seer's Ring", 'starter', 400, 'orb', '#8fb0ff', { ap: 18, hp: 70, mregen: 1.5 }),
  I('s_shield', 'Oaken Buckler', 'starter', 450, 'shield', '#c9a45c', { hp: 110, regen: 2.5, armor: 5 }),
  // consumables
  I('pot', 'Healing Draught', 'consumable', 50, 'drop', '#ff5a6a', {}, { stack: 5, use: 'pot', text: 'Use: restore 150 health over 15s. Stacks to 5.' }),
  I('el_wrath', 'Tonic of Fury', 'consumable', 500, 'flame', '#ff7a45', {}, { elixir: 'elixWrath', text: 'Drink on purchase: +15 attack damage and 8% omnivamp for 3 minutes.' }),
  I('el_sorc', 'Tonic of Sorcery', 'consumable', 500, 'rune', '#b58cff', {}, { elixir: 'elixSorc', text: 'Drink on purchase: +40 ability power and 15 ability haste for 3 minutes.' }),
  I('el_iron', 'Tonic of Iron', 'consumable', 500, 'armor', '#9aa8b8', {}, { elixir: 'elixIron', text: 'Drink on purchase: +300 health and 25% tenacity for 3 minutes.' }),
  // basic
  I('longsword', 'Iron Longblade', 'basic', 350, 'blade', '#c8c8d4', { ad: 10 }),
  I('pickaxe', 'Quarry Pick', 'basic', 875, 'axe', '#b8a07a', { ad: 25 }),
  I('greatsword', 'Colossus Greatsword', 'basic', 1300, 'blade', '#e8d8a8', { ad: 40 }),
  I('dagger', 'Swift Dagger', 'basic', 300, 'dagger', '#e7e7f0', { as: .12 }),
  I('cloak', 'Cloak of Keenness', 'basic', 600, 'wind', '#ffd27a', { crit: .15 }),
  I('fang', 'Vampiric Fang', 'basic', 900, 'fang', '#e05060', { ad: 15, ls: .07 }),
  I('tome', 'Arcane Primer', 'basic', 435, 'book', '#8f9cff', { ap: 20 }),
  I('wand', 'Blasting Rod', 'basic', 850, 'orb', '#a98cff', { ap: 45 }),
  I('bigrod', 'Staff of Plenty', 'basic', 1250, 'rune', '#c7a2ff', { ap: 65 }),
  I('garnet', 'Garnet Shard', 'basic', 400, 'heart', '#ff5a6a', { hp: 150 }),
  I('girdle', "Giant's Girdle", 'basic', 900, 'banner', '#ff7a6a', { hp: 350 }),
  I('jerkin', 'Padded Jerkin', 'basic', 300, 'armor', '#b8a07a', { armor: 15 }),
  I('chain', 'Chainmail Vest', 'basic', 800, 'chain', '#aab4c0', { armor: 40 }),
  I('mantle', 'Warding Mantle', 'basic', 450, 'aura', '#7fd0ff', { mr: 25 }),
  I('moonstone', 'Moonstone', 'basic', 350, 'moon', '#a9d8ff', { mana: 250 }),
  I('kindle', 'Kindling Gem', 'basic', 800, 'star', '#ffb070', { hp: 200, ah: 10 }),
  I('b_worn', 'Worn Boots', 'boots', 300, 'boot', '#b8c89a', { ms: 25 }),
  // epic
  I('warhammer', 'Warhammer of Haste', 'epic', 1100, 'fist', '#d0b890', { ad: 25, ah: 10 }, { from: ['longsword', 'longsword'] }),
  I('stormshard', 'Stormshard', 'epic', 800, 'bolt', '#9fe0ff', { as: .15, msp: .04 }, { from: ['dagger'] }),
  I('sash', "Zealot's Sash", 'epic', 1050, 'wind', '#ffe08a', { as: .18, crit: .15, msp: .05 }, { from: ['dagger', 'cloak'] }),
  I('mace', "Brawler's Mace", 'epic', 1100, 'fist', '#ff9a6a', { hp: 200, ad: 15 }, { from: ['garnet', 'longsword'] }),
  I('charm', 'Spellblade Charm', 'epic', 700, 'echo', '#b8a2ff', { mana: 200 }, { from: ['moonstone'], pass: { itemBlade: 1 }, text: 'Spellblade: after casting an ability, your next attack deals bonus damage equal to your base attack damage.' }),
  I('wisp', 'Wisp Charm', 'epic', 850, 'leaf', '#bfffd8', { ap: 30, msp: .05 }, { from: ['tome'] }),
  I('codex', 'Hexed Codex', 'epic', 900, 'book', '#c7a2ff', { ap: 35, ah: 10 }, { from: ['tome'] }),
  I('chapter', "Seeker's Chapter", 'epic', 1100, 'book', '#8fb0ff', { ap: 40, mana: 300, ah: 10 }, { from: ['tome', 'moonstone'] }),
  I('thornvest', 'Thornbark Vest', 'epic', 800, 'thorn', '#9fd07a', { armor: 30 }, { from: ['jerkin'], pass: { thorns: 10 }, text: 'Thorns: attackers take 10 magic damage (+10% of your armor).' }),
  I('nullcloak', 'Nullmagic Cloak', 'epic', 900, 'aura', '#8fd0ff', { mr: 45 }, { from: ['mantle'] }),
  I('sunder', 'Sundering Edge', 'epic', 1300, 'saber', '#e0e0f0', { ad: 20, pen: .18 }, { from: ['longsword'] }),
  I('cinder', 'Ember Cinder', 'epic', 900, 'flame', '#ff8a4a', { hp: 250 }, { from: ['garnet'], pass: { aura: 12 }, text: 'Immolate: burn nearby enemies for 12 (+1% bonus health) magic damage per second.' }),
  I('grievblade', 'Grievous Blade', 'epic', 800, 'skull', '#d05050', { ad: 20 }, { from: ['longsword'], pass: { antiheal: 1 }, text: 'Grievous Wounds: your attacks reduce the target\'s healing by 40% for 3s.' }),
  I('grieforb', 'Grievous Orb', 'epic', 800, 'skull', '#b05090', { ap: 30 }, { from: ['tome'], pass: { antiheal: 2 }, text: 'Grievous Wounds: your abilities reduce the target\'s healing by 40% for 3s.' }),
  I('recurve', 'Recurve Bow', 'epic', 1000, 'arrow', '#b8e0a0', { as: .2, onhit: 15 }, { from: ['dagger', 'dagger'] }),
  I('wardplate', 'Warden Plate', 'epic', 1000, 'armor', '#aab4c0', { armor: 40, hp: 100 }, { from: ['jerkin', 'jerkin'] }),
  // legendary (unique)
  I('stormcrown', 'Stormcrown Edge', 'legendary', 3400, 'blade', '#ffd24a', { ad: 65, crit: .2 }, { from: ['greatsword', 'pickaxe', 'cloak'], pass: { critDmg: .35 }, text: 'Stormcrown: critical strikes deal 210% damage instead of 175%.' }),
  I('drownedking', 'Blade of the Drowned King', 'legendary', 3200, 'saber', '#5fd4c4', { ad: 40, as: .25, ls: .1 }, { from: ['recurve', 'fang', 'pickaxe'], pass: { onhitPct: .06 }, text: 'Mist Edge: attacks deal 6% of the target\'s current health as bonus damage.' }),
  I('triforce', 'Tri-Aspect Force', 'legendary', 3333, 'star', '#ffd27a', { ad: 35, as: .3, hp: 300, ah: 20, msp: .05 }, { from: ['charm', 'mace', 'stormshard'], pass: { itemBlade: 2 }, text: 'Spellblade: after casting, your next attack deals 200% base attack damage as bonus damage.' }),
  I('thirster', 'Crimson Thirster', 'legendary', 3400, 'drop', '#ff3a3a', { ad: 65, ls: .18 }, { from: ['greatsword', 'fang', 'longsword'], pass: { lifeline: .1 }, text: 'Overflow: dropping below 30% health grants a shield (150 + 10% max health). 60s cooldown.' }),
  I('titanbreaker', 'Titanbreaker', 'legendary', 3000, 'axe', '#c8c8d4', { ad: 45, crit: .2, pen: .3 }, { from: ['sunder', 'pickaxe', 'cloak'] }),
  I('galewind', 'Galewind Cannon', 'legendary', 2800, 'barrage', '#bffff0', { as: .3, crit: .25, msp: .07, range: 50 }, { from: ['sash', 'stormshard'], text: 'Sharpshooter: ranged champions gain +50 attack range.' }),
  I('cleaver', 'Rending Cleaver', 'legendary', 3100, 'axe', '#ff9a6a', { ad: 40, hp: 400, ah: 20, pen: .15 }, { from: ['mace', 'warhammer'] }),
  I('ironresolve', 'Iron Resolve Gage', 'legendary', 3100, 'fist', '#e8d8a8', { ad: 45, hp: 400, ten: .2 }, { from: ['mace', 'pickaxe'], pass: { lifeline: .25 }, text: 'Lifeline: dropping below 30% health grants a large shield (150 + 25% max health). 60s cooldown.' }),
  I('shademaw', 'Maw of Shades', 'legendary', 2900, 'void', '#9a7aff', { ad: 55, mr: 50, ah: 15 }, { from: ['warhammer', 'nullcloak'], pass: { lifeline: .15 }, text: 'Lifeline: a shield of 150 + 15% max health when you fall below 30%. 60s cooldown.' }),
  I('mercsash', 'Mercurial Sash', 'legendary', 3200, 'wind', '#d8e8ff', { ad: 50, mr: 35, ten: .2 }, { from: ['pickaxe', 'nullcloak'], active: 'cleanse', text: 'Active — Quicksilver: remove all stuns, roots and slows and gain 50% move speed for 1s. 90s cooldown.' }),
  I('gunblade', 'Stormshot Gunblade', 'legendary', 3000, 'bolt', '#ffb070', { ad: 40, ap: 80, omni: .12 }, { from: ['fang', 'wand'], active: 'bolt', text: 'Active — Stormshot: blast the enemy nearest your cursor (700 range) for 175 (+30% ability power) magic damage and slow it 40%. 40s cooldown.' }),
  I('archcrown', 'Crown of the Archmage', 'legendary', 3600, 'crown', '#c7a2ff', { ap: 120 }, { from: ['bigrod', 'bigrod'], pass: { apMult: .35 }, text: 'Magical Opus: +35% ability power.' }),
  I('stormstaff', 'Echoing Stormstaff', 'legendary', 3000, 'storm', '#8fd0ff', { ap: 90, mana: 600, ah: 20 }, { from: ['chapter', 'wand'] }),
  I('mask', 'Anguished Mask', 'legendary', 3000, 'skull', '#ff8a4a', { ap: 80, hp: 300 }, { from: ['cinder', 'wand'], pass: { burn: 1 }, text: 'Torment: abilities burn enemies for 2% of their max health per second for 3s.' }),
  I('voidstaff', 'Voidreaver Staff', 'legendary', 3000, 'void', '#b36bff', { ap: 90, mpen: .4 }, { from: ['wand', 'grieforb'] }),
  I('hourglass', 'Hourglass of Stillness', 'legendary', 3000, 'hourglass', '#f3d892', { ap: 105, armor: 45 }, { from: ['wand', 'chain'], active: 'stasis', text: 'Active — Stasis: become invulnerable and untargetable but unable to act for 2.5s. 120s cooldown.' }),
  I('frostscepter', 'Frostbound Scepter', 'legendary', 2800, 'moon', '#bfe6ff', { ap: 65, hp: 350 }, { from: ['girdle', 'wand'], pass: { frost: 1 }, text: 'Rimefrost: abilities slow enemies by 30% for 1s.' }),
  I('cinderplate', 'Cinderplate Aegis', 'legendary', 2900, 'flame', '#ff6a3d', { hp: 450, armor: 50 }, { from: ['cinder', 'chain'], pass: { aura: 25 }, text: 'Immolate: burn nearby enemies for 25 (+1% bonus health) magic damage per second.' }),
  I('brambleguard', 'Brambleguard', 'legendary', 2700, 'thorn', '#7fe08a', { hp: 350, armor: 70 }, { from: ['thornvest', 'girdle'], pass: { thorns: 30, antiheal: 1 }, text: 'Thorns: attackers take 30 (+10% armor) magic damage and suffer Grievous Wounds.' }),
  I('soulward', 'Soulward Visage', 'legendary', 2900, 'heal', '#7dff9a', { hp: 450, mr: 60, ah: 10, regen: 3 }, { from: ['kindle', 'nullcloak'], pass: { healUp: .25 }, text: 'Boundless Vitality: +25% healing and shielding received.' }),
  I('mountain', 'Bulwark of the Mountain', 'legendary', 2700, 'shield', '#c9a45c', { hp: 400, armor: 60 }, { from: ['girdle', 'wardplate'], pass: { dr: .08 }, text: 'Rock Solid: take 8% less damage from all sources.' }),
  I('colossus', 'Colossus Heart', 'legendary', 3000, 'heart', '#ff5a6a', { hp: 800, regen: 8, ah: 10 }, { from: ['girdle', 'kindle'], pass: { hpToAd: .015 }, text: 'Colossal: gain attack damage equal to 1.5% of your bonus health.' }),
  I('aegispendant', 'Aegis Pendant', 'legendary', 2500, 'sanct', '#f3d892', { hp: 200, armor: 30, mr: 30, ah: 15 }, { from: ['kindle', 'jerkin', 'mantle'], active: 'guard', text: 'Active — Devotion: shield yourself and allied champions within 700 for 250 for 3s. 70s cooldown.' }),
  // boots (one pair)
  I('b_swift', 'Swiftstride Treads', 'boots', 1000, 'boot', '#9fd07a', { ms: 60 }, { from: ['b_worn'] }),
  I('b_zerk', "Berserker's Greaves", 'boots', 1100, 'boot', '#ffd27a', { ms: 45, as: .35 }, { from: ['b_worn', 'dagger'] }),
  I('b_sorc', "Arcanist's Slippers", 'boots', 1100, 'boot', '#b58cff', { ms: 45, mpen: .15 }, { from: ['b_worn'] }),
  I('b_steel', 'Ironclad Treads', 'boots', 1100, 'boot', '#aab4c0', { ms: 45, armor: 20 }, { from: ['b_worn', 'jerkin'], pass: { atkDr: .12 }, text: 'Plated: take 12% less damage from attacks.' }),
  I('b_merc', 'Mercury Striders', 'boots', 1100, 'boot', '#8fd0ff', { ms: 45, mr: 25, ten: .3 }, { from: ['b_worn', 'mantle'] }),
  I('b_lucid', 'Lucid Sandals', 'boots', 1000, 'boot', '#a9d8ff', { ms: 45, ah: 20 }, { from: ['b_worn'] }),
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
for (const it of ITEMS) {
  it.cats = new Set(['all']);
  for (const k in it.stats) {
    if (k === 'ad') it.cats.add('ad'); if (k === 'crit') it.cats.add('crit'); if (k === 'as') it.cats.add('as');
    if (k === 'ls' || k === 'omni') it.cats.add('ls'); if (k === 'pen' || k === 'mpen') it.cats.add('pen'); if (k === 'ap') it.cats.add('ap');
    if (k === 'ah') it.cats.add('ah'); if (k === 'mana' || k === 'mregen') it.cats.add('mana'); if (k === 'hp' || k === 'regen') it.cats.add('hp');
    if (k === 'armor') it.cats.add('armor'); if (k === 'mr') it.cats.add('mr'); if (k === 'ms' || k === 'msp') it.cats.add('ms');
  }
  if (it.active || it.use) it.cats.add('active');
  if (it.tier === 'consumable') it.cats.add('consumable');
  it.into = [];
}
for (const it of ITEMS) for (const f of new Set(it.from)) ITEM[f].into.push(it.id);
const recipeCost = it => it.cost - it.from.reduce((s, f) => s + ITEM[f].cost, 0);
function statLines(it) {
  return Object.entries(it.stats).map(([k, v]) => `+${PCT.has(k) ? Math.round(v * 100) + '%' : v} ${STAT_LABEL[k][0]}`);
}
function applyItems(h, s) {
  const P = {};
  for (const id of h.items) {
    const it = ITEM[id];
    const st = it.stats;
    s.power += st.ad || 0; s.ap += st.ap || 0; s.maxHp += st.hp || 0; s.maxMana += st.mana || 0; s.armor += st.armor || 0; s.mr += st.mr || 0;
    s.asMult += st.as || 0; s.crit += st.crit || 0; s.lifesteal += st.ls || 0; s.omni += st.omni || 0; s.ah += st.ah || 0;
    s.regen += st.regen || 0; s.manaRegen += st.mregen || 0; s.pen += st.pen || 0; s.mpen += st.mpen || 0; s.ccMult *= 1 - (st.ten || 0);
    s.onhit += st.onhit || 0; if (st.msp) s.msMult *= 1 + st.msp;
    if (st.range && h.ranged) s.range += st.range;
    if (it.pass) for (const k in it.pass) P[k] = Math.max(P[k] || 0, it.pass[k]);
  }
  // boots: movement from only the best pair
  let bootMs = 0; for (const id of h.items) bootMs = Math.max(bootMs, ITEM[id].stats.ms || 0);
  s.ms += bootMs;
  if (P.antiheal) { let m = 0; for (const id of h.items) m |= (ITEM[id].pass && ITEM[id].pass.antiheal) || 0; P.antiheal = m; }
  s.itemBlade = P.itemBlade || 0; s.critDmg += P.critDmg || 0; s.onhitPct = P.onhitPct || 0; s.lifeline = P.lifeline || 0;
  s.thorns = P.thorns || 0; s.aura = P.aura || 0; s.antiheal = P.antiheal || 0; s.burn = P.burn || 0; s.frost = P.frost || 0;
  s.apMult += P.apMult || 0; s.healMult += P.healUp || 0; s.hpToAd = P.hpToAd || 0; s.atkDr = P.atkDr || 0;
  if (P.dr) s.dmgTaken *= 1 - P.dr;
}

/* ---------------- talents ---------------- */
// tier 0-3: two nodes each (col 0/1), tier 4: capstone (hero specific)
const TREES = [
  { id: 'fer', name: 'Ferocity', color: '#ff7a45', nodes: [
    { id: 'keen', tier: 0, max: 3, name: 'Keen Edge', icon: 'blade', d: r => `+${4 * r}% damage from all sources.`, fx: (s, r) => { s.dmgMult *= 1 + .04 * r; } },
    { id: 'thirst', tier: 0, max: 2, name: 'Bloodthirst', icon: 'drop', d: r => `+${5 * r}% lifesteal (half as effective on abilities).`, fx: (s, r) => { s.lifesteal += .05 * r; } },
    { id: 'relent', tier: 1, max: 3, name: 'Relentless', icon: 'saber', d: r => `+${7 * r}% attack speed.`, fx: (s, r) => { s.asMult += .07 * r; } },
    { id: 'pred', tier: 1, max: 1, name: 'Predator', icon: 'fang', d: () => '+25% damage to monsters and structures.', fx: s => { s.monsterMult *= 1.25; } },
    { id: 'exec', tier: 2, max: 1, name: 'Executioner', icon: 'skull', d: () => '+15% damage to targets below 40% health.', fx: s => { s.execMult += .15; } },
    { id: 'brut', tier: 2, max: 2, name: 'Brutality', icon: 'fist', d: r => `+${7 * r} power.`, fx: (s, r) => { s.power += 7 * r; } },
    { id: 'ramp', tier: 3, max: 1, name: 'Rampage', icon: 'flame', d: () => 'Takedowns heal 15% health and grant 30% move speed for 3s.', fx: s => { s.rampage = 1; } },
    { id: 'fleet', tier: 3, max: 2, name: 'Hunter\'s Stride', icon: 'boot', d: r => `+${5 * r}% movement speed.`, fx: (s, r) => { s.msMult *= 1 + .05 * r; } },
    { id: 'capF', tier: 4, max: 1, cap: 0, icon: 'crown' },
  ] },
  { id: 'res', name: 'Resolve', color: '#5fd4c4', nodes: [
    { id: 'tough', tier: 0, max: 3, name: 'Toughness', icon: 'heart', d: r => `+${6 * r}% maximum health.`, fx: (s, r) => { s.hpMult += .06 * r; } },
    { id: 'iron', tier: 0, max: 3, name: 'Iron Skin', icon: 'armor', d: r => `+${6 * r} armor.`, fx: (s, r) => { s.armor += 6 * r; } },
    { id: 'wind2', tier: 1, max: 2, name: 'Second Wind', icon: 'leaf', d: r => `+${2.5 * r} health regeneration per second.`, fx: (s, r) => { s.regen += 2.5 * r; } },
    { id: 'bulw', tier: 1, max: 1, name: 'Stonewall', icon: 'shield', d: () => 'Falling below 30% health grants a shield of 15% max health (45s cooldown).', fx: s => { s.stonewall = 1; } },
    { id: 'ten', tier: 2, max: 2, name: 'Tenacity', icon: 'chain', d: r => `Stuns, roots and slows last ${15 * r}% shorter.`, fx: (s, r) => { s.ccMult *= 1 - .15 * r; } },
    { id: 'guard', tier: 2, max: 1, name: 'Guardian Aura', icon: 'aura', d: () => 'You and allies within 500 take 6% less damage.', fx: s => { s.guardian = 1; } },
    { id: 'last', tier: 3, max: 1, name: 'Last Stand', icon: 'banner', d: () => 'Below 35% health, take 20% less damage.', fx: s => { s.laststand = 1; } },
    { id: 'vigor', tier: 3, max: 2, name: 'Vigor', icon: 'cross', d: r => `+${12 * r}% healing and shielding received.`, fx: (s, r) => { s.healMult += .12 * r; } },
    { id: 'capR', tier: 4, max: 1, cap: 1, icon: 'crown' },
  ] },
  { id: 'sor', name: 'Sorcery', color: '#b58cff', nodes: [
    { id: 'focus', tier: 0, max: 3, name: 'Focus', icon: 'hourglass', d: r => `+${5 * r}% cooldown reduction.`, fx: (s, r) => { s.cdr += .05 * r; } },
    { id: 'well', tier: 0, max: 2, name: 'Wellspring', icon: 'moon', d: r => `+${70 * r} mana and +${1.5 * r} mana per second.`, fx: (s, r) => { s.maxMana += 70 * r; s.manaRegen += 1.5 * r; } },
    { id: 'weave', tier: 1, max: 3, name: 'Spellweave', icon: 'rune', d: r => `+${7 * r}% ability damage.`, fx: (s, r) => { s.abilMult *= 1 + .07 * r; } },
    { id: 'quicken', tier: 1, max: 1, name: 'Quickening', icon: 'star', d: () => 'Blink and Mend recharge 30% faster.', fx: s => { s.quicken = 1; } },
    { id: 'scholar', tier: 2, max: 2, name: 'Scholar', icon: 'book', d: r => `+${12 * r}% experience gained.`, fx: (s, r) => { s.xpMult += .12 * r; } },
    { id: 'hoard', tier: 2, max: 1, name: 'Dragon\'s Hoard', icon: 'coin', d: () => '+2.5 gold per second.', fx: s => { s.goldPs += 2.5; } },
    { id: 'echo', tier: 3, max: 1, name: 'Echo', icon: 'echo', d: () => 'Abilities have a 20% chance to instantly refund their cooldown.', fx: s => { s.echo = 1; } },
    { id: 'sblade', tier: 3, max: 2, name: 'Spellblade', icon: 'orb', d: r => `After casting, your next attack deals +${25 * r} + ${20 * r}% power bonus damage.`, fx: (s, r) => { s.spellblade = r; } },
    { id: 'capS', tier: 4, max: 1, cap: 2, icon: 'crown' },
  ] },
];
const TAL = {};
TREES.forEach((t, ti) => t.nodes.forEach(n => { n.tree = ti; TAL[n.id] = n; }));
const CAPDESC = {
  kael: ['Shield Bash stuns 0.5s longer and deals 50% more damage.', 'Iron Bulwark also shields allies within 500 for half the amount.', 'Earthshatter leaves a quaking fissure for 3s that damages and slows.'],
  vesp: ['Arc Bolt forks into three bolts.', 'Static Field shields you for 30 per enemy struck.', 'Tempest is 40% larger and lasts 1s longer.'],
  nyx: ['Death Mark resets its cooldown on a takedown.', 'Veil lasts 1.5s longer and heals 10% health.', 'Shadowstep can be recast once within 3s.'],
  oryn: ['Thorn Snare roots 0.6s longer and deals 60% more damage.', 'Rejuvenate heals 40% more and cleanses slows and roots.', 'Wild Growth shields are twice as strong.'],
  brak: ['Cleave makes enemies bleed for 40% extra damage over 3s.', 'Bloodrage makes you immune to crowd control.', 'Chain Hook reaches 40% farther and stuns twice as long.'],
  sylv: ['Every 4th attack is a Headshot dealing double damage.', 'Tumble grants 30% damage reduction for 2s.', 'Volley fires a second wave.'],
};

/* ---------------- procedural art ---------------- */
const spriteCache = new Map();
function glowSprite(color) {
  let c = spriteCache.get(color);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, hexA(color, 1)); g.addColorStop(.25, hexA(color, .55)); g.addColorStop(1, hexA(color, 0));
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); spriteCache.set(color, c); return c;
}

function drawPortrait(ctx, w, h, hero, t = 0, opt = {}) {
  const A = hero.art; const cx = w / 2;
  ctx.save();
  // backdrop
  let g = ctx.createRadialGradient(cx, h * .38, 0, cx, h * .45, Math.max(w, h) * .8);
  g.addColorStop(0, hexA(hero.c1, .95)); g.addColorStop(.35, hero.c2); g.addColorStop(1, '#05070a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // light rays
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * .22 + Math.sin(t * .3 + i) * .03;
    ctx.beginPath(); ctx.moveTo(cx, h * .42);
    ctx.lineTo(cx + Math.cos(a - .05) * h * 1.2, h * .42 + Math.sin(a - .05) * h * 1.2);
    ctx.lineTo(cx + Math.cos(a + .05) * h * 1.2, h * .42 + Math.sin(a + .05) * h * 1.2);
    ctx.fillStyle = hexA(hero.c1, .05 + .03 * Math.sin(t + i * 2)); ctx.fill();
  }
  // rune circle
  const R = Math.min(w, h) * .34, ry = h * .42;
  ctx.strokeStyle = hexA(hero.c1, .45); ctx.lineWidth = Math.max(1, w / 260);
  ctx.beginPath(); ctx.arc(cx, ry, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, ry, R * .86, 0, TAU); ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const a = t * .15 + i / 24 * TAU;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .88, ry + Math.sin(a) * R * .88);
    ctx.lineTo(cx + Math.cos(a) * R * (i % 3 ? .95 : 1.0), ry + Math.sin(a) * R * (i % 3 ? .95 : 1.0)); ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = -t * .1 + i / 6 * TAU, px = cx + Math.cos(a) * R * .93, py = ry + Math.sin(a) * R * .93;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.beginPath();
    ctx.moveTo(-R * .04, 0); ctx.lineTo(0, -R * .05); ctx.lineTo(R * .04, 0); ctx.lineTo(0, R * .05); ctx.closePath();
    ctx.fillStyle = hexA(hero.c1, .7); ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  const S = Math.min(w / 1, h / 1.05);
  const ox = cx, oy = h; // bust origin bottom-centre
  const P = (x, y) => [ox + x * S, oy + y * S];
  // weapon behind
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawWeapon(ctx, A.weapon, P, S, hero, t);
  // bust silhouette
  const body = new Path2D();
  let p = P(-.46, 0); body.moveTo(...p);
  body.bezierCurveTo(...P(-.44, -.26), ...P(-.3, -.36), ...P(-.12, -.39));
  body.lineTo(...P(-.07, -.47)); body.lineTo(...P(.07, -.47)); body.lineTo(...P(.12, -.39));
  body.bezierCurveTo(...P(.3, -.36), ...P(.44, -.26), ...P(.46, 0)); body.closePath();
  const head = new Path2D();
  head.ellipse(ox, oy - .58 * S, .115 * S, .15 * S, 0, 0, TAU);
  const extra = new Path2D();
  headgear(extra, A.helm, P, S);
  if (A.pauldron) {
    for (const sx of [-1, 1]) { const ex = ox + sx * .27 * S, ey = oy - .34 * S, rot = sx * .3;
      extra.moveTo(ex + Math.cos(rot) * .13 * S, ey + Math.sin(rot) * .13 * S); extra.ellipse(ex, ey, .13 * S, .08 * S, rot, 0, TAU); }
    if (A.helm === 'tusks') { // spikes
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        const bx = ox + sx * (.2 + k * .06) * S, by = oy - (.4 - k * .01) * S;
        extra.moveTo(bx - .02 * S, by); extra.lineTo(bx + sx * .01 * S, by - .09 * S); extra.lineTo(bx + .02 * S, by);
      }
    }
  }
  g = ctx.createLinearGradient(0, oy - .8 * S, 0, oy);
  g.addColorStop(0, mixHex(hero.cloak, '#000000', .2)); g.addColorStop(1, '#030405');
  ctx.fillStyle = g;
  ctx.fill(body); ctx.fill(head); ctx.fill(extra, 'nonzero');
  // rim light
  ctx.save();
  ctx.shadowColor = hero.c1; ctx.shadowBlur = S * .04;
  ctx.strokeStyle = hexA(hero.c1, .9); ctx.lineWidth = Math.max(1, S * .006);
  ctx.stroke(body); ctx.stroke(head); ctx.stroke(extra);
  ctx.restore();
  // inner detail: collar & sigil
  ctx.strokeStyle = hexA(hero.c1, .35); ctx.lineWidth = Math.max(1, S * .004);
  ctx.beginPath(); ctx.moveTo(...P(-.14, -.38)); ctx.quadraticCurveTo(...P(0, -.25), ...P(.14, -.38)); ctx.stroke();
  ctx.save(); ctx.translate(ox, oy - .2 * S); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = hexA(hero.c1, .8); ctx.shadowColor = hero.c1; ctx.shadowBlur = S * .05;
  ctx.fillRect(-.025 * S, -.025 * S, .05 * S, .05 * S); ctx.restore();
  // eyes
  const ey = oy - .6 * S, blink = (Math.sin(t * 1.3) > .985) ? .2 : 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const sx of [-1, 1]) {
    const ex = ox + sx * .045 * S;
    ctx.drawImage(glowSprite(hero.eye), ex - .05 * S, ey - .05 * S, .1 * S, .1 * S);
    ctx.fillStyle = hero.eye; ctx.beginPath();
    ctx.ellipse(ex, ey, .022 * S, .008 * S * blink, sx * -.15, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // ambient particles
  ctx.globalCompositeOperation = 'lighter';
  const n = opt.small ? 10 : 34;
  for (let i = 0; i < n; i++) {
    const sd = i * 97.13, life = (t * (.08 + (sd % 7) * .01) + (sd % 1)) % 1;
    let px = (Math.sin(sd) * .5 + .5) * w + Math.sin(t + sd) * w * .02;
    let py = h * (1.05 - life * 1.1);
    let col = hero.c1, sz = S * (.012 + (sd % 3) * .006);
    if (A.fx === 'leaf') { col = '#b9f58a'; px += Math.sin(life * 9 + sd) * w * .05; }
    if (A.fx === 'smoke') { col = '#8a4dff'; sz *= 2.4; }
    if (A.fx === 'petal') { col = i % 2 ? '#ffb8c8' : '#ff8aa2'; px += Math.sin(life * 7 + sd) * w * .06; }
    if (A.fx === 'soul') { col = '#8fffc8'; sz *= 1.4; }
    if (A.fx === 'wind') { px = ((life * 1.4 + sd % 1) % 1) * w; py = (Math.cos(sd) * .5 + .5) * h; col = '#bffff0'; }
    ctx.globalAlpha = Math.sin(life * Math.PI) * (A.fx === 'smoke' ? .35 : .8);
    if (A.fx === 'wind') { ctx.strokeStyle = col; ctx.lineWidth = S * .003; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - S * .08, py); ctx.stroke(); }
    else ctx.drawImage(glowSprite(col), px - sz * 2, py - sz * 2, sz * 4, sz * 4);
  }
  ctx.globalAlpha = 1;
  if (A.fx === 'spark' && (Math.sin(t * 2.7) > .93 || Math.sin(t * 4.1 + 1) > .97)) {
    ctx.strokeStyle = '#e6f6ff'; ctx.lineWidth = S * .005; ctx.shadowColor = '#8fd0ff'; ctx.shadowBlur = S * .03;
    ctx.beginPath(); let lx = w * rnd(.1, .9), ly = 0; ctx.moveTo(lx, ly);
    while (ly < h * .6) { lx += rnd(-1, 1) * S * .06; ly += S * .05; ctx.lineTo(lx, ly); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.globalCompositeOperation = 'source-over';
  // bottom fade
  g = ctx.createLinearGradient(0, h * .55, 0, h);
  g.addColorStop(0, 'rgba(5,7,10,0)'); g.addColorStop(1, opt.fade === false ? 'rgba(5,7,10,0)' : 'rgba(5,7,10,.92)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function headgear(p, kind, P, S) {
  const L = (...pts) => { p.moveTo(...P(...pts[0])); for (let i = 1; i < pts.length; i++) p.lineTo(...P(...pts[i])); p.closePath(); };
  switch (kind) {
    case 'skullcrown':
      p.moveTo(...P(-.2, -.42)); p.bezierCurveTo(...P(-.2, -.64), ...P(-.14, -.76), ...P(0, -.78)); p.bezierCurveTo(...P(.14, -.76), ...P(.2, -.64), ...P(.2, -.42)); p.closePath();
      L([-.12, -.74], [-.11, -.9], [-.06, -.76]); L([-.03, -.78], [0, -.98], [.03, -.78]); L([.06, -.76], [.11, -.9], [.12, -.74]);
      break;
    case 'goggles':
      for (const s of [-1, 1]) { const [cx, cy] = P(s * .05, -.68); p.moveTo(cx + .04 * S, cy); p.arc(cx, cy, .04 * S, 0, TAU); L([s * .1, -.56], [s * .22, -.5], [s * .16, -.4], [s * .1, -.48]); }
      break;
    case 'winged':
      for (const s of [-1, 1]) L([s * .09, -.64], [s * .2, -.8], [s * .32, -.9], [s * .26, -.78], [s * .3, -.74], [s * .2, -.68], [s * .1, -.58]);
      break;
    case 'kasa':
      L([-.34, -.62], [0, -.84], [.34, -.62], [0, -.66]);
      p.moveTo(...P(.1, -.5)); p.bezierCurveTo(...P(.26, -.5), ...P(.32, -.4), ...P(.42, -.34)); p.lineTo(...P(.38, -.3)); p.bezierCurveTo(...P(.28, -.36), ...P(.2, -.44), ...P(.08, -.44)); p.closePath();
      break;
    case 'horns':
      L([-.12, -.62], [-.13, -.72], [-.1, -.76], [0, -.78], [.1, -.76], [.13, -.72], [.12, -.62]);
      for (const s of [-1, 1]) {
        p.moveTo(...P(s * .1, -.7)); p.bezierCurveTo(...P(s * .22, -.72), ...P(s * .28, -.8), ...P(s * .24, -.95));
        p.bezierCurveTo(...P(s * .22, -.84), ...P(s * .17, -.78), ...P(s * .11, -.76)); p.closePath();
      }
      L([-.02, -.78], [0, -.84], [.02, -.78]);
      break;
    case 'hood':
      p.moveTo(...P(-.2, -.4)); p.bezierCurveTo(...P(-.2, -.62), ...P(-.16, -.78), ...P(.02, -.92));
      p.bezierCurveTo(...P(.08, -.84), ...P(.18, -.72), ...P(.2, -.4)); p.closePath(); break;
    case 'cowl':
      p.moveTo(...P(-.18, -.42)); p.bezierCurveTo(...P(-.2, -.66), ...P(-.12, -.8), ...P(0, -.8));
      p.bezierCurveTo(...P(.12, -.8), ...P(.2, -.66), ...P(.18, -.42)); p.lineTo(...P(.1, -.5));
      p.lineTo(...P(0, -.53)); p.lineTo(...P(-.1, -.5)); p.closePath();
      L([.12, -.72], [.3, -.66], [.14, -.64]);
      break;
    case 'antlers':
      for (const s of [-1, 1]) {
        const seg = (x1, y1, x2, y2, wd) => { const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, dx = Math.cos(a) * wd, dy = Math.sin(a) * wd;
          p.moveTo(...P(x1 + dx, y1 + dy)); p.lineTo(...P(x2 + dx * .4, y2 + dy * .4)); p.lineTo(...P(x2 - dx * .4, y2 - dy * .4)); p.lineTo(...P(x1 - dx, y1 - dy)); p.closePath(); };
        seg(s * .07, -.7, s * .2, -.9, .015); seg(s * .2, -.9, s * .24, -1.02, .01);
        seg(s * .14, -.8, s * .28, -.82, .009); seg(s * .19, -.88, s * .3, -.95, .008); seg(s * .17, -.86, s * .12, -.98, .008);
      }
      break;
    case 'tusks':
      L([-.03, -.72], [0, -.86], [.03, -.72]);
      L([-.06, -.73], [-.02, -.82], [0, -.73]);
      for (const s of [-1, 1]) { p.moveTo(...P(s * .06, -.5)); p.quadraticCurveTo(...P(s * .12, -.55), ...P(s * .1, -.63)); p.lineTo(...P(s * .07, -.52)); p.closePath(); }
      break;
    case 'ears':
      for (const s of [-1, 1]) L([s * .1, -.62], [s * .26, -.74], [s * .11, -.56]);
      p.moveTo(...P(.08, -.7)); p.bezierCurveTo(...P(.2, -.7), ...P(.22, -.5), ...P(.16, -.36)); p.lineTo(...P(.12, -.4)); p.bezierCurveTo(...P(.15, -.5), ...P(.14, -.62), ...P(.06, -.66)); p.closePath();
      break;
  }
}

function drawWeapon(ctx, kind, P, S, hero, t) {
  ctx.save();
  const glow = hero.c1;
  ctx.fillStyle = '#07090c'; ctx.strokeStyle = hexA(glow, .85); ctx.lineWidth = Math.max(1, S * .006);
  ctx.shadowColor = glow; ctx.shadowBlur = S * .03;
  const line = (a, b, wd) => { ctx.lineWidth = wd * S; ctx.strokeStyle = '#07090c'; ctx.beginPath(); ctx.moveTo(...P(...a)); ctx.lineTo(...P(...b)); ctx.stroke(); ctx.lineWidth = Math.max(1, S * .005); ctx.strokeStyle = hexA(glow, .8); ctx.stroke(); };
  switch (kind) {
    case 'skullstaff': {
      line([.34, 0], [.28, -1.0], .02);
      const [x, y] = P(.28, -1.02);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#6fe0a8'), x - .14 * S, y - .14 * S, .28 * S, .28 * S); ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.arc(x, y + .04 * S, .04 * S, 0, TAU); ctx.fill(); ctx.stroke();
      break; }
    case 'wrench': {
      line([-.4, -.1], [-.2, -.9], .03);
      const [x, y] = P(-.2, -.92);
      ctx.beginPath(); ctx.arc(x, y, .07 * S, .3, TAU - .3); ctx.fill(); ctx.stroke();
      break; }
    case 'lance':
      line([.42, 0], [.18, -1.05], .018);
      ctx.beginPath(); ctx.moveTo(...P(.18, -1.05)); ctx.lineTo(...P(.14, -.94)); ctx.lineTo(...P(.18, -1.2)); ctx.lineTo(...P(.22, -.94)); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'katana':
      ctx.lineWidth = .012 * S; ctx.strokeStyle = '#07090c'; ctx.beginPath(); ctx.moveTo(...P(-.42, -.1)); ctx.quadraticCurveTo(...P(0, -.6), ...P(.36, -1.02)); ctx.stroke();
      ctx.lineWidth = Math.max(1, S * .004); ctx.strokeStyle = hexA(glow, .9); ctx.stroke();
      break;
    case 'shield': {
      const [x, y] = P(-.3, -.42);
      ctx.beginPath(); ctx.moveTo(x - .2 * S, y - .22 * S); ctx.lineTo(x + .2 * S, y - .22 * S); ctx.lineTo(x + .18 * S, y + .05 * S);
      ctx.quadraticCurveTo(x + .1 * S, y + .22 * S, x, y + .3 * S); ctx.quadraticCurveTo(x - .1 * S, y + .22 * S, x - .18 * S, y + .05 * S); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - .18 * S); ctx.lineTo(x, y + .22 * S); ctx.moveTo(x - .15 * S, y - .05 * S); ctx.lineTo(x + .15 * S, y - .05 * S); ctx.stroke();
      break; }
    case 'staff': {
      line([.34, 0], [.3, -1.0], .02);
      const [x, y] = P(.3, -1.02);
      ctx.globalCompositeOperation = 'lighter';
      const pul = 1 + Math.sin(t * 3) * .1;
      ctx.drawImage(glowSprite('#7fc4ff'), x - .16 * S * pul, y - .16 * S * pul, .32 * S * pul, .32 * S * pul);
      ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(x, y, .03 * S, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.arc(x, y, .06 * S, Math.PI * .1, Math.PI * .9, true); ctx.stroke();
      break; }
    case 'daggers':
      line([-.42, -.1], [-.1, -.72], .018); line([.42, -.1], [.1, -.72], .018);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(...P(s * .1, -.72)); ctx.lineTo(...P(s * .14, -.64)); ctx.lineTo(...P(s * .06, -.66)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      break;
    case 'branch':
      line([-.36, 0], [-.3, -1.0], .022);
      line([-.31, -.8], [-.42, -.92], .01); line([-.3, -.9], [-.2, -1.0], .01);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const [x, y] = P(-.3 + Math.sin(i * 2.1) * .1, -.95 + Math.cos(i * 1.7) * .08); ctx.drawImage(glowSprite('#9dff8a'), x - .04 * S, y - .04 * S, .08 * S, .08 * S); }
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'axe': {
      line([.2, -.1], [.36, -.98], .025);
      const [x, y] = P(.35, -.9);
      ctx.beginPath(); ctx.moveTo(x, y - .08 * S); ctx.quadraticCurveTo(x + .26 * S, y - .2 * S, x + .28 * S, y + .02 * S);
      ctx.quadraticCurveTo(x + .2 * S, y + .02 * S, x + .02 * S, y + .08 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - .06 * S); ctx.quadraticCurveTo(x - .14 * S, y - .12 * S, x - .15 * S, y + .02 * S); ctx.quadraticCurveTo(x - .08 * S, y + .02 * S, x, y + .05 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
      break; }
    case 'bow': {
      const [x, y] = P(.26, -.55);
      ctx.lineWidth = .02 * S; ctx.strokeStyle = '#07090c';
      ctx.beginPath(); ctx.arc(x - .3 * S, y, .5 * S, -.9, .9); ctx.stroke();
      ctx.lineWidth = Math.max(1, S * .005); ctx.strokeStyle = hexA(glow, .9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - .3 * S + Math.cos(-.9) * .5 * S, y + Math.sin(-.9) * .5 * S); ctx.lineTo(x - .3 * S + Math.cos(.9) * .5 * S, y + Math.sin(.9) * .5 * S);
      ctx.strokeStyle = hexA('#ffffff', .5); ctx.stroke();
      break; }
  }
  ctx.restore();
}

/* Icon glyphs: drawn into a square with a bevelled, tinted field */
function drawIcon(ctx, sz, glyph, color, opt = {}) {
  ctx.save();
  let g = ctx.createRadialGradient(sz * .35, sz * .3, 0, sz * .5, sz * .5, sz * .8);
  g.addColorStop(0, mixHex(color, '#ffffff', .15)); g.addColorStop(.45, mixHex(color, '#000000', .45)); g.addColorStop(1, '#05070a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz);
  // bevel
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, sz, sz * .04); ctx.fillRect(0, 0, sz * .04, sz);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, sz * .96, sz, sz * .04); ctx.fillRect(sz * .96, 0, sz * .04, sz);
  ctx.translate(sz / 2, sz / 2); const s = sz / 100;
  ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  const light = mixHex(color, '#ffffff', .65);
  ctx.fillStyle = light; ctx.strokeStyle = light; ctx.lineWidth = 7;
  const poly = (...pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
  const arrow = (x1, y1, x2, y2, hw = 10) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); poly(x2 + Math.cos(a) * 8, y2 + Math.sin(a) * 8, x2 + Math.cos(a + 2.5) * hw * 1.4, y2 + Math.sin(a + 2.5) * hw * 1.4, x2 + Math.cos(a - 2.5) * hw * 1.4, y2 + Math.sin(a - 2.5) * hw * 1.4); ctx.fill(); };
  switch (glyph) {
    case 'shield': poly(-28, -32, 28, -32, 26, 4, 0, 36, -26, 4); ctx.fill(); ctx.fillStyle = mixHex(color, '#000', .5); poly(-4, -24, 4, -24, 4, 24, -4, 24); ctx.fill(); break;
    case 'bash': poly(-34, -26, 4, -26, 2, 4, -16, 26, -32, 4); ctx.fill(); arrow(10, 0, 36, 0, 8); for (const y of [-18, 18]) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(28, y * 1.4); ctx.stroke(); } break;
    case 'quake': for (let i = 0; i < 3; i++) { ctx.lineWidth = 6 - i; ctx.beginPath(); ctx.ellipse(0, 14, 14 + i * 12, 6 + i * 5, 0, 0, TAU); ctx.stroke(); } poly(-6, -34, 6, -34, 2, -2, 12, -8, -2, 14, 0, -10, -10, -6); ctx.fill(); break;
    case 'leap': ctx.beginPath(); ctx.moveTo(-34, 30); ctx.quadraticCurveTo(-10, -50, 22, 10); ctx.stroke(); poly(12, 4, 34, 18, 18, 30); ctx.fill(); ctx.beginPath(); ctx.ellipse(24, 30, 18, 5, 0, 0, TAU); ctx.stroke(); break;
    case 'bolt': poly(6, -40, -22, 6, -2, 6, -10, 40, 24, -8, 4, -8, 14, -40); ctx.fill(); break;
    case 'field': for (let i = 0; i < 3; i++) { ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 10 + i * 12, 0, TAU); ctx.stroke(); } poly(2, -14, -8, 2, 0, 2, -4, 14, 8, -4, 0, -4); ctx.fill(); break;
    case 'blink': for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.lineWidth = i % 2 ? 4 : 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * (i % 2 ? 26 : 38), Math.sin(a) * (i % 2 ? 26 : 38)); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); break;
    case 'storm': ctx.beginPath(); for (const [x, y, r] of [[-16, -10, 16], [4, -18, 20], [20, -6, 14]]) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); } ctx.fill(); ctx.fillStyle = '#fff'; poly(-2, 2, -14, 26, -4, 24, -10, 42, 10, 16, 0, 16, 8, 2); ctx.fill(); break;
    case 'dagger': ctx.save(); ctx.rotate(-.7); poly(-5, -40, 5, -40, 6, 14, 0, 20, -6, 14); ctx.fill(); ctx.fillRect(-16, 14, 32, 6); ctx.fillRect(-4, 20, 8, 18); ctx.restore(); arrow(-30, 30, -4, 6, 0); break;
    case 'venom': ctx.beginPath(); ctx.moveTo(0, -38); ctx.bezierCurveTo(10, -16, 26, 0, 26, 14); ctx.arc(0, 14, 26, 0, Math.PI); ctx.bezierCurveTo(-26, 0, -10, -16, 0, -38); ctx.fill(); ctx.fillStyle = mixHex(color, '#000', .5); ctx.beginPath(); ctx.arc(-8, 16, 6, 0, TAU); ctx.fill(); break;
    case 'veil': ctx.beginPath(); ctx.moveTo(-38, 0); ctx.quadraticCurveTo(0, -30, 38, 0); ctx.quadraticCurveTo(0, 30, -38, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(34, 30); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); break;
    case 'skull': ctx.beginPath(); ctx.arc(0, -6, 28, Math.PI * .8, Math.PI * 2.2); ctx.lineTo(14, 30); ctx.lineTo(-14, 30); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.arc(-11, -2, 7, 0, TAU); ctx.arc(11, -2, 7, 0, TAU); ctx.fill(); poly(0, 6, -4, 14, 4, 14); ctx.fill(); break;
    case 'thorn': ctx.beginPath(); ctx.moveTo(-36, 30); ctx.bezierCurveTo(-10, 10, 10, -10, 34, -32); ctx.stroke(); for (let i = 0; i < 5; i++) { const x = -26 + i * 13, y = 22 - i * 13; poly(x, y, x - 10 + (i % 2) * 22, y - 12, x + 5, y - 3); ctx.fill(); } break;
    case 'heal': poly(-8, -34, 8, -34, 8, -8, 34, -8, 34, 8, 8, 8, 8, 34, -8, 34, -8, 8, -34, 8, -34, -8, -8, -8); ctx.fill(); break;
    case 'leaf': ctx.beginPath(); ctx.moveTo(-30, 30); ctx.quadraticCurveTo(-34, -30, 32, -32); ctx.quadraticCurveTo(28, 30, -30, 30); ctx.fill(); ctx.strokeStyle = mixHex(color, '#000', .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(18, -18); ctx.stroke(); break;
    case 'wind': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-36, -18 + i * 18); ctx.lineTo(14 - i * 8, -18 + i * 18); ctx.arc(14 - i * 8, -28 + i * 18, 10, Math.PI / 2, -Math.PI * .9, true); ctx.stroke(); } break;
    case 'sanct': ctx.beginPath(); ctx.arc(0, 18, 34, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-40, 20); ctx.lineTo(40, 20); ctx.stroke(); poly(-4, -24, 4, -24, 4, -4, 14, -4, 14, 4, 4, 4, 4, 14, -4, 14, -4, 4, -14, 4, -14, -4, -4, -4); ctx.fill(); break;
    case 'axe': ctx.beginPath(); ctx.moveTo(-26, 36); ctx.lineTo(16, -30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4, -30); ctx.quadraticCurveTo(40, -44, 38, -4); ctx.quadraticCurveTo(24, -10, 14, -12); ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-4, 6, 36, -2.6, -1.2); ctx.stroke(); break;
    case 'horn': ctx.beginPath(); ctx.moveTo(-34, 16); ctx.quadraticCurveTo(-10, 20, 22, -20); ctx.lineTo(34, -8); ctx.quadraticCurveTo(0, 36, -34, 26); ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(30, -18, 12 + i * 8, -1.4, .2); ctx.stroke(); } break;
    case 'hook': ctx.beginPath(); ctx.moveTo(-36, 34); for (let i = 0; i < 5; i++) ctx.lineTo(-30 + i * 9, 26 - i * 9 + (i % 2) * 6); ctx.stroke(); ctx.beginPath(); ctx.arc(14, -12, 16, Math.PI * .9, Math.PI * 2.3); ctx.stroke(); poly(24, 2, 34, 8, 30, -4); ctx.fill(); break;
    case 'flame': ctx.beginPath(); ctx.moveTo(0, 38); ctx.bezierCurveTo(-34, 30, -26, -6, -6, -38); ctx.bezierCurveTo(-4, -16, 10, -14, 12, -28); ctx.bezierCurveTo(32, -2, 30, 32, 0, 38); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 34); ctx.bezierCurveTo(-14, 28, -10, 10, 0, -2); ctx.bezierCurveTo(10, 12, 14, 28, 0, 34); ctx.fill(); break;
    case 'arrow': arrow(-34, 34, 30, -30, 9); ctx.lineWidth = 4; for (const k of [0, 7]) { ctx.beginPath(); ctx.moveTo(-30 + k, 30 - k); ctx.lineTo(-38 + k, 18 - k); ctx.moveTo(-30 + k, 30 - k); ctx.lineTo(-18 + k, 38 - k); ctx.stroke(); } break;
    case 'volley': ctx.lineWidth = 5; for (const a of [-.45, 0, .45]) { ctx.save(); ctx.rotate(a); arrow(0, 36, 0, -26, 7); ctx.restore(); } break;
    case 'tumble': ctx.beginPath(); ctx.arc(0, 4, 26, Math.PI * .1, Math.PI * 1.5); ctx.stroke(); poly(0, -34, 16, -22, 0, -12); ctx.fill(); for (let i = 0; i < 3; i++) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18 + i * 6, 6 + i * 8); ctx.lineTo(38, 6 + i * 8); ctx.stroke(); } break;
    case 'barrage': ctx.lineWidth = 10; arrow(-38, 0, 26, 0, 14); ctx.lineWidth = 3; for (const y of [-20, 20]) { ctx.beginPath(); ctx.moveTo(-38, y); ctx.lineTo(0, y * .6); ctx.stroke(); } break;
    case 'recall': ctx.beginPath(); ctx.arc(0, 0, 28, -Math.PI * .3, Math.PI * 1.4); ctx.stroke(); poly(18, -34, 30, -18, 12, -14); ctx.fill(); poly(0, -14, 14, 0, 14, 16, -14, 16, -14, 0); ctx.fill(); break;
    case 'blade': ctx.save(); ctx.rotate(.78); poly(-5, -42, 5, -42, 6, 18, -6, 18); ctx.fill(); ctx.fillRect(-18, 18, 36, 6); ctx.fillRect(-4, 24, 8, 14); ctx.restore(); break;
    case 'drop': ctx.beginPath(); ctx.moveTo(0, -38); ctx.bezierCurveTo(14, -14, 26, 0, 26, 14); ctx.arc(0, 14, 26, 0, Math.PI); ctx.bezierCurveTo(-26, 0, -14, -14, 0, -38); ctx.fill(); break;
    case 'saber': ctx.beginPath(); ctx.moveTo(-30, 34); ctx.quadraticCurveTo(0, 10, 30, -38); ctx.stroke(); ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 10, 34 - i * 6); ctx.lineTo(10 + i * 10, 34 - i * 6); ctx.stroke(); } break;
    case 'fang': for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 30, -30); ctx.quadraticCurveTo(s * 6, -20, s * 8, 34); ctx.quadraticCurveTo(s * 22, 0, s * 38, -20); ctx.closePath(); ctx.fill(); } break;
    case 'fist': ctx.beginPath(); ctx.roundRect(-26, -20, 52, 44, 10); ctx.fill(); ctx.fillStyle = mixHex(color, '#000', .55); for (let i = 0; i < 3; i++) ctx.fillRect(-12 + i * 13, -20, 3, 20); ctx.fillStyle = light; ctx.fillRect(-18, 24, 36, 12); break;
    case 'boot': poly(-16, -34, 10, -34, 10, 14, 34, 18, 34, 34, -18, 34); ctx.fill(); ctx.strokeStyle = mixHex(color, '#000', .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(10, -10); ctx.stroke(); break;
    case 'heart': ctx.beginPath(); ctx.moveTo(0, 34); ctx.bezierCurveTo(-44, 4, -30, -40, 0, -16); ctx.bezierCurveTo(30, -40, 44, 4, 0, 34); ctx.fill(); break;
    case 'armor': poly(-20, -34, -8, -26, 8, -26, 20, -34, 36, -22, 28, -2, 22, -6, 22, 34, -22, 34, -22, -6, -28, -2, -36, -22); ctx.fill(); ctx.fillStyle = mixHex(color, '#000', .5); ctx.fillRect(-2, -20, 4, 50); break;
    case 'chain': ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-20 + i * 20, -20 + i * 20, 14, 8, .78, 0, TAU); ctx.stroke(); } break;
    case 'aura': ctx.beginPath(); ctx.arc(0, -6, 12, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-18, 30); ctx.quadraticCurveTo(0, 0, 18, 30); ctx.fill(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 4, 34, 0, TAU); ctx.stroke(); break;
    case 'banner': ctx.beginPath(); ctx.moveTo(-24, 38); ctx.lineTo(-24, -38); ctx.stroke(); poly(-24, -34, 30, -34, 18, -16, 30, 2, -24, 2); ctx.fill(); break;
    case 'cross': ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.stroke(); poly(-6, -22, 6, -22, 6, -6, 22, -6, 22, 6, 6, 6, 6, 22, -6, 22, -6, 6, -22, 6, -22, -6, -6, -6); ctx.fill(); break;
    case 'hourglass': poly(-24, -36, 24, -36, 4, 0, 24, 36, -24, 36, -4, 0); ctx.stroke(); poly(-12, 26, 12, 26, 0, 10); ctx.fill(); break;
    case 'moon': ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.arc(14, -10, 28, 0, TAU, true); ctx.fill('evenodd'); break;
    case 'rune': poly(0, -38, 30, 0, 0, 38, -30, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.moveTo(0, -4); ctx.lineTo(12, -14); ctx.moveTo(0, 8); ctx.lineTo(-12, -2); ctx.stroke(); break;
    case 'star': poly(0, -38, 9, -10, 38, -10, 14, 6, 24, 34, 0, 16, -24, 34, -14, 6, -38, -10, -9, -10); ctx.fill(); break;
    case 'book': poly(-34, -26, -2, -20, -2, 32, -34, 26); ctx.fill(); poly(34, -26, 2, -20, 2, 32, 34, 26); ctx.fill(); break;
    case 'coin': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-8 + i * 8, 20 - i * 14, 24, 10, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = mixHex(color, '#000', .5); ctx.lineWidth = 3; ctx.stroke(); } break;
    case 'echo': for (let i = 0; i < 3; i++) { ctx.globalAlpha = 1 - i * .3; ctx.beginPath(); ctx.arc(-14 + i * 14, 0, 16, -Math.PI / 2, Math.PI / 2); ctx.stroke(); } ctx.globalAlpha = 1; break;
    case 'orb': ctx.beginPath(); ctx.arc(0, -4, 26, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-9, -13, 7, 0, TAU); ctx.fill(); ctx.fillStyle = light; ctx.fillRect(-18, 24, 36, 10); break;
    case 'crown': poly(-34, 24, -34, -22, -16, 0, 0, -32, 16, 0, 34, -22, 34, 24); ctx.fill(); ctx.fillStyle = mixHex(color, '#000', .5); ctx.fillRect(-34, 14, 68, 4); break;
    case 'void': ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill(); ctx.fillStyle = '#05070a'; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(0, 0); ctx.arc(0, 0, 24, i * 2.09, i * 2.09 + 1.1); } ctx.fill(); break;
    case 'bone': ctx.save(); ctx.rotate(-.7); ctx.fillRect(-30, -4, 60, 8); for (const sx of [-30, 30]) { ctx.beginPath(); ctx.arc(sx, -5, 7, 0, TAU); ctx.arc(sx, 5, 7, 0, TAU); ctx.fill(); } ctx.restore(); break;
    case 'raise': ctx.beginPath(); ctx.arc(0, -10, 16, 0, TAU); ctx.fill(); ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.arc(-6, -10, 4, 0, TAU); ctx.arc(6, -10, 4, 0, TAU); ctx.fill(); ctx.fillStyle = light; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12, 38); ctx.lineTo(i * 12 - 4, 14); ctx.lineTo(i * 12 + 4, 14); ctx.fill(); } break;
    case 'rocket': ctx.save(); ctx.rotate(-.8); ctx.beginPath(); ctx.moveTo(34, 0); ctx.quadraticCurveTo(20, -12, -18, -10); ctx.lineTo(-18, 10); ctx.quadraticCurveTo(20, 12, 34, 0); ctx.fill(); poly(-18, -10, -30, -20, -26, 0, -30, 20, -18, 10); ctx.fill(); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.moveTo(-28, -5); ctx.lineTo(-42, 0); ctx.lineTo(-28, 5); ctx.fill(); ctx.restore(); break;
    case 'turret': ctx.fillRect(-26, 26, 52, 8); poly(-20, 26, 0, 4, 20, 26); ctx.fill(); ctx.beginPath(); ctx.arc(0, -2, 14, 0, TAU); ctx.fill(); ctx.fillRect(0, -8, 36, 12); break;
    case 'mine': ctx.beginPath(); ctx.ellipse(0, 10, 30, 14, 0, 0, TAU); ctx.fill(); ctx.fillRect(-4, -20, 8, 26); ctx.fillStyle = '#ff5a48'; ctx.beginPath(); ctx.arc(0, -24, 7, 0, TAU); ctx.fill(); break;
    case 'sun': ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i / 8 * TAU); poly(22, -5, 38, 0, 22, 5); ctx.fill(); ctx.restore(); } break;
    case 'tether': ctx.beginPath(); ctx.arc(-20, 16, 10, 0, TAU); ctx.arc(20, -16, 10, 0, TAU); ctx.fill(); ctx.lineWidth = 5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(-20, 16); ctx.quadraticCurveTo(10, 14, 20, -16); ctx.stroke(); ctx.setLineDash([]); break;
    case 'parry': ctx.save(); ctx.rotate(.78); ctx.fillRect(-3, -40, 6, 60); ctx.restore(); ctx.save(); ctx.rotate(-.78); ctx.fillRect(-3, -40, 6, 60); ctx.restore(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, TAU); ctx.fill(); break;
    case 'petals': for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i / 5 * TAU); ctx.beginPath(); ctx.ellipse(0, -18, 9, 16, 0, 0, TAU); ctx.fill(); ctx.restore(); } ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); break;
    case 'sword2': ctx.save(); ctx.rotate(-.7); ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(10, 0, 42, -6); ctx.quadraticCurveTo(14, 6, -8, 8); ctx.fill(); ctx.fillRect(-14, -2, 6, 14); ctx.fillRect(-30, 3, 16, 5); ctx.restore(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-4, 6, 34, -2.6, -1.6); ctx.stroke(); break;
    case 'saw': default: ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function iconCanvas(glyph, color, size = 96) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  drawIcon(c.getContext('2d'), size, glyph, color); return c;
}
