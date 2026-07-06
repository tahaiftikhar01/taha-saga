/* ============================================================
   THE AUTOMATION SAGA — a God-of-War-style portfolio game
   Taha Iftikhar · mincac.com · built with Claude Code
   ============================================================ */
'use strict';

/* ---------- canvas & scaling ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VW = 1280, VH = 720;

function fitCanvas() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  canvas.style.width = (VW * s) + 'px';
  canvas.style.height = (VH * s) + 'px';
}
addEventListener('resize', fitCanvas); fitCanvas();
if ('ontouchstart' in window) document.body.classList.add('touch');

/* ---------- tiny synth sfx ---------- */
let AC = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function tone(f0, f1, dur, type, vol) {
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
}
const SFX = {
  swing: () => tone(220, 90, 0.09, 'square', 0.05),
  hit: () => tone(140, 40, 0.1, 'sawtooth', 0.12),
  hurt: () => tone(110, 60, 0.16, 'square', 0.12),
  throwAxe: () => tone(320, 620, 0.14, 'triangle', 0.09),
  catchAxe: () => tone(620, 260, 0.12, 'triangle', 0.1),
  pickup: () => tone(760, 1240, 0.09, 'sine', 0.08),
  roar: () => tone(70, 34, 0.6, 'sawtooth', 0.22),
  die: () => tone(180, 30, 0.9, 'sawtooth', 0.16),
  open: () => tone(440, 880, 0.25, 'sine', 0.1),
};

/* ---------- world layout ---------- */
const WORLD_END = 26000;
const CHAPTERS = [
  { x0: 0,     name: 'CHAPTER I',   title: 'ORIGINS',                sub: 'Lahore · the old disciplines',
    pal: { skyT:'#0a1420', skyB:'#1e4a52', r1:'#0d2430', r2:'#123240', gnd:'#0b141c', top:'#2f6a66', ember:'#7de0d0' } },
  { x0: 5200,  name: 'CHAPTER II',  title: 'THE FORGING OF MINCAC',  sub: 'one man · zero manual work',
    pal: { skyT:'#170d0c', skyB:'#4b2114', r1:'#241012', r2:'#331716', gnd:'#170c0a', top:'#6b3a22', ember:'#f08a4a' } },
  { x0: 12200, name: 'CHAPTER III', title: 'THE SPREADSHEET WARS',   sub: 'the merchant Shane · profit truth',
    pal: { skyT:'#0d0a1c', skyB:'#2c1e52', r1:'#181233', r2:'#221a44', gnd:'#100c20', top:'#4a3a80', ember:'#a08af0' } },
  { x0: 19200, name: 'CHAPTER IV',  title: 'THE RETENTION WAR',      sub: 'GymCRM · the ghosting plague',
    pal: { skyT:'#0a1410', skyB:'#1d4030', r1:'#0f241a', r2:'#143526', gnd:'#0a120c', top:'#347a4a', ember:'#7de0a0' } },
];
function chapterIndexAt(x) { let i = 0; for (let k = 0; k < CHAPTERS.length; k++) if (x >= CHAPTERS[k].x0) i = k; return i; }

/* flat zones: [start, end] — arenas, gates, spawn */
const FLATS = [[0, 760], [10300, 11960], [17100, 18960], [22700, 24500], [24500, 26000]];
function groundY(x) {
  const hills = Math.sin(x * 0.0011) * 46 + Math.sin(x * 0.00053 + 1.7) * 34 + Math.sin(x * 0.0023 + 0.5) * 12;
  let f = 1;
  for (const [a, b] of FLATS) {
    const R = 260;
    let w = 0;
    if (x >= a && x <= b) w = 1;
    else if (x > a - R && x < a) w = 1 - (a - x) / R;
    else if (x > b && x < b + R) w = 1 - (x - b) / R;
    f *= (1 - Math.max(0, w));
  }
  return 570 - hills * f;
}

/* ---------- palette helpers ---------- */
function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mix(h1, h2, t) {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}
function palAt(x) {
  const i = chapterIndexAt(x);
  const cur = CHAPTERS[i].pal;
  if (i + 1 < CHAPTERS.length) {
    const nx = CHAPTERS[i + 1].x0, T = 600;
    if (x > nx - T) {
      const t = (x - (nx - T)) / T, nxt = CHAPTERS[i + 1].pal, out = {};
      for (const k in cur) out[k] = mix(cur[k], nxt[k], t);
      return out;
    }
  }
  const out = {}; for (const k in cur) out[k] = mix(cur[k], cur[k], 0); return out;
}

/* ---------- content: signs, gates, dialogs ---------- */
const SIGNS = [
  { x: 950,  title: 'The Scholar of Lahore', body: `<p>Born of Lahore, trained in the old disciplines: <em>Python, SQL, statistics</em>. While others memorized answers, he automated the questions.</p><p><em>"Every saga begins with a spreadsheet nobody else wanted to open."</em></p>` },
  { x: 1950, title: 'The Old Ways', body: `<p>Data analysis. Dashboards. <em>BigQuery</em> depths and Google Sheets sorcery. The foundation-stone beneath every automation to come.</p>` },
  { x: 4400, title: 'The Restlessness', body: `<p>A warrior grows weary of doing the same task twice.</p><p>In that weariness, an agency was conceived.</p>` },
  { x: 6100, title: 'The Forging of MinCac', body: `<p><em>mincac.com</em> — a one-person automation agency. Clay for enrichment. n8n for the plumbing. Claude for the thinking.</p><p>Clients pay for outcomes. The machines work the night shift.</p>` },
  { x: 7300, title: 'The 14-Hour Curse', body: `<p>A client copied LinkedIn leads into HubSpot by hand — <em>14 hours, every week</em>.</p><p>Taha forged a pipeline: HeyReach → Clay → n8n → HubSpot. The curse lifted. The hours returned to their people.</p>` },
  { x: 8500, title: 'The Arsenal', body: `<p>Clay. n8n. HeyReach. HubSpot. Claude Code. Python.</p><p>Each rune mastered not for the trophy — for the kill.</p>` },
  { x: 13100, title: 'The Merchant Shane', body: `<p>From the battlefields of Upwork came Shane, an e-commerce merchant drowning in exports.</p><p>Taha built him a <em>Shopify profitability dashboard</em> — ad spend, COGS, fees, true margin. Live. Automated.</p>` },
  { x: 14300, title: 'The $549 Tribute', body: `<p>Merchants once paid tools like Triple Whale <em>$549 a month</em> for profit truth.</p><p>Taha's tracker tells the same truth — now being forged into a product of its own.</p>` },
  { x: 15500, title: 'The Deep Data', body: `<p>BigQuery audits. Funnel metrics. Growth analytics.</p><p>The numbers were always there. Someone just had to make them confess.</p>` },
  { x: 20100, title: 'The Ghosting Plague', body: `<p>Gym members vanish in silence — signed in January, gone by March. No farewell. Only churn.</p>` },
  { x: 21100, title: 'The Retention Agent', body: `<p><em>GymCRM</em>: a WhatsApp agent that notices the missing before they are lost — and speaks to them in their own tongue.</p><p>Built for the gyms of Pakistan. It floats beside you now.</p>` },
  { x: 24650, title: 'The Next Quest', body: `<p>The saga seeks its next arc: <em>GTM engineering, growth analytics, AI automation</em> — remote, or in far kingdoms.</p><p>The gates ahead hold the summons. Choose one.</p>` },
];
const GATES = [
  { x: 24950, label: 'LINKEDIN',  sub: 'the hall of records', url: 'https://www.linkedin.com/in/tahaiftikhar/', color: '#6ab8e8' },
  { x: 25250, label: 'GITHUB',    sub: 'the forge itself',    url: 'https://github.com/tahaiftikhar01',          color: '#c9a0f0' },
  { x: 25550, label: 'MINCAC.COM',sub: 'the agency banner',   url: 'https://mincac.com',                          color: '#f08a4a' },
  { x: 25850, label: 'THE RAVEN', sub: 'send word by email',  url: 'mailto:tahaiftikhar1991@gmail.com',           color: '#7de0a0' },
];

