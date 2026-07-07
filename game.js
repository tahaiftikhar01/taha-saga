/* ============================================================
   THE AUTOMATION SAGA — a free-roaming 3D portfolio world
   Taha Iftikhar · mincac.com · built with Claude Code
   Bruno-Simon-style explorable realm, God-of-War soul.
   Coordinates: y up · road runs along +x · z is side-to-side.
   ============================================================ */
'use strict';

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
  knock: () => tone(180, 90, 0.12, 'square', 0.1),
};

/* ---------- world ---------- */
const WORLD_END = 26000;
const Z_LIMIT = 460;
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

/* flat zones along the road (arenas, gates, spawn) */
const FLATS = [[0, 760], [10300, 11960], [17100, 18960], [22700, 24500], [24500, 26000]];
function roadElev(x) {
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
  return 40 + hills * f;
}
/* full terrain height */
function gH(x, z) {
  let h = roadElev(x);
  const az = Math.abs(z);
  if (az > 150) {
    h += Math.sin(x * 0.0013 + z * 0.011) * 14 * Math.min(1, (az - 150) / 200);
  }
  if (az > 550) {
    const d = az - 550;
    h += d * 0.55 * (0.7 + 0.3 * Math.sin(x * 0.0011 + az * 0.003));
  }
  return h;
}

/* ---------- palettes (numeric) ---------- */
const CHN = CHAPTERS.map(c => { const o = {}; for (const k in c.pal) o[k] = new THREE.Color(c.pal[k]); return o; });
const _pal = {}; for (const k in CHAPTERS[0].pal) _pal[k] = new THREE.Color();
function palNAt(x) {
  const i = chapterIndexAt(x); const cur = CHN[i];
  let t = 0, nxt = cur;
  if (i + 1 < CHN.length) { const nx = CHAPTERS[i + 1].x0, T = 600; if (x > nx - T) { t = (x - (nx - T)) / T; nxt = CHN[i + 1]; } }
  for (const k in cur) _pal[k].copy(cur[k]).lerp(nxt[k], t);
  return _pal;
}

/* ---------- content ---------- */
const SIGNS = [
  { x: 950,  z: -130, title: 'The Scholar of Lahore', body: `<p>Born of Lahore, trained in the old disciplines: <em>Python, SQL, statistics</em>. While others memorized answers, he automated the questions.</p><p><em>"Every saga begins with a spreadsheet nobody else wanted to open."</em></p>` },
  { x: 1950, z: 130, title: 'The Old Ways', body: `<p>Data analysis. Dashboards. <em>BigQuery</em> depths and Google Sheets sorcery. The foundation-stone beneath every automation to come.</p>` },
  { x: 4400, z: -130, title: 'The Restlessness', body: `<p>A warrior grows weary of doing the same task twice.</p><p>In that weariness, an agency was conceived.</p>` },
  { x: 6100, z: 130, title: 'The Forging of MinCac', body: `<p><em>mincac.com</em> — a one-person automation agency. Clay for enrichment. n8n for the plumbing. Claude for the thinking.</p><p>Clients pay for outcomes. The machines work the night shift.</p>` },
  { x: 7300, z: -130, title: 'The 14-Hour Curse', body: `<p>A client copied LinkedIn leads into HubSpot by hand — <em>14 hours, every week</em>.</p><p>Taha forged a pipeline: HeyReach → Clay → n8n → HubSpot. The curse lifted. The hours returned to their people.</p>` },
  { x: 8500, z: 130, title: 'The Arsenal', body: `<p>Clay. n8n. HeyReach. HubSpot. Claude Code. Python.</p><p>Each rune mastered not for the trophy — for the kill.</p>` },
  { x: 13100, z: -130, title: 'The Merchant Shane', body: `<p>From the battlefields of Upwork came Shane, an e-commerce merchant drowning in exports.</p><p>Taha built him a <em>Shopify profitability dashboard</em> — ad spend, COGS, fees, true margin. Live. Automated.</p>` },
  { x: 12800, z: 150, title: 'The Broken-Export Alley', body: `<p>Ten corrupted CSV crates stand in formation.</p><p>Hurl the Automation Axe. Reconcile them. <em>Each crate felled earns a rune.</em></p>` },
  { x: 14300, z: 130, title: 'The $549 Tribute', body: `<p>Merchants once paid tools like Triple Whale <em>$549 a month</em> for profit truth.</p><p>Taha's tracker tells the same truth — now being forged into a product of its own.</p>` },
  { x: 15500, z: -130, title: 'The Deep Data', body: `<p>BigQuery audits. Funnel metrics. Growth analytics.</p><p>The numbers were always there. Someone just had to make them confess.</p>` },
  { x: 20100, z: 130, title: 'The Ghosting Plague', body: `<p>Gym members vanish in silence — signed in January, gone by March. No farewell. Only churn.</p>` },
  { x: 21100, z: -130, title: 'The Retention Agent', body: `<p><em>GymCRM</em>: a WhatsApp agent that notices the missing before they are lost — and speaks to them in their own tongue.</p><p>Built for the gyms of Pakistan. It floats beside you now.</p>` },
  { x: 24650, z: -130, title: 'The Next Quest', body: `<p>The saga seeks its next arc: <em>GTM engineering, growth analytics, AI automation</em> — remote, or in far kingdoms.</p><p>The gates ahead hold the summons. Choose one.</p>` },
];
const GATES = [
  { x: 25050, z: -180, label: 'LINKEDIN',  sub: 'the hall of records', url: 'https://www.linkedin.com/in/tahaiftikhar/', color: '#6ab8e8' },
  { x: 25350, z: -60,  label: 'GITHUB',    sub: 'the forge itself',    url: 'https://github.com/tahaiftikhar01',          color: '#c9a0f0' },
  { x: 25350, z: 60,   label: 'MINCAC.COM',sub: 'the agency banner',   url: 'https://mincac.com',                          color: '#f08a4a' },
  { x: 25050, z: 180,  label: 'THE RAVEN', sub: 'send word by email',  url: 'mailto:tahaiftikhar1991@gmail.com',           color: '#7de0a0' },
];

const D = (s, t) => ({ s, t });
const DIALOGS = {
  intro: [
    D('BOTREUS', 'Wake, warrior. The recruiters of Midgard are watching.'),
    D('TAHA', 'Then let them watch. I have pipelines to build.'),
    D('BOTREUS', 'The road runs east. Your legend begins in Lahore — with SQL, and stubbornness. Roam where you will; the saga waits along the way.'),
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
    D('BOTREUS', 'The Spreadsheet Wars. A merchant named Shane sought profit-truth in a storm of broken CSVs. And to your right — a little alley of crates, if you fancy some target practice.'),
  ],
  chaosIntro: [
    D('SPREADSHEET CHAOS', '#REF! #DIV/0! I AM EVERY BROKEN EXPORT YOU EVER FEARED.'),
    D('TAHA', 'I have reconciled worse before breakfast.'),
    D('BOTREUS', 'Circle it and hurl the axe — or wait for it to slam. Broken spreadsheets always crash eventually.'),
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
  { q: 'How do I hire him?', a: `The wise choice. <a href="https://www.linkedin.com/in/tahaiftikhar/" target="_blank" rel="noopener">LinkedIn</a> · <a href="https://github.com/tahaiftikhar01" target="_blank" rel="noopener">GitHub</a> · <a href="mailto:tahaiftikhar1991@gmail.com">tahaiftikhar1991@gmail.com</a> — or walk to the gates at the end of the saga.` },
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
  ['wisp', 2450, 60], ['wisp', 2850, -120], ['wisp', 3250, 140], ['wisp', 3650, -60], ['wisp', 3950, 0],
  ['imp', 6650, -80], ['imp', 7050, 120], ['imp', 7850, -140], ['imp', 8250, 40], ['imp', 8850, -40], ['imp', 9250, 150], ['imp', 9850, -110],
  ['demon', 13650, 80], ['demon', 14050, -130], ['demon', 14750, 30], ['demon', 15150, -70], ['demon', 15850, 140], ['demon', 16350, -40], ['demon', 16750, 90],
  ['shade', 20650, -90], ['shade', 21050, 110], ['shade', 21650, -140], ['shade', 22050, 50], ['shade', 22450, -30],
];
const BOSSES = [
  { type: 'hydra', x: 11300, arena: [10360, 11900], introId: 'hydraIntro', deadId: 'hydraDead' },
  { type: 'chaos', x: 18100, arena: [17160, 18900], introId: 'chaosIntro', deadId: 'chaosDead' },
  { type: 'churn', x: 23700, arena: [22760, 24440], introId: 'churnIntro', deadId: 'churnDead', final: true },
];
const CHECKPOINTS = [140, 5450, 12450, 19450];

/* ---------- bowling pins (CSV crates) ---------- */
const PIN_HOME = [];
{
  const bx = 12980, bz = 230;
  for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) {
    PIN_HOME.push({ x: bx + r * 34, z: bz + (c - r / 2) * 36 });
  }
}

/* ---------- state ---------- */
const keys = {};
let game;

