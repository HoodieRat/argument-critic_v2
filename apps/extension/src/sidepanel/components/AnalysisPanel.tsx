import { ContextAlignmentTab } from "./analysis/ContextAlignmentTab";
import { ContextManagerTab } from "./analysis/ContextManagerTab";
import { CritiqueBreakdownTab } from "./analysis/CritiqueBreakdownTab";
import { UncertaintyMapTab } from "./analysis/UncertaintyMapTab";
import type {
  AnalysisContextPreview,
  ContextDefinitionInput,
  ContextDefinitionRecord,
  FamiliaritySignalRecord,
  FamiliaritySignalType,
  SessionAnalysisSnapshot,
  TurnAnalysisSnapshot
} from "../types";

interface AnalysisPanelProps {
  readonly analysis: SessionAnalysisSnapshot | null;
  readonly turnAnalysis: TurnAnalysisSnapshot | null;
  readonly contexts: ContextDefinitionRecord[];
  readonly familiarities: FamiliaritySignalRecord[];
  readonly alignmentPreview: AnalysisContextPreview | null;
  readonly alignmentPreviewLoading: boolean;
  readonly selectedContextId: string | null;
  readonly busy: boolean;
  readonly onSelectContext: (contextId: string) => void;
  readonly onCreateContext: (input: ContextDefinitionInput) => Promise<void>;
  readonly onDeleteContext: (contextId: string) => Promise<void>;
  readonly onMarkFamiliarity: (input: { uncertaintyId?: string; assumptionId?: string; claimId?: string; signalType: FamiliaritySignalType; userNote?: string }) => Promise<void>;
}

export function AnalysisPanel(props: AnalysisPanelProps) {
  const insightCount = (props.analysis?.uncertainties.length ?? 0) + (props.analysis?.critiques.length ?? 0);
  const topIssue = [...(props.analysis?.uncertainties ?? [])].sort((left, right) => right.severity - left.severity)[0] ?? null;

  return (
    <section className="card analysis-panel analysis-panel--workspace">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reasoning Workspace</p>
          <h2>See what is weak, why, and what to do next</h2>
          <p className="detail-line">{insightCount > 0 ? `${insightCount} analysis signals are ready.` : "Send a full argument to generate analysis signals."}</p>
        </div>
        <div className="analysis-panel__summary">
          <span className="count-badge">{props.analysis?.uncertainties.length ?? 0} uncertainties</span>
          <span className="count-badge">{props.analysis?.assumptions.length ?? 0} assumptions</span>
          <span className="count-badge">{props.contexts.length} contexts</span>
        </div>
      </div>

      <section className="analysis-panel__next-step">
        <p className="eyebrow">First thing to fix</p>
        {topIssue ? (
          <p className="detail-line">
            Highest impact issue: {topIssue.uncertaintyType.replace(/_/g, " ")} at severity {topIssue.severity}. Start by: {topIssue.canBeAddressedVia.replace(/_/g, " ")}.
          </p>
        ) : (
          <p className="detail-line">No major issue found yet. Send a stronger argument to generate deeper analysis.</p>
        )}
      </section>

      {!props.analysis ? <div className="empty-state">No analysis yet. Send a paragraph in Critic or normal chat, then return here.</div> : null}

      {props.analysis ? (
        <div className="analysis-panel__stack">
          <section className="analysis-panel__block">
            <div className="analysis-panel__block-header">
              <p className="eyebrow">Top weak spots</p>
              <h3>Epistemic map</h3>
            </div>
            <UncertaintyMapTab analysis={props.analysis} familiarities={props.familiarities} busy={props.busy} onMarkFamiliarity={props.onMarkFamiliarity} />
          </section>

          <section className="analysis-panel__block">
            <div className="analysis-panel__block-header">
              <p className="eyebrow">Issue breakdown</p>
              <h3>What kind of critique is strongest</h3>
            </div>
            <CritiqueBreakdownTab analysis={props.analysis} turnAnalysis={props.turnAnalysis} />
          </section>

          <section className="analysis-panel__block">
            <div className="analysis-panel__block-header">
              <p className="eyebrow">How your idea fits</p>
              <h3>Visual fit and conflict bars</h3>
            </div>
            <ContextAlignmentTab
              analysis={props.analysis}
              contexts={props.contexts}
              alignmentPreview={props.alignmentPreview}
              alignmentPreviewLoading={props.alignmentPreviewLoading}
              selectedContextId={props.selectedContextId}
              onSelectContext={props.onSelectContext}
            />
          </section>

          <section className="analysis-panel__block">
            <div className="analysis-panel__block-header">
              <p className="eyebrow">Perspective library</p>
              <h3>Create and manage viewpoints</h3>
            </div>
            <ContextManagerTab
              contexts={props.contexts}
              busy={props.busy}
              selectedContextId={props.selectedContextId}
              onSelectContext={props.onSelectContext}
              onCreateContext={props.onCreateContext}
              onDeleteContext={props.onDeleteContext}
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}