import { randomUUID } from "node:crypto";

import type {
  ClaimMetadataRecord,
  ContextDefinitionRecord,
  CritiqueClassificationRecord,
  CritiqueType,
  FamiliaritySignalRecord,
  FrameworkAlignmentRecord,
  SurfacedAssumptionRecord,
  UncertaintyMapRecord
} from "../../types/domain.js";
import { nowIso } from "../../utils/time.js";
import { AnalysisRepository } from "../db/repositories/AnalysisRepository.js";
import { ContextDefinitionsRepository } from "../db/repositories/ContextDefinitionsRepository.js";
import { classifyCritiqueType, resolvePathForCritiqueType } from "./critiqueTypeUtils.js";
import type { CriticResult } from "../agents/CriticAgent.js";
import type { StructuredArgument } from "../agents/ArgumentStructurerAgent.js";

interface BuildAnalysisInput {
  readonly sessionId: string;
  readonly turnId: string;
  readonly message: string;
  readonly structured: StructuredArgument;
  readonly criticResult: CriticResult;
}

interface WeightedAlignmentMatch {
  readonly userPhrase: string;
  readonly contextPhrase: string;
  readonly rationale: string;
  readonly weight: number;
}

interface ContextSignalProfile {
  readonly label: string;
  readonly phrases: string[];
  readonly rationale: string;
  readonly weight: number;
  readonly minimumMatches?: number;
}

export type AlignmentEvaluationState = "unavailable" | "direct_match" | "heuristic_read" | "low_signal";

export interface AlignmentEvaluation {
  readonly state: AlignmentEvaluationState;
  readonly label: string;
  readonly summary: string;
  readonly rationale: string;
  readonly evidence: string[];
}

export interface AlignmentPreviewResult {
  readonly alignment: FrameworkAlignmentRecord;
  readonly evaluation: AlignmentEvaluation;
}

const TOKEN_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "almost",
  "also",
  "always",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "first",
  "from",
  "into",
  "just",
  "might",
  "other",
  "should",
  "since",
  "still",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "until",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would"
]);

const CONTEXT_SIGNAL_PROFILES: Record<string, ContextSignalProfile[]> = {
  phenomenology: [
    {
      label: "lived experience",
      phrases: ["experience", "perception", "observer", "observed", "subject", "appearance", "consciousness", "meaning"],
      rationale: "The argument already leans on lived experience or how things appear.",
      weight: 14,
      minimumMatches: 2
    },
    {
      label: "embodiment",
      phrases: ["body", "embodied", "felt", "situated"],
      rationale: "The framing points toward embodiment rather than detached description.",
      weight: 10,
      minimumMatches: 1
    }
  ],
  pragmatism: [
    {
      label: "practical consequences",
      phrases: ["practice", "practical", "consequence", "effect", "result", "outcome", "works", "useful"],
      rationale: "The argument already talks in terms of consequences, use, or what works in practice.",
      weight: 14,
      minimumMatches: 2
    },
    {
      label: "inquiry and testing",
      phrases: ["test", "testing", "inquiry", "experiment", "try", "revise"],
      rationale: "The wording suggests an inquiry-oriented way of checking the claim.",
      weight: 10,
      minimumMatches: 1
    }
  ],
  epistemology: [
    {
      label: "justification",
      phrases: ["evidence", "justify", "justification", "reason", "reasons", "support", "belief", "knowledge"],
      rationale: "The claim is already framed in terms of justification, belief, or evidence.",
      weight: 14,
      minimumMatches: 2
    },
    {
      label: "certainty and doubt",
      phrases: ["certainty", "certain", "doubt", "reliable", "truth"],
      rationale: "The message raises an epistemic question about certainty, reliability, or truth.",
      weight: 10,
      minimumMatches: 1
    }
  ],
  systems_theory: [
    {
      label: "interactions and structure",
      phrases: ["system", "interaction", "interactions", "network", "structure", "pattern", "emerge", "emergent"],
      rationale: "The argument already describes interacting parts rather than isolated causes.",
      weight: 14,
      minimumMatches: 2
    },
    {
      label: "feedback and boundaries",
      phrases: ["feedback", "loop", "loops", "boundary", "boundaries", "interdependence"],
      rationale: "The wording points toward feedback, boundaries, or recursive effects.",
      weight: 10,
      minimumMatches: 1
    }
  ],
  analytic_philosophy: [
    {
      label: "conceptual clarification",
      phrases: ["define", "definition", "meaning", "term", "terms", "concept", "distinction", "clarify"],
      rationale: "The argument depends on clarifying concepts or sharpening how terms are used.",
      weight: 14,
      minimumMatches: 2
    },
    {
      label: "language and form",
      phrases: ["language", "wording", "claim", "assertion", "ambiguity"],
      rationale: "The current wording invites analysis of language use and logical form.",
      weight: 10,
      minimumMatches: 1
    }
  ],
  logic_and_formal_systems: [
    {
      label: "argument structure",
      phrases: ["if", "then", "therefore", "implies", "entails", "premise", "premises", "conclusion"],
      rationale: "The message is already written in an explicitly inferential form.",
      weight: 14,
      minimumMatches: 2
    },
    {
      label: "validity and contradiction",
      phrases: ["valid", "validity", "contradiction", "consistent", "rule", "proof"],
      rationale: "The wording invites a formal check for contradiction, validity, or rule-following.",
      weight: 10,
      minimumMatches: 1
    }
  ]
};

