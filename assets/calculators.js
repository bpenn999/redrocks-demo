/* ============================================================
   calculators.js — Free Medicare tools (v1 formula/table engines,
   year-stamped 2026, estimate-framed). Educational only.
   Widgets: eligibility/IEP · Part B penalty · Part D penalty ·
            IRMAA lookup · cost estimator · MA-vs-Medigap quiz
   ============================================================ */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var money = function (n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  // 2026 constants (CMS / SSA) — Part D cap & deductible verified via Ambrose Brain
  // (CMS Medicare Plan Landscape CY2026). Update yearly.
  var PART_B_STD = 202.90;         // 2026 standard Part B premium
  var PART_D_NBBP = 38.99;         // 2026 national base beneficiary premium
  var PART_B_DEDUCT = 283;         // 2026
  var PART_A_DEDUCT = 1736;        // 2026 per benefit period
  var PART_D_CAP = 2100;           // 2026 OOP cap (verified: CMS CY2026 Landscape)
  var PART_D_DEDUCT = 615;         // 2026 standard Part D deductible (verified)

  // ---------- Eligibility / IEP ----------
  var elig = $('#tool-eligibility');
  if (elig) {
    var run = function () {
      var mv = $('#elig-month', elig).value, yv = parseInt($('#elig-year', elig).value, 10);
      var out = $('#elig-out', elig);
      if (!mv || !yv) { out.innerHTML = 'Enter your birth month and year to see your window.'; return; }
      var m = parseInt(mv, 10) - 1;
      var b65 = new Date(yv + 65, m, 1);
      var start = new Date(b65.getFullYear(), b65.getMonth() - 3, 1);
      var end = new Date(b65.getFullYear(), b65.getMonth() + 4, 0);
      var fmt = function (d) { return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }); };
      out.innerHTML = 'Your <b>Initial Enrollment Period</b> runs <b>' + fmt(start) + '</b> through <b>' + fmt(end) + '</b> — a 7-month window around your 65th birthday. Enroll in the first 3 months so coverage can start the month you turn 65.';
    };
    elig.querySelectorAll('select,input').forEach(function (e) { e.addEventListener('change', run); e.addEventListener('input', run); });
  }

  // ---------- Part B late-enrollment penalty ----------
  var pb = $('#tool-part-b-penalty');
  if (pb) {
    var runB = function () {
      var months = parseInt($('#pb-months', pb).value, 10) || 0;
      var out = $('#pb-out', pb);
      var periods = Math.floor(months / 12);
      var pct = periods * 10;
      var add = PART_B_STD * (pct / 100);
      out.innerHTML = periods === 0
        ? 'No Part B late penalty for under 12 months uncovered. Note: the penalty counts full 12-month periods you were eligible but not enrolled without other creditable coverage.'
        : 'Estimated Part B penalty: <b>+' + pct + '%</b> ≈ <b>' + money(add) + '/mo</b> added to your premium — <b>for life</b> (based on the ' + money(PART_B_STD) + ' standard premium, 2026). That\'s about ' + money(add * 12) + '/year.';
    };
    pb.querySelectorAll('input').forEach(function (e) { e.addEventListener('input', runB); });
  }

  // ---------- Part D late-enrollment penalty ----------
  var pd = $('#tool-part-d-penalty');
  if (pd) {
    var runD = function () {
      var months = parseInt($('#pd-months', pd).value, 10) || 0;
      var out = $('#pd-out', pd);
      var pen = Math.round(0.01 * PART_D_NBBP * months * 100) / 100;
      out.innerHTML = months === 0
        ? 'No Part D penalty. The penalty applies if you go 63+ days without creditable drug coverage after your Initial Enrollment Period.'
        : 'Estimated Part D penalty: <b>1% × ' + money(PART_D_NBBP) + ' × ' + months + ' months</b> ≈ <b>' + money(pen) + '/mo</b>, rounded to the nearest 10¢ and added to your drug premium <b>as long as you have Part D</b> (2026 national base premium).';
    };
    pd.querySelectorAll('input').forEach(function (e) { e.addEventListener('input', runD); });
  }

  // ---------- IRMAA bracket lookup (2026) ----------
  var irmaa = $('#tool-irmaa');
  if (irmaa) {
    // 2026 IRMAA (based on 2024 MAGI). [singleMax, marriedMax, partB total, partD add-on]
    var B = [
      [109000, 218000, 202.90, 0.00],
      [137000, 274000, 284.10, 14.50],
      [171000, 342000, 405.90, 37.50],
      [214000, 428000, 527.50, 60.40],
      [500000, 750000, 649.30, 83.30],
      [Infinity, Infinity, 690.90, 91.40]
    ];
    var runI = function () {
      var magi = parseFloat($('#irmaa-magi', irmaa).value.replace(/[^0-9.]/g, '')) || 0;
      var married = $('#irmaa-file', irmaa).value === 'married';
      var out = $('#irmaa-out', irmaa);
      var row = B[0], tier = 1;
      for (var i = 0; i < B.length; i++) { var cap = married ? B[i][1] : B[i][0]; if (magi <= cap) { row = B[i]; tier = i + 1; break; } }
      var extra = tier === 1 ? 'the standard premium — no IRMAA surcharge' : 'an IRMAA surcharge';
      out.innerHTML = 'Based on a MAGI of <b>' + money(magi) + '</b> (' + (married ? 'married filing jointly' : 'single') + ') you\'d fall in <b>tier ' + tier + '</b>, paying <b>' + extra + '</b>: about <b>' + money(row[2]) + '/mo</b> for Part B' + (row[3] > 0 ? ' plus <b>+' + money(row[3]) + '/mo</b> on Part D' : '') + ' (2026, from 2024 income). Had a big income drop? File SSA-44.';
    };
    irmaa.querySelectorAll('input,select').forEach(function (e) { e.addEventListener('input', runI); });
  }

  // ---------- Cost estimator ----------
  var ce = $('#tool-cost-estimator');
  if (ce) {
    var runC = function () {
      var path = $('#ce-path', ce).value;
      var rx = parseFloat($('#ce-rx', ce).value.replace(/[^0-9.]/g, '')) || 0;
      var out = $('#ce-out', ce);
      var partB = PART_B_STD * 12;
      var est, note;
      if (path === 'advantage') {
        est = partB + Math.min(rx, PART_D_CAP) + 600;
        note = 'Part B premium + a typical $0-premium Advantage plan + estimated copays + capped drug costs.';
      } else if (path === 'medigap') {
        est = partB + 1800 + 500 + Math.min(rx, PART_D_CAP);
        note = 'Part B premium + an estimated Plan G premium (~$150/mo) + a Part D plan + capped drug costs. Very predictable.';
      } else {
        est = partB + PART_B_DEDUCT + Math.min(rx, PART_D_CAP) + 1000;
        note = 'Original Medicare alone leaves you exposed with no out-of-pocket max — most people add Medigap or choose Advantage.';
      }
      out.innerHTML = 'Rough yearly estimate: <b>' + money(est) + '/year</b> (~' + money(est / 12) + '/mo). ' + note + ' Part D out-of-pocket is capped at <b>' + money(PART_D_CAP) + '</b> in 2026. Estimate only — your real cost depends on your plan, doctors, and drugs.';
    };
    ce.querySelectorAll('input,select').forEach(function (e) { e.addEventListener('input', runC); });
  }

  // ---------- MA-vs-Medigap quiz ----------
  var quiz = $('#tool-ma-vs-medigap');
  if (quiz) {
    var recompute = function () {
      var qs = quiz.querySelectorAll('select');
      var score = 0, answered = 0;
      qs.forEach(function (s) { if (s.value !== '') { answered++; score += parseInt(s.value, 10); } });
      var out = $('#quiz-out', quiz);
      if (answered < qs.length) { out.innerHTML = 'Answer all ' + qs.length + ' questions for a suggestion.'; return; }
      var verdict;
      if (score >= 3) verdict = '<b>Medicare Advantage</b> likely fits — you value low premiums and built-in extras, and mostly get care locally.';
      else if (score <= -3) verdict = '<b>Medigap + Part D</b> likely fits — you value doctor freedom, travel, and predictable costs.';
      else verdict = 'It\'s a genuine toss-up — both paths could work. This is exactly where a 20-minute call with a licensed advisor pays off.';
      out.innerHTML = verdict + ' <br><span class="hint">Educational only — not a recommendation. We do not offer every plan available in your area.</span>';
    };
    quiz.querySelectorAll('select').forEach(function (s) { s.addEventListener('change', recompute); });
  }
})();
