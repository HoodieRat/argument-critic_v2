import { create } from "zustand";

import { ApiClient } from "../api/client";
import {
  captureCrop,
  captureVisible,
  isCaptureCancellationError,
  loadPersistedApiBaseUrl,
  loadPersistedDensityPreference,
  loadPersistedThemePreference,
  openExternalUrl,
  persistApiBaseUrl,
  persistDensityPreference,
  persistThemePreference,
  readPersistedDensityPreferenceSync,
  readPersistedThemePreferenceSync
} from "../platform";
import type {
  AnalysisDensity,
  AnalysisContextPreview,
  AnalysisContextPreviewMap,
  AttachmentRecord,
  BackgroundCaptureResult,
  CaptureSubmitResponse,
  ContextDefinitionInput,
  ContextDefinitionRecord,
  DatabaseQueryResponse,
  FamiliaritySignalRecord,
  FamiliaritySignalType,
  GitHubLoginFlow,
  MessageRecord,
  QuestionStatus,
  QuestionRecord,
  ReportRecord,
  RuntimeSettings,
  RuntimeStatus,
  SessionAnalysisSnapshot,
  SessionMode,
  SessionRecord,
  ThemePreference,
  TurnAnalysisSnapshot
} from "../types";

type AuxiliaryPanel = "history" | "analysis" | "database" | "reports" | "capture" | "settings";

const GITHUB_LOGIN_POLL_INTERVAL_MS = 1_500;
const TERMINAL_GITHUB_LOGIN_STATES = new Set<GitHubLoginFlow["state"]>(["succeeded", "failed"]);
const INITIAL_THEME_PREFERENCE = readPersistedThemePreferenceSync("studio");
const INITIAL_DENSITY_PREFERENCE = readPersistedDensityPreferenceSync("compact");

let githubLoginPollTimer: ReturnType<typeof setTimeout> | null = null;

interface AppState {
  readonly apiBaseUrl: string;
  readonly runtimeStatus: RuntimeStatus | null;
  readonly settings: RuntimeSettings | null;
  readonly themePreference: ThemePreference;
  readonly densityPreference: AnalysisDensity;
  readonly githubLoginFlow: GitHubLoginFlow | null;
  readonly sessions: SessionRecord[];
  readonly currentSession: SessionRecord | null;
  readonly mode: SessionMode;
  readonly messages: MessageRecord[];
  readonly activeQuestions: QuestionRecord[];
  readonly questionHistory: QuestionRecord[];
  readonly sessionAnalysis: SessionAnalysisSnapshot | null;
  readonly turnAnalysis: TurnAnalysisSnapshot | null;
  readonly contexts: ContextDefinitionRecord[];
  readonly familiarities: FamiliaritySignalRecord[];
  readonly alignmentPreviews: AnalysisContextPreviewMap;
  readonly alignmentPreview: AnalysisContextPreview | null;
  readonly isAlignmentPreviewLoading: boolean;
  readonly selectedAnalysisContextId: string | null;
  readonly reports: ReportRecord[];
  readonly selectedReport: ReportRecord | null;
  readonly databaseResult: DatabaseQueryResponse | null;
  readonly captureResult: CaptureSubmitResponse | null;
  readonly pendingAttachments: AttachmentRecord[];
  readonly researchRuns: Array<{ id: string; provider: string; createdAt: string }>;
  readonly activePanel: AuxiliaryPanel;
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly initialize: () => Promise<void>;
  readonly setActivePanel: (panel: AuxiliaryPanel) => void;
  readonly setMode: (mode: SessionMode) => Promise<void>;
  readonly setApiBaseUrl: (url: string) => Promise<void>;
  readonly setThemePreference: (theme: ThemePreference) => Promise<void>;
  readonly setDensityPreference: (density: AnalysisDensity) => Promise<void>;
  readonly createSession: (title?: string, mode?: SessionMode) => Promise<void>;
  readonly renameCurrentSession: (title: string) => Promise<void>;
  readonly updateCurrentSessionSettings: (patch: { criticalityMultiplier?: number; structuredOutputEnabled?: boolean; imageTextExtractionEnabled?: boolean }) => Promise<void>;
  readonly importCurrentSessionToMode: (mode: SessionMode) => Promise<void>;
  readonly quickCaptureCrop: () => Promise<void>;
  readonly captureVisibleArea: (analyze: boolean) => Promise<void>;
  readonly captureCropArea: (analyze: boolean) => Promise<void>;
  readonly selectSession: (sessionId: string) => Promise<void>;
  readonly sendMessage: (message: string) => Promise<void>;
  readonly uploadAttachments: (files: File[]) => Promise<void>;
  readonly removePendingAttachment: (attachmentId: string) => void;
  readonly cancelTurn: () => Promise<void>;
  readonly refreshQuestions: () => Promise<void>;
  readonly loadQuestionHistory: (status?: QuestionStatus) => Promise<void>;
  readonly loadSessionAnalysis: (sessionId?: string) => Promise<void>;
  readonly loadAlignmentPreview: (contextId?: string | null) => Promise<void>;
  readonly refreshContexts: () => Promise<void>;
  readonly setSelectedAnalysisContext: (contextId: string) => void;
  readonly createAnalysisContext: (input: ContextDefinitionInput) => Promise<void>;
  readonly deleteAnalysisContext: (contextId: string) => Promise<void>;
  readonly markAnalysisFamiliarity: (input: { uncertaintyId?: string; assumptionId?: string; claimId?: string; signalType: FamiliaritySignalType; userNote?: string }) => Promise<void>;
  readonly answerQuestion: (questionId: string, answer: string, resolutionNote?: string) => Promise<void>;
  readonly archiveQuestion: (questionId: string) => Promise<void>;
  readonly resolveQuestion: (questionId: string) => Promise<void>;
  readonly reopenQuestion: (questionId: string) => Promise<void>;
  readonly clearAllQuestions: () => Promise<void>;
  readonly runDatabaseQuery: (query: string, interpret?: boolean) => Promise<void>;
  readonly generateReport: (reportType: string) => Promise<void>;
  readonly deleteReport: (reportId: string) => Promise<void>;
  readonly clearReports: () => Promise<void>;
  readonly submitCapture: (capture: BackgroundCaptureResult, analyze: boolean) => Promise<void>;
  readonly updateSettings: (patch: Partial<RuntimeSettings>) => Promise<void>;
  readonly startGitHubLogin: () => Promise<void>;
  readonly saveGitHubModelsToken: (token: string) => Promise<void>;
  readonly clearGitHubModelsToken: () => Promise<void>;
  readonly importResearch: (payload: string, enabledForContext: boolean) => Promise<void>;
  readonly shutdownRuntime: () => Promise<void>;
}

