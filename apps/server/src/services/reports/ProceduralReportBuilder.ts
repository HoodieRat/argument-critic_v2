import { randomUUID } from "node:crypto";

import type { ReportRecord } from "../../types/domain.js";
import { nowIso } from "../../utils/time.js";
import { AnalysisRepository } from "../db/repositories/AnalysisRepository.js";
import { ClaimsRepository } from "../db/repositories/ClaimsRepository.js";
import { ContradictionsRepository } from "../db/repositories/ContradictionsRepository.js";
import { QuestionsRepository } from "../db/repositories/QuestionsRepository.js";
import { ReportsRepository } from "../db/repositories/ReportsRepository.js";
import { ResearchRepository } from "../db/repositories/ResearchRepository.js";
import { SessionsRepository } from "../db/repositories/SessionsRepository.js";
import { ReportTemplates } from "./ReportTemplates.js";

const REPORT_TITLES: Record<string, string> = {
  session_overview: "session overview",
  contradictions: "contradiction report",
  research: "research report"
};

export class ProceduralReportBuilder {
  public constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly questionsRepository: QuestionsRepository,
    private readonly claimsRepository: ClaimsRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly contradictionsRepository: ContradictionsRepository,
    private readonly reportsRepository: ReportsRepository,
    private readonly researchRepository: ResearchRepository,
    private readonly templates: ReportTemplates
  ) {}

  public generate(sessionId: string, reportType: string): ReportRecord {
    const session = this.sessionsRepository.getById(sessionId);
    if (!session) {
      throw new Error("Session not found.");
    }

    const questions = this.questionsRepository.listHistory(sessionId);
    const claimsById = new Map(this.claimsRepository.listBySession(sessionId).map((claim) => [claim.id, claim]));
    const contradictions = this.contradictionsRepository.listBySession(sessionId).map((record) => ({
      ...record,
      claimAText: claimsById.get(record.claimAId)?.text ?? null,
      claimBText: claimsById.get(record.claimBId)?.text ?? null
    }));
    const analysis = this.analysisRepository.getSessionSnapshot(sessionId);
    const latestResearchRun = this.researchRepository.listRunsBySession(sessionId)[0] ?? null;
    const researchFindings = latestResearchRun ? this.researchRepository.listFindings(latestResearchRun.id) : [];
    const researchSources = latestResearchRun ? this.researchRepository.listSources(latestResearchRun.id) : [];
    const turnCount = new Set([
      ...questions.map((question) => question.sourceTurnId),
      ...analysis.critiques.map((item) => item.turnId),
      ...analysis.uncertainties.map((item) => item.turnId),
      ...analysis.alignments.map((item) => item.turnId)
    ]).size;
    const generatedAt = nowIso();

    const content = (() => {
      switch (reportType) {
        case "contradictions":
          return this.templates.buildContradictionReport({ session, generatedAt, questions, contradictions, researchRun: latestResearchRun, researchFindings, researchSources, analysis, turnCount });
        case "research":
          return this.templates.buildResearchReport({ session, generatedAt, questions, contradictions, researchRun: latestResearchRun, researchFindings, researchSources, analysis, turnCount });
        case "session_overview":
        default:
          return this.templates.buildSessionOverview({ session, generatedAt, questions, contradictions, researchRun: latestResearchRun, researchFindings, researchSources, analysis, turnCount });
      }
    })();

    const title = `${session.title} - ${REPORT_TITLES[reportType] ?? reportType.replace(/_/g, " ")}`;
    return this.reportsRepository.create({
      id: randomUUID(),
      sessionId,
      reportType,
      title,
      content
    });
  }
}