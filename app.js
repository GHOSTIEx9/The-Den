/* the den — vintage classic radio + live visualizers */
(() => {
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/* ============ STATIONS: classic songs only (all streams verified) ============ */
const STATIONS = [
  { id: "7soul", name: "Seven Inch Soul", sub: "vintage soul 45s", freq: 88.5 },
  { id: "secretagent", name: "Secret Agent", sub: "spy lounge", freq: 89.9 },
  { id: "seventies", name: "Left Coast 70s", sub: "seventies classics", freq: 91.3 },
  { id: "u80s", name: "Underground 80s", sub: "eighties classics", freq: 94.7 },
  { id: "indiepop", name: "Indie Pop Rocks", sub: "indie classics", freq: 96.3 },
  { id: "covers", name: "Covers", sub: "classics, covered", freq: 97.9 },
  { id: "lush", name: "Lush", sub: "dreampop classics", freq: 99.5 },
  { id: "bootliquor", name: "Boot Liquor", sub: "americana roots", freq: 101.1 },
  { id: "reggae", name: "Reggae", sub: "roots classics", freq: 102.7 },
  { id: "bossa", name: "Bossa Beyond", sub: "bossa classics", freq: 103.7 },
  { id: "tikitime", name: "Tiki Time", sub: "vintage exotica", freq: 105.9 },
  { id: "sonicuniverse", name: "Sonic Universe", sub: "soul-jazz", freq: 107.7 },
];
const FMIN = 87.5, FMAX = 108;

/* ============ RADIO STATE ============ */
const radioEl = new Audio();
radioEl.preload = "none";
radioEl.crossOrigin = "anonymous";
radioEl.volume = 0.8;
let stationIdx = -1;
let powered = false;
let sleepSecs = 0, sleepInt = null;
const SLEEP_STEPS = [0, 15, 30, 60];
let sleepStep = 0;

/* analyser graph (falls back to simulated groove if stream is not analysable) */
let actx = null, analyser = null, freqData = null, timeData = null, simMode = true;
function ensureGraph() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = actx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    const src = actx.createMediaElementSource(radioEl);
    src.connect(analyser);
    analyser.connect(actx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
  } catch { actx = null; }
}
setInterval(() => {
  if (!analyser || radioEl.paused) { simMode = true; return; }
  analyser.getByteFrequencyData(freqData);
  let sum = 0;
  for (let i = 0; i < freqData.length; i++) sum += freqData[i];
  simMode = sum < 40; // CORS-muted streams read as silence -> simulate the groove
}, 700);

/* simulated groove (also used for idle motion) */
const simBins = new Float32Array(64);
function simSpectrum(t, energy) {
  const beat = Math.pow(Math.max(0, Math.sin(t * 2.3)), 6);
  for (let i = 0; i < 64; i++) {
    const k = i / 64;
    const target = energy * (
      0.34 * (1 - k) + 0.14 +
      0.22 * Math.sin(t * 2 + i * 0.45) * (1 - k) +
      0.16 * Math.sin(t * 3.7 + i * 1.2) * k +
      0.4 * beat * (1 - k) * (1 - k)
    );
    simBins[i] += (Math.max(0.02, target) - simBins[i]) * 0.35;
  }
  return simBins;
}
function liveSpectrum(t) {
  const playing = powered && !radioEl.paused;
  if (!simMode && analyser) {
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);
    return { freq: freqData, time: timeData, energy: playing ? 1 : 0.2 };
  }
  return { freq: simSpectrum(t, playing ? 1 : 0.22), time: null, energy: playing ? 1 : 0.22 };
}

/* ============ VISUALIZERS ============ */
const canvas = $("#viz");
const ctx = canvas.getContext("2d");
let W = 0, H = 0;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize); resize();

