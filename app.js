/* the den v2 — simple cozy focus */
(() => {
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/* ============ SCENES ============ */
const canvas = $("#scene");
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

const SCENES = [
  { id: "loft", name: "Midnight Loft", sub: "rain on glass", c: ["#1b2340", "#e8a04c"] },
  { id: "tokyo", name: "Tokyo Rain", sub: "neon streets", c: ["#0b0b22", "#ff4ecd"] },
  { id: "cabin", name: "Ember Cabin", sub: "fireplace + snow", c: ["#2b1408", "#ff7a3c"] },
  { id: "forest", name: "Moss Forest", sub: "fireflies + mist", c: ["#0d241c", "#7fb069"] },
  { id: "sakura", name: "Sakura Garden", sub: "spring breeze", c: ["#ffd6e7", "#7fb069"] },
  { id: "ocean", name: "Starlit Ocean", sub: "moon tides", c: ["#0a162e", "#9fd8ff"] },
  { id: "cosmos", name: "Deep Cosmos", sub: "sleep voyage", c: ["#0a0618", "#8b7bff"] },
  { id: "cafe", name: "Morning Café", sub: "sunrise + steam", c: ["#f2c98a", "#e76f51"] },
  { id: "autumn", name: "Autumn Porch", sub: "falling leaves", c: ["#7a2e0e", "#e8a04c"] },
  { id: "snow", name: "Quiet Snow", sub: "deep sleep", c: ["#223449", "#e8ecff"] },
];
let currentScene = "loft";
let P = {};

function seedParticles() {
  P.rain = Array.from({ length: 170 }, () => ({ x: rand(0, W), y: rand(0, H), l: rand(10, 26), s: rand(9, 20) }));
  P.embers = Array.from({ length: 90 }, () => ({ x: rand(0, W), y: rand(H * .4, H), vy: rand(.4, 1.8), vx: rand(-.4, .4), r: rand(1, 3.4), life: rand(0, 1) }));
  P.snow = Array.from({ length: 160 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1, 3.6), s: rand(.4, 1.6), ph: rand(0, TAU) }));
  P.fireflies = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(H * .25, H * .95), r: rand(1, 2.8), ph: rand(0, TAU), sp: rand(.2, .8) }));
  P.stars = Array.from({ length: 200 }, () => ({ x: rand(0, W), y: rand(0, H * .65), r: rand(.4, 1.8), ph: rand(0, TAU) }));
  P.motes = Array.from({ length: 80 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.8, 2.4), vy: rand(-.25, -.05), ph: rand(0, TAU) }));
  P.waves = Array.from({ length: 5 }, (_, i) => ({ y: .66 + i * .06, amp: 10 + i * 5, sp: .5 + i * .22, ph: i * 1.3 }));
  P.shoot = { x: -100, y: -100, vx: 0, vy: 0, life: 0 };
  P.birds = Array.from({ length: 5 }, () => ({ x: rand(0, W), y: rand(H * .12, H * .3), s: rand(.6, 1.2), ph: rand(0, TAU) }));
  P.petals = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(2.5, 5.5), s: rand(.5, 1.4), ph: rand(0, TAU), rot: rand(0, TAU) }));
  P.leaves = Array.from({ length: 80 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(3, 6), s: rand(.6, 1.7), ph: rand(0, TAU), rot: rand(0, TAU) }));
  P.comets = [{ x: -100, y: -100, vx: 0, vy: 0, life: 0 }, { x: -100, y: -100, vx: 0, vy: 0, life: 0 }];
}
seedParticles();
window.addEventListener("resize", seedParticles);

