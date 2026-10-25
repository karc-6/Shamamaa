(() => {
"use strict";
const C = window.CONFIG;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
const calm = () => body.classList.contains("calm") || mqReduce.matches;
const fine = matchMedia("(pointer: fine)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- tiny synth sound effects (no audio files needed) ---------- */
const sfx = (() => {
  let ctx, master, on = true, co = null, tu = null;
  const init = () => { if (ctx) return ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination); } catch (_) { ctx = null; } return ctx; };
  const blip = (f, d = .12, type = "triangle", v = .12, when = 0, f2) => {
    if (!on || !init()) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + .05);
  };
  return {
    get on() { return on; }, set on(v) { on = v; },
    unlock() { init() && ctx.state === "suspended" && ctx.resume(); },
    tick: f => blip(f, .1),
    hum: d => blip(55, d, "sine", .14, 0, 110),
    whoosh: d => blip(70, d, "triangle", .1, 0, 1400),
    boom: () => blip(150, .9, "sine", .35, 0, 28),
    chime: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, .7, "sine", .1, i * .09)),
    tune(q) {
      if (!on || !init()) return;
      if (q === null) { if (tu) { tu.g.gain.setTargetAtTime(.0001, ctx.currentTime, .05); tu.o.stop(ctx.currentTime + .3); tu = null; } return; }
      if (!tu) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; g.gain.value = .0001; o.connect(g).connect(master); o.start(); tu = { o, g }; }
      tu.o.frequency.setTargetAtTime(180 + +$("#tune").value * 500, ctx.currentTime, .03); tu.g.gain.setTargetAtTime(.01 + q * .05, ctx.currentTime, .05);
    },
    charge(p) {
      if (!on || !init()) return;
      if (p <= 0) { if (co) { co.g.gain.setTargetAtTime(.0001, ctx.currentTime, .05); co.o.stop(ctx.currentTime + .3); co = null; } return; }
      if (!co) { const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = .0001; o.connect(g).connect(master); o.start(); co = { o, g }; }
      co.o.frequency.setTargetAtTime(110 + p * 620, ctx.currentTime, .04); co.g.gain.setTargetAtTime(.02 + p * .1, ctx.currentTime, .04);
    }
  };
})();

/* ---------- media ---------- */
const PHOTOS = C.PHOTOS.map((m, i) => ({ ...m, type: "img", src: "images/" + m.file, hue: (344 + (i * 11) % 36) % 360 }));
const VIDEOS = C.VIDEOS.map((m, i) => ({ ...m, type: "video", src: "videos/" + m.file, hue: (8 + i * 14) % 360 }));
const ALL = [...PHOTOS, ...VIDEOS];
// Find each photo whatever its extension is (.jpg, .jpeg, .png, .webp); `ready` resolves true when one loads.
const EXTS = [".jpg", ".jpeg", ".png", ".webp"];
PHOTOS.forEach(it => {
  const base = it.src.replace(/\.[^./]+$/, ""), list = [it.src, ...EXTS.map(e => base + e).filter(u => u !== it.src)];
  it.ready = new Promise(res => { const next = k => { if (k >= list.length) return res(false); const im = new Image(); im.onload = () => { it.src = list[k]; res(true); }; im.onerror = () => next(k + 1); im.src = list[k]; }; next(0); });
});
VIDEOS.forEach(it => { it.ready = Promise.resolve(true); });

// A tile shows the file, or a soft gradient if the file isn't there yet.
function tile(item, { play = false, onFail } = {}) {
  const box = document.createElement("div");
  box.className = "tile";
  box.style.setProperty("--h", item.hue); box.dataset.label = item.file;
  const el = document.createElement(item.type === "img" ? "img" : "video");
  if (item.type === "img") {
    Object.assign(el, { alt: item.caption || "", loading: "lazy", draggable: false });
    item.ready.then(ok => { if (ok) el.src = item.src; else el.dispatchEvent(new Event("error")); });
  } else {
    Object.assign(el, { src: item.src + "#t=0.1", muted: true, loop: true, playsInline: true, preload: "metadata" });
    el.setAttribute("muted", "");
    if (play) el.addEventListener("loadeddata", () => el.play().catch(() => {}));
  }
  el.addEventListener("error", () => { el.remove(); box.classList.add("is-missing"); onFail && onFail(); }, { once: true });
  box.append(el);
  return box;
}

/* ---------- title: decode-scramble on load + cursor highlight ---------- */
function title() {
  const h = $("#entranceTitle"), g = $("#entranceGlow"), final = h.textContent;
  const set = t => { h.textContent = t; g.textContent = t; };
  const run = () => {
    if (calm()) return;
    const chars = "ABCDEFGHJKLMNPRSTUVWXYZ#%&*+=", t0 = performance.now(), dur = 1400;
    (function f(now) {
      const p = clamp((now - t0) / dur, 0, 1), n = Math.floor(p * final.length * 1.1);
      set([...final].map((c, i) => i < n ? c : chars[Math.random() * chars.length | 0]).join(""));
      if (p < 1) requestAnimationFrame(f); else set(final);
    })(t0);
  };
  document.addEventListener("live", run, { once: true });
  h.addEventListener("pointermove", e => {
    const r = h.getBoundingClientRect();
    h.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
    h.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
  });
}

/* ---------- constellation background ---------- */
function stars() {
  const cv = $("#stars"), x = cv.getContext("2d"), m = { x: -999, y: -999 };
  let w, h, dpr, P = [];
  const SP = [], ei = $(".entrance__inner");
  const init = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
    const n = clamp(Math.floor(innerWidth * innerHeight / 16000), 24, 90);
    P = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .3 * dpr, vy: (Math.random() - .5) * .3 * dpr, r: (Math.random() * 1.3 + .5) * dpr }));
  };
  init();
  addEventListener("resize", init);
  addEventListener("pointermove", e => {
    m.x = e.clientX * dpr; m.y = e.clientY * dpr;
    ei.style.setProperty("--px", (e.clientX / innerWidth * 2 - 1).toFixed(3)); ei.style.setProperty("--py", (e.clientY / innerHeight * 2 - 1).toFixed(3));
    if (!calm() && SP.length < 140) for (let i = 0; i < 2; i++) SP.push({ x: m.x, y: m.y, vx: (Math.random() - .5) * 2 * dpr, vy: (Math.random() - .5) * 2 * dpr - .4, l: 1, c: Math.random() < .5 ? "255,59,78" : "255,154,168" });
  });
  (function step() {
    requestAnimationFrame(step);
    if (calm() || document.hidden) return;
    x.clearRect(0, 0, w, h);
    const tt = performance.now() * .00018;
    for (let b = 0; b < 4; b++) {          // slow translucent red silk
      const base = h * (.25 + b * .2), amp = h * (.07 + b * .015), fq = .0016 + b * .0006;
      x.beginPath(); x.moveTo(0, h);
      for (let px = 0; px <= w; px += 8) x.lineTo(px, base + Math.sin(px * fq / dpr + tt * (1 + b * .4) + b) * amp + Math.sin(px * fq * 2.1 / dpr - tt * 1.3) * amp * .4);
      x.lineTo(w, h); x.closePath();
      const gr = x.createLinearGradient(0, base - amp, 0, h); gr.addColorStop(0, `rgba(${b % 2 ? "255,59,78" : "200,16,46"},${.07 + b * .015})`); gr.addColorStop(1, "rgba(92,14,34,0)");
      x.fillStyle = gr; x.fill();
    }
    const L = 150 * dpr;
    for (const p of P) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
      if (d < 170 * dpr && d > 0) { p.x += dx / d * 1.4 * dpr; p.y += dy / d * 1.4 * dpr; }
      x.fillStyle = "rgba(255,255,255,.6)";
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      if (d < L) {
        x.strokeStyle = `rgba(${Math.hypot(P[i].x - m.x, P[i].y - m.y) < 220 * dpr ? "255,59,78" : "200,16,46"},${(1 - d / L) * .35})`;
        x.lineWidth = dpr * .8;
        x.beginPath(); x.moveTo(P[i].x, P[i].y); x.lineTo(P[j].x, P[j].y); x.stroke();
      }
    }
    for (let i = SP.length - 1; i >= 0; i--) {
      const s = SP[i]; s.x += s.vx; s.y += s.vy; s.l -= .03;
      if (s.l <= 0) { SP.splice(i, 1); continue; }
      x.fillStyle = `rgba(${s.c},${s.l})`; x.beginPath(); x.arc(s.x, s.y, 2.2 * dpr * s.l, 0, 6.283); x.fill();
    }
  })();
}

