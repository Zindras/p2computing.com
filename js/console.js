/* P2 Computing — flight deck.
   All motion is slow and smooth; nothing strobes. */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = "0" + n; return n; }

  /* ── audio: soft key blips, gated by the AUDIO switch ─────── */

  var audioOn = true, actx = null;
  function blip(freq, dur, gain) {
    if (!audioOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime;
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = "square";
      o.frequency.value = freq || 660;
      g.gain.setValueAtTime(gain || 0.015, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.05));
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + (dur || 0.05) + 0.02);
    } catch (e) { /* no audio is fine */ }
  }

  /* ── clocks ───────────────────────────────────────────────── */

  var bootAt = Date.now();
  function tickClock() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var day = Math.floor((now - start) / 864e5);
    $("stardate").textContent = "SD " + (now.getFullYear() - 1700) + "." + pad(day, 3);
    var s = Math.floor((Date.now() - bootAt) / 1000);
    $("met").textContent = "MET " + pad(Math.floor(s / 3600), 3) + ":" +
      pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ── terminal ─────────────────────────────────────────────── */

  var bootEl = $("bootlog");

  function appendLine(cls, text) {
    var span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text + "\n";
    bootEl.appendChild(span);
    while (bootEl.children.length > 60) bootEl.removeChild(bootEl.firstChild);
    bootEl.scrollTop = bootEl.scrollHeight;
    return span;
  }

  var BOOT = [
    ["sys",  "MU/9000 SELF TEST ........ PASS"],
    ["sys",  "REACTOR HANDSHAKE ........ OK"],
    ["sys",  "ORBITAL INSERTION ........ COMPLETE"],
    ["",     ""],
    ["",     "P2 COMPUTING FLIGHT DECK"],
    ["",     "INTERFACE 3.0 // CREW ACCESS GRANTED"],
    ["",     ""],
    ["warn", "NO STANDING DIRECTIVE ON FILE."],
    ["",     "HOLDING ORBIT UNTIL ONE ARRIVES."],
    ["sys",  "TYPE HELP FOR COMMANDS."]
  ];

  function typeLines(lines, i, done) {
    if (i >= lines.length) { if (done) done(); return; }
    var cls = lines[i][0], text = lines[i][1];
    if (RM || !text) { appendLine(cls, text); typeLines(lines, i + 1, done); return; }
    var span = appendLine(cls, "");
    var j = 0;
    var t = setInterval(function () {
      j += 2;
      span.textContent = text.slice(0, j) + (j < text.length ? "█" : "") + "\n";
      bootEl.scrollTop = bootEl.scrollHeight;
      if (j >= text.length) {
        clearInterval(t);
        span.textContent = text + "\n";
        setTimeout(function () { typeLines(lines, i + 1, done); }, 55);
      }
    }, 16);
  }

  typeLines(BOOT, 0, function () {
    if (window.matchMedia("(hover: hover)").matches) $("cmd").focus();
  });

  /* ── HUD state + targets ──────────────────────────────────── */

  var hudOn = true, gridOn = false;
  var vp = $("viewport"), hud = $("hud");
  var crosshair = $("crosshair");

  var TARGETS = {
    1: { el: $("ret1"), name: "TGT-01", cls: "RELAY SAT",  base: 412, ph: 0 },
    2: { el: $("ret2"), name: "TGT-02", cls: "CARGO POD",  base: 640, ph: 2.1 }
  };
  var cardFor = 0;

  function openCard(n) {
    var t = TARGETS[n];
    cardFor = n;
    $("tc-name").textContent = t.name + " · " + t.cls;
    $("tcard").hidden = false;
    placeCard();
    updateCard();
    blip(880, 0.06);
  }
  function updateCard() {
    if (!cardFor) return;
    var t = TARGETS[cardFor];
    var rng = (t.base + Math.sin(Date.now() / 4000 + t.ph) * 6).toFixed(1);
    $("tc-body").textContent =
      "RANGE  " + rng + " KM\n" +
      "REL VEL 0.0" + (cardFor === 1 ? 4 : 7) + " KM/S\n" +
      "ORBIT  STABLE\n" +
      "THREAT NONE";
  }
  setInterval(updateCard, 1500);
  $("tcard-x").addEventListener("click", function () { $("tcard").hidden = true; cardFor = 0; blip(440, 0.05); });
  TARGETS[1].el.addEventListener("click", function () { openCard(1); });
  TARGETS[2].el.addEventListener("click", function () { openCard(2); });

  function placeCard() {
    if (!cardFor) return;
    var t = TARGETS[cardFor];
    var card = $("tcard");
    var x = parseFloat(t.el.style.left) || 50, y = parseFloat(t.el.style.top) || 50;
    card.style.left = Math.min(Math.max(x + 9, 18), 70) + "%";
    card.style.top  = Math.min(Math.max(y - 18, 8), 55) + "%";
  }

  /* reticles drift slowly over the planet; crosshair follows the stick */
  var t0 = Date.now();
  function driftHUD() {
    var t = (Date.now() - t0) / 1000;
    if (!RM) {
      TARGETS[1].el.style.left = (56 + 16 * Math.sin(t / 19)) + "%";
      TARGETS[1].el.style.top  = (62 + 9  * Math.sin(t / 13 + 1.2)) + "%";
      TARGETS[2].el.style.left = (30 + 12 * Math.sin(t / 23 + 3)) + "%";
      TARGETS[2].el.style.top  = (72 + 7  * Math.sin(t / 17 + 4)) + "%";
      placeCard();
    }
    requestAnimationFrame(driftHUD);
  }
  TARGETS[1].el.style.left = "56%"; TARGETS[1].el.style.top = "62%";
  TARGETS[2].el.style.left = "30%"; TARGETS[2].el.style.top = "72%";
  driftHUD();

  /* glass readouts wander gently */
  setInterval(function () {
    $("h-alt").textContent = (412 + Math.sin(Date.now() / 9000) * 0.8).toFixed(1);
    $("h-vel").textContent = (7.66 + Math.sin(Date.now() / 7000) * 0.01).toFixed(2);
    $("h-lat").textContent = (33.71 + Math.sin(Date.now() / 20000) * 2).toFixed(2).replace(/^(?=\d)/, "+");
    $("h-lon").textContent = (-112.08 + (Date.now() / 60000) % 40).toFixed(2);
    $("h-sig").textContent = "-" + Math.round(41 + Math.sin(Date.now() / 5000) * 3);
  }, 1000);

  /* ── starfield: speed rides the throttle ──────────────────── */

  var thr = 18, sfY = 0, lastT = Date.now();
  var sf1 = $("sf1"), sf2 = $("sf2");
  function driftStars() {
    var now = Date.now(), dt = (now - lastT) / 1000; lastT = now;
    if (!RM) {
      sfY += dt * (2 + thr * 0.32);
      sf1.style.transform = "translateY(" + (-(sfY % 260)) + "px)";
      sf2.style.transform = "translateY(" + (-((sfY * 1.6) % 260)) + "px)";
    }
    requestAnimationFrame(driftStars);
  }
  driftStars();

  /* ── throttle ─────────────────────────────────────────────── */

  var thrEl = $("thr");
  function setThrottle(v, fromInput) {
    thr = Math.max(0, Math.min(100, Math.round(v)));
    if (!fromInput) thrEl.value = thr;
    $("thrval").textContent = thr + "%";
    $("engfill").style.height = thr + "%";
  }
  thrEl.addEventListener("input", function () {
    setThrottle(+this.value, true);
    blip(180 + thr * 3, 0.04, 0.01);
  });
  setThrottle(18);

  /* ── joysticks: drag to tilt; left one steers the crosshair ─ */

  function wireStick(joyId, stickId, onMove) {
    var joy = $(joyId), stick = $(stickId), pid = null;
    joy.addEventListener("pointerdown", function (e) {
      pid = e.pointerId; joy.setPointerCapture(pid);
      stick.style.transition = "none";
      blip(300, 0.05);
    });
    joy.addEventListener("pointermove", function (e) {
      if (pid === null) return;
      var r = joy.getBoundingClientRect();
      var dx = Math.max(-26, Math.min(26, e.clientX - (r.left + r.width / 2)));
      var dy = Math.max(-26, Math.min(26, e.clientY - (r.top + r.height * 0.4)));
      stick.style.transform = "rotateY(" + (dx * 0.7) + "deg) rotateX(" + (-dy * 0.7) + "deg)";
      if (onMove) onMove(dx, dy);
    });
    function release() {
      if (pid === null) return;
      pid = null;
      stick.style.transition = "";
      stick.style.transform = "";
      if (onMove) onMove(0, 0);
    }
    joy.addEventListener("pointerup", release);
    joy.addEventListener("pointercancel", release);
  }
  wireStick("joy-l", "stick-l", function (dx, dy) {
    crosshair.style.transform = "translate(" + dx * 1.6 + "px," + dy * 1.6 + "px)";
  });
  wireStick("joy-r", "stick-r", function (dx, dy) {
    vp.style.setProperty("--pan", dx);
    var planet = document.querySelector(".planet"), atmo = document.querySelector(".atmo");
    planet.style.marginLeft = (-dx * 1.4) + "px";
    atmo.style.marginLeft = (-dx * 1.4) + "px";
    planet.style.marginTop = (-dy * 0.5) + "px";
    atmo.style.marginTop = (-dy * 0.5) + "px";
  });

  /* ── dials: click to cycle what they show ─────────────────── */

  var DIALSTATS = [
    { k: "FUEL", get: function () { return 72 + Math.sin(Date.now() / 30000) * 2; } },
    { k: "O2",   get: function () { return 88 + Math.sin(Date.now() / 22000) * 1.5; } },
    { k: "PWR",  get: function () { return 40 + thr * 0.55; } },
    { k: "TEMP", get: function () { return 55 + Math.sin(Date.now() / 12000) * 6; } }
  ];
  function wireDial(dialId, needleId, lblId, valId, startIx) {
    var ix = startIx;
    function render() {
      var v = Math.max(0, Math.min(100, DIALSTATS[ix].get()));
      $(needleId).style.transform = "rotate(" + (-80 + v * 1.6) + "deg)";
      $(lblId).textContent = DIALSTATS[ix].k;
      $(valId).textContent = Math.round(v);
    }
    $(dialId).addEventListener("click", function () {
      ix = (ix + 1) % DIALSTATS.length;
      render(); blip(520, 0.05);
    });
    render();
    setInterval(render, 2500);
  }
  wireDial("dial-l", "needle-l", "dlbl-l", "dval-l", 0);
  wireDial("dial-r", "needle-r", "dlbl-r", "dval-r", 1);

  /* ── systems screen: reroute power with − / + ─────────────── */

  var SYSTEMS = [
    { k: "POWER",  v: 92,  c: "f-teal" },
    { k: "LIFE",   v: 100, c: "f-steel" },
    { k: "COMMS",  v: 78,  c: "f-pink" },
    { k: "GRAV",   v: 66,  c: "f-salmon" },
    { k: "SHIELD", v: 84,  c: "f-amber" }
  ];
  var sysUl = $("sysbars");
  SYSTEMS.forEach(function (s, i) {
    var li = document.createElement("li");
    li.innerHTML =
      '<span class="sys-lbl">' + s.k + '</span>' +
      '<span class="sys-track"><span class="sys-fill ' + s.c + '" style="width:' + s.v + '%"></span></span>' +
      '<span class="sys-val">' + s.v + '%</span>' +
      '<span class="sys-btns">' +
        '<button type="button" aria-label="Reduce ' + s.k + '">&minus;</button>' +
        '<button type="button" aria-label="Boost ' + s.k + '">+</button>' +
      '</span>';
    var btns = li.querySelectorAll("button");
    function nudge(d) {
      s.v = Math.max(10, Math.min(100, s.v + d));
      li.querySelector(".sys-fill").style.width = s.v + "%";
      li.querySelector(".sys-val").textContent = s.v + "%";
      sysFoot();
      appendLine("sys", s.k + " BUS " + (d > 0 ? "BOOSTED" : "SHED") + " TO " + s.v + "%");
      blip(d > 0 ? 700 : 380, 0.05);
    }
    btns[0].addEventListener("click", function () { nudge(-5); });
    btns[1].addEventListener("click", function () { nudge(5); });
    sysUl.appendChild(li);
  });
  function sysFoot() {
    var avg = Math.round(SYSTEMS.reduce(function (a, s) { return a + s.v; }, 0) / SYSTEMS.length);
    $("sysfoot").textContent = "BUS LOAD " + avg + "% · " + (avg > 90 ? "HEAVY" : "NOMINAL");
  }
  sysFoot();

  /* ── button matrices ──────────────────────────────────────── */

  var MCOLORS = ["#FFB03A", "#30C0B7", "#EE227D", "#498099", "#FD8083", "#852467"];
  function lit(seed, i) { return (((i + seed) * 2654435761) >>> 16) % 5 < 2; }

  var SPECIAL = {
    ARM: function (on) { appendLine(on ? "warn" : "sys", on ? "PYRO BUS ARMED. BE SURE." : "PYRO BUS SAFED."); },
    SEP: function ()   { appendLine("err", "SEPARATION REFUSED: NOTHING IS DOCKED."); return false; },
    SOS: function (on) { appendLine(on ? "warn" : "sys", on ? "DISTRESS BEACON WOULD BE DRAMATIC. NOT SENT." : "BEACON PANEL CLOSED."); }
  };

  function buildMatrix(elId, labels, seed) {
    var host = $(elId);
    labels.forEach(function (lbl, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mkey mono" + (lit(seed, i) ? " on" : "");
      b.textContent = lbl;
      b.style.setProperty("--mc", MCOLORS[(i + seed) % MCOLORS.length]);
      b.setAttribute("aria-pressed", lit(seed, i) ? "true" : "false");
      b.addEventListener("click", function () {
        var want = !this.classList.contains("on");
        if (SPECIAL[lbl] && SPECIAL[lbl](want) === false) { blip(240, 0.07); return; }
        this.classList.toggle("on", want);
        this.setAttribute("aria-pressed", want ? "true" : "false");
        blip(want ? 760 : 420, 0.045);
      });
      host.appendChild(b);
    });
  }
  buildMatrix("matrix-l",
    ["O2","H2","APU","BAT","BUS","AUX","FWD","AFT","PMP","FAN","HTR","RAD","IMU","GYR","RCS","OMS","SEP","ARM"], 3);
  buildMatrix("matrix-r",
    ["TXA","TXB","RXA","RXB","ANT","SQL","NAV","ILS","VOR","ADF","XPD","SOS","LT1","LT2","LT3","CAM","REC","LNK"], 11);

  /* ── toggle switches ──────────────────────────────────────── */

  function buildSwitch(host, id, label, color, on, onChange) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "switch";
    b.id = "sw-" + id;
    b.setAttribute("role", "switch");
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.style.setProperty("--swc", color);
    b.innerHTML = '<span class="sw-slot"><span class="sw-knob"></span></span><span class="sw-lbl mono">' + label + '</span>';
    b.addEventListener("click", function () {
      var now = this.getAttribute("aria-checked") !== "true";
      this.setAttribute("aria-checked", now ? "true" : "false");
      blip(now ? 900 : 500, 0.05);
      onChange(now);
    });
    $(host).appendChild(b);
    return b;
  }

  buildSwitch("switch-l", "hud",   "HUD",   "#30C0B7", true,  function (on) {
    hudOn = on; hud.style.visibility = on ? "" : "hidden";
    appendLine("sys", "HUD " + (on ? "ON" : "OFF"));
  });
  buildSwitch("switch-l", "grid",  "GRID",  "#30C0B7", false, function (on) {
    gridOn = on; $("pgrid").hidden = !on;
    appendLine("sys", "NAV GRID " + (on ? "PROJECTED" : "CLEARED"));
  });
  buildSwitch("switch-l", "audio", "SND",   "#FFB03A", true,  function (on) {
    audioOn = on; if (on) blip(900, 0.05);
    appendLine("sys", "PANEL AUDIO " + (on ? "ON" : "MUTED"));
  });
  buildSwitch("switch-r", "cabin", "CABIN", "#FFB03A", true,  function (on) {
    document.body.classList.toggle("dim", !on);
    appendLine("sys", "CABIN LIGHTS " + (on ? "ON" : "LOW"));
  });
  buildSwitch("switch-r", "beacon","BCN",   "#EE227D", false, function (on) {
    document.querySelectorAll(".strut").forEach(function (s) { s.classList.toggle("beacon", on); });
    appendLine("sys", "HULL BEACONS " + (on ? "BREATHING" : "STEADY"));
  });
  var lockSw = buildSwitch("switch-r", "lock", "LOCK", "#EE227D", true, function (on) {
    appendLine(on ? "sys" : "warn", on ? "SAFETY LOCK ENGAGED." : "SAFETY LOCK RELEASED. CAREFUL.");
  });

  /* ── keypad ───────────────────────────────────────────────── */

  var padBuf = "";
  function padRender() {
    var s = (padBuf + "----").slice(0, 4).replace(/-/g, "–");
    $("padout").textContent = s;
  }
  ["1","2","3","4","5","6","7","8","9","CLR","0","ENT"].forEach(function (k) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = k;
    b.addEventListener("click", function () {
      if (k === "CLR") { padBuf = ""; blip(360, 0.05); }
      else if (k === "ENT") {
        if (padBuf === "2600") { appendLine("amb", "KEYPAD: ACCESS LEVEL RAISED TO OPERATOR."); blip(1100, 0.09); }
        else if (padBuf === "0451") { appendLine("amb", "KEYPAD: A DOOR SOMEWHERE UNLOCKS."); blip(1100, 0.09); }
        else { appendLine("err", "KEYPAD: CODE " + (padBuf || "----") + " REJECTED."); blip(220, 0.09); }
        padBuf = "";
      } else {
        if (padBuf.length < 4) padBuf += k;
        blip(600 + +k * 40, 0.04);
      }
      padRender();
    });
    $("padkeys").appendChild(b);
  });
  padRender();

  /* ── struts: indicator lamps; CAUT trips master caution ───── */

  function setCaution(on) {
    document.body.classList.toggle("caution-on", on);
    $("caution").hidden = !on;
    var lamp = $("ind-caut").querySelector(".lamp");
    lamp.classList.toggle("pink", true);
    lamp.classList.toggle("on", on);
    if (on) { appendLine("warn", "MASTER CAUTION. (IT IS NOTHING. IT IS ALWAYS NOTHING.)"); blip(300, 0.2, 0.02); }
    else appendLine("sys", "CAUTION CLEARED.");
  }
  document.querySelectorAll(".ind").forEach(function (ind) {
    ind.addEventListener("click", function () {
      if (this.id === "ind-caut") { setCaution(this.querySelector(".lamp").classList.contains("on") ? false : true); return; }
      var lamp = this.querySelector(".lamp");
      lamp.classList.toggle("on");
      blip(lamp.classList.contains("on") ? 800 : 450, 0.045);
    });
  });
  $("cautionbtn").addEventListener("click", function () {
    if (document.body.classList.contains("caution-on")) setCaution(false);
    else appendLine("sys", "CAUTION PANEL: NOTHING TO RESET.");
    blip(500, 0.06);
  });

  /* ── JETTISON, guarded twice ──────────────────────────────── */

  $("master").addEventListener("click", function () {
    appendLine("sys", "> JETTISON");
    if (lockSw.getAttribute("aria-checked") === "true") {
      appendLine("err", "REFUSED: SAFETY LOCK ENGAGED (RIGHT BANK).");
    } else {
      appendLine("err", "REFUSED ANYWAY. NOTHING ABOARD TO JETTISON,");
      appendLine("err", "AND THE BAY DOORS ARE PAINTED ON.");
    }
    blip(240, 0.12);
  });

  /* ── radar contacts ───────────────────────────────────────── */

  document.querySelectorAll(".rblip").forEach(function (b) {
    b.addEventListener("click", function () {
      openCard(+this.getAttribute("data-c"));
      appendLine("sys", "SCOPE: CONTACT " + this.getAttribute("data-c") + " DESIGNATED " + TARGETS[+this.getAttribute("data-c")].name + ".");
    });
  });

  /* ── comms ticker ─────────────────────────────────────────── */

  var CHATTER = [
    ["RELAY-4", "CARRIER STEADY. NOTHING TO REPORT."],
    ["BEACON",  "DEEP ORBIT SWEEP COMPLETE."],
    ["CARGO",   "MANIFEST EMPTY. AWAITING ASSIGNMENT."],
    ["MU/9000", "ROUTINE DIAGNOSTIC PASSED."],
    ["RELAY-4", "HOME OFFICE SAYS: STAND BY."],
    ["GRAV",    "RING SPIN STABLE AT 0.62G."],
    ["SURVEY",  "THE PLANET IS STILL THERE. CONFIRMED."]
  ];
  var chIx = 0;
  function commsTick() {
    var m = CHATTER[chIx++ % CHATTER.length];
    var now = new Date();
    $("commsline").innerHTML = "COMMS " + pad(now.getHours()) + pad(now.getMinutes()) +
      "Z <b>" + m[0] + "</b> " + m[1];
  }
  commsTick();
  setInterval(commsTick, 8000);

  /* top ticker */
  var TICKS = ["ORBITAL INSERTION COMPLETE", "ALL SYSTEMS NOMINAL",
               "DIRECTIVE QUEUE EMPTY", "NEXT SUNRISE IN 00:41"];
  var tkIx = 0;
  setInterval(function () { $("ticker").textContent = TICKS[++tkIx % TICKS.length]; }, 9000);

  /* ── command line ─────────────────────────────────────────── */

  function scan() {
    $("h-scan").textContent = "SCANNING…";
    appendLine("sys", "SCANNING LOCAL VOLUME ...");
    setTimeout(function () {
      $("h-scan").textContent = "SCAN: 2 CONTACTS";
      appendLine("", "2 CONTACTS. NEITHER IS MOVING. PROBABLY FINE.");
    }, RM ? 0 : 1400);
  }

  var COMMANDS = {
    HELP:      function () { return ["COMMANDS: HELP STATUS SCAN TARGET 1|2 HUD GRID", "THROTTLE <0-100> DIRECTIVE CONTACT CLEAR"]; },
    STATUS:    function () {
      return SYSTEMS.map(function (s) { return s.k + " " + s.v + "%"; }).concat(["THROTTLE " + thr + "%", "ALL NOMINAL."]);
    },
    SCAN:      function () { scan(); return []; },
    DIRECTIVE: function () { return ["NO STANDING DIRECTIVE ON FILE.", "THE OPERATOR HAS NOT YET DECIDED", "WHAT THIS SHIP IS FOR."]; },
    CONTACT:   function () { return ["HAIL THE OPERATOR: RYAN@P2COMPUTING.COM"]; },
    CLEAR:     function () { bootEl.textContent = ""; return []; },
    HUD:       function () { $("sw-hud").click(); return []; },
    GRID:      function () { $("sw-grid").click(); return []; },
    JETTISON:  function () { $("master").click(); return []; }
  };

  $("cmdform").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("cmd");
    var raw = input.value.trim().toUpperCase();
    input.value = "";
    if (!raw) return;
    appendLine("sys", "> " + raw);
    blip(700, 0.04);

    var m;
    if ((m = raw.match(/^THROTTLE\s+(\d+)$/))) {
      setThrottle(+m[1]);
      appendLine("", "THROTTLE SET " + thr + "%.");
      return;
    }
    if ((m = raw.match(/^TARGET\s+([12])$/))) { openCard(+m[1]); return; }

    var fn = COMMANDS[raw];
    var out = fn ? fn() : ["UNRECOGNIZED: " + raw + ". TYPE HELP."];
    var i = 0;
    (function next() {
      if (i >= out.length) return;
      appendLine(fn ? "" : "err", out[i++]);
      setTimeout(next, 80);
    })();
  });
})();
