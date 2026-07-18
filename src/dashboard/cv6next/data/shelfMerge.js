// shelfMerge.js — pure merge for a room's Files shelf. No imports (node-testable:
// tests/api/_lib/shelfMerge.test.js).
//
// qa-files matrix 2026-07-18 (100-file round-trip, Patrik-directed): user uploads
// landed 0/50 in the room Files panel and agent shares 0/20 in mission rooms,
// while the global Files section caught 100/100. Two causes: uploads live in the
// files-server tree the panel's library walk never sees, and the Home room panel
// dropped conversation FILE attachments, keeping only links. The full Chat tool
// (ChatDesktop) already merges conversation files; this helper gives the Home
// panel the same behavior: library files + conversation files + links, deduped
// by url (falling back to name+timestamp).
export function mergeRoomShelf(lib, convo) {
  const convoFiles = (convo || []).filter((i) => i && i.type === 'file');
  const links = (convo || []).filter((i) => i && i.type === 'link');
  const seen = new Set();
  return [...(lib || []), ...convoFiles, ...links].filter((it) => {
    const key = it.url || `${it.name}::${it.ts || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
