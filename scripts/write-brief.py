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
"""
import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
BRIEFS_DIR = REPO_ROOT / "docs" / "briefs"
INDEX_PATH = BRIEFS_DIR / "INDEX.json"


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

    return 0


if __name__ == "__main__":
    sys.exit(main())
