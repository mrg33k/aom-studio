#!/usr/bin/env python3
"""watch-muse.py <label> <session.jsonl> [digest_seconds]

Follows a Muse session log. Emits ONE digest line per interval (tool-call count, last bash commands,
last edits), failure signatures as soon as they appear, and a final line when the session ends.
"""
import json, sys, time, os, re
label, path = sys.argv[1], sys.argv[2]
every = int(sys.argv[3]) if len(sys.argv) > 3 else 300
BAD = ("** BUILD FAILED", "** TEST FAILED", "error:", "Traceback", "fatal:", "command not found", "Permission denied")
def emit(s): print(s, flush=True)
calls = 0; cmds = []; edits = []; last = time.time(); quiet_since = time.time()
with open(path, "r", errors="replace") as f:
    f.seek(0, os.SEEK_END)
    while True:
        line = f.readline()
        if not line:
            if time.time() - last >= every:
                idle = int(time.time() - quiet_since)
                emit(f"{time.strftime('%H:%M')} {label}: {calls} tool calls, idle {idle}s | bash: {' ;; '.join(cmds[-3:]) or '-'} | edits: {' ; '.join(edits[-3:]) or '-'}")
                last = time.time(); cmds = cmds[-3:]; edits = edits[-3:]
            time.sleep(1.0); continue
        quiet_since = time.time()
        try: r = json.loads(line)
        except Exception: continue
        pt = r.get("payload_type", ""); p = r.get("payload", {}) or {}
        if pt == "tool_batch.effect.started":
            calls += 1
        elif pt == "session.end":
            emit(f"{time.strftime('%H:%M')} {label}: SESSION END exit={json.dumps((p.get('record') or {}).get('exit_reason'))} after {calls} tool calls")
            break
        elif p.get("kind") == "task":
            ev = p.get("event", {}) or {}
            if ev.get("kind") == "output":
                chunk = str(ev.get("chunk", ""))
                m = re.search(r'"command":\s*"((?:[^"\\]|\\.)*)"', chunk[:2000])
                if m:
                    c = m.group(1).encode().decode("unicode_escape", errors="ignore")
                    c = re.sub(r"^cd \S+ && ", "", c)
                    cmds.append(c[:90])
                elif chunk.startswith("edited"):
                    edits.append(chunk[:70].replace("\n", " "))
                hit = next((b for b in BAD if b in chunk), None)
                if hit and not chunk.startswith("Read text file"):
                    i = chunk.find(hit); emit(f"{time.strftime('%H:%M')} {label} !! {chunk[max(0,i-80):i+160].replace(chr(10),' | ')}")
