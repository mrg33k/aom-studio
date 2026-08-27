# Production verification — wolfpackcompanies.com — 2026-08-27 ~08:25 AM Phoenix

## Cutover
- GoDaddy (delegate access "Patrik logged in as: Robert Bush"): apex A record edited from
  WebsiteBuilder Site (76.223.105.230 / 13.248.243.5) to 76.76.21.21. Executed via Claude in
  Chrome in Patrik's browser; Patrik completed the SMS identity verification. GoDaddy UI
  confirmed "Success", record table shows A @ 76.76.21.21 1 Hour.
- Untouched (verified after cutover): www CNAME -> apex, NS ns23/ns24.domaincontrol.com,
  MX mx1/mx2-us1.ppe-hosted.com, SPF x2, all Microsoft/Lync/iCloud DKIM CNAMEs, all TXT.
- Pre-cutover snapshot: research/dns-before-2026-08-27.txt (rollback = restore the two A values).

## DNS + TLS
- Authoritative (ns23.domaincontrol.com): 76.76.21.21 immediately after save.
- Public: 1.1.1.1 flipped within ~1 min; 8.8.8.8 within ~25 min (TTL 3600).
- TLS cert: forced issuance via `vercel certs issue` (auto-issue had not triggered);
  CN=wolfpackcompanies.com, covers www, expires 2026-11-25. HTTPS live.

## Acceptance (run against the live domain)
- ALL 27 routes: HTTP 200 over HTTPS.
- http:// -> 308 -> https:// canonical. www serves 200.
- sitemap.xml (1,903b), robots.txt, site.css, site.js, hero JPEG, brand PNG: all 200.
- Homepage title + ROC 326629 present; zero console errors at 1440 and 390 (Playwright).
- /api/lead: 308 (trailingSlash) -> /api/lead/ answers; bot probe correctly 422
  {"ok":false,"error":"invalid"}; browser fetch follows 308 with method+body preserved.
- Client email risk: none observed — MX/SPF resolve identically to snapshot.

## Deployment
- Vercel project wolfpack-companies (team aheads-projects), production deployment from
  branch codex/wolfpack-homepage-redesign-launch (post-QA build).
- Rollback paths: (1) GoDaddy: restore snapshot A records; (2) Vercel: previous deployment
  promote; (3) old site tree preserved at public/wolfpack-site/ on aom-studio.

## Open item at verification time
- RESEND_API_KEY not yet set on wolfpack-companies (agent is permission-blocked from secret
  transfer; Patrik to paste). Until then the form shows an honest failure state with
  call/email fallback; tel: and mailto: paths fully live. Watcher armed; on arrival:
  redeploy + labeled end-to-end lead test to both inboxes.