function glowDot(x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = a; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}
/* ---- living rooms: shared bits (radio sits on the table at bottom) ---- */
const TABLE_Y_OFF = 172;
let RP = {};
function seedRoom() {
  RP.snow = Array.from({ length: 130 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1, 3.2), s: rand(.5, 1.7), ph: rand(0, TAU) }));
  RP.rain = Array.from({ length: 150 }, () => ({ x: rand(0, W), y: rand(0, H), l: rand(9, 22), s: rand(8, 18) }));
  RP.embers = Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(H * .4, H), vy: rand(.4, 1.6), r: rand(1, 3), life: rand(0, 1) }));
  RP.motes = Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.8, 2.2), vy: rand(-.22, -.05), ph: rand(0, TAU) }));
  RP.flies = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(H * .2, H * .8), r: rand(1, 2.5), ph: rand(0, TAU), sp: rand(.2, .8) }));
  RP.birds = Array.from({ length: 4 }, () => ({ x: rand(0, W), y: 0, s: rand(.5, 1), ph: rand(0, TAU) }));
  RP.stars = Array.from({ length: 120 }, () => ({ x: rand(0, W), y: rand(0, H * .4), r: rand(.4, 1.6), ph: rand(0, TAU) }));
}
seedRoom();
window.addEventListener("resize", seedRoom);
function roomWall(top, bottom, floorC) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(0.62, bottom); g.addColorStop(0.621, floorC); g.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 2;
  for (let y = H * 0.68; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}