function wallGradient(top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function glow(x, y, r, color, alpha = .5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function windowFrame(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(12,9,7,.85)";
  roundRect(x - 18, y - 18, w + 36, h + 36, 22); ctx.fill();
  ctx.strokeStyle = "rgba(245,234,217,.85)"; ctx.lineWidth = 4; roundRect(x - 18, y - 18, w + 36, h + 36, 22); ctx.stroke();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
}

const painters = {
  loft(t) {
    wallGradient("#151a30", "#241a20");
    const wx = W * .5 - Math.min(W * .36, 520), wy = H * .1, ww = Math.min(W * .72, 1040), wh = H * .52;
    windowFrame(wx, wy, ww, wh);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, "#0c1230"); sky.addColorStop(.6, "#27305e"); sky.addColorStop(1, "#4a3560");
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    glow(wx + ww * .78, wy + wh * .26, 90, "#f5ead9", .8);
    ctx.fillStyle = "#f5ead9"; ctx.beginPath(); ctx.arc(wx + ww * .78, wy + wh * .26, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = "#0a0d1f";
    let bx = wx, i = 0;
    const rng = [.5, .75, .45, .9, .6, .8, .7, .62, .88, .55, .72];
    while (bx < wx + ww) {
      const bw = 40 + rng[i % rng.length] * 60, bh = wh * (.3 + rng[(i + 3) % rng.length] * .45);
      ctx.fillRect(bx, wy + wh - bh, bw, bh);
      ctx.fillStyle = "rgba(232,160,76,.85)";
      for (let yy = wy + wh - bh + 10; yy < wy + wh - 8; yy += 16)
        for (let xx = bx + 7; xx < bx + bw - 7; xx += 14)
          if ((xx * 7 + yy * 13 + i * 29) % 5 < 2) ctx.fillRect(xx, yy, 5, 7);
      ctx.fillStyle = "#0a0d1f"; bx += bw + 6; i++;
    }
    ctx.strokeStyle = "rgba(180,210,255,.5)"; ctx.lineWidth = 1.4; ctx.beginPath();
    for (const d of P.rain) {
      d.y += d.s; d.x -= 2.2; if (d.y > wy + wh) { d.y = wy - 20; d.x = rand(wx, wx + ww); }
      if (d.y < wy) continue;
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + d.l);
    }
    ctx.stroke();
    ctx.restore();
    glow(W * .12, H * .72, 260, "#e8a04c", .26 + Math.sin(t * 2.1) * .03);
    ctx.fillStyle = "rgba(0,0,0,.42)"; ctx.fillRect(0, H * .82, W, H * .18);
  },
  tokyo(t) {
    wallGradient("#080818", "#1c0f2e");
    // building walls left + right with neon signs
    ctx.fillStyle = "#0d0d24";
    ctx.fillRect(0, 0, W * .16, H); ctx.fillRect(W * .84, 0, W * .16, H);
    const signs = [
      { x: W * .03, y: H * .14, w: W * .1, c: "#ff4ecd", txt: 1 },
      { x: W * .035, y: H * .34, w: W * .09, c: "#4ed8ff", txt: 0 },
      { x: W * .87, y: H * .2, w: W * .1, c: "#ffe14e", txt: 1 },
      { x: W * .875, y: H * .42, w: W * .09, c: "#7bff9e", txt: 0 },
    ];
    for (const s of signs) {
      const flick = .7 + Math.sin(t * 9 + s.x) * .08 + (Math.random() < .02 ? -.35 : 0);
      glow(s.x + s.w / 2, s.y + 26, 90, s.c, .5 * flick);
      ctx.globalAlpha = flick; ctx.fillStyle = s.c;
      roundRect(s.x, s.y, s.w, 52, 10); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(10,5,20,.85)";
      for (let k = 0; k < 3; k++) ctx.fillRect(s.x + 10, s.y + 10 + k * 13, s.w - 20, 5);
    }
    // wet street
    const st = ctx.createLinearGradient(0, H * .62, 0, H);
    st.addColorStop(0, "#141428"); st.addColorStop(1, "#050510");
    ctx.fillStyle = st; ctx.fillRect(W * .16, H * .62, W * .68, H * .38);
    for (const s of signs) {
      ctx.globalAlpha = .3; ctx.fillStyle = s.c;
      const rw = s.w * .8;
      ctx.fillRect(s.x + s.w / 2 - rw / 2 + W * .1, H * .64, rw, H * .3);
      ctx.globalAlpha = 1;
    }
    // rain
    ctx.strokeStyle = "rgba(170,200,255,.45)"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (const d of P.rain) {
      d.y += d.s * 1.2; d.x -= 1.4;
      if (d.y > H) { d.y = -20; d.x = rand(0, W); }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.l);
    }
    ctx.stroke();
    // passing train light
    const tx = ((t * 60) % (W + 400)) - 200;
    glow(tx, H * .5, 120, "#9fd8ff", .35);
  },
  cabin(t) {
    wallGradient("#1c0f08", "#3a1c0e");
    const wx = W * .66, wy = H * .1, ww = Math.max(W * .24, 200), wh = H * .4;
    windowFrame(wx, wy, ww, wh);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, "#0e1a33"); sky.addColorStop(1, "#3a4a6e");
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = "rgba(245,234,217,.9)";
    for (const s of P.snow) {
      s.y += s.s; s.x += Math.sin(t + s.ph) * .4;
      if (s.y > wy + wh) { s.y = wy - 6; s.x = rand(wx, wx + ww); }
      if (s.y < wy) continue;
      ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(Math.min(Math.max(s.x, wx + 4), wx + ww - 4), s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
    const fx = W * .38, fy = H * .78, fw = Math.min(420, W * .4), fh = 250;
    ctx.fillStyle = "#4a2c1c"; roundRect(fx - fw / 2 - 24, fy - fh, fw + 48, fh + 20, 26); ctx.fill();
    ctx.strokeStyle = "rgba(245,234,217,.5)"; ctx.lineWidth = 3; roundRect(fx - fw / 2 - 24, fy - fh, fw + 48, fh + 20, 26); ctx.stroke();
    ctx.fillStyle = "#120906"; roundRect(fx - fw / 2, fy - fh + 40, fw, fh - 40, 18); ctx.fill();
    glow(fx, fy - 60, 300, "#ff7a3c", .5 + Math.sin(t * 7) * .07);
    ctx.fillStyle = "#2a160c";
    ctx.save(); ctx.translate(fx, fy - 26);
    ctx.fillRect(-90, -12, 180, 20); ctx.fillRect(-70, -30, 150, 18);
    for (let k = 0; k < 3; k++) {
      const f = Math.sin(t * (6 + k * 2.3) + k * 2) * 12;
      const grad = ctx.createLinearGradient(0, 0, 0, -130 - f);
      grad.addColorStop(0, "#ff3d00"); grad.addColorStop(.5, "#ff8a3c"); grad.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-46 + k * 44, 0);
      ctx.bezierCurveTo(-70 + k * 44, -50 - f, -20 + k * 44, -70 - f, -24 + k * 44, -120 - f);
      ctx.bezierCurveTo(-20 + k * 44, -70 - f, 20 + k * 44, -55 - f, -2 + k * 44, 0);
      ctx.fill();
    }
    ctx.restore();
    for (const e of P.embers) {
      e.y -= e.vy * 2.4; e.x += e.vx + Math.sin(t * 3 + e.life * 9) * .6; e.life += .008;
      if (e.y < H * .25 || e.life > 1) { e.y = fy - 30; e.x = fx + rand(-140, 140); e.life = 0; }
      ctx.globalAlpha = 1 - e.life;
      glow(e.x, e.y, e.r * 5, "#ffb15e", .8);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, H * .84, W, H * .16);
  },
  forest(t) {
    wallGradient("#071410", "#1d4030");
    ctx.save(); ctx.globalAlpha = .14; ctx.fillStyle = "#d8ffd0";
    for (let k = 0; k < 4; k++) {
      const x = W * (.15 + k * .22) + Math.sin(t * .4 + k) * 30;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 130, 0); ctx.lineTo(x - 90, H); ctx.lineTo(x - 220, H); ctx.fill();
    }
    ctx.restore();
    const layer = (base, color, seed) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 18) {
        const h = H * base + Math.sin(x * .008 + seed) * 40 + Math.sin(x * .03 + seed * 2) * 18;
        ctx.lineTo(x, h);
      }
      ctx.lineTo(W, H); ctx.fill();
    };
    layer(.52, "#0e2a20", 1.7); layer(.64, "#123726", 4.2); layer(.78, "#0a1f17", 8.8);
    ctx.fillStyle = "#06130e";
    for (let k = 0; k < 7; k++) {
      const x = (W / 6) * k + Math.sin(k * 7) * 30;
      ctx.fillRect(x, H * .3, 26, H * .7);
    }
    for (const f of P.fireflies) {
      f.x += Math.sin(t * f.sp + f.ph) * .7; f.y += Math.cos(t * f.sp * .7 + f.ph) * .5;
      const a = .35 + Math.abs(Math.sin(t * 1.8 + f.ph)) * .65;
      glow(f.x, f.y, 22, "#c8ff9e", a * .9);
      ctx.fillStyle = `rgba(230,255,190,${a})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "rgba(200,230,200,.07)";
    for (let k = 0; k < 3; k++) {
      const y = H * (.72 + k * .08);
      ctx.fillRect(0, y + Math.sin(t * .5 + k * 2) * 8, W, 34);
    }
  },
  sakura(t) {
    wallGradient("#ffe3ee", "#bfe3c8");
    glow(W * .78, H * .2, 220, "#fff6da", .9);
    ctx.fillStyle = "#fff9e8"; ctx.beginPath(); ctx.arc(W * .78, H * .2, 52, 0, TAU); ctx.fill();
    // distant hills + pagoda
    ctx.fillStyle = "#9db877";
    ctx.beginPath(); ctx.moveTo(0, H * .72);
    ctx.quadraticCurveTo(W * .3, H * .5, W * .55, H * .68);
    ctx.quadraticCurveTo(W * .8, H * .6, W, H * .7); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = "#5a3a28";
    const px = W * .68, py = H * .66;
    for (let k = 0; k < 3; k++) {
      ctx.fillRect(px - 60 + k * 8, py - 120 + k * 38, 120 - k * 16, 10);
    }
    ctx.fillRect(px - 8, py - 120, 16, 120);
    ctx.beginPath(); ctx.moveTo(px - 70, py - 120); ctx.lineTo(px + 70, py - 120); ctx.lineTo(px, py - 155); ctx.fill();
    // cherry tree
    ctx.strokeStyle = "#4a2f22"; ctx.lineWidth = 16; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(W * .2, H); ctx.quadraticCurveTo(W * .22, H * .6, W * .3 + Math.sin(t) * 5, H * .42); ctx.stroke();
    glow(W * .3, H * .36, 200, "#ffb7d5", .8);
    ctx.fillStyle = "rgba(255,183,213,.9)";
    for (let k = 0; k < 26; k++) {
      const a = k * 2.4 + Math.sin(t * .8 + k) * .08, r = 90 + (k % 5) * 22;
      ctx.beginPath(); ctx.arc(W * .3 + Math.cos(a) * r, H * .36 + Math.sin(a) * r * .6, 22 - (k % 4) * 3, 0, TAU); ctx.fill();
    }
    // petals
    for (const p of P.petals) {
      p.y += p.s; p.x += Math.sin(t * 1.4 + p.ph) * 1.1; p.rot += .02;
      if (p.y > H) { p.y = -10; p.x = rand(0, W); }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = "rgba(255,205,225,.92)";
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .62, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // birds
    ctx.strokeStyle = "rgba(90,60,60,.7)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    for (const b of P.birds) {
      b.x += b.s * .6; if (b.x > W + 30) b.x = -30;
      const f = Math.sin(t * 6 + b.ph) * 5;
      ctx.beginPath();
      ctx.moveTo(b.x - 9, b.y); ctx.quadraticCurveTo(b.x - 3, b.y - 5 - f, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 5 - f, b.x + 9, b.y); ctx.stroke();
    }
  },
  ocean(t) {
    wallGradient("#060b1e", "#12294d");
    for (const s of P.stars) {
      const a = .3 + Math.abs(Math.sin(t * 1.4 + s.ph)) * .7;
      ctx.fillStyle = `rgba(220,235,255,${a})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    if (P.shoot.life <= 0 && Math.random() < .004) {
      P.shoot = { x: rand(W * .2, W * .9), y: rand(20, H * .25), vx: rand(-9, -6), vy: rand(2, 3.4), life: 1 };
    }
    if (P.shoot.life > 0) {
      P.shoot.x += P.shoot.vx; P.shoot.y += P.shoot.vy; P.shoot.life -= .016;
      const g = ctx.createLinearGradient(P.shoot.x, P.shoot.y, P.shoot.x - P.shoot.vx * 10, P.shoot.y - P.shoot.vy * 10);
      g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(P.shoot.x, P.shoot.y); ctx.lineTo(P.shoot.x - P.shoot.vx * 10, P.shoot.y - P.shoot.vy * 10); ctx.stroke();
    }
    const mx = W * .72, my = H * .24;
    glow(mx, my, 190, "#e8f2ff", .7);
    ctx.fillStyle = "#f2f7ff"; ctx.beginPath(); ctx.arc(mx, my, 52, 0, TAU); ctx.fill();
    const seaTop = H * .6;
    const sea = ctx.createLinearGradient(0, seaTop, 0, H);
    sea.addColorStop(0, "#16345e"); sea.addColorStop(1, "#050a18");
    ctx.fillStyle = sea; ctx.fillRect(0, seaTop, W, H - seaTop);
    glow(mx, seaTop + 40, 130, "#cfe6ff", .5);
    ctx.fillStyle = "rgba(210,230,255,.35)";
    for (let k = 0; k < 40; k++) {
      const y = seaTop + 12 + k * ((H - seaTop) / 40);
      const w = 60 + k * 7 + Math.sin(t * 2 + k) * 10;
      ctx.fillRect(mx - w / 2 + Math.sin(t + k) * 6, y, w, 2.4);
    }
    ctx.strokeStyle = "rgba(160,200,255,.35)"; ctx.lineWidth = 2;
    for (const wv of P.waves) {
      ctx.beginPath();
      const yBase = H * wv.y;
      for (let x = 0; x <= W; x += 14)
        ctx.lineTo(x, yBase + Math.sin(x * .02 + t * wv.sp + wv.ph) * wv.amp * .4);
      ctx.stroke();
    }
  },
  cosmos(t) {
    wallGradient("#070313", "#1c1040");
    // nebula
    glow(W * (.3 + Math.sin(t * .1) * .03), H * .35, 320, "#5b3bd6", .35);
    glow(W * (.72 + Math.cos(t * .08) * .03), H * .55, 280, "#d63bb0", .28);
    glow(W * .5, H * .15, 240, "#2b6bd6", .3);
    for (const s of P.stars) {
      const a = .25 + Math.abs(Math.sin(t * 1.6 + s.ph)) * .75;
      ctx.fillStyle = `rgba(230,225,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    for (const c of P.comets) {
      if (c.life <= 0 && Math.random() < .003) {
        c.x = rand(W * .3, W); c.y = rand(0, H * .3); c.vx = rand(-7, -4); c.vy = rand(1.5, 2.5); c.life = 1;
      }
      if (c.life > 0) {
        c.x += c.vx; c.y += c.vy; c.life -= .01;
        const g = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 12, c.y - c.vy * 12);
        g.addColorStop(0, "rgba(200,180,255,.9)"); g.addColorStop(1, "rgba(200,180,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - c.vx * 12, c.y - c.vy * 12); ctx.stroke();
      }
    }
    // ringed planet
    const px = W * .3, py = H * .62;
    glow(px, py, 150, "#8b7bff", .5);
    ctx.fillStyle = "#3d2f7a"; ctx.beginPath(); ctx.arc(px, py, 56, 0, TAU); ctx.fill();
    ctx.fillStyle = "#574a9e"; ctx.beginPath(); ctx.arc(px - 16, py - 12, 30, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(200,180,255,.55)"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(px, py, 96, 26, -.35, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(200,180,255,.25)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(px, py, 112, 32, -.35, 0, TAU); ctx.stroke();
  },
  cafe(t) {
    wallGradient("#f7d9a8", "#e8975e");
    const wx = W * .5 - 330, wy = H * .08, ww = 660, wh = H * .46;
    windowFrame(wx, wy, ww, wh);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, "#ffe9c4"); sky.addColorStop(.55, "#ffc98a"); sky.addColorStop(1, "#ff9a5e");
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    const sx = wx + ww * .5 + Math.sin(t * .3) * 8, sy = wy + wh * .62;
    glow(sx, sy, 180, "#fff3d0", .95);
    ctx.fillStyle = "#fff6dd"; ctx.beginPath(); ctx.arc(sx, sy, 54, 0, TAU); ctx.fill();
    ctx.fillStyle = "#9db877"; ctx.beginPath();
    ctx.moveTo(wx, wy + wh); ctx.quadraticCurveTo(wx + ww * .3, wy + wh * .55, wx + ww * .55, wy + wh * .8);
    ctx.quadraticCurveTo(wx + ww * .8, wy + wh * .6, wx + ww, wy + wh * .78); ctx.lineTo(wx + ww, wy + wh); ctx.fill();
    ctx.strokeStyle = "rgba(90,60,40,.8)"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    for (const b of P.birds) {
      b.x += b.s; if (b.x > wx + ww + 30) b.x = wx - 30;
      const f = Math.sin(t * 6 + b.ph) * 6;
      ctx.beginPath();
      ctx.moveTo(b.x - 10, b.y); ctx.quadraticCurveTo(b.x - 3, b.y - 6 - f, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 6 - f, b.x + 10, b.y); ctx.stroke();
    }
    ctx.restore();
    for (const m of P.motes) {
      m.y += m.vy; if (m.y < 0) { m.y = H; m.x = rand(0, W); }
      ctx.fillStyle = "rgba(255,250,235,.55)";
      ctx.beginPath(); ctx.arc(m.x + Math.sin(t + m.ph) * 20, m.y, m.r, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "#3d5a2e"; ctx.lineWidth = 7; ctx.lineCap = "round";
    for (let k = 0; k < 5; k++) {
      const pxx = W * .08, py = H * .95;
      const sway = Math.sin(t * 1.1 + k) * 10;
      ctx.beginPath(); ctx.moveTo(pxx, py);
      ctx.quadraticCurveTo(pxx + 30 + sway, py - 90 - k * 22, pxx + 70 + sway * 2, py - 140 - k * 26); ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,20,10,.28)"; ctx.fillRect(0, H * .86, W, H * .14);
  },
  autumn(t) {
    wallGradient("#ffd9a0", "#c65b21");
    glow(W * .5, H * .62, 260, "#fff0c8", .8);
    ctx.fillStyle = "#fff3d2"; ctx.beginPath(); ctx.arc(W * .5, H * .62, 48, 0, TAU); ctx.fill();
    // hills
    ctx.fillStyle = "#8a4a1e";
    ctx.beginPath(); ctx.moveTo(0, H * .78);
    ctx.quadraticCurveTo(W * .3, H * .62, W * .6, H * .76);
    ctx.quadraticCurveTo(W * .85, H * .7, W, H * .78); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // big tree
    ctx.strokeStyle = "#3d2110"; ctx.lineWidth = 22; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(W * .82, H); ctx.quadraticCurveTo(W * .8, H * .6, W * .74 + Math.sin(t * .7) * 4, H * .4); ctx.stroke();
    ctx.fillStyle = "rgba(200,90,20,.9)";
    for (let k = 0; k < 30; k++) {
      const a = k * 2.4, r = 70 + (k % 6) * 20;
      const sway = Math.sin(t * .9 + k) * 6;
      ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.arc(W * .76 + Math.cos(a) * r + sway, H * .36 + Math.sin(a) * r * .55, 20 - (k % 4) * 2.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // falling leaves
    for (const l of P.leaves) {
      l.y += l.s; l.x += Math.sin(t * 1.6 + l.ph) * 1.3; l.rot += .03;
      if (l.y > H) { l.y = -10; l.x = rand(0, W); }
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
      ctx.fillStyle = ["#d96c1e", "#e8a04c", "#a83a12", "#f2c14e"][Math.floor(l.ph * 10) % 4];
      ctx.beginPath(); ctx.ellipse(0, 0, l.r, l.r * .6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // fence
    ctx.fillStyle = "rgba(40,20,8,.85)";
    for (let x = 0; x < W; x += 70) ctx.fillRect(x, H * .82, 12, H * .1);
    ctx.fillRect(0, H * .83, W, 10); ctx.fillRect(0, H * .87, W, 10);
  },
  snow(t) {
    wallGradient("#101c30", "#33475f");
    glow(W * .5, H * .3, 320, "#dfe8ff", .5);
    ctx.fillStyle = "#eef3ff"; ctx.beginPath(); ctx.arc(W * .5, H * .28, 46, 0, TAU); ctx.fill();
    ctx.fillStyle = "#0c1626";
    for (let k = 0; k < 12; k++) {
      const x = (W / 11) * k, h = H * (.28 + ((k * 37) % 20) / 100);
      ctx.beginPath(); ctx.moveTo(x - 46, H * .9); ctx.lineTo(x, H * .9 - h); ctx.lineTo(x + 46, H * .9); ctx.fill();
      ctx.fillStyle = "rgba(238,243,255,.85)";
      ctx.beginPath(); ctx.moveTo(x - 20, H * .9 - h * .62); ctx.lineTo(x, H * .9 - h - 12); ctx.lineTo(x + 20, H * .9 - h * .62); ctx.fill();
      ctx.fillStyle = "#0c1626";
    }
    ctx.fillStyle = "rgba(238,243,255,.92)"; ctx.fillRect(0, H * .86, W, H * .14);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const s of P.snow) {
      s.y += s.s * .9; s.x += Math.sin(t * .8 + s.ph) * .5;
      if (s.y > H) { s.y = -6; s.x = rand(0, W); }
      ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

function loop(ts) {
  const t = ts / 1000;
  (painters[currentScene] || painters.loft)(t);
  const g = ctx.createLinearGradient(0, H * .55, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = g; ctx.fillRect(0, H * .55, W, H * .45);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* scene grid */
const grid = $("#sceneGrid");
function setScene(id, silent) {
  currentScene = id;
  $$(".scene-card").forEach((el) => el.classList.toggle("on", el.dataset.id === id));
  if (!silent) syncHash();
}
SCENES.forEach((s) => {
  const b = document.createElement("button");
  b.className = "scene-card" + (s.id === currentScene ? " on" : "");
  b.dataset.id = s.id;
  b.innerHTML = `<span class="thumb" style="position:relative;display:block;background:linear-gradient(135deg,${s.c[0]},${s.c[1]})"></span><p><small>${s.sub}</small>${s.name}</p>`;
  b.onclick = () => { setScene(s.id); ensureAudio(); autoPairSound(s.id); };
  grid.appendChild(b);
});
function autoPairSound(id) {
  const map = { loft: "rain", tokyo: "rain", cabin: "fire", forest: "wind", sakura: "birds", ocean: "ocean", cosmos: "night", cafe: "cafe", autumn: "wind", snow: "night" };
  const key = map[id]; if (key && ambNodes[key] && !ambNodes[key].on) setAmbient(key, true);
}

/* ============ AUDIO ============ */
let AC = null, master = null, musicBus = null;
let noiseBuf = null, whiteBuf = null, brownBuf = null;
const ambNodes = {};
const AMBIENTS = [
  { key: "rain", label: "rain", icon: "☔", vol: 60, base: .85, src: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Bourne_woods_rain_2020-05-10_0800.mp3" },
  { key: "thunder", label: "thunder", icon: "⛈", vol: 60, base: .9, oneshot: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Thunder.wav" },
  { key: "fire", label: "fireplace", icon: "🔥", vol: 55, base: .9, src: "https://archive.org/download/fire-sound-effects-crackle-burn-flames-free-cc-0-sfx/api%201.mp3" },
  { key: "ocean", label: "ocean", icon: "🌊", vol: 50, base: .9, src: "https://archive.org/download/2-tropical-beach-ambience-3-hours-of-peaceful-ocean-waves-4-k-video-128-kbps/2%20Tropical%20Beach%20Ambience_%203%20Hours%20of%20Peaceful%20Ocean%20Waves%20%284K%20Video%29%20%28128%20kbps%29.mp3" },
  { key: "wind", label: "forest wind", icon: "🍃", vol: 45, base: .9, src: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Wind_sounds_2020-05-10_1625.mp3" },
  { key: "birds", label: "dawn birds", icon: "🐦", vol: 40, base: .85, src: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Dawn_Chorus_2020-05-06_0500.mp3" },
  { key: "night", label: "night crickets", icon: "🦉", vol: 40, base: .9, src: "https://archive.org/download/waterberge-0-nighttime-ambience-crickets-bats/Waterberge%200%20Nighttime%20Ambience%20-%20Crickets%2C%20bats.mp3" },
  { key: "cafe", label: "café murmur", icon: "☕", vol: 35, base: .9, src: "https://archive.org/download/aporee_4975_6361/venloerKoernerCafeDaPaulo180909.mp3" },
  { key: "brown", label: "brown noise", icon: "🟤", vol: 50, base: .5, noise: "brown" },
  { key: "white", label: "white noise", icon: "⚪", vol: 30, base: .25, noise: "white" },
];
// entries exist from load — no AudioContext needed for streamed files
for (const a of AMBIENTS) {
  ambNodes[a.key] = { el: null, gain: null, on: false, vol: a.vol / 100, base: a.base, kind: a.oneshot ? "oneshot" : (a.src ? "file" : "noise"), timer: null };
}
function ensureAudio() {
  if (AC) { if (AC.state === "suspended") AC.resume(); return; }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination);
  musicBus = AC.createGain(); musicBus.gain.value = .7; musicBus.connect(master);
  const delay = AC.createDelay(1); delay.delayTime.value = .34;
  const fb = AC.createGain(); fb.gain.value = .32;
  const wet = AC.createGain(); wet.gain.value = .25;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(musicBus);
  window._delaySend = delay;
  // true white + true brown noise buffers (science-noise layers + synth hats)
  whiteBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const wd = whiteBuf.getChannelData(0);
  for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
  brownBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const bd = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bd.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; bd[i] = last * 3.5; }
  noiseBuf = whiteBuf;
  // generated science-noise layers only — nature layers stream real recordings
  for (const a of AMBIENTS) {
    if (!a.noise) continue;
    const src = AC.createBufferSource(); src.buffer = a.noise === "brown" ? brownBuf : whiteBuf; src.loop = true;
    const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = a.noise === "brown" ? 900 : 9000;
    const g = AC.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master); src.start();
    ambNodes[a.key].gain = g;
  }
}
/* ---- real recording layers ---- */
function layerTarget(n) { return Math.min(1, n.base * Math.pow(Math.max(0, n.vol), 1.4) * 1.6); }
function fadeEl(el, to, ms, done) {
  clearInterval(el._fade);
  const from = el.volume, t0 = performance.now();
  el._fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = from + (to - from) * k;
    if (k >= 1) { clearInterval(el._fade); done && done(); }
  }, 90);
}
function markChip(key, cls, on) {
  document.querySelectorAll(`.chip[data-ambient="${key}"]`).forEach((c) => {
    if (cls === "on") c.classList.toggle("on", on);
    else c.classList.toggle(cls, on);
  });
}
function playFileLayer(key) {
  const n = ambNodes[key], def = AMBIENTS.find((a) => a.key === key);
  if (!n.el) {
    const el = new Audio(); el.src = def.src; el.loop = true; el.preload = "auto"; el.volume = 0;
    n.el = el;
    markChip(key, "loading", true);
    el.addEventListener("error", () => { markChip(key, "loading", false); markChip(key, "error", true); n.on = false; markChip(key, "on", false); });
  } else markChip(key, "loading", true);
  n.el.play().then(() => {
    if (!n.on) { n.el.pause(); return; }
    markChip(key, "loading", false); markChip(key, "error", false);
    fadeEl(n.el, layerTarget(n), 1800);
  }).catch((err) => {
    markChip(key, "loading", false);
    if (err && err.name === "NotAllowedError") {
      // autoplay policy: retry on first tap
      markChip(key, "loading", true);
      document.addEventListener("pointerdown", () => { if (n.on) playFileLayer(key); }, { once: true });
    } else { markChip(key, "error", true); n.on = false; markChip(key, "on", false); }
  });
}
function stopFileLayer(key, ms = 1200, done) {
  const n = ambNodes[key];
  if (!n.el || n.el.paused) { done && done(); return; }
  fadeEl(n.el, 0, ms, () => { n.el.pause(); done && done(); });
}
function scheduleThunder() {
  const n = ambNodes.thunder;
  clearTimeout(n.timer);
  if (!n.on) return;
  n.timer = setTimeout(() => {
    if (!ambNodes.thunder.on) return;
    const def = AMBIENTS.find((a) => a.key === "thunder");
    const el = new Audio(); el.src = def.oneshot; el.preload = "auto"; el.volume = 0;
    el.play().then(() => {
      try { el.currentTime = rand(0, Math.max(0, (el.duration || 30) - 8)); } catch {}
      fadeEl(el, rand(.25, .55) * (ambNodes.thunder.vol + .3), 1500);
      el.onended = () => el.remove();
    }).catch(() => {});
    scheduleThunder();
  }, rand(7000, 22000));
}

function setAmbient(key, on, vol) {
  const n = ambNodes[key]; if (!n) return;
  if (on === undefined) on = !n.on;
  n.on = on;
  if (vol !== undefined) n.vol = vol;
  markChip(key, "on", on);
  markChip(key, "error", false);
  if (n.kind === "file") { on ? playFileLayer(key) : stopFileLayer(key); }
  else if (n.kind === "oneshot") { on ? scheduleThunder() : clearTimeout(n.timer); }
  else {
    ensureAudio();
    const t = on ? layerTarget(n) * .5 : 0;
    n.gain.gain.cancelScheduledValues(AC.currentTime);
    n.gain.gain.linearRampToValueAtTime(t, AC.currentTime + 1.2);
  }
  syncHash();
}
const mixerGroup = $("#mixerGroup");
AMBIENTS.forEach((a) => {
  const row = document.createElement("div");
  row.className = "mixer-row";
  row.innerHTML = `<button class="chip" data-ambient="${a.key}"><i>${a.icon}</i> ${a.label} <b></b></button>
    <input type="range" data-vol="${a.key}" min="0" max="100" value="${a.vol}" />`;
  mixerGroup.appendChild(row);
});
document.addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (c) setAmbient(c.dataset.ambient);
});
document.addEventListener("input", (e) => {
  const s = e.target.closest("input[data-vol]");
  if (!s) return;
  if (s.id === "musicVol") return;
  const n = ambNodes[s.dataset.vol]; if (!n) return;
  n.vol = s.value / 100;
  if (!n.on) { syncHash(); return; }
  if (n.kind === "file" && n.el) n.el.volume = layerTarget(n);
  if (n.kind === "noise" && AC && n.gain) {
    n.gain.gain.cancelScheduledValues(AC.currentTime);
    n.gain.gain.linearRampToValueAtTime(layerTarget(n) * .5, AC.currentTime + .3);
  }
  syncHash();
});

/* ============ MUSIC ============ */
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
function piano(m, t, dur, vol = .22, type = "triangle") {
  const o1 = AC.createOscillator(); o1.type = type; o1.frequency.value = midi(m);
  const o2 = AC.createOscillator(); o2.type = "sine"; o2.frequency.value = midi(m) * 2;
  const g2 = AC.createGain(); g2.gain.value = .18;
  const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2400;
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .02);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g);
  g.connect(musicBus); g.connect(window._delaySend);
  o1.start(t); o2.start(t); o1.stop(t + dur + .1); o2.stop(t + dur + .1);
}
function bass(m, t, dur, vol = .16) {
  const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = midi(m);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .05);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + .1);
}
function hat(t, vol = .05) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 2;
  const f = AC.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0005, t + .05);
  s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, rand(0, 1), .08);
}
/* stations live in STATIONS below (garden radio) */
let trackIdx = 0, musicOn = false, schedTimer = null, nextT = 0, step = 0;
const LOFI_CHORDS = [[57, 60, 64, 67], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]];
function scheduleLofi(t, s) {
  const bar = Math.floor(s / 8) % 4, chord = LOFI_CHORDS[bar], pos = s % 8;
  if (pos === 0) { chord.forEach((n) => piano(n, t, 3.4, .11)); bass(chord[0] - 12, t, 3.4, .1); }
  if (pos % 2 === 0) hat(t, .028);
  if ([1, 3, 6].includes(pos)) piano(chord[(pos + bar) % 4] + 12, t, 1.2, .07);
  if (Math.random() < .3) {
    const o = AC.createBufferSource(); o.buffer = noiseBuf; o.playbackRate.value = 3;
    const g = AC.createGain(); g.gain.setValueAtTime(.02, t); g.gain.exponentialRampToValueAtTime(.0005, t + .03);
    const f = AC.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
    o.connect(f); f.connect(g); g.connect(musicBus); o.start(t, rand(0, 1), .04);
  }
  return .52;
}
const SATIE = [[0, 62, 2], [0, 59, 2], [0, 55, 4], [4, 62, 2], [4, 59, 2], [4, 55, 4], [8, 62, 2], [8, 57, 2], [8, 53, 4], [12, 62, 2], [12, 57, 2], [12, 53, 4]];
const CANON_BASS = [38, 45, 47, 42, 43, 38, 43, 45];
const CANON_MEL = [74, 76, 78, 76, 78, 81, 79, 76, 74];
const BRAHMS_MEL = [[0, 67, 1], [1, 67, 1], [2, 72, 1.5], [3.5, 69, .5], [4, 71, 1], [5, 71, 1], [6, 69, 2], [8, 71, 1], [9, 71, 1], [10, 67, 1.5], [11.5, 69, .5], [12, 71, 1], [13, 67, 1], [14, 67, 2]];
function currentStation() { return STATIONS[trackIdx]; }
function scheduleTrack(t, s) {
  if (currentStation().live) return .5; // live stream plays itself
  return scheduleLofi(t, s); // offline synth fallback
}
function scheduler() {
  if (!musicOn || currentStation().live || !AC) return;
  while (nextT < AC.currentTime + .6) { nextT += scheduleTrack(nextT, step); step++; }
}
/* ---- garden radio: live SomaFM streams (verified 128k mp3) + offline synth ---- */
const STATIONS = [
  { id: "7soul", title: "Seven Inch Soul", sub: "vintage soul 45s · live", live: true },
  { id: "seventies", title: "Left Coast 70s", sub: "seventies classics · live", live: true },
  { id: "bootliquor", title: "Boot Liquor", sub: "americana roots · live", live: true },
  { id: "sonicuniverse", title: "Sonic Universe", sub: "soul-jazz · live", live: true },
  { id: "deepspaceone", title: "Deep Space One", sub: "deep ambient · live", live: true },
  { id: "dronezone", title: "Drone Zone", sub: "drone sleep · live", live: true },
  { id: "synth", title: "den offline lofi", sub: "synthesized · works offline", live: false },
];
const radioEl = new Audio(); radioEl.preload = "none";
function setRadioStatus(msg) { const el = $("#radioStatus"); if (el) el.textContent = msg || ""; }
function paintMusicBtn() {
  const b = $("#btnMusic"), st = currentStation();
  b.classList.toggle("playing", musicOn);
  b.innerHTML = musicOn
    ? `⏸ ${st.live ? '<span class="live-badge">live</span>' : ""}${st.title}`
    : "▶ play garden radio";
}
function stopRadio() {
  try { radioEl.pause(); } catch {}
  clearInterval(schedTimer); musicOn = false;
  setRadioStatus(""); paintMusicBtn();
}
function setTrack(i, autoplay = true) {
  stopRadio();
  trackIdx = (i + STATIONS.length) % STATIONS.length; step = 0;
  $$(".track").forEach((el, k) => el.classList.toggle("on", k === trackIdx));
  if (autoplay) toggleMusic(true);
  else { paintMusicBtn(); syncHash(); }
}
const trackList = $("#trackList");
STATIONS.forEach((tr, i) => {
  const b = document.createElement("button");
  b.className = "track" + (i === 0 ? " on" : "");
  b.innerHTML = `<span>${tr.live ? '<i class="live-dot"></i>' : "♪"}</span><span>${tr.title}<small>${tr.sub}</small></span>`;
  b.onclick = () => setTrack(i);
  trackList.appendChild(b);
});
radioEl.addEventListener("playing", () => setRadioStatus(""));
radioEl.addEventListener("waiting", () => { if (musicOn) setRadioStatus("buffering…"); });
radioEl.addEventListener("error", () => { if (musicOn) setRadioStatus("stream hiccup — try another station"); });
function toggleMusic(force) {
  const want = force ?? !musicOn;
  if (!want) { stopRadio(); return; }
  const st = currentStation();
  if (st.live) {
    try { radioEl.pause(); } catch {}
    clearInterval(schedTimer);
    radioEl.src = `https://ice1.somafm.com/${st.id}-128-mp3`;
    radioEl.volume = $("#musicVol").value / 100;
    setRadioStatus("tuning…");
    musicOn = true; paintMusicBtn();
    radioEl.play().then(() => setRadioStatus("")).catch(() => setRadioStatus("tap play to start the stream"));
  } else {
    try { radioEl.pause(); } catch {}
    ensureAudio();
    nextT = AC.currentTime + .1; clearInterval(schedTimer); schedTimer = setInterval(scheduler, 180);
    musicOn = true; paintMusicBtn();
  }
  syncHash();
}
$("#btnMusic").onclick = () => toggleMusic();
$("#btnPrev").onclick = () => setTrack(trackIdx - 1);
$("#btnNext").onclick = () => setTrack(trackIdx + 1);
$("#musicVol").oninput = (e) => {
  radioEl.volume = e.target.value / 100;
  if (musicBus) musicBus.gain.value = e.target.value / 100;
};