/* ---------- falling memories: physics rain (cursor pushes them, click catches them) ---------- */
function rain() {
  const box = $("#drift"), ptr = { x: -999, y: -999, vx: 0, vy: 0 };
  let items = [], n = 0, lastSpawn = 0, storm = 0, last = performance.now(), live = false;
  const max = () => innerWidth < 700 ? 8 : 14;
  function spawn(x, y, vx = 0, vy = 0) {
    const it = ALL[n++ % ALL.length], depth = Math.random(), w = 64 + depth * 110, h = w * 1.28;
    const el = document.createElement("button");
    el.type = "button"; el.className = "rain"; el.tabIndex = -1; el.setAttribute("aria-label", it.caption);
    el.dataset.cursor = it.type === "video" ? "play" : "view";
    el.style.cssText = `width:${w}px;height:${h}px;opacity:${(.4 + depth * .5).toFixed(2)};filter:blur(${((1 - depth) * 2.2).toFixed(1)}px)`;
    el.append(tile(it, { play: it.type === "video" && depth > .5 }));
    const o = { el, w, h, depth, x: x ?? Math.random() * (innerWidth - w), y: y ?? -h - 20, vx, vy, r: Math.random() * 40 - 20, vr: (Math.random() - .5) * 1.6, ph: Math.random() * 6.28 };
    el.onclick = () => { items = items.filter(k => k !== o); el.remove(); sfx.tick(520); it.type === "video" ? openVideo(it) : showPhoto(it, PHOTOS); };
    box.append(el); items.push(o);
  }
  (function step(now) {
    requestAnimationFrame(step);
    const dt = Math.min((now - last) / 16.67, 3); last = now;
    box.style.display = calm() ? "none" : "";
    if (calm() || !live || document.hidden) return;
    const stormy = storm > now;
    if (items.length < (stormy ? 34 : max()) && now - lastSpawn > (stormy ? 70 : 650)) { spawn(); lastSpawn = now; }
    for (const o of items) {
      o.vy = Math.min(o.vy + (.05 + o.depth * .05) * dt, 1.8 + o.depth * 3.6);
      const cx = o.x + o.w / 2 - ptr.x, cy = o.y + o.h / 2 - ptr.y, d = Math.hypot(cx, cy);
      if (d < 170 && d > 1) { const f = 1 - d / 170; o.vx += cx / d * f * 1.1 * dt + ptr.vx * .015 * f; o.vy += cy / d * f * .5 * dt + ptr.vy * .01 * f; o.vr += (cx > 0 ? 1 : -1) * f * .05; }
      o.vx *= Math.pow(.985, dt); o.vr *= Math.pow(.99, dt); o.vy = Math.max(o.vy, -7);
      o.x += (o.vx + Math.sin(now * .0009 + o.ph) * .35 * (.4 + o.depth)) * dt; o.y += o.vy * dt; o.r += o.vr * dt;
      o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0) rotate(${o.r}deg)`;
    }
    ptr.vx *= .9; ptr.vy *= .9;
    items = items.filter(o => o.y < innerHeight + 60 || (o.el.remove(), false));
  })(last);
  addEventListener("pointermove", e => { ptr.vx = e.clientX - ptr.x; ptr.vy = e.clientY - ptr.y; if (Math.abs(ptr.vx) > 200) ptr.vx = ptr.vy = 0; ptr.x = e.clientX; ptr.y = e.clientY; });
  addEventListener("pointerdown", e => {
    if (!live || (e.target !== document.body && e.target !== document.documentElement)) return;
    for (let i = 0; i < 5; i++) spawn(e.clientX - 50, e.clientY - 50, (Math.random() - .5) * 7, -4 - Math.random() * 5);
    sfx.tick(380 + Math.random() * 200);
  });
  document.addEventListener("live", () => { live = true; storm = performance.now() + 2200; }, { once: true });
  document.addEventListener("storm", () => { storm = performance.now() + 3500; });
}

/* ---------- cursor + magnetic doors ---------- */
function cursor() {
  if (!fine) return;
  const c = $("#cursor"), l = $("#cursorLabel");
  let x = -99, y = -99, cx = x, cy = y;
  addEventListener("pointermove", e => {
    x = e.clientX; y = e.clientY;
    const t = e.target.closest("[data-cursor]");
    c.classList.toggle("is-on", !!t); l.textContent = t ? t.dataset.cursor : "";
  });
  (function f() { requestAnimationFrame(f); cx += (x - cx) * .22; cy += (y - cy) * .22; c.style.transform = `translate(${cx}px,${cy}px)`; })();
  $$(".door").forEach(d => {
    d.addEventListener("pointermove", e => {
      const r = d.getBoundingClientRect();
      d.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .12}px,${(e.clientY - r.top - r.height / 2) * .2}px)`;
    });
    d.addEventListener("pointerleave", () => d.style.transform = "");
  });
}

/* ---------- viewer: lightbox (zoom, swipe, thumbnails, slideshow, hearts) + video modal ---------- */
const lb = $("#lightbox"), vm = $("#videoModal"), vmPlayer = $("#vmPlayer"), lbImg = $("#lbImg"), lbStage = $("#lbStage");
let lbList = PHOTOS.slice(), lbIdx = 0, show = null, zoomed = false;
const loved = new Set();
try { JSON.parse(localStorage.getItem("loved") || "[]").forEach(k => loved.add(k)); } catch (_) {}
const isLoved = it => loved.has(it.file);
function toggleLove(it) {
  loved.has(it.file) ? loved.delete(it.file) : loved.add(it.file);
  try { localStorage.setItem("loved", JSON.stringify([...loved])); } catch (_) {}
  sfx.tick(isLoved(it) ? 700 : 400); document.dispatchEvent(new Event("loves"));
}
function paintLb() { const it = lbList[lbIdx]; if (it) $("#lbHeart").setAttribute("aria-pressed", isLoved(it)); }
function buildThumbs() {
  const t = $("#lbThumbs"); t.innerHTML = "";
  lbList.forEach((it, i) => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", it.caption); b.append(tile(it)); b.onclick = () => nav(i - lbIdx); t.append(b); });
}
function setZoom(on, e) {
  if (on) stopShow();
  zoomed = on; lbStage.classList.toggle("is-zoom", on);
  if (on && e) { const r = lbStage.getBoundingClientRect(); lbImg.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; }
}
function startShow() {
  clearInterval(show); show = setInterval(() => openLb(lbIdx + 1), 3800);
  const b = $("#lbShow"); b.setAttribute("aria-pressed", "true"); b.textContent = "pause";
  lb.classList.remove("is-show"); void lb.offsetWidth; lb.classList.add("is-show");
}
function stopShow() {
  clearInterval(show); show = null;
  const b = $("#lbShow"); b.setAttribute("aria-pressed", "false"); b.innerHTML = "&#9654; slideshow";
  lb.classList.remove("is-show");
}
function openLb(i) {
  lbIdx = (i + lbList.length) % lbList.length;
  const it = lbList[lbIdx];
  lb.classList.remove("is-missing", "is-show"); setZoom(false);
  lbImg.onerror = () => lb.classList.add("is-missing");
  lbImg.src = it.src; lbImg.alt = it.caption;
  $("#lbCap").textContent = it.caption; $("#lbNum").textContent = `${lbIdx + 1} / ${lbList.length}`;
  $$("#lbThumbs button").forEach((b, k) => { b.classList.toggle("on", k === lbIdx); if (k === lbIdx) b.scrollIntoView({ inline: "center", block: "nearest" }); });
  paintLb();
  lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
  if (show) { void lb.offsetWidth; lb.classList.add("is-show"); }
}
function showPhoto(it, list) { lbList = list.length ? list : PHOTOS; buildThumbs(); openLb(Math.max(0, lbList.indexOf(it))); }
const nav = d => { openLb(lbIdx + d); if (show) startShow(); };
function openVideo(it) {
  vm.classList.remove("is-missing");
  vmPlayer.onerror = () => vm.classList.add("is-missing");
  vmPlayer.src = it.src; $("#vmCap").textContent = it.caption;
  vm.classList.add("is-open"); vm.setAttribute("aria-hidden", "false");
  vmPlayer.play().catch(() => {});
}
const closeLb = () => { stopShow(); setZoom(false); lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); };
const closeVideo = () => { vmPlayer.pause(); vmPlayer.removeAttribute("src"); vmPlayer.load(); vm.classList.remove("is-open"); vm.setAttribute("aria-hidden", "true"); };
$("#lbClose").onclick = closeLb; $("#vmClose").onclick = closeVideo;
$("#lbPrev").onclick = () => nav(-1); $("#lbNext").onclick = () => nav(1);
$("#lbShow").onclick = () => show ? stopShow() : startShow();
$("#lbHeart").onclick = () => lbList[lbIdx] && toggleLove(lbList[lbIdx]);
[lb, vm].forEach(el => el.addEventListener("click", e => { if (e.target === el) el === lb ? closeLb() : closeVideo(); }));
let swx = null;
lbStage.addEventListener("pointerdown", e => swx = e.clientX);
lbStage.addEventListener("pointerup", e => { if (swx !== null && !zoomed && Math.abs(e.clientX - swx) > 60) nav(e.clientX < swx ? 1 : -1); swx = null; });
lbStage.addEventListener("dblclick", e => setZoom(!zoomed, e));
lbStage.addEventListener("pointermove", e => { if (zoomed && e.pointerType === "mouse") setZoom(true, e); });