function roomWindow(x, y, w, h, sky) {
  ctx.save();
  ctx.fillStyle = "rgba(10,6,4,.92)";
  ctx.fillRect(x - 14, y - 14, w + 28, h + 28);
  ctx.strokeStyle = "rgba(245,234,217,.8)"; ctx.lineWidth = 3;
  ctx.strokeRect(x - 14, y - 14, w + 28, h + 28);
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  sky(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = "rgba(20,12,8,.9)"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  const sh = ctx.createLinearGradient(x, y, x + w, y + h);
  sh.addColorStop(0, "rgba(255,255,255,.13)"); sh.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = sh; ctx.fillRect(x, y, w, h);
}
const winWrap = (x, w, raw) => x + ((((raw - x) % w) + w) % w);
function drawTable() {
  const ty = H - TABLE_Y_OFF;
  ctx.fillStyle = "#6b4423"; ctx.fillRect(0, ty, W, 24);
  ctx.fillStyle = "rgba(255,225,180,.28)"; ctx.fillRect(0, ty, W, 3);
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
  for (let x = 40; x < W; x += 130) { ctx.beginPath(); ctx.moveTo(x, ty + 4); ctx.lineTo(x - 14, ty + 24); ctx.stroke(); }
  const fg = ctx.createLinearGradient(0, ty + 24, 0, H);
  fg.addColorStop(0, "#3a2210"); fg.addColorStop(1, "#150b04");
  ctx.fillStyle = fg; ctx.fillRect(0, ty + 24, W, H - ty - 24);
  glowDot(W / 2, ty - 120, 420, "#e8a04c", 0.10);
  // mug + books resting on the table beside the radio
  ctx.fillStyle = "#f5ead9"; ctx.fillRect(66, ty - 30, 30, 30);
  ctx.fillStyle = "#a83a3a"; ctx.fillRect(W - 120, ty - 18, 54, 18);
  ctx.fillStyle = "#3a6ea8"; ctx.fillRect(W - 114, ty - 32, 48, 14);
}
function rug(cx, y, w, c1, c2) {
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.ellipse(cx, y, w, 26, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = c2; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(cx, y, w - 18, 17, 0, 0, TAU); ctx.stroke();
}
function plant(x, y, s, t) {
  ctx.strokeStyle = "#2c4a24"; ctx.lineWidth = 6 * s; ctx.lineCap = "round";
  for (let k = 0; k < 5; k++) {
    const sway = Math.sin(t * 1.1 + k * 1.7) * 8;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 14 + sway, y - 60 * s, x + 40 + sway * 2, y - 110 * s - k * 12); ctx.stroke();
  }
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(x - 22 * s, y - 6, 44 * s, 34 * s);
}
function flames(fx, fy, t, s = 1) {
  glowDot(fx, fy - 50 * s, 190 * s, "#ff7a3c", 0.5 + Math.sin(t * 7) * 0.07);
  ctx.save(); ctx.translate(fx, fy);
  ctx.fillStyle = "#2a160c"; ctx.fillRect(-80 * s, -12 * s, 160 * s, 18 * s);
  for (let k = 0; k < 3; k++) {
    const f = Math.sin(t * (6 + k * 2.3) + k * 2) * 10;
    const grad = ctx.createLinearGradient(0, 0, 0, -110 * s - f);
    grad.addColorStop(0, "#ff3d00"); grad.addColorStop(0.5, "#ff8a3c"); grad.addColorStop(1, "rgba(255,220,150,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-40 * s + k * 38 * s, 0);
    ctx.bezierCurveTo(-60 * s + k * 38 * s, -44 * s - f, -16 * s + k * 38 * s, -62 * s - f, -20 * s + k * 38 * s, -104 * s - f);
    ctx.bezierCurveTo(-16 * s + k * 38 * s, -62 * s - f, 16 * s + k * 38 * s, -48 * s - f, -20 * s + k * 38 * s - 20 * s, 0);
    ctx.fill();
  }
  ctx.restore();
}
function floorLamp(x, y, t, color = "#ffd9a0") {
  ctx.fillStyle = "#1c120a"; ctx.fillRect(x - 4, y - 150, 8, 150);
  ctx.fillStyle = "#3a2812";
  ctx.beginPath(); ctx.moveTo(x - 30, y - 150); ctx.lineTo(x + 30, y - 150); ctx.lineTo(x + 18, y - 196); ctx.lineTo(x - 18, y - 196); ctx.fill();
  glowDot(x, y - 150, 150, color, 0.5 + Math.sin(t * 2) * 0.04);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y - 158, 10, 0, TAU); ctx.fill();
}
function shelf(x, y, w) {
  ctx.fillStyle = "#4a2e16"; ctx.fillRect(x, y, w, 12);
  const cols = ["#a83a3a", "#3a6ea8", "#3aa86b", "#c8a03a", "#7a4aa8"];
  let bx = x + 8, k = 0;
  while (bx < x + w - 22) {
    const bw = 12 + ((bx * 7) % 10), bh = 46 + ((bx * 13) % 26);
    ctx.fillStyle = cols[k++ % cols.length];
    ctx.fillRect(bx, y - bh, bw, bh);
    bx += bw + 3;
  }
}
function motes(t) {
  ctx.fillStyle = "rgba(255,244,220,.5)";
  for (const m of RP.motes) {
    m.y += m.vy; if (m.y < 0) { m.y = H; m.x = rand(0, W); }
    ctx.beginPath(); ctx.arc(m.x + Math.sin(t + m.ph) * 18, m.y, m.r, 0, TAU); ctx.fill();
  }
}
const VIZ = {
  cabin(spec, t) {
    roomWall("#2a180c", "#4a2c14", "#241204");
    // stone fireplace, left
    ctx.fillStyle = "#5a5a60"; ctx.fillRect(W * 0.04, H * 0.30, 200, 240);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    for (let by = H * 0.30; by < H * 0.30 + 240; by += 30) ctx.fillRect(W * 0.04, by, 200, 3);
    ctx.fillStyle = "#171210"; ctx.fillRect(W * 0.04 + 30, H * 0.30 + 90, 140, 140);
    flames(W * 0.04 + 100, H * 0.30 + 222, t, 0.9);
    for (const e of RP.embers) {
      e.y -= e.vy * 2; e.life += 0.01;
      if (e.y < H * 0.2 || e.life > 1) { e.y = H * 0.30 + 200; e.x = W * 0.04 + rand(30, 170); e.life = 0; }
      ctx.globalAlpha = 1 - e.life;
      glowDot(e.x, e.y, e.r * 5, "#ffb15e", 0.8);
      ctx.globalAlpha = 1;
    }
    // snowy night window, right
    const wx = W * 0.68, wy = H * 0.10, ww = Math.min(320, W * 0.24), wh = H * 0.34;
    roomWindow(wx, wy, ww, wh, (x, y, w, h) => {
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, "#0e1a33"); sky.addColorStop(1, "#3a4a6e");
      ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#eef3ff"; ctx.beginPath(); ctx.arc(x + w * 0.7, y + h * 0.25, 18, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      for (const s of RP.snow) {
        s.y += s.s; s.x += Math.sin(t + s.ph) * 0.4;
        if (s.y > y + h + 4) { s.y = y - 4; }
        const px = winWrap(x, w, s.x);
        if (s.y < y) continue;
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(px, s.y, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    shelf(W * 0.34, H * 0.42, 180);
    rug(W * 0.5, H * 0.74, 190, "#7a2a20", "#e8a04c");
    plant(W * 0.60, H * 0.62, 0.8, t);
    motes(t);
    drawTable();
  },
  loft(spec, t) {
    roomWall("#191921", "#2b2135", "#14101c");
    // big rainy city window
    const wx = W * 0.5 - Math.min(430, W * 0.32), wy = H * 0.08, ww = Math.min(860, W * 0.64), wh = H * 0.40;
    roomWindow(wx, wy, ww, wh, (x, y, w, h) => {
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, "#0c1230"); sky.addColorStop(0.6, "#27305e"); sky.addColorStop(1, "#4a3560");
      ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#f5ead9"; ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.24, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = "#0a0d1f";
      let bx = x;
      const hs = [0.5, 0.8, 0.45, 0.9, 0.6, 0.7, 0.55];
      let k = 0;
      while (bx < x + w) {
        const bw2 = 34 + hs[k % hs.length] * 50, bh = h * (0.35 + hs[(k + 3) % hs.length] * 0.5);
        ctx.fillRect(bx, y + h - bh, bw2, bh);
        ctx.fillStyle = "rgba(255,110,200,.8)";
        for (let yy = y + h - bh + 8; yy < y + h - 6; yy += 14)
          for (let xx = bx + 6; xx < bx + bw2 - 6; xx += 12)
            if ((xx * 7 + yy * 13 + k * 29) % 6 < 2) ctx.fillRect(xx, yy, 4, 6);
        ctx.fillStyle = "rgba(78,216,255,.7)";
        ctx.fillRect(bx + 4, y + h - bh - 26, 8, 22);
        ctx.fillStyle = "#0a0d1f"; bx += bw2 + 5; k++;
      }
      ctx.strokeStyle = "rgba(170,200,255,.45)"; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const d of RP.rain) {
        d.y += d.s; d.x -= 1.6;
        if (d.y > y + h) { d.y = y - 18; }
        const px = winWrap(x, w, d.x);
        if (d.y < y) continue;
        ctx.moveTo(px, d.y); ctx.lineTo(px - 2, d.y + d.l);
      }
      ctx.stroke();
    });
    floorLamp(W * 0.10, H * 0.66, t, "#ff9a5e");
    plant(W * 0.88, H * 0.64, 1, t);
    rug(W * 0.5, H * 0.74, 210, "#2c2c3e", "#ff4ecd");
    motes(t);
    drawTable();
  },
  sunset(spec, t) {
    roomWall("#5e3a1e", "#8a5a30", "#3a2412");
    const wx = W * 0.5 - Math.min(400, W * 0.3), wy = H * 0.08, ww = Math.min(800, W * 0.6), wh = H * 0.40;
    roomWindow(wx, wy, ww, wh, (x, y, w, h) => {
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, "#ffe9c4"); sky.addColorStop(0.55, "#ffc98a"); sky.addColorStop(1, "#ff9a5e");
      ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
      const sx = x + w * 0.5 + Math.sin(t * 0.3) * 6, sy = y + h * 0.62;
      glowDot(sx, sy, 150, "#fff3d0", 0.95);
      ctx.fillStyle = "#fff6dd"; ctx.beginPath(); ctx.arc(sx, sy, 44, 0, TAU); ctx.fill();
      ctx.fillStyle = "#9db877"; ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.55, x + w * 0.55, y + h * 0.8);
      ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.6, x + w, y + h * 0.78);
      ctx.lineTo(x + w, y + h); ctx.fill();
      ctx.strokeStyle = "rgba(90,60,40,.8)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      for (const b of RP.birds) {
        b.x += b.s * 0.7; if (b.x > x + w + 20) { b.x = x - 20; b.y = rand(y + h * 0.15, y + h * 0.4); }
        if (!b.y) b.y = rand(y + h * 0.15, y + h * 0.4);
        const f = Math.sin(t * 6 + b.ph) * 5;
        ctx.beginPath();
        ctx.moveTo(b.x - 9, b.y); ctx.quadraticCurveTo(b.x - 3, b.y - 5 - f, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 3, b.y - 5 - f, b.x + 9, b.y); ctx.stroke();
      }
    });
    shelf(W * 0.06, H * 0.44, 200);
    shelf(W * 0.06, H * 0.56, 200);
    plant(W * 0.90, H * 0.64, 1.1, t);
    rug(W * 0.5, H * 0.74, 200, "#a85a20", "#ffe9c4");
    glowDot(W * 0.5, H * 0.4, 300, "#ffb15e", 0.14);
    motes(t);
    drawTable();
  },
  forest(spec, t) {
    roomWall("#1c2e1a", "#33502e", "#1c2a16");
    const wx = W * 0.5 - Math.min(400, W * 0.3), wy = H * 0.08, ww = Math.min(800, W * 0.6), wh = H * 0.40;
    roomWindow(wx, wy, ww, wh, (x, y, w, h) => {
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, "#bfe3ee"); sky.addColorStop(1, "#e8f3d0");
      ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
      glowDot(x + w * 0.8, y + h * 0.2, 90, "#fff6da", 0.9);
      const layer = (base, color, seed) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y + h);
        for (let xx = 0; xx <= w; xx += 14) {
          const hh = y + h * base + Math.sin(xx * 0.02 + seed) * 12;
          ctx.lineTo(x + xx, hh);
        }
        ctx.lineTo(x + w, y + h); ctx.fill();
      };
      layer(0.55, "#5a8a4e", 1.7); layer(0.7, "#3a6b34", 4.2); layer(0.85, "#24451f", 8.8);
      for (const f of RP.flies) {
        f.x += Math.sin(t * f.sp + f.ph) * 0.7; f.y += Math.cos(t * f.sp * 0.7 + f.ph) * 0.5;
        const px = winWrap(x, w, f.x);
        const a = 0.35 + Math.abs(Math.sin(t * 1.8 + f.ph)) * 0.65;
        ctx.fillStyle = `rgba(255,255,200,${a})`;
        ctx.beginPath(); ctx.arc(px, Math.min(Math.max(f.y, y + 4), y + h - 4), f.r, 0, TAU); ctx.fill();
      }
    });
    // bookshelf right
    ctx.fillStyle = "#3a2812"; ctx.fillRect(W * 0.86, H * 0.18, 130, 330);
    ctx.fillStyle = "#241708";
    for (let sy = H * 0.18 + 80; sy < H * 0.18 + 330; sy += 82) ctx.fillRect(W * 0.86, sy, 130, 10);
    const cols = ["#a83a3a", "#3a6ea8", "#3aa86b", "#c8a03a"];
    for (let s = 0; s < 3; s++)
      for (let b = 0; b < 6; b++) {
        ctx.fillStyle = cols[(s * 6 + b) % cols.length];
        ctx.fillRect(W * 0.86 + 10 + b * 19, H * 0.18 + 34 + s * 82, 14, 46);
      }
    plant(W * 0.08, H * 0.64, 1, t);
    rug(W * 0.42, H * 0.74, 200, "#3a5a34", "#d8c890");
    motes(t);
    drawTable();
  },
  attic(spec, t) {
    roomWall("#141a2e", "#27304a", "#181420");
    // skylight with night rain
    const wx = W * 0.5 - Math.min(360, W * 0.27), wy = H * 0.06, ww = Math.min(720, W * 0.54), wh = H * 0.36;
    roomWindow(wx, wy, ww, wh, (x, y, w, h) => {
      ctx.fillStyle = "#060a18"; ctx.fillRect(x, y, w, h);
      for (const s of RP.stars) {
        const px = winWrap(x, w, s.x);
        const a = 0.3 + Math.abs(Math.sin(t * 1.4 + s.ph)) * 0.7;
        ctx.fillStyle = `rgba(220,235,255,${a})`;
        ctx.fillRect(px, y + ((s.y / H) * h * 1.6) % h, s.r, s.r);
      }
      ctx.fillStyle = "#f2f7ff"; ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.26, 22, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(170,200,255,.5)"; ctx.lineWidth = 1.3; ctx.beginPath();
      for (const d of RP.rain) {
        d.y += d.s * 1.1;
        if (d.y > y + h) { d.y = y - 16; }
        const px = winWrap(x, w, d.x);
        if (d.y < y) continue;
        ctx.moveTo(px, d.y); ctx.lineTo(px - 2, d.y + d.l);
      }
      ctx.stroke();
    });
    floorLamp(W * 0.12, H * 0.66, t, "#ffd9a0");
    // crates + rug
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(W * 0.80, H * 0.52, 90, 70); ctx.fillRect(W * 0.86, H * 0.42, 70, 60);
    ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.80, H * 0.52, 90, 70); ctx.strokeRect(W * 0.86, H * 0.42, 70, 60);
    shelf(W * 0.30, H * 0.50, 170);
    rug(W * 0.5, H * 0.74, 190, "#3e3e5e", "#9fd8ff");
    motes(t);
    drawTable();
  },
};
const VIZ_ORDER = [
  { id: "cabin", name: "Ember Cabin" },
  { id: "loft", name: "City Loft" },
  { id: "sunset", name: "Sunset Studio" },
  { id: "forest", name: "Forest Lodge" },
  { id: "attic", name: "Rainy Attic" },
];
let vizId = "cabin";
const vizPicker = $("#vizPicker");
VIZ_ORDER.forEach((v) => {
  const b = document.createElement("button");
  b.textContent = v.name;
  b.className = v.id === vizId ? "on" : "";
  b.onclick = () => {
    vizId = v.id;
    $$("#vizPicker button").forEach((x) => x.classList.toggle("on", x === b));
  };
  vizPicker.appendChild(b);
});
/* in-radio signal scope */
const scopeC = $("#scope"), sctx = scopeC.getContext("2d");
function drawScope(spec) {
  const w = scopeC.width, h = scopeC.height;
  sctx.clearRect(0, 0, w, h);
  const on = powered && !radioEl.paused;
  const n = 48, bw = w / n;
  for (let i = 0; i < n; i++) {
    const v = spec.freq[Math.floor((i / n) * spec.freq.length)] / 255;
    const bh = Math.max(2, v * h * 0.92);
    sctx.globalAlpha = on ? 0.92 : 0.4;
    sctx.fillStyle = on ? "#52ff8c" : "#2a4a34";
    sctx.shadowColor = "#52ff8c"; sctx.shadowBlur = on ? 8 * v : 0;
    sctx.fillRect(i * bw + 1, (h - bh) / 2, bw - 2, bh);
  }
  sctx.shadowBlur = 0; sctx.globalAlpha = 1;
  if (spec.time && on) {
    sctx.strokeStyle = "#e8ffb0"; sctx.lineWidth = 1.6;
    sctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const v = (spec.time[Math.floor((i / 120) * (spec.time.length - 1))] - 128) / 128;
      const x = (i / 120) * w, y = h / 2 + v * h * 0.4;
      i ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
    }
    sctx.stroke();
  }
  // scanline sweep
  const sx = ((performance.now() / 1000) * 140) % (w + 80) - 40;
  const g = sctx.createLinearGradient(sx - 40, 0, sx, 0);
  g.addColorStop(0, "rgba(82,255,140,0)"); g.addColorStop(1, "rgba(82,255,140,.16)");
  sctx.fillStyle = g; sctx.fillRect(sx - 40, 0, 40, h);
}
function loop(ts) {
  const t = ts / 1000;
  radioEl.volume += (volTarget - radioEl.volume) * 0.2;
  renderKnob();
  const spec = liveSpectrum(t);
  VIZ[vizId](spec, t);
  drawScope(spec);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ============ DIAL ============ */
const dialScale = $("#dialScale");
[88, 92, 96, 100, 104, 108].forEach((f) => {
  const s = document.createElement("span");
  s.textContent = f;
  dialScale.appendChild(s);
});
function needleTo(freq) {
  const pct = 5 + ((freq - FMIN) / (FMAX - FMIN)) * 90;
  $("#needle").style.left = pct + "%";
}
needleTo(87.5);

/* ============ PLAYER ============ */
function paintPresets() {
  const box = $("#presetBtns");
  box.innerHTML = "";
  STATIONS.forEach((st, i) => {
    const b = document.createElement("button");
    b.className = "preset-btn" + (i === stationIdx && powered ? " on" : "");
    b.innerHTML = `<b>${i + 1} · ${st.freq.toFixed(1)}</b><small>${st.name}</small>`;
    b.onclick = () => tuneTo(i, true);
    box.appendChild(b);
  });
}
function paintLCD(status) {
  const st = STATIONS[stationIdx];
  $("#lcdStation").textContent = powered && st ? `${st.name} — ${st.sub}` : "— pick a station —";
  $("#lcdFreq").textContent = (st ? st.freq : FMIN).toFixed(1) + " MHz";
  $("#lcdLive").classList.toggle("hidden", !(powered && !radioEl.paused));
  if (status !== undefined) $("#lcdStatus").textContent = status;
  $("#radio").classList.toggle("off", !powered);
}
function tuneTo(i, autoplay) {
  stationIdx = (i + STATIONS.length) % STATIONS.length;
  const st = STATIONS[stationIdx];
  needleTo(st.freq);
  paintPresets();
  if (autoplay || powered) startStation();
  else paintLCD();
}
function startStation() {
  const st = STATIONS[stationIdx];
  if (!st) return;
  ensureGraph();
  powered = true;
  try { radioEl.pause(); } catch {}
  radioEl.src = `https://ice1.somafm.com/${st.id}-128-mp3`;
  paintLCD("tuning…");
  paintPresets();
  radioEl.play()
    .then(() => paintLCD("crank it up 〜"))
    .catch(() => paintLCD("tap a preset to start the stream"));
  setTimeout(() => { if (powered) paintLCD(""); }, 4000);
}
function powerOff(silent) {
  powered = false;
  try { radioEl.pause(); radioEl.removeAttribute("src"); radioEl.load(); } catch {}
  if (actx) actx.suspend().catch(() => {});
  $("#knobPower").classList.remove("lit", "turned");
  paintPresets();
  paintLCD(silent ? "" : "power off — shhh…");
  clearInterval(sleepInt); sleepSecs = 0; sleepStep = 0; paintSleep();
}
function powerToggle() {
  if (powered) { powerOff(); return; }
  $("#knobPower").classList.add("lit", "turned");
  if (stationIdx < 0) tuneTo(0, true);
  else startStation();
}
radioEl.addEventListener("playing", () => paintLCD(""));
radioEl.addEventListener("waiting", () => { if (powered) paintLCD("buffering…"); });
radioEl.addEventListener("error", () => { if (powered) paintLCD("static… try another preset"); });

$("#knobPower").onclick = powerToggle;
$("#knobPower").onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); powerToggle(); } };
$("#btnPrevTune").onclick = () => tuneTo(stationIdx < 0 ? 0 : stationIdx - 1, true);
$("#btnNextTune").onclick = () => tuneTo(stationIdx < 0 ? 0 : stationIdx + 1, true);

