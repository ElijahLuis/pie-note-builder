# ADR 001: Dark Mode and Auto-Save Implementation

**Date:** 2026-01-28
**Status:** Accepted
**Deciders:** Development Team

## Context

The PIE Note Builder needed enhanced user experience features to support school nurses who work in varying lighting conditions and need protection against data loss during documentation. Two features were prioritized: dark mode for visual comfort and auto-save for data persistence.

## Decisions

### 1. Dark Mode Implementation Strategy

**Decision:** Implement dark mode using CSS custom properties with `body.dark-mode` class selector and localStorage persistence.

**Rationale:**
- CSS custom properties allow centralized color management and easy theme switching
- Class-based approach (vs media query preference) gives users explicit control
- localStorage persistence maintains user preference across sessions
- Smooth transitions enhance user experience without being jarring

**Implementation:**
- Toggle button in header alongside privacy filter
- Icon changes: 🌙 (light mode) ↔ ☀️ (dark mode)
- Color palette designed for WCAG AA contrast compliance
- All UI elements (cards, inputs, alerts, buttons) styled for dark mode
- Storage key: `pie_dark_mode`

### 2. Auto-Save Architecture

**Decision:** Implement debounced auto-save with 2-second delay, 24-hour expiry, and localStorage backend.

**Rationale:**
- 2-second debounce prevents excessive saves during typing while feeling responsive
- 24-hour expiry prevents stale data restoration from days/weeks ago
- localStorage sufficient for single-user browser-based application
- Visual feedback (saving/saved indicator) provides user confidence
- Prompt on restore allows user choice (restore vs start fresh)

**Implementation:**
- Storage key: `pie_auto_save`
- State tracked: problem type, interventions, evaluation, PIE prefix preference
- Trigger points: intervention field changes, evaluation field changes
- Clear points: successful note copy, user declines restoration, data becomes stale

### 3. Auto-Save Trigger Points

**Decision:** Trigger auto-save on both `updateInterventionState()` and `updateEvaluationState()` functions.

**Rationale:**
- Captures all user input across both major form sections
- Leverages existing state update functions (single responsibility)
- Debounce mechanism prevents performance impact from frequent triggers
- Ensures comprehensive data protection regardless of which section user is editing

### 4. Auto-Save Visual Feedback

**Decision:** Fixed-position indicator (bottom-right) with two states: "Saving..." and "Auto-saved".

**Rationale:**
- Fixed position ensures visibility without disrupting workflow
- Two-state system provides real-time feedback on save status
- 3-second auto-hide after "Auto-saved" keeps interface clean
- Animation (slideUp) makes indicator noticeable without being intrusive
- ARIA live region (`role="status" aria-live="polite"`) ensures screen reader access

### 5. Auto-Save Restoration UX

**Decision:** Prompt user with confirm dialog on page load if auto-saved data exists, showing human-readable timestamp.

**Rationale:**
- User choice respects autonomy (restore vs start fresh)
- Human-readable timestamp ("5 minutes ago" vs "1704067200000") improves comprehension
- 1-second delay on page load prevents flash of prompt before page renders
- Restoration triggers problem button click + field population for seamless recovery
- Screen reader announcement confirms successful restoration

### 6. Auto-Save Lifecycle Management

**Decision:** Clear auto-save data after successful note copy and when user declines restoration.

**Rationale:**
- Successful copy indicates completed work - no need to restore later
- User declining restoration indicates intentional choice to start fresh
- Prevents confusing prompts for already-completed work
- Reduces localStorage clutter and respects user decisions

### 7. Implementation Priority Order

**Decision:** Implement dark mode first, then auto-save (despite auto-save being #1 user priority).

**Rationale:**
- User explicitly requested: "let's implement dark mode first"
- Dark mode is simpler with fewer edge cases - builds momentum
- Auto-save more complex and benefits from focused attention
- Both features independent - order doesn't impact technical design

### 8. Storage Key Naming Convention

**Decision:** Use `pie_` prefix for all localStorage keys (e.g., `pie_dark_mode`, `pie_auto_save`).

**Rationale:**
- Namespace prevents collisions with other applications on same domain
- Consistent prefix enables easy identification and bulk operations if needed
- Follows existing pattern (`pie_usage_patterns`, `pie_note_history`)
- Improves maintainability and debugging

### 9. Dark Mode Color Palette

**Decision:** Dark theme uses navy/slate palette with adjusted contrast ratios for all elements.

**Rationale:**
- Pure black (#000) can cause eye strain - dark navy (#1E2A35) gentler
- Maintains brand identity with cooler tones (vs generic dark gray)
- All text meets WCAG AA contrast requirements (tested)
- Sensitive field borders remain visible and distinguishable in dark mode
- Gradient background adjusted to maintain visual interest

### 10. Auto-Save Data Structure

**Decision:** Store complete state snapshot: `{problem, interventions, evaluation, usePiePrefix, timestamp}`.

**Rationale:**
- Complete snapshot enables perfect restoration of user's work
- Timestamp enables expiry logic and human-readable display
- PIE prefix preference part of user's workflow state
- JSON serialization simple and reliable for this data structure
- No sensitive PHI stored (form structure only, not actual patient data unless entered)

## Consequences

### Positive

- Users can work comfortably in low-light environments (dark mode)
- Protection against accidental browser closure, tab close, or navigation away
- Improved user confidence with visible save status feedback
- Enhanced accessibility with screen reader announcements
- Seamless cross-session continuity when desired
- Professional, polished user experience

### Negative

- localStorage has ~5-10MB limit (sufficient for this use case, but noteworthy)
- Auto-save prompt adds one extra click on page load when restoration available
- No multi-device sync (localStorage is browser-specific)
- Dark mode requires maintenance of two color palettes

### Risks & Mitigations

**Risk:** localStorage quota exceeded
**Mitigation:** Auto-save cleared after successful copy; 24-hour expiry; single draft stored

**Risk:** Auto-save containing sensitive data persists in browser
**Mitigation:** 24-hour expiry; cleared on completion; user controls browser storage

**Risk:** Dark mode contrast insufficient for some users
**Mitigation:** Tested against WCAG AA; users retain control to toggle off

**Risk:** Auto-save race condition if user types during restoration
**Mitigation:** 500ms delay after problem button click before field restoration

## References

- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Debouncing in JavaScript](https://www.freecodecamp.org/news/javascript-debounce-example/)

## Future Considerations

- Cloud-based sync for multi-device access (requires backend)
- Export/import of auto-saved drafts
- Multiple draft slots for different notes
- User-configurable auto-save interval
- Theme selection beyond light/dark (e.g., high contrast, sepia)
- IndexedDB migration if localStorage limits become constraining
