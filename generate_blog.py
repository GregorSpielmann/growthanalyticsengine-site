#!/usr/bin/env python3
"""
growthanalyticsengine.com — Blog page generator
Run: python3 generate_blog.py

Reads data/blog.json and generates a static HTML page for each blog post.
Agent instructions: to add a new post, add an entry to data/blog.json and re-run this script.

Blog post JSON schema:
{
  "slug": "url-slug",
  "title": "Full display title",
  "seo_title": "SEO-optimized title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "tag": "Category label",
  "author": "Author Name, Company",
  "date": "Month YYYY",
  "intro": "Opening paragraph (1-2 sentences)",
  "sections": [{"h2": "Section heading", "body": "Section body text"}],
  "faqs": [{"q": "Question", "a": "Answer"}],
  "related_guide": "guide-slug (optional)",
  "related_tool": {"name": "Tool name", "url": "/tools/tool-slug/"} (optional)
}
"""

import json
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "blog.json"
BLOG_DIR = BASE_DIR / "blog"

LOGO_SVG = """<svg class="nav-logo-mark" width="30" height="22" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="3.5" cy="18.5" r="3.5" fill="#2F7A62"/>
          <circle cx="15" cy="11" r="3.5" fill="#2F7A62" opacity="0.75"/>
          <circle cx="26.5" cy="3.5" r="3.5" fill="#2F7A62" opacity="0.5"/>
          <line x1="3.5" y1="18.5" x2="15" y2="11" stroke="#2F7A62" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="15" y1="11" x2="26.5" y2="3.5" stroke="#2F7A62" stroke-width="2.5" stroke-linecap="round"/>
        </svg>"""

NAV = f"""  <nav class="site-nav">
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        {LOGO_SVG}
        <span class="nav-logo-text">Growth Analytics <em>Engine</em></span>
      </a>
      <ul class="nav-links">
        <li><a href="/tools/">Free Tools</a></li>
        <li><a href="/guides/">Guides</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="https://adasight.com" target="_blank" rel="noopener">Adasight ↗</a></li>
      </ul>
      <a href="/tools/analytics-maturity/" class="btn nav-cta">Free Assessment →</a>
    </div>
  </nav>"""

FOOTER = """  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand-col">
        <a href="/" class="footer-logo">Growth Analytics <span>Engine</span></a>
        <p>A free resource by <a href="https://adasight.com" target="_blank" rel="noopener">Adasight</a> — built by <a href="https://www.linkedin.com/in/gregor-spielmann/" target="_blank" rel="noopener">Gregor Spielmann</a>, growth analytics and experimentation specialist.</p>
      </div>
      <div class="footer-col">
        <h4>Tools</h4>
        <ul>
          <li><a href="/tools/analytics-maturity/">Maturity Assessment</a></li>
          <li><a href="/tools/sample-size-calculator/">Sample Size Calculator</a></li>
          <li><a href="/tools/experimentation-roi/">ROI Calculator</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Content</h4>
        <ul>
          <li><a href="/guides/">All Guides</a></li>
          <li><a href="/blog/">Blog</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Adasight</h4>
        <ul>
          <li><a href="https://adasight.com" target="_blank" rel="noopener">adasight.com</a></li>
          <li><a href="https://www.linkedin.com/in/gregor-spielmann/" target="_blank" rel="noopener">LinkedIn</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2026 Growth Analytics Engine · A free resource by Adasight</p>
    </div>
  </footer>"""


def build_article_schema(post):
    schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["meta_description"],
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
        "datePublished": post.get("date", "2026"),
        "url": f"https://growthanalyticsengine.com/blog/{post['slug']}/"
    }
    return f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>'


def build_faq_schema(faqs):
    if not faqs:
        return ""
    items = [{"@type": "Question", "name": faq["q"], "acceptedAnswer": {"@type": "Answer", "text": faq["a"]}} for faq in faqs]
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items}
    return f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>'