const D = (s, t) => ({ s, t });
const DIALOGS = {
  intro: [
    D('BOTREUS', 'Wake, warrior. The recruiters of Midgard are watching.'),
    D('TAHA', 'Then let them watch. I have pipelines to build.'),
    D('BOTREUS', 'Walk east. Your legend begins in Lahore — with SQL, and stubbornness.'),
  ],
  tut: [
    D('BOTREUS', 'Doubt Wisps ahead. Press J to strike. Press K to throw the Automation Axe — it keeps working after it leaves your hand. That is rather the point.'),
  ],
  ch2: [
    D('BOTREUS', 'Chapter Two. You founded MinCac — a one-man automation forge.'),
    D('TAHA', 'One man. Zero manual work. That is the whole religion.'),
  ],
  hydraIntro: [
    D('THE MANUAL-WORK HYDRA', 'COPY. PASTE. FOLLOW-UP. CUT ONE TASK AND TWO MORE SHALL RISE.'),
    D('TAHA', 'Funny. I brought an axe that scales.'),
  ],
  hydraDead: [
    D('BOTREUS', 'The Hydra falls! Fourteen hours a week, returned to the mortals. HeyReach, Clay, n8n — let the skalds sing of them.'),
  ],
  ch3: [
    D('BOTREUS', 'The Spreadsheet Wars. A merchant named Shane sought profit-truth in a storm of broken CSVs.'),
  ],
  chaosIntro: [
    D('SPREADSHEET CHAOS', '#REF! #DIV/0! I AM EVERY BROKEN EXPORT YOU EVER FEARED.'),
    D('TAHA', 'I have reconciled worse before breakfast.'),
    D('BOTREUS', 'Leap and hurl the axe — or wait for it to slam. Broken spreadsheets always crash eventually.'),
  ],
  chaosDead: [
    D('BOTREUS', 'Order restored. One dashboard to rule the margins — and the $549 monthly tribute to Triple Whale goes unpaid.'),
  ],
  ch4: [
    D('BOTREUS', 'The final chapter. The gyms of Pakistan bled members to a silent plague. They call it… ghosting.'),
  ],
  churnIntro: [
    D('CHURN, DEVOURER OF MEMBERS', 'THEY SIGN IN JANUARY. I FEAST BY MARCH.'),
    D('BOTREUS', 'Taha. Send me in. I was BUILT for this.'),
  ],
  churnDead: [
    D('BOTREUS', '…message delivered. Member retained. Churn devours no more.'),
    D('TAHA', 'Every empire falls to a well-timed WhatsApp.'),
  ],
};
const TRIGGERS = [
  { x: 320,   id: 'intro' },
  { x: 2150,  id: 'tut' },
  { x: 5450,  id: 'ch2' },
  { x: 12450, id: 'ch3' },
  { x: 19450, id: 'ch4' },
];

const CHAT_QA = [
  { q: 'Who is Taha?', a: `My maker. 24. Lahore. A data analyst turned automation engineer — founder of MinCac. He builds systems that do the boring parts of business so humans can stop pretending to enjoy them.` },
  { q: 'What is MinCac?', a: `A one-person automation agency — <a href="https://mincac.com" target="_blank" rel="noopener">mincac.com</a>. Lead-gen pipelines, CRM plumbing, AI workflows. Clay, n8n, HeyReach, Claude. One notable kill: a LinkedIn→HubSpot pipeline that erased 14 hours of weekly manual entry.` },
  { q: 'What has he built?', a: `A live Shopify profitability dashboard for a client won on Upwork. Me — a WhatsApp retention agent for gyms. Cold outreach machines. BigQuery audits. And the very realm you are standing in.` },
  { q: 'His weapons?', a: `Python, SQL, BigQuery. n8n, Clay, HeyReach, HubSpot. Claude Code — he wields it the way Kratos wields the axe. Google Sheets, when the situation calls for diplomacy.` },
  { q: 'How do I hire him?', a: `The wise choice. <a href="https://www.linkedin.com/in/tahaiftikhar/" target="_blank" rel="noopener">LinkedIn</a> · <a href="https://github.com/tahaiftikhar01" target="_blank" rel="noopener">GitHub</a> · <a href="mailto:tahaiftikhar1991@gmail.com">tahaiftikhar1991@gmail.com</a> — or fight your way to the gates at the end of the saga.` },
  { q: 'Are you really a chatbot?', a: `I am the stage persona of GymCRM — his WhatsApp retention agent. In production I chase lapsed gym members. Between contracts, I narrate sagas. Retention is retention.` },
];

/* ---------- enemies ---------- */
const ETYPES = {
  wisp:  { hp: 26,  w: 30, h: 30, dmg: 6,  fly: true,  name: 'Doubt Wisp' },
  imp:   { hp: 40,  w: 40, h: 44, dmg: 10, fly: false, name: 'Manual-Task Imp' },
  demon: { hp: 55,  w: 46, h: 50, dmg: 11, fly: false, name: 'CSV Demon' },
  shade: { hp: 48,  w: 42, h: 56, dmg: 12, fly: true,  name: 'Ghosting Shade' },
  hydra: { hp: 240, w: 300, h: 200, dmg: 14, fly: false, boss: true, name: 'THE MANUAL-WORK HYDRA' },
  chaos: { hp: 260, w: 150, h: 120, dmg: 12, fly: true,  boss: true, name: 'SPREADSHEET CHAOS' },
  churn: { hp: 300, w: 180, h: 180, dmg: 15, fly: true,  boss: true, name: 'CHURN, DEVOURER OF MEMBERS' },
};
const SPAWNS = [
  ['wisp', 2450], ['wisp', 2850], ['wisp', 3250], ['wisp', 3650], ['wisp', 3950],
  ['imp', 6650], ['imp', 7050], ['imp', 7850], ['imp', 8250], ['imp', 8850], ['imp', 9250], ['imp', 9850],
  ['demon', 13650], ['demon', 14050], ['demon', 14750], ['demon', 15150], ['demon', 15850], ['demon', 16350], ['demon', 16750],
  ['shade', 20650], ['shade', 21050], ['shade', 21650], ['shade', 22050], ['shade', 22450],
];
const BOSSES = [
  { type: 'hydra', x: 11300, arena: [10360, 11900], introId: 'hydraIntro', deadId: 'hydraDead' },
  { type: 'chaos', x: 18100, arena: [17160, 18900], introId: 'chaosIntro', deadId: 'chaosDead' },
  { type: 'churn', x: 23700, arena: [22760, 24440], introId: 'churnIntro', deadId: 'churnDead', final: true },
];
const CHECKPOINTS = [140, 5450, 12450, 19450];

/* ---------- state ---------- */
const keys = {};
let game;

function makeEnemy(type, x, extra) {
  const t = ETYPES[type];
  return Object.assign({
    type, x, y: groundY(x), vx: 0, vy: 0, hp: t.hp, maxHp: t.hp, dir: -1,
    state: 'idle', timer: 0, flash: 0, dead: false, dmgCd: 0, seed: Math.random() * 9,
  }, extra || {});
}

function resetGame() {
  game = {
    state: 'title', t: 0,
    player: {
      x: 140, y: groundY(140), vx: 0, vy: 0, dir: 1, hp: 100, maxHp: 100,
      onGround: true, atkT: 0, combo: 0, comboReset: 0, invuln: 0, runes: 0, dead: false,
    },
    axe: { state: 'held', x: 0, y: 0, vx: 0, vy: 0, rot: 0, dist: 0, hitSet: new Set() },
    enemies: SPAWNS.map(([t, x]) => makeEnemy(t, x)),
    bosses: BOSSES.map(b => Object.assign(makeEnemy(b.type, b.x), { meta: b, active: false, phaseT: 0, homeX: b.x, homeY: groundY(b.x) - (b.type === 'chaos' ? 240 : b.type === 'churn' ? 130 : 0) })),
    projectiles: [], pickups: [], particles: [], dmgNums: [],
    cam: 0, shake: 0, hitstop: 0,
    fired: {}, banner: null, bannerT: 0, lastChapter: -1,
    dialog: null, victoryShown: false, hint: '',
  };
  // scattered pickups
  [1500, 3400, 6900, 8600, 9600, 13900, 15300, 16500, 20900, 22300].forEach(x =>
    game.pickups.push({ type: 'coffee', x, y: groundY(x) - 18, vy: 0, bob: Math.random() * 6 }));
  [700, 1700, 2600, 3000, 4600, 5800, 7600, 9000, 13400, 14600, 16100, 20400, 21800].forEach(x =>
    game.pickups.push({ type: 'rune', x, y: groundY(x) - 20, vy: 0, bob: Math.random() * 6 }));
}
resetGame();

