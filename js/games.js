/* =========================================================
   زهقت — الألعاب الخمسة
   كل لعبة: start(stage, hud, done) وبترجّع { pause, resume, destroy }
   hud.score(n) / hud.extra(html) / done(score, { line })
   ========================================================= */
window.Z = window.Z || {};

const ICON = (paths) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";

Z.GAMES = {};

/* ---------------------------------------------------------
   1) اصطاد الإيميلات
   --------------------------------------------------------- */
Z.GAMES.inbox = {
  id: "inbox", name: "اصطاد الإيميلات", unit: "نقطة", xpDiv: 8,
  desc: "اصطاد الإيميلات الحلوة قبل ما تقع، وسيب إيميلات المصايب.",
  how: [
    "دوس على الإيميلات <b class='t-good'>الخضرا</b>: مكافأة، إجازة، تورتة.",
    "سيب الإيميلات <b class='t-bad'>الحمرا</b> تقع: اجتماع طارئ، شغل يوم الجمعة.",
    "معاك 3 كوبايات شاي. بتخسر واحدة لو دوست على إيميل أحمر أو فاتك إيميل أخضر.",
    "كل 5 إيميلات صح ورا بعض النقط بتتضاعف."
  ],
  icon: ICON('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 9l9 6 9-6"/><path d="M12 1.5v4M10 3.8l2 1.9 2-1.9"/>'),
  start(stage, hud, done) {
    stage.innerHTML = '<div class="field inbox-field"><div class="field-floor">صندوق الوارد</div></div>';
    const field = stage.firstElementChild;
    let W = 0, H = 0, mails = [], score = 0, lives = 3, combo = 0, caught = 0, t = 0, spawnIn = 0.3;
    let raf = 0, last = 0, paused = false, over = false;
    const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; };
    measure();
    window.addEventListener("resize", measure);

    const livesHtml = () => '<span class="lives" aria-label="' + lives + ' كوبايات شاي">' + "☕".repeat(lives) + '<span class="lost">' + "☕".repeat(3 - lives) + "</span></span>" + (combo >= 5 ? ' <span class="combo">×' + Math.min(1 + Math.floor(combo / 5), 4) + "</span>" : "");
    const refresh = () => { hud.score(score); hud.extra(livesHtml()); };
    refresh();

    function float(x, y, text, cls) {
      const f = document.createElement("span");
      f.className = "float " + (cls || "");
      f.textContent = text;
      f.style.transform = "translate(" + x + "px," + y + "px)";
      field.appendChild(f);
      setTimeout(() => f.remove(), 800);
    }
    function remove(m) { m.dead = true; m.el.classList.add("gone"); setTimeout(() => m.el.remove(), 260); }

    function spawn() {
      const good = Math.random() < 0.56;
      const pool = good ? Z.EMAILS.good : Z.EMAILS.bad;
      const d = pool[Math.floor(Math.random() * pool.length)];
      const el = document.createElement("button");
      el.type = "button";
      el.className = "mail " + (good ? "mail-good" : "mail-bad");
      el.innerHTML = '<span class="mail-from">' + Z.esc(d.from) + '</span><span class="mail-subj">' + Z.esc(d.t) + "</span>";
      field.appendChild(el);
      const w = el.offsetWidth, h = el.offsetHeight;
      const m = { el, x: Math.random() * Math.max(0, W - w), y: -h, w, h, good, dead: false,
        v: Math.min(62 + t * 3.4, 240) * (0.85 + Math.random() * 0.3) * (H / 520) };
      el.style.transform = "translate(" + m.x + "px," + m.y + "px)";
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(m); });
      mails.push(m);
    }

    function hit(m) {
      if (m.dead || over || paused) return;
      if (m.good) {
        combo++; caught++;
        const mult = Math.min(1 + Math.floor(combo / 5), 4);
        score += 10 * mult;
        Z.sfx.play("good");
        float(m.x + m.w / 2, m.y, "+" + 10 * mult, "f-good");
        m.el.classList.add("caught");
      } else {
        combo = 0; lives--;
        Z.sfx.play("bad");
        float(m.x + m.w / 2, m.y, "لأ!", "f-bad");
        m.el.classList.add("wrong");
        field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake");
      }
      remove(m); refresh();
      if (lives <= 0) end();
    }

    function loop(ts) {
      if (paused || over) return;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts; t += dt;
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = Math.max(0.42, 1.15 - t * 0.012) * (0.8 + Math.random() * 0.4); }
      const floor = H - 34;
      for (const m of mails) {
        if (m.dead) continue;
        m.y += m.v * dt;
        m.el.style.transform = "translate(" + m.x + "px," + m.y + "px)";
        if (m.y + m.h > floor) {
          if (m.good) {
            lives--; combo = 0; Z.sfx.play("bad");
            float(m.x + m.w / 2, floor - 30, "فاتك إيميل مهم", "f-bad");
          } else { score += 2; }
          remove(m); refresh();
          if (lives <= 0) { end(); return; }
        }
      }
      mails = mails.filter((m) => !m.dead);
      raf = requestAnimationFrame(loop);
    }
    function end() {
      if (over) return; over = true; cancelAnimationFrame(raf);
      setTimeout(() => done(score, { line: caught ? "اصطدت " + Z.n(caught, "إيميل مهم واحد", "إيميلين مهمين", "إيميلات مهمة", "إيميل مهم") : "ماصطدتش ولا إيميل مهم" }), 650);
    }
    last = performance.now(); raf = requestAnimationFrame(loop);

    return {
      pause() { if (over) return; paused = true; cancelAnimationFrame(raf); },
      resume() { if (over || !paused) return; paused = false; last = performance.now(); raf = requestAnimationFrame(loop); },
      destroy() { over = true; cancelAnimationFrame(raf); window.removeEventListener("resize", measure); }
    };
  }
};

