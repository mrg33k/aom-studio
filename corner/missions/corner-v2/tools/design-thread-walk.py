#!/usr/bin/env python3
"""R51 proof walk (scratch, NOT committed): labelled sends on the e2e design
thread ONLY, then poll for the turn's agent blocks + bridge runs + session tabs.

Usage: python3 /tmp/r51-walk.py "labelled text"
Prints the new agent blocks (slugs, kinds, texts), new runs (brains), and the
Visual Window session tabs after the turn.
Exits 0 when a full turn (run done + >=1 agent text) lands, 1 on timeout.
Zero sends anywhere except DESIGN_THREAD.
"""
import json
import sys
import time
import urllib.request

CONVEX = "https://brilliant-scorpion-163.convex.cloud"
BRIDGE = "http://127.0.0.1:3099"
DESIGN_THREAD = "vd7f0v4dn3kjjx9qnt9acryemn8dyr95"


def creds():
    raw = open("/tmp/corner-v2-e2e.env").read()
    get = lambda k: [ln.split("=", 1)[1].strip() for ln in raw.splitlines()
                     if ln.strip().startswith(k + "=")]
    return get("CORNER_V2_E2E_EMAIL")[0], get("CORNER_V2_E2E_PASSWORD")[0]


def convex(kind, path, args, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{CONVEX}/api/{kind}",
        data=json.dumps({"path": path, "args": args, "format": "json"}).encode(),
        headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def main():
    text = sys.argv[1]
    assert DESIGN_THREAD == "vd7f0v4dn3kjjx9qnt9acryemn8dyr95", "design thread only"
    email, password = creds()
    r = convex("action", "auth:signIn",
               {"provider": "password",
                "params": {"email": email, "password": password, "flow": "signIn"}})
    token = r["value"]["tokens"]["token"]

    def surface():
        return convex("query", "v2Workspace:getConversationSurface",
                      {"threadId": DESIGN_THREAD, "limit": 40}, token)["value"]

    def bstate():
        with urllib.request.urlopen(BRIDGE + "/r20/state", timeout=15) as h:
            return json.loads(h.read().decode())

    before_runs = {x["runId"] for x in bstate().get("runs", [])}
    out = convex("mutation", "v2Workspace:sendMessage",
                 {"threadId": DESIGN_THREAD, "text": text}, token)
    print(f"sent block {out['value']['blockId']}", flush=True)
    # Own block's server time anchors "since".
    t0 = None
    for _ in range(20):
        time.sleep(1)
        for m in surface().get("messages", []):
            if m.get("authorType") == "user" and \
                    str((m.get("payload") or {}).get("text") or "") == text:
                t0 = m["createdAt"]
                break
        if t0:
            break
    assert t0, "own message never surfaced"
    deadline = time.time() + 300
    final = None
    while time.time() < deadline:
        time.sleep(5)
        s = surface()
        agents = [m for m in s.get("messages", [])
                  if (m.get("createdAt") or 0) >= t0 and m.get("authorType") == "agent"]
        st = bstate()
        new_runs = [x for x in st.get("runs", []) if x["runId"] not in before_runs]
        texts = [m for m in agents if m.get("kind") == "text"]
        if texts and new_runs and all(x.get("status") == "done" for x in new_runs):
            final = (agents, new_runs)
            break
    if not final:
        print("TIMEOUT: no full turn in 300 s", flush=True)
        return 1
    agents, new_runs = final
    print(f"runs: {[(x['brain'], x['status']) for x in new_runs]}", flush=True)
    print(f"voices: {sorted({m.get('agentSlug') for m in agents if m.get('kind') in ('text', 'question')})}",
          flush=True)
    for m in sorted(agents, key=lambda m: (m.get("createdAt") or 0, str(m.get("id")))):
        kind = m.get("kind")
        body = str((m.get("payload") or {}).get("text") or
                   (m.get("payload") or {}).get("label") or "")[:600]
        print(f"- [{m.get('agentSlug')}/{kind}] {body}", flush=True)
    try:
        sess = convex("query", "v2VisualWindow:getSession",
                      {"threadId": DESIGN_THREAD}, token)["value"] or {}
        tabs = sess.get("tabs") or sess.get("openTabs") or []
        print(f"session tabs ({len(tabs)}):", flush=True)
        for t in tabs[:8]:
            print(f"  tab kind={t.get('kind')} state={t.get('state')} "
                  f"title={(t.get('title') or '')[:70]} id={t.get('artifactId') or t.get('id')}",
                  flush=True)
        print(f"  activeTabId={sess.get('activeTabId')}", flush=True)
    except Exception as e:
        print(f"session read failed: {str(e)[:120]}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
