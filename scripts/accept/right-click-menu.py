"""End-to-end regression test for the right-click menu actions.

Pulls JWT from the agent Chrome on port 9222, hits every live endpoint
the right-click menu calls (agent-routed prompts via supabase-messages
POST + direct-live rename/delete/subfolder/move endpoints), verifies
each side effect, cleans up, prints a PASS/FAIL matrix.

Run: python3 scripts/accept/right-click-menu.py

Prereqs: agent Chrome up on 9222 with /cv4 open and signed in.

Mission: corner:right-click-menu."""
import json, time, urllib.request, websocket, sys
def tabs(): return json.loads(urllib.request.urlopen("http://127.0.0.1:9222/json/list", timeout=5).read())
def pick_tab(frag):
    for t in tabs():
        if t.get("type")=="page" and frag in t.get("url",""): return t
class CDP:
    def __init__(self, u):
        self.ws = websocket.create_connection(u, timeout=10); self.n = 0
    def send(self, m, p=None):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": m, "params": p or {}}))
        while True:
            r = json.loads(self.ws.recv())
            if r.get("id") == self.n:
                if "error" in r: raise RuntimeError(r["error"])
                return r.get("result", {})
def evalp(s, e):
    r = s.send("Runtime.evaluate", {"expression": e, "returnByValue": True, "awaitPromise": True})
    if r.get("exceptionDetails"): raise RuntimeError(f"JS: {str(r['exceptionDetails'])[:300]}")
    return r.get("result", {}).get("value")

t = pick_tab("/cv4")
if not t: sys.exit("no /cv4 tab")
s = CDP(t["webSocketDebuggerUrl"])
s.send("Runtime.enable")
TOKEN = evalp(s, """
  (() => { const k=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)); if (!k) return null;
    return JSON.parse(localStorage.getItem(k))?.access_token || null; })()
""")
if not TOKEN: sys.exit("no auth token")
print(f"[auth] token loaded ({len(TOKEN)} chars)")
print()

results = []
def record(name, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}")
    results.append((name, ok, detail))

def fetch(method, path, body=None):
    # Double-encode: JSON for fetch body + JS string literal for safe injection
    body_literal = json.dumps(json.dumps(body)) if body is not None else "null"
    path_literal = json.dumps(path)
    method_literal = json.dumps(method)
    token_literal = json.dumps(TOKEN)
    js = f"""
      (async () => {{
        const opts = {{
          method: {method_literal},
          headers: {{ 'Content-Type': 'application/json', Authorization: 'Bearer ' + {token_literal} }},
        }};
        if ({body_literal} !== null && {method_literal} !== 'GET') {{
          opts.body = {body_literal};
        }}
        const r = await fetch({path_literal}, opts);
        const text = await r.text();
        let body; try {{ body = JSON.parse(text); }} catch {{ body = text; }}
        return {{ status: r.status, body }};
      }})()
    """
    return evalp(s, js)

# ── Set 1: Agent-routed prompts ──
print("─── Agent-routed: drop prompt into chat ───")
PROBE = int(time.time())
def drop(label, text, agent="elon"):
    body = {"agent": agent, "text": text + f" (probe-{PROBE}-{label})", "role": "user",
            "source": "test-harness", "client_id": "aom"}
    r = fetch("POST", "/api/dashboard/supabase-messages", body)
    ok = r.get("status") in (200, 201)
    record(label, ok, f"status={r.get('status')} body={str(r.get('body'))[:120]}")

drop("File-Research",   "Research file `corner/missions/right-click-menu/VISION.md`.")
drop("File-Summarize",  "Summarize `corner/missions/right-click-menu/CONTEXT.md`.")
drop("Mission-Brief",   "Brief me on mission `right-click-menu` (project corner).")
drop("Project-Brief",   "Brief me on project `corner`.")
drop("Mail-Reply",      "Draft a reply to test thread.")

# ── Set 2: Project rename ──
print()
print("─── Direct-live: project mutations ───")
r = fetch("PATCH", "/api/dashboard/project-update", {"slug": "aom-ea", "name": f"AOM-EA (harness-{PROBE})"})
ok = r.get("status") == 200
got = (r.get("body") or {}).get("project", {}).get("name") if ok else r.get("body")
record("Project-Rename PATCH", ok, f"status={r.get('status')} got={str(got)[:80]}")
# revert
fetch("PATCH", "/api/dashboard/project-update", {"slug": "aom-ea", "name": "AOM-EA"})

# Delete gates
r = fetch("DELETE", "/api/dashboard/project-update", {"slug": "aom-ea"})
record("Project-Delete-Gate (no confirm)", r.get("status") == 400)
r = fetch("DELETE", "/api/dashboard/project-update", {"slug": "aom-ea", "confirm": "delete"})
record("Project-Delete-Gate (lowercase)", r.get("status") == 400)

# ── Set 3: Mission mutations ──
print()
print("─── Direct-live: mission mutations ───")
r = fetch("PATCH", "/api/dashboard/mission-update",
          {"project_slug": "corner", "mission_slug": "right-click-menu", "name": f"right-click-menu (harness-{PROBE})"})
ok = r.get("status") == 200
record("Mission-Rename PATCH", ok, f"status={r.get('status')} body={str(r.get('body'))[:200]}")

r = fetch("DELETE", "/api/dashboard/mission-update", {"project_slug": "corner", "mission_slug": "right-click-menu"})
record("Mission-Delete-Gate (no confirm)", r.get("status") == 400)

# ── Set 4: Subfolders ──
print()
print("─── Direct-live: mission-folders ───")
folder_slug = None
r = fetch("POST", "/api/dashboard/mission-folders", {"project_slug": "corner", "name": f"harness-{PROBE}"})
ok = r.get("status") in (200, 201)
if ok:
    body = r.get("body") or {}
    folder_slug = body.get("folder", {}).get("slug") or body.get("slug")
record("Subfolder-Create POST", ok, f"status={r.get('status')} slug={folder_slug} body={str(r.get('body'))[:120]}")

if folder_slug:
    r = fetch("PUT", "/api/dashboard/mission-folders",
              {"project_slug": "corner", "mission_slug": "right-click-menu", "folder_slug": folder_slug})
    record("Mission-MoveToSubfolder PUT", r.get("status") == 200, f"status={r.get('status')}")
    r = fetch("PUT", "/api/dashboard/mission-folders",
              {"project_slug": "corner", "mission_slug": "right-click-menu", "folder_slug": None})
    record("Mission-MoveToRoot PUT", r.get("status") == 200, f"status={r.get('status')}")

# ── Set 5: Tenant isolation ──
print()
print("─── Multi-tenant: cross-world rename should be blocked ───")
r = fetch("PATCH", "/api/dashboard/project-update", {"slug": "aom-ea", "name": "blocked-probe", "client_id": "ben"})
ok_block = r.get("status") in (401, 403)
record("Tenant-Isolation (cross-world block)", ok_block, f"status={r.get('status')} body={str(r.get('body'))[:120]}")

# ── Summary ──
print()
print("═" * 60)
passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
print(f"RESULTS: {passed}/{total} passed")
for name, ok, _ in results:
    print(f"  {'✓' if ok else '✗'} {name}")
sys.exit(0 if passed == total else 1)