/* ---------------------------------------------------------
   2) اهرب من الاجتماع
   --------------------------------------------------------- */
Z.GAMES.meeting = {
  id: "meeting", name: "اهرب من الاجتماع", unit: "متر", xpDiv: 12,
  desc: "طرقة طويلة مليانة اجتماعات ومكالمات. غيّر الحارة واهرب.",
  how: [
    "على الموبايل: دوس على يمين الشاشة أو شمالها عشان تغيّر الحارة.",
    "على اللابتوب: الأسهم ← → أو حرفي A و D.",
    "خبطة واحدة في اجتماع أو مكالمة أو المدير وتتمسك.",
    "كوباية الشاي بـ 50 متر زيادة. والسرعة بتزيد مع الوقت."
  ],
  icon: ICON('<path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17"/><path d="M3 21h14"/><path d="M12 12h.01"/><path d="M18 8.5l3 3.5-3 3.5M21 12h-5"/>'),
  start(stage, hud, done) {
    stage.innerHTML = '<div class="field runner-field"><canvas aria-label="طرقة الشغل"></canvas><div class="runner-tap" aria-hidden="true"><span>يمين →</span><span>← شمال</span></div></div>';
    const field = stage.firstElementChild, cv = field.querySelector("canvas"), ctx = cv.getContext("2d");
    const KINDS = [{ e: "📅", t: "اجتماع" }, { e: "👔", t: "المدير" }, { e: "📞", t: "مكالمة" }, { e: "📋", t: "تقرير" }];
    let W = 0, H = 0, dpr = 1, lane = 1, px = 0, obs = [], meters = 0, bonus = 0, t = 0, nextRow = -1, scroll = 0, rows = 0;
    let raf = 0, last = 0, paused = false, over = false, colors = {};

    function readColors() {
      const cs = getComputedStyle(document.documentElement);
      const g = (n) => cs.getPropertyValue(n).trim();
      colors = { floor: g("--paper"), line: g("--line"), ink: g("--ink"), ink2: g("--ink-2"), pen: g("--pen"), stamp: g("--stamp"), stampSoft: g("--stamp-soft"), manila: g("--manila"), onPen: g("--on-pen") };
    }
    function size() {
      const r = field.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      px = laneX(lane); readColors();
    }
    const laneX = (i) => (W * (i + 0.5)) / 3;
    const boxW = () => Math.min((W / 3) * 0.78, 128);
    size();
    window.addEventListener("resize", size);

    function move(dir) {
      if (over || paused) return;
      const n = Z.clamp(lane + dir, 0, 2);
      if (n !== lane) { lane = n; Z.sfx.play("tap"); }
    }
    const onKey = (e) => {
      if (e.key === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); move(-1); }
      else if (e.key === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); move(1); }
    };
    const onTap = (e) => {
      e.preventDefault();
      const r = field.getBoundingClientRect();
      move(e.clientX - r.left < r.width / 2 ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    field.addEventListener("pointerdown", onTap);

    function spawnRow() {
      rows++;
      let lanes = Z.shuffle([0, 1, 2]);
      if (rows === 1) lanes = Z.shuffle([0, 2]).concat([1]); // أول صف مايبقاش في حارتك
      const count = t > 14 && Math.random() < 0.45 ? 2 : 1;
      const bw = boxW(), bh = bw * 0.78;
      for (let i = 0; i < count; i++) obs.push({ lane: lanes[i], y: -bh, kind: KINDS[Math.floor(Math.random() * KINDS.length)], tea: false });
      if (Math.random() < 0.22) obs.push({ lane: lanes[2], y: -bh * 2.2, kind: { e: "☕", t: "شاي" }, tea: true });
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function draw() {
      ctx.fillStyle = colors.floor; ctx.fillRect(0, 0, W, H);
      // بلاط الطرقة
      ctx.strokeStyle = colors.line; ctx.lineWidth = 2; ctx.setLineDash([18, 22]); ctx.lineDashOffset = -scroll;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo((W * i) / 3, 0); ctx.lineTo((W * i) / 3, H); ctx.stroke(); }
      ctx.setLineDash([]);
      const bw = boxW(), bh = bw * 0.78;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "rtl";
      for (const o of obs) {
        const x = laneX(o.lane) - bw / 2;
        roundRect(x, o.y, bw, bh, 10);
        ctx.fillStyle = o.tea ? colors.manila : colors.stampSoft; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = o.tea ? colors.ink2 : colors.stamp; ctx.stroke();
        ctx.font = Math.round(bh * 0.36) + "px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
        ctx.fillText(o.kind.e, laneX(o.lane), o.y + bh * 0.36);
        ctx.fillStyle = colors.ink; ctx.font = "600 " + Math.round(bh * 0.2) + "px 'IBM Plex Sans Arabic', Tahoma, sans-serif";
        ctx.fillText(o.kind.t, laneX(o.lane), o.y + bh * 0.76);
      }
      // انت
      const py = H * 0.84, pr = bw * 0.34;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = colors.pen; ctx.fill();
      ctx.fillStyle = colors.onPen; ctx.font = "700 " + Math.round(pr * 0.62) + "px 'IBM Plex Sans Arabic', Tahoma, sans-serif";
      ctx.fillText("انت", px, py + 1);
    }
    function loop(ts) {
      if (paused || over) return;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts; t += dt;
      const v = H * Math.min(0.5 + t * 0.024, 1.6);
      scroll += v * dt; meters += (v * dt / H) * 8;
      if (nextRow < 0) nextRow = H * 0.7; // ثانية سماح في الأول
      nextRow -= v * dt;
      if (nextRow <= 0) { spawnRow(); nextRow = H * Math.max(0.36, 0.62 - t * 0.006); }
      px += (laneX(lane) - px) * Math.min(1, dt * 16);
      const bw = boxW(), bh = bw * 0.78, py = H * 0.84, pr = bw * 0.34;
      for (const o of obs) {
        o.y += v * dt;
        const ox = laneX(o.lane);
        if (!o.hit && Math.abs(ox - px) < bw / 2 + pr * 0.55 && o.y + bh > py - pr * 0.75 && o.y < py + pr * 0.75) {
          if (o.tea) { o.hit = true; bonus += 50; Z.sfx.play("good"); }
          else { draw(); end(o.kind.t); return; }
        }
      }
      obs = obs.filter((o) => o.y < H + 40 && !(o.tea && o.hit));
      draw();
      hud.score(Math.floor(meters) + bonus);
      raf = requestAnimationFrame(loop);
    }
    function end(what) {
      over = true; cancelAnimationFrame(raf); Z.sfx.play("bad");
      field.classList.add("shake");
      const score = Math.floor(meters) + bonus;
      const lines = { "اجتماع": "اتمسكت في اجتماع", "المدير": "المدير شافك", "مكالمة": "رنّت عليك مكالمة", "تقرير": "اتدبست في تقرير" };
      setTimeout(() => done(score, { line: (lines[what] || "اتمسكت") + " بعد " + Z.n(Math.floor(meters), "متر واحد", "مترين", "أمتار", "متر") }), 700);
    }
    hud.score(0); hud.extra('<span class="hud-note">← → للتحرك</span>');
    draw();
    last = performance.now(); raf = requestAnimationFrame(loop);
    return {
      pause() { if (over) return; paused = true; cancelAnimationFrame(raf); },
      resume() { if (over || !paused) return; paused = false; readColors(); last = performance.now(); raf = requestAnimationFrame(loop); },
      destroy() { over = true; cancelAnimationFrame(raf); window.removeEventListener("resize", size); window.removeEventListener("keydown", onKey); }
    };
  }
};

