import type { CritiqueClassificationRecord, CritiqueType, FamiliaritySignalRecord, FamiliaritySignalType } from "../../types";

export function formatCritiqueType(value: CritiqueType): string {
  return value.replace(/_/g, " ");
}

export function formatResolvePath(value: CritiqueClassificationRecord["canBeResolvedVia"]): string {
  return value.replace(/_/g, " ");
}

export function getSeverityTone(value: number): string {
  if (value >= 8) {
    return "high";
  }
  if (value >= 5) {
    return "medium";
  }
  return "low";
}

export function resolveFamiliarityValue(
  familiarities: FamiliaritySignalRecord[],
  uncertaintyId: string
): FamiliaritySignalType | null {
  return familiarities.find((item) => item.uncertaintyId === uncertaintyId)?.signalType ?? null;
}

export function buildBreakdown(critiques: CritiqueClassificationRecord[]): Array<{ type: CritiqueType; count: number; averageSeverity: number }> {
  const counts = new Map<CritiqueType, { count: number; severityTotal: number }>();
  for (const critique of critiques) {
    const entry = counts.get(critique.critiqueType) ?? { count: 0, severityTotal: 0 };
    entry.count += 1;
    entry.severityTotal += critique.severity;
    counts.set(critique.critiqueType, entry);
  }

  return [...counts.entries()]
    .map(([type, value]) => ({
      type,
      count: value.count,
      averageSeverity: value.count > 0 ? Number((value.severityTotal / value.count).toFixed(1)) : 0
    }))
    .sort((left, right) => right.count - left.count);
}

export function buildExamples(critiques: CritiqueClassificationRecord[], type: CritiqueType): string[] {
  return critiques
    .filter((critique) => critique.critiqueType === type)
    .slice(0, 2)
    .map((critique) => critique.description);
}

export function buildResolutionSummary(critiques: CritiqueClassificationRecord[]): Array<{ path: CritiqueClassificationRecord["canBeResolvedVia"]; count: number }> {
  const counts = new Map<CritiqueClassificationRecord["canBeResolvedVia"], number>();
  for (const critique of critiques) {
    counts.set(critique.canBeResolvedVia, (counts.get(critique.canBeResolvedVia) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => right.count - left.count);
}

export function getCountBarWidthPercent(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) {
    return 0;
  }

  return Math.round((count / maxCount) * 100);
}