/* ---------- overlay helpers ---------- */
const $ = id => document.getElementById(id);
function showOverlay(id, on) { $(id).classList.toggle('show', on); }

function startDialog(id, onDone) {
  const lines = DIALOGS[id]; if (!lines) return;
  game.dialog = { lines, i: 0, chars: 0, onDone: onDone || null };
  game.state = 'dialog';
  $('dialogBox').classList.add('show');
  renderDialogLine();
}
function renderDialogLine() {
  const d = game.dialog, line = d.lines[d.i];
  $('dialogSpeaker').textContent = line.s;
  $('dialogText').textContent = line.t.slice(0, Math.floor(d.chars));
}
function advanceDialog() {
  const d = game.dialog; if (!d) return;
  const line = d.lines[d.i];
  if (d.chars < line.t.length) { d.chars = line.t.length; renderDialogLine(); return; }
  d.i++;
  if (d.i >= d.lines.length) {
    $('dialogBox').classList.remove('show');
    const done = d.onDone; game.dialog = null; game.state = 'play';
    if (done) done();
  } else { d.chars = 0; renderDialogLine(); }
}

function openSign(sign) {
  $('signTitle').textContent = sign.title;
  $('signBody').innerHTML = sign.body;
  showOverlay('signCard', true); game.state = 'sign'; SFX.open();
}
function closeSign() { showOverlay('signCard', false); game.state = 'play'; }

function openChat() {
  showOverlay('chatPanel', true); game.state = 'chat';
  $('chatAnswer').innerHTML = 'Ask me of my maker. I have <em>excellent</em> retention.';
}
function closeChat() { showOverlay('chatPanel', false); game.state = 'play'; }
CHAT_QA.forEach(({ q, a }) => {
  const b = document.createElement('button');
  b.textContent = q;
  b.onclick = () => { $('chatAnswer').innerHTML = a; SFX.pickup(); };
  $('chatQs').appendChild(b);
});

const DEATH_QUIPS = [
  'Like all good deadlines, you shall respawn.',
  'Even Kratos shipped a v2.',
  'The Hydra grows stronger. So do you.',
  'Churn claims another… temporarily.',
];
function die() {
  game.player.dead = true; game.state = 'dead'; SFX.die();
  $('deathQuip').textContent = DEATH_QUIPS[Math.floor(Math.random() * DEATH_QUIPS.length)];
  showOverlay('deathScreen', true);
}
function respawn() {
  showOverlay('deathScreen', false);
  const p = game.player;
  let cp = CHECKPOINTS[0];
  for (const c of CHECKPOINTS) if (c <= p.x) cp = c;
  p.x = cp; p.y = groundY(cp); p.vx = p.vy = 0; p.hp = p.maxHp; p.dead = false; p.invuln = 90;
  game.axe.state = 'held';
  game.projectiles = [];
  for (const b of game.bosses) if (b.active && !b.dead) {
    b.active = false; b.hp = b.maxHp; b.x = b.meta.x; b.y = groundY(b.meta.x); b.state = 'idle'; b.timer = 0;
    delete game.fired[b.meta.introId];
    game.enemies = game.enemies.filter(e => !e.add);
  }
  game.state = 'play';
}

/* ---------- input ---------- */
addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  audio();
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (game.state === 'title' && (k === 'enter' || k === ' ')) { startFromTitle(); return; }
  if (game.state === 'dialog' && (k === 'enter' || k === ' ' || k === 'j')) { advanceDialog(); return; }
  if (game.state === 'dead' && k === 'enter') { respawn(); return; }
  if (game.state === 'victory' && k === 'enter') { showOverlay('victoryScreen', false); game.state = 'play'; return; }
  if (game.state === 'sign' && (k === 'escape' || k === 'e' || k === 'enter')) { closeSign(); return; }
  if (game.state === 'chat' && (k === 'escape' || k === 'c')) { closeChat(); return; }
  if (game.state === 'play') {
    if (k === 'c') { openChat(); return; }
    if (k === 'e') tryInteract();
  }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function startFromTitle() { showOverlay('titleScreen', false); game.state = 'play'; SFX.open(); }

$('titleScreen').addEventListener('pointerdown', () => { if (game.state === 'title') startFromTitle(); });
$('deathScreen').addEventListener('pointerdown', () => { if (game.state === 'dead') respawn(); });
$('victoryScreen').addEventListener('pointerdown', e => {
  if (e.target.tagName === 'A') return;
  if (game.state === 'victory') { showOverlay('victoryScreen', false); game.state = 'play'; }
});
$('dialogBox').style.pointerEvents = 'none';
addEventListener('pointerdown', () => { audio(); if (game.state === 'dialog') advanceDialog(); });
$('signCard').addEventListener('pointerdown', e => { if (e.target.id === 'signCard') closeSign(); });

/* touch buttons */
function bindBtn(id, key) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); keys[key] = true; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointerup', e => { keys[key] = false; });
  el.addEventListener('pointercancel', () => { keys[key] = false; });
}
bindBtn('tLeft', 'a'); bindBtn('tRight', 'd'); bindBtn('tJump', 'w'); bindBtn('tAtk', 'j'); bindBtn('tAxe', 'k');
$('tAct').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (game.state === 'play') tryInteract(); else if (game.state === 'sign') closeSign(); });
$('tChat').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (game.state === 'play') openChat(); else if (game.state === 'chat') closeChat(); });

/* ---------- interactions ---------- */
function nearestInteractable() {
  const p = game.player;
  let best = null, bd = 90;
  for (const s of SIGNS) { const d = Math.abs(s.x - p.x); if (d < bd) { bd = d; best = { kind: 'sign', obj: s }; } }
  for (const g of GATES) { const d = Math.abs(g.x - p.x); if (d < bd) { bd = d; best = { kind: 'gate', obj: g }; } }
  return best;
}
function tryInteract() {
  const n = nearestInteractable(); if (!n) return;
  if (n.kind === 'sign') openSign(n.obj);
  else {
    SFX.open();
    if (n.obj.url.startsWith('mailto:')) location.href = n.obj.url;
    else window.open(n.obj.url, '_blank', 'noopener');
  }
}

/* ---------- combat helpers ---------- */
function spark(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * (spd || 3);
    game.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 20 + Math.random() * 16, color, r: 1.5 + Math.random() * 2 });
  }
}
function dmgNum(x, y, n, crit) {
  game.dmgNums.push({ x, y, n, life: 40, crit });
}
function hurtEnemy(e, dmg, kx) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 6;
  if (!ETYPES[e.type].boss) { e.vx += kx; }
  dmgNum(e.x, e.y - ETYPES[e.type].h - 14, dmg, dmg >= 20);
  spark(e.x, e.y - ETYPES[e.type].h / 2, '#ffd9a0', 8, 3.5);
  SFX.hit();
  game.hitstop = 3; game.shake = Math.min(10, game.shake + 3);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const t = ETYPES[e.type];
  spark(e.x, e.y - t.h / 2, '#f08a4a', 22, 5);
  game.shake = Math.min(14, game.shake + (t.boss ? 12 : 5));
  if (!t.boss) {
    if (Math.random() < 0.35) game.pickups.push({ type: 'coffee', x: e.x, y: e.y - 16, vy: -3, bob: 0 });
    game.pickups.push({ type: 'rune', x: e.x + 10, y: e.y - 16, vy: -4, bob: 0 });
  } else {
    for (let i = 0; i < 5; i++) game.pickups.push({ type: i % 2 ? 'coffee' : 'rune', x: e.x - 60 + i * 30, y: e.y - 40, vy: -4, bob: 0 });
    SFX.roar();
    const meta = e.meta;
    startDialog(meta.deadId, meta.final ? () => { game.state = 'victory'; showOverlay('victoryScreen', true); game.victoryShown = true; } : null);
  }
}
function hurtPlayer(dmg) {
  const p = game.player;
  if (p.invuln > 0 || p.dead) return;
  p.hp -= dmg; p.invuln = 50; SFX.hurt();
  game.shake = Math.min(14, game.shake + 6);
  spark(p.x, p.y - 40, '#e05050', 12, 4);
  if (p.hp <= 0) { p.hp = 0; die(); }
}

