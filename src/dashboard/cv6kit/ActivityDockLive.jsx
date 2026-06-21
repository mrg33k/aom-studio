import { memo, useCallback } from 'react';
import { ActivityDock } from './ActivityDock.jsx';
import { useRunningJobs } from './useRunningJobs.js';

/**
 * ActivityDockLive — wires the ActivityDock design component to REAL running jobs.
 * Mounts as a float under the header on mobile; slides down when a job is active,
 * disappears when none. The dock follows the user across all screens.
 *
 * Props:
 *   worldId: the current tenant/world (e.g. 'aom', 'karen-world')
 *   onOpen: callback when the dock body is tapped (navigate to the job's detail surface)
 *   onStop: callback when the job is stopped/finished
 *   variant: 'float' (full-width glass pill under header) | 'rail' (card in Command)
 */

export const ActivityDockLive = memo(function ActivityDockLive({
  worldId = 'aom',
  onOpen,
  onStop,
  variant = 'float',
}) {
  const { job, isLoading } = useRunningJobs(worldId);

  // When the expand button (chevron) is tapped, show details / controls.
  // This callback is wired to the dock but needs integration in the caller.
  const handleExpand = useCallback(() => {
    // R1: expand fires a custom event so the parent (CornerVG) can route
    // to a detail panel. For now, this is a no-op; the integrator can wire
    // it to open a detail drawer or modal.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('activity-dock:expand', { detail: { job } }));
    }
  }, [job]);

  // When the finish/action button is tapped (only for 'recording' kind),
  // call the onStop callback.
  const handleAction = useCallback(() => {
    if (onStop) {
      onStop(job);
    }
  }, [job, onStop]);

  // Don't render if no job is running.
  if (!job) {
    return null;
  }

  return (
    <ActivityDock
      job={job}
      variant={variant}
      onOpen={onOpen}
      onExpand={handleExpand}
      showTrailingAction={true}
    />
  );
});

ActivityDockLive.displayName = 'ActivityDockLive';
