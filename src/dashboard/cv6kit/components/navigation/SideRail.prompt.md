The mobile side menu (72px). The profile avatar at the top is the menu button; nav items fill the middle with even rhythm and the active item shows an edge indicator pill; search / theme / alerts stack at the bottom. There's no persistent bottom bar — closed, a profile FAB summons this rail.

```jsx
<SideRail
  active="home"
  onMenu={closeMenu}
  items={[
    { key: 'home', label: 'Home', icon: <HomeIcon/> },
    { key: 'chat', label: 'Chat', icon: <ChatIcon/> },
    …
  ]}
/>
```
