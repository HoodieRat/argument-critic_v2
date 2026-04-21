# Epistemic Analysis Implementation Plan

This file is now the working implementation plan for the epistemic-analysis expansion of Argument Critic.

It replaces the earlier minimal attachment-focused plan.

The goal is to turn Argument Critic from a system that mainly detects contradictions, ambiguity, and unsupported premises into a system that also:

- surfaces hidden assumptions
- classifies what kind of critique applies
- maps uncertainty in a structured way
- evaluates ideas relative to explicit philosophical and intellectual contexts
- helps the user distinguish logical coherence from evidentiary weakness, definitional instability, philosophical commitments, and assumption conflicts

This plan is meant to be updated as implementation proceeds.

## Status Rules

- Use `[x]` only for work that is implemented and validated.
- Use `[ ]` for remaining work.
- When a phase is partially complete, leave the phase heading unchecked and check the completed sub-items beneath it.
- Validation means at minimum: project build passes for the changed package and relevant tests pass.

## Non-Negotiable Integration Rules

- Keep the current lane and orchestration model intact.
- Add the epistemic-analysis system as an enhancement, not a parallel product.
- Preserve existing chat, critic, database, report, research-import, and attachment-analysis behavior.
- Avoid breaking current persistence, runtime startup, migrations, or sidepanel layout.
- Do not move core question generation out of the current orchestration path.
- Do not fake analysis capabilities that the backend cannot actually support.
- Keep UI changes additive and intuitive without changing the main layout structure.

## What Has Already Been Implemented

- New backend schema for epistemic analysis.
- New repositories for analysis records and context definitions.
- Built-in context seeding for six starter contexts.
- User-context library service and persistence.
- Epistemic analysis orchestration service.
- Analysis API routes.
- Critique type persistence on generated questions.
- Backend acceptance coverage for the new foundation.

## Current Best Implementation Order

1. Finish frontend type and API integration for analysis data.
2. Add the new Analysis panel and render persisted analysis results.
3. Surface critique types in the existing Questions UI.
4. Add context management UI for user-defined contexts.
5. Add familiarity controls and teach the store to persist and reload them.
6. Expand server and UI test coverage together as each visible slice lands.
7. Polish wording, visual hierarchy, and documentation.

## Master Checklist

### Phase 1: Backend Foundation
- [x] Add migration for epistemic-analysis tables and question critique type.
- [x] Add domain types for critique types, uncertainty records, context definitions, framework alignments, and familiarity signals.
- [x] Add API types for analysis responses, context management, and familiarity signals.
- [x] Add analysis repository for claims metadata, surfaced assumptions, critique classifications, uncertainty map, framework alignments, and familiarity signals.
- [x] Add context definitions repository.
- [x] Add built-in context seed definitions.
- [x] Add context library service for built-in and user-created contexts.
- [x] Add epistemic analysis orchestrator.
- [x] Wire analysis orchestration into the chat turn lifecycle.
- [x] Persist critique types on generated questions.
- [x] Register analysis routes in the server.
- [x] Validate with server build.
- [x] Validate with focused acceptance tests.

### Phase 2: Frontend Data Contracts and Store Wiring
- [x] Add analysis domain types to the extension sidepanel types.
- [x] Add API client methods for:
  - [x] get session analysis
  - [x] get turn analysis
  - [x] list contexts
  - [x] get single context
  - [x] create user context
  - [x] delete user context
  - [x] create familiarity signal
  - [x] list familiarity signals
- [x] Extend the sidepanel store with analysis state slices for:
  - [x] current session analysis snapshot
  - [x] current turn analysis snapshot
  - [x] context library
  - [x] familiarity signals
  - [x] selected analysis context
  - [x] loading and error states for analysis operations
- [x] Load session analysis when selecting or initializing a session.
- [x] Refresh analysis after sending a turn.
- [x] Refresh familiarity data after marking an item.
- [x] Keep existing flows stable if analysis data is absent.
- [x] Validate with extension build.

### Phase 3: Analysis Panel Shell
- [x] Add a new auxiliary panel entry for `analysis` in the sidepanel store.
- [x] Preserve the existing main layout while adding the new Analysis panel.
- [x] Create `AnalysisPanel.tsx` as the main container.
- [x] Add a summary header showing:
  - [x] uncertainty count
  - [x] surfaced assumption count
  - [x] loaded context count
