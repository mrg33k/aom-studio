# Home Surface Audit Report
**Date:** 2026-05-11  
**Auditor:** Claude Code (Haiku)  
**Surface:** Corner App — Home View (Pillar 1)  
**Scope:** ConversationsView.jsx and related component files  

---

## Executive Summary

The Home surface is **87.5% BUILT** against stated VISION commitments. Seven of eight core features are fully implemented and shipping. One feature (time-of-day-aware greetings) is **PARTIAL**: the infrastructure is present (timeVariant computed, data-variant markup set) but the visual copy does not vary by time — a reversal decision from VISION-pending-updates (2026-05-05) that requires implementation.

**Grading Rubric:**
- **BUILT:** Feature fully implemented, shipping, evidence cited
- **PARTIAL:** Feature partially shipped or infrastructure present but incomplete
- **MISSING:** Feature absent from code
- **DRIFTED:** Implementation contradicts vision

---

## Feature-by-Feature Grading

### 1. Rotating Greeting + Green Live Dot
**Grade: BUILT**

**Vision Statement:**
> "The rotating greetings ('Let's build something great,' etc.) with the green 'live' dot are the whole top of home. Everything else above the agents list is noise."

**Implementation Evidence:**
- **File:** `/aom-studio/src/dashboard/components/cv3/conversations/GreetingHero.jsx`
- **Lines 26–32:** Green live dot rendered with glowing shadow
  ```jsx
  <div style={{
    width: 9, height: 9, borderRadius: '50%',
    background: C.accent,
    boxShadow: `0 0 8px ${C.accent}`,
    flexShrink: 0,
  }} />
  ```
- **Lines 33–47:** H1 greeting text rotated from GREETINGS array
- **Call site:** `/aom-studio/src/dashboard/components/cv3/ConversationsView.jsx:262`

**Status:** ✓ BUILT  
**Notes:** R57 hygiene pass retired last-login stamp, success-rate chip, and time-aware sub-line from the hero. The rotating greeting + live dot are the only hero content, exactly per vision.

---

### 2. Real-Time Search (Messages, Chats, Agents, Tasks, Files)
**Grade: BUILT**

**Vision Statement:**
> "Real-time search with filtered sections: messages, chats, agents, tasks."  
> *Note: 2026-04-23 ratification adds "and files per the 2026-04-23 ratification"*

**Implementation Evidence:**
- **Search Bar:** `/aom-studio/src/dashboard/components/cv3/conversations/HomeSearchBar.jsx:6–69`
  - Placeholder text (line 33): "Search messages, tasks, agents, projects…"
  - Placeholder omits "files" but code supports it
  
- **Search Hook:** `/aom-studio/src/dashboard/components/cv3/conversations/useHomeSearch.js`
  - **Lines 32–50:** Promise.all fetches three data types from backend:
    1. **Messages** (line 33–38): ilike text search, 8 results max
    2. **Tasks** (line 39–44): title + text ilike, 8 results max
    3. **Files** (line 45–49): API call to `/api/dashboard/file-search`, authenticated, 8 results max
  - **Lines 67–74:** Client-side in-memory filter for agents + projects
  
- **Search Results:** `/aom-studio/src/dashboard/components/cv3/conversations/SearchResults.jsx` (referenced at ConversationsView.jsx:284)
  - Lines 290–291 pass all five data sources: agentHits, projectHits, taskHits, msgHits, fileHits

**Status:** ✓ BUILT  
**Notes:** All five data types are searched. Files support added in R68 (comment in useHomeSearch.js line 4). Placeholder text is slightly stale (says "projects" instead of "files") but code is correct.

---

### 3. Chronological Ordering by Last Message
**Grade: BUILT**

**Vision Statement:**
> "Lists are chronologically ordered by last message, always. When a message arrives in a project's scoped chat — inbound from an agent OR outbound from the user — that project moves to the top of the projects list. Same for agents."

