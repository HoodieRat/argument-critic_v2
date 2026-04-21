import { useEffect, useRef, useState } from "react";

import { AnalysisLensDetailColumn } from "./analysis/AnalysisLensDetailColumn";
import { ContextManagerTab } from "./analysis/ContextManagerTab";
import { FamiliarityToggle } from "./FamiliarityToggle";
import type {
  AnalysisContextPreviewMap,
  ContextDefinitionInput,
  ContextDefinitionRecord,
  FamiliaritySignalRecord,
  FamiliaritySignalType,
  SessionAnalysisSnapshot,
  TurnAnalysisSnapshot,
  UncertaintyMapRecord
} from "../types";
import {
  buildBreakdown,
  getCountBarWidthPercent,
  buildResolutionSummary,
  formatCritiqueType,
  formatResolvePath,
  resolveFamiliarityValue
} from "./analysis/analysisFormatting";

interface AnalysisWorkspaceFormProps {
  readonly analysis: SessionAnalysisSnapshot | null;
  readonly turnAnalysis: TurnAnalysisSnapshot | null;
  readonly contexts: ContextDefinitionRecord[];
  readonly familiarities: FamiliaritySignalRecord[];
  readonly alignmentPreviews: AnalysisContextPreviewMap;
  readonly alignmentPreviewLoading: boolean;
  readonly selectedContextId: string | null;
  readonly busy: boolean;
  readonly onSelectContext: (contextId: string) => void;
  readonly onCreateContext: (input: ContextDefinitionInput) => Promise<void>;
  readonly onDeleteContext: (contextId: string) => Promise<void>;
  readonly onMarkFamiliarity: (input: { uncertaintyId?: string; assumptionId?: string; claimId?: string; signalType: FamiliaritySignalType; userNote?: string }) => Promise<void>;
  readonly onExit: () => void;
}

type AnalysisViewMode = "focus" | "compare" | "all";
type AllViewSortMode = "strongest_match" | "highest_leverage" | "needs_help";

interface LensComparisonItem {
  readonly context: ContextDefinitionRecord;
  readonly preview: AnalysisContextPreviewMap[string] | null;
  readonly alignment: SessionAnalysisSnapshot["alignments"][number] | null;
  readonly evaluation: LensEvaluation;
  readonly score: number;
  readonly isSelected: boolean;
  readonly overlapCount: number;
  readonly divergenceCount: number;
  readonly leverageCount: number;
}

interface LensDetailData {
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
}

interface AnalysisSectionNavItem {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
}

function sortBySeverity(items: UncertaintyMapRecord[]): UncertaintyMapRecord[] {
  return [...items].sort((left, right) => right.severity - left.severity);
}

function describeAlignmentPressure(score: number): string {
  if (score >= 75) {
    return "Strong fit";
  }
  if (score >= 35) {
    return "Partial fit";
  }
  if (score > 0) {
    return "Early fit";
  }
  return "Low fit";
}

function formatContextName(value: string): string {
  return value.replace(/[_-]+/g, " ");
}

function formatClaimType(value: SessionAnalysisSnapshot["claims"][number]["claimType"]): string {
  return value.replace(/_/g, " ");
}

function formatAssumptionLevel(value: SessionAnalysisSnapshot["assumptions"][number]["level"]): string {
  return value.replace(/_/g, " ");
}

function formatSourceLabel(value: ContextDefinitionRecord["source"]): string {
  return value === "user-created" ? "custom lens" : "builtin lens";
}

function describeClaimNeeds(claim: SessionAnalysisSnapshot["claims"][number]): string {
  const notes: string[] = [];

  notes.push(claim.canBeEvidenced ? "Needs evidence." : "Not mainly an evidence claim.");
  notes.push(claim.requiresDefinition ? "Definition needs tightening." : "Definition is less central.");

  if (claim.philosophicalStance) {
    notes.push("Carries a philosophical commitment.");
  }

  return notes.join(" ");
}

function describeAssumptionSupport(assumption: SessionAnalysisSnapshot["assumptions"][number]): string {
  if (assumption.supportsClaimText) {
    return `${assumption.isExplicit ? "Explicitly stated." : "Mostly implied."} Supports: ${assumption.supportsClaimText}`;
  }

  return assumption.isExplicit ? "Explicitly stated, but not tied to one claim." : "Mostly implied, and not tied to one claim yet.";
}

function uniqueNonEmpty(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function toQuestion(text: string): string {
  const normalized = text.trim().replace(/[.]+$/g, "");
  if (!normalized) {
    return "";
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}?`;
}

function buildLensReadSummary(context: ContextDefinitionRecord, alignment: SessionAnalysisSnapshot["alignments"][number] | null): string {
  if (alignment?.overlappingConcepts.length) {
    return alignment.overlappingConcepts[0]?.rationale ?? "This lens already overlaps with the current argument.";
  }
  if (alignment?.divergences.length) {
    return alignment.divergences[0] ?? "This lens sees a gap worth tightening.";
  }
  if (alignment?.leveragePoints.length) {
    return alignment.leveragePoints[0] ?? "This lens still offers a concrete way to reframe the argument.";
  }
  if (context.coreMoves[0]) {
    return `Even without an exact match, this lens would start by ${context.coreMoves[0]}.`;
  }
  if (context.commonPitfalls[0]) {
    return `This lens would immediately watch for ${context.commonPitfalls[0]}.`;
  }
  return "This lens can still give you a useful contrast, even if the wording does not use its usual terms yet.";
}

type LensEvaluation = AnalysisContextPreviewMap[string]["evaluation"];

function buildUnavailableLensEvaluation(context: ContextDefinitionRecord | null): LensEvaluation {
  const contextName = context ? formatContextName(context.name) : "this lens";
  return {
    state: "unavailable",
    label: "Not evaluated yet",
    summary: `There is not enough current text to evaluate ${contextName} yet.`,
    rationale: "Send or refresh a fuller argument and the workspace will compare the latest wording against this lens.",
    evidence: []
  };
}

function buildFallbackLensEvaluation(
  context: ContextDefinitionRecord,
  alignment: SessionAnalysisSnapshot["alignments"][number] | null
): LensEvaluation {
  if (!alignment) {
    return buildUnavailableLensEvaluation(context);
  }

  if (alignment.overlappingConcepts.length > 0) {
    return {
      state: "direct_match",
      label: alignment.alignmentScore >= 60 ? "Direct language match" : "Partial direct match",
      summary: alignment.overlappingConcepts[0]?.rationale ?? `The latest wording already overlaps with ${formatContextName(context.name)}.`,
      rationale: "This read is based on words in your argument that already line up with this perspective.",
      evidence: alignment.overlappingConcepts.slice(0, 3).map((item) => `${item.userPhrase} -> ${item.contextPhrase}`)
    };
  }

  if (alignment.alignmentScore > 0 || alignment.divergences.length > 0) {
    return {
      state: "heuristic_read",
      label: "Interpretive read",
      summary: alignment.divergences[0] ?? alignment.leveragePoints[0] ?? buildLensReadSummary(context, alignment),
      rationale: `This is an interpretive alignment based on the pressure in the claim, even though the wording does not use ${formatContextName(context.name)}'s usual vocabulary directly.`,
      evidence: [
        ...alignment.divergences.slice(0, 2).map((item) => `Pressure point: ${item}`),
        ...alignment.leveragePoints.slice(0, 2).map((item) => `Next step: ${item}`)
      ].slice(0, 4)
    };
  }

  return {
    state: "low_signal",
    label: "No direct lens hook yet",
    summary: context.coreMoves[0]
      ? `This lens asks you to ${context.coreMoves[0]}.`
      : `The latest wording does not yet use ${formatContextName(context.name)}'s usual terms.`,
    rationale: "The wording does not explicitly invoke this lens yet, but you can still apply it manually if you want to test the claim from this angle.",
    evidence: [
      ...(context.coreMoves[0] ? [`Next step: ${context.coreMoves[0]}`] : []),
      ...(context.commonPitfalls[0] ? [`Watch for: ${context.commonPitfalls[0]}`] : []),
      ...(context.keyMetaphors[0] ? [`Consider: ${context.keyMetaphors[0]}`] : [])
    ]
  };
}

