A single row in All Rooms or a project's room picker. Agents lead with a `status` dot; projects lead with a `leading` glyph and trail with a `count`/`chevron`. Active rows tint accent-weak.

```jsx
<RoomRow status="online" name="Elon" tag="AGENT" active />
<RoomRow leading={<FolderIcon/>} name="Space Rising" subtitle="28 missions" count={28} chevron />
<RoomRow leading={<FolderIcon/>} name="Mission /007" subtitle="narrowing the retry loop" unread={3} />
```