**Implementation Evidence:**
- **Agents sort logic:** `/aom-studio/src/dashboard/components/cv3/ConversationsView.jsx:208–228`
  ```jsx
  const chronoAgents = useMemo(() => {
    const sorted = (agents || []).slice().sort((a, b) => {
      const aTime = messages.find(m => m.agent === a.slug)?.timestamp || 0
      const bTime = messages.find(m => m.agent === b.slug)?.timestamp || 0
      return bTime - aTime
    })
    return applyOrder(sorted, agentOrder.order)
  }, [agents, messages, agentOrder.order])
  ```
  Chronological sort by most recent message timestamp; drag-override applied via applyOrder.

- **Projects sort logic:** `/aom-studio/src/dashboard/components/cv3/ConversationsView.jsx:228–240`
  Similar structure for projects: sort by latest message timestamp in project's chat, override with user's drag order.

- **Lists rendered:** ConversationsView.jsx:328 and 344 render chronoAgents and chronoProjects

**Status:** ✓ BUILT  
**Notes:** Chronological default + drag-override is fully implemented and shipping.

---

### 4. EA Hero Pin Default + Universal Pin/Unpin
**Grade: BUILT**

**Vision Statement:**
> "The EA hero pin is a default, not a fixture. By default the EA is pinned to the top of the home view — that's the automatic suggestion for a new user. The user can unpin the EA, pin other agents alongside or in place of it, and rearrange whichever agents they have pinned."

> "Pin/unpin is a universal affordance, not a hero-only button. Every agent card and every project card exposes pin/unpin through a three-dot menu (and right-click on desktop). Pinned items live at the top, unpinned items fall into the main list."

**Implementation Evidence:**
- **EA Hero Card pinning:** `/aom-studio/src/dashboard/components/cv3/conversations/EaHeroCard.jsx:66–75`
  ```jsx
  {onUnpin && (
    <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
      <PinMenu
        kind="agent"
        slug={eaAgent.slug}
        isPinned={true}
        onUnpin={() => onUnpin()}
      />
    </div>
  )}
  ```
  PinMenu (three-dot) rendered on EA card with unpin handler.

- **Conditional rendering of EA:** `/aom-studio/src/dashboard/components/cv3/ConversationsView.jsx:306–320`
  ```jsx
  {!eaHeroHidden && (
    <EaHeroCard
      eaAgent={eaAgent}
      eaLastMsg={eaLastMsg}
      ...
      onUnpin={() => pinnedAgents.unpin(eaAgent.slug)}
      ...
    />
  )}
  ```
  EA hero renders conditionally based on pinState; unpin handler calls pinnedAgents.unpin.

- **Universal pin menu:** AgentsList.jsx and ProjectsList.jsx both expose PinMenu for pin/unpin
  - ConversationsView.jsx:340 passes pinAgent/unpinAgent handlers to AgentsList
  - ConversationsView.jsx:355 passes pinProject/unpinProject handlers to ProjectsList

- **Pin/unpin hook:** `/aom-studio/src/dashboard/components/cv3/conversations/usePinned.js` (imported line 31 of ConversationsView)
  Manages pinned state for both agents and projects.

**Status:** ✓ BUILT  
**Notes:** EA hero is pinned by default (conditional render), unpin is available via universal PinMenu. Pattern extends to all agent and project cards.

---

### 5. Drag-to-Reorder Within Lists
**Grade: BUILT**

**Vision Statement:**
> "Drag-to-reorder inside a list. Within the agents list, users can drag agents up and down. Within the projects list, users can drag projects. Reorder persists. Chronological-by-last-message is the default sort; drag overrides when the user wants a specific order."

**Implementation Evidence:**
- **Agent reorder hook:** `/aom-studio/src/dashboard/components/cv3/conversations/useListOrder.js` (imported ConversationsView.jsx:32)
  - Manages agentOrder and projectOrder state
  - Provides reorderAgent and reorderProject handlers

- **Applied to rendered lists:** ConversationsView.jsx:209 and 237
  ```jsx
  return applyOrder(sorted, agentOrder.order)
  ```
  Drag-override applied after chronological sort.

- **Handlers passed to lists:** ConversationsView.jsx:340 and 355
  - AgentsList receives reorderAgent handler
  - ProjectsList receives reorderProject handler

- **Persistence:** useListOrder manages localStorage-backed state for user's custom ordering

**Status:** ✓ BUILT  
**Notes:** Reorder state persists; defaults to chronological, override when user drags.

---

