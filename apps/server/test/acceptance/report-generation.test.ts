import { expect, test } from "vitest";

import type { ChatTurnResponse } from "../../src/types/api.js";
import { createTestHarness, parseJson } from "./testHarness.js";

test("report generation is procedural, grounded, and saved for later retrieval", async () => {
  const harness = await createTestHarness();

  try {
    const chatReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        mode: "critic",
        message: "The proposal is reasonable because it is reasonable."
      }
    });
    const chatBody = parseJson<ChatTurnResponse>(chatReply.body);

    const reportReply = await harness.app.inject({
      method: "POST",
      url: "/reports/generate",
      payload: {
        sessionId: chatBody.session.id,
        reportType: "session_overview"
      }
    });
    const reportBody = parseJson<{ report: { id: string; content: string } }>(reportReply.body);
    expect(reportBody.report.content).toContain(chatBody.session.title);
    expect(reportBody.report.content).toContain("## Executive view");
    expect(reportBody.report.content).toContain("## Grounding");
    expect(reportBody.report.content).toContain("Grounding note: This report is procedural from saved session data.");

    const listReply = await harness.app.inject({
      method: "GET",
      url: `/reports?sessionId=${chatBody.session.id}`
    });
    const listBody = parseJson<{ reports: Array<{ id: string }> }>(listReply.body);
    expect(listBody.reports.some((report) => report.id === reportBody.report.id)).toBe(true);

    const deleteReply = await harness.app.inject({
      method: "DELETE",
      url: `/reports/${encodeURIComponent(reportBody.report.id)}`
    });
    const deleteBody = parseJson<{ deleted: boolean }>(deleteReply.body);

    expect(deleteReply.statusCode).toBe(200);
    expect(deleteBody.deleted).toBe(true);

    const afterDeleteReply = await harness.app.inject({
      method: "GET",
      url: `/reports?sessionId=${chatBody.session.id}`
    });
    const afterDeleteBody = parseJson<{ reports: Array<{ id: string }> }>(afterDeleteReply.body);

    expect(afterDeleteBody.reports.some((report) => report.id === reportBody.report.id)).toBe(false);

    await harness.app.inject({
      method: "POST",
      url: "/reports/generate",
      payload: {
        sessionId: chatBody.session.id,
        reportType: "session_overview"
      }
    });
    await harness.app.inject({
      method: "POST",
      url: "/reports/generate",
      payload: {
        sessionId: chatBody.session.id,
        reportType: "research"
      }
    });

    const clearReply = await harness.app.inject({
      method: "POST",
      url: "/reports/clear-session",
      payload: {
        sessionId: chatBody.session.id
      }
    });
    const clearBody = parseJson<{ deletedCount: number }>(clearReply.body);

    expect(clearReply.statusCode).toBe(200);
    expect(clearBody.deletedCount).toBeGreaterThan(0);

    const afterClearReply = await harness.app.inject({
      method: "GET",
      url: `/reports?sessionId=${chatBody.session.id}`
    });
    const afterClearBody = parseJson<{ reports: Array<{ id: string }> }>(afterClearReply.body);

    expect(afterClearBody.reports).toHaveLength(0);
  } finally {
    await harness.cleanup();
  }
}, 20_000);

test("contradiction and research reports expose grounded stored detail", async () => {
  const harness = await createTestHarness();

  try {
    const first = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        mode: "normal_chat",
        message: "Remote work increases productivity."
      }
    });
    const firstBody = parseJson<ChatTurnResponse>(first.body);

    const second = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        sessionId: firstBody.session.id,
        mode: "critic",
        message: "Remote work does not increase productivity."
      }
    });

    expect(second.statusCode).toBe(200);

    const contradictionsReply = await harness.app.inject({
      method: "POST",
      url: "/reports/generate",
      payload: {
        sessionId: firstBody.session.id,
        reportType: "contradictions"
      }
    });
    const contradictionsBody = parseJson<{ report: { content: string } }>(contradictionsReply.body);

    expect(contradictionsReply.statusCode).toBe(200);
    expect(contradictionsBody.report.content).toContain("## Contradictions to review");
    expect(contradictionsBody.report.content).toContain("Claim A: Remote work does not increase productivity.");
    expect(contradictionsBody.report.content).toContain("Claim B: Remote work increases productivity.");
    expect(contradictionsBody.report.content).toContain("Grounding note: This report is procedural from saved session data.");

    const researchReply = await harness.app.inject({
      method: "POST",
      url: "/reports/generate",
      payload: {
        sessionId: firstBody.session.id,
        reportType: "research"
      }
    });
    const researchBody = parseJson<{ report: { content: string } }>(researchReply.body);

    expect(researchReply.statusCode).toBe(200);
    expect(researchBody.report.content).toContain("## Linked sources");
    expect(researchBody.report.content).toContain("No linked research sources are currently stored for this session.");
  } finally {
    await harness.cleanup();
  }
}, 20_000);