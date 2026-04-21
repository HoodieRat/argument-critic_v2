import { useMemo, useState } from "react";

import type { FamiliaritySignalRecord, FamiliaritySignalType, SessionAnalysisSnapshot, UncertaintyMapRecord } from "../../types";
import { resolveFamiliarityValue } from "./analysisFormatting";
import { UncertaintyMapItem } from "./UncertaintyMapItem";

interface UncertaintyMapTabProps {
  readonly analysis: SessionAnalysisSnapshot;
  readonly familiarities: FamiliaritySignalRecord[];
  readonly busy: boolean;
  readonly onMarkFamiliarity: (input: { uncertaintyId?: string; assumptionId?: string; claimId?: string; signalType: FamiliaritySignalType; userNote?: string }) => Promise<void>;
}

export function UncertaintyMapTab(props: UncertaintyMapTabProps) {
  const [selectedType, setSelectedType] = useState<UncertaintyMapRecord["uncertaintyType"] | "all">("all");
  const [sortMode, setSortMode] = useState<"severity" | "recent">("severity");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [roomyView, setRoomyView] = useState(false);

  const filteredUncertainties = useMemo(() => {
    const items = props.analysis.uncertainties;
    const filtered = selectedType === "all" ? items : items.filter((item) => item.uncertaintyType === selectedType);
    return [...filtered].sort((left, right) => {
      if (sortMode === "severity") {
        return right.severity - left.severity;
      }
      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [props.analysis.uncertainties, selectedType, sortMode]);

  function toggleExpanded(itemId: string): void {
    setExpandedIds((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  }

  return (
    <div className={`analysis-panel__section ${roomyView ? "analysis-panel__section--roomy" : ""}`}>
      <div className="analysis-panel__controls">
        <p className="detail-line">Start with the highest-severity items first. They usually change the argument the most.</p>
        <button className="ghost-button" type="button" onClick={() => setRoomyView((value) => !value)}>
          {roomyView ? "Use compact view" : "Use roomy view"}
        </button>
      </div>

      <div className="analysis-panel__controls">
        <label className="analysis-field">
          <span className="visually-hidden">Filter uncertainty map by critique type</span>
          <select aria-label="Filter uncertainty map by critique type" value={selectedType} onChange={(event) => setSelectedType(event.target.value as UncertaintyMapRecord["uncertaintyType"] | "all")}>
            <option value="all">All critique types</option>
            <option value="logical_coherence">Logical coherence</option>
            <option value="empirical_gap">Empirical gap</option>
            <option value="definitional_clarity">Definitional clarity</option>
            <option value="philosophical_premise">Philosophical premise</option>
            <option value="assumption_conflict">Assumption conflict</option>
          </select>
        </label>
        <label className="analysis-field">
          <span className="visually-hidden">Sort uncertainty map</span>
          <select aria-label="Sort uncertainty map" value={sortMode} onChange={(event) => setSortMode(event.target.value as "severity" | "recent")}>
            <option value="severity">Sort by severity</option>
            <option value="recent">Sort by recency</option>
          </select>
        </label>
      </div>

      {filteredUncertainties.length === 0 ? (
        <div className="empty-state">No uncertainties match the current filter.</div>
      ) : (
        <div className={`history-list analysis-panel__list ${roomyView ? "analysis-panel__list--roomy" : ""}`}>
          {filteredUncertainties.map((item) => {
            const familiarity = resolveFamiliarityValue(props.familiarities, item.id);
            return (
              <UncertaintyMapItem
                key={item.id}
                item={item}
                expanded={expandedIds.includes(item.id)}
                familiarity={familiarity}
                busy={props.busy}
                onToggleExpanded={() => toggleExpanded(item.id)}
                onMarkFamiliarity={(signalType) => void props.onMarkFamiliarity({ uncertaintyId: item.id, signalType })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}