- [x] Add internal tabs inside the Analysis panel for:
  - [x] Uncertainty Map
  - [x] Critique Breakdown
  - [x] Context Alignment
  - [x] Context Manager
- [x] Add loading, empty, and error states that are specific and readable.
- [x] Keep panel behavior coherent with current Questions/Database/Reports/Settings interaction patterns.

### Phase 4: Uncertainty Map UI
- [x] Create `UncertaintyMapTab.tsx`.
- [x] Create `UncertaintyMapItem.tsx`.
- [x] Render each uncertainty with:
  - [x] critique type badge
  - [x] affected claim preview
  - [x] affected assumption preview when present
  - [x] why-flagged explanation
  - [x] severity label or visual scale
  - [x] how-to-address label
- [x] Add filtering by critique type.
- [x] Add sorting by severity and recency.
- [x] Add expand/collapse for deeper detail.
- [x] Make empty-state wording useful rather than generic.
- [x] Ensure the UI makes it obvious that this is not the same as the question queue.

### Phase 5: Critique Breakdown UI
- [x] Create `CritiqueBreakdownTab.tsx`.
- [x] Show distribution across:
  - [x] logical coherence
  - [x] empirical gap
  - [x] definitional clarity
  - [x] philosophical premise
  - [x] assumption conflict
- [x] Add a count and description per critique type.
- [x] Show examples from the current session.
- [x] Show how each type is best resolved:
  - [x] logic
  - [x] evidence
  - [x] definition
  - [x] philosophical examination
  - [x] assumption review
- [x] Keep the visual treatment consistent with the existing sidepanel density.

### Phase 6: Context Alignment UI
- [x] Create `ContextAlignmentTab.tsx`.
- [x] Add a context selector populated from the backend context library.
- [x] Show alignment score clearly.
- [x] Show overlapping concepts between user language and context language.
- [x] Show divergences without presenting them as automatic errors.
- [x] Show leverage points for strengthening the idea within the selected context.
- [x] Make it explicit when a divergence may be intentional.
- [x] Keep room for later reframing support without forcing that UI now if it is not yet implemented.

### Phase 7: Context Manager UI
- [x] Create `ContextManagerTab.tsx`.
- [x] Show built-in contexts separately from user-created contexts.
- [x] Create `ContextAdderModal.tsx` (implemented as an inline composer section to preserve sidepanel density).
- [x] Add a simple JSON paste workflow for new contexts.
- [x] Validate JSON shape before saving.
- [x] Show actionable validation errors.
- [x] Allow deletion of user-created contexts only.
- [x] Reload context list after add/delete.
- [x] Ensure user contexts become immediately available in the Context Alignment tab.

### Phase 8: Familiarity Signals UI
- [x] Create `FamiliarityToggle.tsx`.
- [x] Add familiarity controls to uncertainty items.
- [x] Support the three intended states:
  - [x] familiar
  - [x] examined
  - [x] interested
- [x] Persist state changes through the backend.
- [x] Reload and render persisted familiarity state.
- [x] Prevent familiarity controls from cluttering the uncertainty item layout.
- [x] Make the purpose of familiarity clear: reduce repeated noise, not hide analysis permanently.

### Phase 9: Questions Panel Enhancement
- [x] Update the existing Questions panel to display critique types on targeted and active questions.
- [x] Add a compact, readable visual label for each critique type.
- [x] Ensure historical questions with null critique type still render correctly.
- [x] Avoid making the Questions panel visually busier than necessary.
- [x] Keep current answer/archive/resolve/reopen behavior unchanged.

### Phase 10: Styling and UX Polish
- [x] Add analysis styles that match the existing sidepanel visual language.
- [x] Preserve the main layout and panel structure.
- [x] Improve hierarchy so the user can quickly distinguish:
  - [x] questions
  - [x] uncertainties
  - [x] context alignments
  - [x] familiar items
- [x] Add responsive behavior for narrower sidepanel widths.
- [x] Add keyboard-accessible controls and labels.
- [x] Ensure dark/light theme compatibility if applicable in the current UI shell.
- [x] Remove awkward wording and generic helper tone from new user-facing copy.