/* ============ PRESETS (one-tap moods) ============ */
const PRESETS = [
  { id: "focus", name: "📚 Deep Focus", sub: "loft + rain + soul", scene: "loft", sounds: { rain: 60, brown: 55 }, track: 0 },
  { id: "storm", name: "⛈ Thunderstorm", sub: "tokyo + heavy rain", scene: "tokyo", sounds: { rain: 85, thunder: 70 }, track: 0 },
  { id: "cozy", name: "🔥 Cozy Night", sub: "cabin + fireplace", scene: "cabin", sounds: { fire: 75, night: 35 }, track: 3 },
  { id: "cafe", name: "☕ Café Morning", sub: "café + 70s", scene: "cafe", sounds: { cafe: 70, birds: 45 }, track: 1 },
  { id: "forest", name: "🍃 Forest Bath", sub: "woods + wind", scene: "forest", sounds: { wind: 65, birds: 40 }, track: 4 },
  { id: "sleep", name: "🌙 Deep Sleep", sub: "cosmos + ocean", scene: "cosmos", sounds: { ocean: 60, night: 30, white: 25 }, track: 5 },
];
const presetGrid = $("#presetGrid");
PRESETS.forEach((p) => {
  const b = document.createElement("button");
  b.className = "preset";
  b.innerHTML = `<b>${p.name}</b><small>${p.sub}</small>`;
  b.onclick = () => {
    ensureAudio();
    setScene(p.scene, true);
    Object.keys(ambNodes).forEach((k) => { if (ambNodes[k].on) setAmbient(k, false); });
    Object.entries(p.sounds).forEach(([k, v]) => {
      const slider = document.querySelector(`input[data-vol="${k}"]`);
      if (slider) slider.value = v;
      if (ambNodes[k]) ambNodes[k].vol = v / 100;
      setAmbient(k, true);
    });
    setTrack(p.track);
    syncHash();
  };
  presetGrid.appendChild(b);
});

