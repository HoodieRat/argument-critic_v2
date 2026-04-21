import { expect, test } from "vitest";

import type { ChatTurnResponse } from "../../src/types/api.js";
import { createTestHarness, parseJson } from "./testHarness.js";

test("question critique types persist through session reload and history routes", async () => {
  const harness = await createTestHarness();

  try {
    const turnReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        mode: "critic",
        message: "This outcome is obviously correct and therefore no competing interpretation matters."
      }
    });
    const turnBody = parseJson<ChatTurnResponse>(turnReply.body);

    expect(turnReply.statusCode).toBe(200);
    expect(turnBody.targetedQuestions.length).toBeGreaterThan(0);
    expect(turnBody.targetedQuestions.every((question) => question.critiqueType !== null)).toBe(true);

    const sessionReply = await harness.app.inject({
      method: "GET",
      url: `/sessions/${encodeURIComponent(turnBody.session.id)}`
    });
    const sessionBody = parseJson<{ activeQuestions: ChatTurnResponse["activeQuestions"] }>(sessionReply.body);

    expect(sessionReply.statusCode).toBe(200);
    expect(sessionBody.activeQuestions.length).toBeGreaterThan(0);
    expect(sessionBody.activeQuestions.every((question) => question.critiqueType !== null)).toBe(true);

    const historyReply = await harness.app.inject({
      method: "GET",
      url: `/questions/history?sessionId=${encodeURIComponent(turnBody.session.id)}`
    });
    const historyBody = parseJson<{ questions: ChatTurnResponse["targetedQuestions"] }>(historyReply.body);

    expect(historyReply.statusCode).toBe(200);
    expect(historyBody.questions.length).toBeGreaterThan(0);
    expect(historyBody.questions.every((question) => question.critiqueType !== null)).toBe(true);
  } finally {
    await harness.cleanup();
  }
}, 20_000);