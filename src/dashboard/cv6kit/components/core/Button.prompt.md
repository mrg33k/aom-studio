Primary action control — use for any commit/confirm/advance action; reach for `secondary`/`ghost` for lower-emphasis siblings in the same row.

```jsx
<Button variant="primary" size="md" onClick={send}>Open in chat</Button>
<Button variant="secondary">Snooze</Button>
<Button variant="accentWeak" iconRight={<ArrowIcon/>}>Review</Button>
```

Variants: `primary` (accent fill, white text), `secondary` (surface-2 + hair border), `ghost` (transparent, muted), `accentWeak` (tinted accent — used for the "Review" affordance). Sizes `sm | md | lg`. Press shrinks (`--press-scale-lg`); it never changes colour. Pass `full` to stretch.
