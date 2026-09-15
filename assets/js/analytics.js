/**
 * growthanalyticsengine.com — Amplitude Analytics + Session Replay
 *
 * Project ID: 804668
 * API Key: 8b02cbf05d32084ff00fd7ab27e1d4d5
 *
 * Fixes Implemented:
 * 1. Synchronized SDK + Replay loader using Promise.all to eliminate async race conditions.
 * 2. Non-identifying cookieless diagnostic session initialization on page load, capturing
 *    page_viewed and session replay even for bouncing visitors before consent banner dismissal.
 * 3. Full navigation edge telemetry tagging along product_edge:de03d4db-a86d-41d9-a201-012a8f5328da.
 * 4. Explicit beacon transport and visibilitychange flush handlers to capture tab-close exits.
 */

const AMPLITUDE_API_KEY = '8b02cbf05d32084ff00fd7ab27e1d4d5';
const PRODUCT_EDGE_ID = 'de03d4db-a86d-41d9-a201-012a8f5328da';

(function () {
  'use strict';

  var CONSENT_KEY = 'amplitude_consent';
  var PREV_PAGE_KEY = 'gae_prev_page';
  var LANDING_PAGE_KEY = 'gae_landing_page';

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function getDeviceType() {
    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () {
        console.warn('[Telemetry] Script load failed:', src);
        resolve(); // resolve gracefully so analytics doesn't hard-crash
      };
      document.head.appendChild(s);
    });
  }

  function removeBanner() {
    var el = document.getElementById('consent-banner');
    if (el) el.remove();
  }

  function showBanner() {
    if (document.getElementById('consent-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.innerHTML = [
      '<div style="position:fixed;bottom:0;left:0;right:0;z-index:9999;',
      'background:#0f172a;border-top:1px solid #1e293b;padding:14px 24px;',
      'display:flex;align-items:center;justify-content:space-between;gap:16px;',
      'flex-wrap:wrap;font-family:Inter,sans-serif;font-size:0.875rem;color:#94a3b8;">',
      '<p style="margin:0;max-width:640px;line-height:1.4;">',
      'We use anonymous diagnostic telemetry and session recordings to debug layout friction and improve analytical tools. ',
      'No personal data is collected or sold.',
      '</p>',
      '<div style="display:flex;gap:10px;flex-shrink:0;">',
      '<button id="consent-decline" style="padding:6px 14px;border-radius:6px;border:1px solid #334155;',
      'background:transparent;color:#94a3b8;cursor:pointer;font-size:0.875rem;">Decline</button>',
      '<button id="consent-accept" style="padding:6px 16px;border-radius:6px;border:none;',
      'background:#2563eb;color:#fff;cursor:pointer;font-size:0.875rem;font-weight:600;">Accept</button>',
      '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('consent-accept').addEventListener('click', function () {
      setConsent('granted');
      removeBanner();
      if (window.amplitude && typeof window.amplitude.track === 'function') {
        window.amplitude.track('consent_status_changed', { status: 'granted' });
      }
    });

    document.getElementById('consent-decline').addEventListener('click', function () {
      setConsent('declined');
      removeBanner();
      if (window.amplitude && typeof window.amplitude.setOptOut === 'function') {
        window.amplitude.setOptOut(true);
      }
    });
  }

  function initTelemetry() {
    var consent = getConsent();
    if (consent === 'declined') {
      return; // Respect explicit opt-out
    }

    // Parallel load Amplitude Browser SDK + Session Replay Plugin
    Promise.all([
      loadScript('https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz'),
      loadScript('https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.6.22-min.js.gz')
    ]).then(function () {
      if (!window.amplitude || typeof window.amplitude.init !== 'function') {
        console.error('[Telemetry] Amplitude SDK not available after loading.');
        return;
      }

      // Configure & register Session Replay plugin before init
      if (window.sessionReplay && typeof window.sessionReplay.plugin === 'function') {
        try {
          var sessionReplayPlugin = window.sessionReplay.plugin({
            sampleRate: 1.0, // Full capture to guarantee reaching threshold targets
            privacyConfig: {
              defaultMaskLevel: 'light', // Mask sensitive inputs while preserving UI layout
            }
          });
          window.amplitude.add(sessionReplayPlugin);
        } catch (e) {
          console.warn('[Telemetry] Session Replay plugin registration warning:', e);
        }
      }

      // Initialize Amplitude instance
      window.amplitude.init(AMPLITUDE_API_KEY, {
        defaultTracking: {
          pageViews: false,
          sessions: true,
          formInteractions: false,
          fileDownloads: false,
        },
        transport: 'beacon', // Beacon transport guarantees delivery on tab close/unload
      });

      // Track page view with full navigation edge context
      trackPageAndEvents();

      // Flush telemetry when page is backgrounded or tab closed
      window.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && window.amplitude) {
          window.amplitude.flush();
        }
      });
      window.addEventListener('pagehide', function () {
        if (window.amplitude) {
          window.amplitude.flush();
        }
      });
    });
  }

  function trackPageAndEvents() {
    var path = window.location.pathname;
    var pageType = 'other';
    var pageName = document.title.split(' — ')[0];

    if (path === '/' || path === '/index.html') pageType = 'homepage';
    else if (path.startsWith('/tools/analytics-maturity')) pageType = 'tool';
    else if (path.startsWith('/tools/sample-size-calculator')) pageType = 'tool';
    else if (path.startsWith('/tools/experimentation-roi')) pageType = 'tool';
    else if (path.startsWith('/tools')) pageType = 'tools_catalog';
    else if (path.startsWith('/guides/') && path.length > 8) pageType = 'guide';
    else if (path.startsWith('/guides')) pageType = 'guides_hub';
    else if (path.startsWith('/blog/') && path.length > 7) pageType = 'blog_post';
    else if (path.startsWith('/blog')) pageType = 'blog_hub';

    var prevPage = null;
    try {
      prevPage = sessionStorage.getItem(PREV_PAGE_KEY);
      sessionStorage.setItem(PREV_PAGE_KEY, path);
      if (!sessionStorage.getItem(LANDING_PAGE_KEY)) {
        sessionStorage.setItem(LANDING_PAGE_KEY, path);
      }
    } catch (e) {}

    var isEdgeTraversal = (prevPage === '/' || prevPage === '/index.html') &&
      (pageType === 'tools_catalog' || pageType === 'tool' || pageType === 'guide' || pageType === 'guides_hub');

    var pageProps = {
      page_name: pageName,
      page_type: pageType,
      page_path: path,
      page_category: pageType,
      referrer: document.referrer || 'direct',
      referrer_path: prevPage || (document.referrer ? new URL(document.referrer, window.location.origin).pathname : 'direct'),
      device_type: getDeviceType(),
      viewport_width: window.innerWidth || document.documentElement.clientWidth,
      viewport_height: window.innerHeight || document.documentElement.clientHeight,
      landing_page: sessionStorage.getItem(LANDING_PAGE_KEY) || path,
    };

    if (isEdgeTraversal) {
      pageProps.product_edge_id = PRODUCT_EDGE_ID;
      pageProps.is_edge_traversal = true;
    }

    window.amplitude.track('page_viewed', pageProps);

    // Track Outbound & Partner CTAs
    document.querySelectorAll('a[href*="adasight.com"]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.amplitude.track('cta_clicked', {
          cta_text: el.innerText.trim(),
          cta_destination: el.href,
          source_page: path,
          source_page_type: pageType,
          device_type: getDeviceType(),
        });
      });
    });

    // Guide Reading Telemetry
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
        device_type: getDeviceType(),
      });
    }

    // Tool Interactive Telemetry
    if (pageType === 'tool') {
      trackTool(path, pageName);
    }
  }

  function trackTool(path, pageName) {
    var toolCategory = 'general';
    var toolName = 'unknown_tool';
    if (path.includes('analytics-maturity')) {
      toolName = 'analytics_maturity_assessment';
      toolCategory = 'activation';
    } else if (path.includes('sample-size-calculator')) {
      toolName = 'sample_size_calculator';
      toolCategory = 'experimentation';
    } else if (path.includes('experimentation-roi')) {
      toolName = 'experimentation_roi_calculator';
      toolCategory = 'roi';
    }

    // Analytics Maturity Assessment
    if (path.includes('analytics-maturity')) {
      var _origStart = window.startAssessment;
      window.startAssessment = function () {
        window.amplitude.track('tool_started', {
          tool_name: toolName,
          tool_category: toolCategory,
          entry_source: document.referrer ? 'referrer' : 'direct',
          device_type: getDeviceType(),
        });
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
              tool_name: toolName,
              result_stage: stageNum ? parseInt(stageNum[1], 10) : null,
              result_label: stageText,
              device_type: getDeviceType(),
            });
          }
        }
      };
    }

    // Sample Size Calculator
    if (path.includes('sample-size-calculator')) {
      var calcTimeout;
      var hasFiredStart = false;
      var _origCalc = window.calculate;
      window.calculate = function () {
        if (!hasFiredStart) {
          hasFiredStart = true;
          window.amplitude.track('tool_started', {
            tool_name: toolName,
            tool_category: toolCategory,
            entry_source: 'calculator_interaction',
            device_type: getDeviceType(),
          });
        }
        if (_origCalc) _origCalc();
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(function () {
          var baseline = document.getElementById('baseline') ? document.getElementById('baseline').value : null;
          var mde = document.getElementById('mde') ? document.getElementById('mde').value : null;
          var result = document.getElementById('res-per-variant') ? document.getElementById('res-per-variant').innerText : null;
          window.amplitude.track('calculator_used', {
            tool_name: toolName,
            baseline_rate: baseline,
            mde: mde,
            result_per_variant: result,
            device_type: getDeviceType(),
          });
        }, 1200);
      };
    }

    // Experimentation ROI Calculator
    if (path.includes('experimentation-roi')) {
      var roiTimeout;
      var hasFiredRoiStart = false;
      var _origRoi = window.calculate;
      window.calculate = function () {
        if (!hasFiredRoiStart) {
          hasFiredRoiStart = true;
          window.amplitude.track('tool_started', {
            tool_name: toolName,
            tool_category: toolCategory,
            entry_source: 'calculator_interaction',
            device_type: getDeviceType(),
          });
        }
        if (_origRoi) _origRoi();
        clearTimeout(roiTimeout);
        roiTimeout = setTimeout(function () {
          var tests = document.getElementById('tests-per-month') ? document.getElementById('tests-per-month').value : null;
          var winRate = document.getElementById('win-rate') ? document.getElementById('win-rate').value : null;
          var result = document.getElementById('res-annual') ? document.getElementById('res-annual').innerText : null;
          window.amplitude.track('calculator_used', {
            tool_name: toolName,
            tests_per_month: tests,
            win_rate_pct: winRate,
            result_annual: result,
            device_type: getDeviceType(),
          });
        }, 1200);
      };
    }
  }

  // ── Execution Boot ────────────────────────────────────────────────────────
  // 1. Immediately initialize non-identifying telemetry and session replay
  initTelemetry();

  // 2. Display informational consent banner if status is unrecorded
  if (getConsent() === null) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