/* ---------- collection: wall + 3D flow, filters, hearts, shuffle, slideshow ---------- */
function wall() {
  const el = $("#wall"), flow = $("#flow"), stage = $("#flowStage"), fcap = $("#flowCap"), sub = $("#colSub");
  const SIZES = ["feature", "square", "portrait", "wide", "square", "square", "portrait", "wide", "feature", "square", "wide", "portrait", "square"];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let filter = "all", view = "wall", fi = 0, L = [], order = [];
  { const vidAt = new Set(VIDEOS.map((_, k) => Math.round((k + .5) * ALL.length / VIDEOS.length) - 1)); let p = 0, v = 0; for (let n = 0; p < PHOTOS.length || v < VIDEOS.length; n++) order.push(v < VIDEOS.length && (vidAt.has(n) || p >= PHOTOS.length) ? VIDEOS[v++] : PHOTOS[p++]); }
  const list = () => order.filter(it => filter === "all" || (filter === "photo" && it.type === "img") || (filter === "video" && it.type === "video") || (filter === "love" && isLoved(it)));
  const open = it => it.type === "video" ? openVideo(it) : showPhoto(it, L.filter(k => k.type === "img"));
  const stats = () => { $("#loveCount").textContent = loved.size; sub.textContent = `${L.length} of ${ALL.length} memories, ${loved.size} loved`; };

  function renderWall() {
    el.innerHTML = "";
    if (!L.length) el.innerHTML = '<p class="col-empty">Nothing here yet. Tap the heart on a memory to keep it in this view.</p>';
    L.forEach((it, n) => {
      const f = document.createElement("div"), vid = it.type === "video";
      f.className = `frame frame--${SIZES[n % SIZES.length]}`; f.tabIndex = 0; f.setAttribute("role", "button");
      f.style.setProperty("--i", n); f.dataset.cursor = vid ? "play" : "view";
      f.setAttribute("aria-label", `${vid ? "Play" : "View"}: ${it.caption}`);
      f.append(tile(it));
      f.insertAdjacentHTML("beforeend", `<span class="frame__cap">${esc(it.caption)}</span>${vid ? '<span class="frame__play">&#9654;</span>' : ""}<button type="button" class="frame__love" aria-label="Love: ${esc(it.caption)}">&#9829;</button>`);
      const heart = $(".frame__love", f); heart.dataset.f = it.file; heart.classList.toggle("on", isLoved(it));
      heart.onclick = e => { e.stopPropagation(); toggleLove(it); };
      f.onclick = () => open(it);
      f.onkeydown = e => { if (e.target === f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(it); } };
      f.addEventListener("pointermove", e => {
        const r = f.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        f.style.setProperty("--gx", px * 100 + "%"); f.style.setProperty("--gy", py * 100 + "%");
        if (!calm() && e.pointerType === "mouse") { f.style.setProperty("--ry", (px - .5) * 10 + "deg"); f.style.setProperty("--rx", -(py - .5) * 10 + "deg"); }
      });
      f.addEventListener("pointerenter", e => { const v = $("video", f); if (v && e.pointerType === "mouse") v.play().catch(() => {}); });
      f.addEventListener("pointerleave", () => { f.style.removeProperty("--rx"); f.style.removeProperty("--ry"); const v = $("video", f); v && v.pause(); });
      el.append(f);
    });
  }

  function layout() {
    [...stage.children].forEach((d, i) => {
      const o = i - fi, a = Math.abs(o);
      d.style.transform = `translate(-50%,-50%) translateX(${o * 58}%) translateZ(${-a * 140}px) rotateY(${clamp(-o, -1, 1) * 48}deg) scale(${a ? .9 : 1.08})`;
      d.style.zIndex = 50 - a; d.style.opacity = a > 3 ? 0 : 1 - a * .18; d.style.pointerEvents = a > 3 ? "none" : "auto";
      d.classList.toggle("is-center", !o);
      const v = $("video", d); if (v) o ? v.pause() : v.play().catch(() => {});
    });
    fcap.textContent = L[fi] ? L[fi].caption : "Nothing here yet";
  }
  let swiped = false;
  function renderFlow() {
    stage.innerHTML = ""; fi = clamp(fi, 0, Math.max(0, L.length - 1));
    L.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "flow__item"; d.dataset.cursor = i === fi ? "open" : "go"; d.append(tile(it));
      d.onclick = () => { if (swiped) { swiped = false; return; } if (i === fi) open(it); else { fi = i; layout(); sfx.tick(500); } };
      stage.append(d);
    });
    layout();
  }
  const go = d => { fi = clamp(fi + d, 0, Math.max(0, L.length - 1)); layout(); sfx.tick(480 + fi * 25); };
  let sx = null, wl = 0;
  stage.addEventListener("pointerdown", e => { sx = e.clientX; swiped = false; });
  stage.addEventListener("pointerup", e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) { swiped = true; go(e.clientX < sx ? 1 : -1); } sx = null; });
  stage.addEventListener("wheel", e => { e.preventDefault(); const n = Date.now(); if (n - wl > 280) { go(e.deltaY + e.deltaX > 0 ? 1 : -1); wl = n; } }, { passive: false });
  $("#flowPrev").onclick = () => go(-1); $("#flowNext").onclick = () => go(1);

  function render() {
    L = list(); el.hidden = view !== "wall"; flow.hidden = view !== "flow";
    view === "wall" ? renderWall() : renderFlow();
    stats(); el.classList.remove("is-reveal"); void el.offsetWidth; el.classList.add("is-reveal");
  }
  $$("[data-f]").forEach(b => b.onclick = () => { filter = b.dataset.f; $$("[data-f]").forEach(x => x.setAttribute("aria-pressed", x === b)); fi = 0; render(); sfx.tick(480); });
  $$("[data-v]").forEach(b => b.onclick = () => { view = b.dataset.v; $$("[data-v]").forEach(x => x.setAttribute("aria-pressed", x === b)); render(); sfx.tick(560); });
  $("#colShuffle").onclick = () => { order.sort(() => Math.random() - .5); fi = 0; render(); sfx.tick(620); };
  $("#colShow").onclick = () => { const ph = list().filter(k => k.type === "img"); if (!ph.length) return; showPhoto(ph[0], ph); startShow(); };
  document.addEventListener("loves", () => {
    $$(".frame__love").forEach(b => b.classList.toggle("on", loved.has(b.dataset.f)));
    paintLb(); if (filter === "love") render(); else stats();
  });
  document.addEventListener("room", e => { if (e.detail === "collection") render(); });
  document.addEventListener("keydown", e => {
    if (lb.classList.contains("is-open")) { if (e.key === "ArrowLeft") nav(-1); if (e.key === "ArrowRight") nav(1); return; }
    if (body.dataset.room === "collection" && view === "flow" && !vm.classList.contains("is-open")) { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }
  });
}

