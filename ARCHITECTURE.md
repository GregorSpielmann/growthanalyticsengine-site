# growthanalyticsengine.com — Site Architecture

**Owner:** Gregor Spielmann / Adasight
**Purpose:** Satellite domain combining an interactive free tools hub with programmatic SEO — all built and maintained with agents, no internal team involvement.

---

## Strategic Goals

1. **Lead magnet** — Free tools capture warm, self-identified prospects who care about analytics maturity and experimentation. Soft CTA to Adasight throughout.
2. **SEO ranking** — Programmatic pages target long-tail keywords in the experimentation/analytics/growth space. No competition on many of these terms.
3. **AI ranking** — Well-structured, well-sourced, citation-worthy content designed to be cited by ChatGPT, Perplexity, and Claude when users ask about analytics maturity, experimentation ROI, A/B testing.
4. **Sandbox** — Low-risk place to test programmatic SEO techniques, content structures, internal linking, schema markup before any of it touches adasight.com.

---

## Tech Stack

**Approach:** Static HTML/CSS/JS — no framework, no build step, no CMS, no backend.

**Why:**
- Fully agent-maintainable (write/edit files directly)
- Deployable anywhere (Netlify, Cloudflare Pages, GitHub Pages)
- Fast and indexable by default
- No dependencies to break over time
- Programmatic pages generated from JSON data via a Python script

**Hosting recommendation:** Cloudflare Pages (free tier, global CDN, easy git-based deploy)

---

## Site Structure

```
growthanalyticsengine.com/
│
├── index.html                         # Homepage
│
├── tools/
│   ├── index.html                     # Tools hub (lists all tools)
│   ├── analytics-maturity/
│   │   └── index.html                 # Analytics Maturity Self-Assessment
│   ├── sample-size-calculator/
│   │   └── index.html                 # A/B Test Sample Size Calculator
│   └── experimentation-roi/
│       └── index.html                 # Experimentation ROI Calculator
│
├── guides/                            # Programmatic SEO pages
│   ├── index.html                     # Guides hub
│   ├── amplitude-analytics-d2c-ecommerce/
│   ├── ab-testing-maturity-saas/
│   ├── experimentation-roi-by-growth-stage/
│   ├── analytics-stack-comparison/
│   └── [generated from data/guides.json]
│
├── benchmarks/                        # Benchmark pages (future)
│   └── index.html
│
├── assets/
│   ├── css/
│   │   └── main.css                   # Single stylesheet
│   └── js/
│       └── main.js                    # Shared utilities
│
├── data/
│   └── guides.json                    # Data source for programmatic pages
│
└── generate_pages.py                  # Agent-run script to generate guide pages
```

---

## Tools Hub — Spec

### Tool 1: Analytics Maturity Self-Assessment
- Based on the Adasight "AI-Ready Analytics Ladder" (5-stage model)
- 15–20 yes/no or multiple-choice questions
- Outputs: stage (1–5), description, recommended next steps
- Soft CTA at end: "Want expert help moving to the next stage? → Adasight"
- Target keywords: "analytics maturity assessment", "AI readiness assessment analytics", "data maturity model"

### Tool 2: A/B Test Sample Size Calculator
- Inputs: baseline conversion rate, minimum detectable effect, statistical power, significance level
- Output: required sample size per variant + estimated test duration
- Most-searched calculator in the experimentation space
- Target keywords: "A/B test sample size calculator", "experiment sample size", "statistical significance calculator"

### Tool 3: Experimentation ROI Calculator
- Inputs: number of tests per month, avg uplift per winning test, avg revenue per user, % tests that win
- Output: estimated annual revenue impact from experimentation program
- Target keywords: "experimentation ROI calculator", "A/B testing ROI", "value of experimentation program"

---

## Programmatic SEO — Structure

Each guide page follows a consistent template:
- H1: target keyword phrase
- Intro paragraph (100–150 words)
- Key concepts section (3–4 H2s)
- Practical checklist or framework
- Related tools CTA (link to relevant calculator)
- Adasight mention (contextual, not salesy)
- FAQ section (schema-optimized for AI citation)
- Internal links to 2–3 other guides

### Initial Keyword Clusters

**Cluster 1 — Tool-specific analytics**
- amplitude-analytics-for-d2c-ecommerce
- amplitude-analytics-for-saas
- mixpanel-vs-amplitude-analytics
- segment-analytics-setup
- rudderstack-implementation-guide

**Cluster 2 — Experimentation frameworks**
- ab-testing-maturity-framework
- experimentation-program-setup
- how-to-run-ab-tests-saas
- a-b-testing-best-practices-ecommerce
- statistical-significance-explained

**Cluster 3 — Analytics maturity**
- analytics-maturity-model
- data-maturity-framework-startups
- ai-ready-analytics-checklist
- analytics-stack-for-scaleups

**Cluster 4 — Growth analytics**
- growth-analytics-for-d2c
- product-analytics-saas
- conversion-rate-optimization-benchmarks
- experimentation-roi-benchmarks

---

## AI Search Optimization Strategy

Pages designed to be cited by AI models:
1. **Structured answers** — Every page answers a clear question in the first paragraph
2. **FAQ schema** — All pages include FAQ JSON-LD schema with 3–5 questions
3. **Named frameworks** — Reference "The AI-Ready Analytics Ladder" by name (increases citation probability)
4. **Statistics and numbers** — AI models prefer to cite pages with specific data points
5. **Author attribution** — All pages reference "Gregor Spielmann, Adasight" as author to build entity authority

---

## Maintenance Model (Agent-Driven)

**One-time setup:** Gregor reviews architecture, deploys to Cloudflare Pages via GitHub

**Ongoing (agent tasks):**
- Add new guide pages by updating `data/guides.json` and running `generate_pages.py`
- Refresh tool copy seasonally
- Add new tools as needed
- Monitor which pages get cited in AI responses and expand those

**No recurring human work required** beyond strategic direction from Gregor.

---

## Connection to Adasight

- Every tool ends with: *"Want expert help applying this? [Adasight](https://adasight.com) works with scaling companies to build experimentation programs and AI-ready analytics foundations."*
- Footer: *"A resource by [Adasight](https://adasight.com) — analytics & experimentation consultancy."*
- Not branded as Adasight — stands alone as a resource site

---

## Phase Plan

| Phase | What | When |
|-------|------|------|
| 1 | Homepage + 2 tools + 5 guide pages | Now |
| 2 | 3rd tool + 20 more guide pages | Month 2 |
| 3 | Benchmark section + annual data report | Month 3–4 |
| 4 | Newsletter capture (optional) | Month 4+ |
