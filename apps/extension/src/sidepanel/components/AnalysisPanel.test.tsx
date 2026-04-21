import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnalysisPanel } from "./AnalysisPanel";
import type { AnalysisContextPreview, ContextDefinitionRecord, SessionAnalysisSnapshot } from "../types";

function createContext(overrides: Partial<ContextDefinitionRecord> = {}): ContextDefinitionRecord {
  return {
    id: overrides.id ?? "context-1",
    name: overrides.name ?? "phenomenology",
    source: overrides.source ?? "builtin",
    isMutable: overrides.isMutable ?? false,
    canonicalTerms: overrides.canonicalTerms ?? { embodiment: "lived bodily experience" },
    coreMoves: overrides.coreMoves ?? ["trace lived experience before abstract theory"],
    keyMetaphors: overrides.keyMetaphors ?? [],
    internalDisputes: overrides.internalDisputes ?? [],
    commonPitfalls: overrides.commonPitfalls ?? [],
    createdAt: overrides.createdAt ?? "2026-04-16T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-16T00:00:00.000Z"
  };
}

function createAnalysis(overrides: Partial<SessionAnalysisSnapshot> = {}): SessionAnalysisSnapshot {
  return {
    claims: overrides.claims ?? [
      {
        id: "claim-1",
        sessionId: "session-1",
        sourceMessageId: "message-1",
        claimText: "Meaning depends on the observer's lived relation to the world.",
        claimType: "philosophical",
        severity: 6,
        canBeEvidenced: false,
        requiresDefinition: true,
        philosophicalStance: true,
        createdAt: "2026-04-16T00:00:00.000Z",
        updatedAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    assumptions: overrides.assumptions ?? [
      {
        id: "assumption-1",
        sessionId: "session-1",
        sourceMessageId: "message-1",
        assumptionText: "Embodiment shapes meaning.",
        supportsClaimText: "Meaning depends on the observer's lived relation to the world.",
        isExplicit: false,
        level: "foundational",
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    critiques: overrides.critiques ?? [
      {
        id: "critique-1",
        sessionId: "session-1",
        turnId: "turn-1",
        findingType: "unsupported_premise",
        critiqueType: "philosophical_premise",
        description: "The claim depends on a philosophical premise that has not been defended.",
        severity: 7,
        canBeResolvedVia: "philosophical_examination",
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    uncertainties: overrides.uncertainties ?? [
      {
        id: "uncertainty-1",
        sessionId: "session-1",
        turnId: "turn-1",
        uncertaintyType: "philosophical_premise",
        affectedClaimText: "Meaning depends on the observer's lived relation to the world.",
        affectedAssumptionText: "Embodiment shapes meaning.",
        whyFlagged: "This turn relies on an unstated philosophical premise.",
        severity: 7,
        canBeAddressedVia: "philosophical_examination",
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ],
    alignments: overrides.alignments ?? [
      {
        id: "alignment-1",
        sessionId: "session-1",
        turnId: "turn-1",
        contextId: "context-1",
        alignmentScore: 68,
        overlappingConcepts: [
          {
            userPhrase: "observer",
            contextPhrase: "lived bodily experience",
            rationale: "The language overlaps with phenomenological concerns."
          }
        ],
        divergences: ["The claim still abstracts away from embodiment."],
        leveragePoints: ["Name the lived bodily dimension explicitly."],
        createdAt: "2026-04-16T00:00:00.000Z"
      }
    ]
  };
}

function renderPanel(options?: {
  analysis?: SessionAnalysisSnapshot;
  contexts?: ContextDefinitionRecord[];
  alignmentPreview?: AnalysisContextPreview | null;
  selectedContextId?: string | null;
  familiarities?: Array<{ id: string; sessionId: string; uncertaintyId: string | null; assumptionId: string | null; claimId: string | null; signalType: "familiar" | "examined" | "interested"; userNote: string | null; createdAt: string }>;
  onCreateContext?: (input: { name: string; canonicalTerms: Record<string, string>; coreMoves: string[]; keyMetaphors: string[]; internalDisputes: Array<{ position: string; proponents: string[]; briefDescription: string }>; commonPitfalls: string[] }) => Promise<void>;
  onMarkFamiliarity?: (input: { uncertaintyId?: string; assumptionId?: string; claimId?: string; signalType: "familiar" | "examined" | "interested"; userNote?: string }) => Promise<void>;
}) {
  const context = createContext();
  const defaultAnalysis = options?.analysis ?? createAnalysis();
  return render(
    <AnalysisPanel
      analysis={defaultAnalysis}
      turnAnalysis={null}
      contexts={options?.contexts ?? [context]}
      familiarities={options?.familiarities ?? []}
      alignmentPreview={options?.alignmentPreview ?? null}
      alignmentPreviewLoading={false}
      selectedContextId={options?.selectedContextId ?? context.id}
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={options?.onCreateContext ?? (async () => undefined)}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={options?.onMarkFamiliarity ?? (async () => undefined)}
    />
  );
}

test("renders analysis state and expands uncertainty detail", async () => {
  const user = userEvent.setup();
  renderPanel();

  expect(screen.getByText("1 uncertainties")).toBeInTheDocument();
  expect(screen.getByText(/Meaning depends on the observer's lived relation to the world\./)).toBeInTheDocument();
  expect(screen.queryByText("Assumption: Embodiment shapes meaning.")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Show detail" }));

  expect(screen.getByText("Assumption: Embodiment shapes meaning.")).toBeInTheDocument();
  expect(screen.getByText("Why flagged: This turn relies on an unstated philosophical premise.")).toBeInTheDocument();
});

test("cycles familiarity through the analysis panel control", async () => {
  const user = userEvent.setup();
  const onMarkFamiliarity = vi.fn<Parameters<NonNullable<Parameters<typeof renderPanel>[0]>["onMarkFamiliarity"]>, ReturnType<NonNullable<Parameters<typeof renderPanel>[0]>["onMarkFamiliarity"]>>().mockResolvedValue(undefined);
  renderPanel({ onMarkFamiliarity });

  await user.click(screen.getByRole("button", { name: "Mark familiarity" }));

  expect(onMarkFamiliarity).toHaveBeenCalledWith({ uncertaintyId: "uncertainty-1", signalType: "interested" });
});

test("shows preview alignment and updates when session-like props change", async () => {
  const previewContext = createContext({ id: "context-preview", name: "custom semantics", source: "user-created", isMutable: true });
  const preview: AnalysisContextPreview = {
    alignment: {
      id: "preview-1",
      sessionId: "session-2",
      turnId: "preview:message-2",
      contextId: previewContext.id,
      alignmentScore: 54,
      overlappingConcepts: [],
      divergences: ["The framing does not yet explain how wording shifts interpretation."],
      leveragePoints: ["Define how the metaphor changes interpretation space."],
      createdAt: "2026-04-16T00:00:00.000Z"
    },
    sourceMessageId: "message-2",
    sourceExcerpt: "The resonance of a metaphor changes the interpretation space."
  };

  const rendered = renderPanel({
    analysis: createAnalysis({ alignments: [] }),
    contexts: [previewContext],
    alignmentPreview: preview,
    selectedContextId: previewContext.id
  });

  expect(screen.getByText(/Preview based on the latest user turn/)).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "custom semantics" })).toBeInTheDocument();

  rendered.rerender(
    <AnalysisPanel
      analysis={createAnalysis({
        uncertainties: [
          {
            id: "uncertainty-2",
            sessionId: "session-2",
            turnId: "turn-2",
            uncertaintyType: "empirical_gap",
            affectedClaimText: "A testable consequence is missing.",
            affectedAssumptionText: null,
            whyFlagged: "The claim needs empirical support.",
            severity: 5,
            canBeAddressedVia: "evidence",
            createdAt: "2026-04-16T00:00:00.000Z"
          }
        ],
        alignments: []
      })}
      turnAnalysis={null}
      contexts={[previewContext]}
      familiarities={[]}
      alignmentPreview={preview}
      alignmentPreviewLoading={false}
      selectedContextId={previewContext.id}
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={async () => undefined}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
    />
  );

  expect(screen.getByText(/A testable consequence is missing\./)).toBeInTheDocument();
});

test("creates a context from JSON and makes it available in the alignment picker after rerender", async () => {
  const user = userEvent.setup();
  const onCreateContext = vi.fn<Parameters<NonNullable<Parameters<typeof renderPanel>[0]>["onCreateContext"]>, ReturnType<NonNullable<Parameters<typeof renderPanel>[0]>["onCreateContext"]>>().mockResolvedValue(undefined);
  const rendered = renderPanel({ onCreateContext });

  await user.type(screen.getByLabelText("Perspective name"), "custom semantics");
  await user.type(screen.getByLabelText("What this perspective cares about (one idea per line)"), "trace how wording changes interpretation");
  await user.type(screen.getByLabelText("Key terms (optional, format: term:plain explanation)"), "resonance:how wording carries meaning");
  await user.type(screen.getByLabelText("Common blind spots to watch for (optional)"), "treating metaphor as decorative");

  await user.click(screen.getByRole("button", { name: "Save perspective" }));

  expect(onCreateContext).toHaveBeenCalledWith({
    name: "custom semantics",
    canonicalTerms: { resonance: "how wording carries meaning" },
    coreMoves: ["trace how wording changes interpretation"],
    keyMetaphors: [],
    internalDisputes: [],
    commonPitfalls: ["treating metaphor as decorative"]
  });

  const builtin = createContext();
  const custom = createContext({ id: "context-2", name: "custom semantics", source: "user-created", isMutable: true });

  rendered.rerender(
    <AnalysisPanel
      analysis={createAnalysis({ alignments: [] })}
      turnAnalysis={null}
      contexts={[builtin, custom]}
      familiarities={[]}
      alignmentPreview={null}
      alignmentPreviewLoading={false}
      selectedContextId={custom.id}
      busy={false}
      onSelectContext={() => undefined}
      onCreateContext={onCreateContext}
      onDeleteContext={async () => undefined}
      onMarkFamiliarity={async () => undefined}
    />
  );

  expect(screen.getByRole("option", { name: "custom semantics" })).toBeInTheDocument();
});