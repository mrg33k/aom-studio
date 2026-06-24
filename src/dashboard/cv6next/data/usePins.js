// cv6next — Pin-comments state management for Review tool.
// Manages pin creation, deletion, and display on deliverables.
// Pins are LOCAL component state (not persisted to backend yet).
// TODO(cv6: persist pins to /api/dashboard/review-pin-decision): backend integration.

import { useState, useCallback, useMemo } from 'react';

export function usePins(deliverableId) {
  const [pins, setPins] = useState([]);

  // Sample pins for demo (so Patrik can see pins working without annotating).
  // These are cleared when switching deliverables.
  useMemo(() => {
    if (deliverableId) {
      // Demo: one sample pin per deliverable (so each shows at least one).
      const samplePin = {
        id: `sample-${deliverableId}-1`,
        n: 1,
        x: 45,
        y: 30,
        text: 'Review this carefully',
        anchor: 'on "Support ask"',
        createdAt: new Date().toISOString(),
      };
      setPins([samplePin]);
    }
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