const client = new ApiClient();

function readLaunchApiBaseUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get("apiBaseUrl");
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/$/, "") : null;
}

async function loadPersistedBaseUrl(): Promise<string> {
  const launchApiBaseUrl = readLaunchApiBaseUrl();
  if (launchApiBaseUrl) {
    return launchApiBaseUrl;
  }

  return await loadPersistedApiBaseUrl(client.getBaseUrl());
}

async function ensureSession(get: () => AppState): Promise<SessionRecord> {
  const state = get();
  if (state.currentSession) {
    return state.currentSession;
  }

  const result = await client.createSession({ title: "Untitled Session", mode: state.mode });
  return result.session;
}

function findSessionForMode(sessions: SessionRecord[], mode: SessionMode): SessionRecord | null {
  return sessions.find((session) => session.mode === mode) ?? null;
}

function describeStartupError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/\bis not defined\b/i.test(message)) {
    return "The app hit an internal startup error. Restart it and try again.";
  }

  return message;
}

function buildCaptureFailureState(error: unknown): Pick<AppState, "error" | "activePanel" | "isBusy"> | Pick<AppState, "isBusy"> {
  if (isCaptureCancellationError(error)) {
    return { isBusy: false };
  }

  return {
    error: error instanceof Error ? error.message : String(error),
    activePanel: "capture",
    isBusy: false
  };
}

function stopGitHubLoginPolling(): void {
  if (githubLoginPollTimer !== null) {
    clearTimeout(githubLoginPollTimer);
    githubLoginPollTimer = null;
  }
}

function mergePendingAttachments(current: AttachmentRecord[], additions: AttachmentRecord[]): AttachmentRecord[] {
  const attachmentsById = new Map(current.map((attachment) => [attachment.id, attachment]));
  for (const attachment of additions) {
    attachmentsById.set(attachment.id, attachment);
  }

  return [...attachmentsById.values()];
}

function createLocalGitHubLoginFailure(message: string, currentFlow: GitHubLoginFlow | null): GitHubLoginFlow {
  const timestamp = new Date().toISOString();

  return {
    id: currentFlow?.id ?? "local-error",
    state: "failed",
    message,
    startedAt: currentFlow?.startedAt ?? timestamp,
    updatedAt: timestamp,
    authMethod: currentFlow?.authMethod ?? "github-cli",
    userCode: currentFlow?.userCode ?? null,
    verificationUri: currentFlow?.verificationUri ?? null,
    expiresAt: currentFlow?.expiresAt ?? null,
    reviewUri: currentFlow?.reviewUri ?? null,
    accountLogin: currentFlow?.accountLogin ?? null
  };
}