/* ---------- her name: orbit forge (swirl, magnetic targets, sparks, auto-assemble) ---------- */
function forge() {
  const root = $("#forge"), slotsEl = $("#slots"), cardsEl = $("#forgeCards"), hint = $("#forgeHint"), ticks = $("#forgeTicks"), fx = $("#forgeFx"), fctx = fx.getContext("2d");
  const WORDS = C.NAME.split(" ").filter(Boolean), START = hint.textContent, NAME = WORDS.join("").split("");
  const rows = WORDS.map(() => { const r = document.createElement("div"); r.className = "slots__row"; slotsEl.append(r); return r; });
  const rowOf = WORDS.flatMap((wd, wi) => [...wd].map(() => wi));
  const slots = NAME.map((ch, i) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = "slot"; el.style.setProperty("--i", i);
    el.innerHTML = `<span class="glyph">${ch}</span>`; el.setAttribute("aria-label", `Letter ${ch}, empty`);
    el.addEventListener("pointermove", e => {
      if (!el.classList.contains("is-lit") || e.pointerType !== "mouse" || calm()) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 22 + "deg"); el.style.setProperty("--rx", -((e.clientY - r.top) / r.height - .5) * 22 + "deg");
    });
    el.addEventListener("pointerleave", () => { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); });
    rows[rowOf[i]].append(el);
    const t = document.createElement("i"); ticks.append(t);
    return { el, ch, tick: t, card: null, res: false };
  });
  const cards = ALL.map((item, i) => {
    const el = document.createElement("div");
    el.className = "card"; el.tabIndex = 0; el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Memory: ${item.caption}. Press Enter to place it in the next letter.`);
    el.append(tile(item)); cardsEl.append(el);
    return { el, item, i, x: 0, y: 0, state: "orbit", init: false, slot: null, ft: null };
  });
  let W = 0, H = 0, CW = 76, t = 0, spin = 1, lastNow = 0, run = false, drag = null, sparks = [], fxOn = false, autoing = false;
  const size = () => { const r = root.getBoundingClientRect(); W = fx.width = r.width; H = fx.height = r.height; CW = clamp(W * .11 * Math.min(1, Math.sqrt(13 / cards.length)), 40, 90); cards.forEach(c => c.el.style.setProperty("--cw", CW + "px")); };
  const ctr = s => { const r = s.el.getBoundingClientRect(), rr = root.getBoundingClientRect(); return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2 }; };
  const orbit = c => { const a = c.i / cards.length * 6.283 + t * .00022, s = Math.sin(a); return { x: W / 2 + Math.cos(a) * (W * .44 - CW / 2), y: H / 2 + s * H * .36, s: .78 + .22 * (s * .5 + .5), front: s > 0 }; };

  const fxStep = () => {
    fctx.clearRect(0, 0, fx.width, fx.height); fctx.globalCompositeOperation = "lighter";
    for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += .08; s.vx *= .985; s.l -= .018; fctx.fillStyle = `hsla(${s.h},90%,65%,${Math.max(s.l, 0)})`; fctx.beginPath(); fctx.arc(s.x, s.y, 2.4 * s.l + .6, 0, 6.283); fctx.fill(); }
    sparks = sparks.filter(s => s.l > 0);
    if (sparks.length) requestAnimationFrame(fxStep); else { fxOn = false; fctx.clearRect(0, 0, fx.width, fx.height); }
  };
  const burst = (p, n = 30) => {
    if (calm()) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 1 + Math.random() * 4.5; sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, l: 1, h: Math.random() < .65 ? 345 + Math.random() * 25 : 30 + Math.random() * 20 }); }
    if (!fxOn) { fxOn = true; requestAnimationFrame(fxStep); }
  };

  const frame = now => {
    if (!run) return;
    requestAnimationFrame(frame);
    if (!calm()) t += (now - lastNow) * spin;
    lastNow = now; spin += (1 - spin) * .03;
    for (const c of cards) {
      if (c.state === "placed") continue;
      let tx, ty, s = 1, front = true, k = .14;
      if (c.state === "drag") { tx = drag.x; ty = drag.y; s = 1.12; k = .4; }
      else if (c.state === "fly") { tx = c.ft.x; ty = c.ft.y; s = .55; k = .2; if (Math.hypot(c.x - tx, c.y - ty) < 10) { place(c, c.slot); continue; } }
      else { const o = orbit(c); tx = o.x; ty = o.y; s = o.s; front = o.front; }
      if (!c.init) { c.x = tx; c.y = ty; c.init = true; }
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
      c.el.style.transform = `translate(${c.x - CW / 2}px,${c.y - CW * .625}px) scale(${s})`;
      c.el.style.zIndex = c.state === "orbit" ? (front ? 4 : 1) : 6;
      c.el.classList.toggle("is-back", c.state === "orbit" && !front);
    }
  };
  const update = () => {
    const n = slots.filter(s => s.card).length, was = root.classList.contains("is-done"), done = n === slots.length;
    slots.forEach(s => s.tick.classList.toggle("on", !!s.card));
    root.classList.toggle("is-done", done);
    if (done && !was) { sfx.chime(); document.dispatchEvent(new Event("storm")); slots.forEach((s, i) => setTimeout(() => burst(ctr(s), 44), i * 110)); }
    hint.textContent = done ? `${slots.length} memories. One name. Tap a letter to release its memory.` : n ? `${n} of ${slots.length} set.` : START;
  };
  function place(c, s) {
    s.res = false; c.state = "placed"; s.card = c; c.el.classList.add("is-placed");
    s.el.prepend(tile(c.item, { play: true })); s.el.classList.add("is-lit");
    s.el.setAttribute("aria-label", `Letter ${s.ch}, set to ${c.item.caption}. Press to release.`);
    sfx.tick(260 + slots.filter(k => k.card).length * 70); burst(ctr(s)); update();
  }
  function flyTo(c, s) { s.res = true; c.slot = s; c.ft = ctr(s); c.state = "fly"; }
  function eject(s) {
    const c = s.card; if (!c) return;
    const p = ctr(s); s.card = null; $(".tile", s.el).remove(); s.el.classList.remove("is-lit");
    s.el.setAttribute("aria-label", `Letter ${s.ch}, empty`);
    c.x = p.x; c.y = p.y; c.state = "orbit"; c.el.classList.remove("is-placed"); burst(p, 14); update();
  }
  const free = () => slots.find(s => !s.card && !s.res);
  const nearest = (cx, cy) => {
    const rr = root.getBoundingClientRect(); let best = null;
    for (const s of slots) { if (s.card || s.res) continue; const p = ctr(s), d = Math.hypot(p.x - (cx - rr.left), p.y - (cy - rr.top)); if (!best || d < best.d) best = { s, p, d }; }
    return best;
  };
  slots.forEach(s => s.el.addEventListener("click", () => eject(s)));
  root.addEventListener("pointermove", e => { if (e.pointerType === "mouse") spin = Math.min(spin + Math.hypot(e.movementX || 0, e.movementY || 0) * .015, 5); });
  cardsEl.addEventListener("pointerdown", e => {
    const el = e.target.closest(".card"), c = el && cards.find(k => k.el === el);
    if (!c || c.state !== "orbit" || el.classList.contains("is-back")) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    drag = { c, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: 0, x: c.x, y: c.y };
    c.state = "drag"; el.classList.add("is-drag"); sfx.tick(330);
  });
  cardsEl.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const r = root.getBoundingClientRect(); let px = e.clientX - r.left, py = e.clientY - r.top;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    const n = nearest(e.clientX, e.clientY);
    slots.forEach(s => s.el.classList.toggle("is-target", !!n && n.s === s && n.d < 80));
    if (n && n.d < 100) { const k = (1 - n.d / 100) * .7; px += (n.p.x - px) * k; py += (n.p.y - py) * k; }
    drag.x = px; drag.y = py;
  });
  const drop = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { c, moved } = drag; drag = null; c.el.classList.remove("is-drag"); slots.forEach(s => s.el.classList.remove("is-target"));
    let s = null;
    if (e.type !== "pointercancel") { if (moved < 8) s = free(); else { const n = nearest(e.clientX, e.clientY); if (n && n.d < 80) s = n.s; } }
    s ? flyTo(c, s) : (c.state = "orbit");
  };
  cardsEl.addEventListener("pointerup", drop); cardsEl.addEventListener("pointercancel", drop);
  cardsEl.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const c = cards.find(k => k.el === e.target), s = free();
    if (c && s && c.state === "orbit") { e.preventDefault(); flyTo(c, s); }
  });
  $("#forgeAuto").onclick = () => {
    if (autoing) return; autoing = true;
    const step = () => {
      const s = free(), c = cards.find(k => k.state === "orbit" && !k.el.classList.contains("is-back")) || cards.find(k => k.state === "orbit");
      if (!s || !c) { autoing = false; return; }
      flyTo(c, s); setTimeout(step, 340);
    };
    step();
  };
  $("#forgeReset").onclick = () => { slots.forEach(eject); sfx.tick(300); };
  addEventListener("resize", () => run && size());
  document.addEventListener("room", e => {
    const on = e.detail === "guestbook";
    if (on && !run) { run = true; size(); lastNow = performance.now(); requestAnimationFrame(frame); } else if (!on) run = false;
  });
}

/* ---------- the signal (v10): tune -> charge -> "transmission received" ---------- */
function reactor() {
  const btn = $("#reactorBtn"), root = $("#reactor"), ring = $("#reactorRingFg"), label = $("#reactorLabel"), pct = $("#reactorPct"), ov = $("#overlay"), cv = $("#confetti"), orbitEl = $("#reactorOrbit");
  const scope = $("#scope"), sx = scope.getContext("2d"), box = $("#scopeBox"), tune = $("#tune"), chip = $("#sigChip"), freq = $("#sigFreq"), bars = $$("#sigBars i"), s1 = $("#step1"), s2 = $("#step2");
  const HOLD = C.HOLD_MS, CIRC = 2 * Math.PI * 45, KW = f => 3 + f * 9;
  const txt = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  ring.style.strokeDasharray = CIRC;
  for (let i = 0; i < 10; i++) { const s = document.createElement("i"); s.style.setProperty("--a", i * 36 + "deg"); orbitEl.append(s); }
  let p = 0, holding = false, fired = false, running = false, last = 0, locked = false, lockT = 0, target = .5, scopeOn = false, ph = 0, tip = "", touched = 0;

  const setLabel = () => {
    txt(label, fired ? "decoded" : !locked ? tip : p > 0 ? `decoding ${Math.round(p * 100)}%` : "locked. hold the core to decode");
    txt(pct, fired ? "\u2713" : !locked ? "tune" : p > 0 ? Math.round(p * 100) + "%" : "hold");
  };
  const paint = () => { ring.style.strokeDashoffset = CIRC * (1 - p); root.style.setProperty("--p", p.toFixed(3)); if (!fired) sfx.charge(p); setLabel(); };
  const arm = () => {
    locked = false; lockT = 0; target = .3 + Math.random() * .55; tune.value = (target < .55 ? target + .35 : target - .35).toFixed(3); tune.disabled = false;
    box.classList.remove("is-locked"); root.classList.remove("is-live"); s1.classList.add("on"); s1.classList.remove("done"); s2.classList.remove("on");
    tip = "match the gold wave with the slider"; setLabel();
  };
  const lock = () => {
    locked = true; tune.value = target; tune.disabled = true; box.classList.add("is-locked"); root.classList.add("is-live");
    s1.classList.remove("on"); s1.classList.add("done"); s2.classList.add("on");
    sfx.tune(null); sfx.chime(); navigator.vibrate && navigator.vibrate(40); setLabel();
  };

  // oscilloscope with phosphor persistence; the wave gets noisy the further off you are
  const draw = now => {
    if (!scopeOn) return;
    requestAnimationFrame(draw);
    const w = scope.clientWidth, h = scope.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (scope.width !== Math.round(w * dpr)) { scope.width = Math.round(w * dpr); scope.height = Math.round(h * dpr); }
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx.fillStyle = "rgba(14,2,7,.34)"; sx.fillRect(0, 0, w, h);
    const f = +tune.value, d = Math.abs(f - target), q = locked ? 1 : clamp(1 - d / .45, 0, 1);
    if (!calm()) ph += .06;
    sx.strokeStyle = "rgba(255,255,255,.07)"; sx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { sx.beginPath(); sx.moveTo(i * w / 8, 0); sx.lineTo(i * w / 8, h); sx.stroke(); }
    sx.beginPath(); sx.moveTo(0, h / 2); sx.lineTo(w, h / 2); sx.stroke();
    const amp = h * .3 * (1 + (locked ? p * .45 : 0));
    const trace = (kf, col, lw, blur, noise = 0) => {
      sx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = h / 2 + Math.sin(x / w * kf * 6.283 + ph) * amp + (noise ? (Math.random() - .5) * noise : 0); x ? sx.lineTo(x, y) : sx.moveTo(x, y); }
      sx.strokeStyle = col; sx.lineWidth = lw; sx.shadowBlur = blur; sx.shadowColor = col; sx.stroke(); sx.shadowBlur = 0;
    };
    trace(KW(target), locked ? "rgba(245,194,122,.9)" : "rgba(245,194,122,.5)", 2, locked ? 14 : 0);
    const g = sx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#ff3b4e"); g.addColorStop(.5, "#ff9aa8"); g.addColorStop(1, "#f5c27a");
    trace(KW(f), locked ? g : "#ff9aa8", 2.5, locked ? 16 : 6, locked ? 0 : clamp(d * 2.4, 0, 1) * amp * .5);
    // readouts
    txt(freq, (87.5 + f * 20.5).toFixed(1) + " MHz");
    txt(chip, locked ? "locked" : d < .12 ? "closing in" : "searching"); chip.classList.toggle("is-locked", locked);
    bars.forEach((b, i) => b.classList.toggle("on", q > i / 5 + .05));
    if (!locked && !fired) {
      lockT = d < .025 ? lockT + 16 : 0;
      if (lockT > 450) lock();
      else { if (!holding) tip = d < .025 ? "hold steady" : d < .12 ? "almost there" : "match the gold wave with the slider"; setLabel(); }
      sfx.tune(now - touched < 500 ? q : null);
    }
  };
  const poke = () => { touched = performance.now(); };
  tune.addEventListener("input", poke);
  const drawTune = e => { if (locked || !(e.buttons || e.pointerType === "touch")) return; const r = scope.getBoundingClientRect(); tune.value = clamp((e.clientX - r.left) / r.width, 0, 1); poke(); };
  scope.addEventListener("pointerdown", drawTune); scope.addEventListener("pointermove", drawTune);

  const loop = now => {
    const dt = Math.min(now - last, 50); last = now;
    p = clamp(p + (holding ? dt / HOLD : -dt / (HOLD * .5)), 0, 1); paint();
    if (p >= 1 && !fired) { fire(); return; }
    if (p > 0 || holding) requestAnimationFrame(loop); else running = false;
  };
  const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } };
  const set = on => {
    if (fired) return;
    if (on && !locked) { tip = "tune the signal first"; setLabel(); box.classList.remove("nudge"); void box.offsetWidth; box.classList.add("nudge"); sfx.tick(180); return; }
    holding = on; if (on) kick();
  };
  btn.addEventListener("pointerdown", e => { btn.setPointerCapture(e.pointerId); set(true); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(n => btn.addEventListener(n, () => set(false)));
  btn.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); set(true); } });
  btn.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") set(false); });
  btn.addEventListener("contextmenu", e => e.preventDefault());

  function fire() {
    fired = true; holding = false; running = false; p = 1; paint(); sfx.charge(0); sfx.boom(); sfx.chime(); document.dispatchEvent(new Event("storm"));
    body.classList.add("shake"); setTimeout(() => body.classList.remove("shake"), 700);
    navigator.vibrate && navigator.vibrate([30, 40, 80]);
    $("#signalTitle").textContent = C.SIGNAL_TEXT;
    ov.classList.add("is-open"); ov.setAttribute("aria-hidden", "false"); $("#overlayClose").focus();
    finale();
  }

  // Her message in fine serif particles: they leave the core, settle into the text, shimmer,
  // flee the cursor, and tap-anywhere sets off fireworks. Warm embers rise behind it.
  function finale() {
    const ctx = cv.getContext("2d"), still = calm(), dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const FONT = s => `700 ${s}px "Playfair Display", Georgia, serif`;
    const rb = root.getBoundingClientRect(), ox = rb.left + rb.width / 2, oy = rb.top + rb.height / 2;
    const go = () => {
      const words = C.SIGNAL_TEXT.split(" "), off = document.createElement("canvas"); off.width = W; off.height = H;
      const o = off.getContext("2d"); let best = null;
      for (let n = 1; n <= Math.min(3, words.length); n++) {
        const per = Math.ceil(words.length / n), ls = [];
        for (let i = 0; i < words.length; i += per) ls.push(words.slice(i, i + per).join(" "));
        o.font = FONT(100);
        const mw = Math.max(...ls.map(l => o.measureText(l).width)), fz = Math.min(100 * W * .84 / mw, H * .3 / (ls.length * 1.15), 160);
        if (!best || fz > best.fz) best = { fz, ls };
      }
      const fs = best.fz, lh = fs * 1.15, y0 = H * .4 - (best.ls.length - 1) * lh / 2;
      o.font = FONT(fs); o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff";
      let area = 0; best.ls.forEach((l, i) => { o.fillText(l, W / 2, y0 + i * lh); area += o.measureText(l).width * lh; });
      const gap = clamp(Math.round(Math.sqrt(area * .38 / (W < 700 ? 3200 : 7500))), 2, 6), sz = gap * .78;
      const data = o.getImageData(0, 0, W, H).data, map = {};
      for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap) if (data[(y * W + x) * 4 + 3] > 128) {
        const hue = Math.round((350 + x / W * 50) / 10) * 10 % 360, b = map[hue] || (map[hue] = { c: `hsl(${hue},88%,66%)`, ph: hue, a: [] });
        const a = Math.random() * 6.283, v = 10 + Math.random() * 30;
        b.a.push({ tx: x, ty: y, x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, m: .7 + Math.random() * .6 });
      }
      const bins = Object.values(map), S = [], E = [], m = { x: -999, y: -999 }, t0 = performance.now();
      const boom = (x, y, n = 46) => {
        const hue = 350 + Math.random() * 40;
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 6; S.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, h: (hue + Math.random() * 16) % 360, r: Math.random() < .3 }); }
        sfx.tick(300 + Math.random() * 400);
      };
      cv.onpointermove = e => { m.x = e.clientX; m.y = e.clientY; };
      cv.onpointerleave = () => { m.x = m.y = -999; };
      cv.onpointerdown = e => boom(e.clientX, e.clientY, 60);
      const shots = still ? [] : [[.5, .2, .3], [.9, .82, .26], [1.3, .5, .5]];
      let nextFw = 3.2, nextEm = 0, prev = t0;
      (function f(now) {
        if (!ov.classList.contains("is-open")) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); return; }
        requestAnimationFrame(f);
        const f60 = Math.min((now - prev) / 1000, .05) * 60; prev = now;
        const age = (now - t0) / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
        const gl = ctx.createRadialGradient(W / 2, H * .4, 0, W / 2, H * .4, Math.max(W, H) * .55);
        gl.addColorStop(0, `rgba(255,120,110,${.22 * clamp(age / 2, 0, 1)})`); gl.addColorStop(1, "rgba(255,60,70,0)"); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
        const k0 = clamp((age - .25) / 1.2, 0, 1) * .018 + .002, damp = Math.pow(.9, f60), sweep = ((age * .45) % 1.5 - .25) * W;
        for (const b of bins) {
          ctx.fillStyle = b.c; ctx.globalAlpha = .86 + .12 * Math.sin(age * 2.6 + b.ph);
          for (const q of b.a) {
            if (still) { q.x = q.tx; q.y = q.ty; }
            else {
              const k = k0 * q.m * f60;
              q.vx = (q.vx + (q.tx - q.x) * k) * damp; q.vy = (q.vy + (q.ty - q.y) * k) * damp;
              const dx = q.x - m.x, dy = q.y - m.y, d = Math.hypot(dx, dy);
              if (d < 110 && d > 0) { const r = (1 - d / 110) * 2.4 * f60; q.vx += dx / d * r; q.vy += dy / d * r; }
              q.x += q.vx * f60; q.y += q.vy * f60;
            }
            ctx.fillRect(q.x, q.y, sz, sz);
          }
        }
        if (age > 1.8) { ctx.fillStyle = "#fff"; ctx.globalAlpha = .55; const win = W * .025; for (const b of bins) for (const q of b.a) if (Math.abs(q.x - sweep) < win) ctx.fillRect(q.x, q.y, sz, sz); }
        while (shots.length && age > shots[0][0]) { const s = shots.shift(); boom(W * s[1], H * s[2], 50); }
        if (!still && age > nextFw) { boom(W * (.1 + Math.random() * .8), H * (.12 + Math.random() * .4)); nextFw = age + .8 + Math.random() * .7; }
        if (!still && age > nextEm && E.length < 40) { E.push({ x: Math.random() * W, y: H + 10, vy: -(.4 + Math.random() * 1.1), ph: Math.random() * 6.28 }); nextEm = age + .12; }
        for (let i = S.length - 1; i >= 0; i--) {
          const s = S[i]; s.vy += .07 * f60; s.vx *= Math.pow(.99, f60); s.x += s.vx * f60; s.y += s.vy * f60; s.l -= .012 * f60;
          if (s.l <= 0) { S.splice(i, 1); continue; }
          ctx.globalAlpha = s.l; ctx.fillStyle = `hsl(${s.h},90%,62%)`;
          if (s.r) ctx.fillRect(s.x, s.y, 6, 3); else { ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 6.283); ctx.fill(); }
        }
        for (let i = E.length - 1; i >= 0; i--) {
          const e = E[i]; e.y += e.vy * f60; e.x += Math.sin(age * 1.5 + e.ph) * .4 * f60;
          if (e.y < -10) { E.splice(i, 1); continue; }
          ctx.globalAlpha = .45; ctx.fillStyle = "#f5c27a"; ctx.beginPath(); ctx.arc(e.x, e.y, 1.6, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      })(t0);
    };
    (document.fonts ? document.fonts.load(FONT(100)).catch(() => {}) : Promise.resolve()).then(go);
  }
  const reset = () => {
    fired = false; holding = false; p = 0; sfx.charge(0); ov.classList.remove("is-open"); ov.setAttribute("aria-hidden", "true");
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); paint();
  };
  $("#overlayClose").onclick = () => { reset(); btn.focus(); };
  ov.closeLayer = () => { reset(); btn.focus(); };
  document.addEventListener("room", e => {
    const on = e.detail === "reveal";
    if (on && !scopeOn) { scopeOn = true; requestAnimationFrame(draw); }
    if (!on) { scopeOn = false; sfx.tune(null); reset(); arm(); }
  });
  arm(); paint();
}

/* ---------- make a wish: cake, candles, tap / button / microphone blow, wish lantern ---------- */
function wish() {
  const box = $("#cake"), note = $("#wishNote"), N = clamp(C.CANDLES || 7, 1, 9), frost = "#ffe3df";
  let finished = false, listening = null;
  const tier = (x, y, wd, ht, col) => {
    let s = `<rect x="${x}" y="${y}" width="${wd}" height="${ht}" rx="12" fill="${col}"/><rect x="${x}" y="${y}" width="${wd}" height="14" rx="7" fill="${frost}"/>`;
    for (let d = x + 14; d < x + wd - 14; d += 26) s += `<rect x="${d}" y="${y + 6}" width="12" height="${14 + (d * 7) % 18}" rx="6" fill="${frost}"/>`;
    return s;
  };
  const xs = Array.from({ length: N }, (_, i) => N === 1 ? 200 : 150 + i * (100 / (N - 1)));
  box.innerHTML = `<svg viewBox="0 0 400 300" role="img" aria-label="A birthday cake with ${N} candles"><defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3b4e"/><stop offset=".55" stop-color="#ffb347"/><stop offset="1" stop-color="#fff3b0"/></linearGradient></defs><ellipse cx="200" cy="278" rx="175" ry="12" fill="rgba(0,0,0,.45)"/>`
    + tier(50, 190, 300, 80, "#7a1228") + tier(95, 138, 210, 60, "#a8142e") + tier(140, 98, 120, 48, "#d81f3c")
    + xs.map(x => `<g class="candle" transform="translate(${x} 0)"><rect x="-3.5" y="62" width="7" height="38" rx="2" fill="#fff1ee"/><rect x="-3.5" y="72" width="7" height="4" fill="#ff9aa8"/><rect x="-3.5" y="84" width="7" height="4" fill="#ff9aa8"/><g class="flame"><ellipse cx="0" cy="50" rx="5.5" ry="11" fill="url(#fl)"/></g><circle class="hit" cx="0" cy="52" r="16" fill="transparent"/></g>`).join("") + "</svg>";
  const lit = () => $$(".candle:not(.out)", box);
  function lantern() {
    const l = document.createElement("div"); l.className = "lantern"; l.innerHTML = "<i></i><span></span>";
    $("span", l).textContent = $("#wishText").value.trim() || "a wish"; body.append(l); setTimeout(() => l.remove(), 8200);
  }
  function check() {
    if (finished || lit().length) return;
    finished = true; stopMic(); sfx.chime(); document.dispatchEvent(new Event("storm")); lantern();
    $("#wishBlow").textContent = "relight"; note.textContent = "Your wish is on its way.";
  }
  function out(c) {
    if (c.classList.contains("out")) return;
    c.classList.add("out"); c.insertAdjacentHTML("beforeend", '<path class="smoke" d="M0 42 q-9 -12 0 -24 t0 -24"/>');
    sfx.tick(560 - (N - lit().length) * 35); check();
  }
  const blowAll = () => { if (!finished) lit().forEach((c, i) => setTimeout(() => out(c), i * 140)); };
  function relight() { finished = false; $$(".candle", box).forEach(c => { c.classList.remove("out"); $$(".smoke", c).forEach(s => s.remove()); }); $("#wishBlow").textContent = "blow"; note.textContent = ""; }
  async function startMic() {
    if (listening || finished) return;
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true }), ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser();
      an.fftSize = 512; ac.createMediaStreamSource(st).connect(an);
      const buf = new Uint8Array(an.fftSize); let hot = 0; listening = { st, ac };
      note.textContent = "listening... blow gently at your microphone";
      (function f() {
        if (!listening) return; requestAnimationFrame(f);
        an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) { const d = (v - 128) / 128; s += d * d; }
        hot = Math.sqrt(s / buf.length) > .22 ? hot + 1 : 0; if (hot > 5) { hot = 0; blowAll(); }
      })();
    } catch (_) { note.textContent = "Microphone isn't available here. Tap the flames or press blow."; }
  }
  function stopMic() { if (!listening) return; listening.st.getTracks().forEach(t => t.stop()); listening.ac.close(); listening = null; }
  box.addEventListener("click", e => { const c = e.target.closest(".candle"); if (c) out(c); });
  $("#wishBlow").onclick = () => finished ? relight() : blowAll();
  $("#wishMic").onclick = startMic;
  document.addEventListener("room", e => { if (e.detail !== "wish") { stopMic(); relight(); } });
}

