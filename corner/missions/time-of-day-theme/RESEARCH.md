# Research — `corner:time-of-day-theme`

## Arizona timezone

Arizona observes Mountain Standard Time year-round (UTC−7) and does
not participate in Daylight Saving Time (the Navajo Nation, which
overlaps northeastern AZ, does — out of scope here). Compute "now in
Arizona" by subtracting 7 hours from UTC.

## Existing palette

`src/dashboard/lib/cv3Colors.js` exports a single `C` object. ~100+
files import `C` directly. Swapping at runtime requires either a
React context refactor (every component reads `useTheme()`) or
CSS-variable indirection. Neither fits in R1.
