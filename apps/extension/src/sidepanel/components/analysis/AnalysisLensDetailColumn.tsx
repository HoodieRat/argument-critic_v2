import { useId, useState } from "react";

import type { ContextDefinitionRecord } from "../../types";

interface AnalysisLensDetailColumnProps {
  readonly eyebrow: string;
  readonly heading: string;
  readonly lens: ContextDefinitionRecord | null;
  readonly statusText: string;
  readonly lead: string;
  readonly rationale: string;
  readonly sourceExcerpt: string | null;
  readonly notices: string[];
  readonly examples: string[];
  readonly questions: string[];
  readonly reframes: string[];
  readonly challenges: string[];
  readonly emptyState: string;
}

function renderList(items: string[], emptyText: string): JSX.Element {
  if (items.length === 0) {
    return <p className="detail-line">{emptyText}</p>;
  }

  return (
    <>
      {items.map((item, index) => <p key={`${item}-${index}`} className="detail-line">{item}</p>)}
    </>
  );
}

function renderReferenceItems(lens: ContextDefinitionRecord): JSX.Element {
  return (
    <div className="analysis-workspace-disclosure-stack analysis-workspace-disclosure-stack--reference">
      <details className="analysis-workspace-disclosure">
        <summary>Core moves</summary>
        <div className="analysis-workspace-disclosure__body">
          {renderList(lens.coreMoves, "No core moves defined.")}
        </div>
      </details>

      <details className="analysis-workspace-disclosure">
        <summary>Canonical terms</summary>
        <div className="analysis-workspace-disclosure__body">
          {Object.keys(lens.canonicalTerms).length === 0 ? <p className="detail-line">No canonical terms defined.</p> : null}
          {Object.entries(lens.canonicalTerms).map(([term, explanation]) => (
            <p key={term} className="detail-line"><strong>{term}:</strong> {explanation}</p>
          ))}
        </div>
      </details>

      <details className="analysis-workspace-disclosure">
        <summary>Common pitfalls</summary>
        <div className="analysis-workspace-disclosure__body">
          {renderList(lens.commonPitfalls, "No recurring pitfalls recorded.")}
        </div>
      </details>

      <details className="analysis-workspace-disclosure">
        <summary>Key metaphors</summary>
        <div className="analysis-workspace-disclosure__body">
          {renderList(lens.keyMetaphors, "No key metaphors defined.")}
        </div>
      </details>

      <details className="analysis-workspace-disclosure">
        <summary>Internal disputes</summary>
        <div className="analysis-workspace-disclosure__body">
          {lens.internalDisputes.length === 0 ? <p className="detail-line">No internal disputes captured for this lens.</p> : null}
          {lens.internalDisputes.map((item, index) => (
            <p key={`${item.position}-${index}`} className="detail-line"><strong>{item.position}:</strong> {item.briefDescription}</p>
          ))}
        </div>
      </details>
    </div>
  );
}

export function AnalysisLensDetailColumn(props: AnalysisLensDetailColumnProps) {
  const [activeTab, setActiveTab] = useState<"notices" | "examples" | "questions">("notices");
  const tabBaseId = useId();
  const primaryTabs = [
    {
      id: "notices",
      label: "Notices",
      eyebrow: "What this lens notices here",
      items: props.notices,
      emptyText: "No argument-specific signals surfaced yet."
    },
    {
      id: "examples",
      label: "Pressure",
      eyebrow: "Where it presses hardest",
      items: props.examples,
      emptyText: "No applied examples generated yet."
    },
    {
      id: "questions",
      label: "Questions",
      eyebrow: "Questions this lens asks next",
      items: props.questions,
      emptyText: "No lens-specific follow-up questions generated yet."
    }
  ] as const;
  const selectedTab = primaryTabs.find((tab) => tab.id === activeTab) ?? primaryTabs[0];
  const selectedTabId = `${tabBaseId}-${selectedTab.id}-tab`;
  const selectedPanelId = `${tabBaseId}-${selectedTab.id}-panel`;

  return (
    <div className="analysis-workspace-lens-detail-stack">
      <article className="analysis-workspace-section analysis-workspace-section--detail analysis-workspace-section--detail-primary">
        <div className="analysis-workspace-section__header">
          <div>
            <p className="eyebrow">{props.eyebrow}</p>
            <h4 className="analysis-workspace-subheading">{props.heading}</h4>
          </div>
        </div>

        {props.lens ? (
          <>
            <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
              <strong className="analysis-workspace-card__title">{props.lens.name}</strong>
              <span className="analysis-workspace-card__severity">{props.statusText}</span>
            </div>
            <p className="detail-line analysis-workspace-detail__lead">{props.lead}</p>
            <p className="detail-line">{props.rationale}</p>
            {props.sourceExcerpt ? <p className="detail-line">Reading this text: {props.sourceExcerpt}</p> : null}

            <div className="analysis-workspace-detail-tabs" role="tablist" aria-label={`${props.heading} detail groups`}>
              {primaryTabs.map((tab) => {
                const tabId = `${tabBaseId}-${tab.id}-tab`;
                const panelId = `${tabBaseId}-${tab.id}-panel`;
                const selected = tab.id === selectedTab.id;
                return (
                  <button
                    key={tab.id}
                    id={tabId}
                    className={`mode-chip ${selected ? "mode-chip--active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={panelId}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="analysis-workspace-detail-tab__label">{tab.label}</span>
                    <span className="count-badge analysis-workspace-detail-tab__count">{tab.items.length}</span>
                  </button>
                );
              })}
            </div>

            <div className="analysis-workspace-detail-panel" role="tabpanel" id={selectedPanelId} aria-labelledby={selectedTabId}>
              <p className="eyebrow">{selectedTab.eyebrow}</p>
              {renderList(selectedTab.items, selectedTab.emptyText)}
            </div>

            <div className="analysis-workspace-disclosure-stack">
              <details className="analysis-workspace-disclosure">
                <summary>How it would reframe the argument</summary>
                <div className="analysis-workspace-disclosure__body">
                  {renderList(props.reframes, "No clear reframing move surfaced yet.")}
                </div>
              </details>

              <details className="analysis-workspace-disclosure">
                <summary>What this lens challenges</summary>
                <div className="analysis-workspace-disclosure__body">
                  {renderList(props.challenges, "No major tensions surfaced yet.")}
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="empty-state">{props.emptyState}</div>
        )}
      </article>

      <details className="analysis-workspace-disclosure analysis-workspace-disclosure--reference-shell">
        <summary>
          <span>Lens reference</span>
          <span className="count-badge">Open when needed</span>
        </summary>
        <div className="analysis-workspace-disclosure__body">
          {props.lens ? renderReferenceItems(props.lens) : <div className="empty-state">Select a lens to see the lens reference.</div>}
        </div>
      </details>
    </div>
  );
}