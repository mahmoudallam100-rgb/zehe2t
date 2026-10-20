/* =========================================================
   زهقت — الأساسيات: الحفظ، النقط والدرجات، الأصوات، الرسايل،
   زرار "المدير جاي"، كارت الحضور، وواجهة السيرفر (المرحلة 2)
   ========================================================= */
window.Z = window.Z || {};

/* ---------- أدوات صغيرة ---------- */
Z.$ = (sel, root) => (root || document).querySelector(sel);
Z.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
Z.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
Z.fmt = (n) => Number(n || 0).toLocaleString("en-US");
Z.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Z.pad = (n) => String(n).padStart(2, "0");
Z.todayKey = (d) => { d = d || new Date(); return d.getFullYear() + "-" + Z.pad(d.getMonth() + 1) + "-" + Z.pad(d.getDate()); };
Z.MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
Z.DAYS = ["الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];
/* العدد مع المعدود: Z.n(3, "حركة واحدة", "حركتين", "حركات", "حركة") = "3 حركات" */
Z.n = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? n + " " + few : n + " " + many);
Z.secs = (n) => Z.n(n, "ثانية واحدة", "ثانيتين", "ثواني", "ثانية");
Z.reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* أرقام عشوائية ثابتة لتحدي النهارده (نفس الأسئلة لكل الناس في نفس اليوم) */
Z.seedFrom = (str) => { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; };
Z.rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Z.shuffle = (arr, rand) => { rand = rand || Math.random; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- الحفظ على الجهاز ---------- */
Z.store = (function () {
  const KEY = "zehe2t:v1";
  const fresh = () => ({ name: "", gov: "", xp: 0, best: {}, plays: {}, totalPlays: 0, visits: {}, daily: {}, sound: false, bossHint: false, learned: {} });
  let mem = null;
  function load() {
    if (mem) return mem;
    try { const raw = localStorage.getItem(KEY); mem = Object.assign(fresh(), raw ? JSON.parse(raw) : {}); }
    catch (e) { mem = fresh(); }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* التخزين مقفول: نكمل من غير حفظ */ } }
  return {
    get: () => load(),
    set(patch) { Object.assign(load(), patch); save(); },
    update(fn) { fn(load()); save(); },
    reset() { mem = fresh(); save(); }
  };
})();

/* ---------- السيرفر (المرحلة 2) ----------
   دلوقتي كل حاجة محلية. لما نوصّل Firebase أو سيرفر على Render
   هنغيّر الدوال دي بس، وباقي الموقع مش هيتغير. */
Z.api = {
  online: false,
  async hit() { return null; },                 // يرجّع { today, total } لما يبقى فيه سيرفر
  async submitScore(gameId, score) { return null; },
  async leaderboard(gameId, period) { return null; }
};

/* ---------- الدرجات الوظيفية والنقط ---------- */
Z.level = function (xp) {
  const L = Z.LEVELS; let i = 0;
  while (i + 1 < L.length && xp >= L[i + 1].xp) i++;
  const cur = L[i], next = L[i + 1] || null;
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { index: i, grade: i + 1, name: cur.name, next, need: next ? next.xp - xp : 0, pct: Z.clamp(pct, 0, 1) };
};

Z.addXP = function (amount) {
  amount = Math.max(0, Math.round(amount));
  const s = Z.store.get();
  const before = Z.level(s.xp).index;
  Z.store.update((st) => { st.xp += amount; });
  const after = Z.level(Z.store.get().xp);
  if (after.index > before) {
    Z.sfx.play("win");
    Z.toast("ترقية! بقيت «" + after.name + "»", "stamp");
  }
  document.dispatchEvent(new CustomEvent("z:xp"));
  return amount;
};

/* تسجيل نتيجة لعبة: يرجّع { best, isBest, xp } */
Z.recordScore = function (id, score, xpDiv) {
  const s = Z.store.get();
  const prev = s.best[id] || 0;
  const isBest = score > prev;
  Z.store.update((st) => {
    if (isBest) st.best[id] = score;
    st.plays[id] = (st.plays[id] || 0) + 1;
    st.totalPlays = (st.totalPlays || 0) + 1;
  });
  const xp = Z.addXP(Z.clamp(score / (xpDiv || 10), 5, 60));
  Z.api.submitScore(id, score);
  return { best: Math.max(prev, score), prev, isBest, xp };
};

