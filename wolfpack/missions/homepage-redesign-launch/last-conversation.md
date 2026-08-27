# Wolfpack Homepage Redesign Launch — Last Conversation

## 2026-08-27 — Scope and launch approach approved

Patrik asked to get Wolfpack live at `wolfpackcompanies.com`, using the supplied redesign across the entire site and completing a mobile polish pass before launch. He confirmed that `Wolfpack Evolution B v2` is the newest homepage direction and that the package's page-specific designs should become templates for cities, services, and the other page families.

The current GoDaddy site's images must all be downloaded before the switch. Contact requests must be sent to both `Service@wolfpackcompanies.com` and `hello@aom-inhouse.com`; the current implementation only stores a lead in the visitor's browser and is not acceptable for launch.

Patrik approved hosting Wolfpack as a separate Vercel project sourced from this repository. The project itself does not add a fixed monthly fee; normal pooled usage still applies. The release sequence is archive, rebuild, mobile and functional QA, separate-project preview, Patrik approval, GoDaddy DNS cutover, canonical-domain verification, and retention of the AOM path as rollback coverage.
