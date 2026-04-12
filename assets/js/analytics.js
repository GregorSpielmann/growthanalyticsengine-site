/**
 * growthanalyticsengine.com — Amplitude Analytics + Session Replay
 *
 * Events tracked:
 *   page_viewed              — every page load (after consent)
 *   tool_started             — user clicks Start on a tool
 *   assessment_completed     — maturity assessment finished (with stage + score)
 *   calculator_used          — sample size or ROI calc (with key inputs)
 *   guide_viewed             — any guide page load (with slug + category)
 *   cta_clicked              — any Adasight CTA link clicked
 *
 * Consent:
 *   A banner is shown on first visit. Amplitude and Session Replay
 *   only initialise after the user clicks Accept.
 *   Decision stored in localStorage key: amplitude_consent
 */

const AMPLITUDE_API_KEY = '8b02cbf05d32084ff00fd7ab27e1d4d5';

(function () {
  var CONSENT_KEY = 'amplitude_consent';

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function removeBanner() {
    var el = document.getElementById('consent-banner');
    if (el) el.remove();
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.innerHTML = [
      '<div style="position:fixed;bottom:0;left:0;right:0;z-index:9999;',
      'background:#0f172a;border-top:1px solid #1e293b;padding:16px 24px;',
      'display:flex;align-items:center;justify-content:space-between;gap:16px;',
      'flex-wrap:wrap;font-family:Inter,sans-serif;font-size:0.875rem;color:#94a3b8;">',
      '<p style="margin:0;max-width:600px;">',
      'We use analytics cookies to understand how visitors use this site, and session recordings ',
      'to improve the experience. No data is sold or shared.',
      '</p>',
      '<div style="display:flex;gap:10px;flex-shrink:0;">',
      '<button id="consent-decline" style="padding:8px 16px;border-radius:6px;border:1px solid #334155;',
      'background:transparent;color:#94a3b8;cursor:pointer;font-size:0.875rem;">Decline</button>',
      '<button id="consent-accept" style="padding:8px 18px;border-radius:6px;border:none;',
      'background:#2563eb;color:#fff;cursor:pointer;font-size:0.875rem;font-weight:600;">Accept</button>',
      '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('consent-accept').addEventListener('click', function () {
      setConsent('granted');
      removeBanner();
      initAmplitude();
    });

    document.getElementById('consent-decline').addEventListener('click', function () {
      setConsent('declined');
      removeBanner();
    });
  }

  function initAmplitude() {
    // ── Load Amplitude SDK ──────────────────────────────────────────────────
    var sdkScript = document.createElement('script');
    sdkScript.src = 'https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz';
    sdkScript.onload = function () {
      // ── Session Replay plugin ─────────────────────────────────────────────
      var srScript = document.createElement('script');
      srScript.src = 'https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.6.22-min.js.gz';
      srScript.onload = function () {
        var sessionReplayPlugin = window.sessionReplay.plugin({ sampleRate: 1 });
        window.amplitude.add(sessionReplayPlugin);
      };
      document.head.appendChild(srScript);

      // ── Init ───────────────────────────────────────────────────────────────
      window.amplitude.init(AMPLITUDE_API_KEY, {
        defaultTracking: {
          pageViews: false,
          sessions: true,
          formInteractions: false,
          fileDownloads: false,
        },
      });

      trackPageAndEvents();
    };
    document.head.appendChild(sdkScript);
  }

  function trackPageAndEvents() {
    // ── Page Viewed ──────────────────────────────────────────────────────────
    var path = window.location.pathname;
    var pageType = 'other';
    var pageName = document.title.split(' — ')[0];

    if (path === '/' || path === '/index.html') pageType = 'homepage';
    else if (path.startsWith('/tools/analytics-maturity')) pageType = 'tool';
    else if (path.startsWith('/tools/sample-size-calculator')) pageType = 'tool';
    else if (path.startsWith('/tools/experimentation-roi')) pageType = 'tool';
    else if (path.startsWith('/tools')) pageType = 'tools_hub';
    else if (path.startsWith('/guides/') && path.length > 8) pageType = 'guide';
    else if (path.startsWith('/guides')) pageType = 'guides_hub';
    else if (path.startsWith('/blog/') && path.length > 7) pageType = 'blog_post';
    else if (path.startsWith('/blog')) pageType = 'blog_hub';

    window.amplitude.track('page_viewed', {
      page_name: pageName,
      page_type: pageType,
      page_path: path,
      referrer: document.referrer || 'direct',
    });

    // ── CTA clicks (Adasight links) ──────────────────────────────────────────
    document.querySelectorAll('a[href*="adasight.com"]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.amplitude.track('cta_clicked', {
          cta_text: el.innerText.trim(),
          cta_destination: el.href,
          source_page: path,
          source_page_type: pageType,
        });
      });
    });

    // ── Guide tracking ───────────────────────────────────────────────────────
    if (pageType === 'guide') {
      var slug = path.replace('/guides/', '').replace(/\/$/, '');
      var category = 'unknown';
      if (slug.includes('amplitude') || slug.includes('analytics')) category = 'analytics';
      else if (slug.includes('ab-test') || slug.includes('experimentation') || slug.includes('sample-size')) category = 'experimentation';
      else if (slug.includes('roi')) category = 'roi';

      window.amplitude.track('guide_viewed', {
        guide_slug: slug,
        guide_category: category,
        guide_title: pageName,
      });
    }

    // ── Tool-specific tracking ───────────────────────────────────────────────
    if (pageType === 'tool') {
      trackTool(path, pageName);
    }
  }

  function trackTool(path, pageName) {
    // ── Analytics Maturity Assessment ────────────────────────────────────────
    if (path.includes('analytics-maturity')) {
      var _origStart = window.startAssessment;
      window.startAssessment = function () {
        window.amplitude.track('tool_started', { tool_name: 'analytics_maturity_assessment' });
        if (_origStart) _origStart();
      };

      var _origResults = window.showResults;
      window.showResults = function () {
        if (_origResults) {
          _origResults();
          var resultEl = document.querySelector('.result-value');
          if (resultEl) {
            var stageText = resultEl.innerText;
            var stageNum = stageText.match(/Stage (\d)/);
            window.amplitude.track('assessment_completed', {
              tool_name: 'analytics_maturity_assessment',
              result_stage: stageNum ? parseInt(stageNum[1]) : null,
              result_label: stageText,
            });
          }
        }
      };
    }

    // ── Sample Size Calculator ────────────────────────────────────────────────
    if (path.includes('sample-size-calculator')) {
      var calcTimeout;
      var _origCalc = window.calculate;
      window.calculate = function () {
        if (_origCalc) _origCalc();
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(function () {
          var baseline = document.getElementById('baseline') ? document.getElementById('baseline').value : null;
          var mde = document.getElementById('mde') ? document.getElementById('mde').value : null;
          var result = document.getElementById('res-per-variant') ? document.getElementById('res-per-variant').innerText : null;
          window.amplitude.track('calculator_used', {
            tool_name: 'sample_size_calculator',
            baseline_rate: baseline,
            mde: mde,
            result_per_variant: result,
          });
        }, 1200);
      };
    }

    // ── Experimentation ROI Calculator ────────────────────────────────────────
    if (path.includes('experimentation-roi')) {
      var roiTimeout;
      var _origRoi = window.calculate;
      window.calculate = function () {
        if (_origRoi) _origRoi();
        clearTimeout(roiTimeout);
        roiTimeout = setTimeout(function () {
          var tests = document.getElementById('tests-per-month') ? document.getElementById('tests-per-month').value : null;
          var winRate = document.getElementById('win-rate') ? document.getElementById('win-rate').value : null;
          var result = document.getElementById('res-annual') ? document.getElementById('res-annual').innerText : null;
          window.amplitude.track('calculator_used', {
            tool_name: 'experimentation_roi_calculator',
            tests_per_month: tests,
            win_rate_pct: winRate,
            result_annual: result,
          });
        }, 1200);
      };
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  var consent = getConsent();
  if (consent === 'granted') {
    initAmplitude();
  } else if (consent === null) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
  // consent === 'declined' → do nothing

})();
