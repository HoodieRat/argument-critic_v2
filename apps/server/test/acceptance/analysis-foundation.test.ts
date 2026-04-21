import { expect, test } from "vitest";

import type {
  AnalysisSessionResponse,
  AnalysisTurnResponse,
  ChatTurnResponse,
  FamiliaritySignalRequest,
  FamiliaritySignalsResponse
} from "../../src/types/api.js";
import { createTestHarness, parseJson } from "./testHarness.js";

test("analysis foundation persists epistemic metadata and familiarity signals", async () => {
  const harness = await createTestHarness();

  try {
    const turn = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        mode: "critic",
        message: "Obviously the observer creates meaning, therefore truth is relational."
      }
    });
    const turnBody = parseJson<ChatTurnResponse>(turn.body);

    expect(turn.statusCode).toBe(200);
    expect(turnBody.targetedQuestions.length).toBeGreaterThan(0);
    expect(turnBody.targetedQuestions.some((question) => question.critiqueType !== null)).toBe(true);

    const analysisReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/session/${encodeURIComponent(turnBody.session.id)}`
    });
    const analysisBody = parseJson<AnalysisSessionResponse>(analysisReply.body);

    expect(analysisReply.statusCode).toBe(200);
    expect(analysisBody.assumptions.length).toBeGreaterThan(0);
    expect(analysisBody.critiques.length).toBeGreaterThan(0);
    expect(analysisBody.uncertainties.length).toBeGreaterThan(0);
    expect(analysisBody.alignments.some((alignment) => alignment.alignmentScore >= 0)).toBe(true);

    const turnAnalysisReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/turn/${encodeURIComponent(turnBody.targetedQuestions[0]!.sourceTurnId)}`
    });
    const turnAnalysisBody = parseJson<AnalysisTurnResponse>(turnAnalysisReply.body);
    expect(turnAnalysisReply.statusCode).toBe(200);
    expect(turnAnalysisBody.critiques.length).toBeGreaterThan(0);

    const familiarityPayload: FamiliaritySignalRequest = {
      sessionId: turnBody.session.id,
      uncertaintyId: analysisBody.uncertainties[0]!.id,
      signalType: "familiar"
    };
    const familiarityReply = await harness.app.inject({
      method: "POST",
      url: "/analysis/familiarities",
      payload: familiarityPayload
    });
    expect(familiarityReply.statusCode).toBe(200);

    const familiaritiesReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/familiarities/${encodeURIComponent(turnBody.session.id)}`
    });
    const familiaritiesBody = parseJson<FamiliaritySignalsResponse>(familiaritiesReply.body);

    expect(familiaritiesReply.statusCode).toBe(200);
    expect(familiaritiesBody.familiarities).toHaveLength(1);
    expect(familiaritiesBody.familiarities[0]!.signalType).toBe("familiar");
  } finally {
    await harness.cleanup();
  }
}, 20_000);