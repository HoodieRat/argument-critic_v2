import { render, screen } from "@testing-library/react";

import { App } from "./App";

const enterAnalysisWorkspaceMock = vi.hoisted(() => vi.fn(async () => undefined));
const exitAnalysisWorkspaceMock = vi.hoisted(() => vi.fn(async () => undefined));
const refreshViewportMeasurementsMock = vi.hoisted(() => vi.fn());
const subscribeToAnalysisViewportChangesMock = vi.hoisted(() => vi.fn(() => () => undefined));
const syncDesktopThemeMock = vi.hoisted(() => vi.fn(async () => undefined));

const mockStoreState = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  activeQuestions: [],
  activePanel: "analysis",
  mode: "critic",
  settings: { githubModelsToken: { configured: true } },
  themePreference: "studio",
  densityPreference: "compact",
  sessionAnalysis: {
    claims: [],
    assumptions: [],
    critiques: [],
    uncertainties: [],
    alignments: []
  },
  turnAnalysis: null,
  contexts: [],
  familiarities: [],
  alignmentPreviews: {},
  alignmentPreview: null,
  isAlignmentPreviewLoading: false,
  selectedAnalysisContextId: null,
  isBusy: false,
  error: null,
  apiBaseUrl: "http://127.0.0.1:4317",
  githubLoginFlow: null,
  researchRuns: [],
  messages: [],
  sessions: [],
  currentSession: null,
  pendingAttachments: [],
  reports: [],
  selectedReport: null,
  databaseResult: null,
  setActivePanel: vi.fn(),
  setThemePreference: vi.fn(async () => undefined),
  setDensityPreference: vi.fn(async () => undefined),
  setMode: vi.fn(),
  captureCropArea: vi.fn(async () => undefined),
  shutdownRuntime: vi.fn(async () => undefined),
  setApiBaseUrl: vi.fn(async () => undefined),
  updateSettings: vi.fn(async () => undefined),
  startGitHubLogin: vi.fn(async () => undefined),
  saveGitHubModelsToken: vi.fn(async () => undefined),
  clearGitHubModelsToken: vi.fn(async () => undefined),
  importResearch: vi.fn(async () => undefined),
  sendMessage: vi.fn(async () => undefined),
  uploadAttachments: vi.fn(async () => undefined),
  removePendingAttachment: vi.fn(),
  cancelTurn: vi.fn(async () => undefined),
  createSession: vi.fn(async () => undefined),
  renameCurrentSession: vi.fn(async () => undefined),
  updateCurrentSessionSettings: vi.fn(async () => undefined),
  selectSession: vi.fn(async () => undefined),
  importCurrentSessionToMode: vi.fn(async () => undefined),
  loadQuestionHistory: vi.fn(async () => undefined),
  answerQuestion: vi.fn(async () => undefined),
  archiveQuestion: vi.fn(async () => undefined),
  resolveQuestion: vi.fn(async () => undefined),
  reopenQuestion: vi.fn(async () => undefined),
  clearAllQuestions: vi.fn(async () => undefined),
  runDatabaseQuery: vi.fn(async () => undefined),
  generateReport: vi.fn(async () => undefined),
  captureVisibleArea: vi.fn(async () => undefined),
  setSelectedAnalysisContext: vi.fn(),
  createAnalysisContext: vi.fn(async () => undefined),
  deleteAnalysisContext: vi.fn(async () => undefined),
  markAnalysisFamiliarity: vi.fn(async () => undefined)
}));

const useAppStoreMock = vi.hoisted(() =>
  Object.assign(
    vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
      if (selector) {
        return selector(mockStoreState);
      }
      return mockStoreState;
    }),
    {
      setState: vi.fn()
    }
  )
);

vi.mock("./platform", () => ({
  enterAnalysisWorkspace: enterAnalysisWorkspaceMock,
  exitAnalysisWorkspace: exitAnalysisWorkspaceMock,
  refreshViewportMeasurements: refreshViewportMeasurementsMock,
  subscribeToAnalysisViewportChanges: subscribeToAnalysisViewportChangesMock,
  syncDesktopTheme: syncDesktopThemeMock
}));

vi.mock("./state/store", () => ({
  useAppStore: useAppStoreMock
}));

vi.mock("./components/CaptureControls", () => ({ CaptureControls: () => null }));
vi.mock("./components/CaptureStatusCard", () => ({ CaptureStatusCard: () => null }));
vi.mock("./components/ChatView", () => ({ ChatView: () => null }));
vi.mock("./components/AnalysisWorkspaceForm", () => ({ AnalysisWorkspaceForm: () => <div>Analysis Workspace</div> }));
vi.mock("./components/DatabasePanel", () => ({ DatabasePanel: () => null }));
vi.mock("./components/QuestionHistoryPanel", () => ({ QuestionHistoryPanel: () => null }));
vi.mock("./components/ReportsPanel", () => ({ ReportsPanel: () => null }));
vi.mock("./components/SessionHeader", () => ({ SessionHeader: () => null }));
vi.mock("./components/SettingsPanel", () => ({ SettingsPanel: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mockStoreState.activePanel = "analysis";
  mockStoreState.settings = { githubModelsToken: { configured: true } };
  document.documentElement.dataset.theme = "";
  document.documentElement.dataset.density = "";
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
    configurable: true
  });
});

test("enters analysis workspace mode when analysis panel is active", () => {
  render(<App />);
  expect(enterAnalysisWorkspaceMock).toHaveBeenCalled();
  expect(syncDesktopThemeMock).toHaveBeenCalledWith("studio");
  expect(document.documentElement.dataset.theme).toBe("studio");
  expect(document.documentElement.dataset.density).toBe("compact");
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
});

test("exits analysis workspace mode and resets scroll when analysis panel is not active", () => {
  mockStoreState.activePanel = "history";
  render(<App />);
  expect(exitAnalysisWorkspaceMock).toHaveBeenCalled();
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
});

test("shows the compact auth notice and workspace panel summaries when signed out", () => {
  mockStoreState.activePanel = "history";
  mockStoreState.settings = { githubModelsToken: { configured: false } };

  render(<App />);

  expect(screen.getByText("GitHub sign-in needed")).toBeInTheDocument();
  expect(screen.getByText("Follow-up queue")).toBeInTheDocument();
  expect(screen.getByText("Stored data")).toBeInTheDocument();
});