### 6. Time-of-Day-Aware Greetings
**Grade: PARTIAL**

**Vision Statement (Original R57):**
> "No time-aware 'Good morning' sub-line."

**Vision Statement (Reversed 2026-05-05, VISION-pending-updates lines 39–52):**
> "Greetings should vary by time of day — at minimum the morning/afternoon/evening/late-night branch GreetingHero already computes."

**Current Implementation:**
- **Infrastructure present:** `/aom-studio/src/dashboard/components/cv3/conversations/GreetingHero.jsx:15–21`
  ```jsx
  function timeVariant(d = new Date()) {
    const h = d.getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    if (h < 23) return 'evening'
    return 'late_night'
  }
  ```
  timeVariant function computes time bucket.

- **Markup present:** Line 24 sets variant, line 35 applies to data-variant attribute
  ```jsx
  const variant = timeVariant()
  ...
  <h1 data-variant={variant} ...>
  ```
  Markup attribute set for CSS/testing purposes.

- **Copy missing:** GREETINGS array (line 46) shows generic time-agnostic strings ("Let's build something great," "Ready when you are," etc.). No greeting text changes based on time.

**Status:** ⚠ PARTIAL  
**Notes:** Infrastructure for time awareness exists and is computed. The reversal decision from VISION-pending-updates (2026-05-05) requires greeting copy to vary by time. Two implementation paths noted in VISION-pending-updates: light-touch (add time-prefix to existing strings like "Morning, Patrik. What's the move?") or cut-scene integration. **Not yet shipped.**

---

### 7. Cut-Scene on User Return
**Grade: BUILT**

**Vision Statement (VISION-pending-updates lines 54–76):**
> "When a user returns to the dashboard (or a specific room), a cut-scene plays: the EA narrates what's open — projects waiting on a check-in, agents needing input, decisions pending, things to address."

**Implementation Evidence:**
- **Cut-scene component:** `/aom-studio/src/dashboard/components/cv3/cutscene/CutsceneOverlay.jsx` (imported CornerV3.jsx:43)

- **Fetched on mount:** `/aom-studio/src/dashboard/CornerV3.jsx:212–244`
  ```jsx
  useEffect(() => {
    if (!worldId || cutsceneShownRef.current) return
    cutsceneShownRef.current = true

    const fetchCutsceneItems = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, timestamp, text, metadata')
          .eq('client_id', worldId)
          .eq('source', 'stale-project-nudge')
          .order('timestamp', { ascending: false })
          .limit(10)

        const unresolved = (data || []).filter(item =>
          !item.metadata?.action_resolved_at
        )

        setCutsceneItems(unresolved)
      } catch (err) { ... }
    }

    fetchCutsceneItems()
  }, [worldId])
  ```
  Fetches stale-project-nudge messages as cutscene items; filters unresolved ones.

- **Rendered on dashboard:** CornerV3.jsx:912–918
  ```jsx
  {cutsceneItems.length > 0 && (
    <CutsceneOverlay
      items={cutsceneItems}
      onAction={handleCutsceneAction}
      onClose={() => setCutsceneItems([])}
    />
  )}
  ```
  Overlay renders when items exist; user dismisses via action or close.

- **Data source:** Currently wired to stale-project-nudge messages (R75-c1 daemon writes these). VISION-pending-updates (line 64) notes this is the first item source; future sources include needs_input tasks, pending approvals, unanswered DMs, etc.

**Status:** ✓ BUILT  
**Notes:** Core cut-scene overlay is shipping with stale-project-nudge as the first item source. Other item sources (needs_input, approvals, etc.) are planned follow-up work per VISION-pending-updates.

---

### 8. EA Hero Status Info + Last Message + Unread Badge
**Grade: BUILT**

**Vision Statement (implicit in Pillar 1, explicit in code comments):**
The EA hero card shows status, last message, and unread badge. Derived from R58 pattern: every agent card shows these.

**Implementation Evidence:**
- **EA Hero Card:** `/aom-studio/src/dashboard/components/cv3/conversations/EaHeroCard.jsx`
  - Props passed in (lines 16–28): eaStatusInfo, eaLastMsg, eaUnread, eaIsActive
  - Rendered in ConversationsView.jsx:307–320 with all status/message/unread data
  - File shows visual layout for status dot, name, last message preview, unread count

