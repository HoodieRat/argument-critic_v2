import type { CriticFinding, CritiqueType } from "../../types/domain.js";

export function classifyCritiqueType(finding: CriticFinding): CritiqueType {
  switch (finding.type) {
    case "contradiction":
      return "logical_coherence";
    case "definition_drift":
    case "ambiguity":
      return "definitional_clarity";
    case "unsupported_premise":
      if (/should|must|ought|meaning|consciousness|truth|being|experience/i.test(finding.detail)) {
        return "philosophical_premise";
      }
      return "empirical_gap";
  }
}

export function resolvePathForCritiqueType(critiqueType: CritiqueType): string {
  switch (critiqueType) {
    case "logical_coherence":
      return "logic";
    case "empirical_gap":
      return "evidence";
    case "definitional_clarity":
      return "definition";
    case "philosophical_premise":
      return "philosophical_examination";
    case "assumption_conflict":
      return "assumption_review";
  }
}