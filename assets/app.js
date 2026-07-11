/* ============================================================
   app.js — nav, scroll reveal, and the hero ZIP-first quote funnel.
   ZIP → age → coverage path → doctor usage → prescriptions → result.
   One question per step; auto-advance on choice; Back button.
   v1 uses a client-side estimate. To go live, replace estimate()
   with a call to plan_quoter.medicare_plans (THE BRAIN) by county.
   ============================================================ */
(function () {
  // ---- mobile nav ----
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', function () { links.classList.toggle('open'); });

  // ---- scroll reveal ----
  var revs = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revs.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revs.forEach(function (r) { io.observe(r); });
  } else { revs.forEach(function (r) { r.classList.add('in'); }); }

  // ---- count-up on data stats ----
  var nums = document.querySelectorAll('[data-countup]');
  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, raw = el.getAttribute('data-countup');
        var pre = raw.match(/^[^0-9]*/)[0], post = raw.match(/[^0-9,\.]*$/)[0];
        var target = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0, dec = (raw.split('.')[1] || '').replace(/[^0-9]/g,'').length;
        var t0 = null;
        function tick(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 1100, 1); var val = (target * (0.2 + 0.8 * p)); el.textContent = pre + val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post; if (p < 1) requestAnimationFrame(tick); else el.textContent = raw; }
        requestAnimationFrame(tick); io2.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io2.observe(n); });
  }

  // ---- hero quote funnel ----
  var funnel = document.querySelector('[data-funnel]');
  if (!funnel) return;
  var state = { zip: '', age: '', path: '', doctors: '', rx: '' };
  var order = ['zip', 'age', 'path', 'doctors', 'rx', 'result'];
  var idx = 0;

  var steps = funnel.querySelectorAll('.step');
  var bar = funnel.querySelector('.progress > i');
  var stepCount = funnel.querySelector('.step-count');

  function show(i) {
    idx = Math.max(0, Math.min(i, order.length - 1));
    steps.forEach(function (s) { s.classList.toggle('active', s.getAttribute('data-step') === order[idx]); });
    if (bar) bar.style.width = ((idx) / (order.length - 1) * 100) + '%';
    if (stepCount) stepCount.textContent = 'Step ' + (idx + 1) + ' of ' + order.length;
    if (order[idx] === 'result') renderResult();
  }
  function next() { show(idx + 1); }
  function back() { show(idx - 1); }

  funnel.querySelectorAll('[data-choice]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-key'), val = btn.getAttribute('data-choice');
      state[key] = val;
      next();
    });
  });
  funnel.querySelectorAll('.link-back').forEach(function (b) { b.addEventListener('click', back); });

  // ZIP step
  var zipInput = funnel.querySelector('#zip');
  var zipGo = funnel.querySelector('#zip-go');
  function submitZip() {
    var z = (zipInput.value || '').replace(/[^0-9]/g, '').slice(0, 5);
    if (z.length !== 5) { zipInput.focus(); zipInput.style.borderColor = '#c0392b'; return; }
    state.zip = z; next();
  }
  if (zipGo) zipGo.addEventListener('click', submitZip);
  if (zipInput) zipInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitZip(); });

  // Age step
  var ageInput = funnel.querySelector('#age');
  var ageGo = funnel.querySelector('#age-go');
  function submitAge() {
    var a = parseInt((ageInput.value || '').replace(/[^0-9]/g, ''), 10);
    if (!a || a < 18 || a > 110) { ageInput.focus(); ageInput.style.borderColor = '#c0392b'; return; }
    state.age = String(a); next();
  }
  if (ageGo) ageGo.addEventListener('click', submitAge);
  if (ageInput) ageInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAge(); });

  // CY2026 figures verified via Ambrose Brain (CMS Medicare Plan Landscape, per county).
  // ZIP → Utah county mapping (approximate, common ZIPs); unknown counties get an honest generic result.
  var COUNTY_DATA = {
    'Salt Lake':  { maPd: 24, zero: 17, star: '4.5', extra: '41 total incl. Special Needs Plans' },
    'Utah':       { maPd: 21, zero: 14, star: '4.5' },
    'Davis':      { maPd: 24, zero: 17, star: '4.5' },
    'Weber':      { maPd: 19, zero: 13, star: '4.5' },
    'Grand':      { maPd: 8,  zero: 5,  star: '4.5' }
  };
  function zipCounty(z) {
    var n = parseInt(z, 10);
    if (!n) return null;
    if (z === '84532') return 'Grand'; // Moab
    var SL = [84006,84009,84020,84044,84047,84065,84070,84081,84084,84088,84090,84091,84092,84093,84094,84095,84096];
    var DV = [84010,84011,84014,84015,84016,84025,84037,84040,84041,84054,84056,84075,84087,84089];
    var UT = [84003,84004,84005,84013,84042,84043,84045,84057,84058,84059,84062,84097,84626,84651,84653,84655,84660,84663,84664];
    var WB = [84067,84201,84244,84315];
    if ((n >= 84101 && n <= 84199) || SL.indexOf(n) >= 0) return 'Salt Lake';
    if (DV.indexOf(n) >= 0) return 'Davis';
    if ((n >= 84601 && n <= 84606) || UT.indexOf(n) >= 0) return 'Utah';
    if ((n >= 84401 && n <= 84415) || WB.indexOf(n) >= 0) return 'Weber';
    return null;
  }
  function estimate() {
    var age = parseInt(state.age, 10) || 65;
    var medicare = age >= 64;
    var county = zipCounty(state.zip);
    var d = county ? COUNTY_DATA[county] : null;
    var medigap = 10, partD = 10;
    var line1, line2, big, sub;
    if (!medicare) {
      big = 'ACA'; sub = 'Marketplace plans near ' + state.zip + ' (under 65)';
      line1 = { b: 'Subsidies', s: 'Most qualify for tax credits' };
      line2 = { b: 'Bronze–Gold', s: 'Metal tiers to fit your budget' };
    } else if (state.path === 'medigap') {
      big = medigap; sub = 'standardized Medigap plans available';
      line1 = { b: partD, s: 'Part D drug plans (ID/UT)' };
      line2 = { b: 'Any doctor', s: 'Nationwide, no network' };
    } else if (state.path === 'original') {
      big = partD; sub = 'stand-alone Part D plans (ID/UT region)';
      line1 = { b: medigap, s: 'Medigap options' };
      line2 = { b: '$2,100', s: 'Part D yearly cap (2026)' };
    } else if (d) {
      big = d.maPd; sub = 'Medicare Advantage (MA-PD) plans in ' + county + ' County' + (d.extra ? ' — ' + d.extra : '');
      line1 = { b: d.zero + ' of ' + d.maPd, s: 'MA-PD plans at $0 premium' };
      line2 = { b: d.star + '★', s: 'Top plan rating (CY2026)' };
    } else {
      big = 'UT'; sub = 'plan lineups vary county to county';
      line1 = { b: 'CY2026', s: 'We pull your county\'s exact lineup' };
      line2 = { b: '$2,100', s: 'Part D yearly cap (2026)' };
    }
    return { big: big, sub: sub, line1: line1, line2: line2, county: county };
  }

  function renderResult() {
    var r = estimate();
    var host = funnel.querySelector('[data-step="result"] .result-body');
    if (!host) return;
    host.innerHTML =
      '<div class="big" data-countup="' + r.big + '">' + r.big + '</div>' +
      '<div class="hint" style="margin-top:6px">' + r.sub + '</div>' +
      '<div class="stat-row">' +
        '<div><b>' + r.line1.b + '</b><small>' + r.line1.s + '</small></div>' +
        '<div><b>' + r.line2.b + '</b><small>' + r.line2.s + '</small></div>' +
      '</div>' +
      '<p class="hint" style="text-align:center">' + (r.county ? r.county + ' County availability' : 'Availability') + ' — CY2026, from the CMS Medicare Plan Landscape. Actual plans depend on your county, doctors, and medications. We do not offer every plan available in your area.</p>';
  }

  show(0);
})();