function resolveLensEvaluation(
  context: ContextDefinitionRecord,
  preview: AnalysisContextPreviewMap[string] | null,
  alignment: SessionAnalysisSnapshot["alignments"][number] | null
): LensEvaluation {
  return preview?.evaluation ?? buildFallbackLensEvaluation(context, alignment);
}

function buildLensStatusText(score: number, evaluation: LensEvaluation): string {
  if (evaluation.state === "unavailable" || evaluation.state === "low_signal") {
    return evaluation.label;
  }

  return score > 0 ? `${evaluation.label} (${score}%)` : evaluation.label;
}

function buildLensMetricSummary(alignment: SessionAnalysisSnapshot["alignments"][number] | null): string {
  return `Overlap ${alignment?.overlappingConcepts.length ?? 0} · Divergences ${alignment?.divergences.length ?? 0} · Leverage ${alignment?.leveragePoints.length ?? 0}`;
}

function buildLensNotices(
  evaluation: LensEvaluation,
  alignment: SessionAnalysisSnapshot["alignments"][number] | null
): string[] {
  return uniqueNonEmpty([
    evaluation.summary,
    ...(alignment?.overlappingConcepts.slice(0, 2).map((item) => item.rationale) ?? []),
    ...evaluation.evidence
  ]).slice(0, 4);
}

function buildLensChallenges(
  context: ContextDefinitionRecord,
  alignment: SessionAnalysisSnapshot["alignments"][number] | null,
  topIssue: UncertaintyMapRecord | null
): string[] {
  return uniqueNonEmpty([
    ...(alignment?.divergences ?? []),
    topIssue ? `This lens would test the current top issue this way: ${topIssue.whyFlagged}` : "",
    context.commonPitfalls[0] ? `It would also watch for ${context.commonPitfalls[0]}.` : ""
  ]).slice(0, 4);
}

function buildLensReframes(
  context: ContextDefinitionRecord,
  alignment: SessionAnalysisSnapshot["alignments"][number] | null
): string[] {
  return uniqueNonEmpty([
    ...(alignment?.leveragePoints ?? []),
    context.keyMetaphors[0] ? `A useful reframe from this lens is ${context.keyMetaphors[0]}.` : "",
    context.coreMoves[0] ? `It would begin by ${context.coreMoves[0]}.` : ""
  ]).slice(0, 4);
}

function buildLensApplicationExamples(
  context: ContextDefinitionRecord,
  analysis: SessionAnalysisSnapshot,
  topIssue: UncertaintyMapRecord | null,
  alignment: SessionAnalysisSnapshot["alignments"][number] | null
): string[] {
  const leadingClaim = topIssue?.affectedClaimText ?? analysis.claims[0]?.claimText ?? null;
  const leadingAssumption = topIssue?.affectedAssumptionText ?? analysis.assumptions[0]?.assumptionText ?? null;

  return uniqueNonEmpty([
    leadingClaim && context.coreMoves[0]
      ? `On the main claim, ${formatContextName(context.name)} would ${context.coreMoves[0]}: ${leadingClaim}`
      : "",
    leadingAssumption && context.commonPitfalls[0]
      ? `On the supporting assumption, this lens would check for ${context.commonPitfalls[0]}: ${leadingAssumption}`
      : "",
    alignment?.leveragePoints[0] ?? "",
    context.keyMetaphors[0] ? `A useful reframe from this lens is ${context.keyMetaphors[0]}.` : ""
  ]).slice(0, 3);
}

function buildLensQuestions(
  context: ContextDefinitionRecord,
  analysis: SessionAnalysisSnapshot,
  topIssue: UncertaintyMapRecord | null
): string[] {
  const claimText = topIssue?.affectedClaimText ?? analysis.claims[0]?.claimText ?? "this argument";

  return uniqueNonEmpty([
    ...context.coreMoves.slice(0, 2).map((move) => toQuestion(move)),
    `How would ${formatContextName(context.name)} reinterpret this pressure point: ${claimText}?`,
    context.commonPitfalls[0] ? `Where might this argument slip into ${context.commonPitfalls[0]}?` : ""
  ]).slice(0, 4);
}

function buildUncertaintyBreakdown(
  uncertainties: UncertaintyMapRecord[]
): Array<{ type: UncertaintyMapRecord["uncertaintyType"]; count: number; averageSeverity: number }> {
  const counts = new Map<UncertaintyMapRecord["uncertaintyType"], { count: number; severityTotal: number }>();

  for (const uncertainty of uncertainties) {
    const entry = counts.get(uncertainty.uncertaintyType) ?? { count: 0, severityTotal: 0 };
    entry.count += 1;
    entry.severityTotal += uncertainty.severity;
    counts.set(uncertainty.uncertaintyType, entry);
  }

  return [...counts.entries()]
    .map(([type, value]) => ({
      type,
      count: value.count,
      averageSeverity: value.count > 0 ? Number((value.severityTotal / value.count).toFixed(1)) : 0
    }))
    .sort((left, right) => right.count - left.count);
}