/* ---------- music player ---------- */
function player() {
  const a = $("#bgAudio"), pl = $("#player"), btn = $("#playerPlay"), bar = $("#playerBar"), fill = $("#playerFill"), vol = $("#playerVolume"), tt = $("#playerTitle");
  tt.textContent = C.SONG_TITLE; a.volume = +vol.value;
  btn.onclick = () => a.paused ? a.play().catch(() => tt.textContent = "add audio/birthday-song.mp3") : a.pause();
  const sync = () => { const on = !a.paused; pl.classList.toggle("is-playing", on); btn.setAttribute("aria-label", on ? "Pause" : "Play"); $(".icon-play").toggleAttribute("hidden", on); $(".icon-pause").toggleAttribute("hidden", !on); };
  a.onplay = a.onpause = a.onended = sync;
  a.ontimeupdate = () => fill.style.transform = `scaleX(${a.duration ? a.currentTime / a.duration : 0})`;
  bar.onclick = e => { const r = bar.getBoundingClientRect(); if (a.duration) a.currentTime = a.duration * (e.clientX - r.left) / r.width; };
  vol.oninput = () => a.volume = +vol.value;
  a.addEventListener("error", () => tt.textContent = "add audio/birthday-song.mp3", true);
}

/* ---------- routing: #hash <-> rooms, Esc, focus, progress ---------- */
function router() {
  const rooms = $$(".room"), seen = new Set(), fill = $("#progressFill");
  let trigger = null;
  const route = () => {
    const id = (location.hash || "#entrance").slice(1), room = rooms.find(r => r.id === id);
    rooms.forEach(r => { const on = r === room; r.classList.toggle("is-open", on); r.setAttribute("aria-hidden", !on); r.inert = !on; });
    const cur = room ? id : "entrance";
    body.dataset.room = cur;
    $$(".site-nav__link").forEach(l => l.classList.toggle("is-active", l.dataset.go === cur));
    if (room) { sfx.tick(440 + seen.size * 110); seen.add(id); $$(`.door[data-go="${id}"]`).forEach(d => d.classList.add("is-seen")); setTimeout(() => $(".room__close", room).focus({ preventScroll: true }), 80); }
    else if (trigger) { trigger.focus({ preventScroll: true }); trigger = null; }
    fill.style.transform = `scaleX(${seen.size / rooms.length})`;
    document.dispatchEvent(new CustomEvent("room", { detail: cur }));
  };
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (a) { e.preventDefault(); trigger = a.classList.contains("door") ? a : null; if (location.hash !== a.getAttribute("href")) location.hash = a.getAttribute("href"); else route(); }
    if (e.target.closest(".room__close") || rooms.includes(e.target)) location.hash = "#entrance";
  });
  addEventListener("hashchange", route);
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (vm.classList.contains("is-open")) closeVideo();
    else if (lb.classList.contains("is-open")) closeLb();
    else if ($("#overlay").classList.contains("is-open")) $("#overlay").closeLayer();
    else if (body.dataset.room !== "entrance") location.hash = "#entrance";
  });
  route();
}