/* ---------- update ---------- */
function activeBoss() {
  const p = game.player;
  return game.bosses.find(b => b.active && !b.dead && p.x > b.meta.arena[0] - 200 && p.x < b.meta.arena[1] + 200) || null;
}

function update() {
  game.t++;
  if (game.hitstop > 0) { game.hitstop--; return; }
  if (game.state !== 'play') {
    // let particles settle even in overlays
    updateParticles();
    return;
  }
  const p = game.player;

  /* chapter banner */
  const ci = chapterIndexAt(p.x);
  if (ci !== game.lastChapter) {
    game.lastChapter = ci;
    game.banner = CHAPTERS[ci]; game.bannerT = 210;
  }
  if (game.bannerT > 0) game.bannerT--;

  /* triggers */
  for (const tr of TRIGGERS) {
    if (!game.fired[tr.id] && p.x > tr.x) { game.fired[tr.id] = true; startDialog(tr.id); return; }
  }
  /* boss activation */
  for (const b of game.bosses) {
    if (!b.dead && !b.active && p.x > b.meta.arena[0] + 40) {
      b.active = true;
      if (!game.fired[b.meta.introId]) { game.fired[b.meta.introId] = true; SFX.roar(); startDialog(b.meta.introId); return; }
    }
  }

  /* movement */
  const left = keys['a'] || keys['arrowleft'], right = keys['d'] || keys['arrowright'];
  const SPD = 5.2;
  if (p.atkT <= 0) {
    if (left) { p.vx = -SPD; p.dir = -1; }
    else if (right) { p.vx = SPD; p.dir = 1; }
    else p.vx *= 0.72;
  } else p.vx *= 0.85;

  if ((keys['w'] || keys[' '] || keys['arrowup']) && p.onGround) { p.vy = -15.5; p.onGround = false; }
  p.vy += 0.82;
  p.x += p.vx; p.y += p.vy;

  /* boss walls */
  const ab = activeBoss();
  if (ab) p.x = Math.max(ab.meta.arena[0] + 20, Math.min(ab.meta.arena[1] - 20, p.x));
  p.x = Math.max(50, Math.min(WORLD_END - 50, p.x));

  const g = groundY(p.x);
  if (p.y >= g) { p.y = g; p.vy = 0; p.onGround = true; } else p.onGround = false;

  if (p.invuln > 0) p.invuln--;
  if (p.comboReset > 0) { p.comboReset--; if (p.comboReset === 0) p.combo = 0; }

  /* melee attack */
  if (p.atkT > 0) {
    p.atkT--;
    if (p.atkT === 10) { // active frame
      const dmg = [12, 12, 22][p.combo], range = 86;
      let landed = false;
      for (const e of allFoes()) {
        if (e.dead) continue;
        const t = ETYPES[e.type];
        const dx = (e.x - p.x) * p.dir;
        if (dx > -t.w / 2 && dx < range + t.w / 2 && Math.abs((e.y - t.h / 2) - (p.y - 40)) < Math.max(100, t.h * 0.8)) {
          hurtEnemy(e, dmg, p.dir * (p.combo === 2 ? 7 : 3)); landed = true;
        }
      }
      if (landed) p.combo = (p.combo + 1) % 3; else p.combo = 0;
      p.comboReset = 40;
    }
  } else if (keys['j'] || keys['z']) {
    p.atkT = 16; SFX.swing(); keys['j'] = keys['z'] = false;
  }

  /* axe */
  const ax = game.axe;
  if ((keys['k'] || keys['x']) ) {
    keys['k'] = keys['x'] = false;
    if (ax.state === 'held') {
      ax.state = 'fly'; ax.x = p.x + p.dir * 20; ax.y = p.y - 46;
      ax.vx = p.dir * 17; ax.vy = -2.5; ax.dist = 0; ax.hitSet = new Set(); SFX.throwAxe();
    } else if (ax.state === 'fly' || ax.state === 'stuck') {
      ax.state = 'return'; ax.hitSet = new Set(); SFX.throwAxe();
    }
  }
  if (ax.state === 'fly') {
    ax.vy += 0.22; ax.x += ax.vx; ax.y += ax.vy; ax.rot += 0.45 * Math.sign(ax.vx || 1); ax.dist += Math.abs(ax.vx);
    axeHits(ax, 16);
    if (ax.y >= groundY(ax.x) - 4 || ax.dist > 920) { ax.state = 'stuck'; ax.y = Math.min(ax.y, groundY(ax.x) - 4); }
  } else if (ax.state === 'return') {
    const dx = (p.x) - ax.x, dy = (p.y - 46) - ax.y, d = Math.hypot(dx, dy) || 1;
    ax.x += dx / d * 21; ax.y += dy / d * 21; ax.rot -= 0.5;
    axeHits(ax, 16);
    if (d < 42) { ax.state = 'held'; SFX.catchAxe(); spark(p.x, p.y - 46, '#8ad4f0', 6, 2); }
  }

  /* enemies */
  for (const e of game.enemies) updateEnemy(e, p);
  for (const b of game.bosses) if (b.active && !b.dead) updateBoss(b, p);
  game.enemies = game.enemies.filter(e => !(e.dead && !ETYPES[e.type].boss));

  /* projectiles */
  for (const pr of game.projectiles) {
    pr.vy += 0.06; pr.x += pr.vx; pr.y += pr.vy; pr.life--;
    if (Math.hypot(pr.x - p.x, pr.y - (p.y - 40)) < 30) { hurtPlayer(9); pr.life = 0; spark(pr.x, pr.y, '#a0f0a0', 8, 3); }
    if (pr.y > groundY(pr.x)) { pr.life = 0; spark(pr.x, pr.y, '#a08af0', 6, 2); }
  }
  game.projectiles = game.projectiles.filter(pr => pr.life > 0);

  /* pickups */
  for (const pk of game.pickups) {
    if (pk.vy !== 0) { pk.vy += 0.4; pk.y += pk.vy; const gg = groundY(pk.x) - 16; if (pk.y > gg) { pk.y = gg; pk.vy = 0; } }
    pk.bob += 0.08;
    if (Math.abs(pk.x - p.x) < 34 && Math.abs(pk.y - (p.y - 30)) < 60) {
      pk.got = true; SFX.pickup();
      if (pk.type === 'coffee') { p.hp = Math.min(p.maxHp, p.hp + 22); dmgNum(p.x, p.y - 90, '+22', false); }
      else { p.runes++; spark(pk.x, pk.y, '#d8b46a', 6, 2); }
    }
  }
  game.pickups = game.pickups.filter(pk => !pk.got);

  updateParticles();

  /* hint text */
  const n = nearestInteractable();
  game.hint = n ? (n.kind === 'sign' ? 'E — read the runestone' : `E — open ${n.obj.label} · ${n.obj.sub}`) : '';

  /* camera */
  const target = Math.max(0, Math.min(WORLD_END - VW, p.x - VW * 0.38));
  game.cam += (target - game.cam) * 0.12;
  game.shake *= 0.88;
}

function allFoes() { return game.enemies.concat(game.bosses.filter(b => b.active && !b.dead)); }

function axeHits(ax, dmg) {
  for (const e of allFoes()) {
    if (e.dead || ax.hitSet.has(e)) continue;
    const t = ETYPES[e.type];
    if (Math.abs(e.x - ax.x) < t.w / 2 + 24 && Math.abs((e.y - t.h / 2) - ax.y) < t.h / 2 + 30) {
      ax.hitSet.add(e); hurtEnemy(e, dmg, Math.sign(ax.vx || 1) * 4);
    }
  }
}

