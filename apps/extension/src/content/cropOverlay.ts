type CropState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type ThemePreference = "studio" | "slate" | "forest";

const THEME_STORAGE_KEY = "argumentCriticThemePreference";

let overlayRoot: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;
let cropState: CropState | null = null;

function normalizeThemePreference(value: string | null | undefined): ThemePreference {
  return value === "slate" || value === "forest" ? value : "studio";
}

async function loadThemePreference(): Promise<ThemePreference> {
  try {
    if (chrome.storage?.local) {
      const value = await chrome.storage.local.get([THEME_STORAGE_KEY]);
      return normalizeThemePreference(typeof value[THEME_STORAGE_KEY] === "string" ? value[THEME_STORAGE_KEY] : null);
    }
  } catch {
    return "studio";
  }

  return "studio";
}

function resolveCropTheme(theme: ThemePreference): {
  readonly overlayBackdrop: string;
  readonly instructionBackground: string;
  readonly instructionColor: string;
  readonly selectionBorder: string;
  readonly selectionFill: string;
} {
  switch (theme) {
    case "slate":
      return {
        overlayBackdrop: "rgba(15, 20, 25, 0.26)",
        instructionBackground: "rgba(17, 24, 31, 0.92)",
        instructionColor: "#edf3f8",
        selectionBorder: "#8cb2f1",
        selectionFill: "rgba(93, 143, 219, 0.18)"
      };
    case "forest":
      return {
        overlayBackdrop: "rgba(13, 21, 17, 0.28)",
        instructionBackground: "rgba(16, 24, 19, 0.92)",
        instructionColor: "#eff6f1",
        selectionBorder: "#74c19a",
        selectionFill: "rgba(63, 159, 112, 0.18)"
      };
    default:
      return {
        overlayBackdrop: "rgba(63, 50, 39, 0.22)",
        instructionBackground: "rgba(255, 249, 242, 0.92)",
        instructionColor: "#352920",
        selectionBorder: "#9e3d22",
        selectionFill: "rgba(158, 61, 34, 0.18)"
      };
  }
}

function destroyOverlay(): void {
  overlayRoot?.remove();
  overlayRoot = null;
  selectionBox = null;
  cropState = null;
  window.removeEventListener("keydown", handleEscape, true);
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  destroyOverlay();
  void chrome.runtime.sendMessage({ type: "argument-critic:crop-result", cancelled: true });
}

function updateSelectionBox(): void {
  if (!cropState || !selectionBox) {
    return;
  }

  const left = Math.min(cropState.startX, cropState.currentX);
  const top = Math.min(cropState.startY, cropState.currentY);
  const width = Math.abs(cropState.currentX - cropState.startX);
  const height = Math.abs(cropState.currentY - cropState.startY);

  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
}

async function buildOverlay(): Promise<void> {
  if (overlayRoot) {
    return;
  }

  const theme = resolveCropTheme(await loadThemePreference());

  overlayRoot = document.createElement("div");
  overlayRoot.style.position = "fixed";
  overlayRoot.style.inset = "0";
  overlayRoot.style.background = theme.overlayBackdrop;
  overlayRoot.style.cursor = "crosshair";
  overlayRoot.style.zIndex = "2147483647";
  overlayRoot.style.backdropFilter = "blur(1px)";

  const instruction = document.createElement("div");
  instruction.textContent = "Drag to select a crop region. Press Esc to cancel.";
  instruction.style.position = "absolute";
  instruction.style.top = "16px";
  instruction.style.left = "50%";
  instruction.style.transform = "translateX(-50%)";
  instruction.style.padding = "10px 14px";
  instruction.style.borderRadius = "999px";
  instruction.style.background = theme.instructionBackground;
  instruction.style.color = theme.instructionColor;
  instruction.style.font = "600 13px Aptos, sans-serif";

  selectionBox = document.createElement("div");
  selectionBox.style.position = "absolute";
  selectionBox.style.border = `2px solid ${theme.selectionBorder}`;
  selectionBox.style.background = theme.selectionFill;
  selectionBox.style.borderRadius = "10px";

  overlayRoot.append(instruction, selectionBox);
  document.documentElement.append(overlayRoot);
  window.addEventListener("keydown", handleEscape, true);

  overlayRoot.addEventListener("mousedown", (event) => {
    cropState = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY
    };
    updateSelectionBox();
  });

  overlayRoot.addEventListener("mousemove", (event) => {
    if (!cropState) {
      return;
    }
    cropState.currentX = event.clientX;
    cropState.currentY = event.clientY;
    updateSelectionBox();
  });

  overlayRoot.addEventListener("mouseup", (event) => {
    if (!cropState) {
      return;
    }
    cropState.currentX = event.clientX;
    cropState.currentY = event.clientY;
    const bounds = {
      x: Math.min(cropState.startX, cropState.currentX),
      y: Math.min(cropState.startY, cropState.currentY),
      width: Math.abs(cropState.currentX - cropState.startX),
      height: Math.abs(cropState.currentY - cropState.startY)
    };
    destroyOverlay();
    void chrome.runtime.sendMessage({ type: "argument-critic:crop-result", bounds });
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "argument-critic:start-crop") {
    void buildOverlay();
  }
});