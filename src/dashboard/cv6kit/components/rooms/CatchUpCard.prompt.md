The card in the Catch Up deck (Home). One per pending item; the user swipes/dismisses to triage, then quick-reply buttons sit below the deck.

```jsx
<CatchUpCard project="Space Rising" mission="→ Mission /007" time="now"
  text="Attached file: support-ask handoff.md" glyphColor="var(--violet-400)" />
```

Stack three with translateY/scale offsets for the deck look (see the mobile UI kit). Uses `--shadow-deck`.