function updateEnemy(e, p) {
  if (e.dead) return;
  const t = ETYPES[e.type];
  if (e.flash > 0) e.flash--;
  if (e.dmgCd > 0) e.dmgCd--;
  const dx = p.x - e.x, dist = Math.abs(dx);
  const aggro = dist < 540;
  e.dir = dx < 0 ? -1 : 1;

  if (t.fly) {
    const ty = (e.type === 'shade' ? p.y - 50 : groundY(e.x) - 70) + Math.sin(game.t * 0.05 + e.seed) * 14;
    if (aggro) { e.x += e.dir * (e.type === 'shade' ? 2.4 : 1.6); e.y += (ty - e.y) * 0.05; }
    else e.y = groundY(e.x) - 70 + Math.sin(game.t * 0.04 + e.seed) * 10;
  } else {
    if (e.type === 'imp') {
      if (e.state === 'windup') { e.timer--; if (e.timer <= 0) { e.state = 'lunge'; e.timer = 12; e.vx = e.dir * 8.5; } }
      else if (e.state === 'lunge') { e.timer--; if (e.timer <= 0) { e.state = 'idle'; e.vx = 0; } }
      else if (aggro) { if (dist < 120) { e.state = 'windup'; e.timer = 26; e.vx = 0; } else e.vx = e.dir * 2.2; }
      else e.vx *= 0.8;
    } else if (e.type === 'demon') {
      if (e.y >= groundY(e.x) - 1) {
        e.vx = 0;
        if (aggro && e.timer <= 0) { e.vy = -9.5; e.vx = e.dir * 4.2; e.timer = 55 + Math.random() * 30; }
        e.timer--;
      }
      e.vy += 0.7;
    }
    e.x += e.vx; e.y += e.vy;
    const g = groundY(e.x);
    if (e.y >= g) { e.y = g; e.vy = 0; }
    e.vx *= 0.94;
  }
  /* contact damage */
  if (e.dmgCd <= 0 && Math.abs(e.x - p.x) < t.w / 2 + 20 && Math.abs((e.y - t.h / 2) - (p.y - 40)) < t.h / 2 + 44) {
    hurtPlayer(t.dmg); e.dmgCd = 55;
  }
}

function updateBoss(b, p) {
  const t = ETYPES[b.type];
  if (b.flash > 0) b.flash--;
  if (b.dmgCd > 0) b.dmgCd--;
  b.phaseT++;

  if (b.type === 'hydra') {
    b.y = groundY(b.x);
    const rate = b.hp > 160 ? 150 : b.hp > 80 ? 110 : 80;
    if (b.state === 'idle' && b.phaseT > rate) {
      b.state = 'telegraph'; b.timer = 38; b.strikeHead = Math.floor(Math.random() * Math.max(1, Math.ceil(b.hp / b.maxHp * 3)));
      b.targetX = p.x; b.targetY = p.y - 30;
    } else if (b.state === 'telegraph') {
      b.timer--; b.targetX = p.x; b.targetY = p.y - 30;
      if (b.timer <= 0) { b.state = 'strike'; b.timer = 16; SFX.swing(); }
    } else if (b.state === 'strike') {
      b.timer--;
      if (b.timer === 8 && Math.hypot(p.x - b.targetX, (p.y - 30) - b.targetY) < 70) hurtPlayer(t.dmg);
      if (b.timer === 8) { spark(b.targetX, b.targetY, '#f08a4a', 14, 4); game.shake = Math.min(12, game.shake + 5); }
      if (b.timer <= 0) { b.state = 'idle'; b.phaseT = 0; }
    }
    if (b.phaseT % 420 === 419 && game.enemies.filter(e => e.add && !e.dead).length < 2) {
      game.enemies.push(Object.assign(makeEnemy('imp', b.x - 200 - Math.random() * 120), { add: true }));
    }
  }

  if (b.type === 'chaos') {
    const cx = b.homeX, baseY = groundY(cx) - 185;
    if (b.state === 'idle' || b.state === 'volley') {
      b.y = baseY + Math.sin(game.t * 0.03) * 36;
      b.x = cx + Math.sin(game.t * 0.017) * 180;
      const rate = b.hp > 130 ? 120 : 85;
      if (b.phaseT > rate) {
        b.phaseT = 0; b.volleys = (b.volleys || 0) + 1;
        if (b.volleys % 3 === 0) { b.state = 'slamdown'; b.timer = 30; }
        else {
          for (let i = 0; i < 5; i++) {
            const dx = p.x - b.x, dy = (p.y - 40) - b.y, d = Math.hypot(dx, dy) || 1, s = 6.2;
            game.projectiles.push({ x: b.x, y: b.y, vx: dx / d * s + (i - 2) * 0.9, vy: dy / d * s - 1.2, life: 240 });
          }
          SFX.throwAxe();
        }
      }
    } else if (b.state === 'slamdown') {
      b.timer--; b.y += (groundY(b.x) - 60 - b.y) * 0.2;
      if (b.timer <= 0) {
        b.state = 'grounded'; b.timer = 95; game.shake = Math.min(16, game.shake + 9); SFX.roar();
        if (p.onGround && Math.abs(p.x - b.x) < 190) hurtPlayer(16);
        spark(b.x, groundY(b.x), '#a08af0', 26, 6);
      }
    } else if (b.state === 'grounded') {
      b.timer--; b.y = groundY(b.x) - 60;
      if (b.timer <= 0) { b.state = 'idle'; b.phaseT = 0; }
    }
  }

  if (b.type === 'churn') {
    const cx = b.homeX;
    /* the pull */
    if (Math.abs(p.x - b.x) < 720 && b.state !== 'dash') p.vx += Math.sign(b.x - p.x) * 0.22;
    if (b.state === 'idle') {
      b.x += (cx - b.x) * 0.02;
      b.y = groundY(b.x) - 70 + Math.sin(game.t * 0.04) * 16;
      const rate = b.hp > 150 ? 170 : 120;
      if (b.phaseT > rate) { b.state = 'windup'; b.timer = 34; b.phaseT = 0; }
      if (game.t % 300 === 0 && game.enemies.filter(e => e.add && !e.dead).length < 2) {
        game.enemies.push(Object.assign(makeEnemy('shade', b.x - 150), { add: true }));
      }
    } else if (b.state === 'windup') {
      b.timer--; if (b.timer <= 0) { b.state = 'dash'; b.timer = 26; b.dashDir = Math.sign(p.x - b.x) || 1; SFX.roar(); }
    } else if (b.state === 'dash') {
      b.timer--; b.x += b.dashDir * 11; b.y = groundY(b.x) - 60;
      if (b.dmgCd <= 0 && Math.abs(b.x - p.x) < 90 && Math.abs((b.y) - (p.y - 40)) < 120) { hurtPlayer(t.dmg); b.dmgCd = 40; }
      b.x = Math.max(b.meta.arena[0] + 80, Math.min(b.meta.arena[1] - 80, b.x));
      if (b.timer <= 0) { b.state = 'idle'; b.phaseT = 0; }
    }
  }

  /* hydra contact */
  if (b.type === 'hydra' && b.dmgCd <= 0 && Math.abs(b.x - p.x) < 130 && p.y > b.y - 200) {
    hurtPlayer(8); b.dmgCd = 60;
  }
}

function updateParticles() {
  for (const pt of game.particles) { pt.vy += 0.12; pt.x += pt.vx; pt.y += pt.vy; pt.life--; }
  game.particles = game.particles.filter(pt => pt.life > 0);
  for (const d of game.dmgNums) { d.y -= 1.2; d.life--; }
  game.dmgNums = game.dmgNums.filter(d => d.life > 0);
  /* ambient embers */
  if (game.t % 6 === 0 && game.particles.length < 120) {
    const pal = palAt(game.player.x);
    game.particles.push({
      x: game.cam + Math.random() * VW, y: VH - Math.random() * 200, vx: (Math.random() - 0.3) * 0.6, vy: -0.5 - Math.random() * 0.8,
      life: 90 + Math.random() * 60, color: pal.ember, r: 1 + Math.random() * 1.6, ember: true,
    });
  }
}

