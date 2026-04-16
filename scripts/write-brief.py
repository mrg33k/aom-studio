#!/usr/bin/env python3
"""
write-brief.py — canonical brief writer for all research-* skills.

Usage:
  python scripts/write-brief.py \
    --title "Notion Competitors Deep Dive" \
    --topic "notion-competitors" \
    --skill "research-competitor" \
    [--project corner] \
    [--sources "https://example.com,https://other.com"] \
    [--slug custom-slug] \
    [--summary "One-line summary for INDEX.json"] \
    [--content "Markdown body text"] \
    [--content-file path/to/body.md]

Auto-publish: after writing docs/briefs/<slug>.md, also creates
src/data/briefs/<slug>.json and updates src/data/briefs-index.json
so the brief is immediately live on aheadofmarket.com/briefs/<slug>.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
BRIEFS_DIR = REPO_ROOT / "docs" / "briefs"
INDEX_PATH = BRIEFS_DIR / "INDEX.json"

# Maps (project, skill) to the category shown on aheadofmarket.com/briefs
CATEGORY_ORDER = [
    "Strategy", "Sales Assets", "Design Specs", "Audits",
    "Client Reports", "Outreach", "Technical", "Content", "Council",
]

def _infer_category(project: str, skill: str) -> str:
    skill_l = skill.lower()
    if "competitor" in skill_l or "market" in skill_l:
        return "Strategy"
    if "person" in skill_l or "outreach" in skill_l:
        return "Outreach"
    if "podcast" in skill_l or "youtube" in skill_l:
        return "Research"
    project_l = project.lower()
    if "ambition" in project_l:
        return "Content"
    return "Strategy"


def _md_to_html(markdown_text: str) -> str:
    js = (
        "const {marked} = require('marked');"
        "const input = require('fs').readFileSync('/dev/stdin','utf-8');"
        "process.stdout.write(marked.parse(input));"
    )
    try:
        result = subprocess.run(
            ["node", "-e", js],
            input=markdown_text,
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(REPO_ROOT),
        )
        if result.returncode == 0:
            return result.stdout
    except Exception:
        pass
    # Fallback: return raw markdown wrapped in <pre> if node fails
    return f"<pre>{markdown_text}</pre>"


def _format_date(date_str: str) -> str:
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    try:
        parts = date_str.split("-")
        m = months[int(parts[1]) - 1]
        d = int(parts[2])
        return f"{m} {d}"
    except Exception:
        return date_str


def _publish_web(slug: str, title: str, category: str, agent: str,
                 date_str: str, summary: str, content_md: str) -> None:
    """Write src/data/briefs/<slug>.json and update src/data/briefs-index.json."""
    html = _md_to_html(content_md)
    date_fmt = _format_date(date_str)

    brief_data = {
        "title": title,
        "slug": slug,
        "category": category,
        "agent": agent,
        "date": date_str,
        "dateFormatted": date_fmt,
        "updated": None,
        "summary": summary,
        "tags": [],
        "content": html,
    }

    web_briefs_dir = REPO_ROOT / "src" / "data" / "briefs"
    web_briefs_dir.mkdir(parents=True, exist_ok=True)
    brief_path = web_briefs_dir / f"{slug}.json"
    brief_path.write_text(json.dumps(brief_data, indent=2))
    print(f"[write-brief] Published JSON: {brief_path.relative_to(REPO_ROOT)}")

    index_path = REPO_ROOT / "src" / "data" / "briefs-index.json"
    if index_path.exists():
        try:
            idx = json.loads(index_path.read_text())
        except json.JSONDecodeError:
            idx = {"generated": "", "categories": []}
    else:
        idx = {"generated": "", "categories": []}

    cat_entry = next((c for c in idx.get("categories", []) if c["name"] == category), None)
    if cat_entry is None:
        cat_entry = {"name": category, "items": []}
        idx.setdefault("categories", []).append(cat_entry)

    cat_entry["items"] = [i for i in cat_entry["items"] if i.get("slug") != slug]
    cat_entry["items"].insert(0, {
        "title": title,
        "slug": slug,
        "agent": agent,
        "date": date_str,
        "dateFormatted": date_fmt,
        "summary": summary,
        "path": f"/briefs/{slug}",
        "hasPage": True,
    })

    from datetime import datetime
    idx["generated"] = datetime.utcnow().isoformat() + "Z"
    index_path.write_text(json.dumps(idx, indent=2))
    print(f"[write-brief] briefs-index.json updated: {category} -> {slug}")


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def main():
    parser = argparse.ArgumentParser(description="Write a research brief with consistent frontmatter and update INDEX.json")
    parser.add_argument("--title", required=True, help="Human-readable title")
    parser.add_argument("--topic", required=True, help="Canonical topic tag (kebab-case)")
    parser.add_argument("--skill", required=True, help="Name of the skill that wrote this brief")
    parser.add_argument("--project", default="unassigned", help="Project slug (default: unassigned)")
    parser.add_argument("--sources", default="", help="Comma-separated list of source URLs or citations")
    parser.add_argument("--slug", default="", help="Custom slug (default: slugified title)")
    parser.add_argument("--summary", default="", help="One-line summary for INDEX.json entry")
    parser.add_argument("--content", default="", help="Markdown body content (inline)")
    parser.add_argument("--content-file", default="", help="Path to file containing markdown body")
    args = parser.parse_args()

    slug = args.slug.strip() if args.slug.strip() else slugify(args.title)
    today = date.today().isoformat()
    sources = [s.strip() for s in args.sources.split(",") if s.strip()] if args.sources else []

    content = args.content
    if args.content_file:
        content_path = Path(args.content_file)
        if not content_path.exists():
            print(f"ERROR: content-file not found: {args.content_file}", file=sys.stderr)
            return 1
        content = content_path.read_text()

    # Build YAML sources block
    if sources:
        sources_lines = "\n".join(f"  - {s}" for s in sources)
        sources_block = f"sources:\n{sources_lines}"
    else:
        sources_block = "sources: []"

    frontmatter = (
        "---\n"
        f"title: {args.title}\n"
        f"topic: {args.topic}\n"
        f"skill: {args.skill}\n"
        f"date: {today}\n"
        f"project: {args.project}\n"
        f"{sources_block}\n"
        "---"
    )

    brief_text = f"{frontmatter}\n\n{content.strip()}\n" if content.strip() else f"{frontmatter}\n"

    BRIEFS_DIR.mkdir(parents=True, exist_ok=True)
    brief_path = BRIEFS_DIR / f"{slug}.md"
    brief_path.write_text(brief_text)
    print(f"[write-brief] Written: {brief_path.relative_to(REPO_ROOT)}")

    # Update INDEX.json
    index = {}
    if INDEX_PATH.exists():
        try:
            index = json.loads(INDEX_PATH.read_text())
        except json.JSONDecodeError:
            index = {}

    project_key = args.project
    if project_key not in index:
        index[project_key] = []

    # Replace existing entry with same slug
    index[project_key] = [e for e in index[project_key] if e.get("slug") != slug]

    month_day = date.today().strftime("%b %-d")
    index[project_key].append({
        "title": args.title,
        "path": f"/briefs/{slug}",
        "slug": slug,
        "type": "brief",
        "updated_at": today,
        "agent": args.skill,
        "dateFormatted": month_day,
        "summary": args.summary or args.title,
    })

    INDEX_PATH.write_text(json.dumps(index, indent=2) + "\n")
    print(f"[write-brief] INDEX.json updated: {project_key} -> {slug}")

    # Auto-publish to aheadofmarket.com/briefs/<slug>
    category = _infer_category(args.project, args.skill)
    _publish_web(
        slug=slug,
        title=args.title,
        category=category,
        agent=args.skill,
        date_str=today,
        summary=args.summary or args.title,
        content_md=content,
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