/* ---------------------------------------------------------
   3) سرعة الكتابة
   --------------------------------------------------------- */
Z.GAMES.typing = {
  id: "typing", name: "سرعة الكتابة", unit: "حرف في الدقيقة", xpDiv: 4,
  desc: "جمل الشغل اللي بنقولها كل يوم. اكتبها أسرع ما تقدر في دقيقة.",
  how: [
    "هتظهرلك جملة، اكتبها زي ما هي في الخانة.",
    "الوقت دقيقة واحدة وبيبدأ مع أول حرف تكتبه.",
    "الهمزات والتاء المربوطة والياء مش هتفرق: «اجتماع» زي «إجتماع».",
    "السكور هو عدد الحروف الصح اللي كتبتها."
  ],
  icon: ICON('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 15h6"/>'),
  start(stage, hud, done) {
    stage.innerHTML =
      '<div class="typing">' +
        '<div class="typing-clock"><b id="tyTime">60</b><span>ثانية</span></div>' +
        '<p class="typing-target" id="tyTarget" aria-live="polite"></p>' +
        '<input id="tyInput" class="typing-input" type="text" dir="rtl" lang="ar" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="اكتب الجملة هنا" aria-label="اكتب الجملة">' +
        '<p class="typing-hint">محتاج كيبورد عربي. على اللابتوب: Alt + Shift عشان تغيّر اللغة.</p>' +
      "</div>";
    const target = Z.$("#tyTarget", stage), input = Z.$("#tyInput", stage), timeEl = Z.$("#tyTime", stage);
    const queue = Z.shuffle(Z.PHRASES);
    let qi = 0, phrase = queue[0], doneChars = 0, phrasesDone = 0, started = false, left = 60, timer = 0, over = false, lastTick = 0;
    const live = () => {
      const a = Z.normAr(input.value), b = Z.normAr(phrase);
      let ok = 0; while (ok < a.length && a[ok] === b[ok]) ok++;
      return ok;
    };
    function render() {
      const a = Z.normAr(input.value), b = Z.normAr(phrase);
      let html = "";
      for (let i = 0; i < phrase.length; i++) {
        let cls = "";
        if (i < a.length) cls = a[i] === b[i] ? "ok" : "err";
        else if (i === a.length) cls = "next";
        const ch = phrase[i] === " " ? "&nbsp;" : Z.esc(phrase[i]);
        html += '<span class="' + cls + '">' + ch + "</span>";
      }
      target.innerHTML = html;
      hud.score(doneChars + live());
    }
    function tick() {
      const now = performance.now();
      left -= (now - lastTick) / 1000; lastTick = now;
      timeEl.textContent = Math.max(0, Math.ceil(left));
      if (left <= 10) timeEl.parentElement.classList.add("urgent");
      if (left <= 0) finish();
    }
    function finish() {
      if (over) return; over = true; clearInterval(timer);
      input.disabled = true;
      const score = doneChars + live();
      setTimeout(() => done(score, { line: phrasesDone ? "كتبت " + Z.n(phrasesDone, "جملة واحدة كاملة", "جملتين كاملتين", "جمل كاملة", "جملة كاملة") : "ماكمّلتش ولا جملة" }), 400);
    }
    input.addEventListener("paste", (e) => e.preventDefault());
    input.addEventListener("input", () => {
      if (over) return;
      if (!started) { started = true; lastTick = performance.now(); timer = setInterval(tick, 100); }
      if (Z.normAr(input.value).trim() === Z.normAr(phrase).trim()) {
        doneChars += phrase.length; phrasesDone++;
        Z.sfx.play("good");
        target.classList.remove("flash"); void target.offsetWidth; target.classList.add("flash");
        qi = (qi + 1) % queue.length; phrase = queue[qi]; input.value = "";
      }
      render();
    });
    hud.extra('<span class="hud-note">الوقت بيبدأ مع أول حرف</span>');
    render();
    setTimeout(() => input.focus(), 50);
    return {
      pause() { if (over || !started) return; clearInterval(timer); timer = 0; },
      resume() { if (over || !started || timer) return; lastTick = performance.now(); timer = setInterval(tick, 100); input.focus(); },
      destroy() { over = true; clearInterval(timer); }
    };
  }
};

