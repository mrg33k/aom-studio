#!/usr/bin/env python3
"""
Enrich US municipalities (100k-500k pop) with government contact data via Apollo.io.

Two-step flow:
  1. POST /api/v1/mixed_people/api_search — find candidate people at the org
  2. POST /api/v1/people/match — unlock real name + verified email (costs credits)

Checkpoint file at scripts/.enrich-progress.json lets the run resume after interruption.
"""

import json
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "public" / "arsenal-municipality-data.json"
PROGRESS_FILE = Path(__file__).resolve().parent / ".enrich-progress.json"

APOLLO_KEY = os.environ.get("APOLLO_API_KEY", "").strip()
if not APOLLO_KEY:
    print("ERROR: APOLLO_API_KEY env var required", file=sys.stderr)
    sys.exit(1)

SEARCH_URL = "https://api.apollo.io/api/v1/mixed_people/api_search"
MATCH_URL = "https://api.apollo.io/api/v1/people/match"
HEADERS = {
    "Content-Type": "application/json",
    "accept": "application/json",
    "Cache-Control": "no-cache",
    "X-Api-Key": APOLLO_KEY,
}

TITLE_PRIORITY = [
    "city manager", "town manager", "village manager", "borough manager",
    "city administrator", "town administrator", "village administrator", "borough administrator",
    "mayor",
    "city clerk", "town clerk", "village clerk", "borough clerk",
    "community development director", "economic development director",
    "public works director", "finance director",
    "city attorney", "town attorney",
]

TYPE_DISPLAY = {
    "city": "City",
    "town": "Town",
    "village": "Village",
    "borough": "Borough",
    "city and borough": "City and Borough",
    "unified government": "Unified Government",
    "consolidated government": "Consolidated Government",
    "urban county": "Urban County",
    "metropolitan government": "Metropolitan Government",
    "plantation": "Plantation",
    "municipality": "Municipality",
}


def format_org(place):
    name = place["name"]
    for suffix in (" city", " town", " village", " borough", " municipality"):
        if name.lower().endswith(suffix):
            name = name[: -len(suffix)].strip()
            break
    type_display = TYPE_DISPLAY.get(place.get("type", ""), "City")
    return f"{type_display} of {name}"


def load_progress():
    if PROGRESS_FILE.exists():
        try:
            return json.loads(PROGRESS_FILE.read_text())
        except Exception:
            pass
    return {"processed": [], "enriched": 0, "attempted": 0}


def save_progress(progress):
    PROGRESS_FILE.write_text(json.dumps(progress, indent=2))


def search(org_name, state_abbr):
    body = {
        "q_organization_name": org_name,
        "person_titles": TITLE_PRIORITY,
        "organization_locations": [state_abbr],
        "page": 1,
        "per_page": 10,
    }
    try:
        r = requests.post(SEARCH_URL, headers=HEADERS, json=body, timeout=30)
    except Exception as e:
        print(f"    search error: {e}")
        return []
    if r.status_code != 200:
        print(f"    search {r.status_code}: {r.text[:200]}")
        return []
    return r.json().get("people", [])


def match(person_id):
    try:
        r = requests.post(
            MATCH_URL,
            headers=HEADERS,
            json={"id": person_id, "reveal_personal_emails": True},
            timeout=30,
        )
    except Exception as e:
        print(f"    match error: {e}")
        return None
    if r.status_code != 200:
        print(f"    match {r.status_code}: {r.text[:200]}")
        return None
    return r.json().get("person")


def best_candidate(people, org_name_lower):
    # Prefer candidates whose organization matches our target
    # and whose title matches our priority list
    priority_titles = [t.lower() for t in TITLE_PRIORITY]
    scored = []
    for p in people:
        org = (p.get("organization") or {}).get("name", "").lower()
        title = (p.get("title") or "").lower()
        score = 0
        if org and org_name_lower in org:
            score += 10
        for i, pt in enumerate(priority_titles):
            if pt in title:
                score += 100 - i  # earlier = higher
                break
        scored.append((score, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for score, p in scored if score > 0]


def main():
    print("Loading municipality data...")
    data = json.loads(DATA_FILE.read_text())
    places = data["places"]
    print(f"Total municipalities: {len(places):,}")

    targets = [p for p in places if (p.get("population_2020") or 0) and 100000 <= p["population_2020"] <= 500000]
    print(f"Target (100k-500k): {len(targets):,}")

    progress = load_progress()
    todo = [p for p in targets if p["geoid"] not in set(progress["processed"])]
    print(f"To process: {len(todo):,} ({len(progress['processed'])} already processed)")

    if not todo:
        print("All targets already processed.")
        return

    start = time.time()
    by_geoid = {p["geoid"]: p for p in places}

    for i, place in enumerate(todo, 1):
        geoid = place["geoid"]
        name = place["name"]
        state = place["state_abbr"]
        pop = place.get("population_2020", 0)
        org_name = format_org(place)
        print(f"[{i}/{len(todo)}] {name}, {state} ({pop:,}) — searching '{org_name}'")

        candidates = search(org_name, state)
        ranked = best_candidate(candidates, org_name.lower())

        picked = None
        if ranked:
            top = ranked[0]
            person = match(top["id"])
            if person and person.get("email"):
                picked = person

        target = by_geoid[geoid]
        if picked:
            full_name = f"{picked.get('first_name','')} {picked.get('last_name','')}".strip()
            target["contact_name"] = full_name
            target["contact_title"] = picked.get("title") or ""
            target["contact_email"] = picked.get("email") or ""
            target["contact_phone"] = (
                picked.get("phone_numbers", [{}])[0].get("sanitized_number", "")
                if picked.get("phone_numbers")
                else ""
            )
            target["contact_source"] = "apollo"
            target["contact_enriched_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            progress["enriched"] += 1
            print(f"    ✓ {full_name} — {target['contact_email']}")
        else:
            target["contact_enriched_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            target["contact_source"] = "apollo_attempted"
            print(f"    ✗ no verified email found")

        progress["processed"].append(geoid)
        progress["attempted"] += 1
        save_progress(progress)

        # Persist JSON every 10 items so a crash doesn't lose everything
        if i % 10 == 0:
            DATA_FILE.write_text(json.dumps(data, indent=2))

        # Gentle pacing
        time.sleep(0.5)

    # Final write
    if "metadata" not in data:
        data["metadata"] = {}
    data["metadata"]["enrichment"] = {
        "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target_population_band": "100k-500k",
        "target_count": len(targets),
        "processed_count": progress["attempted"],
        "enriched_count": progress["enriched"],
        "source": "Apollo.io api_search + people/match",
    }
    DATA_FILE.write_text(json.dumps(data, indent=2))

    elapsed = time.time() - start
    print()
    print(f"Complete in {elapsed/60:.1f} min")
    print(f"  Attempted: {progress['attempted']}")
    print(f"  Enriched:  {progress['enriched']}")
    print(f"  Hit rate:  {progress['enriched']/progress['attempted']*100:.1f}%")


if __name__ == "__main__":
    main()