/* ---------- reduce-motion pill ---------- */
function motion() {
  const b = $("#motionToggle");
  const set = on => { body.classList.toggle("calm", on); b.setAttribute("aria-pressed", on); try { localStorage.setItem("calm", on ? "1" : "0"); } catch (_) {} };
  try { set(localStorage.getItem("calm") === "1"); } catch (_) {}
  b.onclick = () => set(!body.classList.contains("calm"));
  $("#replayToggle").onclick = () => { history.replaceState(null, "", location.pathname + location.search); location.reload(); };
  const s = $("#soundToggle");
  const snd = on => { sfx.on = on; s.classList.toggle("is-off", !on); s.textContent = on ? "sound on" : "sound off"; try { localStorage.setItem("snd", on ? "1" : "0"); } catch (_) {} };
  try { snd(localStorage.getItem("snd") !== "0"); } catch (_) { snd(true); }
  s.onclick = () => { sfx.unlock(); snd(!sfx.on); if (sfx.on) sfx.tick(600); };
}


/* ---------- copy: names and taglines come from config.js ---------- */
function copy() {
  const D = C.DISPLAY_NAME || C.NAME, [first, ...rest] = D.split(" ");
  $("#entranceTitle").textContent = first; $("#entranceGlow").textContent = first;
  const sis = $("#entranceSis"); rest.length ? sis.textContent = rest.join(" ") : sis.remove();
  $(".entrance__subtitle").textContent = C.TAGLINE || "";
  $("#introTitleName").textContent = D; $("#colophon").textContent = C.FOOTER || "";
  document.title = D + " \u2014 Transmission";
}