function makeEnemy(type, x, z, extra) {
  const t = ETYPES[type];
  return Object.assign({
    type, x, z: z || 0, y: gH(x, z || 0), vx: 0, vz: 0, vy: 0, hp: t.hp, maxHp: t.hp,
    fx: -1, fz: 0, state: 'idle', timer: 0, flash: 0, dead: false, dmgCd: 0, seed: Math.random() * 9,
  }, extra || {});
}

function resetGame() {
  game = {
    state: 'title', t: 0,
    player: {
      x: 140, z: 0, y: gH(140, 0), vx: 0, vz: 0, vy: 0, fx: 1, fz: 0, hp: 100, maxHp: 100,
      onGround: true, atkT: 0, combo: 0, comboReset: 0, invuln: 0, runes: 0, dead: false,
    },
    axe: { state: 'held', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, dist: 0, hitSet: new Set() },
    enemies: SPAWNS.map(([t, x, z]) => makeEnemy(t, x, z)),
    bosses: BOSSES.map(b => Object.assign(makeEnemy(b.type, b.x, 0), { meta: b, active: false, phaseT: 0, homeX: b.x, homeZ: 0 })),
    projectiles: [], pickups: [], particles: [], dmgNums: [],
    pins: PIN_HOME.map(p => ({ x: p.x, z: p.z, hx: p.x, hz: p.z, up: true, vx: 0, vz: 0, tip: 0, scored: false })),
    pinResetT: 0,
    shake: 0, hitstop: 0,
    fired: {}, banner: null, bannerT: 0, lastChapter: -1,
    dialog: null, victoryShown: false, hint: '',
  };
  [1500, 3400, 6900, 8600, 9600, 13900, 15300, 16500, 20900, 22300].forEach((x, i) => {
    const z = (i % 3 - 1) * 110;
    game.pickups.push({ type: 'coffee', x, z, y: gH(x, z) + 18, vy: 0, bob: Math.random() * 6 });
  });
  [700, 1700, 2600, 3000, 4600, 5800, 7600, 9000, 13400, 14600, 16100, 20400, 21800].forEach((x, i) => {
    const z = ((i * 7) % 5 - 2) * 70;
    game.pickups.push({ type: 'rune', x, z, y: gH(x, z) + 20, vy: 0, bob: Math.random() * 6 });
  });
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
  p.x = cp; p.z = 0; p.y = gH(cp, 0); p.vx = p.vz = p.vy = 0; p.hp = p.maxHp; p.dead = false; p.invuln = 90;
  game.axe.state = 'held';
  game.projectiles = [];
  for (const b of game.bosses) if (b.active && !b.dead) {
    b.active = false; b.hp = b.maxHp; b.x = b.meta.x; b.z = 0; b.y = gH(b.meta.x, 0); b.state = 'idle'; b.timer = 0;
    delete game.fired[b.meta.introId];
    game.enemies = game.enemies.filter(e => { if (e.add) { disposeEntity(e); return false; } return true; });
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
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); keys[key] = true; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointerup', e => { keys[key] = false; });
  el.addEventListener('pointercancel', () => { keys[key] = false; });
}
bindBtn('tLeft', 'a'); bindBtn('tRight', 'd'); bindBtn('tUp', 'w'); bindBtn('tDown', 's');
bindBtn('tJump', ' '); bindBtn('tAtk', 'j'); bindBtn('tAxe', 'k');
$('tAct').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (game.state === 'play') tryInteract(); else if (game.state === 'sign') closeSign(); });
$('tChat').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (game.state === 'play') openChat(); else if (game.state === 'chat') closeChat(); });
if ('ontouchstart' in window) document.body.classList.add('touch');

