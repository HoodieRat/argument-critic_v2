import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnalysisWorkspaceForm } from "./AnalysisWorkspaceForm";
import type { ContextDefinitionRecord, SessionAnalysisSnapshot } from "../types";

const elementScrollIntoViewMock = vi.fn();

function createContext(overrides: Partial<ContextDefinitionRecord> = {}): ContextDefinitionRecord {
  return {
    id: overrides.id ?? "context-1",
    name: overrides.name ?? "phenomenology",
    source: overrides.source ?? "builtin",
    isMutable: overrides.isMutable ?? false,
    canonicalTerms: overrides.canonicalTerms ?? {},
    coreMoves: overrides.coreMoves ?? [],
    keyMetaphors: overrides.keyMetaphors ?? [],
    internalDisputes: overrides.internalDisputes ?? [],
    commonPitfalls: overrides.commonPitfalls ?? [],
    createdAt: overrides.createdAt ?? "2026-04-16T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-16T00:00:00.000Z"
  };
}

function createAnalysis(): SessionAnalysisSnapshot {
  return {
    claims: [
      {
        id: "claim-1",
        sessionId: "session-1",
        sourceMessageId: "message-1",
        claimText: "Remote work is always better than office work.",
        claimType: "empirical",
        severity: 7,
        canBeEvidenced: true,
        requiresDefinition: true,
        philosophicalStance: false,
        createdAt: "2026-04-16T00:00:00.000Z",
        updatedAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    assumptions: [
      {
        id: "assumption-1",
        sessionId: "session-1",
        sourceMessageId: "message-1",
        assumptionText: "People are always more productive alone.",
        supportsClaimText: "Remote work is always better than office work.",
        isExplicit: false,
        level: "foundational",
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    critiques: [
      {
        id: "critique-1",
        sessionId: "session-1",
        turnId: "turn-1",
        findingType: "unsupported_premise",
        critiqueType: "philosophical_premise",
        description: "Needs philosophical grounding",
        severity: 7,
        canBeResolvedVia: "philosophical_examination",
        createdAt: "2026-04-16T00:00:00.000Z"
      },
      {
        id: "critique-2",
        sessionId: "session-1",
        turnId: "turn-1",
        findingType: "unsupported_premise",
        critiqueType: "philosophical_premise",
        description: "Needs clearer assumptions",
        severity: 5,
        canBeResolvedVia: "philosophical_examination",
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    uncertainties: [
      {
        id: "uncertainty-1",
        sessionId: "session-1",
        turnId: "turn-1",
        uncertaintyType: "philosophical_premise",
        affectedClaimText: "Remote work is always better.",
        affectedAssumptionText: "People are always more productive alone.",
        whyFlagged: "The absolute claim likely overgeneralizes.",
        severity: 8,
        canBeAddressedVia: "philosophical_examination",
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    alignments: [
      {
        id: "alignment-1",
        sessionId: "session-1",
        turnId: "turn-1",
        contextId: "context-1",
        alignmentScore: 74,
        overlappingConcepts: [],
        divergences: ["No operational definition of productivity."],
        leveragePoints: ["Define productivity metrics."],
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ]
  };
}

beforeEach(() => {
  elementScrollIntoViewMock.mockReset();
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
    configurable: true
  });

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: elementScrollIntoViewMock,
    writable: true,
    configurable: true
  });
});

test("shows focus view and selected lens status in workspace", () => {
  render(
    <AnalysisWorkspaceForm
      analysis={createAnalysis()}
      turnAnalysis={null}
      contexts={[createContext()]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(screen.getByRole("button", { name: "Focus" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByText("Focus view").length).toBeGreaterThan(0);
  expect(screen.getByText("Use one lens at a time")).toBeInTheDocument();
  expect(screen.getByText("Active lens")).toBeInTheDocument();
  expect(screen.getByLabelText("Focus lens")).toHaveValue("context-1");
  expect(screen.getAllByText(/Interpretive read \(74%\)/).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Full analysis board").length).toBeGreaterThan(0);
  expect(screen.getByText("Root claims")).toBeInTheDocument();
  expect(screen.getByText("Core assumptions")).toBeInTheDocument();
  expect(screen.getByText("Weak spots and issue breakdown")).toBeInTheDocument();
});

test("changing the focus lens selector selects a different context", async () => {
  const user = userEvent.setup();
  const onSelectContext = vi.fn();
  const contextA = createContext({ id: "context-1", name: "phenomenology" });
  const contextB = createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true });

  render(
    <AnalysisWorkspaceForm
      analysis={{ ...createAnalysis(), alignments: [] }}
      turnAnalysis={null}
      contexts={[contextA, contextB]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={onSelectContext}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  await user.selectOptions(screen.getByLabelText("Focus lens"), "context-2");

  expect(onSelectContext).toHaveBeenCalledWith("context-2");
});

test("shows single-category explanatory text when only one critique type is present", () => {
  render(
    <AnalysisWorkspaceForm
      analysis={createAnalysis()}
      turnAnalysis={null}
      contexts={[createContext()]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(screen.getByText("Only one critique category detected for this argument.")).toBeInTheDocument();
});

test("falls back to uncertainty-derived issue breakdown when critique rows are absent", () => {
  render(
    <AnalysisWorkspaceForm
      analysis={{ ...createAnalysis(), critiques: [] }}
      turnAnalysis={null}
      contexts={[createContext()]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(screen.getByText("Summary derived from the current weak spots because no critique classifications are available for this run yet.")).toBeInTheDocument();
  expect(screen.getByText("philosophical examination")).toBeInTheDocument();
  expect(screen.getByText("1 issue(s)")).toBeInTheDocument();
  expect(screen.queryByText("Only one critique category detected for this argument.")).not.toBeInTheDocument();
});

test("shows active lens detail content for the selected context", () => {
  render(
    <AnalysisWorkspaceForm
      analysis={createAnalysis()}
      turnAnalysis={null}
      contexts={[
        createContext({
          canonicalTerms: { evidence: "what the lens treats as support" },
          coreMoves: ["clarify support requirements"],
          keyMetaphors: ["burden of proof"]
        })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(screen.getByText("Active lens detail")).toBeInTheDocument();
  expect(screen.getByText("How this lens reads the argument right now")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Notices/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: /Pressure/i })).toHaveAttribute("aria-selected", "false");
  expect(screen.getByRole("tab", { name: /Questions/i })).toHaveAttribute("aria-selected", "false");
  expect(screen.getByText("Lens reference")).toBeInTheDocument();
});

test("compare view excludes the active lens from the comparison picker and supports promoting the comparison lens", async () => {
  const user = userEvent.setup();
  const onSelectContext = vi.fn();

  render(
    <AnalysisWorkspaceForm
      analysis={{
        ...createAnalysis(),
        alignments: [
          ...createAnalysis().alignments,
          {
            id: "alignment-2",
            sessionId: "session-1",
            turnId: "turn-1",
            contextId: "context-2",
            alignmentScore: 41,
            overlappingConcepts: [],
            divergences: ["Looks for incentives rather than lived experience."],
            leveragePoints: ["State the tradeoff the claim is optimizing for."],
            createdAt: "2026-04-16T00:00:00.000Z"
          }
        ]
      }}
      turnAnalysis={null}
      contexts={[
        createContext({ id: "context-1", name: "phenomenology" }),
        createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={onSelectContext}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  await user.click(screen.getByRole("button", { name: "Compare" }));

  expect(screen.getAllByText("Compare view").length).toBeGreaterThan(0);
  const comparisonSelect = screen.getByLabelText("Comparison lens");
  const options = within(comparisonSelect).getAllByRole("option");
  expect(options).toHaveLength(1);
  expect(options[0]).toHaveTextContent("economics");
  expect(within(comparisonSelect).queryByRole("option", { name: "phenomenology" })).not.toBeInTheDocument();

  const comparisonSnapshot = screen.getByText("Comparison snapshot").closest("details");
  const comparisonDetail = screen.getByText("Comparison lens detail").closest("details");
  expect(comparisonSnapshot).not.toHaveAttribute("open");
  expect(comparisonDetail).not.toHaveAttribute("open");

  await user.click(screen.getByText("Comparison snapshot"));
  expect(comparisonSnapshot).toHaveAttribute("open");

  await user.click(screen.getByText("Comparison lens detail"));
  expect(comparisonDetail).toHaveAttribute("open");
  expect(screen.getByText("How this comparison lens reads the same argument")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Make comparison lens primary" }));

  expect(onSelectContext).toHaveBeenCalledWith("context-2");
});

test("all view shows the sort controls and inspect action", async () => {
  const user = userEvent.setup();

  render(
    <AnalysisWorkspaceForm
      analysis={{
        ...createAnalysis(),
        alignments: [
          ...createAnalysis().alignments,
          {
            id: "alignment-2",
            sessionId: "session-1",
            turnId: "turn-1",
            contextId: "context-2",
            alignmentScore: 12,
            overlappingConcepts: [],
            divergences: ["Leaves the economic tradeoff implicit."],
            leveragePoints: ["State the comparative cost explicitly."],
            createdAt: "2026-04-16T00:00:00.000Z"
          },
          {
            id: "alignment-3",
            sessionId: "session-1",
            turnId: "turn-1",
            contextId: "context-3",
            alignmentScore: 67,
            overlappingConcepts: [
              {
                userPhrase: "always better",
                contextPhrase: "utility maximizing",
                rationale: "The claim is already framed as a maximizing choice."
              }
            ],
            divergences: [],
            leveragePoints: ["Specify the utility measure driving the claim."],
            createdAt: "2026-04-16T00:00:00.000Z"
          }
        ]
      }}
      turnAnalysis={null}
      contexts={[
        createContext({ id: "context-1", name: "phenomenology" }),
        createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true }),
        createContext({ id: "context-3", name: "decision_theory" })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  await user.click(screen.getByRole("button", { name: "All" }));

  expect(screen.getAllByText("All view").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Strongest match" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Highest leverage" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Needs the most help" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText(/Sorting by strongest match:/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open detail" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Inspect lens" }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("decision_theory").length).toBeGreaterThan(0);

  const allViewDrawer = screen.getByText("Inspecting phenomenology").closest("details");
  expect(allViewDrawer).not.toHaveAttribute("open");

  await user.click(screen.getByRole("button", { name: "Open detail" }));

  expect(allViewDrawer).toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Viewing detail" })).toBeInTheDocument();
});

test("all view sort modes produce visibly different board ordering", async () => {
  const user = userEvent.setup();

  render(
    <AnalysisWorkspaceForm
      analysis={{
        ...createAnalysis(),
        alignments: [
          {
            id: "alignment-1",
            sessionId: "session-1",
            turnId: "turn-1",
            contextId: "context-1",
            alignmentScore: 82,
            overlappingConcepts: [
              {
                userPhrase: "always better",
                contextPhrase: "lived coherence",
                rationale: "The claim already uses a lens-friendly framing."
              },
              {
                userPhrase: "productive",
                contextPhrase: "experience",
                rationale: "The wording already ties the claim to lived experience."
              }
            ],
            divergences: [],
            leveragePoints: ["Name the concrete experience the claim is optimizing for."],
            createdAt: "2026-04-16T00:00:00.000Z"
          },
          {
            id: "alignment-2",
            sessionId: "session-1",
            turnId: "turn-1",
            contextId: "context-2",
            alignmentScore: 29,
            overlappingConcepts: [],
            divergences: [
              "Leaves the tradeoff unpriced.",
              "Treats productivity as self-evident."
            ],
            leveragePoints: [
              "State the tradeoff explicitly.",
              "Name the decision rule.",
              "Say what cost is being ignored."
            ],
            createdAt: "2026-04-16T00:00:00.000Z"
          },
          {
            id: "alignment-3",
            sessionId: "session-1",
            turnId: "turn-1",
            contextId: "context-3",
            alignmentScore: 61,
            overlappingConcepts: [
              {
                userPhrase: "better",
                contextPhrase: "utility",
                rationale: "The wording already hints at comparative utility."
              }
            ],
            divergences: ["The utility measure is left implicit."],
            leveragePoints: ["Specify the utility measure driving the claim."],
            createdAt: "2026-04-16T00:00:00.000Z"
          }
        ]
      }}
      turnAnalysis={null}
      contexts={[
        createContext({ id: "context-1", name: "phenomenology" }),
        createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true }),
        createContext({ id: "context-3", name: "decision_theory" }),
        createContext({ id: "context-4", name: "pragmatism" })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  await user.click(screen.getByRole("button", { name: "All" }));

  const board = screen.getByRole("list", { name: "All lenses board" });
  const getBoardOrder = () => within(board).getAllByRole("listitem").map((item) => within(item).getByRole("heading").textContent);

  expect(getBoardOrder()).toEqual(["phenomenology", "decision_theory", "economics", "pragmatism"]);

  await user.click(screen.getByRole("button", { name: "Highest leverage" }));

  expect(screen.getByText(/Sorting by highest leverage:/)).toBeInTheDocument();
  expect(getBoardOrder()).toEqual(["economics", "decision_theory", "phenomenology", "pragmatism"]);

  await user.click(screen.getByRole("button", { name: "Needs the most help" }));

  expect(screen.getByText(/Sorting by needs the most help:/)).toBeInTheDocument();
  expect(getBoardOrder()).toEqual(["economics", "decision_theory", "pragmatism", "phenomenology"]);
});

test("switching view modes resets the workspace to the top", async () => {
  const user = userEvent.setup();
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
    configurable: true
  });

  render(
    <AnalysisWorkspaceForm
      analysis={createAnalysis()}
      turnAnalysis={null}
      contexts={[
        createContext({ id: "context-1", name: "phenomenology" }),
        createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(window.scrollTo).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Compare" }));

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
});

test("quick navigation scrolls to deeper analysis sections", async () => {
  const user = userEvent.setup();

  render(
    <AnalysisWorkspaceForm
      analysis={createAnalysis()}
      turnAnalysis={null}
      contexts={[
        createContext({ id: "context-1", name: "phenomenology" }),
        createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  await user.click(screen.getByRole("button", { name: "All" }));
  await user.click(screen.getByText("Jump to section"));
  await user.click(screen.getByRole("button", { name: /Weak spots/i }));

  expect(elementScrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
});

test("initial render does not auto-center the selected lens card", () => {
  const scrollIntoViewMock = vi.fn();
  const focusMock = vi.fn();

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: scrollIntoViewMock,
    writable: true,
    configurable: true
  });
  Object.defineProperty(HTMLElement.prototype, "focus", {
    value: focusMock,
    writable: true,
    configurable: true
  });

  render(
    <AnalysisWorkspaceForm
      analysis={{ ...createAnalysis(), alignments: [] }}
      turnAnalysis={null}
      contexts={[
        createContext({ id: "context-1", name: "phenomenology" }),
        createContext({ id: "context-2", name: "economics", source: "user-created", isMutable: true })
      ]}
      familiarities={[]}
      alignmentPreviews={{}}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(scrollIntoViewMock).not.toHaveBeenCalled();
  expect(focusMock).not.toHaveBeenCalled();
});

test("uses preview-map data when a context has no persisted alignment", () => {
  render(
    <AnalysisWorkspaceForm
      analysis={{ ...createAnalysis(), alignments: [] }}
      turnAnalysis={null}
      contexts={[createContext({ coreMoves: ["trace the practical consequences"] })]}
      familiarities={[]}
      alignmentPreviews={{
        "context-1": {
          alignment: {
            id: "preview-1",
            sessionId: "session-1",
            turnId: "preview:message-1",
            contextId: "context-1",
            alignmentScore: 22,
            overlappingConcepts: [
              {
                userPhrase: "productivity",
                contextPhrase: "practical consequences",
                rationale: "The wording already points toward practical consequences."
              }
            ],
            divergences: [],
            leveragePoints: ["Ask what concrete difference the claim makes in practice."],
            createdAt: "2026-04-16T00:00:00.000Z"
          },
          evaluation: {
            state: "direct_match",
            label: "Direct language match",
            summary: "The wording already points toward practical consequences.",
            rationale: "This read is grounded in explicit overlap from the latest wording.",
            evidence: ["productivity -> practical consequences"]
          },
          sourceMessageId: "message-1",
          sourceExcerpt: "Remote work changes productivity in practice."
        }
      }}
      alignmentPreviewLoading={false}
      selectedContextId="context-1"
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
      onExit={() => undefined}
    />
  );

  expect(screen.getByText("Reading this text: Remote work changes productivity in practice.")).toBeInTheDocument();
  expect(screen.getAllByText(/Direct language match \(22%\)/).length).toBeGreaterThan(0);
  expect(screen.getAllByText("The wording already points toward practical consequences.").length).toBeGreaterThan(0);
});
