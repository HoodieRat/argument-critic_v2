import type { AnalysisDensity, BackgroundCaptureResult, ThemePreference } from "./types";

type ChromeRuntimeLike = {
  readonly lastError?: { readonly message: string };
  readonly sendMessage?: (message: { readonly type: string }, callback: (response: unknown) => void) => void;
};

type ChromeStorageAreaLike = {
  readonly get: (keys: string[]) => Promise<Record<string, unknown>>;
  readonly set: (items: Record<string, string>) => Promise<void>;
};

type ChromeApiLike = {
  readonly runtime?: ChromeRuntimeLike;
  readonly storage?: {
    readonly local?: ChromeStorageAreaLike;
  };
};

type CropBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type CropPayload = {
  readonly dataUrl: string;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly displayBounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

type DesktopBridge = {
  readonly enterAnalysisWorkspace: () => Promise<{ accepted: boolean }>;
  readonly exitAnalysisWorkspace: () => Promise<{ accepted: boolean }>;
  readonly onAnalysisViewportChanged?: (callback: () => void) => (() => void);
  readonly syncTheme?: (theme: ThemePreference) => Promise<{ accepted: boolean }>;
  readonly captureVisible: () => Promise<BackgroundCaptureResult>;
  readonly captureCrop: () => Promise<BackgroundCaptureResult>;
  readonly getCropPayload: (captureToken: string) => Promise<CropPayload>;
  readonly completeCrop: (captureToken: string, bounds: CropBounds) => Promise<{ accepted: boolean }>;
  readonly cancelCrop: (captureToken: string) => Promise<{ accepted: boolean }>;
  readonly openExternal: (url: string) => Promise<{ accepted: boolean }>;
  readonly copyText: (value: string) => Promise<{ accepted: boolean }>;
};

const API_BASE_STORAGE_KEY = "argumentCriticApiBaseUrl";
const THEME_STORAGE_KEY = "argumentCriticThemePreference";
const DENSITY_STORAGE_KEY = "argumentCriticDensityPreference";

function getChromeApi(): ChromeApiLike | undefined {
  return (globalThis as typeof globalThis & { chrome?: ChromeApiLike }).chrome;
}

function getDesktopBridge(): DesktopBridge | undefined {
  return (window as Window & { argumentCriticDesktop?: DesktopBridge }).argumentCriticDesktop;
}

function applyViewportHeightVariable(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--app-viewport-height", `${window.innerHeight}px`);
}

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

async function sendBackgroundMessage<T>(type: string): Promise<T> {
  const chromeApi = getChromeApi();
  const runtime = chromeApi?.runtime;
  const sendMessage = runtime?.sendMessage;
  if (!sendMessage) {
    throw new Error("Capture is only available in the desktop drawer or the legacy browser helper.");
  }

  return await new Promise<T>((resolve, reject) => {
    sendMessage({ type }, (response) => {
      const runtimeError = runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      if (!response) {
        reject(new Error("No response from the legacy browser helper."));
        return;
      }

      if (typeof response === "object" && response !== null && "error" in response && typeof response.error === "string") {
        reject(new Error(response.error));
        return;
      }

      resolve(response as T);
    });
  });
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "studio" || value === "slate" || value === "forest";
}

function isAnalysisDensity(value: string | null): value is AnalysisDensity {
  return value === "compact" || value === "comfortable";
}

async function loadPersistedString(key: string, defaultValue: string): Promise<string> {
  const chromeApi = getChromeApi();
  const cachedValue = readLocalStorage(key);
  if (chromeApi?.storage?.local) {
    const value = await chromeApi.storage.local.get([key]);
    return typeof value[key] === "string" ? value[key] : (cachedValue ?? defaultValue);
  }

  return cachedValue ?? defaultValue;
}

async function persistString(key: string, value: string): Promise<void> {
  const chromeApi = getChromeApi();
  writeLocalStorage(key, value);
  if (chromeApi?.storage?.local) {
    await chromeApi.storage.local.set({ [key]: value });
  }
}

export function hasCaptureSupport(): boolean {
  return Boolean(getDesktopBridge() || getChromeApi()?.runtime?.sendMessage);
}

export function refreshViewportMeasurements(): void {
  if (typeof window === "undefined") {
    return;
  }

  const apply = () => {
    applyViewportHeightVariable();
    window.dispatchEvent(new Event("resize"));
  };

  apply();
  window.requestAnimationFrame(() => {
    apply();
  });
  window.setTimeout(() => {
    apply();
  }, 180);
}

export function subscribeToAnalysisViewportChanges(listener: () => void): () => void {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge?.onAnalysisViewportChanged) {
    return () => undefined;
  }

  return desktopBridge.onAnalysisViewportChanged(listener);
}

