import { useEffect, useMemo, useRef } from "react";

import { CaptureControls } from "./components/CaptureControls";
import { CaptureStatusCard } from "./components/CaptureStatusCard";
import { ChatView } from "./components/ChatView";
import { AnalysisWorkspaceForm } from "./components/AnalysisWorkspaceForm";
import { DatabasePanel } from "./components/DatabasePanel";
import { QuestionHistoryPanel } from "./components/QuestionHistoryPanel";
import { ReportsPanel } from "./components/ReportsPanel";
import { SessionHeader } from "./components/SessionHeader";
import { SettingsPanel } from "./components/SettingsPanel";
import type { QuestionStatus, ReportRecord } from "./types";
import { useAppStore } from "./state/store";
import { enterAnalysisWorkspace, exitAnalysisWorkspace, refreshViewportMeasurements, subscribeToAnalysisViewportChanges, syncDesktopTheme } from "./platform";

export function App() {
  const initialize = useAppStore((state) => state.initialize);
  const store = useAppStore();
  const activeQuestionCount = store.activeQuestions.length;
  const settingsOpen = store.activePanel === "settings";
  const tokenConfigured = Boolean(store.settings?.githubModelsToken.configured);
  const lastWorkspacePanelRef = useRef<"history" | "analysis" | "database" | "reports" | "capture">("history");
  const workspacePanels: Array<{
    value: "history" | "analysis" | "database" | "reports" | "capture";
    label: string;
    description: string;
    count?: number;
  }> = [
    { value: "history", label: "Questions", description: "Follow-up queue", count: activeQuestionCount },
    { value: "analysis", label: "Analysis", description: "Reasoning map", count: store.sessionAnalysis?.uncertainties.length },
    { value: "database", label: "Records", description: "Stored data" },
    { value: "reports", label: "Reports", description: "Summaries" },
    { value: "capture", label: "Capture", description: "Screenshots" }
  ];

  const topIssue = useMemo(() => {
    const highest = [...(store.sessionAnalysis?.uncertainties ?? [])].sort((left, right) => right.severity - left.severity)[0];
    if (!highest) {
      return null;
    }

    return {
      severity: highest.severity,
      type: highest.uncertaintyType.replace(/_/g, " "),
      suggestion: highest.canBeAddressedVia.replace(/_/g, " ")
    };
  }, [store.sessionAnalysis?.uncertainties]);

  useEffect(() => {
    if (store.activePanel !== "settings") {
      lastWorkspacePanelRef.current = store.activePanel;
    }
  }, [store.activePanel]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [store.activePanel]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = store.themePreference;
    document.documentElement.dataset.density = store.densityPreference;
    void syncDesktopTheme(store.themePreference);
  }, [store.themePreference, store.densityPreference]);

  useEffect(() => {
    refreshViewportMeasurements();
    return subscribeToAnalysisViewportChanges(() => {
      refreshViewportMeasurements();
    });
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (store.activePanel === "analysis") {
      void enterAnalysisWorkspace();
      return;
    }

    void exitAnalysisWorkspace();
  }, [store.activePanel]);

  useEffect(() => {
    return () => {
      void exitAnalysisWorkspace();
    };
  }, []);

  async function handleFilter(status?: QuestionStatus) {
    await store.loadQuestionHistory(status);
  }

  function handleOpenSettings(): void {
    if (store.activePanel === "settings") {
      store.setActivePanel(lastWorkspacePanelRef.current);
      return;
    }

    store.setActivePanel("settings");
  }

  function handleModeChange(mode: Parameters<typeof store.setMode>[0]): void {
    if (store.activePanel === "settings") {
      store.setActivePanel(lastWorkspacePanelRef.current);
    }

    void store.setMode(mode);
  }

  return (
    <div className="app-shell">
      <SessionHeader
        busy={store.isBusy}
        mode={store.mode}
        themePreference={store.themePreference}
        settingsViewOpen={settingsOpen}
        onSetMode={handleModeChange}
        onSetThemePreference={store.setThemePreference}
        onOpenSettings={handleOpenSettings}
        onCaptureCrop={() => void store.captureCropArea(true)}
        onShutdown={() => void store.shutdownRuntime()}
      />

      {store.error ? <div className="error-banner">{store.error}</div> : null}

      {!settingsOpen && !tokenConfigured ? (
        <div className="compact-auth-notice" role="status">
          <span>GitHub sign-in needed</span>
          <button className="ghost-button compact-auth-notice__action" type="button" onClick={handleOpenSettings}>
            Sign in
          </button>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="layout-grid layout-grid--settings">
          <div className="layout-grid__full">
            <SettingsPanel
              apiBaseUrl={store.apiBaseUrl}
              settings={store.settings}
              themePreference={store.themePreference}
              densityPreference={store.densityPreference}
              githubLoginFlow={store.githubLoginFlow}
              researchRuns={store.researchRuns}
              busy={store.isBusy}
              onSetApiBaseUrl={store.setApiBaseUrl}
              onSetThemePreference={store.setThemePreference}
              onSetDensityPreference={store.setDensityPreference}
              onUpdateSettings={store.updateSettings}
              onStartGitHubLogin={store.startGitHubLogin}
              onSaveGitHubModelsToken={store.saveGitHubModelsToken}
              onClearGitHubModelsToken={store.clearGitHubModelsToken}
              onImportResearch={store.importResearch}
            />
          </div>
        </div>
      ) : store.activePanel === "analysis" ? (
        <section className="analysis-screen">
          <AnalysisWorkspaceForm
            analysis={store.sessionAnalysis}
            turnAnalysis={store.turnAnalysis}
            contexts={store.contexts}
            familiarities={store.familiarities}
            alignmentPreviews={store.alignmentPreviews}
            alignmentPreviewLoading={store.isAlignmentPreviewLoading}
            selectedContextId={store.selectedAnalysisContextId}
            busy={store.isBusy}
            onSelectContext={store.setSelectedAnalysisContext}
            onCreateContext={store.createAnalysisContext}
            onDeleteContext={store.deleteAnalysisContext}
            onMarkFamiliarity={store.markAnalysisFamiliarity}
            onExit={() => store.setActivePanel("history")}
          />
        </section>
      ) : (
        <div className="layout-grid">
          <div className="layout-grid__main">
            {store.captureResult ? <CaptureStatusCard result={store.captureResult} onOpenCapture={() => store.setActivePanel("capture")} /> : null}

            <ChatView
              apiBaseUrl={store.apiBaseUrl}
              messages={store.messages}
              sessions={store.sessions}
              currentSession={store.currentSession}
              mode={store.mode}
              busy={store.isBusy}
              githubModel={store.settings?.githubModel ?? null}
              availableGitHubModels={store.settings?.availableGitHubModels ?? []}
              modelAccess={store.settings?.modelAccess ?? { backend: "none", tokenKind: "none", warning: null }}
              githubModelThinkingEnabled={store.settings?.githubModelThinkingEnabled ?? false}
              githubModelReasoningEffort={store.settings?.githubModelReasoningEffort ?? null}
              githubModelThinkingBudget={store.settings?.githubModelThinkingBudget ?? null}
              tokenConfigured={tokenConfigured}
              pendingAttachments={store.pendingAttachments}
              onSend={store.sendMessage}
              onUploadFiles={store.uploadAttachments}
              onRemovePendingAttachment={store.removePendingAttachment}
              onCancel={store.cancelTurn}
              onCreateSession={(mode) => void store.createSession(undefined, mode)}
              onRenameSession={(title) => void store.renameCurrentSession(title)}
              onUpdateSessionSettings={store.updateCurrentSessionSettings}
              onSelectSession={(sessionId) => void store.selectSession(sessionId)}
              onImportSessionToMode={(mode) => void store.importCurrentSessionToMode(mode)}
              onOpenSettings={handleOpenSettings}
              onUpdateSettings={store.updateSettings}
            />
          </div>

          <div className="layout-grid__side">
            <nav className="panel-tabs panel-tabs--workspace card">
              {workspacePanels.map(({ value, label, description, count }) => (
                <button
                  key={value}
                  type="button"
                  className={`panel-tab ${store.activePanel === value ? "panel-tab--active" : ""}`}
                  onClick={() => store.setActivePanel(value as never)}
                >
                  <span className="panel-tab__meta">
                    <span className="panel-tab__label">{label}</span>
                    <span className="panel-tab__description">{description}</span>
                  </span>
                  {typeof count === "number" ? <span className={`panel-tab__count ${count > 0 ? "panel-tab__count--active" : ""}`}>{count}</span> : null}
                </button>
              ))}
            </nav>

            {store.sessionAnalysis ? (
              <section className="card compact-card analysis-glance" aria-label="Analysis quick summary">
                <div className="analysis-glance__row">
                  <p className="eyebrow">Reasoning Snapshot</p>
                  <button className="ghost-button" type="button" onClick={() => store.setActivePanel("analysis")}>
                    Open analysis
                  </button>
                </div>
                <div className="analysis-glance__metrics">
                  <span className="count-badge">{store.sessionAnalysis.uncertainties.length} weak spots</span>
                  <span className="count-badge">{store.sessionAnalysis.assumptions.length} assumptions</span>
                  <span className="count-badge">{store.sessionAnalysis.critiques.length} critiques</span>
                </div>
                {topIssue ? (
                  <p className="detail-line">
                    Top issue: {topIssue.type} (severity {topIssue.severity}). Best next move: {topIssue.suggestion}.
                  </p>
                ) : (
                  <p className="detail-line">Send a fuller argument to surface stronger analysis insights.</p>
                )}
              </section>
            ) : null}

            {store.activePanel === "history" ? (
              <QuestionHistoryPanel
                sessionTitle={store.currentSession?.title ?? "Working Session"}
                activeQuestions={store.activeQuestions}
                questions={store.questionHistory}
                onFilter={handleFilter}
                onAnswer={store.answerQuestion}
                onArchive={store.archiveQuestion}
                onResolve={store.resolveQuestion}
                onReopen={store.reopenQuestion}
                onClearAll={store.clearAllQuestions}
              />
            ) : null}

            {store.activePanel === "database" ? <DatabasePanel result={store.databaseResult} onQuery={store.runDatabaseQuery} /> : null}

            {store.activePanel === "reports" ? (
              <ReportsPanel
                reports={store.reports}
                selectedReport={store.selectedReport}
                busy={store.isBusy}
                onGenerate={store.generateReport}
                onDelete={store.deleteReport}
                onClearAll={store.clearReports}
                onSelect={(report: ReportRecord) => useAppStore.setState({ selectedReport: report })}
              />
            ) : null}

            {store.activePanel === "capture" ? (
              <CaptureControls
                result={store.captureResult}
                onCaptureVisible={store.captureVisibleArea}
                onCaptureCrop={store.captureCropArea}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}