/* ---------- interactions ---------- */
function nearestInteractable() {
  const p = game.player;
  let best = null, bd = 110;
  for (const s of SIGNS) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = { kind: 'sign', obj: s }; } }
  for (const g of GATES) { const d = Math.hypot(g.x - p.x, g.z - p.z); if (d < bd) { bd = d; best = { kind: 'gate', obj: g }; } }
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
const _sc = new THREE.Color();
function spark(x, y, z, color, n, spd) {
  _sc.set(color);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * (spd || 3);
    game.particles.push({
      x, y, z,
      vx: Math.cos(a) * v, vy: Math.abs(Math.sin(a)) * v * 0.7 + 1, vz: Math.sin(b) * v,
      life: 20 + Math.random() * 16, r: _sc.r, g: _sc.g, b: _sc.b,
    });
  }
}
function dmgNum(x, y, z, n, crit) {
  const el = document.createElement('div');
  el.className = 'dmg' + (crit ? ' crit' : '');
  el.textContent = n;
  $('fx').appendChild(el);
  game.dmgNums.push({ x, y, z, n, life: 40, crit, el });
}
function hurtEnemy(e, dmg, kx, kz) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 6;
  if (!ETYPES[e.type].boss) { e.vx += kx || 0; e.vz += kz || 0; }
  dmgNum(e.x, e.y + ETYPES[e.type].h + 14, e.z, dmg, dmg >= 20);
  spark(e.x, e.y + ETYPES[e.type].h / 2, e.z, '#ffd9a0', 8, 3.5);
  SFX.hit();
  game.hitstop = 3; game.shake = Math.min(10, game.shake + 3);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const t = ETYPES[e.type];
  spark(e.x, e.y + t.h / 2, e.z, '#f08a4a', 22, 5);
  game.shake = Math.min(14, game.shake + (t.boss ? 12 : 5));
  if (!t.boss) {
    if (Math.random() < 0.35) game.pickups.push({ type: 'coffee', x: e.x, z: e.z, y: e.y + 16, vy: 3, bob: 0 });
    game.pickups.push({ type: 'rune', x: e.x + 10, z: e.z + 8, y: e.y + 16, vy: 4, bob: 0 });
  } else {
    for (let i = 0; i < 5; i++) game.pickups.push({ type: i % 2 ? 'coffee' : 'rune', x: e.x - 60 + i * 30, z: e.z + (i - 2) * 20, y: e.y + 40, vy: 4, bob: 0 });
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
  spark(p.x, p.y + 40, p.z, '#e05050', 12, 4);
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
  if (game.state === 'dialog' && game.dialog) {
    const line = game.dialog.lines[game.dialog.i];
    if (game.dialog.chars < line.t.length) { game.dialog.chars += 1.4; renderDialogLine(); }
  }
  if (game.state !== 'play') { updateParticles(); return; }
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

  /* movement — free roam on the plane */
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mx += 1;
  if (keys['s'] || keys['arrowdown']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mz += 1;
  if (keys['a'] || keys['arrowleft']) mz -= 1;
  const ml = Math.hypot(mx, mz);
  const SPD = 5.2;
  if (p.atkT <= 0 && ml > 0) {
    mx /= ml; mz /= ml;
    p.vx = mx * SPD; p.vz = mz * SPD;
    p.fx = mx; p.fz = mz;
  } else {
    const fr = p.atkT > 0 ? 0.85 : 0.72;
    p.vx *= fr; p.vz *= fr;
  }

  if (keys[' '] && p.onGround) { p.vy = 15.5; p.onGround = false; }
  p.vy -= 0.82;
  p.x += p.vx; p.z += p.vz; p.y += p.vy;

  /* bounds + boss walls */
  const ab = activeBoss();
  if (ab) p.x = Math.max(ab.meta.arena[0] + 20, Math.min(ab.meta.arena[1] - 20, p.x));
  p.x = Math.max(60, Math.min(WORLD_END - 60, p.x));
  p.z = Math.max(-Z_LIMIT, Math.min(Z_LIMIT, p.z));

  const g = gH(p.x, p.z);
  if (p.y <= g) { p.y = g; p.vy = 0; p.onGround = true; } else p.onGround = false;

  if (p.invuln > 0) p.invuln--;
  if (p.comboReset > 0) { p.comboReset--; if (p.comboReset === 0) p.combo = 0; }

  /* melee attack */
  if (p.atkT > 0) {
    p.atkT--;
    if (p.atkT === 10) {
      const dmg = [12, 12, 22][p.combo], range = 96;
      let landed = false;
      for (const e of allFoes()) {
        if (e.dead) continue;
        const t = ETYPES[e.type];
        const dx = e.x - p.x, dz = e.z - p.z;
        const fwd = dx * p.fx + dz * p.fz;
        const side = Math.abs(dx * p.fz - dz * p.fx);
        if (fwd > -t.w / 2 && fwd < range + t.w / 2 && side < 70 + t.w / 2 &&
            Math.abs((e.y + t.h / 2) - (p.y + 40)) < Math.max(100, t.h * 0.8)) {
          const k = p.combo === 2 ? 7 : 3;
          hurtEnemy(e, dmg, p.fx * k, p.fz * k); landed = true;
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
  if ((keys['k'] || keys['x'])) {
    keys['k'] = keys['x'] = false;
    if (ax.state === 'held') {
      ax.state = 'fly';
      ax.x = p.x + p.fx * 20; ax.z = p.z + p.fz * 20; ax.y = p.y + 46;
      ax.vx = p.fx * 17; ax.vz = p.fz * 17; ax.vy = 2.5;
      ax.dist = 0; ax.hitSet = new Set(); SFX.throwAxe();
    } else if (ax.state === 'fly' || ax.state === 'stuck') {
      ax.state = 'return'; ax.hitSet = new Set(); SFX.throwAxe();
    }
  }
  if (ax.state === 'fly') {
    ax.vy -= 0.22; ax.x += ax.vx; ax.z += ax.vz; ax.y += ax.vy;
    ax.rot += 0.45; ax.dist += Math.hypot(ax.vx, ax.vz);
    axeHits(ax, 16);
    axeHitsPins(ax);
    const ag = gH(ax.x, ax.z);
    if (ax.y <= ag + 4 || ax.dist > 920) { ax.state = 'stuck'; ax.y = Math.max(ax.y, ag + 4); }
  } else if (ax.state === 'return') {
    const dx = p.x - ax.x, dy = (p.y + 46) - ax.y, dz = p.z - ax.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    ax.x += dx / d * 21; ax.y += dy / d * 21; ax.z += dz / d * 21; ax.rot -= 0.5;
    axeHits(ax, 16);
    axeHitsPins(ax);
    if (d < 42) { ax.state = 'held'; SFX.catchAxe(); spark(p.x, p.y + 46, p.z, '#8ad4f0', 6, 2); }
  }

  /* enemies */
  for (const e of game.enemies) updateEnemy(e, p);
  for (const b of game.bosses) if (b.active && !b.dead) updateBoss(b, p);
  game.enemies = game.enemies.filter(e => {
    if (e.dead && !ETYPES[e.type].boss) {
      e.deadT = (e.deadT || 0) + 1;
      if (e.deadT > 22) { disposeEntity(e); return false; }
    }
    return true;
  });

  /* projectiles */
  for (const pr of game.projectiles) {
    pr.vy -= 0.06; pr.x += pr.vx; pr.y += pr.vy; pr.z += pr.vz; pr.life--;
    if (Math.hypot(pr.x - p.x, pr.y - (p.y + 40), pr.z - p.z) < 34) { hurtPlayer(9); pr.life = 0; spark(pr.x, pr.y, pr.z, '#a0f0a0', 8, 3); }
    if (pr.y < gH(pr.x, pr.z)) { pr.life = 0; spark(pr.x, pr.y, pr.z, '#a08af0', 6, 2); }
  }
  game.projectiles = game.projectiles.filter(pr => pr.life > 0);

  /* pins (CSV crate bowling) */
  updatePins(p);

  /* pickups */
  for (const pk of game.pickups) {
    if (pk.vy !== 0) { pk.vy -= 0.4; pk.y += pk.vy; const gg = gH(pk.x, pk.z) + 16; if (pk.y < gg) { pk.y = gg; pk.vy = 0; } }
    pk.bob += 0.08;
    if (Math.hypot(pk.x - p.x, pk.z - p.z) < 40 && Math.abs(pk.y - (p.y + 30)) < 60) {
      pk.got = true; SFX.pickup();
      if (pk.type === 'coffee') { p.hp = Math.min(p.maxHp, p.hp + 22); dmgNum(p.x, p.y + 90, p.z, '+22', false); }
      else { p.runes++; spark(pk.x, pk.y, pk.z, '#d8b46a', 6, 2); }
    }
  }
  game.pickups = game.pickups.filter(pk => { if (pk.got) { disposeEntity(pk); return false; } return true; });

  updateParticles();

  /* hint text */
  const n = nearestInteractable();
  game.hint = n ? (n.kind === 'sign' ? 'E — read the runestone' : `E — open ${n.obj.label} · ${n.obj.sub}`) : '';

  game.shake *= 0.88;
}

function allFoes() { return game.enemies.concat(game.bosses.filter(b => b.active && !b.dead)); }

function axeHits(ax, dmg) {
  for (const e of allFoes()) {
    if (e.dead || ax.hitSet.has(e)) continue;
    const t = ETYPES[e.type];
    if (Math.hypot(e.x - ax.x, e.z - ax.z) < t.w / 2 + 26 && Math.abs((e.y + t.h / 2) - ax.y) < t.h / 2 + 30) {
      ax.hitSet.add(e);
      const d = Math.hypot(ax.vx, ax.vz) || 1;
      hurtEnemy(e, dmg, ax.vx / d * 4, ax.vz / d * 4);
    }
  }
}

/* ---------- bowling pins ---------- */
function knockPin(pin, dx, dz) {
  const d = Math.hypot(dx, dz) || 1;
  pin.up = false; pin.vx = dx / d * 5; pin.vz = dz / d * 5;
  SFX.knock();
  spark(pin.x, gH(pin.x, pin.z) + 20, pin.z, '#a08af0', 10, 3);
  if (!pin.scored) {
    pin.scored = true; game.player.runes++;
    dmgNum(pin.x, gH(pin.x, pin.z) + 50, pin.z, '+1 ᚱ', false);
  }
  if (game.pins.every(q => !q.up)) game.pinResetT = 300;
}
function axeHitsPins(ax) {
  for (const pin of game.pins) {
    if (!pin.up) continue;
    if (Math.hypot(pin.x - ax.x, pin.z - ax.z) < 34 && ax.y < gH(pin.x, pin.z) + 85) {
      knockPin(pin, ax.vx, ax.vz);
    }
  }
}
function updatePins(p) {
  for (const pin of game.pins) {
    if (pin.up) {
      const spd = Math.hypot(p.vx, p.vz);
      if (spd > 3 && Math.hypot(pin.x - p.x, pin.z - p.z) < 28 && Math.abs(gH(pin.x, pin.z) - p.y) < 40) {
        knockPin(pin, p.vx, p.vz);
      }
    } else {
      pin.tip = Math.min(1, pin.tip + 0.09);
      pin.x += pin.vx; pin.z += pin.vz;
      pin.vx *= 0.9; pin.vz *= 0.9;
    }
  }
  if (game.pinResetT > 0) {
    game.pinResetT--;
    if (game.pinResetT === 0) {
      for (const pin of game.pins) { pin.up = true; pin.tip = 0; pin.x = pin.hx; pin.z = pin.hz; pin.vx = pin.vz = 0; }
      SFX.open();
    }
  }
}

function updateEnemy(e, p) {
  if (e.dead) return;
  const t = ETYPES[e.type];
  if (e.flash > 0) e.flash--;
  if (e.dmgCd > 0) e.dmgCd--;
  const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 1;
  const ux = dx / dist, uz = dz / dist;
  const aggro = dist < 540;
  if (aggro) { e.fx = ux; e.fz = uz; }

  if (t.fly) {
    const ty = (e.type === 'shade' ? p.y + 50 : gH(e.x, e.z) + 70) + Math.sin(game.t * 0.05 + e.seed) * 14;
    if (aggro) {
      const s = e.type === 'shade' ? 2.4 : 1.6;
      e.x += ux * s; e.z += uz * s;
      e.y += (ty - e.y) * 0.05;
    } else e.y = gH(e.x, e.z) + 70 + Math.sin(game.t * 0.04 + e.seed) * 10;
  } else {
    if (e.type === 'imp') {
      if (e.state === 'windup') { e.timer--; if (e.timer <= 0) { e.state = 'lunge'; e.timer = 12; e.vx = e.fx * 8.5; e.vz = e.fz * 8.5; } }
      else if (e.state === 'lunge') { e.timer--; if (e.timer <= 0) { e.state = 'idle'; e.vx = e.vz = 0; } }
      else if (aggro) { if (dist < 120) { e.state = 'windup'; e.timer = 26; e.vx = e.vz = 0; } else { e.vx = ux * 2.2; e.vz = uz * 2.2; } }
      else { e.vx *= 0.8; e.vz *= 0.8; }
    } else if (e.type === 'demon') {
      if (e.y <= gH(e.x, e.z) + 1) {
        e.vx = e.vz = 0;
        if (aggro && e.timer <= 0) { e.vy = 9.5; e.vx = ux * 4.2; e.vz = uz * 4.2; e.timer = 55 + Math.random() * 30; }
        e.timer--;
      }
      e.vy -= 0.7;
    }
    e.x += e.vx; e.z += e.vz; e.y += e.vy;
    const g = gH(e.x, e.z);
    if (e.y <= g) { e.y = g; e.vy = 0; }
    e.vx *= 0.94; e.vz *= 0.94;
  }
  /* contact damage */
  if (e.dmgCd <= 0 && Math.hypot(e.x - p.x, e.z - p.z) < t.w / 2 + 24 && Math.abs((e.y + t.h / 2) - (p.y + 40)) < t.h / 2 + 44) {
    hurtPlayer(t.dmg); e.dmgCd = 55;
  }
}

function updateBoss(b, p) {
  const t = ETYPES[b.type];
  if (b.flash > 0) b.flash--;
  if (b.dmgCd > 0) b.dmgCd--;
  b.phaseT++;
  const dx = p.x - b.x, dz = p.z - b.z, dist = Math.hypot(dx, dz) || 1;

  if (b.type === 'hydra') {
    b.y = gH(b.x, b.z);
    const rate = b.hp > 160 ? 150 : b.hp > 80 ? 110 : 80;
    if (b.state === 'idle' && b.phaseT > rate) {
      b.state = 'telegraph'; b.timer = 38; b.strikeHead = Math.floor(Math.random() * Math.max(1, Math.ceil(b.hp / b.maxHp * 3)));
      b.targetX = p.x; b.targetZ = p.z; b.targetY = p.y + 30;
    } else if (b.state === 'telegraph') {
      b.timer--; b.targetX = p.x; b.targetZ = p.z; b.targetY = p.y + 30;
      if (b.timer <= 0) { b.state = 'strike'; b.timer = 16; SFX.swing(); }
    } else if (b.state === 'strike') {
      b.timer--;
      if (b.timer === 8 && Math.hypot(p.x - b.targetX, p.z - b.targetZ) < 74) hurtPlayer(t.dmg);
      if (b.timer === 8) { spark(b.targetX, b.targetY, b.targetZ, '#f08a4a', 14, 4); game.shake = Math.min(12, game.shake + 5); }
      if (b.timer <= 0) { b.state = 'idle'; b.phaseT = 0; }
    }
    if (b.phaseT % 420 === 419 && game.enemies.filter(e => e.add && !e.dead).length < 2) {
      game.enemies.push(Object.assign(makeEnemy('imp', b.x - 200 - Math.random() * 120, (Math.random() - 0.5) * 240), { add: true }));
    }
  }

  if (b.type === 'chaos') {
    const cx = b.homeX, baseY = gH(cx, 0) + 185;
    if (b.state === 'idle' || b.state === 'volley') {
      b.y = baseY + Math.sin(game.t * 0.03) * 36;
      b.x = cx + Math.sin(game.t * 0.017) * 180;
      b.z = Math.cos(game.t * 0.013) * 130;
      const rate = b.hp > 130 ? 120 : 85;
      if (b.phaseT > rate) {
        b.phaseT = 0; b.volleys = (b.volleys || 0) + 1;
        if (b.volleys % 3 === 0) { b.state = 'slamdown'; b.timer = 30; }
        else {
          for (let i = 0; i < 5; i++) {
            const ddx = p.x - b.x, ddy = (p.y + 40) - b.y, ddz = p.z - b.z;
            const d = Math.hypot(ddx, ddy, ddz) || 1, s = 6.2;
            game.projectiles.push({
              x: b.x, y: b.y, z: b.z,
              vx: ddx / d * s + (i - 2) * 0.7, vy: ddy / d * s + 1.2, vz: ddz / d * s + ((i * 7) % 5 - 2) * 0.7,
              life: 240,
            });
          }
          SFX.throwAxe();
        }
      }
    } else if (b.state === 'slamdown') {
      b.timer--; b.y += (gH(b.x, b.z) + 60 - b.y) * 0.2;
      if (b.timer <= 0) {
        b.state = 'grounded'; b.timer = 95; game.shake = Math.min(16, game.shake + 9); SFX.roar();
        if (p.onGround && Math.hypot(p.x - b.x, p.z - b.z) < 190) hurtPlayer(16);
        spark(b.x, gH(b.x, b.z), b.z, '#a08af0', 26, 6);
      }
    } else if (b.state === 'grounded') {
      b.timer--; b.y = gH(b.x, b.z) + 60;
      if (b.timer <= 0) { b.state = 'idle'; b.phaseT = 0; }
    }
  }

  if (b.type === 'churn') {
    const cx = b.homeX;
    /* the pull — drags the player toward the maw */
    if (dist < 720 && b.state !== 'dash') { p.vx += -dx / dist * 0.22; p.vz += -dz / dist * 0.22; }
    if (b.state === 'idle') {
      b.x += (cx - b.x) * 0.02; b.z += (0 - b.z) * 0.02;
      b.y = gH(b.x, b.z) + 70 + Math.sin(game.t * 0.04) * 16;
      const rate = b.hp > 150 ? 170 : 120;
      if (b.phaseT > rate) { b.state = 'windup'; b.timer = 34; b.phaseT = 0; }
      if (game.t % 300 === 0 && game.enemies.filter(e => e.add && !e.dead).length < 2) {
        game.enemies.push(Object.assign(makeEnemy('shade', b.x - 150, (Math.random() - 0.5) * 200), { add: true }));
      }
    } else if (b.state === 'windup') {
      b.timer--;
      if (b.timer <= 0) { b.state = 'dash'; b.timer = 26; b.dashX = dx / dist; b.dashZ = dz / dist; SFX.roar(); }
    } else if (b.state === 'dash') {
      b.timer--; b.x += b.dashX * 11; b.z += b.dashZ * 11; b.y = gH(b.x, b.z) + 60;
      if (b.dmgCd <= 0 && Math.hypot(b.x - p.x, b.z - p.z) < 100 && Math.abs(b.y - (p.y + 40)) < 130) { hurtPlayer(t.dmg); b.dmgCd = 40; }
      b.x = Math.max(b.meta.arena[0] + 80, Math.min(b.meta.arena[1] - 80, b.x));
      b.z = Math.max(-Z_LIMIT + 60, Math.min(Z_LIMIT - 60, b.z));
      if (b.timer <= 0) { b.state = 'idle'; b.phaseT = 0; }
    }
  }

  /* hydra contact */
  if (b.type === 'hydra' && b.dmgCd <= 0 && dist < 140 && p.y < b.y + 200) {
    hurtPlayer(8); b.dmgCd = 60;
  }
}

function updateParticles() {
  for (const pt of game.particles) { pt.vy -= 0.12; pt.x += pt.vx; pt.y += pt.vy; pt.z += pt.vz; pt.life--; }
  game.particles = game.particles.filter(pt => pt.life > 0);
  for (const d of game.dmgNums) { d.y += 1.2; d.life--; }
  game.dmgNums = game.dmgNums.filter(d => { if (d.life > 0) return true; if (d.el) d.el.remove(); return false; });
  /* ambient embers */
  if (game.t % 6 === 0 && game.particles.length < 260) {
    const p = game.player, pal = palNAt(p.x);
    const ex = p.x - 300 + Math.random() * 1400, ez = p.z - 600 + Math.random() * 1200;
    game.particles.push({
      x: ex, y: gH(ex, ez) + Math.random() * 160, z: ez,
      vx: (Math.random() - 0.3) * 0.6, vy: 0.62 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.4,
      life: 90 + Math.random() * 60, r: pal.ember.r, g: pal.ember.g, b: pal.ember.b,
    });
  }
}

/* ============================================================
   THREE.JS SCENE
   ============================================================ */
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1420');
scene.fog = new THREE.Fog(new THREE.Color('#1e4a52'), 1300, 5400);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 9000);
camera.position.set(-300, 400, 0);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* lights */
const hemi = new THREE.HemisphereLight(0x3a5a66, 0x11161e, 1.05);
scene.add(hemi);
const moonLight = new THREE.DirectionalLight(0x93a7c8, 0.45);
moonLight.position.set(-400, 700, 500);
scene.add(moonLight);
const playerLight = new THREE.PointLight(0xffb070, 1.0, 420, 1.5);
scene.add(playerLight);

/* materials helper */
function lam(color, emissive, opts) {
  const m = new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  m.emissive = new THREE.Color(emissive || 0x000000);
  m.userData.be = m.emissive.clone();
  return m;
}
const WHITE_HOT = new THREE.Color(0.95, 0.95, 0.95);

/* ---------- terrain ---------- */
(function buildTerrain() {
  const XSTEP = 48, NXC = Math.floor((WORLD_END + 1600) / XSTEP) + 1;
  const ZR = [];
  for (let z = -1500; z <= 1500; z += 100) ZR.push(z);
  const NZ = ZR.length;
  const pos = new Float32Array(NXC * NZ * 3), col = new Float32Array(NXC * NZ * 3);
  const c = new THREE.Color();
  for (let ix = 0; ix < NXC; ix++) {
    const x = ix * XSTEP - 800;
    const pal = palNAt(Math.max(0, Math.min(WORLD_END, x)));
    for (let iz = 0; iz < NZ; iz++) {
      const z = ZR[iz], i = (ix * NZ + iz) * 3;
      pos[i] = x; pos[i + 1] = gH(x, z); pos[i + 2] = z;
      const az = Math.abs(z);
      const t = az <= 70 ? 0.9 : az <= 150 ? 0.55 : az <= 300 ? 0.3 : 0.16;
      c.copy(pal.gnd).lerp(pal.top, t).multiplyScalar(1.3);
      if (az > 550) c.lerp(pal.r2, Math.min(0.8, (az - 550) / 700));
      col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
    }
  }
  const idx = [];
  for (let ix = 0; ix < NXC - 1; ix++) for (let iz = 0; iz < NZ - 1; iz++) {
    const a = ix * NZ + iz, b = a + NZ;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
})();

/* glowing road ribbon */
(function buildRoad() {
  const STEP = 40, NXC = Math.floor(WORLD_END / STEP) + 2, ZS = [-60, 0, 60];
  const pos = new Float32Array(NXC * 3 * 3), col = new Float32Array(NXC * 3 * 3);
  const c = new THREE.Color();
  for (let ix = 0; ix < NXC; ix++) {
    const x = ix * STEP;
    const pal = palNAt(x);
    for (let iz = 0; iz < 3; iz++) {
      const i = (ix * 3 + iz) * 3;
      pos[i] = x; pos[i + 1] = gH(x, ZS[iz]) + 1.2; pos[i + 2] = ZS[iz];
      c.copy(pal.top).multiplyScalar(iz === 1 ? 1.2 : 0.7);
      col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
    }
  }
  const idx = [];
  for (let ix = 0; ix < NXC - 1; ix++) for (let iz = 0; iz < 2; iz++) {
    const a = ix * 3 + iz, b = a + 3;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false })));
})();

/* ---------- sky: stars + moon (follows camera) ---------- */
const skyGroup = new THREE.Group();
scene.add(skyGroup);
(function buildSky() {
  const N = 380, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2600 + Math.random() * 1800;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 250 + Math.random() * 2100;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  skyGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 6, transparent: true, opacity: 0.6, fog: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(110, 24, 18), new THREE.MeshBasicMaterial({ color: 0xe8e0d0, fog: false }));
  moon.position.set(3400, 1300, -900);
  skyGroup.add(moon);
})();

/* ---------- decor ---------- */
const torchFlames = [];
(function buildDecor() {
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let x = 500; x < 25400; x += 260 + rnd() * 220) {
    const side = rnd() < 0.5 ? -1 : 1;
    const z = side * (200 + rnd() * 330);
    const ci = chapterIndexAt(x);
    const y = gH(x, z);
    const g = new THREE.Group();
    if (ci === 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(12 + rnd() * 8, 60 + rnd() * 60, 5), lam(0x2b1210));
      spike.position.y = 35; g.add(spike);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 6), lam(0x612a12, 0xf08a4a));
      tip.position.y = 68 + rnd() * 40; g.add(tip);
    } else if (ci === 2) {
      const h = 70 + rnd() * 70;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(24, h, 12), lam(0x201839, 0x27204a));
      slab.position.y = h / 2; slab.rotation.y = rnd() * 3.14; slab.rotation.z = (rnd() - 0.5) * 0.12;
      g.add(slab);
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 22, 6), lam(0x1d140c));
      trunk.position.y = 11; g.add(trunk);
      const cc = new THREE.Color().copy(CHN[ci].top).multiplyScalar(1.05);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(18 + rnd() * 10, 55 + rnd() * 35, 7), lam(cc.getHex()));
      cone.position.y = 50; g.add(cone);
    }
    g.position.set(x, y, z);
    scene.add(g);
  }
  /* torches lining the road */
  for (let x = 900; x < 25600; x += 1100) {
    for (const zs of [-105, 105]) {
      const y = gH(x, zs);
      const pal = CHN[chapterIndexAt(x)];
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(9, 46, 9), lam(0x141a22));
      pillar.position.set(x, y + 23, zs);
      scene.add(pillar);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(5.5, 8, 6), new THREE.MeshBasicMaterial({ color: pal.ember.clone() }));
      flame.position.set(x, y + 51, zs);
      scene.add(flame);
      torchFlames.push(flame);
    }
  }
})();