### Phase 11: Expanded Testing
- [x] Add extension-side tests for analysis state and rendering.
- [x] Add server acceptance coverage for:
  - [x] listing built-in contexts
  - [x] creating user contexts
  - [x] deleting user contexts
  - [x] listing familiarity signals
  - [x] critique type persistence across session reload
  - [x] on-demand context alignment preview for existing sessions
- [x] Add UI or integration coverage for:
  - [x] loading Analysis panel after a critic turn
  - [x] switching sessions with analysis data
  - [x] marking familiarity and seeing it persist
  - [x] adding a context and seeing it available immediately
- [x] Re-run focused regression tests around critic mode and normal chat after each visible UI slice.

### Phase 12: Documentation and Finalization
- [x] Update the user-facing docs for the Analysis panel.
- [x] Document the built-in contexts and expected JSON shape for custom contexts.
- [x] Update acceptance-test documentation to include epistemic-analysis behavior.
- [x] Record known limitations of the first version honestly.
- [x] Mark this plan complete only after backend and frontend are both validated.

## Detailed Implementation Notes

### Backend Status Summary

The backend foundation is implemented and validated. The current system now supports:

- persisted critique classifications
- persisted uncertainty map entries
- persisted surfaced assumptions
- persisted claim metadata
- persisted framework alignments
- persisted familiarity signals
- built-in philosophical contexts
- user-defined contexts stored under runtime data
- critique types on generated questions

### Remaining Frontend Strategy

The next slice should not try to build every UI surface at once.

Best next sequence:

1. Finish sidepanel analysis types and API methods.
2. Load analysis snapshot into the store after session load and after message send.
3. Add the Analysis panel shell with only one working tab first: Uncertainty Map.
4. Add critique type badges to the Questions panel immediately after that so the user gets visible value in the existing flow.
5. Then add Context Alignment and Context Manager.
6. Add familiarity controls only after the uncertainty items are stable and readable.

That order gives the user a usable enhancement sooner and reduces the risk of building disconnected UI.

## Files Already Added or Changed in Phase 1

Backend files already involved in the completed foundation:

- `apps/server/src/services/db/migrations/007_epistemic_analysis.sql`
- `apps/server/src/services/db/repositories/AnalysisRepository.ts`
- `apps/server/src/services/db/repositories/ContextDefinitionsRepository.ts`
- `apps/server/src/services/analysis/builtinContexts.ts`
- `apps/server/src/services/analysis/ContextLibraryService.ts`
- `apps/server/src/services/analysis/critiqueTypeUtils.ts`
- `apps/server/src/services/analysis/EpistemicAnalysisOrchestrator.ts`
- `apps/server/src/routes/analysis.ts`
- `apps/server/src/services/agents/Orchestrator.ts`
- `apps/server/src/services/agents/QuestioningAgent.ts`
- `apps/server/src/services/db/repositories/QuestionsRepository.ts`
- `apps/server/src/types/domain.ts`
- `apps/server/src/types/api.ts`
- `apps/server/src/app.ts`
- `apps/server/src/index.ts`
- `apps/server/test/acceptance/analysis-foundation.test.ts`

## Validation Already Completed

- [x] `corepack pnpm build` in `apps/server`
- [x] `corepack pnpm exec vitest run test/acceptance/analysis-foundation.test.ts test/acceptance/critic-mode.test.ts --testTimeout=20000` in `apps/server`
- [x] `corepack pnpm build` in `apps/extension`
- [x] `corepack pnpm exec vitest run test/acceptance/analysis-foundation.test.ts test/acceptance/analysis-contexts.test.ts test/acceptance/question-critique-persistence.test.ts test/acceptance/critic-mode.test.ts --testTimeout=20000` in `apps/server`

## Next Slice To Implement

The best next slice is:

- [x] Split the integrated analysis UI into dedicated tab/item components if needed for maintainability.
- [x] Add deeper uncertainty drill-down and expand/collapse detail views.
- [x] Add extension-side tests for the analysis panel and familiarity flow.
- [x] Add on-demand alignment support for newly created contexts against existing sessions.
- [x] Add end-to-end UI coverage for session switching and context creation.

This is the next implementation block to continue from immediately.