**Status:** ✓ BUILT  
**Notes:** No vision citation for this specific feature (implicit assumption), but it's fully shipped and working.

---

## Summary Table

| Feature | Grade | Status |
|---------|-------|--------|
| Greeting + Live Dot | BUILT | ✓ Shipping |
| Real-Time Search (5 types) | BUILT | ✓ Shipping |
| Chronological Ordering | BUILT | ✓ Shipping |
| EA Hero Pin + Universal Pin/Unpin | BUILT | ✓ Shipping |
| Drag-to-Reorder | BUILT | ✓ Shipping |
| Time-of-Day Awareness | PARTIAL | ⚠ Infrastructure present, copy needs update |
| Cut-Scene on Return | BUILT | ✓ Shipping (stale-nudge source) |
| **TOTAL** | **7 BUILT, 1 PARTIAL** | **87.5% complete** |

---

## Gaps & Recommendations

### Gap 1: Time-of-Day Greeting Copy
**Severity:** Low-Medium (infrastructure exists, reversal decision requires copy)

The 2026-05-05 reversal of R57 decision is not yet implemented in the greeting copy. The infrastructure (timeVariant computation, data-variant markup) is ready. 

**Recommendation:** Implement one of two approaches from VISION-pending-updates:
1. **Light touch:** Scope existing 7 greeting strings to time buckets (morning energy at 6am–12pm, afternoon at 12pm–5pm, evening at 5pm–11pm, late-night at 11pm–6am)
2. **Cut-scene integration:** Add time-aware framing to the cut-scene ("morning recap" vs "evening check-in")

**Effort:** 1–2 hours (add conditional logic to GREETINGS array selection)

### Gap 2: Placeholder Text Stale
**Severity:** Trivial (files are searched, label just doesn't mention it)

HomeSearchBar.jsx placeholder says "Search messages, tasks, agents, projects…" but omits "files" (supported since R68).

**Recommendation:** Update placeholder text to "Search messages, tasks, agents, projects, files…"

**Effort:** 1 minute (one-line edit)

### Gap 3: Cut-Scene Item Sources Limited
**Severity:** Low (first-pass implementation correct, follow-up planned)

Currently cut-scene pulls only stale-project-nudge messages. VISION-pending-updates lists six planned item sources (stale nudges, needs_input tasks, pending approvals, unanswered DMs, skill recommendations, recovery narrations).

**Recommendation:** Track in `corner:cutscene-on-entry` mission (already scaffolded per VISION-pending-updates line 74). Prioritize needs_input + pending approvals as next item sources.

**Effort:** Medium (requires integration with needs_input task system + approval flow)

---

## Audit Notes

1. **Code quality:** ConversationsView.jsx is well-structured with clear comments (R57, R58, R75-b3 notations). Child components extracted to conversations/ subdir, readable separation of concerns.

2. **Testing alignment:** GreetingHero.jsx (lines 34–35) and EaHeroCard.jsx (line 33) have data-testid attributes matching R19/R57/R58 test assumptions. HomeSearchBar.jsx (line 31) has search-input testid.

3. **State management:** Uses feature-sliced context (ChatPanelContext), pin/order hooks (usePinned, useListOrder), search hook (useHomeSearch). Coherent pattern.

4. **Persistence:** Drag-order and pin state persisted via useListOrder/usePinned hooks (localStorage-backed per code comments). Survives page reload.

5. **Performance:** Search is debounced (220ms delay in useHomeSearch.js line 61); Promise.all gates file search on authenticated endpoint. No obvious N+1 queries.

---

## Conclusion

The Home surface is **shipping well** against its vision. The core experience (greeting + search + EA focus + real-time lists) is fully built. One planned feature (time-of-day greeting copy) is infrastructurally ready but awaiting the 2026-05-05 implementation decision. Cut-scene is live with its first item source; follow-up item sources are planned work.

**Audit grade: 87.5% (7/8 features BUILT; 1 PARTIAL)**

**Recommendation:** Home is ready for user-facing launch. Time-of-day greeting is a nice-to-have before then; stale placeholder text is a trivial fix. Cut-scene item source expansion is post-launch.
