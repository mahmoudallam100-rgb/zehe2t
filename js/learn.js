/* =========================================================
   زهقت — قسم المعلومات: الأسئلة، كروت المعلومات، تحدي النهارده
   ========================================================= */
window.Z = window.Z || {};

Z.catById = (id) => Z.CATEGORIES.find((c) => c.id === id);

/* سؤال باختيارات متلخبطة (عشان الإجابة الصح ماتبقاش في نفس المكان) */
Z.prepQ = function (q, cat, rand) {
  const idx = Z.shuffle([0, 1, 2, 3], rand);
  return { q: q.q, o: idx.map((i) => q.o[i]), a: idx.indexOf(q.a), f: q.f, ans: q.o[q.a], cat };
};

Z.quizSet = function (catId, n) {
  return Z.shuffle(Z.QUESTIONS[catId]).slice(0, n || 5).map((q) => Z.prepQ(q, catId));
};

/* تحدي النهارده: نفس الـ 5 أسئلة لكل الناس في نفس اليوم */
Z.dailyKey = () => Z.todayKey();
Z.dailySet = function (key) {
  const rand = Z.rng(Z.seedFrom("zehe2t-daily-" + key));
  const cats = Z.shuffle(Z.CATEGORIES.map((c) => c.id), rand).slice(0, 5);
  return cats.map((c) => {
    const pool = Z.QUESTIONS[c];
    return Z.prepQ(pool[Math.floor(rand() * pool.length)], c, rand);
  });
};
Z.dailyNumber = function (key) {
  const start = new Date(2026, 9, 20); // أول تحدي: 20 أكتوبر 2026
  const [y, m, d] = key.split("-").map(Number);
  return Math.max(1, Math.round((new Date(y, m - 1, d) - start) / 86400000) + 1);
};
Z.dateLabel = function (key) {
  const [y, m, d] = key.split("-").map(Number);
  return d + " " + Z.MONTHS[m - 1] + " " + y;
};

/* ---------- محرك الأسئلة ---------- */
Z.runQuiz = function (stage, hud, questions, opts) {
  opts = opts || {};
  const TIME = opts.timePer || 15;
  let i = 0, score = 0, left = TIME, raf = 0, last = 0, answered = false, over = false, paused = false;
  const results = [];
  stage.innerHTML =
    '<div class="quiz">' +
      '<div class="quiz-top"><ol class="quiz-dots">' + questions.map(() => "<li></li>").join("") + "</ol>" +
      '<div class="quiz-timer" aria-hidden="true"><span></span></div></div>' +
      '<p class="quiz-cat" id="qCat"></p>' +
      '<h3 class="quiz-q" id="qQ"></h3>' +
      '<div class="quiz-opts" id="qOpts"></div>' +
      '<div class="quiz-fact" id="qFact" hidden><p class="quiz-verdict" id="qVerdict"></p><p class="quiz-fact-text" id="qFactText"></p>' +
      '<button type="button" class="btn btn-pen" id="qNext">التالي</button></div>' +
    "</div>";
  const dots = Z.$$(".quiz-dots li", stage), bar = Z.$(".quiz-timer span", stage);
  const elCat = Z.$("#qCat", stage), elQ = Z.$("#qQ", stage), elOpts = Z.$("#qOpts", stage);
  const elFact = Z.$("#qFact", stage), elVerdict = Z.$("#qVerdict", stage), elFactText = Z.$("#qFactText", stage), btnNext = Z.$("#qNext", stage);

  function show() {
    const q = questions[i];
    answered = false; left = TIME;
    dots.forEach((d, k) => d.classList.toggle("now", k === i));
    elCat.textContent = (Z.catById(q.cat) || {}).name || "";
    elQ.textContent = q.q;
    elOpts.innerHTML = q.o.map((o, k) => '<button type="button" class="opt" data-k="' + k + '"><kbd>' + (k + 1) + "</kbd><span>" + Z.esc(o) + "</span></button>").join("");
    elFact.hidden = true;
    bar.style.transform = "scaleX(1)"; bar.parentElement.classList.remove("low");
    hud.extra('<span class="hud-note">سؤال ' + (i + 1) + " من " + questions.length + "</span>");
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function tick(ts) {
    if (answered || over || paused) return;
    left -= (ts - last) / 1000; last = ts;
    bar.style.transform = "scaleX(" + Z.clamp(left / TIME, 0, 1) + ")";
    if (left < 5) bar.parentElement.classList.add("low");
    if (left <= 0) { answer(-1); return; }
    raf = requestAnimationFrame(tick);
  }
  function answer(k) {
    if (answered || over) return;
    answered = true; cancelAnimationFrame(raf);
    const q = questions[i], ok = k === q.a;
    const gained = ok ? 100 + Math.round(Math.max(0, left) * 5) : 0;
    score += gained;
    results.push({ ok, time: Math.round((TIME - Math.max(0, left)) * 10) / 10 });
    dots[i].classList.add(ok ? "ok" : "bad");
    Z.$$(".opt", elOpts).forEach((b, n) => {
      b.disabled = true;
      if (n === q.a) b.classList.add("right");
      else if (n === k) b.classList.add("wrong");
    });
    Z.sfx.play(ok ? "good" : "bad");
    hud.score(score);
    elVerdict.innerHTML = ok ? '<b class="t-good">صح! +' + gained + "</b>" : (k === -1 ? '<b class="t-bad">الوقت خلص.</b> ' : '<b class="t-bad">لأ.</b> ') + (ok ? "" : "الإجابة: " + Z.esc(q.ans));
    elFactText.textContent = q.f;
    btnNext.textContent = i + 1 < questions.length ? "السؤال اللي بعده" : "شوف النتيجة";
    elFact.hidden = false;
    btnNext.focus({ preventScroll: true });
  }
  function next() {
    if (!answered || over) return;
    i++;
    if (i < questions.length) show();
    else { over = true; opts.onDone && opts.onDone(score, results); }
  }
  elOpts.addEventListener("click", (e) => { const b = e.target.closest(".opt"); if (b) answer(Number(b.dataset.k)); });
  btnNext.addEventListener("click", next);
  const onKey = (e) => {
    if (Z.modal.isOpen() || Z.boss.isOn()) return;
    if (!answered && /^[1-4]$/.test(e.key)) { e.preventDefault(); answer(Number(e.key) - 1); }
    else if (answered && e.key === "Enter" && document.activeElement !== btnNext) { e.preventDefault(); next(); }
  };
  window.addEventListener("keydown", onKey);
  hud.score(0);
  show();
  return {
    pause() { if (over) return; paused = true; cancelAnimationFrame(raf); },
    resume() { if (over || !paused) return; paused = false; if (!answered) { last = performance.now(); raf = requestAnimationFrame(tick); } },
    destroy() { over = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); }
  };
};