/* ============ TIMER + STREAKS ============ */
const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
let tMode = "focus", tTotal = MODES.focus, tLeft = MODES.focus, tRun = false, tInt = null;
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
function drawTimer() {
  $("#pillTime").textContent = fmt(tLeft);
  const lbl = tMode === "focus" ? "focus" : tMode === "short" ? "breathe" : "rest";
  $("#pillLabel").textContent = lbl;
  $("#bigTime").textContent = fmt(tLeft);
  $("#bigLabel").textContent = lbl;
  $("#ringFg").style.strokeDashoffset = 540.4 * (1 - tLeft / tTotal);
  document.title = `${fmt(tLeft)} · ${tMode} — the den`;
}
function tick() { if (tLeft > 0) { tLeft--; drawTimer(); } else stopTimer(true); }
function startTimer() {
  ensureAudio();
  if (tRun) { pauseTimer(); return; }
  tRun = true; $("#btnStart").textContent = "pause";
  $("#timerPill .dot").style.background = "#7fb069";
  clearInterval(tInt); tInt = setInterval(tick, 1000);
}
function pauseTimer() { tRun = false; $("#btnStart").textContent = "start focusing"; clearInterval(tInt); }
function stopTimer(done = false) {
  pauseTimer();
  if (done) {
    if ($("#chkChime").checked && AC) {
      const t = AC.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = f;
        const g = AC.createGain(); g.gain.setValueAtTime(0, t + i * .18);
        g.gain.linearRampToValueAtTime(.22, t + i * .18 + .03);
        g.gain.exponentialRampToValueAtTime(.0005, t + i * .18 + 1.4);
        o.connect(g); g.connect(master); o.start(t + i * .18); o.stop(t + i * .18 + 1.6);
      });
    }
    if (tMode === "focus") logSession(Math.round(tTotal / 60));
    const labels = { focus: "Focus complete — stretch, sip water ✦", short: "Break over — back to the den 〜", long: "Long rest done — you got this ✓" };
    $("#quoteText").textContent = "“" + labels[tMode] + "”";
    tMode = tMode === "focus" ? "short" : "focus";
    tTotal = tLeft = tMode === "focus" ? (+document.querySelector(".presets .on")?.dataset.preset || 25) * 60 : MODES[tMode];
    syncModeBtns();
  }
  drawTimer();
}
function syncModeBtns() {
  $$(".modes button").forEach((b) => b.classList.toggle("on", b.dataset.mode === tMode));
  $$(".presets button").forEach((b) => b.classList.toggle("on", tMode === "focus" && +b.dataset.preset * 60 === tTotal));
}
$$(".presets button").forEach((b) => b.onclick = () => { pauseTimer(); tMode = "focus"; tTotal = tLeft = +b.dataset.preset * 60; syncModeBtns(); drawTimer(); });
$$(".modes button").forEach((b) => b.onclick = () => {
  pauseTimer(); tMode = b.dataset.mode;
  tTotal = tLeft = tMode === "focus" ? (+document.querySelector(".presets .on")?.dataset.preset || 25) * 60 : MODES[tMode];
  syncModeBtns(); drawTimer();
});
$("#btnStart").onclick = startTimer;
$("#btnReset").onclick = () => { pauseTimer(); tLeft = tTotal; drawTimer(); };
drawTimer();

