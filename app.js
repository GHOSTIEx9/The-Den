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
  { id: "seventies", name: "Left Coast 70s", sub: "seventies classics", freq: 91.3 },
  { id: "u80s", name: "Underground 80s", sub: "eighties classics", freq: 94.7 },
  { id: "covers", name: "Covers", sub: "classics, covered", freq: 97.9 },
  { id: "bootliquor", name: "Boot Liquor", sub: "americana roots", freq: 101.1 },
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
const VIZ = {
  valve(spec, t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#120905"); bg.addColorStop(1, "#2b1206");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const n = 48, bw = W / n;
    for (let i = 0; i < n; i++) {
      const v = spec.freq[Math.floor((i / n) * spec.freq.length)] / 255;
      const h = Math.max(4, v * H * 0.62);
      const g = ctx.createLinearGradient(0, H - h, 0, H);
      g.addColorStop(0, "#ffe9a8"); g.addColorStop(0.4, "#ff9a3c"); g.addColorStop(1, "#7a2a08");
      ctx.fillStyle = g;
      ctx.shadowColor = "#ff8a3c"; ctx.shadowBlur = 18 * v;
      ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(i * bw + 2, H - h - 6, bw - 4, 4);
      ctx.globalAlpha = 1;
    }
    glowDot(W / 2, H * 0.85, 300, "#ff8a3c", 0.25);
  },
  scope(spec, t) {
    ctx.fillStyle = "#041005"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(80,255,140,.14)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = "#52ff8c"; ctx.lineWidth = 3;
    ctx.shadowColor = "#52ff8c"; ctx.shadowBlur = 16;
    ctx.beginPath();
    const N = 220, mid = H / 2;
    for (let i = 0; i <= N; i++) {
      let v;
      if (spec.time) v = (spec.time[Math.floor((i / N) * (spec.time.length - 1))] - 128) / 128;
      else v = Math.sin(i * 0.22 + t * 4) * 0.35 * spec.energy + Math.sin(i * 0.061 - t * 2.2) * 0.3 * spec.energy;
      const x = (i / N) * W, y = mid + v * H * 0.32;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    glowDot(W / 2, mid, 260, "#52ff8c", 0.12);
  },
  orbit(spec, t) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#080514"); bg.addColorStop(1, "#160a2e");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.22;
    const n = 72;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.15;
      const v = spec.freq[Math.floor((i / n) * spec.freq.length)] / 255;
      const len = 12 + v * R * 1.1;
      const hue = (i / n) * 360 + t * 20;
      ctx.strokeStyle = `hsl(${hue},85%,${45 + v * 20}%)`;
      ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.shadowColor = `hsl(${hue},85%,60%)`; ctx.shadowBlur = 12 * v;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8));
      ctx.lineTo(cx + Math.cos(a) * (R + 8 + len), cy + Math.sin(a) * (R + 8 + len));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    glowDot(cx, cy, R * 1.4, "#8b7bff", 0.5 + Math.sin(t * 2) * 0.1);
    ctx.fillStyle = "rgba(245,234,217,.9)";
    ctx.font = "600 15px Outfit, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("♪ THE DEN ♪", cx, cy + 5);
  },
  neon(spec, t) {
    ctx.fillStyle = "#07070f"; ctx.fillRect(0, 0, W, H);
    const n = 56, bw = W / n, mid = H / 2;
    for (let i = 0; i < n; i++) {
      const v = spec.freq[Math.floor((i / n) * spec.freq.length)] / 255;
      const h = Math.max(3, v * H * 0.34);
      ctx.fillStyle = i % 2 ? "#4ed8ff" : "#ff4ecd";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14 * v;
      ctx.fillRect(i * bw + 2, mid - h, bw - 4, h * 2);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillRect(0, mid - 1, W, 2);
  },
  vinyl(spec, t) {
    ctx.fillStyle = "#0b0b10"; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    let bass = 0;
    for (let i = 0; i < 8; i++) bass += spec.freq[i] / 255;
    bass /= 8;
    for (let r = 320; r > 20; r -= 26) {
      const wob = 1 + bass * 10 * Math.sin(t * 3 + r * 0.1);
      ctx.strokeStyle = `rgba(200,180,220,${0.05 + (r % 52 === 0 ? 0.22 : 0)})`;
      ctx.lineWidth = r % 52 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.arc(cx, cy, r * wob * 0.9 + bass * 14, t * 0.2, t * 0.2 + TAU); ctx.stroke();
    }
    const lr = 54 + bass * 16;
    const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, lr);
    lg.addColorStop(0, "#e8a04c"); lg.addColorStop(1, "#7a3c10");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, lr, 0, TAU); ctx.fill();
    ctx.fillStyle = "#171210"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(245,234,217,.7)"; ctx.lineWidth = 4;
    const ta = -0.7 + bass * 0.25;
    ctx.beginPath(); ctx.moveTo(cx + 180, cy - 190); ctx.lineTo(cx + Math.cos(ta) * 150, cy + Math.sin(ta) * 150); ctx.stroke();
  },
};
const VIZ_ORDER = [
  { id: "valve", name: "Valve Glow" },
  { id: "scope", name: "Oscilloscope" },
  { id: "orbit", name: "Orbit" },
  { id: "neon", name: "Night Dial" },
  { id: "vinyl", name: "Vinyl" },
];
let vizId = "valve";
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
(function loop(ts) {
  const t = ts / 1000;
  VIZ[vizId](liveSpectrum(t), t);
  requestAnimationFrame(loop);
})(0);

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
  $("#knobPower").classList.remove("lit");
  paintPresets();
  paintLCD(silent ? "" : "power off — shhh…");
  clearInterval(sleepInt); sleepSecs = 0; sleepStep = 0; paintSleep();
}
function powerToggle() {
  if (powered) { powerOff(); return; }
  $("#knobPower").classList.add("lit");
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

/* volume knob: drag vertically or scroll */
function setVol(v, show) {
  radioEl.volume = Math.min(1, Math.max(0, v));
  const deg = -135 + radioEl.volume * 270;
  $("#knobVol span").style.transform = `rotate(${deg}deg)`;
  if (show) {
    paintLCD(`volume ${Math.round(radioEl.volume * 100)}%`);
    clearTimeout(setVol._t);
    setTimeout(() => paintLCD(""), 1200);
  }
}
setVol(0.8);
(function () {
  const knob = $("#knobVol");
  let dragging = false, startY = 0, startV = 0;
  knob.addEventListener("pointerdown", (e) => { dragging = true; startY = e.clientY; startV = radioEl.volume; knob.setPointerCapture(e.pointerId); });
  knob.addEventListener("pointermove", (e) => { if (dragging) setVol(startV + (startY - e.clientY) / 180, true); });
  knob.addEventListener("pointerup", () => (dragging = false));
  knob.addEventListener("wheel", (e) => { e.preventDefault(); setVol(radioEl.volume + (e.deltaY < 0 ? 0.05 : -0.05), true); }, { passive: false });
  knob.addEventListener("dblclick", () => setVol(radioEl.volume > 0 ? 0 : 0.8, true));
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
        // fade out then power off
        const v0 = radioEl.volume, t0 = performance.now();
        const f = setInterval(() => {
          const k = Math.min(1, (performance.now() - t0) / 6000);
          radioEl.volume = v0 * (1 - k);
          setVol(radioEl.volume);
          if (k >= 1) { clearInterval(f); setVol(v0); powerOff(true); paintLCD("goodnight ✦"); }
        }, 120);
      }
      paintSleep();
    }, 1000);
    setTimeout(() => { if (powered) paintLCD(""); }, 2500);
  }
  paintSleep();
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
  else if (e.key === "ArrowUp") { e.preventDefault(); setVol(radioEl.volume + 0.05, true); }
  else if (e.key === "ArrowDown") { e.preventDefault(); setVol(radioEl.volume - 0.05, true); }
  else if (e.key >= "1" && e.key <= "8") tuneTo(+e.key - 1, true);
});

paintPresets();
paintLCD("press power ⏻");
document.title = "the den — classic radio";
})();
