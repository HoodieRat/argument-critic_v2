import type { AnalysisContextPreview, ContextDefinitionRecord, SessionAnalysisSnapshot } from "../../types";

type AlignmentMetric = {
  readonly label: string;
  readonly value: number;
  readonly helper: string;
};

interface ContextAlignmentTabProps {
  readonly analysis: SessionAnalysisSnapshot;
  readonly contexts: ContextDefinitionRecord[];
  readonly alignmentPreview: AnalysisContextPreview | null;
  readonly alignmentPreviewLoading: boolean;
  readonly selectedContextId: string | null;
  readonly onSelectContext: (contextId: string) => void;
}

export function ContextAlignmentTab(props: ContextAlignmentTabProps) {
  const selectedContext = props.contexts.find((context) => context.id === props.selectedContextId) ?? props.contexts[0] ?? null;
  const persistedAlignment = props.analysis.alignments.find((alignment) => alignment.contextId === selectedContext?.id) ?? null;
  const selectedAlignment = persistedAlignment ?? (props.alignmentPreview?.alignment?.contextId === selectedContext?.id ? props.alignmentPreview.alignment : null);
  const isPreviewAlignment = !persistedAlignment && Boolean(selectedAlignment);

  const metrics: AlignmentMetric[] = selectedAlignment
    ? [
        {
          label: "Overall fit",
          value: Math.max(0, Math.min(100, Math.round(selectedAlignment.alignmentScore))),
          helper: "How well this argument matches the chosen perspective."
        },
        {
          label: "Shared language",
          value: Math.max(0, Math.min(100, Math.round((selectedAlignment.overlappingConcepts.length / Math.max(1, selectedAlignment.overlappingConcepts.length + selectedAlignment.divergences.length)) * 100))),
          helper: "How much your wording overlaps with the perspective's concepts."
        },
        {
          label: "Conflict pressure",
          value: Math.max(0, Math.min(100, Math.round((selectedAlignment.divergences.length / Math.max(1, selectedAlignment.overlappingConcepts.length + selectedAlignment.divergences.length)) * 100))),
          helper: "How strongly your wording clashes with this perspective."
        },
        {
          label: "Upgrade opportunity",
          value: Math.max(0, Math.min(100, Math.round((selectedAlignment.leveragePoints.length / Math.max(1, selectedAlignment.leveragePoints.length + selectedAlignment.divergences.length)) * 100))),
          helper: "How many practical improvements were suggested."
        }
      ]
    : [];

  return (
    <div className="analysis-panel__section">
      <div className="analysis-panel__controls">
        <label className="analysis-field">
          <span className="visually-hidden">Choose perspective for fit view</span>
          <select aria-label="Choose perspective for fit view" value={selectedContext?.id ?? ""} onChange={(event) => props.onSelectContext(event.target.value)}>
            {props.contexts.map((context) => (
              <option key={context.id} value={context.id}>{context.name}</option>
            ))}
          </select>
        </label>
      </div>

      {props.alignmentPreviewLoading ? (
        <div className="empty-state">Generating fit preview from your latest message.</div>
      ) : !selectedContext || !selectedAlignment ? (
        <div className="empty-state">No fit data yet for this perspective. Send another message to generate it.</div>
      ) : (
        <div className="analysis-alignment">
          <div className="analysis-alignment__score-row">
            <span className="analysis-alignment__score-label">How your idea fits: {selectedContext.name}</span>
            <strong>{Math.round(selectedAlignment.alignmentScore)}%</strong>
          </div>
          {isPreviewAlignment ? <p className="detail-line">Preview based on the latest user turn{props.alignmentPreview?.sourceExcerpt ? `: \"${props.alignmentPreview.sourceExcerpt}\"` : "."}</p> : null}

          <div className="analysis-alignment__metrics">
            {metrics.map((metric) => (
              <article key={metric.label} className="analysis-alignment__metric-card">
                <div className="analysis-alignment__metric-row">
                  <strong>{metric.label}</strong>
                  <span>{metric.value}%</span>
                </div>
                <div className="analysis-breakdown__bar analysis-alignment__bar">
                  <span className="analysis-breakdown__fill" style={{ width: `${Math.max(4, Math.min(100, metric.value))}%` }} />
                </div>
                <p className="detail-line">{metric.helper}</p>
              </article>
            ))}
          </div>

          <div className="analysis-alignment__grid">
            <section>
              <p className="eyebrow">What already matches</p>
              {selectedAlignment.overlappingConcepts.length === 0 ? <p className="detail-line">No direct overlap found yet in your wording.</p> : null}
              {selectedAlignment.overlappingConcepts.map((item, index) => (
                <article key={`${item.userPhrase}-${index}`} className="history-item">
                  <div className="history-item__body">
                    <p>{item.userPhrase}</p>
                    <p className="detail-line">{item.contextPhrase}</p>
                    <p className="detail-line">{item.rationale}</p>
                  </div>
                </article>
              ))}
            </section>

            <section>
              <p className="eyebrow">Where it conflicts</p>
              <p className="detail-line">Conflict is not failure. It simply shows where this perspective asks for different framing.</p>
              {selectedAlignment.divergences.length === 0 ? <p className="detail-line">No major conflicts surfaced.</p> : null}
              {selectedAlignment.divergences.map((item, index) => (
                <article key={`${item}-${index}`} className="history-item">
                  <div className="history-item__body">
                    <p>{item}</p>
                  </div>
                </article>
              ))}
            </section>

            <section>
              <p className="eyebrow">How to strengthen it</p>
              {selectedAlignment.leveragePoints.length === 0 ? <p className="detail-line">No clear improvement suggestions were generated yet.</p> : null}
              {selectedAlignment.leveragePoints.map((item, index) => (
                <article key={`${item}-${index}`} className="history-item">
                  <div className="history-item__body">
                    <p>{item}</p>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}