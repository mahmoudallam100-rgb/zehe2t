/* =========================================================
   زهقت — الصفحات والتنقل
   الصفحات: #home #play #learn #daily #me
            #g-<لعبة>  #c-<قسم>  #cards-<قسم>  #quiz-<قسم>
   ========================================================= */
window.Z = window.Z || {};

(function () {
  const view = () => Z.$("#view");
  let ctrl = null;          // اللعبة الشغالة دلوقتي
  Z.current = null;         // واجهة الإيقاف اللي بيستخدمها زرار المدير
  Z.challenge = Z.parseChallenge();

  const NAV_ICONS = {
    home:  '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    play:  '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3"/><path d="M15.5 12h.01M18 13.5h.01"/>',
    learn: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 8h6M9 11h4"/>',
    daily: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M10 15l1.5 1.5L15 13"/>',
    me:    '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  const svg = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";

  /* ---------- أجزاء مشتركة ---------- */
  function gradeBlock() {
    const L = Z.level(Z.store.get().xp);
    return '<div class="grade">' +
      '<p class="grade-label">الدرجة الوظيفية</p>' +
      '<p class="grade-num">الدرجة ' + L.grade + "</p>" +
      '<p class="grade-name">' + L.name + "</p>" +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(L.pct * 100) + '"><span style="width:' + (L.pct * 100).toFixed(1) + '%"></span></div>' +
      '<p class="grade-next">' + (L.next ? "باقيلك <b>" + Z.fmt(L.need) + "</b> نقطة خبرة وتترقى «" + L.next.name + "»" : "وصلت لأعلى درجة. إنت كده الوزارة نفسها.") + "</p>" +
    "</div>";
  }

  function punchBlock() {
    const s = Z.store.get(), now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 1) % 7)); // السبت
    let days = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = Z.todayKey(d), on = !!s.visits[k], today = k === Z.todayKey(now);
      days += '<li class="' + (on ? "is-on " : "") + (today ? "is-today" : "") + '"><span class="pd-name">' + Z.DAYS[d.getDay()] + "</span>" +
        (on ? '<span class="pd-stamp">حاضر</span>' : '<span class="pd-empty" aria-label="غياب"></span>') + "</li>";
    }
    const st = Z.streak();
    return '<div class="punch">' +
      '<div class="punch-head"><h3>كارت الحضور</h3><span>ختمت النهارده الساعة ' + Z.timeLabel(s.visits[Z.todayKey()]) + "</span></div>" +
      '<ol class="punch-days">' + days + "</ol>" +
      '<p class="punch-foot">' + (st === 2 ? "حاضر <b>يومين</b> ورا بعض. ماتقطعش." : st > 2 ? "حاضر <b>" + st + "</b> " + (st <= 10 ? "أيام" : "يوم") + " ورا بعض. ماتقطعش." : "تعالى بكرة كمان عشان تبدأ سلسلة حضور.") + "</p>" +
    "</div>";
  }

  function gameCard(id) {
    const g = Z.GAMES[id], best = Z.store.get().best[id];
    return '<a class="game-card" href="#g-' + id + '">' +
      '<span class="gc-icon">' + g.icon + "</span>" +
      '<span class="gc-name">' + g.name + "</span>" +
      '<span class="gc-desc">' + g.desc + "</span>" +
      '<span class="gc-best">' + (best ? "أحسن سكور ليك: <b>" + Z.fmt(best) + "</b>" : "ماجربتهاش لسه") + "</span>" +
    "</a>";
  }

  function catTile(c) {
    const best = Z.store.get().best["q-" + c.id];
    return '<a class="cat cat-' + c.id + '" href="#c-' + c.id + '">' +
      '<span class="cat-name">' + c.name + "</span>" +
      '<span class="cat-blurb">' + c.blurb + "</span>" +
      '<span class="cat-meta">' + Z.QUESTIONS[c.id].length + " معلومات" + (best ? " · أحسن سكور " + Z.fmt(best) : "") + "</span>" +
    "</a>";
  }

  function challengeBanner(forId) {
    const ch = Z.challenge; if (!ch) return "";
    if (forId && ch.id !== forId) return "";
    const title = Z.titleFor(ch.id);
    return '<div class="vs-banner"><p><b>«' + Z.esc(ch.n) + "»</b> جاب <b>" + Z.fmt(ch.s) + "</b> في «" + title + "» وبيتحداك.</p>" +
      (forId ? "" : '<a class="btn btn-stamp" href="#' + Z.routeFor(ch.id) + '">ورّيه</a>') + "</div>";
  }

  function calendarBlock() {
    const key = Z.dailyKey(), d = new Date(), done = Z.store.get().daily[key];
    return '<a class="calendar" href="#daily" aria-label="تحدي النهارده">' +
      '<span class="cal-top"><span>' + Z.MONTHS[d.getMonth()] + " " + d.getFullYear() + "</span><span>تحدي رقم " + Z.dailyNumber(key) + "</span></span>" +
      '<span class="cal-day">' + d.getDate() + "</span>" +
      '<span class="cal-wday">' + Z.DAYS[d.getDay()] + "</span>" +
      '<span class="cal-note">' + (done ? "خلّصته: " + done.correct + "/5 · شوف نتيجتك" : "5 أسئلة · محاولة واحدة · ابدأ") + "</span>" +
      (done ? '<span class="cal-stamp">تم</span>' : "") +
    "</a>";
  }

  /* ---------- الصفحات ---------- */
  const pages = {
    home() {
      return '<section class="hero">' +
          '<div class="hero-copy">' +
            '<p class="window-sign">شباك 1 · ألعاب ومعلومات</p>' +
            '<h1 class="hero-title">لو زهقت وانت في الشغل..<br><mark>ادخل هنا</mark></h1>' +
            '<p class="hero-sub">ألعاب دقيقتين، معلومات تفتح المخ، وتحدي جديد كل يوم. ولو المدير جه، في زرار بيقلب الشاشة شغل جد.</p>' +
            '<div class="hero-cta"><a class="btn btn-pen btn-lg" href="#play">العب حاجة سريعة</a><a class="btn btn-ghost btn-lg" href="#daily">تحدي النهارده</a></div>' +
            '<p class="hero-meta">من غير تسجيل. نتايجك محفوظة على جهازك. <kbd>Esc</kbd> = المدير جاي.</p>' +
          "</div>" +
          calendarBlock() +
        "</section>" +
        challengeBanner() +
        '<section class="desk">' + punchBlock() + gradeBlock() + "</section>" +
        '<section class="block"><header class="sec-head"><h2>العب</h2><p>كل لعبة من دقيقة لدقيقتين. اكسر رقمك واتحدى صحابك.</p></header>' +
          '<div class="games-grid">' + Z.GAME_ORDER.map(gameCard).join("") + "</div></section>" +
        '<section class="block"><header class="sec-head"><h2>عاوز تعرف إيه؟</h2><p>اختار قسم: اقرا كروت المعلومات، وبعدين اختبر نفسك.</p></header>' +
          '<div class="cats-grid">' + Z.CATEGORIES.map(catTile).join("") + "</div></section>";
    },

    play() {
      return '<section class="block"><header class="sec-head page-head"><h1>العب</h1><p>5 ألعاب على مقاس الاستراحة. السكور بتاعك بيتحفظ، وتقدر تبعت لينك تحدي لأي حد.</p></header>' +
        challengeBanner() +
        '<div class="games-grid games-grid-full">' + Z.GAME_ORDER.map(gameCard).join("") + "</div></section>";
    },

    learn() {
      return '<section class="block"><header class="sec-head page-head"><h1>عاوز تعرف إيه؟</h1><p>6 أقسام. في كل قسم كروت معلومات تقراها في دقيقة، واختبار من 5 أسئلة بسكور تقدر تتحدى بيه.</p></header>' +
        '<div class="cats-grid">' + Z.CATEGORIES.map(catTile).join("") + "</div></section>";
    },

    cat(id) {
      const c = Z.catById(id); if (!c) return pages.learn();
      const s = Z.store.get(), best = s.best["q-" + id], read = s.learned[id] || 0, total = Z.QUESTIONS[id].length;
      return '<section class="block cat-page cat-' + id + '">' +
        '<a class="back" href="#learn">كل الأقسام</a>' +
        '<header class="sec-head page-head"><h1>' + c.name + "</h1><p>" + c.blurb + ".</p></header>" +
        challengeBanner("q-" + id) +
        '<div class="cat-actions">' +
          '<a class="choice" href="#cards-' + id + '"><b>كروت المعلومات</b><span>' + Z.n(total, "كارت واحد", "كارتين", "كروت", "كارت") + ". قريت منهم " + Math.min(read, total) + ".</span></a>" +
          '<a class="choice choice-stamp" href="#quiz-' + id + '"><b>اختبرني</b><span>5 أسئلة · 15 ثانية لكل سؤال' + (best ? " · أحسن سكور " + Z.fmt(best) : "") + "</span></a>" +
        "</div></section>";
    },

    me() {
      const s = Z.store.get();
      const rows = Z.GAME_ORDER.map((id) => "<tr><th>" + Z.GAMES[id].name + "</th><td>" + (s.best[id] ? Z.fmt(s.best[id]) + " <small>" + Z.GAMES[id].unit + "</small>" : "—") + "</td><td>" + (s.plays[id] || 0) + "</td></tr>").join("") +
        Z.CATEGORIES.map((c) => "<tr><th>اختبار " + c.name + "</th><td>" + (s.best["q-" + c.id] ? Z.fmt(s.best["q-" + c.id]) : "—") + "</td><td>" + (s.plays["q-" + c.id] || 0) + "</td></tr>").join("");
      const dailyDone = Object.keys(s.daily).length;
      return '<section class="block"><header class="sec-head page-head"><h1>ملفي</h1><p>كل حاجة هنا محفوظة على جهازك بس. مفيش حساب ولا تسجيل.</p></header>' +
        '<div class="me-grid">' +
          '<form class="sheet profile" id="profileForm">' +
            '<h2>البيانات</h2>' +
            '<label for="pName">اسمك المستعار</label><input id="pName" maxlength="20" autocomplete="nickname" placeholder="الاسم اللي هيظهر في التحديات" value="' + Z.esc(s.name) + '">' +
            '<label for="pGov">محافظتك</label><select id="pGov"><option value="">اختار</option>' + Z.GOVERNORATES.map((g) => '<option' + (g === s.gov ? " selected" : "") + ">" + g + "</option>").join("") + "</select>" +
            '<p class="field-note">المحافظة هتدخلك دوري المحافظات لما يشتغل.</p>' +
            '<button class="btn btn-pen" type="submit">احفظ</button>' +
          "</form>" +
          gradeBlock() +
        "</div>" +
        '<div class="me-grid">' + punchBlock() +
          '<div class="sheet settings"><h2>الإعدادات</h2>' +
            '<label class="switch"><input type="checkbox" id="pSound"' + (s.sound ? " checked" : "") + '><span>الأصوات</span></label>' +
            '<p class="field-note">مقفولة من الأول عشان محدش في المكتب يحس بيك.</p>' +
            '<p class="field-note">' + (dailyDone ? "خلّصت تحدي النهارده " + Z.n(dailyDone, "مرة واحدة", "مرتين", "مرات", "مرة") : "لسه ماجربتش تحدي النهارده") + " · لعبت " + Z.n(s.totalPlays || 0, "مرة واحدة", "مرتين", "مرات", "مرة") + ".</p>" +
            '<div class="danger"><button type="button" class="btn btn-ghost" id="pReset">امسح كل بياناتي</button><div id="pResetConfirm" hidden><p>متأكد؟ النقط والأرقام القياسية هتتمسح.</p><button type="button" class="btn btn-stamp" id="pResetYes">أيوه امسح</button> <button type="button" class="btn btn-ghost" id="pResetNo">لأ</button></div></div>' +
          "</div>" +
        "</div>" +
        '<div class="sheet records"><h2>أرقامك القياسية</h2><div class="table-wrap"><table><thead><tr><th>اللعبة</th><th>أحسن سكور</th><th>لعبت</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>" +
      "</section>";
    }
  };

  /* ---------- شاشة اللعبة (مشتركة للألعاب والاختبارات وتحدي النهارده) ---------- */
  function shell(opts) {
    view().innerHTML =
      '<section class="game">' +
        '<div class="game-bar">' +
          '<a class="back" href="' + opts.back + '">رجوع</a>' +
          '<h1 class="game-title">' + opts.title + "</h1>" +
          '<div class="hud"><span class="hud-extra" id="hudExtra"></span><span class="hud-score"><b id="hudScore">0</b><small>' + (opts.unit || "") + "</small></span></div>" +
        "</div>" +
        '<div class="stage-wrap"><div class="stage" id="stage"></div>' +
        '<div class="paused" id="paused" hidden><p>اللعبة واقفة</p><button type="button" class="btn btn-pen btn-lg" id="resumeBtn">كمّل</button></div></div>' +
      "</section>";
    const hudScore = Z.$("#hudScore"), hudExtra = Z.$("#hudExtra");
    return {
      stage: Z.$("#stage"),
      hud: { score: (n) => { hudScore.textContent = Z.fmt(n); }, extra: (h) => { hudExtra.innerHTML = h; } }
    };
  }

  function attach(c) {
    ctrl = c;
    const pausedEl = Z.$("#paused");
    Z.current = {
      pause() { if (!ctrl) return; ctrl.pause && ctrl.pause(); if (pausedEl) pausedEl.hidden = false; },
      resume() { /* بعد ما المدير يمشي: نسيب زرار «كمّل» للاعب */ }
    };
    const btn = Z.$("#resumeBtn");
    if (btn) btn.onclick = () => { pausedEl.hidden = true; ctrl && ctrl.resume && ctrl.resume(); };
  }
  function detach() {
    if (ctrl && ctrl.destroy) ctrl.destroy();
    ctrl = null; Z.current = null;
    document.body.classList.remove("in-game");
  }

  function intro(stage, o) {
    const best = Z.store.get().best[o.id];
    stage.innerHTML = '<div class="intro">' +
      (o.icon ? '<span class="intro-icon">' + o.icon + "</span>" : "") +
      "<h2>إزاي تلعب</h2>" +
      '<ul class="how">' + o.how.map((h) => "<li>" + h + "</li>").join("") + "</ul>" +
      challengeBanner(o.id) +
      '<p class="intro-best">' + (best ? "أحسن سكور ليك: <b>" + Z.fmt(best) + "</b>" : "دي أول مرة تلعبها") + "</p>" +
      '<button type="button" class="btn btn-pen btn-lg" id="goBtn">ابدأ</button>' +
    "</div>";
    const go = Z.$("#goBtn", stage);
    go.focus({ preventScroll: true });
    go.addEventListener("click", o.onStart);
  }

  function result(stage, o) {
    const ch = Z.challenge && Z.challenge.id === o.id ? Z.challenge : null;
    let vs = "";
    if (ch) {
      vs = o.score > ch.s
        ? '<p class="vs-result win">عدّيت «' + Z.esc(ch.n) + "» بـ " + Z.fmt(o.score - ch.s) + "! ابعتله النتيجة.</p>"
        : o.score === ch.s ? '<p class="vs-result">تعادل مع «' + Z.esc(ch.n) + "». محتاج نقطة واحدة.</p>"
        : '<p class="vs-result lose">لسه ورا «' + Z.esc(ch.n) + "» بـ " + Z.fmt(ch.s - o.score) + ". حاول تاني.</p>";
    }
    stage.innerHTML = '<div class="result">' +
      '<p class="result-kicker">' + o.title + "</p>" +
      '<div class="result-stamp' + (o.rec.isBest ? " is-best" : "") + '"><b>' + Z.fmt(o.score) + "</b><span>" + o.unit + "</span></div>" +
      (o.line ? '<p class="result-line">' + Z.esc(o.line) + "</p>" : "") +
      '<p class="result-best">' + (o.rec.isBest && o.rec.prev ? "رقم قياسي جديد! كان " + Z.fmt(o.rec.prev) : o.rec.isBest ? "أول رقم قياسي ليك فيها" : "أحسن سكور ليك: " + Z.fmt(o.rec.best)) + "</p>" +
      '<p class="result-xp">+' + o.rec.xp + " نقطة خبرة</p>" +
      vs +
      '<div class="result-actions">' +
        '<button type="button" class="btn btn-stamp btn-lg" id="shareBtn">اتحدى صحابك</button>' +
        '<button type="button" class="btn btn-pen btn-lg" id="againBtn">العب تاني</button>' +
        '<a class="btn btn-ghost btn-lg" href="' + o.more + '">' + o.moreLabel + "</a>" +
      "</div></div>";
    Z.$("#againBtn", stage).addEventListener("click", o.again);
    Z.$("#shareBtn", stage).addEventListener("click", () => Z.share.open({ id: o.id, title: o.title, score: o.score, unit: o.unit, line: o.line }));
    Z.$("#shareBtn", stage).focus({ preventScroll: true });
    if (o.rec.isBest || (ch && o.score > ch.s)) Z.sfx.play("win");
  }

  function openGame(id) {
    const g = Z.GAMES[id]; if (!g) return render("play");
    const sh = shell({ back: "#play", title: g.name, unit: g.unit });
    const begin = () => {
      detach(); document.body.classList.add("in-game");
      Z.sfx.enable();
      const c = g.start(sh.stage, sh.hud, (score, extra) => {
        detach();
        const rec = Z.recordScore(id, score, g.xpDiv);
        result(sh.stage, { id, title: g.name, unit: g.unit, score, line: extra && extra.line, rec, again: begin, more: "#play", moreLabel: "لعبة تانية" });
      });
      attach(c);
    };
    intro(sh.stage, { id, icon: g.icon, how: g.how, onStart: begin });
  }

  function openQuiz(catId) {
    const c = Z.catById(catId); if (!c) return render("learn");
    const id = "q-" + catId, title = "اختبار " + c.name;
    const sh = shell({ back: "#c-" + catId, title, unit: "نقطة" });
    const begin = () => {
      detach(); document.body.classList.add("in-game");
      const q = Z.runQuiz(sh.stage, sh.hud, Z.quizSet(catId, 5), {
        onDone(score, res) {
          detach();
          const right = res.filter((r) => r.ok).length;
          const rec = Z.recordScore(id, score, 10);
          result(sh.stage, { id, title, unit: "نقطة", score, line: "جاوبت " + right + " من 5 صح", rec, again: begin, more: "#cards-" + catId, moreLabel: "اقرا الكروت" });
        }
      });
      attach(q);
    };
    intro(sh.stage, { id, how: ["5 أسئلة من قسم «" + c.name + "»، و15 ثانية لكل سؤال.", "الإجابة الصح بـ 100 نقطة، وكل ثانية فاضلة بـ 5 نقط زيادة.", "بعد كل سؤال هتقرا المعلومة كاملة.", "على اللابتوب: الأرقام من 1 لـ 4 للإجابة، و Enter للي بعده."], onStart: begin });
  }

  function openCards(catId) {
    const c = Z.catById(catId); if (!c) return render("learn");
    const list = Z.QUESTIONS[catId];
    let i = 0;
    view().innerHTML = '<section class="game cards-view">' +
      '<div class="game-bar"><a class="back" href="#c-' + catId + '">رجوع</a><h1 class="game-title">كروت: ' + c.name + '</h1><div class="hud"><span class="hud-extra" id="fcCount"></span></div></div>' +
      '<article class="fact-card" id="fc" aria-live="polite"></article>' +
      '<div class="fc-nav"><button type="button" class="btn btn-ghost" id="fcPrev">اللي قبله</button><button type="button" class="btn btn-pen" id="fcNext">اللي بعده</button></div>' +
      '<p class="fc-quiz"><a class="btn btn-stamp" href="#quiz-' + catId + '">خلاص، اختبرني في القسم ده</a></p>' +
    "</section>";
    const show = () => {
      const q = list[i];
      Z.$("#fc").innerHTML = '<div class="fc-head"><p class="fc-q">' + Z.esc(q.q) + '</p><p class="fc-a">' + Z.esc(q.o[q.a]) + '</p></div><p class="fc-f">' + Z.esc(q.f) + "</p>";
      Z.$("#fcCount").innerHTML = '<span class="hud-note">' + (i + 1) + " من " + list.length + "</span>";
      Z.$("#fcPrev").disabled = i === 0;
      Z.$("#fcNext").textContent = i + 1 < list.length ? "اللي بعده" : "من الأول";
      const s = Z.store.get();
      if ((s.learned[catId] || 0) < i + 1) { Z.store.update((st) => { st.learned[catId] = i + 1; }); Z.addXP(3); }
    };
    Z.$("#fcPrev").addEventListener("click", () => { if (i > 0) { i--; show(); } });
    Z.$("#fcNext").addEventListener("click", () => { i = (i + 1) % list.length; show(); });
    const onKey = (e) => {
      if (Z.modal.isOpen() || Z.boss.isOn()) return;
      if (e.key === "ArrowLeft") { i = (i + 1) % list.length; show(); }
      else if (e.key === "ArrowRight" && i > 0) { i--; show(); }
    };
    window.addEventListener("keydown", onKey);
    ctrl = { destroy: () => window.removeEventListener("keydown", onKey) };
    show();
  }

  function dailyResultHtml(key, r, set) {
    const grid = r.grid.map((g) => '<span class="' + (g ? "ok" : "bad") + '"></span>').join("");
    const now = new Date(), tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mins = Math.max(1, Math.round((tomorrow - now) / 60000));
    const answers = set.map((q, k) => "<li><span class='" + (r.grid[k] ? "t-good" : "t-bad") + "'>" + (r.grid[k] ? "صح" : "غلط") + "</span> " + Z.esc(q.q) + " <b>" + Z.esc(q.ans) + "</b></li>").join("");
    return '<div class="result daily-done">' +
      '<p class="result-kicker">تحدي رقم ' + Z.dailyNumber(key) + " · " + Z.dateLabel(key) + "</p>" +
      '<div class="daily-grid" aria-label="' + r.correct + ' من 5 صح">' + grid + "</div>" +
      '<p class="daily-score"><b>' + r.correct + "/5</b> في " + Z.secs(r.time) + " · " + Z.fmt(r.score) + " نقطة</p>" +
      '<p class="result-best">التحدي الجاي بعد ' + (mins >= 60 ? Z.n(Math.floor(mins / 60), "ساعة", "ساعتين", "ساعات", "ساعة") + " و" : "") + Z.n(mins % 60 || 1, "دقيقة", "دقيقتين", "دقايق", "دقيقة") + "</p>" +
      '<div class="result-actions"><button type="button" class="btn btn-stamp btn-lg" id="dShare">شارك النتيجة</button><a class="btn btn-ghost btn-lg" href="#play">العب حاجة تانية</a></div>' +
      '<details class="daily-answers"><summary>شوف الإجابات (ماتقولهاش لحد)</summary><ol>' + answers + "</ol></details>" +
    "</div>";
  }

  function openDaily() {
    const key = Z.dailyKey(), set = Z.dailySet(key);
    const sh = shell({ back: "#home", title: "تحدي النهارده", unit: "نقطة" });
    const shareDaily = (r) => Z.share.open({ daily: true, number: Z.dailyNumber(key), dateLabel: Z.dateLabel(key), grid: r.grid, correct: r.correct, time: r.time, score: r.score });
    const showDone = () => {
      const r = Z.store.get().daily[key];
      sh.hud.score(r.score); sh.hud.extra('<span class="hud-note">' + r.correct + "/5</span>");
      sh.stage.innerHTML = dailyResultHtml(key, r, set);
      Z.$("#dShare", sh.stage).addEventListener("click", () => shareDaily(r));
    };
    if (Z.store.get().daily[key]) return showDone();
    const begin = () => {
      detach(); document.body.classList.add("in-game");
      Z.sfx.enable();
      const q = Z.runQuiz(sh.stage, sh.hud, set, {
        onDone(score, res) {
          detach();
          const r = { score, grid: res.map((x) => x.ok), correct: res.filter((x) => x.ok).length, time: Math.round(res.reduce((a, x) => a + x.time, 0)) };
          Z.store.update((st) => {
            st.daily[key] = r;
            const keys = Object.keys(st.daily).sort(); while (keys.length > 30) delete st.daily[keys.shift()];
          });
          Z.addXP(20 * r.correct + 10);
          Z.api.submitScore("daily-" + key, score);
          showDone();
          if (r.correct >= 4) Z.sfx.play("win");
        }
      });
      attach(q);
    };
    intro(sh.stage, { id: "daily", how: [
      "5 أسئلة من أقسام مختلفة، وكل الناس بتجاوب نفس الأسئلة النهارده.",
      "15 ثانية لكل سؤال. والإجابة الأسرع نقطها أكتر.",
      "<b>محاولة واحدة بس</b> في اليوم. التحدي بيتغير الساعة 12 بالليل.",
      "في الآخر هتطلعلك نتيجة بمربعات تشيرها من غير ما تحرق الإجابات."
    ], onStart: begin });
  }

  /* ---------- التنقل ---------- */
  function setNav(name) {
    Z.$$(".tabbar a").forEach((a) => a.classList.toggle("is-active", a.dataset.nav === name));
  }

  function render(route) {
    detach();
    Z.modal.close();
    route = route || "home";
    let nav = route;
    const m = route.match(/^(g|c|cards|quiz)-(.+)$/);
    if (m) {
      const [, kind, id] = m;
      if (kind === "g") { nav = "play"; openGame(id); }
      else if (kind === "c") { nav = "learn"; view().innerHTML = pages.cat(id); }
      else if (kind === "cards") { nav = "learn"; openCards(id); }
      else { nav = "learn"; openQuiz(id); }
    } else if (route === "daily") { openDaily(); }
    else if (pages[route]) { view().innerHTML = pages[route](); }
    else { nav = "home"; view().innerHTML = pages.home(); }
    setNav(nav);
    bindPage();
    window.scrollTo(0, 0);
    const h = view().querySelector("h1");
    if (h && document.activeElement === document.body) { h.setAttribute("tabindex", "-1"); }
  }

  function bindPage() {
    const f = Z.$("#profileForm");
    if (f) {
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        Z.store.set({ name: Z.$("#pName").value.trim().slice(0, 20), gov: Z.$("#pGov").value });
        Z.toast("اتحفظ");
      });
      Z.$("#pSound").addEventListener("change", (e) => { Z.store.set({ sound: e.target.checked }); if (e.target.checked) { Z.sfx.enable(); Z.sfx.play("good"); } });
      Z.$("#pReset").addEventListener("click", () => { Z.$("#pResetConfirm").hidden = false; });
      Z.$("#pResetNo").addEventListener("click", () => { Z.$("#pResetConfirm").hidden = true; });
      Z.$("#pResetYes").addEventListener("click", () => { Z.store.reset(); Z.punchIn(); updateChip(); Z.toast("اتمسح كل حاجة"); render("me"); });
    }
  }

  function updateChip() {
    const L = Z.level(Z.store.get().xp);
    Z.$("#lvlNum").textContent = L.grade;
    Z.$("#lvlName").textContent = L.name;
    Z.$("#lvlChip").setAttribute("aria-label", "الدرجة " + L.grade + ": " + L.name + ". افتح ملفي");
  }

  /* ---------- البداية ---------- */
  function boot() {
    document.documentElement.setAttribute("lang", "ar");
    document.documentElement.setAttribute("dir", "rtl");
    Z.punchIn();

    // أيقونات شريط التنقل
    Z.$$(".tabbar a").forEach((a) => { const ic = a.querySelector(".nav-ic"); if (ic) ic.innerHTML = svg(NAV_ICONS[a.dataset.nav]); });

    Z.boss.bind();
    Z.$("#bossBtn").addEventListener("click", () => Z.boss.show());
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (Z.modal.isOpen()) { Z.modal.close(); return; }
      e.preventDefault(); Z.boss.toggle();
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && Z.current) Z.current.pause(); });
    document.addEventListener("z:xp", updateChip);
    window.addEventListener("hashchange", () => render(location.hash.slice(1)));
    updateChip();

    // عدّاد الزوار يشتغل لما السيرفر يتوصل (المرحلة 2)
    Z.api.hit().then((r) => {
      if (!r) return;
      const el = Z.$("#liveCounter");
      el.innerHTML = "النهارده <b>" + Z.fmt(r.today) + "</b> زهقان دخلوا";
      el.hidden = false;
    });

    // لينك تحدي من غير صفحة محددة: نوديه للعبة على طول
    let route = location.hash.slice(1);
    if (!route && Z.challenge) route = Z.routeFor(Z.challenge.id);
    render(route);

    // ننضّف اللينك من بيانات التحدي بعد ما قريناها
    if (Z.challenge && history.replaceState) {
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
