# UI Upgrade Implementation Plan

Goal: make analysis obvious, roomy, and understandable for regular users without changing criticality/output behavior.

## Scope

1. Surface analysis insights so they are visible even when not in the Analysis tab.
2. Add a dynamic, roomy analysis layout mode.
3. Redesign Context Alignment into plain-language visual guidance.
4. Redesign Context Manager into a guided Perspective Library with advanced JSON hidden behind an optional toggle.
5. Improve uncertainty-map readability and add a spacious view mode.
6. Keep existing backend contracts and criticality controls unchanged.

## Implementation Steps

1. Update sidepanel shell layout and add an always-visible analysis summary card.
2. Add analysis workspace focus mode and widen layout when analysis is active.
3. Refactor Analysis panel headings/copy for plain language.
4. Refactor Context Alignment tab:
   - Rename section language for regular users.
   - Add derived percentage bars for fit dimensions.
   - Keep overlap/divergence/leverage details but reword.
5. Refactor Context Manager tab:
   - Rename to Perspective Library.
   - Add guided form fields for non-technical users.
   - Keep JSON in an Advanced section.
6. Refactor Uncertainty Map tab:
   - Add quick “top issues first” guidance.
   - Add roomy view mode for breathing room.
7. Update CSS for responsive dynamic arrangement and new chart blocks.
8. Update extension component tests for new labels and flows.
9. Validate with extension tests and extension build.

## Validation

1. `corepack pnpm --filter @argument-critic/extension exec vitest run src/sidepanel/components/AnalysisPanel.test.tsx --testTimeout=20000`
2. `corepack pnpm --filter @argument-critic/extension build`

## Non-Goals

1. No changes to criticality multiplier behavior.
2. No backend schema/API changes unless strictly required by UI wiring.
3. No changes to model output policies.
