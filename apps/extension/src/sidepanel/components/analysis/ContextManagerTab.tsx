import { useState } from "react";

import type { ContextDefinitionInput, ContextDefinitionRecord } from "../../types";

interface ContextManagerTabProps {
  readonly contexts: ContextDefinitionRecord[];
  readonly busy: boolean;
  readonly selectedContextId: string | null;
  readonly onSelectContext: (contextId: string) => void;
  readonly onCreateContext: (input: ContextDefinitionInput) => Promise<void>;
  readonly onDeleteContext: (contextId: string) => Promise<void>;
}

export function blankContextJson(): string {
  return JSON.stringify({
    canonicalTerms: {},
    coreMoves: [],
    keyMetaphors: [],
    internalDisputes: [],
    commonPitfalls: []
  }, null, 2);
}

function parseLines(input: string): string[] {
  return input
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseCanonicalTerms(input: string): Record<string, string> {
  const terms: Record<string, string> = {};
  for (const line of parseLines(input)) {
    const [term, ...rest] = line.split(":");
    if (!term || rest.length === 0) {
      continue;
    }

    const key = term.trim();
    const value = rest.join(":").trim();
    if (key && value) {
      terms[key] = value;
    }
  }

  return terms;
}

export function coerceContextInput(name: string, contextJson: string): ContextDefinitionInput {
  const parsed = JSON.parse(contextJson) as Omit<ContextDefinitionInput, "name">;
  return {
    name: name.trim(),
    canonicalTerms: parsed.canonicalTerms ?? {},
    coreMoves: parsed.coreMoves ?? [],
    keyMetaphors: parsed.keyMetaphors ?? [],
    internalDisputes: parsed.internalDisputes ?? [],
    commonPitfalls: parsed.commonPitfalls ?? []
  };
}

export function ContextManagerTab(props: ContextManagerTabProps) {
  const [contextName, setContextName] = useState("");
  const [whatThisLensPrioritizes, setWhatThisLensPrioritizes] = useState("");
  const [keyTerms, setKeyTerms] = useState("");
  const [commonBlindSpots, setCommonBlindSpots] = useState("");
  const [advancedJson, setAdvancedJson] = useState(blankContextJson());
  const [contextError, setContextError] = useState<string | null>(null);

  async function handleCreateContext(useAdvancedJson: boolean): Promise<void> {
    setContextError(null);
    try {
      if (useAdvancedJson) {
        await props.onCreateContext(coerceContextInput(contextName, advancedJson));
      } else {
        await props.onCreateContext({
          name: contextName.trim(),
          canonicalTerms: parseCanonicalTerms(keyTerms),
          coreMoves: parseLines(whatThisLensPrioritizes),
          keyMetaphors: [],
          internalDisputes: [],
          commonPitfalls: parseLines(commonBlindSpots)
        });
      }

      setContextName("");
      setWhatThisLensPrioritizes("");
      setKeyTerms("");
      setCommonBlindSpots("");
      setAdvancedJson(blankContextJson());
    } catch (error) {
      setContextError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="analysis-panel__section">
      <div className="analysis-context-manager">
        <div className="analysis-context-manager__list">
          <div className="analysis-context-manager__title-row">
            <p className="eyebrow">Perspective library</p>
            <p className="detail-line">Pick a lens to see how your argument fits that way of thinking.</p>
          </div>
          {props.contexts.map((context) => (
            <article key={context.id} className={`history-item analysis-context-manager__item ${props.selectedContextId === context.id ? "analysis-context-manager__item--active" : ""}`}>
              <div className="history-item__body">
                <div className="history-item__meta">
                  <span className="history-item__status">{context.source}</span>
                  <span>{context.name}</span>
                </div>
                <p className="detail-line">{context.coreMoves[0] ?? "No summary available."}</p>
              </div>
              <div className="analysis-context-manager__item-actions">
                <button className="ghost-button" type="button" onClick={() => props.onSelectContext(context.id)} disabled={props.busy}>
                  Set as active lens
                </button>
                {context.isMutable ? (
                  <button className="ghost-button" type="button" onClick={() => void props.onDeleteContext(context.id)} disabled={props.busy}>
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="analysis-context-manager__composer">
          <p className="eyebrow">Add your own perspective</p>
          <label className="analysis-field">
            <span>Perspective name</span>
            <input value={contextName} onChange={(event) => setContextName(event.target.value)} placeholder="Example: Practical outcomes" />
          </label>
          <label className="analysis-field">
            <span>What this perspective cares about (one idea per line)</span>
            <textarea
              value={whatThisLensPrioritizes}
              onChange={(event) => setWhatThisLensPrioritizes(event.target.value)}
              rows={5}
              placeholder={"Looks for practical outcomes\nPrefers measurable effects\nChecks trade-offs"}
            />
          </label>
          <label className="analysis-field">
            <span>Key terms (optional, format: term:plain explanation)</span>
            <textarea
              value={keyTerms}
              onChange={(event) => setKeyTerms(event.target.value)}
              rows={4}
              placeholder={"impact:real-world effect\ncost:time or money required"}
              spellCheck={false}
            />
          </label>
          <label className="analysis-field">
            <span>Common blind spots to watch for (optional)</span>
            <textarea
              value={commonBlindSpots}
              onChange={(event) => setCommonBlindSpots(event.target.value)}
              rows={4}
              placeholder={"Ignoring hidden costs\nOver-focusing on short-term gains"}
            />
          </label>

          <details className="analysis-context-manager__advanced">
            <summary>Advanced: paste raw JSON instead</summary>
            <label className="analysis-field">
              <span>Context JSON</span>
              <textarea value={advancedJson} onChange={(event) => setAdvancedJson(event.target.value)} rows={10} placeholder="Paste context JSON" spellCheck={false} />
            </label>
          </details>

          {contextError ? <p className="detail-line analysis-panel__error">{contextError}</p> : null}
          <div className="composer__actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => void handleCreateContext(false)}
              disabled={!contextName.trim() || !whatThisLensPrioritizes.trim() || props.busy}
            >
              Save perspective
            </button>
            <button className="ghost-button" type="button" onClick={() => void handleCreateContext(true)} disabled={!contextName.trim() || props.busy}>
              Save from advanced JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}