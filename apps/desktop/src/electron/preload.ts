import { contextBridge, ipcRenderer } from "electron";

const analysisViewportChangedChannel = "argument-critic-desktop:analysis-viewport-changed";
type ThemePreference = "studio" | "slate" | "forest";

type CropBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

contextBridge.exposeInMainWorld("argumentCriticDesktop", {
  enterAnalysisWorkspace: () => ipcRenderer.invoke("argument-critic-desktop:enter-analysis-workspace"),
  exitAnalysisWorkspace: () => ipcRenderer.invoke("argument-critic-desktop:exit-analysis-workspace"),
  setTheme: (theme: ThemePreference) => ipcRenderer.invoke("argument-critic-desktop:set-theme", theme),
  onAnalysisViewportChanged: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on(analysisViewportChangedChannel, listener);
    return () => {
      ipcRenderer.removeListener(analysisViewportChangedChannel, listener);
    };
  },
  captureVisible: () => ipcRenderer.invoke("argument-critic-desktop:capture-visible"),
  captureCrop: () => ipcRenderer.invoke("argument-critic-desktop:capture-crop"),
  getCropPayload: (captureToken: string) => ipcRenderer.invoke("argument-critic-desktop:get-crop-payload", captureToken),
  completeCrop: (captureToken: string, bounds: CropBounds) => ipcRenderer.invoke("argument-critic-desktop:complete-crop", captureToken, bounds),
  cancelCrop: (captureToken: string) => ipcRenderer.invoke("argument-critic-desktop:cancel-crop", captureToken),
  openExternal: (url: string) => ipcRenderer.invoke("argument-critic-desktop:open-external", url),
  copyText: (value: string) => ipcRenderer.invoke("argument-critic-desktop:copy-text", value)
});