async function loadSessionAnalysisBundle(sessionId: string): Promise<{
  analysis: SessionAnalysisSnapshot;
  familiarities: FamiliaritySignalRecord[];
}> {
  const [analysis, familiarities] = await Promise.all([
    client.getSessionAnalysis(sessionId),
    client.listFamiliarities(sessionId)
  ]);

  return {
    analysis,
    familiarities: familiarities.familiarities
  };
}

function resolveDefaultContextId(contexts: ContextDefinitionRecord[], preferredId: string | null): string | null {
  if (preferredId && contexts.some((context) => context.id === preferredId)) {
    return preferredId;
  }

  return contexts[0]?.id ?? null;
}

function findAlignmentForContext(analysis: SessionAnalysisSnapshot | null, contextId: string | null): SessionAnalysisSnapshot["alignments"][number] | null {
  if (!analysis || !contextId) {
    return null;
  }

  return analysis.alignments.find((alignment) => alignment.contextId === contextId) ?? null;
}

function resolveSelectedAlignmentPreview(
  analysis: SessionAnalysisSnapshot | null,
  selectedContextId: string | null,
  previews: AnalysisContextPreviewMap
): AnalysisContextPreview | null {
  if (!selectedContextId || findAlignmentForContext(analysis, selectedContextId)) {
    return null;
  }

  return previews[selectedContextId] ?? null;
}

