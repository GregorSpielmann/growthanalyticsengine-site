#!/usr/bin/env python3
"""
growthanalyticsengine.com — Programmatic SEO page generator
Run: python3 generate_pages.py

Reads data/guides.json and generates a static HTML page for each guide entry.
Agent instructions: to add a new guide, add an entry to data/guides.json and re-run this script.
"""

import json
import os
from pathlib import Path
from datetime import datetime

# Paths
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "guides.json"
GUIDES_DIR = BASE_DIR / "guides"

NAV = """
  <nav class="site-nav">
    <div class="nav-inner">
      <a href="/" class="nav-logo">Growth Analytics <span>Engine</span></a>
      <ul class="nav-links">
        <li><a href="/tools/">Free Tools</a></li>
        <li><a href="/guides/">Guides</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="https://adasight.com" target="_blank" rel="noopener">Adasight ↗</a></li>
      </ul>
      <a href="/tools/analytics-maturity/" class="btn nav-cta">Free Assessment →</a>
    </div>
  </nav>"""

FOOTER = """
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <div class="footer-brand">Growth Analytics <span>Engine</span></div>
        <div class="footer-note" style="margin-top:4px;">A free resource by <a href="https://adasight.com" target="_blank">Adasight</a></div>
      </div>
      <div style="display:flex; gap:24px; flex-wrap:wrap;">
        <a href="/tools/" style="font-size:0.85rem; color:var(--color-muted);">Tools</a>
        <a href="/guides/" style="font-size:0.85rem; color:var(--color-muted);">All Guides</a>
        <a href="https://adasight.com" style="font-size:0.85rem; color:var(--color-muted);" target="_blank">Adasight.com ↗</a>
      </div>
    </div>
  </footer>"""

HEAD_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{seo_title} — Growth Analytics Engine</title>
  <meta name="description" content="{meta_description}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css">
  {schema}
</head>"""


def build_faq_schema(faqs):
    items = []
    for faq in faqs:
        items.append({
            "@type": "Question",
            "name": faq["q"],
            "acceptedAnswer": {"@type": "Answer", "text": faq["a"]}
        })
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": items
    }
    return f'<script type="application/ld+json">\n  {json.dumps(schema, indent=2)}\n  </script>'


def build_article_schema(guide):
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": guide["title"],
        "description": guide["meta_description"],
        "author": {
            "@type": "Person",
            "name": "Gregor Spielmann",
            "url": "https://adasight.com"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Adasight",
            "url": "https://adasight.com"
        },
        "datePublished": guide.get("date", "2026"),
        "url": f"https://growthanalyticsengine.com/guides/{guide['slug']}/"
    }
    return f'<script type="application/ld+json">\n  {json.dumps(schema, indent=2)}\n  </script>'


def generate_guide_page(guide, all_guides):
    # Build related guides (exclude self, pick up to 2)
    related = [g for g in all_guides if g["slug"] != guide["slug"]][:2]

    # Sections
    sections_html = ""
    for section in guide.get("sections", []):
        sections_html += f"""
      <h2>{section['h2']}</h2>
      <p>{section['body']}</p>"""

    # Checklist
    checklist_html = ""
    if guide.get("checklist"):
        items = "\n".join([f"          <li>{item}</li>" for item in guide["checklist"]])
        checklist_html = f"""
      <h2>{guide.get('checklist_title', 'Checklist')}</h2>
      <ul class="checklist" style="margin:0 0 1rem 0.5rem;">
{items}
      </ul>"""

    # Tool CTA
    tool_cta_html = ""
    if guide.get("related_tool"):
        tool = guide["related_tool"]
        tool_cta_html = f"""
      <div class="guide-tool-cta">
        <p>🧮 <strong>Use the free tool:</strong> {tool['name']} — no signup required</p>
        <a href="{tool['url']}" class="btn btn-accent" style="white-space:nowrap;">Open tool →</a>
      </div>"""

    # FAQ section
    faqs_html = ""
    if guide.get("faqs"):
        items = ""
        for faq in guide["faqs"]:
            items += f"""
        <div class="faq-item">
          <h4>{faq['q']}</h4>
          <p>{faq['a']}</p>
        </div>"""
        faqs_html = f"""
      <div class="faq-block" style="margin-top:48px; padding-top:48px; border-top:1px solid var(--color-border);">
        <h2>Frequently asked questions</h2>
        {items}
      </div>"""

    # Related guides
    related_html = ""
    if related:
        cards = ""
        for r in related:
            cards += f"""
          <a href="/guides/{r['slug']}/" style="text-decoration:none; color:inherit;">
            <div class="card">
              <span class="tag">{r['tag']}</span>
              <h3 style="font-size:1rem; margin-top:8px;">{r['title']}</h3>
              <p style="font-size:0.85rem;">{r['intro'][:120]}...</p>
              <span style="font-size:0.85rem; color:var(--color-accent); font-weight:600;">Read guide →</span>
            </div>
          </a>"""
        related_html = f"""
    <div style="margin-top:64px; padding-top:48px; border-top:1px solid var(--color-border);">
      <h2 style="margin-bottom:24px;">Related guides</h2>
      <div class="card-grid card-grid-2">
        {cards}
      </div>
    </div>"""

    # Schema
    schema = build_faq_schema(guide.get("faqs", [])) + "\n  " + build_article_schema(guide)
    head = HEAD_TEMPLATE.format(
        seo_title=guide["seo_title"],
        meta_description=guide["meta_description"],
        schema=schema
    )

    html = f"""{head}
