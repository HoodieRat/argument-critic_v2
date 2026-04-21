import type {
  AttachmentRecord,
  CaptureRecord,
  ContextDefinitionRecord,
  FamiliaritySignalRecord,
  FamiliaritySignalType,
  MessageRecord,
  QuestionRecord,
  ReportRecord,
  ResponseProvenance,
  SessionAnalysisSnapshot,
  SessionMode,
  SessionRecord
} from "./domain.js";

export interface ChatTurnRequest {
  readonly sessionId?: string;
  readonly mode: SessionMode;
  readonly message: string;
  readonly attachmentIds?: string[];
  readonly topic?: string;
  readonly includeResearch?: boolean;
  readonly replyToQuestionId?: string;
}

export interface ChatTurnResponse {
  readonly session: SessionRecord;
  readonly answer: string;
  readonly provenance: ResponseProvenance;
  readonly messages: MessageRecord[];
  readonly activeQuestions: QuestionRecord[];
  readonly targetedQuestions: QuestionRecord[];
  readonly analysis?: SessionAnalysisSnapshot;
  readonly route: string;
}

export interface DatabaseQueryRequest {
  readonly sessionId: string;
  readonly query: string;
  readonly interpret?: boolean;
}

export interface DatabaseQueryResponse {
  readonly answer: string;
  readonly provenance: ResponseProvenance;
  readonly blocks: Array<{ readonly title: string; readonly content: string }>;
}

export interface QuestionAnswerRequest {
  readonly answer: string;
  readonly resolutionNote?: string;
}

export interface QuestionStatusResponse {
  readonly question: QuestionRecord;
  readonly activeQuestions: QuestionRecord[];
}

export interface ReportGenerationRequest {
  readonly sessionId: string;
  readonly reportType: string;
  readonly includeCommentary?: boolean;
}

export interface ReportGenerationResponse {
  readonly report: ReportRecord;
}

export interface ClearSessionReportsRequest {
  readonly sessionId: string;
}

export interface ReportDeleteResponse {
  readonly deleted: boolean;
}

export interface ClearSessionReportsResponse {
  readonly deletedCount: number;
}