/* volume knob: true rotary drag + fine scroll + eased motion */
let volTarget = 0.8;
function renderKnob() {
  const deg = -135 + radioEl.volume * 270;
  $("#knobVol span").style.transform = `rotate(${deg}deg)`;
}
function setVol(v, show) {
  volTarget = Math.min(1, Math.max(0, v));
  if (show) {
    paintLCD(`volume ${Math.round(volTarget * 100)}%`);
    clearTimeout(setVol._t);
    setVol._t = setTimeout(() => paintLCD(""), 1200);
  }
}
function knobAngle(e, el) {
  const r = el.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  return Math.atan2(dx, -dy) * 180 / Math.PI; // 0° = up, clockwise positive
}
setVol(0.8); radioEl.volume = 0.8; renderKnob();
(function () {
  const knob = $("#knobVol");
  let dragging = false, lastA = 0, acc = 0;
  knob.addEventListener("pointerdown", (e) => {
    dragging = true; lastA = knobAngle(e, knob); acc = volTarget * 270;
    knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const a = knobAngle(e, knob);
    let d = a - lastA;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    lastA = a; acc = Math.min(270, Math.max(0, acc + d));
    setVol(acc / 270, true);
  });
  const stop = () => (dragging = false);
  knob.addEventListener("pointerup", stop);
  knob.addEventListener("pointercancel", stop);
  knob.addEventListener("wheel", (e) => {
    e.preventDefault();
    const step = e.shiftKey ? 0.01 : 0.05;
    setVol(volTarget + (e.deltaY < 0 ? step : -step), true);
  }, { passive: false });
  knob.addEventListener("dblclick", () => setVol(volTarget > 0 ? 0 : 0.8, true));
})();

