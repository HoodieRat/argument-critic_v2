# Reports V2 Ship Pass

- [x] Rebuild the Reports workspace so the latest report is the primary surface and older reports move into compact history instead of taking over the panel.
- [x] Add easy report cleanup with selected delete and session-scoped clear-history controls directly inside the Reports workspace.
- [x] Upgrade procedural reports so overview, contradiction, and research outputs expose clearer grounding from stored session data.
- [x] Replace analysis "repair" framing with pressure-point and priority language that matches the product's actual job.
- [x] Add focused report tests and rerun targeted validation and builds for the v2 shipping pass.

# Startup Theme And Lens Signal Repair Pass

- [x] Eliminate the startup theme flash by applying the persisted theme and density before first paint instead of rendering studio first and swapping later.
- [x] Clarify lens-signal wording so heuristic matches and non-direct matches read as intended analysis states rather than apparent failures.
- [x] Add narrow heuristic hooks for claim-structure lenses so prompts like the current procedural-art example surface the expected analytic and formal pressure more reliably.
- [x] Stabilize the session combobox sizing in the narrow drawer so it does not balloon when the layout collapses back down.
- [x] Add narrow validation for the persisted theme boot path and the revised lens-signal behavior, then rerun focused tests and builds.

# Analysis Theming And Breakdown Repair Pass

- [x] Fix the analysis issue-breakdown summary so it shows meaningful fallback cards and bars when the current run has uncertainty items but no critique rows.
- [x] Retheme the focus/detail/disclosure analysis surfaces so they stop falling back to bright washed-out cards and instead match the active theme with stronger contrasting borders.
- [x] Add proper spacing and border separation to the focus lens controls, detail panels, and analysis cards so the layout stops feeling crammed.
- [x] Separate the Notices, Pressure, and Questions labels from their numeric badges so the counts read as badges instead of jammed text.
- [x] Extend the focused analysis tests for the new breakdown fallback behavior, then rerun narrow renderer validation and builds.

# Theme And Contrast Stabilization Pass

- [x] Add an always-visible top header theme selector using three small colored dots so theme choice is available immediately on project open.
- [x] Rework chat/session/model selector spacing, borders, and field surfaces so controls stop feeling crammed and match the active theme.
- [x] Normalize panel/card borders, spacing, and surface contrast across chat, questions, history, reports, and analysis so bright clashing panels disappear.
- [x] Fix the analysis-to-questions return path so leaving Analysis resets cleanly and does not preserve the broken scrolled/reflowed state.
- [x] Extend focused renderer tests for the theme selector and the analysis exit behavior, then rerun targeted tests and builds.

# Non-Analysis Sidepanel Compaction Pass

- [x] Repack the shared sidepanel shell so chat, composer, model controls, and workspace panels fit the drawer width more efficiently.
- [x] Polish `SessionHeader.tsx` so the top shell stays compact and readable in the 440-560 px drawer range.
- [x] Rework `ChatView.tsx` and `AttachmentStrip.tsx` so more transcript and composer controls fit on screen before scrolling.
- [x] Convert `SettingsPanel.tsx` into a compact control board with visible theme and density controls instead of a long single-column form.
- [x] Refresh `QuestionHistoryPanel.tsx` so active and historical question cards fit more cleanly in the drawer without losing key actions.
- [x] Normalize `ReportsPanel.tsx`, `DatabasePanel.tsx`, `CaptureControls.tsx`, and `CaptureStatusCard.tsx` so compact mode is dense but still legible.
- [x] Restore the root theme and density wiring in the shared sidepanel app and move the major shell surfaces onto shared theme/density tokens.
- [x] Add or extend focused renderer tests for the workspace shell, chat, settings, and question/history surfaces.
- [x] Rebuild the legacy extension target.
- [x] Rebuild the desktop and server workspace.
- [x] Complete the final narrow-vs-stretched screenshot audit over a local HTTP-served renderer and confirm compact and comfortable both hold up.

# Desktop-First Migration Plan

- [x] Write the focused desktop migration plan before implementation and keep it synced during work.
- [x] Add a dedicated desktop shell that reuses the existing server and React app instead of launching Chrome as the main product surface.
- [x] Replace extension-only UI hooks with platform adapters so the same app works in the desktop drawer while preserving the legacy browser helper as an optional compatibility path.
- [x] Update the Windows install and start launchers so they prebuild the desktop app once and start quickly afterward.
- [x] Update the run guide and in-app wording so the normal user flow is desktop-first and no longer centered on the extension.
- [x] Verify the desktop path with dependency install, build, tests, and a launcher smoke test, then mark the checklist complete.