/* streaks + stats (localStorage) */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function loadStats() {
  try { return JSON.parse(localStorage.getItem("den_stats_v1")) || { streak: 0, lastDay: "", today: 0, todayDate: "", total: 0 }; }
  catch { return { streak: 0, lastDay: "", today: 0, todayDate: "", total: 0 }; }
}
function drawStats() {
  const s = loadStats();
  const today = s.todayDate === todayStr() ? s.today : 0;
  $("#streakPill").textContent = `🔥 ${s.streak} · ${today} today`;
}
function logSession(mins) {
  const s = loadStats(), today = todayStr();
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (s.todayDate !== today) { s.today = 0; s.todayDate = today; s.streak = (s.lastDay === y || s.lastDay === today) ? (s.streak || 0) + (s.lastDay === today ? 0 : 1) : 1; }
  s.today++; s.total++; s.lastDay = today;
  try { localStorage.setItem("den_stats_v1", JSON.stringify(s)); } catch {}
  drawStats();
}
drawStats();

/* ============ SLEEP TIMER ============ */
let sleepSecs = 0, sleepInt = null;
function drawSleep() {
  $$(".sleep-row button").forEach((b) => b.classList.toggle("on", (+b.dataset.sleep === 0 && sleepSecs === 0) || (+b.dataset.sleep * 60 === sleepSecs)));
  $("#sleepLeft").textContent = sleepSecs > 0 ? `fades in ${Math.floor(sleepSecs / 60)}:${String(sleepSecs % 60).padStart(2, "0")}` : "";
}
$$(".sleep-row button").forEach((b) => b.onclick = () => {
  ensureAudio();
  clearInterval(sleepInt);
  sleepSecs = +b.dataset.sleep * 60;
  if (sleepSecs > 0) sleepInt = setInterval(() => {
    sleepSecs--;
    if (sleepSecs <= 0) { clearInterval(sleepInt); fadeToSleep(); }
    drawSleep();
  }, 1000);
  drawSleep();
});
function fadeToSleep() {
  stopRadio();
  Object.keys(ambNodes).forEach((k) => {
    const n = ambNodes[k]; if (!n.on) return;
    if (n.kind === "file") stopFileLayer(k, 8000, () => { n.on = false; markChip(k, "on", false); });
    else if (n.kind === "oneshot") { clearTimeout(n.timer); n.on = false; markChip(k, "on", false); }
    else if (n.gain && AC) {
      n.gain.gain.cancelScheduledValues(AC.currentTime);
      n.gain.gain.linearRampToValueAtTime(0, AC.currentTime + 8);
      setTimeout(() => { n.on = false; markChip(k, "on", false); }, 8200);
    } else { n.on = false; markChip(k, "on", false); }
  });
  syncHash();
  setTimeout(() => { $("#quoteText").textContent = "“goodnight — the den will keep watch ✦”"; }, 8500);
}
drawSleep();

