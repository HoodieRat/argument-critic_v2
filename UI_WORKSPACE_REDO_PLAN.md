# Analysis Workspace Cleanup Plan (V2)

Goal: make the Analysis workspace easier to read, easier on the eyes, and faster to use without losing analytical depth. The user should be able to switch between one-lens focus, one-vs-one comparison, and full-board scanning without losing their place.

## Recommended Direction

1. Keep one shared analysis workspace component as the owner of the experience instead of splitting the feature across separate routes or duplicate screens.
2. Make Focus view the default working mode.
3. Add Compare and All as alternate presentation modes inside the same workspace.
4. Keep backend contracts, analysis data shape, and criticality logic unchanged.
5. Treat this as a presentation and interaction cleanup first. Only promote state into the global store if local component state becomes a real limitation.

## Why This Direction

1. The current analysis screen already contains the right information. The main problem is simultaneous density, duplicated copy, and low-contrast styling.
2. Re-architecting routes or server contracts would create risk without improving the product's main job: help the user inspect and repair an argument.
3. The desktop shell and extension already share the same renderer, so a single workspace-level redesign keeps behavior consistent in both surfaces.

## Existing Surfaces To Rework

1. `apps/extension/src/sidepanel/components/AnalysisWorkspaceForm.tsx`
  - Current owner of the full analysis workspace.
  - Already renders the lens list, active lens detail, top issue summary, claims, assumptions, critiques, and other analysis groups.
  - This should remain the primary orchestration point, but it is already large enough that view-specific extraction may be needed during implementation.
2. `apps/extension/src/sidepanel/styles.css`
  - Owns the current palette, card treatment, spacing, grid layout, and responsive rules.
  - This file is the main source of the current glare problem because the workspace uses several warm tinted surfaces at similar visual weight.
3. `apps/extension/src/sidepanel/App.tsx`
  - Owns workspace entry and exit wiring for the Analysis area.
  - Only update this if the toolbar, shell copy, or workspace wrapper needs small support changes.
4. `apps/extension/src/sidepanel/components/AnalysisWorkspaceForm.test.tsx`
  - Primary component test surface for lens selection and active detail behavior.
  - This should be expanded for Focus, Compare, and All mode behavior.
5. `apps/extension/src/sidepanel/App.workspaceMode.test.tsx`
  - Keep this aligned if analysis workspace entry or exit behavior changes.
6. `apps/extension/src/sidepanel/components/AnalysisPanel.tsx`
  - Legacy analysis surface.
  - Keep behavior consistent where labels or shared copy overlap, but do not let this drive the redesign.

## Product Principles For This Pass

1. Show less by default, not less capability overall.
2. Preserve one obvious next step at all times.
3. Make the active lens unmistakable.
4. Keep secondary detail available through progressive disclosure rather than deleting it.
5. Optimize for the real desktop drawer width of roughly 440 to 560 pixels before optimizing for large screenshots.

## Target User Experience

### Focus View

1. This is the default mode and the main working surface.
2. The user sees a slim lens selector area and one dominant active-lens reading surface.
3. Lens cards become summary widgets, not mini documents.
4. Only the three most useful detail groups stay open above the fold:
  - What this lens notices here
  - Where it presses hardest
  - Questions this lens asks next
5. Reframe, challenge, and reference material stay available, but move into lower-priority disclosure panels.

### Compare View

1. This is an explicit analysis mode for one-vs-one comparison.
2. The user picks a primary lens and a comparison lens.
3. Both columns use the exact same section order so scanning is row-by-row instead of paragraph-by-paragraph.
4. The top strip summarizes the biggest divergence, strongest overlap, and best next move.
5. The user can swap or promote the comparison lens into the primary slot without losing context.

### All View

1. This is a compact board for scanning every lens at once.
2. Each lens card shows only score, a one-line takeaway, and the action to inspect it more closely.
3. Sorting and filtering support scanning without forcing the user to read every card.
4. Selecting a lens keeps the active detail in sync so the user can move from overview to depth quickly.

## Detailed Implementation Plan

### Phase 1 - Establish The Interaction Model

1. Add a workspace toolbar control for `Focus`, `Compare`, and `All`.
2. Keep `selectedContextId` as the main active lens source of truth.
3. Add local UI state inside `AnalysisWorkspaceForm.tsx` for:
  - `viewMode`
  - `comparisonLensId`
  - optional density mode if the visual pass still needs it after layout cleanup
4. Preserve the current active lens when switching modes.
5. Avoid store changes in the first pass unless persistence across refreshes becomes necessary.

### Phase 2 - Rebuild Focus View As The Default

