/* P2 Computing — orbital console
   All motion here is slow and smooth; nothing strobes. */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── clock: stardate + mission elapsed time ─────────────── */

  var bootAt = Date.now();

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = "0" + n; return n; }

  function tickClock() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var day = Math.floor((now - start) / 864e5);
    $("stardate").textContent =
      "SD " + (now.getFullYear() - 1700) + "." + pad(day, 3);

    var s = Math.floor((Date.now() - bootAt) / 1000);
    $("met").textContent = "MET " +
      pad(Math.floor(s / 3600), 3) + ":" +
      pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ── boot log: typed once, then hands over the prompt ───── */

  var BOOT = [
    ["sys",  "MU/9000 SELF TEST ........ PASS"],
    ["sys",  "MEMORY 2048K ............. OK"],
    ["sys",  "REACTOR HANDSHAKE ........ OK"],
    ["sys",  "DEEP ORBIT UPLINK ........ LOCKED"],
    ["",     ""],
    ["",     "P2 COMPUTING ORBITAL CONSOLE"],
    ["",     "INTERFACE 2.6 // CREW ACCESS GRANTED"],
    ["",     ""],
    ["warn", "NO STANDING DIRECTIVE ON FILE."],
    ["",     "THIS STATION IS BEING PREPARED FOR A"],
    ["",     "FUTURE OPERATION. CHECK BACK SOON."],
    ["",     ""],
    ["sys",  "TYPE HELP FOR COMMANDS."]
  ];

  var bootEl = $("bootlog");

  function appendLine(cls, text) {
    var span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text + "\n";
    bootEl.appendChild(span);
    bootEl.scrollTop = bootEl.scrollHeight;
    return span;
  }

  function typeLines(lines, i, done) {
    if (i >= lines.length) { if (done) done(); return; }
    var cls = lines[i][0], text = lines[i][1];
    if (reducedMotion || !text) {
      appendLine(cls, text);
      typeLines(lines, i + 1, done);
      return;
    }
    var span = appendLine(cls, "");
    var j = 0;
    var t = setInterval(function () {
      j += 2;
      span.textContent = text.slice(0, j) + (j < text.length ? "█" : "") + "\n";
      bootEl.scrollTop = bootEl.scrollHeight;
      if (j >= text.length) {
        clearInterval(t);
        span.textContent = text + "\n";
        setTimeout(function () { typeLines(lines, i + 1, done); }, 60);
      }
    }, 18);
  }

  typeLines(BOOT, 0, function () { $("cmd").focus(); });

  /* ── command line ───────────────────────────────────────── */

  var COMMANDS = {
    HELP: function () {
      return ["COMMANDS: HELP STATUS SCAN DIRECTIVE CONTACT CLEAR"];
    },
    STATUS: function () {
      return [
        "POWER 92% / LIFE SUP 100% / COMMS 78%",
        "GRAV RING 66% / SHIELDS 84%",
        "ALL SYSTEMS NOMINAL."
      ];
    },
    SCAN: function () {
      return [
        "SCANNING LOCAL VOLUME ...",
        "2 CONTACTS. NEITHER IS MOVING.",
        "PROBABLY FINE."
      ];
    },
    DIRECTIVE: function () {
      return [
        "NO STANDING DIRECTIVE ON FILE.",
        "THE OPERATOR HAS NOT YET DECIDED",
        "WHAT THIS STATION IS FOR."
      ];
    },
    CONTACT: function () {
      return ["HAIL THE OPERATOR: RYAN@P2COMPUTING.COM"];
    },
    CLEAR: function () {
      bootEl.textContent = "";
      return [];
    }
  };

  $("cmdform").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("cmd");
    var raw = input.value.trim().toUpperCase();
    input.value = "";
    if (!raw) return;
    appendLine("sys", "> " + raw);
    var fn = COMMANDS[raw];
    var out = fn ? fn() : ["UNRECOGNIZED: " + raw + ". TYPE HELP."];
    var i = 0;
    (function next() {
      if (i >= out.length) return;
      appendLine(fn ? "" : "err", out[i++]);
      setTimeout(next, 90);
    })();
  });

  /* ── telemetry: waveform + drifting readouts ────────────── */

  var wave1 = $("wavepath"), wave2 = $("wavepath2");
  var phase = 0;

  function drawWave() {
    phase += reducedMotion ? 0 : 0.035;
    var d1 = "M0,40", d2 = "M0,40";
    for (var x = 0; x <= 300; x += 6) {
      var y1 = 40 + Math.sin(x / 28 + phase) * 16 * Math.sin(x / 90 + phase / 3);
      var y2 = 40 + Math.sin(x / 14 - phase * 1.4) * 7;
      d1 += " L" + x + "," + y1.toFixed(1);
      d2 += " L" + x + "," + y2.toFixed(1);
    }
    wave1.setAttribute("d", d1);
    wave2.setAttribute("d", d2);
    if (!reducedMotion) requestAnimationFrame(drawWave);
  }
  drawWave();

  var core = 641, flux = 1.21;
  setInterval(function () {
    core += Math.round((Math.random() - 0.5) * 4);
    flux = Math.max(0.9, Math.min(1.6, flux + (Math.random() - 0.5) * 0.05));
    $("t-core").textContent = core + "K";
    $("t-flux").textContent = flux.toFixed(2);
    $("t-o2").textContent = (20.7 + Math.random() * 0.4).toFixed(1) + "%";
  }, 3000);

  /* ── comms log: quiet chatter, appended slowly ──────────── */

  var CHATTER = [
    ["RELAY-4", "CARRIER STEADY. NOTHING TO REPORT."],
    ["BEACON", "DEEP ORBIT BEACON SWEEP COMPLETE."],
    ["RELAY-4", "SOLAR WIND WITHIN LIMITS."],
    ["CARGO", "MANIFEST EMPTY. AWAITING ASSIGNMENT."],
    ["BEACON", "NO NEW CONTACTS THIS PASS."],
    ["MU/9000", "ROUTINE DIAGNOSTIC PASSED."],
    ["RELAY-4", "SIGNAL FROM HOME OFFICE: STAND BY."],
    ["GRAV", "RING SPIN STABLE AT 0.62G."]
  ];

  var commsEl = $("commslog");
  var chatterIx = 0;

  function commsStamp() {
    var now = new Date();
    return pad(now.getHours()) + pad(now.getMinutes()) + "Z";
  }

  function addComms() {
    var m = CHATTER[chatterIx++ % CHATTER.length];
    var li = document.createElement("li");
    li.innerHTML = '<span class="t">' + commsStamp() + '</span>' +
                   '<span class="from">' + m[0] + '</span>';
    li.appendChild(document.createTextNode(m[1]));
    commsEl.appendChild(li);
    while (commsEl.children.length > 24) commsEl.removeChild(commsEl.firstChild);
    commsEl.scrollTop = commsEl.scrollHeight;
  }

  addComms(); addComms(); addComms();
  setInterval(addComms, 7000);
})();
