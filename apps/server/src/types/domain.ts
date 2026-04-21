export type SessionMode = "normal_chat" | "critic" | "database" | "report" | "research_import" | "attachment_analysis";
export type MessageRole = "user" | "assistant" | "system";
export type ResponseProvenance = "database" | "ai" | "hybrid" | "research";
export type QuestionStatus = "unanswered" | "answered" | "resolved" | "archived" | "dismissed" | "superseded";
export type ContradictionStatus = "open" | "reviewed" | "resolved" | "downgraded";
export type CritiqueType = "logical_coherence" | "empirical_gap" | "definitional_clarity" | "philosophical_premise" | "assumption_conflict";
export type FamiliaritySignalType = "familiar" | "examined" | "interested";

export interface SessionRecord {
  readonly id: string;
  readonly title: string;
  readonly mode: SessionMode;
  readonly topic: string | null;
  readonly summary: string | null;
  readonly sourceSessionId: string | null;
  readonly sourceSessionMode: SessionMode | null;
  readonly handoffPrompt: string | null;
  readonly criticalityMultiplier: number;
  readonly structuredOutputEnabled: boolean;
  readonly imageTextExtractionEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MessageRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly provenance: ResponseProvenance;
  readonly attachments?: AttachmentRecord[];
  readonly createdAt: string;
}

export interface AttachmentRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly type: string;
  readonly path: string;
  readonly displayName: string | null;
  readonly mimeType: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly contentHash: string;
  readonly createdAt: string;
}

export interface CaptureRecord {
  readonly id: string;
  readonly attachmentId: string;
  readonly cropX: number;
  readonly cropY: number;
  readonly cropWidth: number;
  readonly cropHeight: number;
  readonly analysisStatus: string;
  readonly createdAt: string;
}

export interface ClaimRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly text: string;
  readonly claimType: string;
  readonly confidence: number;
  readonly sourceMessageId: string;
  readonly createdAt: string;
}

export interface DefinitionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly term: string;
  readonly definitionText: string;
  readonly sourceMessageId: string;
  readonly createdAt: string;
}

export interface AssumptionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly text: string;
  readonly sourceMessageId: string;
  readonly createdAt: string;
}

export interface ClaimMetadataRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly sourceMessageId: string;
  readonly claimText: string;
  readonly claimType: "empirical" | "logical" | "definitional" | "philosophical" | "axiom";
  readonly severity: number;
  readonly canBeEvidenced: boolean;
  readonly requiresDefinition: boolean;
  readonly philosophicalStance: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SurfacedAssumptionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly sourceMessageId: string;
  readonly assumptionText: string;
  readonly supportsClaimText: string | null;
  readonly isExplicit: boolean;
  readonly level: "foundational" | "intermediate" | "background";
  readonly createdAt: string;
}

export interface ObjectionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly claimId: string;
  readonly text: string;
  readonly severity: string;
  readonly createdAt: string;
}

export interface ContradictionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly claimAId: string;
  readonly claimBId: string;
  readonly status: ContradictionStatus;
  readonly explanation: string;
  readonly createdAt: string;
}

export interface QuestionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly topic: string | null;
  readonly questionText: string;
  readonly whyAsked: string;
  readonly whatItTests: string;
  readonly critiqueType: CritiqueType | null;
  readonly status: QuestionStatus;
  readonly priority: number;
  readonly sourceTurnId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CritiqueClassificationRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly findingType: CriticFinding["type"];
  readonly critiqueType: CritiqueType;
  readonly description: string;
  readonly severity: number;
  readonly canBeResolvedVia: "logic" | "evidence" | "definition" | "philosophical_examination" | "assumption_review";
  readonly createdAt: string;
}

export interface UncertaintyMapRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly uncertaintyType: CritiqueType;
  readonly affectedClaimText: string | null;
  readonly affectedAssumptionText: string | null;
  readonly whyFlagged: string;
  readonly severity: number;
  readonly canBeAddressedVia: CritiqueClassificationRecord["canBeResolvedVia"];
  readonly createdAt: string;
}

export interface ContextDefinitionRecord {
  readonly id: string;
  readonly name: string;
  readonly source: "builtin" | "user-created";
  readonly isMutable: boolean;
  readonly canonicalTerms: Record<string, string>;
  readonly coreMoves: string[];
  readonly keyMetaphors: string[];
  readonly internalDisputes: Array<{ position: string; proponents: string[]; briefDescription: string }>;
  readonly commonPitfalls: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FrameworkAlignmentRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly contextId: string;
  readonly alignmentScore: number;
  readonly overlappingConcepts: Array<{ userPhrase: string; contextPhrase: string; rationale: string }>;
  readonly divergences: string[];
  readonly leveragePoints: string[];
  readonly createdAt: string;
}

export interface FamiliaritySignalRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly uncertaintyId: string | null;
  readonly assumptionId: string | null;
  readonly claimId: string | null;
  readonly signalType: FamiliaritySignalType;
  readonly userNote: string | null;
  readonly createdAt: string;
}

export interface SessionAnalysisSnapshot {
  readonly claims: ClaimMetadataRecord[];
  readonly assumptions: SurfacedAssumptionRecord[];
  readonly critiques: CritiqueClassificationRecord[];
  readonly uncertainties: UncertaintyMapRecord[];
  readonly alignments: FrameworkAlignmentRecord[];
}

export interface QuestionAnswerRecord {
  readonly id: string;
  readonly questionId: string;
  readonly messageId: string;
  readonly resolutionNote: string | null;
  readonly createdAt: string;
}

export interface ReportRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly reportType: string;
  readonly title: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface ResearchRunRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly provider: string;
  readonly importMode: string;
  readonly enabledForContext: boolean;
  readonly createdAt: string;
}

export interface ResearchSourceRecord {
  readonly id: string;
  readonly researchRunId: string;
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly sourceHash: string;
  readonly createdAt: string;
}

export interface ResearchFindingRecord {
  readonly id: string;
  readonly researchRunId: string;
  readonly findingText: string;
  readonly category: string;
  readonly createdAt: string;
}

export interface AuditLogRecord {
  readonly id: string;
  readonly sessionId: string | null;
  readonly turnId: string | null;
  readonly route: string;
  readonly action: string;
  readonly detailJson: string;
  readonly createdAt: string;
}

export interface QueueCard extends QuestionRecord {
  readonly sessionTitle: string;
}

export interface ParsedArgument {
  readonly claims: Array<Pick<ClaimRecord, "text" | "claimType" | "confidence">>;
  readonly definitions: Array<Pick<DefinitionRecord, "term" | "definitionText">>;
  readonly assumptions: Array<Pick<AssumptionRecord, "text">>;
}

export interface CriticFinding {
  readonly type: "unsupported_premise" | "definition_drift" | "contradiction" | "ambiguity";
  readonly detail: string;
  readonly evidence: string[];
}

export interface GeneratedQuestion {
  readonly questionText: string;
  readonly whyAsked: string;
  readonly whatItTests: string;
  readonly critiqueType: CritiqueType | null;
  readonly priority: number;
}

export interface DatabaseAnswerBlock {
  readonly title: string;
  readonly content: string;
}