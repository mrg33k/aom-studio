// cv6next — Pin-comments state management for Review tool.
// Manages pin creation, deletion, and display on deliverables.
// Pins are LOCAL component state (not persisted to backend yet).
// TODO(cv6: persist pins to /api/dashboard/review-pin-decision): backend integration.

import { useState, useCallback, useEffect } from 'react';

export function usePins(deliverableId) {
  const [pins, setPins] = useState([]);

  // Start every deliverable with NO pins. We used to inject a fake sample pin
  // ("Review this carefully") so the viewer looked annotated, but that showed a
  // fabricated review comment as if a human had left it — fake-as-real. Real pins
  // are created by tapping the viewer (addPin) and are local-only until a pin store
  // exists. Reset to empty when switching deliverables so one file's pins never
  // bleed into the next.
  useEffect(() => {
    setPins([]);
  }, [deliverableId]);

  // Create a new pin at the clicked position.
  // Returns the pin for immediate UI updates (numbering, positioning).
  const addPin = useCallback((x, y, viewerWidth, viewerHeight, text = '') => {
    const xPercent = (x / viewerWidth) * 100;
    const yPercent = (y / viewerHeight) * 100;
    const n = pins.length + 1; // Next pin number
    const pin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      n,
      x: Math.round(xPercent),
      y: Math.round(yPercent),
      text: text || `Comment ${n}`,
      anchor: '', // For video: timestamp; for doc: anchor phrase (extracted on save).
      createdAt: new Date().toISOString(),
      // TODO(cv6: persist pins): POST to /api/dashboard/review-pin-decision
      // with { deliverableId, x, y, text, type: 'pin' }
    };
    setPins((prev) => [...prev, pin]);
    return pin;
  }, [pins.length]);

  // Update an existing pin (e.g., edit text or anchor).
  const updatePin = useCallback((pinId, updates) => {
    setPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, ...updates } : p))
    );
    // TODO(cv6: persist pins): PUT /api/dashboard/review-pin/<pinId> with updates
  }, []);

  // Delete a pin.
  const deletePin = useCallback((pinId) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    // Renumber remaining pins (so gaps don't appear).
    setPins((prev) =>
      prev.map((p, i) => ({ ...p, n: i + 1 }))
    );
    // TODO(cv6: persist pins): DELETE /api/dashboard/review-pin/<pinId>
  }, []);

  return {
    pins,
    addPin,
    updatePin,
    deletePin,
  };
}
