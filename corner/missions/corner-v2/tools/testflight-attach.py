#!/usr/bin/env python3
"""TestFlight build 19: attach to 'Corner testers' + submit for beta review once processed. Never prints keys."""
import json, os, sys, time, urllib.request, urllib.error
import jwt
env = {}
for ln in open(os.path.expanduser("~/.config/appstoreconnect.env")):
    ln = ln.strip()
    if "=" in ln and not ln.startswith("#"):
        k, v = ln.split("=", 1); env[k.strip().replace("export ", "")] = v.strip().strip('"')
KEY_ID, ISSUER = env["KEY_ID"], env["ISSUER_ID"]
key = open(os.path.expanduser(f"~/.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8")).read()
def token():
    now = int(time.time())
    return jwt.encode({"iss": ISSUER, "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"}, key, algorithm="ES256", headers={"kid": KEY_ID})
def api(method, path, body=None):
    req = urllib.request.Request("https://api.appstoreconnect.apple.com" + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read(); return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")
BUILD_NO = sys.argv[1] if len(sys.argv) > 1 else "19"
GROUP = "5a446dd4-3188-48a8-b080-7c9b7d709077"
st, apps = api("GET", "/v1/apps?filter[bundleId]=com.aheadofmarket.corner")
app_id = apps["data"][0]["id"]
st, builds = api("GET", f"/v1/builds?filter[app]={app_id}&filter[version]={BUILD_NO}&sort=-uploadedDate&limit=3")
if not builds.get("data"):
    print(f"build {BUILD_NO}: not visible yet"); sys.exit(2)
b = builds["data"][0]; bid = b["id"]; state = b["attributes"]["processingState"]
print(f"build {BUILD_NO}: id={bid} state={state} uploaded={b['attributes'].get('uploadedDate')}")
if state != "VALID":
    sys.exit(3)
st, r = api("POST", f"/v1/betaGroups/{GROUP}/relationships/builds", {"data": [{"type": "builds", "id": bid}]})
print("attach to Corner testers:", st)
st, r = api("GET", f"/v1/builds/{bid}/betaAppReviewSubmission")
if r.get("data"):
    print("beta review: already submitted", r["data"]["attributes"].get("betaReviewState"))
else:
    st, r = api("POST", "/v1/betaAppReviewSubmissions", {"data": {"type": "betaAppReviewSubmissions", "relationships": {"build": {"data": {"type": "builds", "id": bid}}}}})
    print("beta review submission:", st, (r.get("data") or {}).get("attributes", {}).get("betaReviewState") or json.dumps(r)[:200])