def generate_post_page(post, all_posts, all_guides):
    # Sections
    sections_html = ""
    for section in post.get("sections", []):
        sections_html += f"""
      <h2>{section['h2']}</h2>
      <p>{section['body']}</p>"""

    # Tool CTA
    tool_cta_html = ""
    if post.get("related_tool"):
        tool = post["related_tool"]
        tool_cta_html = f"""
      <div class="guide-tool-cta">
        <p>🧮 <strong>Free tool:</strong> {tool['name']} — no signup required</p>
        <a href="{tool['url']}" class="btn btn-accent">Open tool →</a>
      </div>"""

    # FAQ section
    faqs_html = ""
    if post.get("faqs"):
        items = ""
        for faq in post["faqs"]:
            items += f"""
        <div class="faq-item">
          <h4>{faq['q']}</h4>
          <p>{faq['a']}</p>
        </div>"""
        faqs_html = f"""
      <div class="faq-block">
        <h2>Frequently asked questions</h2>
        {items}
      </div>"""

    # Related posts (up to 2 other posts)
    related_posts = [p for p in all_posts if p["slug"] != post["slug"]][:2]
    related_html = ""
    if related_posts:
        cards = ""
        for r in related_posts:
            cards += f"""
          <a href="/blog/{r['slug']}/" class="card-link">
            <div class="card">
              <span class="tag">{r['tag']}</span>
              <h3>{r['title']}</h3>
              <p>{r['intro'][:120]}...</p>
              <span class="card-cta">Read post →</span>
            </div>
          </a>"""
        related_html = f"""
    <div class="related-section">
      <h2>More from the blog</h2>
      <div class="card-grid card-grid-2">
        {cards}
      </div>
    </div>"""

    # Schema
    schema = build_article_schema(post)
    if post.get("faqs"):
        schema += "\n" + build_faq_schema(post["faqs"])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{post['seo_title']} — Growth Analytics Engine</title>
  <meta name="description" content="{post['meta_description']}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css">
  <script src="/assets/js/analytics.js" defer></script>
  {schema}
</head>
<body>
{NAV}

  <main class="guide-page">
    <div class="guide-meta">
      <span class="tag">{post['tag']}</span>
      <span class="author">By {post['author']}</span>
      <time>{post['date']}</time>
    </div>

    <h1>{post['title']}</h1>

    <p class="guide-intro">{post['intro']}</p>

    <div class="guide-content">
{tool_cta_html}
{sections_html}
    </div>

    <div class="cta-block">
      <h3>Need expert help with growth analytics?</h3>
      <p>Adasight works with scaling D2C and SaaS companies to build the analytics foundations and experimentation programs that drive measurable growth.</p>
      <a href="https://adasight.com" target="_blank" rel="noopener">Talk to Adasight →</a>
    </div>

{faqs_html}
{related_html}
  </main>

{FOOTER}

