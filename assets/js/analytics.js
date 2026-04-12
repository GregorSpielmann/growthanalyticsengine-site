/**
 * growthanalyticsengine.com — Amplitude Analytics
 * Replace AMPLITUDE_API_KEY with your actual key from Amplitude > Settings > Projects
 *
 * Events tracked:
 *   page_viewed              — every page load
 *   tool_started             — user clicks Start on a tool
 *   assessment_completed     — maturity assessment finished (with stage + score)
 *   calculator_used          — sample size or ROI calc (with key inputs)
 *   guide_viewed             — any guide page load (with slug + category)
 *   cta_clicked              — any Adasight CTA link clicked
 */

const AMPLITUDE_API_KEY = '8b02cbf05d32084ff00fd7ab27e1d4d5';

(function() {
  // ── Load Amplitude SDK (v2 CDN) ──────────────────────────────────────────
  !function(){"use strict";var e=function(){var e=function(e,r){var a;return function(){var t=this,n=arguments;clearTimeout(a),a=setTimeout(function(){e.apply(t,n)},r)}};var r=function(e,r,a){if(e&&r)try{var t=Object.defineProperty;"string"==typeof a?t(e,r,{value:a,enumerable:!1,configurable:!0,writable:!0}):t(e,r,a)}catch(e){}};function a(e,a,t){r(e,"_q",[]);var n=function(e){r(e,"prototype",{onInit:function(e){return this._q.push(["onInit",e]),this},track:function(e,a){return this._q.push(["track",e,a]),this}})};n(e),r(e,"_iq",{}),r(e,"getInstance",function(e){return e=(!e||e.length<1?"$default_instance":e).toLowerCase(),r(e,"_q",[]),r(e,a,t),e in this._iq||(this._iq[e]={}),this._iq[e]})}window.amplitude?window.amplitude:"undefined"!=typeof module&&module.exports?module.exports:a(window.amplitude={},e,r)}()}();

  // Load SDK dynamically
  var script = document.createElement('script');
  script.src = 'https://cdn.amplitude.com/libs/analytics-browser-2.3.5-min.js.gz';
  script.onload = function() {
    amplitude.init(AMPLITUDE_API_KEY, {
      defaultTracking: {
        pageViews: false, // we track manually for richer data
        sessions: true,
        formInteractions: false,
        fileDownloads: false,
      }
    });
    initTracking();
  };
  document.head.appendChild(script);

  function initTracking() {
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

    amplitude.track('page_viewed', {
      page_name: pageName,
      page_type: pageType,
      page_path: path,
      referrer: document.referrer || 'direct',
    });

    // ── CTA clicks (Adasight links) ──────────────────────────────────────────
    document.querySelectorAll('a[href*="adasight.com"]').forEach(function(el) {
      el.addEventListener('click', function() {
        amplitude.track('cta_clicked', {
          cta_text: el.innerText.trim(),
          cta_destination: el.href,
          source_page: path,
          source_page_type: pageType,
        });
      });
    });

    // ── Tool-specific tracking ───────────────────────────────────────────────
    if (pageType === 'tool') {
      trackTool(path);
    }

    // ── Guide tracking ───────────────────────────────────────────────────────
    if (pageType === 'guide') {
      var slug = path.replace('/guides/', '').replace(/\/$/, '');
      var category = 'unknown';
      if (slug.includes('amplitude') || slug.includes('analytics')) category = 'analytics';
      else if (slug.includes('ab-test') || slug.includes('experimentation') || slug.includes('sample-size')) category = 'experimentation';
      else if (slug.includes('roi')) category = 'roi';

      amplitude.track('guide_viewed', {
        guide_slug: slug,
        guide_category: category,
        guide_title: pageName,
      });
    }
  }

  function trackTool(path) {
    // ── Analytics Maturity Assessment ────────────────────────────────────────
    if (path.includes('analytics-maturity')) {

      // Patch startAssessment
      var _origStart = window.startAssessment;
      window.startAssessment = function() {
        amplitude.track('tool_started', {
          tool_name: 'analytics_maturity_assessment',
        });
        if (_origStart) _origStart();
      };

      // Patch showResults to capture outcome
      var _origResults = window.showResults;
      window.showResults = function() {
        if (_origResults) {
          // Let the original run first, then capture the DOM result
          _origResults();
          var resultEl = document.querySelector('.result-value');
          if (resultEl) {
            var stageText = resultEl.innerText;
            var stageNum = stageText.match(/Stage (\d)/);
            amplitude.track('assessment_completed', {
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
      window.calculate = function() {
        if (_origCalc) _origCalc();
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(function() {
          var baseline = document.getElementById('baseline') ? document.getElementById('baseline').value : null;
          var mde = document.getElementById('mde') ? document.getElementById('mde').value : null;
          var result = document.getElementById('res-per-variant') ? document.getElementById('res-per-variant').innerText : null;
          amplitude.track('calculator_used', {
            tool_name: 'sample_size_calculator',
            baseline_rate: baseline,
            mde: mde,
            result_per_variant: result,
          });
        }, 1200); // debounce — only fire after user stops adjusting
      };
    }

    // ── Experimentation ROI Calculator ────────────────────────────────────────
    if (path.includes('experimentation-roi')) {
      var roiTimeout;
      var _origRoi = window.calculate;
      window.calculate = function() {
        if (_origRoi) _origRoi();
        clearTimeout(roiTimeout);
        roiTimeout = setTimeout(function() {
          var tests = document.getElementById('tests-per-month') ? document.getElementById('tests-per-month').value : null;
          var winRate = document.getElementById('win-rate') ? document.getElementById('win-rate').value : null;
          var result = document.getElementById('res-annual') ? document.getElementById('res-annual').innerText : null;
          amplitude.track('calculator_used', {
            tool_name: 'experimentation_roi_calculator',
            tests_per_month: tests,
            win_rate_pct: winRate,
            result_annual: result,
          });
        }, 1200);
      };
    }
  }

})();