function buildUncertaintyResolutionSummary(
  uncertainties: UncertaintyMapRecord[]
): Array<{ path: UncertaintyMapRecord["canBeAddressedVia"]; count: number }> {
  const counts = new Map<UncertaintyMapRecord["canBeAddressedVia"], number>();

  for (const uncertainty of uncertainties) {
    counts.set(uncertainty.canBeAddressedVia, (counts.get(uncertainty.canBeAddressedVia) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => right.count - left.count);
}

function getNeedsHelpPriority(item: LensComparisonItem): number {
  if (item.divergenceCount > 0) {
    return 0;
  }

  switch (item.evaluation.state) {
    case "heuristic_read":
      return 1;
    case "low_signal":
      return 2;
    case "unavailable":
      return 3;
    case "direct_match":
      return 4;
    default:
      return 5;
  }
}

function getAllViewSortDescription(sortMode: AllViewSortMode): string {
  switch (sortMode) {
    case "highest_leverage":
      return "Sorting by highest leverage: lenses with the most concrete next moves and the clearest friction rise first.";
    case "needs_help":
      return "Sorting by needs the most help: the weakest-fit lenses that still surface repair pressure rise first.";
    default:
      return "Sorting by strongest match: the closest-fitting lenses with the clearest overlap rise first.";
  }
}

function sortAllViewLensComparisons(items: LensComparisonItem[], sortMode: AllViewSortMode): LensComparisonItem[] {
  return [...items].sort((left, right) => {
    if (sortMode === "highest_leverage") {
      if (left.leverageCount !== right.leverageCount) {
        return right.leverageCount - left.leverageCount;
      }
      if (left.divergenceCount !== right.divergenceCount) {
        return right.divergenceCount - left.divergenceCount;
      }
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      return left.context.name.localeCompare(right.context.name);
    }

    if (sortMode === "needs_help") {
      const leftPriority = getNeedsHelpPriority(left);
      const rightPriority = getNeedsHelpPriority(right);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      if (left.leverageCount !== right.leverageCount) {
        return right.leverageCount - left.leverageCount;
      }
      return left.context.name.localeCompare(right.context.name);
    }

    if (left.score !== right.score) {
      return right.score - left.score;
    }
    if (left.overlapCount !== right.overlapCount) {
      return right.overlapCount - left.overlapCount;
    }
    if (left.divergenceCount !== right.divergenceCount) {
      return left.divergenceCount - right.divergenceCount;
    }
    if (left.leverageCount !== right.leverageCount) {
      return right.leverageCount - left.leverageCount;
    }
    return left.context.name.localeCompare(right.context.name);
  });
}

function buildCompareSummary(
  primary: LensComparisonItem | null,
  secondary: LensComparisonItem | null,
  topIssue: UncertaintyMapRecord | null
): { divergence: string; overlap: string; nextMove: string } | null {
  if (!primary || !secondary) {
    return null;
  }

  const primaryName = formatContextName(primary.context.name);
  const secondaryName = formatContextName(secondary.context.name);

  const divergence = secondary.alignment?.divergences[0]
    ?? primary.alignment?.divergences[0]
    ?? `${secondaryName} would probe a different stress point than ${primaryName}.`;

  const overlap = primary.alignment?.overlappingConcepts[0] && secondary.alignment?.overlappingConcepts[0]
    ? `${primaryName} and ${secondaryName} both already hook into the current wording.`
    : topIssue?.affectedClaimText
      ? `Both lenses can pressure-test the same issue: ${topIssue.affectedClaimText}`
      : `Both lenses offer a usable contrast on the current wording.`;

  const nextMove = primary.alignment?.leveragePoints[0]
    ?? secondary.alignment?.leveragePoints[0]
    ?? primary.context.coreMoves[0]
    ?? secondary.context.coreMoves[0]
    ?? "Tighten the main claim before comparing more lenses.";

  return {
    divergence,
    overlap,
    nextMove
  };
}

export function AnalysisWorkspaceForm(props: AnalysisWorkspaceFormProps) {
  const [viewMode, setViewMode] = useState<AnalysisViewMode>("focus");
  const [comparisonLensId, setComparisonLensId] = useState<string>("");
  const [compareSummaryOpen, setCompareSummaryOpen] = useState(false);
  const [compareDetailOpen, setCompareDetailOpen] = useState(false);
  const [allViewSort, setAllViewSort] = useState<AllViewSortMode>("strongest_match");
  const [allViewDetailOpen, setAllViewDetailOpen] = useState(false);
  const [lensToast, setLensToast] = useState<string | null>(null);
  const previousLensRef = useRef<string | null>(null);
  const hasInitializedViewModeRef = useRef(false);
  const fitCardRefs = useRef<Record<string, HTMLElement | null>>({});

  const analysis = props.analysis;
  const uncertainties = analysis ? sortBySeverity(analysis.uncertainties) : [];
  const critiqueSource = props.turnAnalysis?.critiques ?? analysis?.critiques ?? [];
  const critiqueBreakdown = buildBreakdown(critiqueSource);
  const resolutionSummary = buildResolutionSummary(critiqueSource);
  const topIssue = uncertainties[0] ?? null;
  const fallbackBreakdown = buildUncertaintyBreakdown(uncertainties);
  const fallbackResolutionSummary = buildUncertaintyResolutionSummary(uncertainties);
  const activeBreakdown = critiqueBreakdown.length > 0 ? critiqueBreakdown : fallbackBreakdown;
  const activeResolutionSummary = resolutionSummary.length > 0 ? resolutionSummary : fallbackResolutionSummary;
  const issueBreakdownUsesWeakSpotFallback = critiqueBreakdown.length === 0 && activeBreakdown.length > 0;
  const maxBreakdownCount = activeBreakdown.reduce((currentMax, entry) => Math.max(currentMax, entry.count), 0);
  const lensComparisons = props.contexts
    .map((context) => {
      const persistedAlignment = analysis?.alignments.find((item) => item.contextId === context.id) ?? null;
      const preview = props.alignmentPreviews[context.id] ?? null;
      const previewAlignment = preview?.alignment ?? null;
      const alignment = previewAlignment ?? persistedAlignment;
      const evaluation = resolveLensEvaluation(context, preview, alignment);
      const score = alignment ? Math.round(alignment.alignmentScore) : 0;
      const isSelected = props.selectedContextId ? props.selectedContextId === context.id : props.contexts[0]?.id === context.id;

      return {
        context,
        preview,
        alignment,
        evaluation,
        score,
        isSelected,
        overlapCount: alignment?.overlappingConcepts.length ?? 0,
        divergenceCount: alignment?.divergences.length ?? 0,
        leverageCount: alignment?.leveragePoints.length ?? 0
      };
    })
    .sort((left, right) => {
      if (left.isSelected !== right.isSelected) {
        return left.isSelected ? -1 : 1;
      }

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.context.name.localeCompare(right.context.name);
    });

  const activeLensItem = lensComparisons.find((item) => item.isSelected) ?? lensComparisons[0] ?? null;
  const selectedLens = props.contexts.find((context) => context.id === props.selectedContextId) ?? activeLensItem?.context ?? null;
  const availableCompareLenses = lensComparisons.filter((item) => item.context.id !== activeLensItem?.context.id);
  const availableCompareKey = availableCompareLenses.map((item) => item.context.id).join("|");
  const comparisonLensItem = availableCompareLenses.find((item) => item.context.id === comparisonLensId) ?? availableCompareLenses[0] ?? null;
  const comparisonSummary = buildCompareSummary(activeLensItem, comparisonLensItem, topIssue);
  const sortedAllLensComparisons = sortAllViewLensComparisons(lensComparisons, allViewSort);

  const buildLensDetailData = (lensItem: LensComparisonItem | null): LensDetailData => {
    if (!analysis || !lensItem) {
      const unavailable = buildUnavailableLensEvaluation(null);
      return {
        lens: null,
        statusText: unavailable.label,
        lead: unavailable.summary,
        rationale: unavailable.rationale,
        sourceExcerpt: null,
        notices: [],
        examples: [],
        questions: [],
        reframes: [],
        challenges: []
      };
    }

    return {
      lens: lensItem.context,
      statusText: buildLensStatusText(lensItem.score, lensItem.evaluation),
      lead: lensItem.evaluation.summary,
      rationale: lensItem.evaluation.rationale,
      sourceExcerpt: lensItem.preview?.sourceExcerpt ?? null,
      notices: buildLensNotices(lensItem.evaluation, lensItem.alignment),
      examples: buildLensApplicationExamples(lensItem.context, analysis, topIssue, lensItem.alignment),
      questions: buildLensQuestions(lensItem.context, analysis, topIssue),
      reframes: buildLensReframes(lensItem.context, lensItem.alignment),
      challenges: buildLensChallenges(lensItem.context, lensItem.alignment, topIssue)
    };
  };

  const activeLensDetail = buildLensDetailData(activeLensItem);
  const comparisonLensDetail = buildLensDetailData(comparisonLensItem);
  const allViewSortDescription = getAllViewSortDescription(allViewSort);
  const primarySectionLabel = viewMode === "focus" ? "Focus view" : viewMode === "compare" ? "Compare view" : "All view";
  const primarySectionDetail = viewMode === "focus"
    ? "Stay on one lens and keep the active read clean."
    : viewMode === "compare"
      ? "Scan the one-vs-one comparison before touching deeper structure."
      : "Start with the compact board, then inspect deeper sections as needed.";
  const sectionNavItems: AnalysisSectionNavItem[] = [
    {
      id: "analysis-primary-view",
      label: primarySectionLabel,
      detail: primarySectionDetail
    },
    {
      id: "analysis-glance",
      label: "Argument at a glance",
      detail: "Start with the single pressure point most likely to shift the argument."
    },
    ...(viewMode === "all"
      ? [
          {
            id: "analysis-claims",
            label: "Root claims",
            detail: "Review the direct assertions the argument wants accepted."
          },
          {
            id: "analysis-assumptions",
            label: "Core assumptions",
            detail: "See the unstated support carrying the current wording."
          },
          {
            id: "analysis-weak-spots",
            label: "Weak spots",
            detail: "Jump straight to the friction points and the best way to examine them."
          },
          {
            id: "analysis-perspectives",
            label: "Perspective library",
            detail: "Switch, add, or remove lenses without leaving analysis."
          }
        ]
      : [
          {
            id: "analysis-full-board",
            label: "Full analysis board",
            detail: "Open the deeper claims, assumptions, and weak-spot scan when needed."
          }
        ])
  ];

  const scrollToSection = (sectionId: string): void => {
    if (typeof document === "undefined") {
      return;
    }

    const section = document.getElementById(sectionId);
    if (section && typeof section.scrollIntoView === "function") {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderModeSwitch = () => (
    <div className="analysis-workspace-form__mode-switch" role="toolbar" aria-label="Analysis view mode">
      <button className={`ghost-button ${viewMode === "focus" ? "ghost-button--active" : ""}`} type="button" aria-pressed={viewMode === "focus"} onClick={() => setViewMode("focus")}>Focus</button>
      <button className={`ghost-button ${viewMode === "compare" ? "ghost-button--active" : ""}`} type="button" aria-pressed={viewMode === "compare"} onClick={() => setViewMode("compare")} disabled={props.contexts.length < 2}>Compare</button>
      <button className={`ghost-button ${viewMode === "all" ? "ghost-button--active" : ""}`} type="button" aria-pressed={viewMode === "all"} onClick={() => setViewMode("all")} disabled={props.contexts.length === 0}>All</button>
    </div>
  );

  const renderCountSummary = () => (
    <div className="analysis-workspace-form__hero">
      <span className="count-badge">{props.contexts.length} perspectives</span>
      <span className="count-badge">{uncertainties.length} weak spots</span>
      <span className="count-badge">{analysis?.claims.length ?? 0} claims</span>
    </div>
  );

  const renderQuickNavigation = () => (
    <details className="analysis-workspace-disclosure analysis-workspace-disclosure--jump-menu">
      <summary>
        <span>Jump to section</span>
        <span className="count-badge">{sectionNavItems.length} stops</span>
      </summary>
      <div className="analysis-workspace-disclosure__body analysis-workspace-jump-menu__body">
        <p className="detail-line">Use this when the analysis board gets long and you need a clear place to land.</p>
        <div className="analysis-workspace-nav__list" role="list">
          {sectionNavItems.map((item) => (
            <button
              key={item.id}
              className="analysis-workspace-nav__button"
              type="button"
              aria-controls={item.id}
              onClick={() => scrollToSection(item.id)}
            >
              <span className="analysis-workspace-nav__button-label">{item.label}</span>
              <span className="analysis-workspace-nav__button-detail">{item.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </details>
  );

  const renderIssueBreakdownColumn = () => (
    <div className="analysis-workspace-stack analysis-workspace-stack--breakdown">
      <div>
        <p className="eyebrow">Issue breakdown</p>
        <h4 className="analysis-workspace-subheading">Bar chart summary</h4>
        <p className="detail-line">This tells you what kind of pressure the argument is creating and how it is best examined.</p>
      </div>

      {issueBreakdownUsesWeakSpotFallback ? (
        <p className="detail-line analysis-workspace-breakdown__status">
          Summary derived from the current weak spots because no critique classifications are available for this run yet.
        </p>
      ) : null}

      {activeResolutionSummary.length > 0 ? (
        <div className="analysis-breakdown__summary-grid">
          {activeResolutionSummary.map((entry) => (
            <article key={entry.path} className="analysis-breakdown__summary-card">
              <p className="eyebrow">Resolve via</p>
              <strong>{formatResolvePath(entry.path)}</strong>
              <p className="detail-line">{entry.count} issue(s)</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="analysis-breakdown__empty">No issue breakdown is available for this run yet.</div>
      )}

      {!issueBreakdownUsesWeakSpotFallback && activeBreakdown.length === 1 ? <p className="detail-line">Only one critique category detected for this argument.</p> : null}

      {activeBreakdown.length > 0 ? (
        activeBreakdown.map((entry) => (
          <article key={entry.type} className="analysis-breakdown__item">
            <div className="analysis-breakdown__row">
              <span className={`critique-badge critique-badge--${entry.type}`}>{formatCritiqueType(entry.type)}</span>
              <span className="count-badge">{entry.count}</span>
            </div>
            <div className="analysis-breakdown__bar">
              <span className="analysis-breakdown__fill" style={{ width: `${Math.max(6, getCountBarWidthPercent(entry.count, maxBreakdownCount))}%` }} />
            </div>
            <p className="detail-line">Average severity: {entry.averageSeverity}</p>
          </article>
        ))
      ) : null}
    </div>
  );

  const renderFocusLensSelector = () => (
    <div className="analysis-workspace-focus__controls">
      <label className="field field--wide analysis-workspace-focus__picker">
        <span className="eyebrow">Focus lens</span>
        <select
          aria-label="Focus lens"
          value={activeLensDetail.lens?.id ?? ""}
          onChange={(event) => props.onSelectContext(event.target.value)}
          disabled={props.busy || lensComparisons.length === 0}
        >
          {lensComparisons.map((item) => (
            <option key={item.context.id} value={item.context.id}>
              {item.context.name} - {buildLensStatusText(item.score, item.evaluation)}
            </option>
          ))}
        </select>
      </label>

      <div className="analysis-workspace-focus__status" role="status" aria-live="polite">
        <p className="eyebrow">Active lens</p>
        <strong>{activeLensDetail.lens ? activeLensDetail.lens.name : "None selected"}</strong>
        <p className="detail-line">{activeLensDetail.statusText}</p>
      </div>
    </div>
  );

  const renderFocusLensCard = (item: LensComparisonItem) => (
    <article
      key={item.context.id}
      role="listitem"
      ref={(node) => {
        fitCardRefs.current[item.context.id] = node;
      }}
      tabIndex={-1}
      className={`analysis-workspace-card analysis-workspace-card--selector ${item.isSelected ? "analysis-workspace-card--selected" : ""}`}
    >
      <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
        <div className="analysis-workspace-card__title-block">
          <strong className="analysis-workspace-card__title" role="heading" aria-level={4}>{item.context.name}</strong>
          <span className="count-badge">{formatSourceLabel(item.context.source)}</span>
        </div>
        <button
          className={`ghost-button analysis-workspace-card__action ${item.isSelected ? "ghost-button--active" : ""}`}
          type="button"
          aria-pressed={item.isSelected}
          onClick={() => props.onSelectContext(item.context.id)}
          disabled={props.busy}
        >
          {item.isSelected ? "Using this lens" : "Use this lens"}
        </button>
      </div>
      <p className="detail-line analysis-workspace-card__fit-label">{buildLensStatusText(item.score, item.evaluation)}</p>
      <div className="analysis-breakdown__bar">
        <span className="analysis-breakdown__fill" style={{ width: `${item.score > 0 ? Math.max(6, Math.min(100, item.score)) : 0}%` }} />
      </div>
      <p className="detail-line analysis-workspace-card__fit-summary analysis-workspace-card__fit-summary--clamped">{item.evaluation.summary}</p>
    </article>
  );

  const renderAllLensCard = (item: LensComparisonItem) => (
    <article
      key={item.context.id}
      role="listitem"
      ref={(node) => {
        fitCardRefs.current[item.context.id] = node;
      }}
      tabIndex={-1}
      className={`analysis-workspace-card analysis-workspace-card--selector analysis-workspace-card--compact ${item.isSelected ? "analysis-workspace-card--selected" : ""}`}
    >
      <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
        <div className="analysis-workspace-card__title-block">
          <strong className="analysis-workspace-card__title" role="heading" aria-level={4}>{item.context.name}</strong>
          <span className="count-badge">{formatSourceLabel(item.context.source)}</span>
        </div>
        <button
          className={`ghost-button analysis-workspace-card__action ${item.isSelected ? "ghost-button--active" : ""}`}
          type="button"
          aria-pressed={item.isSelected && allViewDetailOpen}
          aria-controls="analysis-all-detail-drawer"
          onClick={() => {
            props.onSelectContext(item.context.id);
            setAllViewDetailOpen(true);
          }}
          disabled={props.busy}
        >
          {item.isSelected ? (allViewDetailOpen ? "Viewing detail" : "Open detail") : "Inspect lens"}
        </button>
      </div>
      <p className="detail-line analysis-workspace-card__fit-label">{buildLensStatusText(item.score, item.evaluation)}</p>
      <div className="analysis-breakdown__bar">
        <span className="analysis-breakdown__fill" style={{ width: `${item.score > 0 ? Math.max(6, Math.min(100, item.score)) : 0}%` }} />
      </div>
      <p className="detail-line analysis-workspace-card__fit-summary analysis-workspace-card__fit-summary--single-line">{item.evaluation.summary}</p>
    </article>
  );

  useEffect(() => {
    const lensId = props.selectedContextId;
    const previousLensId = previousLensRef.current;

    if (!lensId) {
      previousLensRef.current = lensId;
      return;
    }

    const didLensChange = previousLensId !== null && previousLensId !== lensId;

    if (didLensChange) {
      const card = fitCardRefs.current[lensId];
      if (card) {
        if (typeof card.scrollIntoView === "function") {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (typeof card.focus === "function") {
          card.focus({ preventScroll: true });
        }
      }
    }

    if (didLensChange && selectedLens) {
      setLensToast(`Active lens set: ${selectedLens.name}`);
      const timeoutHandle = window.setTimeout(() => {
        setLensToast(null);
      }, 1200);
      previousLensRef.current = lensId;
      return () => {
        window.clearTimeout(timeoutHandle);
      };
    }

    previousLensRef.current = lensId;
  }, [props.selectedContextId, selectedLens]);

  useEffect(() => {
    if (viewMode === "compare" && availableCompareLenses.length === 0) {
      setViewMode("focus");
    }
  }, [availableCompareLenses.length, viewMode]);

  useEffect(() => {
    if (availableCompareLenses.length === 0) {
      if (comparisonLensId) {
        setComparisonLensId("");
      }
      return;
    }

    if (!comparisonLensId || !availableCompareLenses.some((item) => item.context.id === comparisonLensId)) {
      setComparisonLensId(availableCompareLenses[0]?.context.id ?? "");
    }
  }, [availableCompareKey, comparisonLensId, availableCompareLenses]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasInitializedViewModeRef.current) {
      hasInitializedViewModeRef.current = true;
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [viewMode]);

  if (!props.analysis) {
    return (
      <section className={`card analysis-workspace-form analysis-workspace-form--${viewMode}`}>
        <div className="analysis-workspace-form__toolbar">
          <div>
            <p className="eyebrow">Analysis Workspace</p>
            <h2>Everything in one place</h2>
          </div>
          <div className="analysis-workspace-form__toolbar-actions">
            {renderModeSwitch()}
            <button className="ghost-button" type="button" onClick={props.onExit}>Return to questions</button>
          </div>
        </div>
        <div className="empty-state">No analysis yet. Send a fuller argument in Critic mode and reopen Analysis.</div>
      </section>
    );
  }

  return (
    <section className={`card analysis-workspace-form analysis-workspace-form--${viewMode}`}>
      <div className="analysis-workspace-form__toolbar">
        <div>
          <p className="eyebrow">Analysis Workspace</p>
          <h2>Use one lens, compare two, or scan the full board</h2>
          <p className="detail-line">Focus is the calm working surface, Compare is deliberate one-vs-one pressure testing, and All is a compact scan board.</p>
        </div>
        <div className="analysis-workspace-form__toolbar-actions">
          {renderModeSwitch()}
          <button className="ghost-button" type="button" onClick={props.onExit}>Return to questions</button>
        </div>
      </div>

      {renderQuickNavigation()}

      <div className="analysis-workspace-grid">
        {viewMode === "focus" ? (
          <section id="analysis-primary-view" className="analysis-workspace-section analysis-workspace-anchor-target analysis-workspace-section--lens-focus analysis-workspace-section--focus">
            <div className="analysis-workspace-section__header">
              <div>
                <p className="eyebrow">Focus view</p>
                <h3>Use one lens at a time</h3>
                <p className="detail-line analysis-workspace-section__copy">This is the default working surface. The lens rail stays compact so the active read can start higher and stay easier to scan.</p>
              </div>
              <span className="analysis-workspace-card__severity">Default working mode</span>
            </div>

            {renderFocusLensSelector()}
            {renderCountSummary()}

            {lensToast ? <p className="detail-line analysis-workspace-form__toast">{lensToast}</p> : null}
            {props.alignmentPreviewLoading ? <p className="detail-line">Refreshing lens reads from the latest session wording.</p> : null}

            <AnalysisLensDetailColumn
              eyebrow="Active lens detail"
              heading="How this lens reads the argument right now"
              lens={activeLensDetail.lens}
              statusText={activeLensDetail.statusText}
              lead={activeLensDetail.lead}
              rationale={activeLensDetail.rationale}
              sourceExcerpt={activeLensDetail.sourceExcerpt}
              notices={activeLensDetail.notices}
              examples={activeLensDetail.examples}
              questions={activeLensDetail.questions}
              reframes={activeLensDetail.reframes}
              challenges={activeLensDetail.challenges}
              emptyState="Select a lens to see detailed interpretation guidance."
            />
          </section>
        ) : null}

        {viewMode === "compare" ? (
          <section id="analysis-primary-view" className="analysis-workspace-section analysis-workspace-anchor-target analysis-workspace-section--lens-focus analysis-workspace-section--compare">
            <div className="analysis-workspace-section__header">
              <div>
                <p className="eyebrow">Compare view</p>
                <h3>Compare two lenses side by side</h3>
                <p className="detail-line analysis-workspace-section__copy">Keep the primary interpretation open, then pull the comparison snapshot and alternate read into drawers only when you need them.</p>
              </div>
              <span className="analysis-workspace-card__severity">One-vs-one mode</span>
            </div>

            {comparisonLensItem ? (
              <>
                <div className="analysis-workspace-compare-controls">
                  <div className="mode-summary mode-summary--hero mode-summary--compare-primary">
                    <p className="eyebrow">Primary lens</p>
                    <strong>{activeLensDetail.lens ? activeLensDetail.lens.name : "None selected"}</strong>
                    <p className="detail-line">{activeLensDetail.statusText}</p>
                  </div>

                  <label className="field field--wide analysis-workspace-compare-picker">
                    <span className="eyebrow">Compare against</span>
                    <select
                      aria-label="Comparison lens"
                      value={comparisonLensId}
                      onChange={(event) => {
                        setComparisonLensId(event.target.value);
                        setCompareSummaryOpen(true);
                      }}
                      disabled={props.busy}
                    >
                      {availableCompareLenses.map((item) => <option key={item.context.id} value={item.context.id}>{item.context.name}</option>)}
                    </select>
                  </label>

                  <div className="analysis-workspace-compare-actions">
                    <button className="ghost-button" type="button" onClick={() => {
                      if (!comparisonLensItem || !activeLensDetail.lens) {
                        return;
                      }
                      setComparisonLensId(activeLensDetail.lens.id);
                      props.onSelectContext(comparisonLensItem.context.id);
                    }} disabled={props.busy}>Swap lenses</button>
                    <button className="ghost-button" type="button" onClick={() => {
                      if (!comparisonLensItem) {
                        return;
                      }
                      props.onSelectContext(comparisonLensItem.context.id);
                    }} disabled={props.busy}>Make comparison lens primary</button>
                  </div>
                </div>

                <div className="analysis-workspace-compare-grid">
                  <AnalysisLensDetailColumn
                    eyebrow="Primary lens"
                    heading="How this lens reads the argument right now"
                    lens={activeLensDetail.lens}
                    statusText={activeLensDetail.statusText}
                    lead={activeLensDetail.lead}
                    rationale={activeLensDetail.rationale}
                    sourceExcerpt={activeLensDetail.sourceExcerpt}
                    notices={activeLensDetail.notices}
                    examples={activeLensDetail.examples}
                    questions={activeLensDetail.questions}
                    reframes={activeLensDetail.reframes}
                    challenges={activeLensDetail.challenges}
                    emptyState="Select a primary lens to compare interpretations."
                  />

                  <div className="analysis-workspace-compare-drawers">
                    <details
                      className="analysis-workspace-disclosure analysis-workspace-disclosure--compare-summary"
                      open={compareSummaryOpen}
                      onToggle={(event) => setCompareSummaryOpen(event.currentTarget.open)}
                    >
                      <summary>
                        <span>Comparison snapshot</span>
                        <span className="count-badge">{comparisonSummary ? "3 notes" : "No snapshot"}</span>
                      </summary>
                      <div className="analysis-workspace-disclosure__body">
                        {comparisonSummary ? (
                          <div className="analysis-workspace-compare-summary-grid">
                            <article className="analysis-workspace-card analysis-workspace-card--compact analysis-workspace-card--compare-summary">
                              <p className="eyebrow">Biggest divergence</p>
                              <p className="detail-line">{comparisonSummary.divergence}</p>
                            </article>
                            <article className="analysis-workspace-card analysis-workspace-card--compact analysis-workspace-card--compare-summary">
                              <p className="eyebrow">Shared overlap</p>
                              <p className="detail-line">{comparisonSummary.overlap}</p>
                            </article>
                            <article className="analysis-workspace-card analysis-workspace-card--compact analysis-workspace-card--compare-summary">
                              <p className="eyebrow">Best next move</p>
                              <p className="detail-line">{comparisonSummary.nextMove}</p>
                            </article>
                          </div>
                        ) : (
                          <div className="empty-state">Choose a comparison lens to generate a shared comparison snapshot.</div>
                        )}
                      </div>
                    </details>

                    <details
                      className="analysis-workspace-disclosure analysis-workspace-disclosure--compare-detail"
                      open={compareDetailOpen}
                      onToggle={(event) => setCompareDetailOpen(event.currentTarget.open)}
                    >
                      <summary>
                        <span>Comparison lens detail</span>
                        <span className="count-badge">{comparisonLensDetail.lens ? comparisonLensDetail.lens.name : "Open drawer"}</span>
                      </summary>
                      <div className="analysis-workspace-disclosure__body">
                        <AnalysisLensDetailColumn
                          eyebrow="Comparison lens"
                          heading="How this comparison lens reads the same argument"
                          lens={comparisonLensDetail.lens}
                          statusText={comparisonLensDetail.statusText}
                          lead={comparisonLensDetail.lead}
                          rationale={comparisonLensDetail.rationale}
                          sourceExcerpt={comparisonLensDetail.sourceExcerpt}
                          notices={comparisonLensDetail.notices}
                          examples={comparisonLensDetail.examples}
                          questions={comparisonLensDetail.questions}
                          reframes={comparisonLensDetail.reframes}
                          challenges={comparisonLensDetail.challenges}
                          emptyState="Choose a comparison lens to render the alternate read."
                        />
                      </div>
                    </details>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">Add or keep at least two lenses to compare interpretations side by side.</div>
            )}
          </section>
        ) : null}

        {viewMode === "all" ? (
          <section id="analysis-primary-view" className="analysis-workspace-section analysis-workspace-anchor-target analysis-workspace-section--lens-focus analysis-workspace-section--all-board">
            <div className="analysis-workspace-section__header">
              <div>
                <p className="eyebrow">All view</p>
                <h3>Scan every lens without opening the full document wall</h3>
                <p className="detail-line analysis-workspace-section__copy">This is the scan board. Each card stays compact, the sort basis stays visible, and the selected detail stays synchronized on the right.</p>
              </div>
              <span className="analysis-workspace-card__severity">Board mode</span>
            </div>

            <div className="analysis-workspace-all-controls">
              <div className="analysis-workspace-all-sort" role="toolbar" aria-label="All view sorting">
                <button className={`mode-chip ${allViewSort === "strongest_match" ? "mode-chip--active" : ""}`} type="button" onClick={() => setAllViewSort("strongest_match")} aria-pressed={allViewSort === "strongest_match"}>Strongest match</button>
                <button className={`mode-chip ${allViewSort === "highest_leverage" ? "mode-chip--active" : ""}`} type="button" onClick={() => setAllViewSort("highest_leverage")} aria-pressed={allViewSort === "highest_leverage"}>Highest leverage</button>
                <button className={`mode-chip ${allViewSort === "needs_help" ? "mode-chip--active" : ""}`} type="button" onClick={() => setAllViewSort("needs_help")} aria-pressed={allViewSort === "needs_help"}>Needs the most help</button>
              </div>
              {renderCountSummary()}
            </div>
            <p className="detail-line analysis-workspace-all-sort-note">{allViewSortDescription}</p>

            {lensToast ? <p className="detail-line analysis-workspace-form__toast">{lensToast}</p> : null}
            {props.alignmentPreviewLoading ? <p className="detail-line">Refreshing lens reads from the latest session wording.</p> : null}

            <div className="analysis-workspace-all-layout">
              <div className="analysis-workspace-all-board-grid" role="list" aria-label="All lenses board">
                {sortedAllLensComparisons.map(renderAllLensCard)}
              </div>

              <details
                className="analysis-workspace-disclosure analysis-workspace-disclosure--all-detail"
                open={allViewDetailOpen}
                onToggle={(event) => setAllViewDetailOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>{activeLensDetail.lens ? `Inspecting ${activeLensDetail.lens.name}` : "Selected lens detail"}</span>
                  <span className="count-badge">{allViewDetailOpen ? activeLensDetail.statusText : "Open drawer"}</span>
                </summary>
                <div className="analysis-workspace-disclosure__body" id="analysis-all-detail-drawer">
                  <AnalysisLensDetailColumn
                    eyebrow="Selected lens detail"
                    heading="Inspect the chosen lens without leaving the board"
                    lens={activeLensDetail.lens}
                    statusText={activeLensDetail.statusText}
                    lead={activeLensDetail.lead}
                    rationale={activeLensDetail.rationale}
                    sourceExcerpt={activeLensDetail.sourceExcerpt}
                    notices={activeLensDetail.notices}
                    examples={activeLensDetail.examples}
                    questions={activeLensDetail.questions}
                    reframes={activeLensDetail.reframes}
                    challenges={activeLensDetail.challenges}
                    emptyState="Select a lens to inspect its detail from the full board."
                  />
                </div>
              </details>
            </div>
          </section>
        ) : null}

        <section id="analysis-glance" className="analysis-workspace-section analysis-workspace-anchor-target analysis-workspace-section--summary">
          <div className="analysis-workspace-section__header">
            <div>
              <p className="eyebrow">Argument at a glance</p>
              <h3>Start with the highest-impact pressure point</h3>
              <p className="detail-line analysis-workspace-section__copy">Pick a lens above, then use this as the recommended priority order for examining the current argument.</p>
            </div>
            <div className="analysis-workspace-form__hero">
              <span className="count-badge">{analysis.claims.length} claims</span>
              <span className="count-badge">{analysis.assumptions.length} assumptions</span>
              <span className="count-badge">{analysis.critiques.length} critiques</span>
            </div>
          </div>

          <div className="analysis-workspace-form__next-step analysis-workspace-form__next-step--full">
            <p className="eyebrow">Highest impact next step</p>
            {topIssue ? (
              <>
                <h4 className="analysis-workspace-subheading">{formatCritiqueType(topIssue.uncertaintyType)}</h4>
                <p className="analysis-workspace-card__lead">{topIssue.whyFlagged}</p>
                <div className="analysis-workspace-inline-metrics">
                  <span className="analysis-workspace-card__severity">Severity {topIssue.severity}</span>
                </div>
                <p className="detail-line">Best examined via: {formatResolvePath(topIssue.canBeAddressedVia)}.</p>
                {topIssue.affectedClaimText ? <p className="detail-line">Claim under pressure: {topIssue.affectedClaimText}</p> : null}
                {topIssue.affectedAssumptionText ? <p className="detail-line">Assumption carrying it: {topIssue.affectedAssumptionText}</p> : null}
              </>
            ) : (
              <p className="detail-line">No uncertainty items yet.</p>
            )}
          </div>
        </section>

        {viewMode === "all" ? (
          <>
            <div className="analysis-workspace-core-grid">
              <section id="analysis-claims" className="analysis-workspace-section analysis-workspace-anchor-target">
                <div className="analysis-workspace-section__header">
                  <div>
                    <p className="eyebrow">Root claims</p>
                    <h3>What the argument is asserting</h3>
                    <p className="detail-line analysis-workspace-section__copy">These are the direct positions the argument asks the reader to accept.</p>
                  </div>
                </div>
                {analysis.claims.length === 0 ? <div className="empty-state">No claims were extracted for this turn yet.</div> : null}
                <div className="analysis-workspace-cards">
                  {analysis.claims.map((claim) => (
                    <article key={claim.id} className="analysis-workspace-card">
                      <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
                        <div className="analysis-workspace-card__title-block">
                          <strong className="analysis-workspace-card__title">{claim.claimText}</strong>
                        </div>
                        <span className="analysis-workspace-card__severity">Severity {claim.severity}</span>
                      </div>
                      <div className="analysis-workspace-inline-metrics">
                        <span className="count-badge">{formatClaimType(claim.claimType)}</span>
                        <span className="count-badge">{claim.canBeEvidenced ? "evidence-sensitive" : "not mainly evidence"}</span>
                        <span className="count-badge">{claim.requiresDefinition ? "needs definition" : "definition secondary"}</span>
                      </div>
                      <p className="detail-line">{describeClaimNeeds(claim)}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section id="analysis-assumptions" className="analysis-workspace-section analysis-workspace-anchor-target">
                <div className="analysis-workspace-section__header">
                  <div>
                    <p className="eyebrow">Core assumptions</p>
                    <h3>What the argument depends on</h3>
                    <p className="detail-line analysis-workspace-section__copy">These are the assumptions doing hidden structural work for the argument.</p>
                  </div>
                </div>
                {analysis.assumptions.length === 0 ? <div className="empty-state">No assumptions were surfaced yet.</div> : null}
                <div className="analysis-workspace-cards">
                  {analysis.assumptions.map((assumption) => (
                    <article key={assumption.id} className="analysis-workspace-card">
                      <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
                        <div className="analysis-workspace-card__title-block">
                          <strong className="analysis-workspace-card__title">{assumption.assumptionText}</strong>
                        </div>
                        <div className="analysis-workspace-inline-metrics">
                          <span className="count-badge">{formatAssumptionLevel(assumption.level)}</span>
                          <span className="count-badge">{assumption.isExplicit ? "explicit" : "implicit"}</span>
                        </div>
                      </div>
                      <p className="detail-line">{describeAssumptionSupport(assumption)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section id="analysis-weak-spots" className="analysis-workspace-section analysis-workspace-anchor-target">
              <div className="analysis-workspace-section__header">
                <div>
                  <p className="eyebrow">Where the argument breaks</p>
                  <h3>Weak spots and issue breakdown</h3>
                  <p className="detail-line analysis-workspace-section__copy">Use this section to see both the concrete problem spots and the kind of scrutiny they need.</p>
                </div>
              </div>
              <div className="analysis-workspace-diagnostic-grid">
                <div className="analysis-workspace-stack">
                  <div>
                    <p className="eyebrow">Top weak spots</p>
                    <h4 className="analysis-workspace-subheading">Epistemic map</h4>
                    <p className="detail-line">These are the points most likely to weaken the argument if left untouched.</p>
                  </div>
                  {uncertainties.length === 0 ? <div className="empty-state">No weak spots detected yet.</div> : null}
                  <div className="analysis-workspace-cards analysis-workspace-cards--paired">
                    {uncertainties.map((item) => (
                      <article key={item.id} className="analysis-workspace-card">
                        <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
                          <div className="analysis-workspace-card__title-block">
                            <span className={`critique-badge critique-badge--${item.uncertaintyType}`}>{formatCritiqueType(item.uncertaintyType)}</span>
                          </div>
                          <span className="analysis-workspace-card__severity">Severity {item.severity}</span>
                        </div>
                        {item.affectedClaimText ? <p className="analysis-workspace-card__lead">Claim: {item.affectedClaimText}</p> : null}
                        {item.affectedAssumptionText ? <p className="detail-line">Assumption: {item.affectedAssumptionText}</p> : null}
                        <p className="detail-line">Why flagged: {item.whyFlagged}</p>
                        <p className="detail-line">Best addressed via: {formatResolvePath(item.canBeAddressedVia)}</p>
                        <div className="analysis-workspace-card__familiarity">
                          <FamiliarityToggle
                            value={resolveFamiliarityValue(props.familiarities, item.id)}
                            busy={props.busy}
                            onChange={(signalType) => void props.onMarkFamiliarity({ uncertaintyId: item.id, signalType })}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {renderIssueBreakdownColumn()}
              </div>
            </section>

            <section id="analysis-perspectives" className="analysis-workspace-section analysis-workspace-anchor-target">
              <div className="analysis-workspace-section__header">
                <div>
                  <p className="eyebrow">Perspective library</p>
                  <h3>Manage perspectives</h3>
                  <p className="detail-line analysis-workspace-section__copy">Use this after you choose a lens if you need to add, edit, or remove a perspective.</p>
                </div>
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
          </>
        ) : (
          <section id="analysis-full-board" className="analysis-workspace-section analysis-workspace-anchor-target analysis-workspace-section--secondary">
            <div className="analysis-workspace-section__header">
              <div>
                <p className="eyebrow">Full analysis board</p>
                <h3>Keep the deeper structure available without flooding the default view</h3>
                <p className="detail-line analysis-workspace-section__copy">The full board stays here when you need it. Weak spots stay open first because they set the order of inspection.</p>
              </div>
            </div>

            <div className="analysis-workspace-disclosure-stack">
              <details className="analysis-workspace-disclosure">
                <summary><span>Root claims</span><span className="count-badge">{analysis.claims.length}</span></summary>
                <div className="analysis-workspace-disclosure__body">
                  <p className="detail-line">These are the direct positions the argument asks the reader to accept.</p>
                  {analysis.claims.length === 0 ? <div className="empty-state">No claims were extracted for this turn yet.</div> : null}
                  <div className="analysis-workspace-cards">
                    {analysis.claims.map((claim) => (
                      <article key={claim.id} className="analysis-workspace-card">
                        <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
                          <div className="analysis-workspace-card__title-block">
                            <strong className="analysis-workspace-card__title">{claim.claimText}</strong>
                          </div>
                          <span className="analysis-workspace-card__severity">Severity {claim.severity}</span>
                        </div>
                        <div className="analysis-workspace-inline-metrics">
                          <span className="count-badge">{formatClaimType(claim.claimType)}</span>
                          <span className="count-badge">{claim.canBeEvidenced ? "evidence-sensitive" : "not mainly evidence"}</span>
                          <span className="count-badge">{claim.requiresDefinition ? "needs definition" : "definition secondary"}</span>
                        </div>
                        <p className="detail-line">{describeClaimNeeds(claim)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </details>

              <details className="analysis-workspace-disclosure">
                <summary><span>Core assumptions</span><span className="count-badge">{analysis.assumptions.length}</span></summary>
                <div className="analysis-workspace-disclosure__body">
                  <p className="detail-line">These are the assumptions doing hidden structural work for the argument.</p>
                  {analysis.assumptions.length === 0 ? <div className="empty-state">No assumptions were surfaced yet.</div> : null}
                  <div className="analysis-workspace-cards">
                    {analysis.assumptions.map((assumption) => (
                      <article key={assumption.id} className="analysis-workspace-card">
                        <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
                          <div className="analysis-workspace-card__title-block">
                            <strong className="analysis-workspace-card__title">{assumption.assumptionText}</strong>
                          </div>
                          <div className="analysis-workspace-inline-metrics">
                            <span className="count-badge">{formatAssumptionLevel(assumption.level)}</span>
                            <span className="count-badge">{assumption.isExplicit ? "explicit" : "implicit"}</span>
                          </div>
                        </div>
                        <p className="detail-line">{describeAssumptionSupport(assumption)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </details>

              <details className="analysis-workspace-disclosure" open>
                <summary><span>Weak spots and issue breakdown</span><span className="count-badge">{uncertainties.length}</span></summary>
                <div className="analysis-workspace-disclosure__body">
                  <div className="analysis-workspace-diagnostic-grid">
                    <div className="analysis-workspace-stack">
                      <div>
                        <p className="eyebrow">Top weak spots</p>
                        <h4 className="analysis-workspace-subheading">Epistemic map</h4>
                      </div>
                      {uncertainties.length === 0 ? <div className="empty-state">No weak spots detected yet.</div> : null}
                      <div className="analysis-workspace-cards analysis-workspace-cards--paired">
                        {uncertainties.map((item) => (
                          <article key={item.id} className="analysis-workspace-card">
                            <div className="analysis-workspace-card__row analysis-workspace-card__row--top">
                              <div className="analysis-workspace-card__title-block">
                                <span className={`critique-badge critique-badge--${item.uncertaintyType}`}>{formatCritiqueType(item.uncertaintyType)}</span>
                              </div>
                              <span className="analysis-workspace-card__severity">Severity {item.severity}</span>
                            </div>
                            {item.affectedClaimText ? <p className="analysis-workspace-card__lead">Claim: {item.affectedClaimText}</p> : null}
                            {item.affectedAssumptionText ? <p className="detail-line">Assumption: {item.affectedAssumptionText}</p> : null}
                            <p className="detail-line">Why flagged: {item.whyFlagged}</p>
                            <p className="detail-line">Best addressed via: {formatResolvePath(item.canBeAddressedVia)}</p>
                            <div className="analysis-workspace-card__familiarity">
                              <FamiliarityToggle
                                value={resolveFamiliarityValue(props.familiarities, item.id)}
                                busy={props.busy}
                                onChange={(signalType) => void props.onMarkFamiliarity({ uncertaintyId: item.id, signalType })}
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    {renderIssueBreakdownColumn()}
                  </div>
                </div>
              </details>

              <details className="analysis-workspace-disclosure">
                <summary><span>Perspective library</span><span className="count-badge">{props.contexts.length}</span></summary>
                <div className="analysis-workspace-disclosure__body">
                  <p className="detail-line">Use this after you choose a lens if you need to add, edit, or remove a perspective.</p>
                  <ContextManagerTab
                    contexts={props.contexts}
                    busy={props.busy}
                    selectedContextId={props.selectedContextId}
                    onSelectContext={props.onSelectContext}
                    onCreateContext={props.onCreateContext}
                    onDeleteContext={props.onDeleteContext}
                  />
                </div>
              </details>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