</body>
</html>"""
    return html


def generate_blog_index(posts):
    if not posts:
        return ""

    # Featured post — always the first entry
    featured = posts[0]
    rest = posts[1:]

    # Collect unique tags for filter buttons
    all_tags = []
    for post in posts:
        if post['tag'] not in all_tags:
            all_tags.append(post['tag'])

    filter_buttons = '<button class="blog-filter-btn active" data-filter="all">All</button>\n'
    for tag in all_tags:
        filter_buttons += f'      <button class="blog-filter-btn" data-filter="{tag}">{tag}</button>\n'

    featured_tag_slug = featured['tag'].lower().replace(' ', '-')
    featured_html = f"""
  <section class="blog-featured" data-category="{featured['tag']}">
    <div class="container">
      <a href="/blog/{featured['slug']}/" class="blog-featured-link">
        <div class="blog-featured-inner">
          <div class="blog-featured-meta">
            <span class="tag">{featured['tag']}</span>
            <time>{featured['date']}</time>
          </div>
          <h2 class="blog-featured-title">{featured['title']}</h2>
          <p class="blog-featured-excerpt">{featured['intro']}</p>
          <span class="blog-featured-cta">Read post →</span>
        </div>
      </a>
    </div>
  </section>"""

    # All posts as filterable 2-col grid (including featured so filter works across all)
    all_cards = ""
    for post in posts:
        excerpt = post['intro']
        if len(excerpt) > 160:
            excerpt = excerpt[:160].rsplit(' ', 1)[0] + '…'
        all_cards += f"""
        <a href="/blog/{post['slug']}/" class="blog-card-link" data-category="{post['tag']}">
          <article class="blog-card">
            <div class="blog-card-meta">
              <span class="tag">{post['tag']}</span>
              <time>{post['date']}</time>
            </div>
            <h3 class="blog-card-title">{post['title']}</h3>
            <p class="blog-card-excerpt">{excerpt}</p>
            <span class="blog-card-cta">Read post →</span>
          </article>
        </a>"""

    filter_js = """
  <script>
    (function() {
      var btns = document.querySelectorAll('.blog-filter-btn');
      var cards = document.querySelectorAll('.blog-card-link');
      var noResults = document.getElementById('blog-no-results');

      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var filter = this.getAttribute('data-filter');

          // Update active button
          btns.forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');

          // Filter cards
          var visible = 0;
          cards.forEach(function(card) {
            if (filter === 'all' || card.getAttribute('data-category') === filter) {
              card.style.display = '';
              visible++;
            } else {
              card.style.display = 'none';
            }
          });

          if (noResults) {
            noResults.style.display = visible === 0 ? 'block' : 'none';
          }
        });
      });
    })();
  </script>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog — Growth Analytics Engine</title>
  <meta name="description" content="Practical articles on growth analytics, A/B testing, product analytics tools, and building data-driven growth teams. From the team at Adasight.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css">
  <script src="/assets/js/analytics.js" defer></script>
</head>
<body>
{NAV}

  <div class="blog-header">
    <div class="container">
      <p class="blog-header-label">From the team at Adasight</p>
      <h1 class="blog-header-title">Blog</h1>
      <p class="blog-header-sub">Practical writing on growth analytics, experimentation, and data-driven growth teams.</p>
    </div>
  </div>

  <section class="blog-list-section">
    <div class="container">
      <div class="blog-filters">
      {filter_buttons}
      </div>
      <div class="blog-list" id="blog-list">
{all_cards}
      </div>
      <p id="blog-no-results" style="display:none; color: var(--text-muted); padding: 2rem 0;">No posts in this category yet.</p>
    </div>
  </section>

{FOOTER}
{filter_js}
</body>
</html>"""
    return html


def load_guides():
    guides_file = BASE_DIR / "data" / "guides.json"
    if guides_file.exists():
        with open(guides_file) as f:
            return json.load(f).get("guides", [])
    return []


def main():
    print(f"Reading blog posts from {DATA_FILE}")
    with open(DATA_FILE) as f:
        data = json.load(f)

    posts = data["posts"]
    guides = load_guides()
    print(f"Found {len(posts)} posts to generate")

    BLOG_DIR.mkdir(parents=True, exist_ok=True)

    for post in posts:
        slug = post["slug"]
        out_dir = BLOG_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "index.html"

        html = generate_post_page(post, posts, guides)
        with open(out_file, "w") as f:
            f.write(html)
        print(f"  ✓ Generated: /blog/{slug}/")

    # Generate index
    index_html = generate_blog_index(posts)
    with open(BLOG_DIR / "index.html", "w") as f:
        f.write(index_html)
    print(f"  ✓ Generated: /blog/ (index)")

    print(f"\nDone. {len(posts)} blog posts + 1 index page generated.")
    print(f"Agent: add entries to data/blog.json and re-run to publish new posts.")


if __name__ == "__main__":
    main()