/* ---------- كارت الحضور ---------- */
Z.punchIn = function () {
  const k = Z.todayKey();
  const s = Z.store.get();
  if (!s.visits[k]) {
    const d = new Date();
    Z.store.update((st) => {
      st.visits[k] = Z.pad(d.getHours()) + ":" + Z.pad(d.getMinutes());
      // نحتفظ بآخر 60 يوم بس
      const keys = Object.keys(st.visits).sort();
      while (keys.length > 60) delete st.visits[keys.shift()];
    });
  }
};
Z.streak = function () {
  const v = Z.store.get().visits; let n = 0; const d = new Date();
  while (v[Z.todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
};
Z.timeLabel = function (hhmm) {
  if (!hhmm) return "";
  let [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م"; h = h % 12 || 12;
  return h + ":" + Z.pad(m) + " " + suffix;
};

/* ---------- الأصوات (مقفولة افتراضياً عشان محدش يحس بيك) ---------- */
Z.sfx = (function () {
  let ctx = null;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const t = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sounds = {
    tap:  () => tone(660, 0, 0.06, "triangle", 0.06),
    good: () => { tone(740, 0, 0.08, "triangle"); tone(988, 0.07, 0.12, "triangle"); },
    bad:  () => { tone(180, 0, 0.18, "sawtooth", 0.08); },
    win:  () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.16, "triangle", 0.1)); },
    go:   () => tone(880, 0, 0.15, "square", 0.07)
  };
  return {
    play(name) { if (Z.store.get().sound && sounds[name]) sounds[name](); },
    enable() { ensure(); },
    silence() { if (ctx && ctx.state === "running") ctx.suspend(); }
  };
})();

/* ---------- رسايل سريعة ---------- */
Z.toast = function (msg, kind) {
  const host = Z.$("#toasts"); if (!host) return;
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " toast-" + kind : "");
  el.setAttribute("role", "status");
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.classList.add("out"), 2600);
  setTimeout(() => el.remove(), 3100);
};

/* ---------- نافذة منبثقة ---------- */
Z.modal = (function () {
  let onClose = null, lastFocus = null;
  function close() {
    const m = Z.$("#modal"); if (!m || m.hidden) return;
    m.hidden = true; Z.$("#modalBody").innerHTML = "";
    document.body.classList.remove("modal-open");
    const cb = onClose; onClose = null; if (cb) cb();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function open(title, html, opts) {
    opts = opts || {};
    lastFocus = document.activeElement;
    Z.$("#modalTitle").textContent = title || "";
    const body = Z.$("#modalBody");
    if (typeof html === "string") body.innerHTML = html; else { body.innerHTML = ""; body.appendChild(html); }
    onClose = opts.onClose || null;
    const m = Z.$("#modal"); m.hidden = false;
    document.body.classList.add("modal-open");
    const f = body.querySelector("input, button, a"); (f || Z.$("#modalClose")).focus();
    return body;
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("#modalClose") || e.target.id === "modal") close();
  });
  return { open, close, isOpen: () => !Z.$("#modal").hidden };
})();

