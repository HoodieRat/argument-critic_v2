import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SettingsPanel } from "./SettingsPanel";
import type { RuntimeSettings } from "../types";

function createSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    researchEnabled: overrides.researchEnabled ?? true,
    questionGenerationEnabled: overrides.questionGenerationEnabled ?? true,
    githubLoginAuthMethod: overrides.githubLoginAuthMethod ?? "oauth-device",
    githubModel: overrides.githubModel ?? "gpt-5.4",
    availableGitHubModels: overrides.availableGitHubModels ?? [
      {
        id: "gpt-5.4",
        name: "GPT-5.4",
        vendor: "OpenAI",
        family: "gpt-5",
        preview: false,
        isDefault: true,
        isFallback: false,
        isPremium: true,
        multiplier: 2,
        degradationReason: null,
        supportsVision: true,
        supportsToolCalls: true,
        supportsThinking: true,
        supportsAdaptiveThinking: false,
        supportsReasoningEffort: ["medium"],
        minThinkingBudget: 1024,
        maxThinkingBudget: 4096,
        maxInputTokens: 128000,
        maxOutputTokens: 8192,
        supportedEndpoints: ["chat/completions"]
      }
    ],
    modelAccess: overrides.modelAccess ?? { backend: "copilot", tokenKind: "oauth_token", warning: null },
    githubModelThinkingEnabled: overrides.githubModelThinkingEnabled ?? true,
    githubModelReasoningEffort: overrides.githubModelReasoningEffort ?? "medium",
    githubModelThinkingBudget: overrides.githubModelThinkingBudget ?? 2048,
    sessionAutoTitleEnabled: overrides.sessionAutoTitleEnabled ?? true,
    githubModelsToken: overrides.githubModelsToken ?? { configured: true, source: "secure_store", updatedAt: "2026-04-21T00:00:00.000Z" }
  };
}

function createProps(overrides: Partial<React.ComponentProps<typeof SettingsPanel>> = {}): React.ComponentProps<typeof SettingsPanel> {
  return {
    apiBaseUrl: overrides.apiBaseUrl ?? "http://127.0.0.1:4317",
    settings: overrides.settings ?? createSettings(),
    themePreference: overrides.themePreference ?? "studio",
    densityPreference: overrides.densityPreference ?? "compact",
    githubLoginFlow: overrides.githubLoginFlow ?? null,
    researchRuns: overrides.researchRuns ?? [],
    busy: overrides.busy ?? false,
    onSetApiBaseUrl: overrides.onSetApiBaseUrl ?? vi.fn(async () => undefined),
    onSetThemePreference: overrides.onSetThemePreference ?? vi.fn(async () => undefined),
    onSetDensityPreference: overrides.onSetDensityPreference ?? vi.fn(async () => undefined),
    onUpdateSettings: overrides.onUpdateSettings ?? vi.fn(async () => undefined),
    onStartGitHubLogin: overrides.onStartGitHubLogin ?? vi.fn(async () => undefined),
    onSaveGitHubModelsToken: overrides.onSaveGitHubModelsToken ?? vi.fn(async () => undefined),
    onClearGitHubModelsToken: overrides.onClearGitHubModelsToken ?? vi.fn(async () => undefined),
    onImportResearch: overrides.onImportResearch ?? vi.fn(async () => undefined)
  };
}

test("surfaces the compact control board outside the advanced fallback tools", () => {
  render(<SettingsPanel {...createProps()} />);

  expect(screen.getByText("Compact control board")).toBeInTheDocument();
  expect(screen.getByText("Project theme")).toBeInTheDocument();
  expect(screen.getByText("Spacing density")).toBeInTheDocument();
  expect(screen.getByText("Manual fallback and import tools")).toBeInTheDocument();
  expect(screen.getByText("Current account catalog")).toBeInTheDocument();
});

test("updates theme and density from the visible control board", async () => {
  const user = userEvent.setup();
  const onSetThemePreference = vi.fn(async () => undefined);
  const onSetDensityPreference = vi.fn(async () => undefined);

  render(<SettingsPanel {...createProps({ onSetThemePreference, onSetDensityPreference })} />);

  await user.click(screen.getByRole("radio", { name: "Forest" }));
  await user.click(screen.getByRole("radio", { name: "Comfortable" }));

  expect(onSetThemePreference).toHaveBeenCalledWith("forest");
  expect(onSetDensityPreference).toHaveBeenCalledWith("comfortable");
});