export interface CaptureSubmitRequest {
  readonly sessionId: string;
  readonly dataUrl: string;
  readonly mimeType: string;
  readonly analyze: boolean;
  readonly crop?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface CaptureSubmitResponse {
  readonly attachment: AttachmentRecord;
  readonly capture: CaptureRecord | null;
  readonly analysis: string | null;
}

export interface AttachmentUploadResponse {
  readonly attachment: AttachmentRecord;
}

export interface RuntimeStatusResponse {
  readonly ready: boolean;
  readonly sessionCount: number;
  readonly managedProcesses: number;
}

export type GitHubModelsTokenSource = "secure_store" | "environment" | "none";
export type ModelAccessBackend = "copilot" | "github-models" | "none";
export type ModelAccessTokenKind = "copilot" | "oauth_token" | "personal_access_token" | "unknown" | "none";
export type GitHubLoginAuthMethodResponse = "oauth-device" | "github-cli";

export type GitHubLoginFlowStateResponse = "checking" | "waiting" | "importing" | "succeeded" | "failed";

export interface GitHubLoginFlowResponse {
  readonly id: string;
  readonly state: GitHubLoginFlowStateResponse;
  readonly message: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly authMethod: GitHubLoginAuthMethodResponse;
  readonly userCode: string | null;
  readonly verificationUri: string | null;
  readonly expiresAt: string | null;
  readonly reviewUri: string | null;
  readonly accountLogin: string | null;
}

export interface GitHubModelOptionResponse {
  readonly id: string;
  readonly name: string;
  readonly vendor: string;
  readonly family: string;
  readonly preview: boolean;
  readonly isDefault: boolean;
  readonly isFallback: boolean;
  readonly isPremium: boolean;
  readonly multiplier: number | null;
  readonly degradationReason: string | null;
  readonly supportsVision: boolean;
  readonly supportsToolCalls: boolean;
  readonly supportsThinking: boolean;
  readonly supportsAdaptiveThinking: boolean;
  readonly supportsReasoningEffort: string[];
  readonly minThinkingBudget: number | null;
  readonly maxThinkingBudget: number | null;
  readonly maxInputTokens: number | null;
  readonly maxOutputTokens: number | null;
  readonly supportedEndpoints: string[];
}

export interface GitHubModelsTokenStatusResponse {
  readonly configured: boolean;
  readonly source: GitHubModelsTokenSource;
  readonly updatedAt: string | null;
}

export interface ModelAccessStatusResponse {
  readonly backend: ModelAccessBackend;
  readonly tokenKind: ModelAccessTokenKind;
  readonly warning: string | null;
}

export interface RuntimeSettingsResponse {
  readonly researchEnabled: boolean;
  readonly questionGenerationEnabled: boolean;
  readonly githubLoginAuthMethod: GitHubLoginAuthMethodResponse;
  readonly githubModel: string;
  readonly availableGitHubModels: GitHubModelOptionResponse[];
  readonly modelAccess: ModelAccessStatusResponse;
  readonly githubModelThinkingEnabled: boolean;
  readonly githubModelReasoningEffort: string | null;
  readonly githubModelThinkingBudget: number | null;
  readonly sessionAutoTitleEnabled: boolean;
  readonly githubModelsToken: GitHubModelsTokenStatusResponse;
}

export interface RuntimeSettingsUpdateRequest {
  readonly researchEnabled?: boolean;
  readonly questionGenerationEnabled?: boolean;
  readonly githubModel?: string;
  readonly githubModelThinkingEnabled?: boolean;
  readonly githubModelReasoningEffort?: string | null;
  readonly githubModelThinkingBudget?: number | null;
  readonly sessionAutoTitleEnabled?: boolean;
}

export interface RuntimeTokenUpdateRequest {
  readonly token: string;
}

export interface SessionImportRequest {
  readonly sourceSessionId: string;
  readonly mode?: SessionMode;
  readonly title?: string;
}

export interface SessionUpdateRequest {
  readonly title?: string;
  readonly criticalityMultiplier?: number;
  readonly structuredOutputEnabled?: boolean;
  readonly imageTextExtractionEnabled?: boolean;
}

export interface ResearchImportRequest {
  readonly sessionId: string;
  readonly payload: string;
  readonly provider?: string;
  readonly enabledForContext: boolean;
}

export interface AnalysisSessionResponse extends SessionAnalysisSnapshot {}

export interface AnalysisTurnResponse {
  readonly critiques: SessionAnalysisSnapshot["critiques"];
  readonly uncertainties: SessionAnalysisSnapshot["uncertainties"];
  readonly alignments: SessionAnalysisSnapshot["alignments"];
}

export interface ContextDefinitionRequest {
  readonly name: string;
  readonly canonicalTerms: Record<string, string>;
  readonly coreMoves: string[];
  readonly keyMetaphors: string[];
  readonly internalDisputes: Array<{ position: string; proponents: string[]; briefDescription: string }>;
  readonly commonPitfalls: string[];
}

export interface ContextDefinitionsResponse {
  readonly contexts: ContextDefinitionRecord[];
}

export interface ContextDefinitionResponse {
  readonly context: ContextDefinitionRecord;
}

export type AnalysisContextPreviewState = "unavailable" | "direct_match" | "heuristic_read" | "low_signal";

export interface AnalysisContextPreviewEvaluationResponse {
  readonly state: AnalysisContextPreviewState;
  readonly label: string;
  readonly summary: string;
  readonly rationale: string;
  readonly evidence: string[];
}

export interface AnalysisContextPreviewResponse {
  readonly alignment: import("./domain.js").FrameworkAlignmentRecord | null;
  readonly evaluation: AnalysisContextPreviewEvaluationResponse;
  readonly sourceMessageId: string | null;
  readonly sourceExcerpt: string | null;
}

export interface AnalysisContextPreviewsResponse {
  readonly previews: Record<string, AnalysisContextPreviewResponse>;
}

export interface FamiliaritySignalRequest {
  readonly sessionId: string;
  readonly uncertaintyId?: string;
  readonly assumptionId?: string;
  readonly claimId?: string;
  readonly signalType: FamiliaritySignalType;
  readonly userNote?: string;
}

export interface FamiliaritySignalResponse {
  readonly familiarity: FamiliaritySignalRecord;
}

export interface FamiliaritySignalsResponse {
  readonly familiarities: FamiliaritySignalRecord[];
}