/* ---------------------------------------------------------
   4) ذاكرة المكتب
   --------------------------------------------------------- */
Z.GAMES.memory = {
  id: "memory", name: "ذاكرة المكتب", unit: "نقطة", xpDiv: 20,
  desc: "16 كارت على المكتب. افتكر مكان كل حاجة وطابق الأزواج.",
  how: [
    "اقلب كارتين. لو زي بعض هيفضلوا مفتوحين.",
    "السكور بيبدأ من 1500 وبيقل مع كل حركة ومع كل ثانية.",
    "يعني ركّز من الأول، وماتقلبش عشوائي."
  ],
  icon: ICON('<rect x="8" y="3" width="12" height="16" rx="2"/><rect x="4" y="6" width="12" height="16" rx="2" fill="var(--paper)"/><path d="M8 12h4M10 10v4"/>'),
  start(stage, hud, done) {
    const icons = ["📎", "🖨️", "☕", "📁", "✏️", "📅", "💻", "📌"];
    const deck = Z.shuffle(icons.concat(icons));
    stage.innerHTML = '<div class="mem-grid">' + deck.map((ic, i) =>
      '<button type="button" class="mem-card" data-i="' + i + '" aria-label="كارت مقفول"><span class="mem-inner"><span class="mem-face mem-back">ز</span><span class="mem-face mem-front">' + ic + "</span></span></button>").join("") + "</div>";
    const cards = Z.$$(".mem-card", stage);
    let open = [], matched = 0, moves = 0, lock = false, started = false, secs = 0, timer = 0, over = false;
    const calc = () => Math.max(50, Math.round(1500 - moves * 25 - secs * 6));
    const refresh = () => { hud.score(calc()); hud.extra('<span class="hud-note">' + moves + " حركة · " + secs + " ث</span>"); };
    const startTimer = () => { timer = setInterval(() => { secs++; refresh(); }, 1000); };
    refresh();
    stage.addEventListener("click", (e) => {
      const c = e.target.closest(".mem-card");
      if (!c || lock || over || c.classList.contains("open")) return;
      if (!started) { started = true; startTimer(); }
      c.classList.add("open"); c.setAttribute("aria-label", "كارت مفتوح: " + deck[c.dataset.i]);
      Z.sfx.play("tap");
      open.push(c);
      if (open.length === 2) {
        moves++;
        const [a, b] = open;
        if (deck[a.dataset.i] === deck[b.dataset.i]) {
          a.classList.add("matched"); b.classList.add("matched"); open = []; matched++;
          Z.sfx.play("good");
          if (matched === icons.length) {
            over = true; clearInterval(timer); refresh();
            setTimeout(() => done(calc(), { line: "خلّصتها في " + Z.n(moves, "حركة واحدة", "حركتين", "حركات", "حركة") + " و" + Z.secs(secs) }), 600);
          }
        } else {
          lock = true;
          setTimeout(() => {
            a.classList.remove("open"); b.classList.remove("open");
            a.setAttribute("aria-label", "كارت مقفول"); b.setAttribute("aria-label", "كارت مقفول");
            open = []; lock = false;
          }, 750);
        }
        refresh();
      }
    });
    return {
      pause() { clearInterval(timer); timer = 0; },
      resume() { if (!over && started && !timer) startTimer(); },
      destroy() { over = true; clearInterval(timer); }
    };
  }
};

