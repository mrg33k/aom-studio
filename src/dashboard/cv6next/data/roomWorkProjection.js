function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

// message-steps can contain retries for the same index plus the 9999 settle marker.
// Keep the newest truth per index, then collapse adjacent repeated labels so the live
// card changes only when the visible activity actually changes.
export function liveWorkLabels(liveSteps) {
  const byIndex = new Map();
  for (const [position, step] of (Array.isArray(liveSteps) ? liveSteps : []).entries()) {
    const label = clean(step?.text);
    if (!label || label.toLowerCase() === 'settled' || Number(step?.step_index) === 9999) continue;
    const index = Number.isFinite(Number(step?.step_index)) ? Number(step.step_index) : position;
    const timestamp = step?.timestamp ? new Date(step.timestamp).getTime() : 0;
    const rank = Number.isFinite(timestamp) ? timestamp : 0;
    const previous = byIndex.get(index);
    if (!previous || rank >= previous.rank) byIndex.set(index, { index, position, rank, label });
  }

  const ordered = [...byIndex.values()].sort((a, b) => {
    if (a.rank && b.rank && a.rank !== b.rank) return a.rank - b.rank;
    if (a.index !== b.index) return a.index - b.index;
    return a.position - b.position;
  });
  return ordered.reduce((labels, item) => {
    if (labels[labels.length - 1] !== item.label) labels.push(item.label);
    return labels;
  }, []);
}

export function currentTurnWorkLabel({ liveSteps, currentAsk } = {}) {
  const labels = liveWorkLabels(liveSteps);
  if (labels.length) return labels[labels.length - 1];
  const ask = clean(currentAsk);
  if (ask) return `Responding to: ${ask}`;
  return 'Preparing a response';
}

