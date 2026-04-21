import { useMemo } from "react";

import type { SessionAnalysisSnapshot, TurnAnalysisSnapshot } from "../../types";
import { buildBreakdown, buildExamples, buildResolutionSummary, formatCritiqueType, formatResolvePath } from "./analysisFormatting";

interface CritiqueBreakdownTabProps {
  readonly analysis: SessionAnalysisSnapshot;
  readonly turnAnalysis: TurnAnalysisSnapshot | null;
}

export function CritiqueBreakdownTab(props: CritiqueBreakdownTabProps) {
  const critiqueExamples = useMemo(() => props.turnAnalysis?.critiques ?? props.analysis.critiques, [props.turnAnalysis?.critiques, props.analysis.critiques]);
  const breakdown = useMemo(() => buildBreakdown(critiqueExamples), [critiqueExamples]);
  const resolutionSummary = useMemo(() => buildResolutionSummary(critiqueExamples), [critiqueExamples]);

  if (breakdown.length === 0) {
    return <div className="analysis-panel__section"><div className="empty-state">No critique breakdown is available yet.</div></div>;
  }

  return (
    <div className="analysis-panel__section">
      <div className="analysis-breakdown">
        <div className="analysis-breakdown__summary-grid">
          {resolutionSummary.map((entry) => (
            <article key={entry.path} className="analysis-breakdown__summary-card">
              <p className="eyebrow">Best resolved via</p>
              <strong>{formatResolvePath(entry.path)}</strong>
              <p className="detail-line">{entry.count} item(s)</p>
            </article>
          ))}
        </div>
        {breakdown.map((entry) => (
          <article key={entry.type} className="analysis-breakdown__item">
            <div className="analysis-breakdown__row">
              <span className={`critique-badge critique-badge--${entry.type}`}>{formatCritiqueType(entry.type)}</span>
              <span className="count-badge">{entry.count}</span>
            </div>
            <div className="analysis-breakdown__bar">
              <span className="analysis-breakdown__fill" style={{ width: `${Math.min(100, entry.count * 18)}%` }} />
            </div>
            <p className="detail-line">Average severity: {entry.averageSeverity}</p>
            {buildExamples(critiqueExamples, entry.type).map((example, index) => (
              <p key={`${entry.type}-${index}`} className="detail-line">Example: {example}</p>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}