/* ============ TASKS ============ */
function loadTasks() {
  try { return JSON.parse(localStorage.getItem("den_tasks_v1")) || []; }
  catch { return []; }
}
function saveTasks(list) { try { localStorage.setItem("den_tasks_v1", JSON.stringify(list)); } catch {} }
function drawTasks() {
  const list = loadTasks();
  const ul = $("#taskList"); ul.innerHTML = "";
  list.forEach((it, i) => {
    const li = document.createElement("li");
    if (it.done) li.classList.add("done");
    li.innerHTML = `<input type="checkbox" ${it.done ? "checked" : ""} /><span></span><button class="del">✕</button>`;
    li.querySelector("span").textContent = it.text;
    li.querySelector("input").onchange = (e) => { list[i].done = e.target.checked; saveTasks(list); drawTasks(); };
    li.querySelector(".del").onclick = () => { list.splice(i, 1); saveTasks(list); drawTasks(); };
    ul.appendChild(li);
  });
  const done = list.filter((x) => x.done).length;
  $("#taskCount").textContent = list.length ? `${done}/${list.length}` : "fresh page";
}
function addTask() {
  const inp = $("#taskInput"), v = inp.value.trim();
  if (!v) return;
  const list = loadTasks(); list.push({ text: v, done: false });
  saveTasks(list); inp.value = ""; drawTasks();
}
$("#taskAdd").onclick = addTask;
$("#taskInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
drawTasks();

/* ============ SHARE + AUTOLOAD ============ */
function syncHash() {
  try {
    const on = Object.keys(ambNodes).filter((k) => ambNodes[k].on).map((k) => `${k}.${Math.round(ambNodes[k].vol * 100)}`).join(",");
    history.replaceState(null, "", `#s=${currentScene}&a=${on}&m=${trackIdx}`);
  } catch {}
}
function loadHash() {
  const h = location.hash;
  if (!h || h.length < 3) return false;
  try {
    const q = new URLSearchParams(h.slice(1));
    const s = q.get("s");
    if (s && painters[s]) setScene(s, true);
    const a = (q.get("a") || "").split(",").filter(Boolean);
    ensureAudio();
    a.forEach((pair) => {
      const [k, v] = pair.split(".");
      if (ambNodes[k]) {
        const slider = document.querySelector(`input[data-vol="${k}"]`);
        if (slider && v) slider.value = v;
        ambNodes[k].vol = v ? +v / 100 : .5;
        setAmbient(k, true);
      }
    });
    const m = parseInt(q.get("m") || "0", 10);
    if (!isNaN(m) && m >= 0 && m < STATIONS.length) { trackIdx = m; step = 0; $$(".track").forEach((el, k) => el.classList.toggle("on", k === trackIdx)); paintMusicBtn(); }
    return true;
  } catch { return false; }
}
$("#btnShare").onclick = async () => {
  syncHash();
  try {
    await navigator.clipboard.writeText(location.href);
    const b = $("#btnShare"); const old = b.innerHTML;
    b.innerHTML = "✓ <span>copied!</span>";
    setTimeout(() => (b.innerHTML = old), 1600);
  } catch { alert("Copy this link to share your setup:\n" + location.href); }
};
function autoScene() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "cafe";
  if (h >= 10 && h < 16) return "sakura";
  if (h >= 16 && h < 19) return "autumn";
  if (h >= 19 && h < 23) return "tokyo";
  return "loft";
}

