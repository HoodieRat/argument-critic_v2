import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

type SidepanelBootState = {
  ready: Promise<void>;
};

async function bootstrap(): Promise<void> {
  await (window as Window & { __argumentCriticSidepanelBoot?: SidepanelBootState }).__argumentCriticSidepanelBoot?.ready;

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found.");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();