/* ---------- text sprites ---------- */
function textSprite(text, opts) {
  const o = Object.assign({ size: 44, color: '#d8b46a', font: "'Cinzel', serif", w: 512, h: 96, italic: false }, opts || {});
  const cv = document.createElement('canvas'); cv.width = o.w; cv.height = o.h;
  const g = cv.getContext('2d');
  g.font = `${o.italic ? 'italic ' : ''}${o.size}px ${o.font}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = o.color; g.shadowBlur = 14;
  g.fillStyle = o.color;
  g.fillText(text, o.w / 2, o.h / 2);
  const tx = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
  sp.scale.set(o.w / 3, o.h / 3, 1);
  return sp;
}

/* ---------- runestones & gates ---------- */
const signObjs = [];
for (const s of SIGNS) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 96, 46), lam(0x1a2028));
  slab.position.y = 48;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 38), lam(0x232b36));
  cap.position.y = 100;
  g.add(slab, cap);
  const rune = textSprite('ᛟ', { size: 64, color: '#d8b46a', w: 128, h: 128, font: 'serif' });
  rune.position.set(-10, 60, 0);
  rune.scale.set(34, 34, 1);
  g.add(rune);
  g.position.set(s.x, gH(s.x, s.z), s.z);
  scene.add(g);
  signObjs.push({ sign: s, rune });
}
const gateObjs = [];
for (const gt of GATES) {
  const g = new THREE.Group();
  const col = new THREE.Color(gt.color);
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(20, 190, 20), lam(0x141a22)); p1.position.set(0, 95, -34);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(20, 190, 20), lam(0x141a22)); p2.position.set(0, 95, 34);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(24, 20, 104), lam(0x1a222c)); lintel.position.y = 196;
  const glowMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(48, 184), glowMat);
  glow.rotation.y = Math.PI / 2;
  glow.position.y = 93;
  g.add(p1, p2, lintel, glow);
  const label = textSprite(gt.label, { size: 42, color: gt.color });
  label.position.y = 240;
  g.add(label);
  const sub = textSprite(gt.sub, { size: 30, color: 'rgba(232,224,208,0.75)', italic: true, font: "'Crimson Pro', serif" });
  sub.position.y = 210; sub.scale.set(120, 22, 1);
  g.add(sub);
  g.position.set(gt.x, gH(gt.x, gt.z), gt.z);
  scene.add(g);
  gateObjs.push({ gate: gt, glowMat });
}

/* ---------- bowling pins (CSV crates) ---------- */
const pinObjs = [];
{
  const crateG = new THREE.BoxGeometry(22, 40, 22);
  for (const pin of game.pins) {
    const g = new THREE.Group();
    const crate = new THREE.Mesh(crateG, lam(0x2a2440, 0x0e0a20));
    crate.position.y = 20;
    const tag = textSprite('CSV', { size: 30, color: '#f06060', font: 'monospace', w: 128, h: 48 });
    tag.position.y = 52; tag.scale.set(34, 13, 1);
    g.add(crate, tag);
    scene.add(g);
    pinObjs.push({ pin, g });
  }
}

/* ---------- blob shadows ---------- */
const shadowGeo = new THREE.CircleGeometry(1, 18);
function makeShadow(r) {
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(r, r, 1);
  return m;
}
function placeShadow(sh, x, z, y, r) {
  const gy = gH(x, z);
  sh.position.set(x, gy + 0.8, z);
  const k = Math.max(0.25, 1 - Math.max(0, y - gy) / 260);
  sh.scale.set(r * k, r * k, 1);
  sh.material.opacity = 0.35 * k;
}

/* ---------- the Automation Axe ---------- */
function buildAxe() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 38, 6), lam(0x6b4a2a));
  handle.position.y = 15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(18, 11, 4), lam(0xb8c4cc));
  head.position.set(6, 30, 0);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(6, 17, 3.4), lam(0xcfdbe2));
  blade.position.set(15, 30, 0);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 18, 3.6), lam(0x78c8ff, 0x2e88c0));
  edge.position.set(18.4, 30, 0);
  const spike = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 3.4), lam(0x9aa8b2));
  spike.position.set(-4.5, 30, 0);
  g.add(handle, head, blade, edge, spike);
  return g;
}

/* ---------- player rig (faces +x at rotation.y = 0) ---------- */
const player3d = (() => {
  const root = new THREE.Group();
  const M = (c, e) => lam(c, e);

  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [leg, z] of [[legL, -6.5], [legR, 6.5]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.6, 26, 6), M(0x2a2e36));
    c.position.y = -13;
    leg.add(c);
    leg.position.set(0, 32, z);
    root.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(17, 30, 21), M(0x3a4048));
  torso.position.y = 47;
  root.add(torso);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(3, 34, 22), M(0xc03a2a));
  sash.position.set(7.5, 47, 0); sash.rotation.x = 0.62;
  root.add(sash);
  const pdL = new THREE.Mesh(new THREE.SphereGeometry(8.5, 10, 8), M(0xd8b46a));
  pdL.position.set(0, 60, 12);
  const pdR = new THREE.Mesh(new THREE.SphereGeometry(7.5, 10, 8), M(0x3a4048));
  pdR.position.set(0, 60, -12);
  root.add(pdL, pdR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), M(0xc8a080));
  head.position.set(3, 72, 0);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(6.8, 10, 8), M(0x2a2e36));
  beard.position.set(5, 67, 0); beard.scale.set(1, 0.85, 0.95);
  const paint = new THREE.Mesh(new THREE.BoxGeometry(2, 11, 3), M(0xc03a2a));
  paint.position.set(9.6, 73, 1.5); paint.rotation.z = 0.12;
  root.add(head, beard, paint);
  const cape = new THREE.Group();
  const capeM = new THREE.Mesh(new THREE.BoxGeometry(3.4, 36, 19), M(0x5a1616));
  capeM.position.y = -18;
  cape.add(capeM);
  cape.position.set(-9, 60, 0);
  root.add(cape);
  const armB = new THREE.Group();
  const ab = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3, 22, 6), M(0x3a4048));
  ab.position.y = -11;
  armB.add(ab);
  armB.position.set(0, 58, -12);
  root.add(armB);
  const armR = new THREE.Group();
  const af = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.2, 24, 6), M(0x3a4048));
  af.position.y = -12;
  armR.add(af);
  const axeHand = buildAxe();
  axeHand.position.set(0, -26, 0);
  axeHand.rotation.z = -0.5;
  armR.add(axeHand);
  armR.position.set(4, 58, 12);
  root.add(armR);
  const slash1 = new THREE.Mesh(new THREE.TorusGeometry(56, 2.6, 6, 24, 1.9),
    new THREE.MeshBasicMaterial({ color: 0xe8e0d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const slash2 = new THREE.Mesh(new THREE.TorusGeometry(47, 5, 6, 24, 1.6),
    new THREE.MeshBasicMaterial({ color: 0xe2603a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  slash1.position.set(10, 46, 0); slash1.rotation.y = Math.PI / 2;
  slash2.position.set(10, 46, 0); slash2.rotation.y = Math.PI / 2;
  root.add(slash1, slash2);

  scene.add(root);
  const shadow = makeShadow(20);
  scene.add(shadow);
  return { root, legL, legR, armB, armR, axeHand, cape, slash1, slash2, shadow, ry: 0 };
})();

/* ---------- BOTREUS ---------- */
const bot3d = (() => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(11, 14, 12), lam(0x0e2418, 0x1d5c3c));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(13.5, 1.2, 6, 24), new THREE.MeshBasicMaterial({ color: 0x7de0a0 }));
  const eL = new THREE.Mesh(new THREE.BoxGeometry(2, 4.5, 3.2), new THREE.MeshBasicMaterial({ color: 0x7de0a0 }));
  const eR = eL.clone();
  eL.position.set(8.5, 1.5, -3.6); eR.position.set(8.5, 1.5, 3.6);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 5), new THREE.MeshBasicMaterial({ color: 0x7de0a0 }));
  ant.position.y = 14.5;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7de0a0 }));
  bulb.position.y = 19.5;
  const light = new THREE.PointLight(0x7de0a0, 0.8, 150, 1.8);
  g.add(body, ring, eL, eR, ant, bulb, light);
  scene.add(g);
  return g;
})();

/* ---------- free axe ---------- */
const freeAxe = buildAxe();
freeAxe.visible = false;
const axeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(130,210,255,0.8)'); gr.addColorStop(1, 'rgba(130,210,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })(),
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
axeGlow.scale.set(70, 70, 1);
axeGlow.position.y = 30;
freeAxe.add(axeGlow);
scene.add(freeAxe);

/* ---------- particles ---------- */
const PMAX = 500;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 7, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
points.frustumCulled = false;
scene.add(points);

/* ---------- projectile pool ---------- */
const projPool = [];
for (let i = 0; i < 24; i++) {
  const m = new THREE.Mesh(new THREE.TetrahedronGeometry(9), lam(0x5a4a99, 0xa08af0));
  m.visible = false;
  scene.add(m);
  projPool.push(m);
}

/* ---------- enemy factories ---------- */
function disposeEntity(e) {
  if (e._obj) { scene.remove(e._obj); e._obj = null; }
  if (e._shadow) { scene.remove(e._shadow); e._shadow = null; }
}

const FACTORY = {
  wisp(e) {
    const g = new THREE.Group();
    const m = lam(0x1d5049, 0x4ec2b0, { transparent: true, opacity: 0.9 });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(12, 0), m);
    core.position.y = 14;
    const eL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.4, 2.4), new THREE.MeshBasicMaterial({ color: 0x0a0e14 }));
    const eR = eL.clone();
    eL.position.set(9, 17, -4); eR.position.set(9, 17, 4);
    g.add(core, eL, eR);
    e._mats = [m]; e._core = core;
    return g;
  },
  imp(e) {
    const g = new THREE.Group();
    const body = lam(0xc8b090);
    const b = new THREE.Mesh(new THREE.BoxGeometry(34, 26, 20), body);
    b.position.y = 25;
    const h1 = new THREE.Mesh(new THREE.ConeGeometry(4, 12, 5), lam(0x6b4a2a));
    h1.position.set(0, 42, -8); h1.rotation.x = -0.4;
    const h2 = h1.clone(); h2.position.z = 8; h2.rotation.x = 0.4;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(2, 4.4, 4.4), new THREE.MeshBasicMaterial({ color: 0xe04030 }));
    const eye2 = eye.clone();
    eye.position.set(17.4, 30, -5); eye2.position.set(17.4, 30, 5);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 13, 5), lam(0x6b4a2a));
    legL.position.set(0, 6, -7);
    const legR = legL.clone(); legR.position.z = 7;
    g.add(b, h1, h2, eye, eye2, legL, legR);
    e._mats = [body]; e._body = body; e._legs = [legL, legR];
    return g;
  },
  demon(e) {
    const g = new THREE.Group();
    const m = lam(0x3a2c66, 0x181040);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 19, 50, 5), m);
    body.position.y = 25;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0xa08af0 }));
    edges.position.y = 25;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf06060 }));
    eye.position.set(11, 36, 0);
    g.add(body, edges, eye);
    e._mats = [m];
    return g;
  },
  shade(e) {
    const g = new THREE.Group();
    const m = lam(0xc8d2e6, 0x2c3448, { transparent: true, opacity: 0.55 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
    dome.position.y = 40;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(16, 11, 26, 10, 1, true), m);
    skirt.position.y = 27;
    const eL = new THREE.Mesh(new THREE.SphereGeometry(3, 6, 5), new THREE.MeshBasicMaterial({ color: 0x0a0e14 }));
    const eR = eL.clone();
    eL.position.set(12, 44, -5); eR.position.set(12, 44, 5);
    g.add(dome, skirt, eL, eR);
    e._mats = [m];
    return g;
  },
  hydra(e) {
    const g = new THREE.Group();
    const moundM = lam(0x3a1c14);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(130, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), moundM);
    mound.scale.y = 0.55;
    g.add(mound);
    for (let i = 0; i < 6; i++) {
      const scrap = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 10),
        new THREE.MeshBasicMaterial({ color: 0xe8e0d0, transparent: true, opacity: 0.15 }));
      scrap.position.set(-100 + i * 34, 30 + (i % 3) * 12, 40 - (i % 2) * 70);
      scrap.rotation.y = i;
      g.add(scrap);
    }
    e._necks = []; e._heads = []; e._mats = [moundM];
    for (let h = 0; h < 3; h++) {
      const neckM = lam(0x4a2418);
      e._mats.push(neckM);
      const segs = [];
      for (let i = 0; i < 8; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(13 - i * 0.6, 8, 6), neckM);
        g.add(s); segs.push(s);
      }
      const head = new THREE.Group();
      const headM = lam(0x5a2c1a);
      e._mats.push(headM);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(42, 16, 16), headM);
      snout.position.x = 12;
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 13), headM);
      jaw.position.set(10, -11, 0);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(4.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf06040 }));
      eye.position.set(2, 6, 9);
      head.add(snout, jaw, eye);
      g.add(head);
      e._necks.push({ segs, m: neckM });
      e._heads.push({ grp: head, eye, m: headM });
    }
    return g;
  },
  chaos(e) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    e._cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x1e183c });
      const cell = new THREE.Mesh(new THREE.BoxGeometry(30, 22, 8), m);
      cell.position.set(-51 + c * 34, 79 - r * 26, 0);
      inner.add(cell);
      e._cells.push({ m, r, c });
    }
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(142, 84, 10)),
      new THREE.LineBasicMaterial({ color: 0xc8bce8 }));
    frame.position.y = 53;
    inner.add(frame);
    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 10), lam(0x0a0e14, 0x1a0808));
    eyeball.position.set(0, 53, 12);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(6.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf06060 }));
    pupil.position.set(0, 53, 26);
    inner.add(eyeball, pupil);
    const t1 = textSprite('#REF!', { size: 34, color: '#f06060', font: 'monospace', w: 192, h: 64 });
    t1.position.set(-55, 120, 20); t1.scale.set(52, 17, 1);
    const t2 = textSprite('#N/A', { size: 34, color: '#7de0a0', font: 'monospace', w: 192, h: 64 });
    t2.position.set(58, 4, 20); t2.scale.set(46, 15, 1);
    inner.add(t1, t2);
    g.add(inner);
    e._pupil = pupil; e._mats = []; e._inner = inner;
    return g;
  },
  churn(e) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    const bodyM = lam(0x1e142d, 0x241436, { transparent: true, opacity: 0.94 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(85, 18, 14), bodyM);
    body.position.y = 40; body.scale.set(1, 0.9, 0.85);
    const eL = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 8), new THREE.MeshBasicMaterial({ color: 0xc8b0f0 }));
    const eR = eL.clone();
    eL.position.set(-26, 66, 62); eR.position.set(26, 66, 62);
    const pL = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: 0x0a0e14 }));
    const pR = pL.clone();
    pL.position.set(-26, 66, 70); pR.position.set(26, 66, 70);
    const maw = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0x05070b }));
    maw.position.set(0, 22, 66); maw.scale.set(30, 16, 12);
    inner.add(body, eL, eR, pL, pR, maw);
    g.add(inner);
    e._orbiters = [];
    for (let i = 0; i < 3; i++) {
      const ob = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 16, 5), lam(0x8a8aa8));
      bar.rotation.z = Math.PI / 2;
      const w1 = new THREE.Mesh(new THREE.SphereGeometry(4.4, 6, 5), lam(0x8a8aa8));
      const w2 = w1.clone();
      w1.position.x = -8; w2.position.x = 8;
      ob.add(bar, w1, w2);
      g.add(ob);
      e._orbiters.push(ob);
    }
    e._mats = [bodyM]; e._body = body; e._bodyM = bodyM; e._maw = maw; e._inner = inner;
    return g;
  },
};

function ensureObj(e) {
  if (e._obj) return e._obj;
  e._obj = FACTORY[e.type](e);
  scene.add(e._obj);
  e._shadow = makeShadow(ETYPES[e.type].w * 0.42);
  scene.add(e._shadow);
  return e._obj;
}

/* pickups */
const runeGeo = new THREE.OctahedronGeometry(9);
const runeMat = lam(0xd8b46a, 0x8a6a2a);
const cupGeo = new THREE.CylinderGeometry(6, 5, 11, 8);
const cupMat = lam(0x3a2318, 0x1c0f08);
const cupRimMat = new THREE.MeshBasicMaterial({ color: 0xd8b46a });
function ensurePickup(pk) {
  if (pk._obj) return pk._obj;
  const g = new THREE.Group();
  if (pk.type === 'rune') {
    g.add(new THREE.Mesh(runeGeo, runeMat));
  } else {
    const cup = new THREE.Mesh(cupGeo, cupMat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.9, 5, 12), cupRimMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 5.5;
    g.add(cup, rim);
  }
  pk._obj = g;
  scene.add(g);
  pk._shadow = makeShadow(8);
  scene.add(pk._shadow);
  return g;
}

/* ============================================================
   RENDER / SYNC
   ============================================================ */
const _bez = new THREE.Vector3();
function bez3(p0, p1, p2, t) {
  const u = 1 - t;
  _bez.set(
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2]);
  return _bez;
}

function applyFlash(e) {
  if (!e._mats) return;
  const hot = e.flash > 0;
  for (const m of e._mats) m.emissive.copy(hot ? WHITE_HOT : m.userData.be);
}

/* yaw for models built facing +x */
function yawOf(fx, fz) { return Math.atan2(-fz, fx); }

function syncEnemy(e) {
  const g = ensureObj(e);
  const t = game.t;
  g.position.set(e.x, e.y, e.z);
  if (!ETYPES[e.type].boss) g.rotation.y = yawOf(e.fx, e.fz);
  applyFlash(e);
  if (e.dead) {
    const k = Math.max(0.02, 1 - (e.deadT || 0) / 20);
    g.scale.set(k, k, k);
    if (e._shadow) e._shadow.visible = false;
    return;
  }
  if (e._shadow) placeShadow(e._shadow, e.x, e.z, e.y, ETYPES[e.type].w * 0.42);

  if (e.type === 'wisp') {
    e._core.rotation.y = t * 0.05 + e.seed;
    e._core.rotation.x = Math.sin(t * 0.04 + e.seed) * 0.4;
  } else if (e.type === 'imp') {
    e._body.color.set(e.state === 'windup' ? 0x8a5030 : 0xc8b090);
    const walk = Math.sin(t * 0.3 + e.seed) * 0.5 * Math.min(1, Math.hypot(e.vx, e.vz));
    e._legs[0].rotation.z = walk; e._legs[1].rotation.z = -walk;
  } else if (e.type === 'demon') {
    g.rotation.z = Math.min(0.3, Math.max(-0.3, e.vy * 0.03));
  } else if (e.type === 'shade') {
    g.rotation.z = Math.sin(t * 0.06 + e.seed) * 0.12;
  } else if (e.type === 'hydra') {
    syncHydra(e, t);
  } else if (e.type === 'chaos') {
    syncChaos(e, t);
  } else if (e.type === 'churn') {
    syncChurn(e, t);
  }
}

function syncHydra(e, t) {
  const heads = Math.max(1, Math.ceil(e.hp / e.maxHp * 3));
  for (let h = 0; h < 3; h++) {
    const alive = h < heads;
    const baseZ = -70 + h * 70;
    let hx = 20 + Math.sin(t * 0.03 + h * 2) * 24;
    let hy = 170 + Math.sin(t * 0.04 + h) * 16;
    let hz = baseZ;
    if (alive && e.state !== 'idle' && e.strikeHead === h) {
      const tx = e.targetX - e.x, tz = e.targetZ - e.z, ty = Math.max(10, e.targetY - e.y);
      if (e.state === 'telegraph') { hx += (tx - hx) * 0.12; hy += ((ty + 60) - hy) * 0.12; hz += (tz - hz) * 0.12; }
      else { const s = 1 - e.timer / 16; hx += (tx - hx) * s; hy += (ty - hy) * s; hz += (tz - hz) * s; }
    }
    if (!alive) { hy = 55; hx = 0; hz = baseZ; }
    const neck = e._necks[h], head = e._heads[h];
    neck.m.color.set(alive ? 0x4a2418 : 0x241410);
    head.m.color.set(alive ? 0x5a2c1a : 0x241410);
    for (let i = 0; i < neck.segs.length; i++) {
      const s = i / (neck.segs.length - 1);
      neck.segs[i].position.copy(bez3([0, 45, baseZ * 0.5], [hx * 0.3, hy * 0.6, baseZ], [hx, hy, hz], s));
    }
    head.grp.position.set(hx, hy, hz);
    head.grp.rotation.y = yawOf(hx || 1, hz - baseZ);
    head.eye.material.color.set(e.state === 'telegraph' && e.strikeHead === h ? 0xffd040 : 0xf06040);
    head.eye.visible = alive;
  }
}

function syncChaos(e, t) {
  const p = game.player;
  e._obj.rotation.y = yawOf(p.x - e.x, p.z - e.z) - Math.PI / 2;
  e._inner.rotation.z = Math.sin(t * 0.02) * 0.08 + (e.state === 'grounded' ? 0.3 : 0);
  for (let i = 0; i < e._cells.length; i++) {
    const cell = e._cells[i];
    const flick = Math.sin(t * 0.2 + cell.r * 3 + cell.c * 7) > 0.6;
    if (e.flash > 0) cell.m.color.set(0xffffff);
    else if (flick) cell.m.color.set((cell.r + cell.c) % 2 ? 0xf06060 : 0x7de0a0);
    else cell.m.color.set(0x1e183c);
  }
  e._pupil.position.x = Math.sin(t * 0.05) * 5;
}

function syncChurn(e, t) {
  const p = game.player;
  e._inner.rotation.y = Math.atan2(p.x - e.x, p.z - e.z);
  const s = 1 + Math.sin(t * 0.08) * 0.05;
  e._body.scale.set(s, 0.9 * s, 0.85 * s);
  e._bodyM.color.set(e.state === 'windup' ? 0x5a1e3c : 0x1e142d);
  e._maw.scale.set(30, 16 + Math.sin(t * 0.1) * 6, 12);
  for (let i = 0; i < 3; i++) {
    const a = t * 0.03 + i * 2.1;
    e._orbiters[i].position.set(Math.cos(a) * 120, Math.sin(a) * 60 + 40, Math.sin(a * 1.3 + i) * 90);
    e._orbiters[i].rotation.z = a;
  }
}

function syncPlayer() {
  const p = game.player, t = game.t, r = player3d;
  r.root.position.set(p.x, p.y, p.z);
  const target = yawOf(p.fx, p.fz);
  let d = target - r.ry;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  r.ry += d * 0.25;
  r.root.rotation.y = r.ry;
  r.root.visible = !(p.invuln > 0 && Math.floor(t / 4) % 2 === 0);

  const spd = Math.hypot(p.vx, p.vz);
  const moving = spd > 0.8, run = Math.sin(t * 0.32);
  const legA = p.onGround ? (moving ? run * 0.65 : 0.06) : 0.45;
  r.legL.rotation.z = legA;
  r.legR.rotation.z = p.onGround ? -legA : 0.3;
  r.cape.rotation.z = 0.22 + (moving ? 0.3 : 0.05) + Math.sin(t * 0.2) * 0.06;
  r.armB.rotation.z = moving ? -run * 0.5 : -0.1;

  const attacking = p.atkT > 0;
  if (attacking) {
    const sw = 1 - p.atkT / 16;
    r.armR.rotation.z = 1.6 - sw * 3.1;
    r.slash1.material.opacity = Math.max(0, 0.75 - sw * 0.75);
    r.slash2.material.opacity = Math.max(0, 0.5 - sw * 0.5);
    r.slash1.rotation.z = -2.0 + sw * 2.4;
    r.slash2.rotation.z = -1.8 + sw * 2.4;
  } else {
    r.armR.rotation.z += ((moving ? run * 0.5 : 0.12) - r.armR.rotation.z) * 0.3;
    r.slash1.material.opacity = 0;
    r.slash2.material.opacity = 0;
  }
  r.axeHand.visible = game.axe.state === 'held';

  placeShadow(r.shadow, p.x, p.z, p.y, 20);
  playerLight.position.set(p.x, p.y + 90, p.z + 40);

  /* BOTREUS floats behind-left */
  const bx = p.x - p.fx * 46 - p.fz * 30, bz = p.z - p.fz * 46 + p.fx * 30;
  const by = p.y + 96 + Math.sin(t * 0.06) * 7;
  bot3d.position.set(bx, by, bz);
  bot3d.rotation.y = r.ry;

  /* free axe */
  const ax = game.axe;
  if (ax.state !== 'held') {
    freeAxe.visible = true;
    freeAxe.position.set(ax.x, ax.y, ax.z);
    freeAxe.rotation.y = yawOf(ax.vx || p.fx, ax.vz || p.fz);
    freeAxe.rotation.z = -ax.rot;
  } else freeAxe.visible = false;
}

function syncWorldFx() {
  const t = game.t;
  const n = Math.min(game.particles.length, PMAX);
  for (let i = 0; i < n; i++) {
    const pt = game.particles[i];
    pPos[i * 3] = pt.x; pPos[i * 3 + 1] = pt.y; pPos[i * 3 + 2] = pt.z;
    const fade = Math.min(1, pt.life / 30);
    pCol[i * 3] = pt.r * fade; pCol[i * 3 + 1] = pt.g * fade; pCol[i * 3 + 2] = pt.b * fade;
  }
  pGeo.setDrawRange(0, n);
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;

  for (let i = 0; i < projPool.length; i++) {
    const m = projPool[i], pr = game.projectiles[i];
    if (pr) {
      m.visible = true;
      m.position.set(pr.x, pr.y, pr.z);
      m.rotation.x += 0.2; m.rotation.y += 0.13;
    } else m.visible = false;
  }

  for (const pk of game.pickups) {
    const g = ensurePickup(pk);
    g.position.set(pk.x, pk.y + Math.sin(pk.bob) * 4, pk.z);
    if (pk.type === 'rune') g.rotation.y = t * 0.04 + pk.bob;
    if (pk._shadow) placeShadow(pk._shadow, pk.x, pk.z, pk.y, 8);
  }

  /* pins */
  for (const { pin, g } of pinObjs) {
    const gy = gH(pin.x, pin.z);
    g.position.set(pin.x, gy, pin.z);
    const yaw = Math.atan2(-(pin.vz || 0.001), pin.vx || 0.001);
    g.rotation.set(0, yaw, -pin.tip * Math.PI / 2);
  }

  for (const so of signObjs) {
    so.rune.material.opacity = 0.55 + Math.sin(t * 0.06 + so.sign.x) * 0.25;
  }
  for (const go of gateObjs) {
    const pulse = 0.5 + Math.sin(t * 0.07 + go.gate.x) * 0.3;
    go.glowMat.opacity = 0.16 + pulse * 0.2;
  }
  for (let i = 0; i < torchFlames.length; i++) {
    const k = 0.8 + Math.sin(t * 0.31 + i * 2.7) * 0.25;
    torchFlames[i].scale.set(k, k * (1.1 + Math.sin(t * 0.23 + i) * 0.2), k);
  }
}

/* atmosphere per chapter */
function syncAtmosphere() {
  const pal = palNAt(game.player.x);
  scene.background.copy(pal.skyT);
  scene.fog.color.copy(pal.skyB).lerp(pal.skyT, 0.25);
  hemi.color.copy(pal.skyB).multiplyScalar(1.4);
  hemi.groundColor.copy(pal.gnd).multiplyScalar(1.7);
}

/* camera — third-person chase, looking down the road */
let camX = -280, camY = 340, camZ = 0, lookX = 400, lookY = 60, lookZ = 0;
function syncCamera() {
  const p = game.player;
  const ab = activeBoss();
  const back = ab ? 520 : 310;
  const height = ab ? 380 : 210;
  camX += ((p.x - back) - camX) * 0.07;
  camY += ((p.y + height) - camY) * 0.06;
  camZ += ((p.z * 0.82) - camZ) * 0.07;
  lookX += ((p.x + 130) - lookX) * 0.09;
  lookY += ((p.y + 40) - lookY) * 0.08;
  lookZ += (p.z * 0.9 - lookZ) * 0.09;
  const shx = (Math.random() - 0.5) * game.shake, shy = (Math.random() - 0.5) * game.shake;
  camera.position.set(camX + shx, camY + shy, camZ);
  camera.lookAt(lookX, lookY, lookZ);
  skyGroup.position.set(camX * 0.96, 0, camZ * 0.96);
}

/* ---------- HUD (DOM) ---------- */
const hud = {
  hp: $('hpfill'), runes: $('runes'), axe: $('axeState'),
  prog: $('progFill'), banner: $('banner'),
  bn: document.querySelector('#banner .bn'), bt: document.querySelector('#banner .bt'), bs: document.querySelector('#banner .bs'),
  bossWrap: $('bossWrap'), bossName: $('bossName'), bossFill: $('bossFill'),
  hint: $('hintLine'), e: $('ePrompt'), fx: $('fx'),
};
for (const c of CHAPTERS) {
  const tick = document.createElement('div');
  tick.className = 'chapTick';
  tick.style.left = (c.x0 / WORLD_END * 100) + '%';
  $('progress').appendChild(tick);
}

const _proj = new THREE.Vector3();
function project2d(x, y, z) {
  _proj.set(x, y, z).project(camera);
  return { sx: (_proj.x * 0.5 + 0.5) * innerWidth, sy: (-_proj.y * 0.5 + 0.5) * innerHeight, behind: _proj.z > 1 };
}

function syncHUD() {
  const p = game.player;
  hud.hp.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
  hud.runes.textContent = p.runes;
  const held = game.axe.state === 'held';
  hud.axe.textContent = held ? '🪓 AXE READY' : '🪓 K TO RECALL';
  hud.axe.classList.toggle('away', !held);
  hud.prog.style.width = (p.x / WORLD_END * 100) + '%';

  if (game.bannerT > 0 && game.banner) {
    const a = Math.min(1, Math.min(game.bannerT / 40, (210 - game.bannerT) / 40));
    hud.banner.style.opacity = a;
    hud.bn.textContent = game.banner.name;
    hud.bt.textContent = game.banner.title;
    hud.bs.textContent = game.banner.sub;
  } else hud.banner.style.opacity = 0;

  const ab = activeBoss();
  if (ab && game.state === 'play') {
    hud.bossWrap.style.display = 'block';
    hud.bossName.textContent = ETYPES[ab.type].name;
    hud.bossFill.style.width = Math.max(0, ab.hp / ab.maxHp * 100) + '%';
    hud.bossFill.style.background = ab.type === 'hydra' ? '#e2603a' : ab.type === 'churn' ? '#7de0a0' : '#8a2be2';
  } else hud.bossWrap.style.display = 'none';

  hud.hint.textContent = game.state === 'play' ? game.hint : '';

  for (const d of game.dmgNums) {
    if (!d.el) continue;
    const pr = project2d(d.x, d.y, d.z);
    d.el.style.left = pr.sx + 'px';
    d.el.style.top = pr.sy + 'px';
    d.el.style.opacity = pr.behind ? 0 : Math.min(1, d.life / 24);
  }

  const n = game.state === 'play' ? nearestInteractable() : null;
  if (n) {
    const top = n.kind === 'sign' ? 130 : 265;
    const pr = project2d(n.obj.x, gH(n.obj.x, n.obj.z) + top, n.obj.z);
    hud.e.style.display = pr.behind ? 'none' : 'flex';
    hud.e.style.left = pr.sx + 'px';
    hud.e.style.top = (pr.sy + Math.sin(game.t * 0.12) * 5) + 'px';
  } else hud.e.style.display = 'none';
}

/* ---------- render ---------- */
function render() {
  syncAtmosphere();
  syncPlayer();
  for (const e of game.enemies) syncEnemy(e);
  for (const b of game.bosses) {
    if (b.dead) {
      if (b._obj) {
        b.deadT = (b.deadT || 0) + 1;
        const k = Math.max(0, 1 - b.deadT / 70);
        if (k <= 0) { disposeEntity(b); }
        else { b._obj.scale.set(k, k, k); b._obj.position.y -= 0.6; if (b._shadow) b._shadow.visible = false; }
      }
    } else if (b.active || Math.abs(b.x - game.player.x) < 2400) {
      syncEnemy(b);
    }
  }
  syncWorldFx();
  syncCamera();
  syncHUD();
  renderer.render(scene, camera);
}

/* ---------- main loop ---------- */
let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(64, ts - last); last = ts; acc += dt;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 4) { update(); acc -= 1000 / 60; steps++; }
  render();
}
requestAnimationFrame(loop);