export interface PendingEpistemicAnalysis {
  readonly claims: Omit<ClaimMetadataRecord, "sessionId" | "sourceMessageId">[];
  readonly assumptions: Omit<SurfacedAssumptionRecord, "sessionId" | "sourceMessageId">[];
  readonly critiques: Omit<CritiqueClassificationRecord, "sessionId">[];
  readonly uncertainties: Omit<UncertaintyMapRecord, "sessionId">[];
  readonly alignments: Omit<FrameworkAlignmentRecord, "sessionId">[];
}

export class EpistemicAnalysisOrchestrator {
  public constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly contextDefinitionsRepository: ContextDefinitionsRepository
  ) {}

  public build(input: BuildAnalysisInput): PendingEpistemicAnalysis {
    const claims = this.buildClaimMetadata(input.structured, input.message);
    const assumptions = this.buildSurfacedAssumptions(input.structured, input.message);
    const critiques = this.buildCritiqueClassifications(input.sessionId, input.turnId, input.criticResult);
    const uncertainties = this.buildUncertaintyMap(input.turnId, critiques, claims, assumptions);
    const alignments = this.buildFrameworkAlignments(input.turnId, input.message, this.contextDefinitionsRepository.listAll());

    return {
      claims,
      assumptions,
      critiques,
      uncertainties,
      alignments
    };
  }

  public persist(sessionId: string, userMessageId: string, analysis: PendingEpistemicAnalysis) {
    const claims: ClaimMetadataRecord[] = analysis.claims.map((record) => ({ ...record, sessionId, sourceMessageId: userMessageId }));
    const assumptions: SurfacedAssumptionRecord[] = analysis.assumptions.map((record) => ({ ...record, sessionId, sourceMessageId: userMessageId }));
    const critiques: CritiqueClassificationRecord[] = analysis.critiques.map((record) => ({ ...record, sessionId }));
    const uncertainties: UncertaintyMapRecord[] = analysis.uncertainties.map((record) => ({ ...record, sessionId }));
    const alignments: FrameworkAlignmentRecord[] = analysis.alignments.map((record) => ({ ...record, sessionId }));

    this.analysisRepository.createClaimsMetadata(claims);
    this.analysisRepository.createSurfacedAssumptions(assumptions);
    this.analysisRepository.createCritiqueClassifications(critiques);
    this.analysisRepository.createUncertaintyMap(uncertainties);
    this.analysisRepository.createFrameworkAlignments(alignments);

    return {
      claims,
      assumptions,
      critiques,
      uncertainties,
      alignments
    };
  }

  public listSession(sessionId: string) {
    return this.analysisRepository.getSessionSnapshot(sessionId);
  }

  public listTurn(turnId: string) {
    return this.analysisRepository.getTurnSnapshot(turnId);
  }

  public markFamiliarity(input: Omit<FamiliaritySignalRecord, "id" | "createdAt">): FamiliaritySignalRecord {
    return this.analysisRepository.createFamiliaritySignal({
      ...input,
      id: randomUUID(),
      createdAt: nowIso()
    });
  }

  public listFamiliarities(sessionId: string): FamiliaritySignalRecord[] {
    return this.analysisRepository.listFamiliarities(sessionId);
  }

  public previewAlignment(input: {
    readonly sessionId: string;
    readonly message: string;
    readonly context: ContextDefinitionRecord;
    readonly sourceId: string;
  }): AlignmentPreviewResult {
    const alignment = {
      ...this.buildFrameworkAlignmentSeed(input.sourceId, input.message, input.context),
      sessionId: input.sessionId
    };

    return {
      alignment,
      evaluation: this.evaluateAlignment(input.context, alignment)
    };
  }

  private buildClaimMetadata(structured: StructuredArgument, message: string): PendingEpistemicAnalysis["claims"] {
    const timestamp = nowIso();
    return structured.claims.map((claim) => {
      const claimText = claim.text.trim();
      const claimType = this.classifyClaim(claimText, message);
      return {
        id: randomUUID(),
        claimText,
        claimType,
        severity: this.estimateSeverity(claimText),
        canBeEvidenced: claimType === "empirical",
        requiresDefinition: claimType === "definitional" || /\b(this|that|it|meaning|truth|good|bad|better)\b/i.test(claimText),
        philosophicalStance: claimType === "philosophical" || claimType === "axiom",
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });
  }

  private buildSurfacedAssumptions(structured: StructuredArgument, message: string): PendingEpistemicAnalysis["assumptions"] {
    const timestamp = nowIso();
    const assumptions = new Map<string, Omit<SurfacedAssumptionRecord, "sessionId" | "sourceMessageId">>();
    const push = (assumptionText: string, level: SurfacedAssumptionRecord["level"], supportsClaimText: string | null, isExplicit: boolean): void => {
      const key = assumptionText.toLowerCase().trim();
      if (!key || assumptions.has(key)) {
        return;
      }

      assumptions.set(key, {
        id: randomUUID(),
        assumptionText,
        supportsClaimText,
        isExplicit,
        level,
        createdAt: timestamp
      });
    };

    for (const assumption of structured.assumptions) {
      push(assumption.text.trim(), "intermediate", null, true);
    }

    for (const claim of structured.claims) {
      if (/\btherefore|thus|so\b/i.test(claim.text)) {
        push("The conclusion follows from premises the user takes to be sufficient, even if they were not fully stated here.", "foundational", claim.text, false);
      }
      if (/\bcauses?|results? in|leads? to|drives?\b/i.test(claim.text)) {
        push("A causal mechanism links the asserted factors, and relevant alternatives do not overturn it.", "foundational", claim.text, false);
      }
      if (/\bshould|must|ought|need to|have to\b/i.test(claim.text)) {
        push("A normative standard or decision rule justifies this recommendation.", "foundational", claim.text, false);
      }
      if (/\bobserver|observed|experience|meaning|consciousness|truth|being\b/i.test(claim.text)) {
        push("Key philosophical terms are stable enough to support the conclusion drawn from them.", "background", claim.text, false);
      }
      if (/\balways|never|everyone|nobody|all|none\b/i.test(claim.text)) {
        push("No relevant exception cases materially weaken this universal framing.", "intermediate", claim.text, false);
      }
    }

    if (/\bmetaphor|language|frame|context\b/i.test(message)) {
      push("The language chosen here carries philosophical weight and is not merely ornamental.", "background", null, false);
    }

    return [...assumptions.values()];
  }

  private buildCritiqueClassifications(sessionId: string, turnId: string, criticResult: CriticResult): PendingEpistemicAnalysis["critiques"] {
    const timestamp = nowIso();
    return criticResult.findings.map((finding) => {
      const critiqueType = classifyCritiqueType(finding);
      return {
        id: randomUUID(),
        turnId,
        findingType: finding.type,
        critiqueType,
        description: finding.detail,
        severity: this.findingSeverity(finding.type),
        canBeResolvedVia: resolvePathForCritiqueType(critiqueType) as CritiqueClassificationRecord["canBeResolvedVia"],
        createdAt: timestamp
      };
    });
  }

  private buildUncertaintyMap(
    turnId: string,
    critiques: PendingEpistemicAnalysis["critiques"],
    claims: PendingEpistemicAnalysis["claims"],
    assumptions: PendingEpistemicAnalysis["assumptions"]
  ): PendingEpistemicAnalysis["uncertainties"] {
    const timestamp = nowIso();
    const items: PendingEpistemicAnalysis["uncertainties"] = critiques.map((critique, index) => ({
      id: randomUUID(),
      turnId,
      uncertaintyType: critique.critiqueType,
      affectedClaimText: claims[index]?.claimText ?? claims[0]?.claimText ?? null,
      affectedAssumptionText: null,
      whyFlagged: critique.description,
      severity: critique.severity,
      canBeAddressedVia: critique.canBeResolvedVia,
      createdAt: timestamp
    }));

    for (const assumption of assumptions.filter((entry) => !entry.isExplicit)) {
      items.push({
        id: randomUUID(),
        turnId,
        uncertaintyType: this.assumptionUncertaintyType(assumption.assumptionText),
        affectedClaimText: assumption.supportsClaimText,
        affectedAssumptionText: assumption.assumptionText,
        whyFlagged: `This turn relies on an unstated assumption: ${assumption.assumptionText}`,
        severity: assumption.level === "foundational" ? 8 : assumption.level === "intermediate" ? 6 : 4,
        canBeAddressedVia: /philosophical|meaning|consciousness|truth|being/i.test(assumption.assumptionText)
          ? "philosophical_examination"
          : "assumption_review",
        createdAt: timestamp
      });
    }

    return items;
  }

  private buildFrameworkAlignments(
    turnId: string,
    message: string,
    contexts: ContextDefinitionRecord[]
  ): PendingEpistemicAnalysis["alignments"] {
    return contexts.map((context) => this.buildFrameworkAlignmentSeed(turnId, message, context));
  }

  private buildFrameworkAlignmentSeed(
    turnId: string,
    message: string,
    context: ContextDefinitionRecord
  ): Omit<FrameworkAlignmentRecord, "sessionId"> {
    const overlap = this.findOverlap(message, context);
    return {
      id: randomUUID(),
      turnId,
      contextId: context.id,
      alignmentScore: overlap.score,
      overlappingConcepts: overlap.matches,
      divergences: this.findDivergences(message, context),
      leveragePoints: this.findLeveragePoints(message, context),
      createdAt: nowIso()
    };
  }

  private evaluateAlignment(context: ContextDefinitionRecord, alignment: FrameworkAlignmentRecord): AlignmentEvaluation {
    const overlapEvidence = alignment.overlappingConcepts
      .slice(0, 3)
      .map((item) => `${item.userPhrase} -> ${item.contextPhrase}`);
    const divergenceEvidence = alignment.divergences
      .slice(0, 2)
      .map((item) => `Pressure point: ${item}`);
    const leverageEvidence = alignment.leveragePoints
      .slice(0, 2)
      .map((item) => `Next move: ${item}`);

    if (alignment.overlappingConcepts.length > 0) {
      return {
        state: "direct_match",
        label: alignment.alignmentScore >= 60 ? "Direct language match" : "Partial direct match",
        summary: alignment.overlappingConcepts[0]?.rationale ?? `The latest wording already overlaps with ${context.name}.`,
        rationale: `This read is based on words in the latest user wording that already line up with this perspective.`,
        evidence: [...overlapEvidence, ...divergenceEvidence, ...leverageEvidence].slice(0, 4)
      };
    }

    if (alignment.alignmentScore > 0 || alignment.divergences.length > 0) {
      return {
        state: "heuristic_read",
        label: "Interpretive read",
        summary: alignment.divergences[0]
          ?? alignment.leveragePoints[0]
          ?? `This lens still picks up a real pressure point, even without an exact keyword match.`,
        rationale: `This is an interpretive alignment based on the pressure in the claim, even though the wording does not use ${this.normalizeText(context.name)}'s usual vocabulary directly.`,
        evidence: [
          ...divergenceEvidence,
          ...leverageEvidence,
          ...(context.coreMoves[0] ? [`Next step: ${context.coreMoves[0]}`] : [])
        ].slice(0, 4)
      };
    }

    return {
      state: "low_signal",
      label: "No direct lens hook yet",
      summary: context.coreMoves[0]
        ? `This lens asks you to ${context.coreMoves[0]}.`
        : `The latest wording does not yet use ${this.normalizeText(context.name)}'s usual terms.`,
      rationale: `The wording does not explicitly invoke this lens yet, but you can still apply it manually if you want to test the claim from this angle.`,
      evidence: [
        ...(context.coreMoves[0] ? [`Next step: ${context.coreMoves[0]}`] : []),
        ...(context.commonPitfalls[0] ? [`Watch for: ${context.commonPitfalls[0]}`] : []),
        ...(context.keyMetaphors[0] ? [`Consider: ${context.keyMetaphors[0]}`] : [])
      ].slice(0, 4)
    };
  }

  private classifyClaim(claimText: string, message: string): ClaimMetadataRecord["claimType"] {
    if (/\bassume|grant that|let us assume\b/i.test(claimText)) {
      return "axiom";
    }
    if (/\bmeans|defined as|by .* i mean\b/i.test(claimText)) {
      return "definitional";
    }
    if (/\bif\b.*\bthen\b|\btherefore\b|\bthus\b|\bentails\b|\bimplies\b/i.test(claimText)) {
      return "logical";
    }
    if (/\d|\bpercent|data|study|studies|evidence|observed|measured|correlat|causes?|results?\b/i.test(claimText)) {
      return "empirical";
    }
    if (/\bmeaning|consciousness|experience|truth|reality|being|justice|beauty|value|knowledge|observer|observed\b/i.test(`${claimText} ${message}`)) {
      return "philosophical";
    }
    return "logical";
  }

  private estimateSeverity(claimText: string): number {
    if (/\balways|never|must|should|therefore|proves?\b/i.test(claimText)) {
      return 8;
    }
    if (claimText.length > 120 || /\bcauses?|results? in|because\b/i.test(claimText)) {
      return 6;
    }
    return 4;
  }

  private findingSeverity(type: CriticResult["findings"][number]["type"]): number {
    switch (type) {
      case "contradiction":
        return 9;
      case "unsupported_premise":
        return 7;
      case "definition_drift":
        return 6;
      case "ambiguity":
        return 5;
    }
  }

  private assumptionUncertaintyType(assumptionText: string): CritiqueType {
    if (/philosophical|meaning|consciousness|truth|being/i.test(assumptionText)) {
      return "philosophical_premise";
    }
    return "assumption_conflict";
  }

  private findOverlap(message: string, context: ContextDefinitionRecord): {
    score: number;
    matches: Array<{ userPhrase: string; contextPhrase: string; rationale: string }>;
  } {
    const normalizedMessage = this.normalizeText(message);
    const messageTokens = this.tokenize(message);
    const weightedMatches = new Map<string, WeightedAlignmentMatch>();
    const addMatch = (match: WeightedAlignmentMatch): void => {
      const key = `${match.userPhrase}::${match.contextPhrase}`.toLowerCase();
      const existing = weightedMatches.get(key);
      if (!existing || existing.weight < match.weight) {
        weightedMatches.set(key, match);
      }
    };

    for (const [term, definition] of Object.entries(context.canonicalTerms)) {
      const normalizedTerm = this.normalizeText(term);
      const termTokens = this.tokenize(`${term} ${definition}`);
      const sharedTokens = this.collectSharedTokens(messageTokens, termTokens);

      if (normalizedTerm && normalizedMessage.includes(normalizedTerm)) {
        addMatch({
          userPhrase: term,
          contextPhrase: definition,
          rationale: `The message names ${term} directly, which is a canonical ${context.name} concept.`,
          weight: 28
        });
        continue;
      }

      if (sharedTokens.length >= 2) {
        addMatch({
          userPhrase: sharedTokens.join(", "),
          contextPhrase: term,
          rationale: `The wording overlaps with ${context.name}'s treatment of ${term}.`,
          weight: 18
        });
        continue;
      }

      if (sharedTokens.length === 1 && termTokens.length <= 3) {
        addMatch({
          userPhrase: sharedTokens[0],
          contextPhrase: term,
          rationale: `The argument contains an early cue for ${term} in ${context.name}.`,
          weight: 10
        });
      }
    }

    for (const move of context.coreMoves) {
      const sharedTokens = this.collectSharedTokens(messageTokens, this.tokenize(move));
      if (sharedTokens.length >= 2) {
        addMatch({
          userPhrase: sharedTokens.join(", "),
          contextPhrase: move,
          rationale: `${context.name} would press on this argument in almost the same way: ${move}.`,
          weight: 14
        });
      }
    }

    for (const metaphor of context.keyMetaphors) {
      const normalizedMetaphor = this.normalizeText(metaphor);
      const sharedTokens = this.collectSharedTokens(messageTokens, this.tokenize(metaphor));
      if ((normalizedMetaphor && normalizedMessage.includes(normalizedMetaphor)) || sharedTokens.length >= 2) {
        addMatch({
          userPhrase: sharedTokens.join(", ") || metaphor,
          contextPhrase: metaphor,
          rationale: `The argument is already close to ${context.name}'s metaphor of ${metaphor}.`,
          weight: 10
        });
      }
    }

    for (const pitfall of context.commonPitfalls) {
      const sharedTokens = this.collectSharedTokens(messageTokens, this.tokenize(pitfall));
      if (sharedTokens.length >= 2) {
        addMatch({
          userPhrase: sharedTokens.join(", "),
          contextPhrase: pitfall,
          rationale: `${context.name} would recognize a familiar pressure point here: ${pitfall}.`,
          weight: 8
        });
      }
    }

    for (const profile of this.getContextSignalProfiles(context)) {
      const sharedTokens = this.collectSharedTokens(messageTokens, profile.phrases.flatMap((phrase) => this.tokenize(phrase)));
      if (sharedTokens.length >= (profile.minimumMatches ?? 1)) {
        addMatch({
          userPhrase: sharedTokens.join(", "),
          contextPhrase: profile.label,
          rationale: profile.rationale,
          weight: profile.weight
        });
      }
    }

    const matches = [...weightedMatches.values()]
      .sort((left, right) => right.weight - left.weight || left.userPhrase.localeCompare(right.userPhrase))
      .slice(0, 6)
      .map(({ userPhrase, contextPhrase, rationale }) => ({ userPhrase, contextPhrase, rationale }));
    const totalWeight = [...weightedMatches.values()].reduce((sum, match) => sum + match.weight, 0);
    const score = Math.min(100, Math.round(totalWeight));
    return { score, matches };
  }

  private findDivergences(message: string, context: ContextDefinitionRecord): string[] {
    const normalizedMessage = message.toLowerCase();
    const divergences: string[] = [];

    if (context.name === "phenomenology" && /observer|observed|experience|meaning/i.test(message) && !/body|embod|perception/i.test(normalizedMessage)) {
      divergences.push("This framing gestures toward phenomenology but does not yet account for embodiment or perception.");
    }
    if (context.name === "pragmatism" && !/practice|consequence|effect|inquiry/i.test(normalizedMessage)) {
      divergences.push("The claim is not yet connected to practical consequences or inquiry, which pragmatism expects.");
    }
    if (context.name === "epistemology" && !/justify|evidence|know|belief/i.test(normalizedMessage)) {
      divergences.push("The message makes a knowledge-adjacent claim without stating what would justify it.");
    }
    if (context.name === "systems_theory" && /system|emerge|interaction/i.test(normalizedMessage) && !/feedback|boundary|loop/i.test(normalizedMessage)) {
      divergences.push("The systems framing omits feedback loops or boundary conditions.");
    }
    if (context.name === "analytic_philosophy" && /possible|quality|correctly|effective|reasonable|better/i.test(normalizedMessage) && !/define|definition|criteria|mean|clarify/i.test(normalizedMessage)) {
      divergences.push("The claim uses loose qualifiers like possible, quality, or correctly without clarifying the structure of the claim.");
    }
    if (context.name === "logic_and_formal_systems" && /possible|can|if|unless|therefore/i.test(normalizedMessage) && !/entail|follows|valid|sound|contradict/i.test(normalizedMessage)) {
      divergences.push("The statement mixes feasibility, conditions, and quality without separating what actually follows from what merely seems plausible.");
    }

    return divergences;
  }

  private findLeveragePoints(message: string, context: ContextDefinitionRecord): string[] {
    const normalizedMessage = message.toLowerCase();
    if (context.name === "phenomenology" && /observer|observed|meaning|experience/i.test(normalizedMessage)) {
      return [
        "Try reframing observer/observed as a co-constituted relation rather than two detached entities.",
        "If embodiment matters here, make it explicit instead of leaving the subject abstract."
      ];
    }
    if (context.name === "pragmatism") {
      return ["Ask what concrete difference this idea makes in inquiry or practice."];
    }
    if (context.name === "epistemology") {
      return ["Name the standard of justification that would make this claim knowledge rather than intuition."];
    }
    if (context.name === "systems_theory") {
      return ["Specify the system boundary and the feedback loop that stabilizes or amplifies the pattern you describe."];
    }
    if (context.name === "analytic_philosophy") {
      return ["Separate the wording of the claim from its logical form to see what is actually being asserted."];
    }
    return ["Test whether the conclusion is valid independently of whether the premises are true."];
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/[_-]+/g, " ");
  }

  private tokenize(value: string): string[] {
    return this.normalizeText(value)
      .split(/[^a-z0-9]+/)
      .map((token) => this.normalizeToken(token))
      .filter((token) => token.length >= 3 && !TOKEN_STOP_WORDS.has(token));
  }

  private normalizeToken(token: string): string {
    if (token.length <= 4) {
      return token;
    }

    return token
      .replace(/ies$/i, "y")
      .replace(/ing$/i, "")
      .replace(/ed$/i, "")
      .replace(/es$/i, "")
      .replace(/s$/i, "");
  }

  private collectSharedTokens(messageTokens: string[], candidateTokens: string[]): string[] {
    const candidateSet = new Set(candidateTokens);
    const shared = new Set<string>();

    for (const token of messageTokens) {
      if (candidateSet.has(token)) {
        shared.add(token);
      }
    }

    return [...shared];
  }

  private getContextSignalProfiles(context: ContextDefinitionRecord): ContextSignalProfile[] {
    return CONTEXT_SIGNAL_PROFILES[context.name] ?? CONTEXT_SIGNAL_PROFILES[context.id] ?? [];
  }
}