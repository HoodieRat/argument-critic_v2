import type { FastifyInstance } from "fastify";

import type { AppServices } from "../app.js";
import type { ClearSessionReportsRequest, ReportGenerationRequest } from "../types/api.js";

export async function registerReportsRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.get("/reports", async (request) => {
    const query = request.query as { sessionId: string };
    return { reports: services.reportsRepository.listBySession(query.sessionId) };
  });

  app.post("/reports/generate", async (request) => {
    const body = request.body as ReportGenerationRequest;
    return { report: services.reportBuilder.generate(body.sessionId, body.reportType) };
  });

  app.delete("/reports/:reportId", async (request) => {
    const params = request.params as { reportId: string };
    return { deleted: services.reportsRepository.delete(params.reportId) };
  });

  app.post("/reports/clear-session", async (request) => {
    const body = request.body as ClearSessionReportsRequest;
    return { deletedCount: services.reportsRepository.deleteBySession(body.sessionId) };
  });
}