<body>
{NAV}

  <main class="guide-page">
    <div class="guide-meta">
      <span class="tag">{guide['tag']}</span>
      <span class="author">By {guide['author']}</span>
      <time>{guide['date']}</time>
    </div>

    <h1>{guide['title']}</h1>

    <p style="font-size:1.05rem; color:var(--color-muted); margin:20px 0 36px; line-height:1.7;">{guide['intro']}</p>

    <div class="guide-content">
{tool_cta_html}
{sections_html}
{checklist_html}
    </div>

    <div class="cta-block">
      <h3>Need expert help applying this?</h3>
      <p>Adasight works with scaling D2C and SaaS companies to build the analytics foundations and experimentation programs that make this work in practice.</p>
      <a href="https://adasight.com" target="_blank" rel="noopener">Talk to Adasight →</a>
    </div>
{faqs_html}
{related_html}
  </main>

{FOOTER}

</body>
</html>"""

    return html


def generate_guides_index(guides):
    cards = ""
    for guide in guides:
        cards += f"""
        <a href="/guides/{guide['slug']}/" style="text-decoration:none; color:inherit;">
          <div class="card">
            <span class="tag">{guide['tag']}</span>
            <h3 style="font-size:1.05rem; margin-top:8px;">{guide['title']}</h3>
            <p style="font-size:0.875rem;">{guide['intro'][:130]}...</p>
            <span style="font-size:0.85rem; color:var(--color-accent); font-weight:600;">Read guide →</span>
          </div>
        </a>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guides — Analytics, Experimentation & Growth — Growth Analytics Engine</title>
  <meta name="description" content="In-depth guides on analytics maturity, A/B testing, experimentation ROI, and growth analytics tools. Free, no signup required.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
{NAV}

  <section style="background:var(--color-surface); border-bottom:1px solid var(--color-border); padding:56px 24px 48px; text-align:center;">
    <div class="container">
      <span class="section-label">Free · No signup</span>
      <h1 style="margin-bottom:12px;">Guides</h1>
      <p style="color:var(--color-muted); max-width:520px; margin:0 auto; font-size:1.05rem;">In-depth resources on analytics maturity, A/B testing, experimentation ROI, and growth analytics tools.</p>
    </div>
  </section>

  <section class="section">
    <div class="container-wide">
      <div class="card-grid card-grid-2">
{cards}
      </div>
    </div>
  </section>

{FOOTER}
</body>
</html>"""
    return html


def main():
    print(f"Reading guides from {DATA_FILE}")
    with open(DATA_FILE) as f:
        data = json.load(f)

    guides = data["guides"]
    print(f"Found {len(guides)} guides to generate")

    # Generate individual guide pages
    for guide in guides:
        slug = guide["slug"]
        out_dir = GUIDES_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "index.html"

        html = generate_guide_page(guide, guides)
        with open(out_file, "w") as f:
            f.write(html)
        print(f"  ✓ Generated: /guides/{slug}/")

    # Generate guides index
    index_html = generate_guides_index(guides)
    index_file = GUIDES_DIR / "index.html"
    with open(index_file, "w") as f:
        f.write(index_html)
    print(f"  ✓ Generated: /guides/ (index)")

    print(f"\nDone. {len(guides)} guide pages + 1 index page generated.")
    print(f"Add new entries to data/guides.json and re-run to add more pages.")


if __name__ == "__main__":
    main()
