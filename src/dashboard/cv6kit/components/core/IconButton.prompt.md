Square icon button for toolbars, headers, and the composer. `accent` tone is the filled command-key style (soft accent ring); `surface` is the default bordered well.

```jsx
<IconButton tone="surface" badge title="Notifications"><BellIcon/></IconButton>
<IconButton tone="accent" title="Command"><CommandIcon/></IconButton>
```

Pass an inline ~18px SVG as the child. `badge` shows the unread dot. Press shrinks (`--press-scale`).