/* sleep timer knob */
function paintSleep() {
  const mins = SLEEP_STEPS[sleepStep];
  $("#sleepLabel").textContent = mins ? `sleep · ${mins}m` : "sleep · off";
  $("#knobSleep").classList.toggle("lit", mins > 0);
  $("#lcdSleep").textContent = sleepSecs > 0
    ? `☾ ${Math.floor(sleepSecs / 60)}:${String(sleepSecs % 60).padStart(2, "0")}`
    : "";
}
$("#knobSleep").onclick = () => {
  sleepStep = (sleepStep + 1) % SLEEP_STEPS.length;
  clearInterval(sleepInt);
  sleepSecs = SLEEP_STEPS[sleepStep] * 60;
  if (sleepSecs > 0) {
    if (!powered) powerToggle();
    paintLCD(`sleep in ${SLEEP_STEPS[sleepStep]} min ☾`);
    sleepInt = setInterval(() => {
      sleepSecs--;
      if (sleepSecs <= 0) {
        clearInterval(sleepInt);
        // fade out (eased by the main loop) then power off
        const v0 = volTarget, t0 = performance.now();
        const f = setInterval(() => {
          const k = Math.min(1, (performance.now() - t0) / 6000);
          setVol(v0 * (1 - k));
          if (k >= 1) { clearInterval(f); setVol(v0); powerOff(true); paintLCD("goodnight ✦"); }
        }, 120);
      }
      paintSleep();
    }, 1000);
    setTimeout(() => { if (powered) paintLCD(""); }, 2500);
  }
  paintSleep();
  const ks = $("#knobSleep");
  ks.classList.add("turned");
  setTimeout(() => ks.classList.remove("turned"), 350);
};
paintSleep();

/* clock */
setInterval(() => {
  const d = new Date();
  $("#lcdClock").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}, 1000);

/* hide UI */
function setHidden(h) {
  document.body.classList.toggle("ui-hidden", h);
  $("#showUi").classList.toggle("hidden", !h);
}
$("#showUi").onclick = () => setHidden(false);
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");
  if (typing) return;
  if (e.key === "h" || e.key === "H") setHidden(!document.body.classList.contains("ui-hidden"));
  else if (e.key === " ") { e.preventDefault(); powerToggle(); }
  else if (e.key === "ArrowRight") tuneTo(stationIdx < 0 ? 0 : stationIdx + 1, true);
  else if (e.key === "ArrowLeft") tuneTo(stationIdx < 0 ? 0 : stationIdx - 1, true);
  else if (e.key === "ArrowUp") { e.preventDefault(); setVol(volTarget + 0.05, true); }
  else if (e.key === "ArrowDown") { e.preventDefault(); setVol(volTarget - 0.05, true); }
  else if (e.key >= "1" && e.key <= "9") tuneTo(+e.key - 1, true);
  else if (e.key === "0") tuneTo(9, true);
});

paintPresets();
paintLCD("press power ⏻");
document.title = "the den — classic radio";
})();
