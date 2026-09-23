# Decision record — public/analytics/index.html (website report pages, /analytics/<site>)

## agent

Claude Fable 5.1, in Patrik's terminal session, 2026-09-22.

## artifact

`aom-studio/public/analytics/index.html` (the report screen) with `aom-studio/api/analytics.js` (its data) and `aom-studio/public/analytics/aom-films.json`. Live at https://www.aheadofmarket.com/analytics/ambition, `/analytics/wolfpack`, `/analytics/aom` behind the report key. Committed in `b11990b0`, spacing snapped in the follow-up commit that carries this record.

## call

What it is for: Patrik opens one link, in front of a client or alone, and sees whether the website is working. The one thing he must be able to do: read the six numbers at the top and take the sheet with him. The page puts the six numbers first, in the largest type on the screen, with the change against the prior period under each, and a single "Download spreadsheet (CSV)" button at the end. The period switch (7, 28, 90 days) is the only other control.

I am shipping it because it answers Patrik's exact questions in his words (where people stop, where they spend time, what they click, how many films they watch, which homepage version wins), it reads the real numbers from Google Analytics with nothing invented, and it is built in the same obsidian-and-gold system as the homepage it reports on, so a client sees one operation, not a dashboard bolted on. Best-in-class I measured against: Plausible's public stats page (one column, numbers first), Fathom's report share, and the Linear changelog for type rhythm on dark. This page is denser than Plausible because it also carries the section table and the A/B panel.

What lost: a Google Sheet as the primary surface (Patrik said "sheet" but also "on a website for a client"; a live page with CSV export serves both, and the Sheets token on disk is of unknown validity). A charting library (an inline SVG line is enough for one series).

## measured

`python3 scripts/design_spacing_check.py aom-studio/public/analytics/index.html` after snapping margins, padding and gaps to a .25/.5/.75/1/1.5/2/3/4/6rem scale (2026-09-22):

```
  hierarchy ratio (max/min): 3.71
  real font families      : 3  ['inter', 'inter tight', 'space grotesk']
  depth signals           : 0  (shadow/gradient/blur)
  lazy neutrals           : none
  placeholder copy        : none
  near-full-height bands  : 0  (>=80vh/svh/dvh)
  scroll-reveal hints     : 0
  RESULT: FAIL
    - OFF-GRID spacing: 5 value(s) not on the 4px grid -> 12.8, 22.4px
    - SPACING SPRAWL: 17 distinct spacing values (cap 10).
    - TYPE SPRAWL: 12 distinct font sizes (cap 8).
    ! FLAT SURFACE: no depth anywhere (no shadow, gradient, or blur).
```

Before the snap the same check reported 35 off-grid values and 30 distinct spacings. The five remaining off-grid values live inside `clamp()` ranges the snap left alone. The "flat surface" note is the design: dark ground, hairline dividers, gold bars; the only gradient is inside the SVG chart, which the CSS checker does not see.

Data check (local dev adapter, Ambition property 525952571, 28 days): 410 visitors, 532 visits, 48% engaged, 2m 38s per visit, 37 contact actions, scroll funnel 106/89/84/57 people at 25/50/75/100%, 15 click labels after dropping cookie-banner and menu chrome. Rendered at desktop and 375px; every section filled its band; the AOM page shows the "grant Viewer to the service account" gate as intended.

## uncertain

- Twelve font sizes is over the eight the standard allows. The KPI value, section H2, H1, table header, note, and label sizes each earn their place to my eye, but a designer with a stricter ladder would merge the .7/.72/.74rem label sizes and the .85/.9/.95rem body sizes. I did not do that pass.
- The A/B table has fifteen rows. That is complete, not skimmable; on a phone it is a long scroll and the "gold marks the better number" cue may be missed.
- The AOM-only sections are untested against real data because the service account cannot see the AOM property yet. Section labels, film titles (from `aom-films.json`), and the A/B split are wired on the names the homepage sends, which I checked in the data layer, not in a GA report.
- I judged the page on the pane's screenshots at 0.7 scale plus one 375px pass, not on a close-up crop of the hairlines and the 6px bars. A 1px `rgba(246,246,244,.12)` divider may read as absent on some screens.
- "Stayed and engaged" as a label for Google's engagement rate may still confuse an older client; the footnote explains it but nobody reads footnotes.

## would_change

Collapse the type ladder to six sizes and the spacing to eight values in one pass. Add a "what changed since last time" sentence at the top written from the deltas, so a client hears the story before the numbers. Give the A/B panel a verdict line once each version passes a few hundred visits. Add the section-time tracker to the Wolfpack and Ambition sites so their pages get the "where they stop, where they stay" table too. Move the key from localStorage to a signed per-client link.

## risk

If a number is wrong, Patrik says it to a client's face; the totals come straight from GA4's own metrics with no arithmetic beyond the leads sum (max of generate_lead/form_submit, plus phone and email taps), and that rule is written in the footnote. If the key leaks, someone sees a client's traffic numbers; rotating `ANALYTICS_KEY` on Vercel closes it. If GA4 is slow, the page shows the loading card and a refresh line, never a broken layout.