/* ---------- the opening film (v8): sharp on retina, sprite-cached photos, one continuous camera curve ---------- */
function intro() {
  const el = $("#intro"), burst = $("#burst"), go = $("#introGo"), line = $("#introLine"), prog = $("#introProg"), title = $("#introTitle");
  const goLive = () => { body.classList.add("is-live"); document.dispatchEvent(new Event("live")); };
  if (calm()) { el.remove(); burst.remove(); goLive(); return; }
  const cv = $("#warp"), x = cv.getContext("2d"), cols = ["#fff", "#ff3b4e", "#ff9aa8", "#c8102e", "#f5c27a"];
  const DISPLAY = C.DISPLAY_NAME || C.NAME;
  const SCENES = [[0, "incoming transmission"], [3.6, "carrying every memory we made"], [7.6, "for " + DISPLAY], [11, "happy birthday"]];
  const END = 12.8, font = s => `800 ${s}px Unbounded, system-ui, sans-serif`;
  const ss = u => u * u * (3 - 2 * u);
  const kf = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * ss((t - a[0]) / (b[0] - a[0])); } return pts[pts.length - 1][1]; };
  const SPEED = [[0, .004], [3.3, .004], [4.3, .012], [6.8, .15], [7.8, .15], [9.4, .004]];
  const CARD = [[0, 0], [3.4, .004], [5.5, .022], [7.4, .026], [8.6, .006], [9.6, 0]];
  const ROLL = [[0, 0], [3.6, 0], [7.2, .32], [9.4, 0]];
  const g = (d, s, a) => a * Math.exp(-d * d / (2 * s * s));
  const ecg = s => [.2, .5, .8].reduce((t, b) => { const d = s - b; return t + g(d + .04, .012, .12) + g(d, .004, 1) + g(d - .012, .005, -.35) + g(d - .07, .02, .18); }, 0);
  let w, h, dpr = 1, state = "idle", T = 0, last = performance.now(), travel = 0, sceneI = -1, glow = 0, bins = null, gapPx = 4, typing = null, shown = "", ready = false;
  const conf = [];
  const S = Array.from({ length: 320 }, (_, i) => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), c: i % 5 }));

  // her name as particles (sampled once, before she presses play, so there is no hitch)
  const build = () => {
    const off = document.createElement("canvas"); off.width = w; off.height = h;
    const o = off.getContext("2d"), lines = C.NAME.split(" ").filter(Boolean);
    o.font = font(100);
    const mw = Math.max(...lines.map(l => o.measureText(l).width)), fs = Math.min(100 * w * .86 / mw, h * .2, 190), lh = fs * 1.18, y0 = h * .44 - (lines.length - 1) * lh / 2;
    o.font = font(fs); o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff";
    lines.forEach((l, i) => o.fillText(l, w / 2, y0 + i * lh));
    const d = o.getImageData(0, 0, w, h).data, map = {}; gapPx = Math.max(3, Math.round(fs / 24));
    for (let y = 0; y < h; y += gapPx) for (let px = 0; px < w; px += gapPx) if (d[(y * w + px) * 4 + 3] > 128) {
      const hue = Math.round((350 + px / w * 50) / 14) * 14, b = map[hue] || (map[hue] = { c: `hsl(${hue},85%,64%)`, ph: hue, a: [] });
      b.a.push({ tx: px, ty: y, x: Math.random() * w, y: Math.random() < .5 ? -30 : h + 30, vx: 0, vy: 0, free: false });
    }
    bins = Object.values(map);
  };
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    if (state === "idle" && ready) build();
  };
  size(); addEventListener("resize", size);
  (document.fonts ? document.fonts.load(font(100)).catch(() => {}) : Promise.resolve()).then(() => { ready = true; if (state === "idle") build(); });

  // photo prints are drawn once into sprites, then only scaled each frame
  const SW = 360, SH = 450, PAD = 8, M = 36;
  const cards = PHOTOS.map((it, i) => { const im = new Image(); it.ready.then(ok => { if (ok) im.src = it.src; }); return { im, hue: it.hue, th: i * 2.4, r: .5 + .28 * (i % 3) / 2, z0: 1.15 + i * Math.min(.3, 3.6 / PHOTOS.length), rot: (i % 2 ? 1 : -1) * (.08 + .05 * (i % 4)), sp: null, ok: false }; });
  const order = cards.slice().sort((a, b) => b.z0 - a.z0);
  const sprite = c => {
    const ok = c.im.complete && c.im.naturalWidth > 0;
    if (c.sp && (c.ok || !ok)) return c.sp;
    const s = document.createElement("canvas"); s.width = SW + PAD * 2 + M * 2; s.height = SH + PAD * 2 + 14 + M * 2;
    const o = s.getContext("2d"); o.translate(M, M);
    o.shadowColor = "rgba(255,120,120,.55)"; o.shadowBlur = 24; o.fillStyle = "#fff1ee"; o.fillRect(0, 0, SW + PAD * 2, SH + PAD * 2 + 14); o.shadowBlur = 0;
    if (ok) {
      const im = c.im, ir = im.naturalWidth / im.naturalHeight, tr = SW / SH; let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
      if (ir > tr) { sw = sh * tr; sx = (im.naturalWidth - sw) / 2; } else { sh = sw / tr; sy = (im.naturalHeight - sh) / 2; }
      o.drawImage(im, sx, sy, sw, sh, PAD, PAD, SW, SH);
    } else { const gr = o.createLinearGradient(PAD, PAD, PAD + SW, PAD + SH); gr.addColorStop(0, `hsl(${c.hue},70%,34%)`); gr.addColorStop(1, `hsl(${c.hue + 28},75%,14%)`); o.fillStyle = gr; o.fillRect(PAD, PAD, SW, SH); }
    c.sp = s; c.ok = ok; return s;
  };
  const drawCard = (c, f, cx, cy) => {
    const z = c.z0 - travel; if (z < .05 || z > 3.2) return;
    const a = clamp((2.2 - z) * 1.5, 0, 1) * clamp(z / .15, 0, 1); if (a < .01) return;
    const sp = sprite(c), k = (f * .5 / z) / SW, dw = sp.width * k, dh = sp.height * k; if (dw > w * 3) return;
    x.save(); x.globalAlpha = a; x.translate(cx + Math.cos(c.th) * c.r * 1.5 / z * f, cy + Math.sin(c.th) * c.r / z * f); x.rotate(c.rot + kf(T, ROLL) * .5);
    x.drawImage(sp, -dw / 2, -dh / 2, dw, dh); x.restore();
  };
  const explode = () => { if (bins) for (const b of bins) for (const q of b.a) { const dx = q.x - w / 2, dy = q.y - h / 2, d = Math.hypot(dx, dy) || 1, v = 3 + Math.random() * 9; q.vx = dx / d * v + (Math.random() - .5) * 3; q.vy = dy / d * v - 2; q.free = true; } };
  const confetti = () => { const cl = ["#ff3b4e", "#c8102e", "#ff9aa8", "#f5c27a"]; for (let i = 0; i < 150; i++) { const a = Math.random() * 6.283, v = 5 + Math.random() * 14; conf.push({ x: w / 2, y: h * .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, r: Math.random() * 6, w: 5 + Math.random() * 7, c: cl[i % 4], l: 1 }); } };
  const onScene = i => {
    if (i < 0) return;
    typing = { text: SCENES[i][1], t: T + (i ? .3 : 0) };
    if (i === 0) sfx.hum(3.8);
    if (i === 1) { glow = .35; sfx.whoosh(4.4); }
    if (i === 2) { glow = .4; sfx.boom(); setTimeout(() => sfx.chime(), 900); }
    if (i === 3) { glow = .5; explode(); confetti(); title.classList.add("show"); sfx.chime(); setTimeout(() => sfx.chime(), 260); }
  };
  const finish = () => {
    if (state === "done") return; state = "done";
    sfx.boom(); burst.classList.add("go"); el.classList.add("is-collapse");
    setTimeout(goLive, 250);
    if (C.AUTOPLAY_SONG) $("#bgAudio").play().catch(() => {});
    setTimeout(() => { el.remove(); burst.remove(); }, 1500);
  };

  (function draw(now) {
    if (!el.isConnected) return;
    requestAnimationFrame(draw);
    const dt = Math.min((now - last) / 1000, .05); last = now;      // capped, so a hiccup never skips the film ahead
    const f60 = dt * 60;
    if (state === "play") { T += dt; if (T >= END) finish(); }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const si = state === "idle" ? -1 : SCENES.reduce((a, s, i) => T >= s[0] ? i : a, 0);
    if (si !== sceneI) { sceneI = si; onScene(si); }
    const speed = state === "idle" ? .004 : kf(T, SPEED), roll = kf(T, ROLL);
    travel += kf(T, CARD) * f60;
    const trail = state === "idle" ? .5 : 1 - .78 * ss(clamp((T - 3.3) / 1, 0, 1));
    x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.fillStyle = `rgba(26,4,12,${trail})`; x.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, f = Math.min(w, h) * .6;

    // 1. heartbeat that opens into a beam, then dissolves into the warp
    if (state !== "idle" && T < 4.5) {
      const u0 = T / 3.6, lp = clamp(u0 / .7, 0, 1), flat = clamp((u0 - .7) / .3, 0, 1), beamA = T < 3.6 ? 1 : 1 - ss(clamp((T - 3.6) / .8, 0, 1));
      x.globalAlpha = beamA;
      if (T < 1.8) for (let i = 0, n = Math.floor(140 * Math.max(0, 1 - u0 * 2)); i < n; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .25})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
      const A = h * .2 * (1 - flat), gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#ff3b4e"); gr.addColorStop(.5, "#ff9aa8"); gr.addColorStop(1, "#f5c27a");
      x.beginPath(); let hy = cy;
      for (let px = 0; px <= w * lp; px += 2) { hy = cy - ecg(px / w) * A; px ? x.lineTo(px, hy) : x.moveTo(px, hy); }
      x.strokeStyle = gr; x.lineWidth = 2 + flat * 3; x.shadowColor = "#ff3b4e"; x.shadowBlur = 14; x.stroke(); x.shadowBlur = 0;
      if (lp < 1) { x.fillStyle = "#fff"; x.beginPath(); x.arc(w * lp, hy, 4, 0, 6.283); x.fill(); }
      if (flat > 0) { const bh = h * .7 * (1 - Math.pow(1 - flat, 3)), bg = x.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2); bg.addColorStop(0, "rgba(255,154,168,0)"); bg.addColorStop(.5, `rgba(255,235,225,${.5 * flat})`); bg.addColorStop(1, "rgba(255,59,78,0)"); x.fillStyle = bg; x.fillRect(0, cy - bh / 2, w, bh); }
      x.globalAlpha = 1;
    }

    // 2. stars: five colour batches, one stroke each
    const starA = state === "idle" ? 1 : clamp((T - 3) / 1.2, 0, 1);
    if (starA > 0) {
      const sf = Math.min(w, h) * .9, segs = Array.from({ length: 15 }, () => []);
      for (const s of S) {
        const pz = s.z; s.z -= speed * f60;
        if (s.z <= .01) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; continue; }
        segs[s.c * 3 + (s.z < .35 ? 2 : s.z < .7 ? 1 : 0)].push(cx + s.x / pz * sf, cy + s.y / pz * sf * .6, cx + s.x / s.z * sf, cy + s.y / s.z * sf * .6);
      }
      x.save(); x.translate(cx, cy); x.rotate(roll); x.translate(-cx, -cy); x.lineCap = "round";
      for (let k = 0; k < 15; k++) {
        const a = segs[k]; if (!a.length) continue;
        x.strokeStyle = cols[(k / 3) | 0]; x.globalAlpha = [.35, .7, 1][k % 3] * starA; x.lineWidth = 1 + (k % 3) * (.6 + speed * 8);
        x.beginPath(); for (let i = 0; i < a.length; i += 4) { x.moveTo(a[i], a[i + 1]); x.lineTo(a[i + 2], a[i + 3]); } x.stroke();
      }
      x.restore(); x.globalAlpha = 1;
    }

    // 3. her photos rush past the camera
    if (state !== "idle" && T > 3.3 && T < 10) {
      x.save(); x.translate(cx, cy); x.rotate(roll * .6); x.translate(-cx, -cy);
      for (const c of order) drawCard(c, f, cx, cy);
      x.restore();
    }

    // 4. her name: particles drift in during the warp, settle, shimmer, then burst apart
    if (bins && state !== "idle" && T > 7.2) {
      const age = T - 7.2, k = (clamp(age / 1.3, 0, 1) * .02 + .002) * f60, damp = Math.pow(.88, f60), fade = clamp(1 - (T - 11) / 1.5, 0, 1), sweep = ((age * .5) % 1.4 - .2) * w, sz = gapPx * .7;
      x.globalCompositeOperation = "lighter";
      for (const b of bins) {
        x.fillStyle = b.c; x.globalAlpha = (.82 + .14 * Math.sin(age * 3 + b.ph)) * fade;
        for (const q of b.a) {
          if (q.free) { q.vy += .1 * f60; q.vx *= Math.pow(.985, f60); q.x += q.vx * f60; q.y += q.vy * f60; }
          else { q.vx = (q.vx + (q.tx - q.x) * k) * damp; q.vy = (q.vy + (q.ty - q.y) * k) * damp; q.x += q.vx; q.y += q.vy; }
          x.fillRect(q.x, q.y, sz, sz);
        }
      }
      if (age > 1.8 && fade > 0) { x.fillStyle = "#fff"; x.globalAlpha = .5 * fade; const win = w * .03; for (const b of bins) for (const q of b.a) if (!q.free && Math.abs(q.x - sweep) < win) x.fillRect(q.x, q.y, sz, sz); }
      x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    }

    // confetti + soft glow (no hard white flashes)
    for (let i = conf.length - 1; i >= 0; i--) {
      const q = conf[i]; q.vy += .25 * f60; q.vx *= Math.pow(.985, f60); q.x += q.vx * f60; q.y += q.vy * f60; q.r += .12 * f60; q.l -= .008 * f60;
      if (q.l <= 0) { conf.splice(i, 1); continue; }
      x.save(); x.globalAlpha = q.l; x.translate(q.x, q.y); x.rotate(q.r); x.fillStyle = q.c; x.fillRect(-q.w / 2, -q.w / 4, q.w, q.w / 2); x.restore();
    }
    if (glow > .01) {
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .7); gr.addColorStop(0, `rgba(255,205,175,${glow})`); gr.addColorStop(1, "rgba(255,80,90,0)");
      x.fillStyle = gr; x.fillRect(0, 0, w, h); glow *= Math.pow(.93, f60);
    }

    // subtitles cross-fade, then type in
    if (typing) {
      const on = T >= typing.t;
      if (!on !== line.classList.contains("swap")) line.classList.toggle("swap", !on);
      const txt = on ? typing.text.slice(0, Math.min(typing.text.length, Math.floor((T - typing.t) * 30))) : shown;
      if (txt !== shown) { shown = txt; line.textContent = txt; }
    }
    prog.style.transform = `scaleX(${clamp(T / END, 0, 1)})`;
  })(last);

  go.onclick = () => { sfx.unlock(); cards.forEach(sprite); el.classList.add("is-play"); go.remove(); T = 0; state = "play"; };
  const skip = () => { if (state === "idle") { state = "done"; el.remove(); burst.remove(); goLive(); } else finish(); };
  $("#introSkip").onclick = skip;
  addEventListener("keydown", e => { if (e.key === "Escape" && el.isConnected) skip(); });
  go.focus({ preventScroll: true });
}

motion(); copy(); title(); stars(); rain(); cursor(); wall(); forge(); reactor(); wish(); player(); router(); intro();
})();