export function isCaptureCancellationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /crop selection cancelled/i.test(message);
}

export async function loadPersistedApiBaseUrl(defaultBaseUrl: string): Promise<string> {
  const chromeApi = getChromeApi();
  if (chromeApi?.storage?.local) {
    const value = await chromeApi.storage.local.get([API_BASE_STORAGE_KEY]);
    return typeof value[API_BASE_STORAGE_KEY] === "string" ? value[API_BASE_STORAGE_KEY] : defaultBaseUrl;
  }

  return readLocalStorage(API_BASE_STORAGE_KEY) ?? defaultBaseUrl;
}

export async function persistApiBaseUrl(url: string): Promise<void> {
  const chromeApi = getChromeApi();
  if (chromeApi?.storage?.local) {
    await chromeApi.storage.local.set({ [API_BASE_STORAGE_KEY]: url });
    return;
  }

  writeLocalStorage(API_BASE_STORAGE_KEY, url);
}

export async function loadPersistedThemePreference(defaultTheme: ThemePreference): Promise<ThemePreference> {
  const value = await loadPersistedString(THEME_STORAGE_KEY, defaultTheme);
  return isThemePreference(value) ? value : defaultTheme;
}

export function readPersistedThemePreferenceSync(defaultTheme: ThemePreference): ThemePreference {
  const value = readLocalStorage(THEME_STORAGE_KEY);
  return isThemePreference(value) ? value : defaultTheme;
}

export async function persistThemePreference(theme: ThemePreference): Promise<void> {
  await persistString(THEME_STORAGE_KEY, theme);
}

export async function loadPersistedDensityPreference(defaultDensity: AnalysisDensity): Promise<AnalysisDensity> {
  const value = await loadPersistedString(DENSITY_STORAGE_KEY, defaultDensity);
  return isAnalysisDensity(value) ? value : defaultDensity;
}

export function readPersistedDensityPreferenceSync(defaultDensity: AnalysisDensity): AnalysisDensity {
  const value = readLocalStorage(DENSITY_STORAGE_KEY);
  return isAnalysisDensity(value) ? value : defaultDensity;
}

export async function persistDensityPreference(density: AnalysisDensity): Promise<void> {
  await persistString(DENSITY_STORAGE_KEY, density);
}

export async function captureVisible(): Promise<BackgroundCaptureResult> {
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    return await desktopBridge.captureVisible();
  }

  return await sendBackgroundMessage<BackgroundCaptureResult>("argument-critic:capture-visible");
}

export async function captureCrop(): Promise<BackgroundCaptureResult> {
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    return await desktopBridge.captureCrop();
  }

  return await sendBackgroundMessage<BackgroundCaptureResult>("argument-critic:capture-crop");
}

export async function openExternalUrl(url: string): Promise<void> {
  const normalized = url.trim();
  if (!normalized) {
    throw new Error("A URL is required.");
  }

  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    await desktopBridge.openExternal(normalized);
    return;
  }

  if (typeof window !== "undefined") {
    window.open(normalized, "_blank", "noopener,noreferrer");
  }
}

export async function copyText(value: string): Promise<void> {
  const normalized = value ?? "";
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    await desktopBridge.copyText(normalized);
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(normalized);
  }
}

export async function enterAnalysisWorkspace(): Promise<void> {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge) {
    return;
  }

  await desktopBridge.enterAnalysisWorkspace();
  refreshViewportMeasurements();
}

export async function exitAnalysisWorkspace(): Promise<void> {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge) {
    return;
  }

  await desktopBridge.exitAnalysisWorkspace();
  refreshViewportMeasurements();
}

export async function syncDesktopTheme(theme: ThemePreference): Promise<void> {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge?.syncTheme) {
    return;
  }

  await desktopBridge.syncTheme(theme);
}