/* ============ UI wiring ============ */
$("#timerPill").onclick = () => $("#timerModal").classList.remove("hidden");
$("#btnTimer").onclick = () => $("#timerModal").classList.remove("hidden");
$$("[data-close]").forEach((b) => b.onclick = () => b.closest(".modal").classList.add("hidden"));
$("#btnEnter").onclick = () => {
  $("#welcome").classList.add("hidden");
  if (!loadHash()) {
    setScene(autoScene(), true);
    ensureAudio(); setAmbient("rain", true); setAmbient("fire", true);
  }
  syncHash();
};
if (location.hash && location.hash.length > 3) $("#welcome").classList.add("hidden"), loadHash();
const isMobile = () => window.innerWidth < 1080;
$("#btnScenes").onclick = (e) => {
  const p = $("#scenesPanel");
  if (isMobile()) p.classList.toggle("mobile-show");
  else p.style.display = p.style.display === "none" ? "" : "none";
  e.currentTarget.classList.toggle("active");
};
$("#btnMixer").onclick = (e) => {
  const p = $("#mixerPanel");
  if (isMobile()) p.classList.toggle("mobile-show");
  else p.style.display = p.style.display === "none" ? "" : "none";
  e.currentTarget.classList.toggle("active");
};
$("#btnTasks").onclick = (e) => {
  const card = $("#taskCard");
  card.style.display = card.style.display === "none" ? "" : "none";
  e.currentTarget.classList.toggle("active");
  if (card.style.display !== "none") $("#taskInput").focus();
};
function setHidden(h) {
  document.body.classList.toggle("ui-hidden", h);
  $("#showUi").classList.toggle("hidden", !h);
}
$("#btnHide").onclick = () => setHidden(true);
$("#showUi").onclick = () => setHidden(false);
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");
  if (e.key === "h" || e.key === "H") { if (!typing) setHidden(!document.body.classList.contains("ui-hidden")); }
  if (e.key === "Escape") { $$(".modal").forEach((m) => m.classList.add("hidden")); setHidden(false); }
  if (e.key === " " && !typing) { e.preventDefault(); startTimer(); }
});

/* quotes */
const QUOTES = [
  "almost everything will work again if you unplug it for a few minutes — including you.",
  "slow is smooth, smooth is fast. one page at a time.",
  "you don't have to be perfect. just be here, in the den.",
  "rain is just the sky studying with you.",
  "rest is productive too. the embers never rush.",
  "small steps every day turn into deep forests.",
];
let qi = 0;
setInterval(() => { qi = (qi + 1) % QUOTES.length; $("#quoteText").textContent = "“" + QUOTES[qi] + "”"; }, 14000);
})();