/* ---------------------------------------------------------
   5) المدير بينادي (سرعة رد الفعل)
   --------------------------------------------------------- */
Z.GAMES.reaction = {
  id: "reaction", name: "المدير بينادي", unit: "نقطة", xpDiv: 10,
  desc: "اعمل نفسك مشغول، وأول ما المدير ينادي «يا أستاذ!» رد بسرعة.",
  how: [
    "5 جولات. في كل جولة استنى لحد ما الشاشة تحمر ويظهر «يا أستاذ!».",
    "ساعتها دوس بأسرع ما تقدر (أو زرار المسافة على اللابتوب).",
    "لو دوست قبل النداء الجولة بتتعاد.",
    "كل ما متوسط ردك يقل، السكور يعلى."
  ],
  icon: ICON('<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/><path d="M12 2v2"/>'),
  start(stage, hud, done) {
    stage.innerHTML =
      '<button type="button" class="react-pad" id="rPad"><span class="react-big" id="rBig">دوس هنا عشان تبدأ</span><span class="react-small" id="rSmall">5 جولات</span></button>' +
      '<ol class="react-rounds" id="rRounds">' + "<li></li>".repeat(5) + "</ol>";
    const pad = Z.$("#rPad", stage), big = Z.$("#rBig", stage), small = Z.$("#rSmall", stage), slots = Z.$$("#rRounds li", stage);
    let state = "ready", times = [], t0 = 0, wait = 0, over = false;
    const set = (cls, b, s) => { pad.className = "react-pad " + cls; big.textContent = b; small.textContent = s || ""; };
    function arm() {
      state = "wait";
      set("is-wait", "استنى...", "اعمل نفسك مشغول");
      wait = setTimeout(() => { state = "go"; t0 = performance.now(); set("is-go", "يا أستاااذ!", "دوس دلوقتي"); Z.sfx.play("go"); }, 1500 + Math.random() * 2600);
    }
    function press() {
      if (over) return;
      if (state === "ready" || state === "early") { arm(); return; }
      if (state === "wait") {
        clearTimeout(wait); state = "early"; Z.sfx.play("bad");
        set("is-early", "استعجلت!", "المدير لسه ماندهش. دوس تاني وابدأ الجولة من الأول");
        return;
      }
      if (state === "go") {
        const ms = Math.round(performance.now() - t0);
        times.push(ms); slots[times.length - 1].textContent = ms; slots[times.length - 1].classList.add("done");
        Z.sfx.play("good");
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        hud.score(Math.round(100000 / avg));
        if (times.length >= 5) {
          over = true; state = "done";
          set("is-done", avg + " ملّي ثانية", "متوسط ردك في 5 جولات");
          setTimeout(() => done(Math.round(100000 / avg), { line: "متوسط ردك " + avg + " ملّي ثانية" }), 900);
        } else {
          state = "between";
          set("is-between", ms + " ملّي ثانية", "الجولة " + (times.length + 1) + " جاية...");
          wait = setTimeout(arm, 1100);
        }
      }
    }
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });
    const onKey = (e) => { if ((e.code === "Space" || e.key === "Enter") && !e.repeat && !Z.modal.isOpen()) { e.preventDefault(); press(); } };
    window.addEventListener("keydown", onKey);
    hud.score(0); hud.extra('<span class="hud-note">مسافة = رد</span>');
    return {
      pause() { if (over) return; clearTimeout(wait); if (state === "wait" || state === "go" || state === "between") { state = "ready"; set("", "دوس عشان تكمّل", "الجولة " + (times.length + 1) + " من 5"); } },
      resume() {},
      destroy() { over = true; clearTimeout(wait); window.removeEventListener("keydown", onKey); }
    };
  }
};

Z.GAME_ORDER = ["inbox", "meeting", "typing", "memory", "reaction"];