export const useAppStore = create<AppState>((set, get) => {
  async function refreshRuntimeSettingsOnly(forceRefreshModels = false): Promise<RuntimeSettings> {
    const settings = await client.getRuntimeSettings(forceRefreshModels);
    set({ settings });
    return settings;
  }

  function scheduleGitHubLoginPoll(flowId: string): void {
    stopGitHubLoginPolling();
    githubLoginPollTimer = setTimeout(() => {
      void pollGitHubLoginFlow(flowId);
    }, GITHUB_LOGIN_POLL_INTERVAL_MS);
  }

  async function pollGitHubLoginFlow(flowId: string): Promise<void> {
    if (get().githubLoginFlow?.id !== flowId) {
      return;
    }

    try {
      const flow = await client.getGitHubLoginFlow(flowId);
      if (get().githubLoginFlow?.id !== flowId) {
        return;
      }

      set({ githubLoginFlow: flow });

      if (TERMINAL_GITHUB_LOGIN_STATES.has(flow.state)) {
        stopGitHubLoginPolling();
        if (flow.state === "succeeded") {
          try {
            await refreshRuntimeSettingsOnly(true);
          } catch (error) {
            set({
              githubLoginFlow: {
                ...flow,
                message: `${flow.message} The login was stored, but refreshing models failed: ${error instanceof Error ? error.message : String(error)}`,
                updatedAt: new Date().toISOString()
              }
            });
          }
        }
        return;
      }

      scheduleGitHubLoginPoll(flowId);
    } catch (error) {
      stopGitHubLoginPolling();
      if (get().githubLoginFlow?.id !== flowId) {
        return;
      }

      set({
        githubLoginFlow: createLocalGitHubLoginFailure(error instanceof Error ? error.message : String(error), get().githubLoginFlow)
      });
    }
  }

  async function loadAlignmentPreviewInternal(contextId?: string | null): Promise<void> {
    const selectedContextId = contextId ?? get().selectedAnalysisContextId;
    const sessionId = get().currentSession?.id;

    if (!sessionId || !selectedContextId) {
      set((state) => ({
        alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, state.selectedAnalysisContextId, state.alignmentPreviews),
        isAlignmentPreviewLoading: false
      }));
      return;
    }

    if (findAlignmentForContext(get().sessionAnalysis, selectedContextId) || get().alignmentPreviews[selectedContextId]) {
      set((state) => ({
        alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, state.selectedAnalysisContextId, state.alignmentPreviews),
        isAlignmentPreviewLoading: false
      }));
      return;
    }

    set({ isAlignmentPreviewLoading: true });

    try {
      const preview = await client.getContextAlignmentPreview(sessionId, selectedContextId);
      if (get().currentSession?.id !== sessionId) {
        return;
      }

      set((state) => {
        const alignmentPreviews = {
          ...state.alignmentPreviews,
          [selectedContextId]: preview
        };

        return {
          alignmentPreviews,
          alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, state.selectedAnalysisContextId, alignmentPreviews),
          isAlignmentPreviewLoading: false
        };
      });
    } catch {
      if (get().currentSession?.id !== sessionId) {
        return;
      }

      set((state) => ({
        alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, state.selectedAnalysisContextId, state.alignmentPreviews),
        isAlignmentPreviewLoading: false
      }));
    }
  }

  async function loadAlignmentPreviewsInternal(): Promise<void> {
    const sessionId = get().currentSession?.id;

    if (!sessionId) {
      set({ alignmentPreviews: {}, alignmentPreview: null, isAlignmentPreviewLoading: false });
      return;
    }

    set({ isAlignmentPreviewLoading: true });

    try {
      const alignmentPreviews = await client.getContextAlignmentPreviews(sessionId);
      if (get().currentSession?.id !== sessionId) {
        return;
      }

      set((state) => ({
        alignmentPreviews,
        alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, state.selectedAnalysisContextId, alignmentPreviews),
        isAlignmentPreviewLoading: false
      }));
    } catch {
      if (get().currentSession?.id !== sessionId) {
        return;
      }

      set((state) => ({
        alignmentPreviews: {},
        alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, state.selectedAnalysisContextId, {}),
        isAlignmentPreviewLoading: false
      }));
    }
  }

  return {
  apiBaseUrl: client.getBaseUrl(),
  runtimeStatus: null,
  settings: null,
  themePreference: INITIAL_THEME_PREFERENCE,
  densityPreference: INITIAL_DENSITY_PREFERENCE,
  githubLoginFlow: null,
  sessions: [],
  currentSession: null,
  mode: "normal_chat",
  messages: [],
  activeQuestions: [],
  questionHistory: [],
  sessionAnalysis: null,
  turnAnalysis: null,
  contexts: [],
  familiarities: [],
  alignmentPreviews: {},
  alignmentPreview: null,
  isAlignmentPreviewLoading: false,
  selectedAnalysisContextId: null,
  reports: [],
  selectedReport: null,
  databaseResult: null,
  captureResult: null,
  pendingAttachments: [],
  researchRuns: [],
  activePanel: "history",
  isBusy: false,
  error: null,
  initialize: async () => {
    stopGitHubLoginPolling();
    set({ isBusy: true, error: null });
    try {
      const [apiBaseUrl, themePreference, densityPreference] = await Promise.all([
        loadPersistedBaseUrl(),
        loadPersistedThemePreference(get().themePreference),
        loadPersistedDensityPreference(get().densityPreference)
      ]);
      client.setBaseUrl(apiBaseUrl);
      const [runtimeStatus, settings, sessionsResponse, contextsResponse] = await Promise.all([
        client.getRuntimeStatus(),
        client.getRuntimeSettings(true),
        client.listSessions(),
        client.listContexts()
      ]);
      const preferredMode = get().mode;
      let currentSession = findSessionForMode(sessionsResponse.sessions, preferredMode);
      if (!currentSession) {
        currentSession = (await client.createSession({ title: "Untitled Session", mode: preferredMode })).session;
      }
      const [sessionDetail, questionHistory, reports, researchRuns, analysisBundle] = await Promise.all([
        client.getSession(currentSession.id),
        client.getQuestionHistory(currentSession.id),
        client.listReports(currentSession.id),
        client.listResearchRuns(currentSession.id),
        loadSessionAnalysisBundle(currentSession.id)
      ]);
      const selectedAnalysisContextId = resolveDefaultContextId(contextsResponse.contexts, null);
      set({
        apiBaseUrl,
        runtimeStatus,
        settings,
        themePreference,
        densityPreference,
        githubLoginFlow: null,
        sessions: currentSession ? [currentSession, ...sessionsResponse.sessions.filter((session) => session.id !== currentSession.id)] : sessionsResponse.sessions,
        currentSession,
        mode: currentSession.mode,
        messages: sessionDetail.messages,
        activeQuestions: sessionDetail.activeQuestions,
        questionHistory: questionHistory.questions,
        sessionAnalysis: analysisBundle.analysis,
        turnAnalysis: null,
        contexts: contextsResponse.contexts,
        familiarities: analysisBundle.familiarities,
        alignmentPreviews: {},
        alignmentPreview: null,
        isAlignmentPreviewLoading: false,
        selectedAnalysisContextId,
        reports: reports.reports,
        selectedReport: reports.reports[0] ?? null,
        pendingAttachments: [],
        researchRuns: researchRuns.runs,
        isBusy: false
      });
      void loadAlignmentPreviewsInternal();
    } catch (error) {
      set({
        isBusy: false,
        error: describeStartupError(error)
      });
    }
  },
  setActivePanel: (panel) => set({ activePanel: panel }),
  setMode: async (mode) => {
    const current = get().currentSession;
    if (current?.mode === mode) {
      set({ mode });
      return;
    }

    const existing = get().sessions.find((session) => session.mode === mode);
    if (existing) {
      await get().selectSession(existing.id);
      return;
    }

    await get().createSession(undefined, mode);
  },
  setApiBaseUrl: async (url) => {
    stopGitHubLoginPolling();
    client.setBaseUrl(url);
    await persistApiBaseUrl(url);
    set({ apiBaseUrl: url, githubLoginFlow: null });
    await get().initialize();
  },
  setThemePreference: async (theme) => {
    await persistThemePreference(theme);
    set({ themePreference: theme });
  },
  setDensityPreference: async (density) => {
    await persistDensityPreference(density);
    set({ densityPreference: density });
  },
  createSession: async (title, mode = get().mode) => {
    set({ isBusy: true, error: null });
    try {
      const session = (await client.createSession({ title, mode })).session;
      set((state) => ({ sessions: [session, ...state.sessions], currentSession: session, mode: session.mode }));
      await get().selectSession(session.id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  renameCurrentSession: async (title) => {
    const session = get().currentSession;
    const normalized = title.trim();
    if (!session || !normalized) {
      return;
    }

    set({ isBusy: true, error: null });
    try {
      const updated = (await client.updateSession(session.id, { title: normalized })).session;
      set((state) => ({
        currentSession: updated,
        sessions: [updated, ...state.sessions.filter((item) => item.id !== updated.id)],
        isBusy: false
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  updateCurrentSessionSettings: async (patch) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    const hasCriticalityUpdate = typeof patch.criticalityMultiplier === "number" && Number.isFinite(patch.criticalityMultiplier);
    const hasStructuredOutputUpdate = typeof patch.structuredOutputEnabled === "boolean";
    const hasImageTextExtractionUpdate = typeof patch.imageTextExtractionEnabled === "boolean";
    if (!hasCriticalityUpdate && !hasStructuredOutputUpdate && !hasImageTextExtractionUpdate) {
      return;
    }

    const previousSession = session;
    const optimisticSession: SessionRecord = {
      ...session,
      ...(hasCriticalityUpdate ? { criticalityMultiplier: patch.criticalityMultiplier! } : {}),
      ...(hasStructuredOutputUpdate ? { structuredOutputEnabled: patch.structuredOutputEnabled! } : {}),
      ...(hasImageTextExtractionUpdate ? { imageTextExtractionEnabled: patch.imageTextExtractionEnabled! } : {})
    };

    set((state) => ({
      currentSession: optimisticSession,
      sessions: [optimisticSession, ...state.sessions.filter((item) => item.id !== optimisticSession.id)],
      error: null
    }));

    try {
      const updated = (await client.updateSession(session.id, {
        ...(hasCriticalityUpdate ? { criticalityMultiplier: patch.criticalityMultiplier } : {}),
        ...(hasStructuredOutputUpdate ? { structuredOutputEnabled: patch.structuredOutputEnabled } : {}),
        ...(hasImageTextExtractionUpdate ? { imageTextExtractionEnabled: patch.imageTextExtractionEnabled } : {})
      })).session;
      set((state) => ({
        currentSession: updated,
        sessions: [updated, ...state.sessions.filter((item) => item.id !== updated.id)]
      }));
    } catch (error) {
      set((state) => ({
        currentSession: previousSession,
        sessions: [previousSession, ...state.sessions.filter((item) => item.id !== previousSession.id)],
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  },
  importCurrentSessionToMode: async (mode) => {
    const source = get().currentSession;
    if (!source) {
      return;
    }

    set({ isBusy: true, error: null });
    try {
      const imported = await client.importSession({ sourceSessionId: source.id, mode });
      set((state) => ({
        sessions: [imported.session, ...state.sessions.filter((session) => session.id !== imported.session.id)],
        currentSession: imported.session,
        mode: imported.session.mode
      }));
      await get().selectSession(imported.session.id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  quickCaptureCrop: async () => {
    await get().captureCropArea(true);
  },
  captureVisibleArea: async (analyze) => {
    try {
      const capture = await captureVisible();
      await get().submitCapture(capture, analyze);
    } catch (error) {
      set(buildCaptureFailureState(error));
    }
  },
  captureCropArea: async (analyze) => {
    try {
      const capture = await captureCrop();
      await get().submitCapture(capture, analyze);
    } catch (error) {
      set(buildCaptureFailureState(error));
    }
  },
  selectSession: async (sessionId) => {
    set({ isBusy: true, error: null });
    try {
      const [sessionDetail, questionHistory, reports, researchRuns, analysisBundle] = await Promise.all([
        client.getSession(sessionId),
        client.getQuestionHistory(sessionId),
        client.listReports(sessionId),
        client.listResearchRuns(sessionId),
        loadSessionAnalysisBundle(sessionId)
      ]);
      const selectedAnalysisContextId = resolveDefaultContextId(get().contexts, get().selectedAnalysisContextId);
      set({
        currentSession: sessionDetail.session,
        sessions: [sessionDetail.session, ...get().sessions.filter((session) => session.id !== sessionDetail.session.id)],
        mode: sessionDetail.session.mode,
        messages: sessionDetail.messages,
        activeQuestions: sessionDetail.activeQuestions,
        questionHistory: questionHistory.questions,
        sessionAnalysis: analysisBundle.analysis,
        turnAnalysis: null,
        familiarities: analysisBundle.familiarities,
        alignmentPreviews: {},
        alignmentPreview: null,
        isAlignmentPreviewLoading: false,
        selectedAnalysisContextId,
        reports: reports.reports,
        selectedReport: reports.reports[0] ?? null,
        researchRuns: researchRuns.runs,
        databaseResult: null,
        captureResult: null,
        pendingAttachments: [],
        isBusy: false
      });
      void loadAlignmentPreviewsInternal();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  sendMessage: async (message) => {
    const session = await ensureSession(get);
    const pendingAttachments = get().pendingAttachments;
    const effectiveMessage = message.trim() || (pendingAttachments.length > 0 ? "Please analyze the attached material." : "");
    if (!effectiveMessage) {
      return;
    }

    set({ isBusy: true, error: null });
    try {
      const response = await client.sendTurn({
        sessionId: session.id,
        mode: get().mode,
        message: effectiveMessage,
        attachmentIds: pendingAttachments.map((attachment) => attachment.id),
        topic: session.topic ?? undefined,
        includeResearch: get().settings?.researchEnabled ?? false
      });
      const [history, analysisBundle, turnAnalysis] = await Promise.all([
        client.getQuestionHistory(response.session.id),
        loadSessionAnalysisBundle(response.session.id),
        response.targetedQuestions[0]?.sourceTurnId ? client.getTurnAnalysis(response.targetedQuestions[0].sourceTurnId) : Promise.resolve(null)
      ]);
      set((state) => ({
        currentSession: response.session,
        sessions: [response.session, ...state.sessions.filter((item) => item.id !== response.session.id)],
        mode: response.session.mode,
        messages: response.messages,
        activeQuestions: response.activeQuestions,
        questionHistory: history.questions,
        sessionAnalysis: response.analysis ?? analysisBundle.analysis,
        turnAnalysis: turnAnalysis,
        familiarities: analysisBundle.familiarities,
        alignmentPreviews: {},
        alignmentPreview: null,
        isAlignmentPreviewLoading: false,
        selectedAnalysisContextId: resolveDefaultContextId(state.contexts, state.selectedAnalysisContextId),
        activePanel: response.activeQuestions.length > 0 ? "history" : state.activePanel,
        pendingAttachments: [],
        runtimeStatus: state.runtimeStatus
          ? { ...state.runtimeStatus, sessionCount: Math.max(state.runtimeStatus.sessionCount, state.sessions.length) }
          : state.runtimeStatus,
        isBusy: false
      }));
      void loadAlignmentPreviewsInternal();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  uploadAttachments: async (files) => {
    if (files.length === 0) {
      return;
    }

    const session = await ensureSession(get);
    set({ isBusy: true, error: null });
    try {
      const uploadedAttachments: AttachmentRecord[] = [];
      for (const file of files) {
        const response = await client.uploadAttachment(session.id, file);
        uploadedAttachments.push(response.attachment);
      }

      set((state) => ({
        pendingAttachments: mergePendingAttachments(state.pendingAttachments, uploadedAttachments),
        isBusy: false
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  removePendingAttachment: (attachmentId) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter((attachment) => attachment.id !== attachmentId)
    }));
  },
  cancelTurn: async () => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    await client.cancelTurn(session.id);
  },
  refreshQuestions: async () => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    const [active, history] = await Promise.all([client.getActiveQuestions(session.id), client.getQuestionHistory(session.id)]);
    set({ activeQuestions: active.questions, questionHistory: history.questions });
  },
  loadQuestionHistory: async (status) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    const history = await client.getQuestionHistory(session.id, status);
    set({ questionHistory: history.questions });
  },
  loadSessionAnalysis: async (sessionId) => {
    const effectiveSessionId = sessionId ?? get().currentSession?.id;
    if (!effectiveSessionId) {
      return;
    }

    const analysisBundle = await loadSessionAnalysisBundle(effectiveSessionId);
    set((state) => ({
      sessionAnalysis: analysisBundle.analysis,
      turnAnalysis: null,
      familiarities: analysisBundle.familiarities,
      alignmentPreviews: {},
      alignmentPreview: null,
      isAlignmentPreviewLoading: false,
      selectedAnalysisContextId: resolveDefaultContextId(state.contexts, state.selectedAnalysisContextId)
    }));
    void loadAlignmentPreviewsInternal();
  },
  loadAlignmentPreview: async (contextId) => {
    await loadAlignmentPreviewInternal(contextId);
  },
  refreshContexts: async () => {
    const response = await client.listContexts();
    set((state) => ({
      contexts: response.contexts,
      selectedAnalysisContextId: resolveDefaultContextId(response.contexts, state.selectedAnalysisContextId)
    }));
    void loadAlignmentPreviewsInternal();
  },
  setSelectedAnalysisContext: (contextId) => {
    set((state) => ({
      selectedAnalysisContextId: contextId,
      alignmentPreview: resolveSelectedAlignmentPreview(state.sessionAnalysis, contextId, state.alignmentPreviews)
    }));
    void loadAlignmentPreviewInternal(contextId);
  },
  createAnalysisContext: async (input) => {
    const response = await client.createContext(input);
    set((state) => ({
      contexts: [response.context, ...state.contexts.filter((context) => context.id !== response.context.id)],
      alignmentPreviews: {},
      alignmentPreview: null,
      isAlignmentPreviewLoading: false,
      selectedAnalysisContextId: response.context.id
    }));
    await loadAlignmentPreviewsInternal();
  },
  deleteAnalysisContext: async (contextId) => {
    await client.deleteContext(contextId);
    const response = await client.listContexts();
    set((state) => ({
      contexts: response.contexts,
      alignmentPreviews: Object.fromEntries(Object.entries(state.alignmentPreviews).filter(([key]) => key !== contextId)),
      alignmentPreview: state.selectedAnalysisContextId === contextId
        ? null
        : resolveSelectedAlignmentPreview(
            state.sessionAnalysis,
            state.selectedAnalysisContextId,
            Object.fromEntries(Object.entries(state.alignmentPreviews).filter(([key]) => key !== contextId))
          ),
      isAlignmentPreviewLoading: false,
      selectedAnalysisContextId: resolveDefaultContextId(response.contexts, state.selectedAnalysisContextId === contextId ? null : state.selectedAnalysisContextId)
    }));
    void loadAlignmentPreviewsInternal();
  },
  markAnalysisFamiliarity: async (input) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    await client.createFamiliarity({
      sessionId: session.id,
      uncertaintyId: input.uncertaintyId,
      assumptionId: input.assumptionId,
      claimId: input.claimId,
      signalType: input.signalType,
      userNote: input.userNote
    });
    const familiarities = await client.listFamiliarities(session.id);
    set({ familiarities: familiarities.familiarities });
  },
  answerQuestion: async (questionId, answer, resolutionNote) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    set({ isBusy: true, error: null });
    try {
      const response = await client.answerQuestion({ sessionId: session.id, questionId, answer, resolutionNote });
      const history = await client.getQuestionHistory(session.id);
      set({ activeQuestions: response.activeQuestions, questionHistory: history.questions, isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  archiveQuestion: async (questionId) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }
    const response = await client.archiveQuestion(session.id, questionId);
    const history = await client.getQuestionHistory(session.id);
    set({ activeQuestions: response.activeQuestions, questionHistory: history.questions });
  },
  resolveQuestion: async (questionId) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }
    const response = await client.resolveQuestion(session.id, questionId);
    const history = await client.getQuestionHistory(session.id);
    set({ activeQuestions: response.activeQuestions, questionHistory: history.questions });
  },
  reopenQuestion: async (questionId) => {
    const session = get().currentSession;
    if (!session) {
      return;
    }
    const response = await client.reopenQuestion(session.id, questionId);
    const history = await client.getQuestionHistory(session.id);
    set({ activeQuestions: response.activeQuestions, questionHistory: history.questions });
  },
  clearAllQuestions: async () => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    set({ isBusy: true, error: null });
    try {
      const response = await client.clearAllQuestions(session.id);
      const history = await client.getQuestionHistory(session.id);
      set({ activeQuestions: response.activeQuestions, questionHistory: history.questions, isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  runDatabaseQuery: async (query, interpret) => {
    const session = await ensureSession(get);
    set({ isBusy: true, error: null });
    try {
      const result = await client.queryDatabase({ sessionId: session.id, query, interpret });
      set({ databaseResult: result, isBusy: false, activePanel: "database" });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  generateReport: async (reportType) => {
    const session = await ensureSession(get);
    set({ isBusy: true, error: null });
    try {
      const { report } = await client.generateReport(session.id, reportType);
      set((state) => ({
        reports: [report, ...state.reports.filter((item) => item.id !== report.id)],
        selectedReport: report,
        activePanel: "reports",
        isBusy: false
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  deleteReport: async (reportId) => {
    set({ isBusy: true, error: null });
    try {
      await client.deleteReport(reportId);
      set((state) => {
        const reports = state.reports.filter((report) => report.id !== reportId);
        return {
          reports,
          selectedReport: state.selectedReport?.id === reportId ? (reports[0] ?? null) : state.selectedReport,
          activePanel: "reports",
          isBusy: false
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  clearReports: async () => {
    const session = get().currentSession;
    if (!session) {
      return;
    }

    set({ isBusy: true, error: null });
    try {
      await client.clearReports(session.id);
      set({ reports: [], selectedReport: null, activePanel: "reports", isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  submitCapture: async (capture, analyze) => {
    const session = await ensureSession(get);
    set({ isBusy: true, error: null, activePanel: "capture" });
    try {
      const result = await client.submitCapture({
        sessionId: session.id,
        dataUrl: capture.dataUrl,
        mimeType: "image/png",
        analyze,
        crop: capture.crop
      });
      set((state) => ({
        captureResult: result,
        pendingAttachments: mergePendingAttachments(state.pendingAttachments, [result.attachment]),
        isBusy: false
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  updateSettings: async (patch) => {
    set({ isBusy: true, error: null });
    try {
      const settings = await client.updateRuntimeSettings(patch);
      set({ settings, isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  startGitHubLogin: async () => {
    stopGitHubLoginPolling();

    try {
      const flow = await client.startGitHubLogin();
      set({ githubLoginFlow: flow, error: null });

       if (flow.verificationUri && flow.state === "waiting") {
        try {
          await openExternalUrl(flow.verificationUri);
        } catch {
          // Keep the flow active even if opening the external browser fails.
        }
      }

      if (!TERMINAL_GITHUB_LOGIN_STATES.has(flow.state)) {
        scheduleGitHubLoginPoll(flow.id);
      } else if (flow.state === "succeeded") {
        try {
          await refreshRuntimeSettingsOnly(true);
        } catch (error) {
          set({
            githubLoginFlow: {
              ...flow,
              message: `${flow.message} The login was stored, but refreshing models failed: ${error instanceof Error ? error.message : String(error)}`,
              updatedAt: new Date().toISOString()
            }
          });
        }
      }
    } catch (error) {
      set({
        githubLoginFlow: createLocalGitHubLoginFailure(error instanceof Error ? error.message : String(error), get().githubLoginFlow)
      });
    }
  },
  saveGitHubModelsToken: async (token) => {
    stopGitHubLoginPolling();
    set({ isBusy: true, error: null, githubLoginFlow: null });
    try {
      await client.setGitHubModelsToken(token);
      const settings = await refreshRuntimeSettingsOnly(true);
      set({ settings, isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  clearGitHubModelsToken: async () => {
    stopGitHubLoginPolling();
    set({ isBusy: true, error: null, githubLoginFlow: null });
    try {
      await client.clearGitHubModelsToken();
      const settings = await refreshRuntimeSettingsOnly(true);
      set({ settings, isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  importResearch: async (payload, enabledForContext) => {
    const session = await ensureSession(get);
    set({ isBusy: true, error: null, activePanel: "settings" });
    try {
      await client.importResearch({ sessionId: session.id, payload, enabledForContext });
      const researchRuns = await client.listResearchRuns(session.id);
      set({ researchRuns: researchRuns.runs, isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  },
  shutdownRuntime: async () => {
    set({ isBusy: true, error: null });
    try {
      await client.shutdownRuntime();
      set({ isBusy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), isBusy: false });
    }
  }
  };
});