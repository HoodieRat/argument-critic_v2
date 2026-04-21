import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatView } from "./ChatView";
import type { AttachmentRecord, RuntimeSettings, SessionRecord } from "../types";

function createSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: overrides.id ?? "session-1",
    title: overrides.title ?? "Main session",
    mode: overrides.mode ?? "critic",
    topic: overrides.topic ?? null,
    summary: overrides.summary ?? null,
    sourceSessionId: overrides.sourceSessionId ?? null,
    sourceSessionMode: overrides.sourceSessionMode ?? null,
    handoffPrompt: overrides.handoffPrompt ?? null,
    criticalityMultiplier: overrides.criticalityMultiplier ?? 1,
    structuredOutputEnabled: overrides.structuredOutputEnabled ?? true,
    imageTextExtractionEnabled: overrides.imageTextExtractionEnabled ?? true,
    createdAt: overrides.createdAt ?? "2026-04-21T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-21T00:00:00.000Z"
  };
}

function createAttachment(overrides: Partial<AttachmentRecord> = {}): AttachmentRecord {
  return {
    id: overrides.id ?? "attachment-1",
    sessionId: overrides.sessionId ?? "session-1",
    type: overrides.type ?? "upload",
    path: overrides.path ?? "C:/capture.png",
    displayName: overrides.displayName ?? "capture.png",
    mimeType: overrides.mimeType ?? "image/png",
    width: overrides.width ?? 200,
    height: overrides.height ?? 100,
    contentHash: overrides.contentHash ?? "hash",
    createdAt: overrides.createdAt ?? "2026-04-21T00:00:00.000Z"
  };
}

function createModel(overrides: Partial<RuntimeSettings["availableGitHubModels"][number]> = {}): RuntimeSettings["availableGitHubModels"][number] {
  return {
    id: overrides.id ?? "gpt-5.4",
    name: overrides.name ?? "GPT-5.4",
    vendor: overrides.vendor ?? "OpenAI",
    family: overrides.family ?? "gpt-5",
    preview: overrides.preview ?? false,
    isDefault: overrides.isDefault ?? true,
    isFallback: overrides.isFallback ?? false,
    isPremium: overrides.isPremium ?? true,
    multiplier: overrides.multiplier ?? 2,
    degradationReason: overrides.degradationReason ?? null,
    supportsVision: overrides.supportsVision ?? true,
    supportsToolCalls: overrides.supportsToolCalls ?? true,
    supportsThinking: overrides.supportsThinking ?? true,
    supportsAdaptiveThinking: overrides.supportsAdaptiveThinking ?? false,
    supportsReasoningEffort: overrides.supportsReasoningEffort ?? ["low", "medium", "high"],
    minThinkingBudget: overrides.minThinkingBudget ?? 1024,
    maxThinkingBudget: overrides.maxThinkingBudget ?? 4096,
    maxInputTokens: overrides.maxInputTokens ?? 128000,
    maxOutputTokens: overrides.maxOutputTokens ?? 8192,
    supportedEndpoints: overrides.supportedEndpoints ?? ["chat/completions"]
  };
}

function createProps(overrides: Partial<React.ComponentProps<typeof ChatView>> = {}): React.ComponentProps<typeof ChatView> {
  const currentSession = overrides.currentSession ?? createSession();
  const model = createModel();

  return {
    messages: overrides.messages ?? [],
    sessions: overrides.sessions ?? [currentSession],
    currentSession,
    mode: overrides.mode ?? "critic",
    apiBaseUrl: overrides.apiBaseUrl ?? "http://127.0.0.1:4317",
    busy: overrides.busy ?? false,
    githubModel: overrides.githubModel ?? model.id,
    availableGitHubModels: overrides.availableGitHubModels ?? [model],
    modelAccess: overrides.modelAccess ?? { backend: "copilot", tokenKind: "oauth_token", warning: null },
    githubModelThinkingEnabled: overrides.githubModelThinkingEnabled ?? true,
    githubModelReasoningEffort: overrides.githubModelReasoningEffort ?? "medium",
    githubModelThinkingBudget: overrides.githubModelThinkingBudget ?? 2048,
    tokenConfigured: overrides.tokenConfigured ?? true,
    pendingAttachments: overrides.pendingAttachments ?? [],
    onSend: overrides.onSend ?? vi.fn(async () => undefined),
    onUploadFiles: overrides.onUploadFiles ?? vi.fn(async () => undefined),
    onRemovePendingAttachment: overrides.onRemovePendingAttachment ?? vi.fn(),
    onCancel: overrides.onCancel ?? vi.fn(async () => undefined),
    onCreateSession: overrides.onCreateSession ?? vi.fn(),
    onRenameSession: overrides.onRenameSession ?? vi.fn(),
    onUpdateSessionSettings: overrides.onUpdateSessionSettings ?? vi.fn(async () => undefined),
    onSelectSession: overrides.onSelectSession ?? vi.fn(),
    onImportSessionToMode: overrides.onImportSessionToMode ?? vi.fn(),
    onOpenSettings: overrides.onOpenSettings ?? vi.fn(),
    onUpdateSettings: overrides.onUpdateSettings ?? vi.fn(async () => undefined)
  };
}

test("keeps session and composer controls packed in the compact chat layout", () => {
  render(<ChatView {...createProps({ pendingAttachments: [createAttachment()] })} />);

  expect(screen.getByText("1 session")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Paste or import the argument you want challenged.")).toHaveAttribute("rows", "2");
  expect(screen.getByText("Criticality")).toBeInTheDocument();
  expect(screen.getByText("Thinking")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Attach files" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
});

test("opens settings from the compact model area when the user is signed out", async () => {
  const user = userEvent.setup();
  const onOpenSettings = vi.fn();

  render(
    <ChatView
      {...createProps({
        tokenConfigured: false,
        githubModel: null,
        availableGitHubModels: [],
        onOpenSettings
      })}
    />
  );

  await user.click(screen.getByRole("button", { name: "Sign in with GitHub" }));

  expect(onOpenSettings).toHaveBeenCalledTimes(1);
});