import { FamiliarityToggle } from "../FamiliarityToggle";
import type { FamiliaritySignalType, UncertaintyMapRecord } from "../../types";
import { formatCritiqueType, formatResolvePath, getSeverityTone } from "./analysisFormatting";

interface UncertaintyMapItemProps {
  readonly item: UncertaintyMapRecord;
  readonly expanded: boolean;
  readonly familiarity: FamiliaritySignalType | null;
  readonly busy: boolean;
  readonly onToggleExpanded: () => void;
  readonly onMarkFamiliarity: (signalType: FamiliaritySignalType) => void;
}

export function UncertaintyMapItem(props: UncertaintyMapItemProps) {
  const detailId = `uncertainty-detail-${props.item.id}`;

  return (
    <article className={`analysis-item ${props.expanded ? "analysis-item--expanded" : ""}`}>
      <div className="analysis-item__top">
        <div className="analysis-item__badges">
          <span className={`critique-badge critique-badge--${props.item.uncertaintyType}`}>{formatCritiqueType(props.item.uncertaintyType)}</span>
          {props.familiarity ? <span className="analysis-item__known-state">{props.familiarity}</span> : null}
        </div>
        <span className={`analysis-item__severity analysis-item__severity--${getSeverityTone(props.item.severity)}`}>Severity {props.item.severity}</span>
      </div>

      {props.item.affectedClaimText ? <p className="analysis-item__lead">Claim: {props.item.affectedClaimText}</p> : null}

      <div className="analysis-item__detail-summary">
        <p className="detail-line">Best addressed via: {formatResolvePath(props.item.canBeAddressedVia)}</p>
        <button
          type="button"
          className="ghost-button analysis-item__toggle"
          aria-expanded={props.expanded}
          aria-controls={detailId}
          onClick={props.onToggleExpanded}
        >
          {props.expanded ? "Hide detail" : "Show detail"}
        </button>
      </div>

      {props.expanded ? (
        <div id={detailId} className="analysis-item__details">
          {props.item.affectedAssumptionText ? <p className="detail-line">Assumption: {props.item.affectedAssumptionText}</p> : null}
          <p className="detail-line">Why flagged: {props.item.whyFlagged}</p>
        </div>
      ) : null}

      <div className="analysis-item__actions">
        <FamiliarityToggle value={props.familiarity} busy={props.busy} onChange={props.onMarkFamiliarity} />
      </div>
    </article>
  );
}