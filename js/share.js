/* =========================================================
   زهقت — الشير: كارت «مذكرة داخلية» بالسكور، لينكات التحدي، المشاركة
   ========================================================= */
window.Z = window.Z || {};

/* رابط الموقع المنشور على GitHub Pages */
Z.SITE = { name: "لو زهقت في الشغل ادخل هنا", url: "https://mahmoudallam100-rgb.github.io/zehe2t" };

Z.baseUrl = function () {
  const h = location.host;
  if (!/^https?:$/.test(location.protocol) || !h || /claude|localhost|127\.0\.0\.1/.test(h)) return Z.SITE.url + "/";
  return location.origin + location.pathname;
};
Z.siteHost = () => Z.SITE.url.replace(/^https?:\/\//, "");

Z.titleFor = function (id) {
  if (Z.GAMES[id]) return Z.GAMES[id].name;
  if (/^q-/.test(id)) { const c = Z.catById(id.slice(2)); return c ? "اختبار " + c.name : "اختبار"; }
  return "";
};
Z.routeFor = (id) => (Z.GAMES[id] ? "g-" + id : /^q-/.test(id) ? "quiz-" + id.slice(2) : "home");

Z.challengeUrl = function (id, score, name) {
  let u = Z.baseUrl() + "?vs=" + encodeURIComponent(id) + "&s=" + score;
  if (name) u += "&n=" + encodeURIComponent(name);
  return u + "#" + Z.routeFor(id);
};

/* قراءة التحدي من اللينك: ?vs=inbox&s=340&n=أحمد */
Z.parseChallenge = function () {
  try {
    const p = new URLSearchParams(location.search);
    const id = p.get("vs"), s = Number(p.get("s"));
    if (!id || !Z.titleFor(id) || !Number.isFinite(s) || s < 0 || s > 1e6) return null;
    const n = (p.get("n") || "").replace(/[<>]/g, "").trim().slice(0, 20) || "واحد صاحبك";
    return { id, s: Math.round(s), n };
  } catch (e) { return null; }
};

/* ---------- رسم الكارت ---------- */
Z.fontsReady = function () {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const wait = Promise.all([
    document.fonts.load("72px Lalezar", "مذكرة"),
    document.fonts.load("700 40px 'IBM Plex Sans Arabic'", "الموضوع"),
    document.fonts.load("700 90px 'Aref Ruqaa'", "يعتمد")
  ]).catch(() => {});
  return Promise.race([wait, new Promise((r) => setTimeout(r, 1500))]);
};

Z.drawCard = async function (canvas, d) {
  await Z.fontsReady();
  const S = 1080; canvas.width = S; canvas.height = S;
  const c = canvas.getContext("2d");
  const C = { wall: "#DCE7DE", wallLow: "#BFD3C4", paper: "#FBFCF8", ink: "#17201B", ink2: "#56645B", pen: "#1E3FA6", stamp: "#CF2F24", line: "#C9D6CC", hl: "#FFE74C" };
  const DISP = "Lalezar, 'IBM Plex Sans Arabic', Tahoma, sans-serif";
  const BODY = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
  const HAND = "'Aref Ruqaa', Lalezar, serif";
  c.direction = "rtl"; c.textBaseline = "alphabetic";

  // حيطة المصلحة: فاتحة فوق وزيت غامق تحت
  c.fillStyle = C.wall; c.fillRect(0, 0, S, S);
  c.fillStyle = C.wallLow; c.fillRect(0, S * 0.62, S, S * 0.38);
  c.fillStyle = "#9FBBA7"; c.fillRect(0, S * 0.62 - 6, S, 6);

  // الورقة
  c.save();
  c.translate(S / 2, S / 2); c.rotate(-0.02); c.translate(-S / 2, -S / 2);
  c.shadowColor = "rgba(23,32,27,.28)"; c.shadowBlur = 40; c.shadowOffsetY = 14;
  c.fillStyle = C.paper; c.fillRect(92, 96, S - 184, S - 176);
  c.shadowColor = "transparent";

  const R = S - 150, L = 150;
  c.fillStyle = C.ink; c.textAlign = "right"; c.font = "76px " + DISP;
  c.fillText("مذكرة داخلية", R, 205);
  c.fillStyle = C.ink2; c.textAlign = "left"; c.font = "500 30px " + BODY;
  c.fillText(d.date || "", L, 200);
  c.fillStyle = C.ink; c.fillRect(L, 236, R - L, 3);

  const rows = [["إلى:", "كل الزهقانين في الشغل"], ["من:", d.name || "زميل زهقان"], ["الموضوع:", d.title || ""]];
  rows.forEach((r, k) => {
    const y = 305 + k * 62;
    c.textAlign = "right"; c.fillStyle = C.ink2; c.font = "500 34px " + BODY; c.fillText(r[0], R, y);
    const lw = c.measureText(r[0]).width;
    c.fillStyle = C.ink; c.font = "700 36px " + BODY; c.fillText(r[1], R - lw - 18, y);
    c.strokeStyle = C.line; c.setLineDash([4, 8]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(L, y + 16); c.lineTo(R - lw - 10, y + 16); c.stroke(); c.setLineDash([]);
  });

  c.textAlign = "center";
  if (d.grid) {
    const n = d.grid.length, sz = 118, gap = 22, total = n * sz + (n - 1) * gap;
    let x = S / 2 + total / 2 - sz; // من اليمين للشمال
    d.grid.forEach((ok) => {
      c.fillStyle = ok ? "#2E8B57" : C.stamp;
      c.beginPath(); c.roundRect ? c.roundRect(x, 520, sz, sz, 18) : c.rect(x, 520, sz, sz); c.fill();
      x -= sz + gap;
    });
    c.fillStyle = C.pen; c.font = "84px " + DISP;
    c.fillText(d.big || "", S / 2, 760);
  } else {
    c.fillStyle = C.pen; c.font = "230px " + DISP;
    c.fillText(Z.fmt(d.score), S / 2, 676);
    c.fillStyle = C.ink2; c.font = "600 40px " + BODY;
    c.fillText(d.unit || "", S / 2, 736);
  }
  if (d.line) { c.fillStyle = C.ink; c.font = "500 32px " + BODY; c.fillText(d.line, S / 2 + 40, 796); }

  c.textAlign = "right";
  c.fillStyle = C.ink; c.font = "48px " + DISP; c.fillText("وريني هتجيب كام؟", R, 900);
  c.fillStyle = C.ink2; c.font = "500 28px " + BODY; c.fillText(Z.siteHost(), R, 940);
  c.restore();

  // الختم
  c.save();
  c.translate(236, 900); c.rotate(-0.24); c.globalAlpha = 0.9;
  c.strokeStyle = C.stamp; c.lineWidth = 7;
  c.beginPath(); c.roundRect ? c.roundRect(-132, -72, 264, 144, 20) : c.rect(-132, -72, 264, 144); c.stroke();
  c.lineWidth = 3;
  c.beginPath(); c.roundRect ? c.roundRect(-119, -59, 238, 118, 12) : c.rect(-119, -59, 238, 118); c.stroke();
  c.fillStyle = C.stamp; c.textAlign = "center"; c.direction = "rtl";
  c.font = "700 76px " + HAND; c.fillText("يُعتمد", 0, 14);
  c.font = "600 22px " + BODY; c.fillText(d.grade || "زهقت", 0, 48);
  c.restore();
};

/* ---------- نافذة الشير ---------- */
Z.share = {
  async open(d) {
    const s = Z.store.get();
    const wrap = document.createElement("div");
    wrap.className = "share";
    wrap.innerHTML =
      '<div class="share-name"><label for="shareName">اسمك اللي هيظهر لصحابك</label>' +
      '<div class="share-name-row"><input id="shareName" maxlength="20" autocomplete="nickname" placeholder="مثلاً: أستاذ محمود" value="' + Z.esc(s.name) + '"></div></div>' +
      '<figure class="share-preview"><canvas id="shareCanvas" aria-label="كارت النتيجة"></canvas></figure>' +
      '<div class="share-actions">' +
        '<button type="button" class="btn btn-pen" id="shNative" hidden>شارك الصورة</button>' +
        '<a class="btn btn-wa" id="shWa" target="_blank" rel="noopener">واتساب</a>' +
        '<a class="btn btn-ghost" id="shFb" target="_blank" rel="noopener">فيسبوك</a>' +
        '<a class="btn btn-ghost" id="shX" target="_blank" rel="noopener">إكس</a>' +
        '<button type="button" class="btn btn-ghost" id="shCopy">انسخ الرسالة</button>' +
        '<button type="button" class="btn btn-ghost" id="shSave">نزّل الصورة</button>' +
      "</div>" +
      '<p class="share-msg" id="shMsg"></p>';
    Z.modal.open(d.daily ? "شارك نتيجة تحدي النهارده" : "اتحدى صحابك", wrap);

    const canvas = Z.$("#shareCanvas", wrap), nameIn = Z.$("#shareName", wrap);
    let text = "", url = "";
    const build = async () => {
      const name = nameIn.value.trim();
      const lvl = Z.level(Z.store.get().xp);
      if (d.daily) {
        url = Z.baseUrl() + "#daily";
        text = "تحدي زهقت رقم " + d.number + " · " + d.dateLabel + "\n" + d.grid.map((g) => (g ? "🟩" : "🟥")).join("") + " " + d.correct + "/" + d.grid.length + " في " + Z.secs(d.time) + "\nجرّب تحدي النهارده: " + url;
      } else {
        url = Z.challengeUrl(d.id, d.score, name);
        text = "جبت " + Z.fmt(d.score) + " " + d.unit + " في «" + d.title + "» 😎\nوريني هتجيب كام:\n" + url;
      }
      Z.$("#shMsg", wrap).textContent = text;
      Z.$("#shWa", wrap).href = "https://wa.me/?text=" + encodeURIComponent(text);
      Z.$("#shFb", wrap).href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
      Z.$("#shX", wrap).href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
      await Z.drawCard(canvas, {
        date: d.dateLabel || Z.dateLabel(Z.todayKey()),
        name, title: d.daily ? "تحدي النهارده رقم " + d.number : d.title,
        score: d.score, unit: d.unit, line: d.line, grid: d.daily ? d.grid : null,
        big: d.daily ? d.correct + "/" + d.grid.length + " في " + Z.secs(d.time) : "",
        grade: "الدرجة " + lvl.grade + " · " + lvl.name
      });
    };
    let deb = 0;
    nameIn.addEventListener("input", () => {
      Z.store.set({ name: nameIn.value.trim().slice(0, 20) });
      clearTimeout(deb); deb = setTimeout(build, 250);
    });
    await build();

    const toBlob = () => new Promise((r) => canvas.toBlob(r, "image/png"));
    const btnNative = Z.$("#shNative", wrap);
    if (navigator.share) {
      btnNative.hidden = false;
      btnNative.addEventListener("click", async () => {
        try {
          const blob = await toBlob();
          const file = blob && new File([blob], "zehe2t.png", { type: "image/png" });
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, title: Z.SITE.name });
          else await navigator.share({ text, url, title: Z.SITE.name });
        } catch (e) { /* المستخدم قفل نافذة الشير */ }
      });
    }
    Z.$("#shCopy", wrap).addEventListener("click", () => {
      const fallback = () => {
        const m = Z.$("#shMsg", wrap); const r = document.createRange(); r.selectNodeContents(m);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        Z.toast("الرسالة متعلّمة، اعمل نسخ");
      };
      try { navigator.clipboard.writeText(text).then(() => Z.toast("اتنسخت. الصقها لصحابك"), fallback); } catch (e) { fallback(); }
    });
    Z.$("#shSave", wrap).addEventListener("click", async () => {
      const blob = await toBlob(); if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "zehe2t-" + (d.id || "daily") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  }
};