1. Reduce the lens list to a compact selector rail or compact card stack.
2. Strip duplicate explanatory copy from the lens cards.
3. Keep each lens card to a small set of fast-scanning elements:
  - lens name
  - source label
  - fit status
  - simple fit bar
  - one-line takeaway
  - selection action
4. Promote the active lens detail panel into the main reading surface.
5. Keep only the highest-value detail groups expanded by default.
6. Move lower-priority sections into collapsible groups so the user still has access to the full lens reference.

### Phase 3 - Add The One-Vs-One Compare Mode

1. Add a second lens chooser that excludes the currently active lens.
2. Build a mirrored two-column detail layout with identical headings and section order.
3. Add a small comparison summary strip above the two columns.
4. Allow quick swap and promote actions so the user can continue working without resetting their choice.
5. Reuse the same copy builders and derived insight logic where possible so the comparison stays semantically consistent with Focus view.

### Phase 4 - Add The Full Board Scan Mode

1. Convert the current all-lenses list into a denser scan board.
2. Clamp card copy to one useful sentence.
3. Add basic sort options that match user intent:
  - strongest match
  - highest leverage
  - weakest language match
4. Keep selection synchronized with the main active-lens detail state.
5. Ensure the board can collapse cleanly at drawer widths without turning into an unreadable paragraph wall.

### Phase 5 - Visual Cleanup And Eye Comfort Pass

1. Reduce background warmth and stop tinting so many surfaces.
2. Limit the workspace to three main visual layers:
  - app background
  - card/background surface
  - selected or active emphasis state
3. Darken body and muted text so the screen reads crisply instead of glowing.
4. Strengthen borders and selected states so selection does not rely on subtle warm fills.
5. Increase line-height and vertical spacing inside detail groups.
6. Improve button and badge clarity so actions read as controls, not decoration.
7. Revisit responsive thresholds so the shared extension/desktop surface behaves correctly in the 440 to 560 pixel drawer.
8. Keep the toolbar and active-lens context visually stable while the user scrolls.

### Phase 6 - Code Structure Cleanup

1. If `AnalysisWorkspaceForm.tsx` becomes harder to reason about, extract view-specific blocks into `components/analysis/` subcomponents.
2. Likely extraction candidates:
  - a view mode toolbar component
  - a focus lens rail component
  - a compare detail component
  - an all-lenses board component
3. Keep shared copy builders and evaluation helpers centralized so the UI does not fork its interpretation logic.

## File-Level Execution Map

1. `apps/extension/src/sidepanel/components/AnalysisWorkspaceForm.tsx`
  - add view-mode state and view switching
  - simplify lens-card content
  - add compare-mode selection and rendering
  - move secondary detail groups behind progressive disclosure
2. `apps/extension/src/sidepanel/styles.css`
  - refresh palette tokens and contrast
  - introduce mode-specific layout classes
  - tighten badge/button/action styling
  - tune drawer-width breakpoints and spacing
3. `apps/extension/src/sidepanel/components/AnalysisWorkspaceForm.test.tsx`
  - cover mode switching
  - cover compare-lens selection
  - cover all-view scan behavior
  - cover persistence of the active lens through mode changes
4. `apps/extension/src/sidepanel/App.tsx`
  - only adjust if wrapper or workspace copy needs alignment
5. `apps/extension/src/sidepanel/App.workspaceMode.test.tsx`
  - update only if analysis workspace entry or exit behavior changes

## Non-Goals

1. No server API or persistence schema changes.
2. No changes to criticality multiplier behavior or analysis scoring semantics.
3. No attempt to redesign unrelated panels such as Reports, Database, or Capture in this pass.
4. No visual novelty that weakens the product's job of helping the user understand and repair arguments.

## Validation

1. Run focused extension component tests:
  - `corepack pnpm --filter @argument-critic/extension exec vitest run src/sidepanel/components/AnalysisWorkspaceForm.test.tsx src/sidepanel/App.workspaceMode.test.tsx --testTimeout=20000`
2. If any shared copy or legacy analysis behavior changes materially, also run:
  - `corepack pnpm --filter @argument-critic/extension exec vitest run src/sidepanel/components/AnalysisPanel.test.tsx --testTimeout=20000`
3. Run the extension build because this workspace is shared between the extension and desktop renderer:
  - `corepack pnpm build:legacy-extension`
4. Smoke-check the Analysis workspace at desktop drawer widths before calling the work complete.

## Success Criteria

1. A first-time user can understand where to click and what the current lens is doing within a few seconds.
2. The default Focus view feels materially calmer and easier on the eyes than the current screen.
3. Compare mode makes one-vs-one reasoning faster than manually switching back and forth.
4. All view remains available for power users without becoming the default wall of text.
5. The redesign preserves the project's central purpose: help users inspect, pressure-test, and improve arguments.
