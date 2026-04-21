import type { FastifyInstance } from "fastify";

import type { AppServices } from "../app.js";
import type { ContextDefinitionInput } from "../services/analysis/ContextLibraryService.js";
import type { AnalysisContextPreviewResponse, AnalysisContextPreviewsResponse, FamiliaritySignalRequest } from "../types/api.js";

function findLatestUserMessage(services: AppServices, sessionId: string) {
  return services.messagesRepository
    .listBySession(sessionId, 200)
    .find((message) => message.role === "user" && message.content.trim().length > 0);
}

function buildUnavailablePreview(): AnalysisContextPreviewResponse {
  return {
    alignment: null,
    evaluation: {
      state: "unavailable",
      label: "No current text to evaluate",
      summary: "There is no recent user message with enough text to evaluate against this lens yet.",
      rationale: "Send a fuller argument first, then Analysis can compare the latest wording against each lens.",
      evidence: []
    },
    sourceMessageId: null,
    sourceExcerpt: null
  };
}

export async function registerAnalysisRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.get("/analysis/session/:sessionId", async (request) => {
    const params = request.params as { sessionId: string };
    return services.epistemicAnalysisOrchestrator.listSession(params.sessionId);
  });

  app.get("/analysis/turn/:turnId", async (request) => {
    const params = request.params as { turnId: string };
    return services.epistemicAnalysisOrchestrator.listTurn(params.turnId);
  });

  app.get("/analysis/contexts", async () => {
    return { contexts: services.contextLibraryService.listAll() };
  });

  app.get("/analysis/contexts/:contextId", async (request, reply) => {
    const params = request.params as { contextId: string };
    const context = services.contextLibraryService.getById(params.contextId);
    if (!context) {
      return reply.code(404).send("Context not found.");
    }

    return { context };
  });

  app.get("/analysis/session/:sessionId/contexts/:contextId/preview", async (request, reply) => {
    const params = request.params as { sessionId: string; contextId: string };
    const context = services.contextLibraryService.getById(params.contextId);
    if (!context) {
      return reply.code(404).send("Context not found.");
    }

    const latestUserMessage = findLatestUserMessage(services, params.sessionId);

    const response: AnalysisContextPreviewResponse = latestUserMessage
      ? (() => {
          const preview = services.epistemicAnalysisOrchestrator.previewAlignment({
            sessionId: params.sessionId,
            message: latestUserMessage.content,
            context,
            sourceId: `preview:${latestUserMessage.id}`
          });

          return {
            alignment: preview.alignment,
            evaluation: preview.evaluation,
            sourceMessageId: latestUserMessage.id,
            sourceExcerpt: latestUserMessage.content.slice(0, 240)
          };
        })()
      : buildUnavailablePreview();

    return response;
  });

  app.get("/analysis/session/:sessionId/context-previews", async (request) => {
    const params = request.params as { sessionId: string };
    const latestUserMessage = findLatestUserMessage(services, params.sessionId);
    const response: AnalysisContextPreviewsResponse = { previews: {} };

    for (const context of services.contextLibraryService.listAll()) {
      response.previews[context.id] = latestUserMessage
        ? (() => {
            const preview = services.epistemicAnalysisOrchestrator.previewAlignment({
              sessionId: params.sessionId,
              message: latestUserMessage.content,
              context,
              sourceId: `preview:${latestUserMessage.id}`
            });

            return {
              alignment: preview.alignment,
              evaluation: preview.evaluation,
              sourceMessageId: latestUserMessage.id,
              sourceExcerpt: latestUserMessage.content.slice(0, 240)
            };
          })()
        : buildUnavailablePreview();
    }

    return response;
  });

  app.post("/analysis/contexts", async (request) => {
    const body = request.body as ContextDefinitionInput;
    const context = await services.contextLibraryService.createUserContext(body);
    return { context };
  });

  app.delete("/analysis/contexts/:contextId", async (request) => {
    const params = request.params as { contextId: string };
    await services.contextLibraryService.deleteUserContext(params.contextId);
    return { deleted: true };
  });

  app.post("/analysis/familiarities", async (request) => {
    const body = request.body as FamiliaritySignalRequest;
    const familiarity = services.epistemicAnalysisOrchestrator.markFamiliarity({
      sessionId: body.sessionId,
      uncertaintyId: body.uncertaintyId ?? null,
      assumptionId: body.assumptionId ?? null,
      claimId: body.claimId ?? null,
      signalType: body.signalType,
      userNote: body.userNote ?? null
    });
    return { familiarity };
  });

  app.get("/analysis/familiarities/:sessionId", async (request) => {
    const params = request.params as { sessionId: string };
    return { familiarities: services.epistemicAnalysisOrchestrator.listFamiliarities(params.sessionId) };
  });
}