/* ============================================================
   RENDER
   ============================================================ */
function draw() {
  const p = game.player, pal = palAt(p.x);
  const shx = (Math.random() - 0.5) * game.shake, shy = (Math.random() - 0.5) * game.shake;
  const cam = game.cam;

  /* sky */
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, pal.skyT); sky.addColorStop(1, pal.skyB);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);

  /* stars */
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 331 + 97) % 1400 - (cam * 0.06) % 1400 + 1400) % 1400 - 60;
    const sy = (i * 173) % 300 + 12;
    ctx.fillRect(sx, sy, 2, 2);
  }
  /* moon */
  ctx.fillStyle = 'rgba(232,224,208,0.75)';
  ctx.beginPath(); ctx.arc(VW - 180 - (cam * 0.02) % 40, 110, 42, 0, 7); ctx.fill();
  ctx.fillStyle = pal.skyT;
  ctx.beginPath(); ctx.arc(VW - 196 - (cam * 0.02) % 40, 102, 38, 0, 7); ctx.fill();

  ctx.save(); ctx.translate(shx, shy);

  /* parallax ridges */
  drawRidge(cam * 0.25, 0.004, 60, 380, pal.r1);
  drawRidge(cam * 0.5, 0.006, 46, 470, pal.r2);

  /* ground */
  ctx.save(); ctx.translate(-cam, 0);
  ctx.beginPath(); ctx.moveTo(cam - 20, VH + 20);
  for (let x = cam - 20; x <= cam + VW + 40; x += 16) ctx.lineTo(x, groundY(x));
  ctx.lineTo(cam + VW + 40, VH + 20); ctx.closePath();
  ctx.fillStyle = pal.gnd; ctx.fill();
  ctx.beginPath();
  for (let x = cam - 20; x <= cam + VW + 40; x += 16) { const y = groundY(x); x === cam - 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.strokeStyle = pal.top; ctx.lineWidth = 3; ctx.stroke();

  /* world props & entities (world space) */
  for (const s of SIGNS) if (s.x > cam - 100 && s.x < cam + VW + 100) drawSign(s);
  for (const gte of GATES) if (gte.x > cam - 160 && gte.x < cam + VW + 160) drawGate(gte);
  for (const pk of game.pickups) if (pk.x > cam - 60 && pk.x < cam + VW + 60) drawPickup(pk);
  for (const e of game.enemies) if (!e.dead && e.x > cam - 200 && e.x < cam + VW + 200) drawEnemy(e);
  for (const b of game.bosses) if (!b.dead && b.x > cam - 400 && b.x < cam + VW + 400) drawEnemy(b);
  for (const pr of game.projectiles) drawShard(pr);
  if (game.axe.state !== 'held') drawAxeFree(game.axe);
  drawPlayer(p);
  drawCompanion(p);
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.min(1, pt.life / 30);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const d of game.dmgNums) {
    ctx.globalAlpha = Math.min(1, d.life / 24);
    ctx.font = d.crit ? 'bold 26px Cinzel, serif' : 'bold 19px Cinzel, serif';
    ctx.fillStyle = d.crit ? '#f0c060' : '#e8e0d0';
    ctx.textAlign = 'center';
    ctx.fillText(d.n, d.x, d.y);
    ctx.globalAlpha = 1;
  }
  ctx.restore(); /* world space */
  ctx.restore(); /* shake */

  drawHUD(p, pal);
}

function drawRidge(off, freq, amp, base, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-10, VH + 10);
  for (let sx = -10; sx <= VW + 20; sx += 24) {
    const wx = sx + off;
    const y = base + Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.7 + 2) * amp * 0.4;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(VW + 20, VH + 10); ctx.closePath(); ctx.fill();
}

/* ---------- entity drawing (world space) ---------- */
function drawSign(s) {
  const g = groundY(s.x);
  ctx.save(); ctx.translate(s.x, g);
  ctx.fillStyle = '#1a2028';
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(-20, -86); ctx.quadraticCurveTo(0, -104, 20, -86); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(216,180,106,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  const glow = 0.55 + Math.sin(game.t * 0.06 + s.x) * 0.25;
  ctx.strokeStyle = `rgba(216,180,106,${glow})`;
  ctx.font = '26px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(216,180,106,${glow})`;
  ctx.fillText('ᛟ', 0, -44);
  if (Math.abs(game.player.x - s.x) < 90) promptE(0, -122);
  ctx.restore();
}
function drawGate(gt) {
  const g = groundY(gt.x);
  ctx.save(); ctx.translate(gt.x, g);
  ctx.fillStyle = '#141a22';
  ctx.fillRect(-34, -190, 20, 190); ctx.fillRect(14, -190, 20, 190);
  ctx.fillRect(-44, -206, 88, 20);
  const pulse = 0.5 + Math.sin(game.t * 0.07 + gt.x) * 0.3;
  ctx.fillStyle = gt.color; ctx.globalAlpha = 0.16 + pulse * 0.12;
  ctx.fillRect(-14, -186, 28, 186);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = gt.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + pulse * 0.4;
  ctx.strokeRect(-34, -190, 68, 190);
  ctx.globalAlpha = 1;
  ctx.font = '15px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillStyle = gt.color;
  ctx.fillText(gt.label, 0, -216);
  ctx.font = 'italic 13px "Crimson Pro", serif'; ctx.fillStyle = 'rgba(232,224,208,0.6)';
  ctx.fillText(gt.sub, 0, 18);
  if (Math.abs(game.player.x - gt.x) < 90) promptE(0, -238);
  ctx.restore();
}
function promptE(x, y) {
  const b = Math.sin(game.t * 0.12) * 4;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.85)'; ctx.strokeStyle = '#d8b46a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y + b, 13, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8b46a'; ctx.font = 'bold 14px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.fillText('E', x, y + b + 5);
  ctx.restore();
}
function drawPickup(pk) {
  const y = pk.y + Math.sin(pk.bob) * 4;
  ctx.save(); ctx.translate(pk.x, y);
  if (pk.type === 'coffee') {
    ctx.fillStyle = '#3a2318'; ctx.fillRect(-8, -8, 16, 14);
    ctx.strokeStyle = '#d8b46a'; ctx.lineWidth = 2; ctx.strokeRect(-8, -8, 16, 14);
    ctx.strokeStyle = 'rgba(232,224,208,0.6)';
    ctx.beginPath(); ctx.moveTo(-3, -12); ctx.quadraticCurveTo(0, -18, 3, -12); ctx.stroke();
  } else {
    const glow = 0.6 + Math.sin(game.t * 0.1 + pk.x) * 0.3;
    ctx.fillStyle = `rgba(216,180,106,${glow})`;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 12); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0e14'; ctx.font = 'bold 10px serif'; ctx.textAlign = 'center'; ctx.fillText('ᚱ', 0, 4);
  }
  ctx.restore();
}
function drawShard(pr) {
  ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx));
  ctx.fillStyle = '#a08af0';
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -6); ctx.lineTo(-4, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawAxe(flip) {
  /* drawn at hand origin, blade up-right */
  ctx.save(); if (flip) ctx.scale(-1, 1);
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(14, -26); ctx.stroke();
  ctx.fillStyle = '#b8c4cc';
  ctx.beginPath();
  ctx.moveTo(8, -30); ctx.quadraticCurveTo(30, -34, 30, -12);
  ctx.quadraticCurveTo(20, -20, 10, -18); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -30); ctx.quadraticCurveTo(-8, -40, -14, -26);
  ctx.quadraticCurveTo(-2, -28, 6, -22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, -12); ctx.quadraticCurveTo(30, -34, 8, -30); ctx.stroke();
  ctx.restore();
}
function drawAxeFree(ax) {
  ctx.save(); ctx.translate(ax.x, ax.y); ctx.rotate(ax.rot);
  ctx.shadowColor = 'rgba(120,200,255,0.8)'; ctx.shadowBlur = 12;
  drawAxe(false);
  ctx.restore();
}

