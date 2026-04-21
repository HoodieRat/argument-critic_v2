import type {
  QuestionRecord,
  ResearchFindingRecord,
  ResearchRunRecord,
  ResearchSourceRecord,
  SessionAnalysisSnapshot,
  SessionRecord,
  ContradictionRecord
} from "../../types/domain.js";

interface GroundedContradictionRecord extends ContradictionRecord {
  readonly claimAText: string | null;
  readonly claimBText: string | null;
}

export interface ReportTemplateInput {
  readonly session: SessionRecord;
  readonly generatedAt: string;
  readonly questions: QuestionRecord[];
  readonly contradictions: GroundedContradictionRecord[];
  readonly researchRun: ResearchRunRecord | null;
  readonly researchFindings: ResearchFindingRecord[];
  readonly researchSources: ResearchSourceRecord[];
  readonly analysis: SessionAnalysisSnapshot;
  readonly turnCount: number;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

function titleCase(value: string): string {
  const humanized = humanize(value);
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

function formatResolvePath(path: string): string {
  switch (path) {
    case "logic":
      return "logic review";
    case "evidence":
      return "evidence check";
    case "definition":
      return "definition check";
    case "philosophical_examination":
      return "philosophical examination";
    case "assumption_review":
      return "assumption review";
    default:
      return humanize(path);
  }
}

function compactLines(lines: Array<string | null | undefined>): string[] {
  return lines.filter((line): line is string => typeof line === "string");
}

function prioritizeQuestions(questions: QuestionRecord[]): QuestionRecord[] {
  const statusRank = (status: QuestionRecord["status"]): number => (status === "unanswered" ? 0 : status === "answered" ? 1 : 2);
  return [...questions].sort((left, right) => {
    if (statusRank(left.status) !== statusRank(right.status)) {
      return statusRank(left.status) - statusRank(right.status);
    }

    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function buildGroundingSection(input: ReportTemplateInput): string[] {
  return [
    "## Grounding",
    `- Generated: ${input.generatedAt}`,
    `- Unique analyzed turns: ${input.turnCount}`,
    `- Claims tracked: ${input.analysis.claims.length}`,
    `- Assumptions tracked: ${input.analysis.assumptions.length}`,
    `- Questions tracked: ${input.questions.length}`,
    `- Contradictions tracked: ${input.contradictions.length}`,
    `- Research findings linked: ${input.researchFindings.length}`,
    `- Research sources linked: ${input.researchSources.length}`,
    "",
    "Grounding note: This report is procedural from saved session data. It does not invent evidence beyond stored claims, questions, contradictions, uncertainties, and research records."
  ];
}

function buildContradictionLines(contradictions: GroundedContradictionRecord[]): string[] {
  if (contradictions.length === 0) {
    return ["- No contradictions are currently stored."];
  }

  return contradictions.slice(0, 5).flatMap((record) => compactLines([
    `- ${record.explanation} [${record.status}]`,
    record.claimAText ? `  Claim A: ${record.claimAText}` : null,
    record.claimBText ? `  Claim B: ${record.claimBText}` : null
  ]));
}

export class ReportTemplates {
  public buildSessionOverview(input: ReportTemplateInput): string {
    const prioritizedQuestions = prioritizeQuestions(input.questions).slice(0, 3);
    const topClaims = [...input.analysis.claims].sort((left, right) => right.severity - left.severity).slice(0, 3);
    const topIssues = input.analysis.uncertainties.slice(0, 3);
    const highestIssue = topIssues[0] ?? null;

    return [
      `# Session overview for ${input.session.title}`,
      `Generated: ${input.generatedAt}`,
      `Mode: ${input.session.mode}`,
      `Topic: ${input.session.topic ?? "unspecified"}`,
      `Summary: ${input.session.summary ?? "No summary yet."}`,
      "",
      "## Executive view",
      ...(highestIssue
        ? compactLines([
            `- Highest-pressure issue: ${titleCase(highestIssue.uncertaintyType)} (severity ${highestIssue.severity})`,
            `  Why flagged: ${highestIssue.whyFlagged}`,
            `  Best examined via: ${formatResolvePath(highestIssue.canBeAddressedVia)}`
          ])
        : ["- Highest-pressure issue: none recorded yet."]),
      `- Open questions still active: ${input.questions.filter((question) => question.status === "unanswered").length}`,
      `- Stored contradictions: ${input.contradictions.length}`,
      `- Linked research sources: ${input.researchSources.length}`,
      "",
      "## Core claims detected",
      ...(topClaims.length === 0
        ? ["- No claims are stored for this session yet."]
        : topClaims.flatMap((claim) => [
            `- ${claim.claimText} [${claim.claimType}, severity ${claim.severity}]`,
            `  Evidence-sensitive: ${claim.canBeEvidenced ? "yes" : "no"}`
          ])),
      "",
      "## Highest-priority questions",
      ...(prioritizedQuestions.length === 0
        ? ["- No stored questions yet."]
        : prioritizedQuestions.flatMap((question) => [
            `- ${question.questionText} [${question.status}, priority ${question.priority}]`,
            `  Why asked: ${question.whyAsked}`,
            `  Tests: ${question.whatItTests}`
          ])),
      "",
      "## Highest-pressure issues",
      ...(topIssues.length === 0
        ? ["- No weak spots are stored yet."]
        : topIssues.flatMap((issue) => compactLines([
            `- ${titleCase(issue.uncertaintyType)} (severity ${issue.severity})`,
            `  Why flagged: ${issue.whyFlagged}`,
            `  Best examined via: ${formatResolvePath(issue.canBeAddressedVia)}`,
            issue.affectedClaimText ? `  Claim under pressure: ${issue.affectedClaimText}` : null,
            issue.affectedAssumptionText ? `  Assumption carrying it: ${issue.affectedAssumptionText}` : null
          ]))),
      "",
      "## Stored contradictions",
      ...buildContradictionLines(input.contradictions),
      "",
      ...buildGroundingSection(input)
    ].join("\n");
  }

  public buildContradictionReport(input: ReportTemplateInput): string {
    const relatedIssues = input.analysis.uncertainties
      .filter((item) => item.uncertaintyType === "assumption_conflict" || item.uncertaintyType === "logical_coherence")
      .slice(0, 3);

    return [
      `# Contradictions report for ${input.session.title}`,
      `Generated: ${input.generatedAt}`,
      "This report stays grounded in stored claim records that currently conflict.",
      "",
      "## Contradictions to review",
      ...buildContradictionLines(input.contradictions),
      "",
      "## Related pressure points",
      ...(relatedIssues.length === 0
        ? ["- No related logical or assumption pressure points are stored yet."]
        : relatedIssues.flatMap((issue) => compactLines([
            `- ${titleCase(issue.uncertaintyType)} (severity ${issue.severity})`,
            `  Why flagged: ${issue.whyFlagged}`,
            `  Best examined via: ${formatResolvePath(issue.canBeAddressedVia)}`
          ]))),
      "",
      ...buildGroundingSection(input)
    ].join("\n");
  }

  public buildResearchReport(input: ReportTemplateInput): string {
    const openQuestions = prioritizeQuestions(input.questions).filter((question) => question.status === "unanswered").slice(0, 3);

    return [
      `# Research report for ${input.session.title}`,
      `Generated: ${input.generatedAt}`,
      "",
      "## Research status",
      `- Latest linked run: ${input.researchRun ? `${input.researchRun.provider} (${input.researchRun.importMode}) at ${input.researchRun.createdAt}` : "none"}`,
      `- Findings linked: ${input.researchFindings.length}`,
      `- Sources linked: ${input.researchSources.length}`,
      "",
      "## Research findings",
      ...(input.researchFindings.length === 0
        ? ["- No research findings are linked to this session yet."]
        : input.researchFindings.slice(0, 5).map((finding) => `- ${finding.findingText} [${finding.category}]`)),
      "",
      "## Linked sources",
      ...(input.researchSources.length === 0
        ? ["- No linked research sources are currently stored for this session."]
        : input.researchSources.slice(0, 5).flatMap((source) => [
            `- ${source.title || source.url}`,
            `  URL: ${source.url}`,
            `  Snippet: ${source.snippet || "No snippet stored."}`
          ])),
      "",
      "## Open questions this research could help answer",
      ...(openQuestions.length === 0
        ? ["- No unanswered session questions are currently stored."]
        : openQuestions.flatMap((question) => [
            `- ${question.questionText}`,
            `  Why asked: ${question.whyAsked}`
          ])),
      "",
      ...buildGroundingSection(input)
    ].join("\n");
  }
}