/* ---------- زرار "المدير جاي!" ---------- */
Z.boss = (function () {
  let on = false, prevTitle = "";
  function show() {
    if (on) return; on = true;
    if (Z.current && Z.current.pause) Z.current.pause();
    Z.sfx.silence();
    prevTitle = document.title;
    document.title = "تقرير_المتابعة_الشهري.xlsx";
    const b = Z.$("#boss"); b.hidden = false;
    document.body.classList.add("boss-on");
    const st = Z.$("#bossStatus");
    if (!Z.store.get().bossHint) {
      st.textContent = "للرجوع: Esc أو اضغط مرتين على الشاشة";
      Z.store.set({ bossHint: true });
      setTimeout(() => { st.textContent = "جاهز"; }, 3500);
    } else st.textContent = "جاهز";
  }
  function hide() {
    if (!on) return; on = false;
    Z.$("#boss").hidden = true;
    document.body.classList.remove("boss-on");
    document.title = prevTitle || document.title;
    if (Z.current && Z.current.resume) Z.current.resume();
  }
  function build() {
    const grid = Z.$("#bossGrid"); if (!grid || grid.children.length) return;
    const rows = [["القاهرة", 4200, 3910, "تم الرفع"], ["الجيزة", 3800, 3420, ""], ["الإسكندرية", 3500, 3185, "في انتظار رد المديرية"], ["الدقهلية", 3100, 2790, ""],
      ["الشرقية", 3300, 2805, "مراجعة الأرقام"], ["المنيا", 2900, 2610, ""], ["أسيوط", 2600, 2340, "تم الرفع"], ["سوهاج", 2700, 2295, ""],
      ["قنا", 2200, 1980, ""], ["أسوان", 1800, 1710, "تم الرفع"], ["البحيرة", 3000, 2550, "متابعة أسبوعية"], ["الغربية", 2800, 2275, ""]];
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const cell = (v, cls) => "<td" + (cls ? ' class="' + cls + '"' : "") + ">" + (v === undefined ? "" : v) + "</td>";
    let html = "<thead><tr><th class='sh-corner'></th>" + cols.map((c) => "<th>" + c + "</th>").join("") + "</tr></thead><tbody>";
    const blank = () => cols.map(() => "<td></td>").join("");
    html += "<tr><th>1</th>" + cell("تقرير المتابعة الشهري - الربع التالت 2026", "sh-h1") + cols.slice(1).map(() => "<td></td>").join("") + "</tr>";
    html += "<tr><th>2</th>" + blank() + "</tr>";
    html += "<tr><th>3</th>" + ["المحافظة", "المستهدف", "المنفذ", "نسبة الإنجاز", "الفرق", "الحالة", "ملاحظات", "", ""].map((h) => cell(h, h ? "sh-hd" : "")).join("") + "</tr>";
    let tT = 0, tD = 0;
    rows.forEach((r, i) => {
      const p = r[2] / r[1]; tT += r[1]; tD += r[2];
      const st = p >= 0.9 ? "تم" : p >= 0.85 ? "متابعة" : "متأخر";
      html += "<tr><th>" + (i + 4) + "</th>" + cell(r[0]) + cell(Z.fmt(r[1]), "n") + cell(Z.fmt(r[2]), "n") + cell((p * 100).toFixed(1) + "%", "n" + (i === 1 ? " sh-sel-cell" : "")) +
        cell(Z.fmt(r[2] - r[1]), "n neg") + cell(st, "st-" + (p >= 0.9 ? "ok" : p >= 0.85 ? "mid" : "low")) + cell(r[3]) + "<td></td><td></td></tr>";
    });
    html += "<tr><th>16</th>" + cell("الإجمالي", "sh-tot") + cell(Z.fmt(tT), "n sh-tot") + cell(Z.fmt(tD), "n sh-tot") + cell(((tD / tT) * 100).toFixed(1) + "%", "n sh-tot") + cell(Z.fmt(tD - tT), "n neg sh-tot") + "<td></td><td></td><td></td><td></td></tr>";
    for (let r = 17; r <= 34; r++) html += "<tr><th>" + r + "</th>" + blank() + "</tr>";
    grid.innerHTML = html + "</tbody>";
    const stats = Z.$(".sh-stats");
    if (stats) stats.innerHTML = "المتوسط: " + ((tD / tT) * 100).toFixed(1) + "%&nbsp;&nbsp; العدد: " + rows.length + "&nbsp;&nbsp; المجموع: " + Z.fmt(tD);
  }
  function bind() {
    build();
    const b = Z.$("#boss");
    let lastTap = 0;
    b.addEventListener("pointerup", (e) => {
      if (e.target.closest("[data-boss-exit]")) { hide(); return; }
      const t = performance.now();
      if (t - lastTap < 350) hide();
      lastTap = t;
    });
    b.addEventListener("dblclick", hide);
  }
  return { show, hide, toggle: () => (on ? hide() : show()), isOn: () => on, bind };
})();

/* ---------- تطبيع النص العربي (للكتابة) ---------- */
Z.normAr = function (s) {
  return String(s || "")
    .replace(/[ً-ْـ]/g, "")   // تشكيل وتطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ");
};