function drawPlayer(p) {
  const t = game.t;
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(t / 4) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.scale(p.dir, 1);

  const moving = Math.abs(p.vx) > 0.8, run = Math.sin(t * 0.32);
  const legA = moving ? run * 0.7 : 0.12, breathe = Math.sin(t * 0.05) * 1.2;

  /* cape */
  ctx.fillStyle = '#5a1616';
  ctx.beginPath();
  ctx.moveTo(-6, -56);
  ctx.quadraticCurveTo(-26 - (moving ? 8 : 2), -36 + Math.sin(t * 0.2) * 3, -18 - (moving ? 10 : 3), -6);
  ctx.lineTo(-6, -30); ctx.closePath(); ctx.fill();

  /* legs */
  ctx.strokeStyle = '#2a2e36'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(Math.sin(legA) * 14, -14 + Math.abs(Math.cos(legA)) * 2); ctx.lineTo(Math.sin(legA) * 17, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-Math.sin(legA) * 14, -14); ctx.lineTo(-Math.sin(legA) * 17, 0); ctx.stroke();

  /* torso */
  ctx.fillStyle = '#3a4048';
  ctx.beginPath();
  ctx.moveTo(-9, -30); ctx.lineTo(-11, -56 + breathe); ctx.lineTo(11, -58 + breathe); ctx.lineTo(9, -30); ctx.closePath(); ctx.fill();
  /* red sash */
  ctx.strokeStyle = '#c03a2a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-9, -34); ctx.lineTo(10, -52 + breathe); ctx.stroke();
  /* shoulder */
  ctx.fillStyle = '#d8b46a';
  ctx.beginPath(); ctx.arc(-8, -55 + breathe, 7, 0, 7); ctx.fill();

  /* head */
  ctx.fillStyle = '#c8a080';
  ctx.beginPath(); ctx.arc(2, -66 + breathe, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a2e36'; /* beard */
  ctx.beginPath(); ctx.arc(3, -62 + breathe, 7, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = '#c03a2a'; ctx.lineWidth = 3; /* warpaint */
  ctx.beginPath(); ctx.moveTo(-2, -74 + breathe); ctx.lineTo(1, -60 + breathe); ctx.stroke();

  /* arms + axe */
  const attacking = p.atkT > 0;
  ctx.strokeStyle = '#3a4048'; ctx.lineWidth = 7;
  /* back arm */
  ctx.beginPath(); ctx.moveTo(-4, -52 + breathe); ctx.lineTo(-12 + (moving ? run * 6 : 0), -38); ctx.stroke();
  /* front arm holds axe */
  let hx = 14, hy = -44 + breathe;
  if (attacking) {
    const sw = 1 - p.atkT / 16; /* 0 → 1 */
    const ang = -1.7 + sw * 2.6;
    hx = Math.cos(ang) * 26; hy = -50 + Math.sin(ang) * 26;
    /* slash arc */
    ctx.save();
    ctx.strokeStyle = `rgba(232,224,208,${0.7 - sw * 0.6})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(4, -46, 58, -1.9 + sw * 1.4, -0.9 + sw * 2.2); ctx.stroke();
    ctx.strokeStyle = `rgba(226,96,58,${0.5 - sw * 0.4})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(4, -46, 50, -1.7 + sw * 1.4, -1.0 + sw * 2.2); ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(6, -52 + breathe); ctx.lineTo(hx, hy); ctx.stroke();
  if (game.axe.state === 'held') {
    ctx.save(); ctx.translate(hx, hy);
    if (attacking) ctx.rotate((1 - p.atkT / 16) * 2.4 - 1.2);
    drawAxe(false); ctx.restore();
  }
  ctx.restore();
}

function drawCompanion(p) {
  const t = game.t;
  const bx = p.x - p.dir * 52, by = p.y - 96 + Math.sin(t * 0.06) * 7;
  ctx.save(); ctx.translate(bx, by);
  ctx.shadowColor = '#7de0a0'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#0e2418';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = '#7de0a0'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7de0a0';
  ctx.fillRect(-4, -3, 3, 4); ctx.fillRect(2, -3, 3, 4);
  ctx.strokeStyle = '#7de0a0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -17); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -19, 2, 0, 7); ctx.stroke();
  /* speech tail hint */
  ctx.globalAlpha = 0.5 + Math.sin(t * 0.1) * 0.2;
  ctx.font = '10px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7de0a0';
  ctx.fillText('C', 0, -28);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEnemy(e) {
  const t = ETYPES[e.type], gt = game.t;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.flash > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; }

  if (e.type === 'wisp') {
    const a = 0.6 + Math.sin(gt * 0.1 + e.seed) * 0.25;
    ctx.fillStyle = `rgba(125,224,208,${a})`;
    ctx.beginPath(); ctx.arc(0, -14, 12, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(125,224,208,${a * 0.4})`;
    ctx.beginPath(); ctx.arc(-8 * e.dir, -8, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(-5, -18, 3, 5); ctx.fillRect(2, -18, 3, 5);
  } else if (e.type === 'imp') {
    ctx.fillStyle = e.state === 'windup' ? '#8a5030' : '#c8b090';
    ctx.fillRect(-18, -38, 36, 26);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.strokeRect(-18, -38, 36, 26);
    ctx.beginPath(); ctx.moveTo(-18, -38); ctx.lineTo(0, -24); ctx.lineTo(18, -38); ctx.stroke();
    ctx.fillStyle = '#c03a2a';
    ctx.fillRect(-10, -34, 5, 5); ctx.fillRect(5, -34, 5, 5);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const walk = Math.sin(gt * 0.3 + e.seed) * 6;
    ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-8 + walk, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(8 - walk, 0); ctx.stroke();
  } else if (e.type === 'demon') {
    ctx.fillStyle = '#3a2c66';
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(20, -30); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.lineTo(-20, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a08af0'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18, -40 + i * 10); ctx.lineTo(18, -40 + i * 10); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-6, -48); ctx.lineTo(-6, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -48); ctx.lineTo(6, -2); ctx.stroke();
    ctx.fillStyle = '#f06060';
    ctx.beginPath(); ctx.arc(0, -36, 5, 0, 7); ctx.fill();
  } else if (e.type === 'shade') {
    const a = 0.45 + Math.sin(gt * 0.08 + e.seed) * 0.2;
    ctx.fillStyle = `rgba(200,210,230,${a})`;
    ctx.beginPath();
    ctx.arc(0, -40, 16, Math.PI, 0);
    ctx.lineTo(16, -8);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(12 - i * 8, -2 + Math.sin(gt * 0.2 + i) * 3, 8 - i * 8, -8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0e14';
    ctx.beginPath(); ctx.arc(-5, -42, 3, 0, 7); ctx.arc(6, -42, 3, 0, 7); ctx.fill();
  } else if (e.type === 'hydra') {
    drawHydra(e);
  } else if (e.type === 'chaos') {
    drawChaos(e);
  } else if (e.type === 'churn') {
    drawChurn(e);
  }
  ctx.restore();

  /* small hp bar for non-bosses */
  if (!t.boss && e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - 20, e.y - t.h - 14, 40, 5);
    ctx.fillStyle = '#e05050';
    ctx.fillRect(e.x - 20, e.y - t.h - 14, 40 * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawHydra(e) {
  const gt = game.t;
  const heads = Math.max(1, Math.ceil(e.hp / e.maxHp * 3));
  /* mound */
  ctx.fillStyle = '#3a1c14';
  ctx.beginPath(); ctx.ellipse(0, -30, 130, 70, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#6b3a22'; ctx.lineWidth = 3; ctx.stroke();
  /* paper scraps texture */
  ctx.fillStyle = 'rgba(232,224,208,0.14)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-100 + i * 34, -60 + (i % 3) * 14, 16, 10);
  for (let h = 0; h < 3; h++) {
    const alive = h < heads;
    const baseX = -70 + h * 70;
    let hx = baseX + Math.sin(gt * 0.03 + h * 2) * 24, hy = -170 - Math.sin(gt * 0.04 + h) * 16;
    if (alive && e.state !== 'idle' && e.strikeHead === h) {
      const tx = e.targetX - e.x, ty = e.targetY - e.y;
      if (e.state === 'telegraph') { hx += (tx - hx) * 0.12; hy += (ty - 60 - hy) * 0.12; }
      else { const s = 1 - e.timer / 16; hx = hx + (tx - hx) * s; hy = hy + (ty - hy) * s; }
    }
    if (!alive) { hy = -60; hx = baseX; }
    /* neck */
    ctx.strokeStyle = alive ? '#4a2418' : '#241410'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(baseX * 0.5, -50);
    ctx.quadraticCurveTo(baseX, hy * 0.5, hx, hy); ctx.stroke();
    /* head */
    ctx.save(); ctx.translate(hx, hy);
    ctx.fillStyle = alive ? '#5a2c1a' : '#241410';
    ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(20, -4); ctx.lineTo(24, 6); ctx.lineTo(-12, 14); ctx.closePath(); ctx.fill();
    if (alive) {
      ctx.fillStyle = (e.state === 'telegraph' && e.strikeHead === h) ? '#ffd040' : '#f06040';
      ctx.beginPath(); ctx.arc(-2, -2, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}
function drawChaos(e) {
  const gt = game.t;
  ctx.save();
  ctx.rotate(Math.sin(gt * 0.02) * 0.08 + (e.state === 'grounded' ? 0.3 : 0));
  const CW = 34, CH = 26;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const flick = Math.sin(gt * 0.2 + r * 3 + c * 7) > 0.6;
    ctx.fillStyle = flick ? (Math.random() < 0.5 ? 'rgba(240,96,96,0.85)' : 'rgba(125,224,160,0.85)') : 'rgba(30,24,60,0.9)';
    ctx.fillRect(-CW * 2 + c * CW, -CH * 1.5 + r * CH - 40, CW - 3, CH - 3);
  }
  ctx.strokeStyle = '#c8bce8'; ctx.lineWidth = 2;
  ctx.strokeRect(-CW * 2 - 3, -CH * 1.5 - 43, CW * 4 + 3, CH * 3 + 3);
  /* the eye */
  ctx.fillStyle = '#0a0e14'; ctx.beginPath(); ctx.arc(0, -40, 16, 0, 7); ctx.fill();
  ctx.strokeStyle = '#f06060'; ctx.stroke();
  ctx.fillStyle = '#f06060'; ctx.beginPath(); ctx.arc(Math.sin(gt * 0.05) * 5, -40, 6, 0, 7); ctx.fill();
  /* err label */
  ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#f06060'; ctx.textAlign = 'center';
  ctx.fillText('#REF!', -40, -78); ctx.fillText('#N/A', 44, -6);
  ctx.restore();
}
function drawChurn(e) {
  const gt = game.t;
  ctx.save();
  const R = 85;
  ctx.fillStyle = e.state === 'windup' ? 'rgba(90,30,60,0.8)' : 'rgba(30,20,45,0.8)';
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.25) {
    const r = R + Math.sin(a * 5 + gt * 0.08) * 10;
    const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.9 - 40;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,120,200,0.5)'; ctx.lineWidth = 3; ctx.stroke();
  /* eyes */
  ctx.fillStyle = '#c8b0f0';
  ctx.beginPath(); ctx.arc(-26, -66, 9, 0, 7); ctx.arc(26, -66, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#0a0e14';
  ctx.beginPath(); ctx.arc(-26 + Math.sign(game.player.x - e.x) * 3, -66, 4, 0, 7); ctx.arc(26 + Math.sign(game.player.x - e.x) * 3, -66, 4, 0, 7); ctx.fill();
  /* maw */
  ctx.fillStyle = '#0a0e14';
  ctx.beginPath(); ctx.ellipse(0, -22, 30, 16 + Math.sin(gt * 0.1) * 6, 0, 0, 7); ctx.fill();
  /* swirl of lost members */
  ctx.font = '13px serif'; ctx.fillStyle = 'rgba(200,200,220,0.5)';
  for (let i = 0; i < 3; i++) {
    const a = gt * 0.03 + i * 2.1;
    ctx.fillText('🏋', Math.cos(a) * 120, Math.sin(a) * 60 - 40);
  }
  ctx.restore();
}

/* ---------- HUD ---------- */
function drawHUD(p, pal) {
  /* progress line */
  ctx.fillStyle = 'rgba(232,224,208,0.15)'; ctx.fillRect(0, 0, VW, 3);
  ctx.fillStyle = '#d8b46a'; ctx.fillRect(0, 0, VW * (p.x / WORLD_END), 3);
  for (const c of CHAPTERS) { ctx.fillStyle = 'rgba(232,224,208,0.5)'; ctx.fillRect(VW * (c.x0 / WORLD_END), 0, 2, 6); }

  /* name + hp */
  ctx.font = '13px Cinzel, serif'; ctx.textAlign = 'left';
  ctx.fillStyle = '#d8b46a';
  ctx.fillText('TAHA · GOD OF AUTOMATION', 24, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(24, 38, 264, 14);
  const hpw = 260 * Math.max(0, p.hp / p.maxHp);
  const hpg = ctx.createLinearGradient(26, 0, 286, 0);
  hpg.addColorStop(0, '#c03a2a'); hpg.addColorStop(1, '#e2603a');
  ctx.fillStyle = hpg; ctx.fillRect(26, 40, hpw, 10);
  ctx.strokeStyle = 'rgba(216,180,106,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(24.5, 38.5, 263, 13);

  /* runes + axe state */
  ctx.font = '15px Cinzel, serif'; ctx.fillStyle = '#d8b46a';
  ctx.fillText(`ᚱ ${p.runes}`, 24, 74);
  ctx.fillStyle = game.axe.state === 'held' ? 'rgba(138,212,240,0.9)' : 'rgba(138,212,240,0.35)';
  ctx.fillText(game.axe.state === 'held' ? '🪓 AXE READY' : '🪓 K TO RECALL', 90, 74);

  /* chapter banner */
  if (game.bannerT > 0 && game.banner) {
    const a = Math.min(1, Math.min(game.bannerT / 40, (210 - game.bannerT) / 40));
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = '16px Cinzel, serif'; ctx.fillStyle = '#d8b46a';
    ctx.fillText(game.banner.name, VW / 2, 150);
    ctx.font = 'bold 40px Cinzel, serif'; ctx.fillStyle = '#e8e0d0';
    ctx.fillText(game.banner.title, VW / 2, 196);
    ctx.font = 'italic 18px "Crimson Pro", serif'; ctx.fillStyle = 'rgba(232,224,208,0.75)';
    ctx.fillText(game.banner.sub, VW / 2, 226);
    ctx.globalAlpha = 1;
  }

  /* boss bar */
  const ab = activeBoss();
  if (ab && game.state === 'play') {
    const bw = 560, bx = (VW - bw) / 2, by = VH - 64;
    ctx.textAlign = 'center';
    ctx.font = '15px Cinzel, serif'; ctx.fillStyle = '#e8e0d0';
    ctx.fillText(ETYPES[ab.type].name, VW / 2, by - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = '#8a2be2';
    if (ab.type === 'hydra') ctx.fillStyle = '#e2603a';
    if (ab.type === 'churn') ctx.fillStyle = '#7de0a0';
    ctx.fillRect(bx + 2, by + 2, (bw - 4) * Math.max(0, ab.hp / ab.maxHp), 8);
    ctx.strokeStyle = 'rgba(216,180,106,0.6)'; ctx.strokeRect(bx + .5, by + .5, bw, 12);
  }

  /* hint */
  if (game.hint && game.state === 'play') {
    ctx.textAlign = 'center';
    ctx.font = '16px Cinzel, serif'; ctx.fillStyle = 'rgba(216,180,106,0.9)';
    ctx.fillText(game.hint, VW / 2, VH - 24);
  }
}

/* ---------- main loop ---------- */
let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(64, ts - last); last = ts; acc += dt;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 4) { update(); acc -= 1000 / 60; steps++; }
  draw();
}
requestAnimationFrame(loop);
