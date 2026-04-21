import { expect, test } from "vitest";

import type { AnalysisContextPreviewResponse, AnalysisContextPreviewsResponse, ContextDefinitionResponse, ContextDefinitionsResponse } from "../../src/types/api.js";
import type { SessionAnalysisSnapshot } from "../../src/types/domain.js";
import { createTestHarness, parseJson } from "./testHarness.js";

test("analysis contexts expose built-ins and support user context create-delete", async () => {
  const harness = await createTestHarness();

  try {
    const builtinsReply = await harness.app.inject({
      method: "GET",
      url: "/analysis/contexts"
    });
    const builtinsBody = parseJson<ContextDefinitionsResponse>(builtinsReply.body);

    expect(builtinsReply.statusCode).toBe(200);
    expect(builtinsBody.contexts.some((context) => context.name === "phenomenology")).toBe(true);
    expect(builtinsBody.contexts.some((context) => context.name === "pragmatism")).toBe(true);

    const createReply = await harness.app.inject({
      method: "POST",
      url: "/analysis/contexts",
      payload: {
        name: "custom_semantics",
        canonicalTerms: {
          resonance: "how a metaphor carries meaning across related ideas"
        },
        coreMoves: [
          "trace how wording changes the space of interpretations"
        ],
        keyMetaphors: [
          "semantic field"
        ],
        internalDisputes: [
          {
            position: "thick description",
            proponents: ["example"],
            briefDescription: "Prefer richer language over minimal formalism."
          }
        ],
        commonPitfalls: [
          "treating metaphor as decorative rather than structural"
        ]
      }
    });
    const createBody = parseJson<ContextDefinitionResponse>(createReply.body);

    expect(createReply.statusCode).toBe(200);
    expect(createBody.context.name).toBe("custom_semantics");
    expect(createBody.context.isMutable).toBe(true);

    const fetchReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/contexts/${encodeURIComponent(createBody.context.id)}`
    });
    const fetchBody = parseJson<ContextDefinitionResponse>(fetchReply.body);

    expect(fetchReply.statusCode).toBe(200);
    expect(fetchBody.context.name).toBe("custom_semantics");

    const deleteReply = await harness.app.inject({
      method: "DELETE",
      url: `/analysis/contexts/${encodeURIComponent(createBody.context.id)}`
    });
    expect(deleteReply.statusCode).toBe(200);

    const afterDeleteReply = await harness.app.inject({
      method: "GET",
      url: "/analysis/contexts"
    });
    const afterDeleteBody = parseJson<ContextDefinitionsResponse>(afterDeleteReply.body);

    expect(afterDeleteReply.statusCode).toBe(200);
    expect(afterDeleteBody.contexts.some((context) => context.id === createBody.context.id)).toBe(false);
  } finally {
    await harness.cleanup();
  }
}, 20_000);

test("analysis context preview derives alignment for existing session content", async () => {
  const harness = await createTestHarness();

  try {
    const sessionReply = await harness.app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        title: "Preview session",
        mode: "critic"
      }
    });
    const sessionBody = parseJson<{ session: { id: string } }>(sessionReply.body);

    const turnReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        sessionId: sessionBody.session.id,
        mode: "critic",
        message: "The resonance of a metaphor shapes meaning across related ideas and changes the interpretation space."
      }
    });

    expect(turnReply.statusCode).toBe(200);

    const createReply = await harness.app.inject({
      method: "POST",
      url: "/analysis/contexts",
      payload: {
        name: "custom_semantics",
        canonicalTerms: {
          resonance: "how a metaphor carries meaning across related ideas",
          interpretation: "the space of possible readings created by wording"
        },
        coreMoves: [
          "trace how wording changes the space of interpretations"
        ],
        keyMetaphors: [
          "semantic field"
        ],
        internalDisputes: [],
        commonPitfalls: [
          "treating metaphor as decorative rather than structural"
        ]
      }
    });
    const createBody = parseJson<ContextDefinitionResponse>(createReply.body);

    const previewReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/session/${encodeURIComponent(sessionBody.session.id)}/contexts/${encodeURIComponent(createBody.context.id)}/preview`
    });
    const previewBody = parseJson<AnalysisContextPreviewResponse>(previewReply.body);

    expect(previewReply.statusCode).toBe(200);
    expect(previewBody.alignment?.contextId).toBe(createBody.context.id);
    expect(previewBody.alignment?.alignmentScore ?? 0).toBeGreaterThan(0);
    expect(previewBody.sourceMessageId).toBeTruthy();
    expect(previewBody.sourceExcerpt).toContain("resonance");
  } finally {
    await harness.cleanup();
  }
}, 20_000);

test("session analysis keeps the latest alignment row per context", async () => {
  const harness = await createTestHarness();

  try {
    const sessionReply = await harness.app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        title: "Latest alignment session",
        mode: "critic"
      }
    });
    const sessionBody = parseJson<{ session: { id: string } }>(sessionReply.body);

    const firstTurnReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        sessionId: sessionBody.session.id,
        mode: "critic",
        message: "Justification, foundationalism, and coherentism determine what counts as knowledge."
      }
    });

    expect(firstTurnReply.statusCode).toBe(200);

    const firstAnalysisReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/session/${encodeURIComponent(sessionBody.session.id)}`
    });
    const firstAnalysisBody = parseJson<SessionAnalysisSnapshot>(firstAnalysisReply.body);
    const firstEpistemologyAlignment = firstAnalysisBody.alignments.find((alignment) => alignment.contextId === "context-epistemology") ?? null;

    expect(firstAnalysisReply.statusCode).toBe(200);
    expect(firstEpistemologyAlignment).not.toBeNull();

    const secondTurnReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        sessionId: sessionBody.session.id,
        mode: "critic",
        message: "Feedback loops and system boundaries shape organizational outcomes."
      }
    });

    expect(secondTurnReply.statusCode).toBe(200);

    const secondAnalysisReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/session/${encodeURIComponent(sessionBody.session.id)}`
    });
    const secondAnalysisBody = parseJson<SessionAnalysisSnapshot>(secondAnalysisReply.body);
    const secondEpistemologyAlignment = secondAnalysisBody.alignments.find((alignment) => alignment.contextId === "context-epistemology") ?? null;

    expect(secondAnalysisReply.statusCode).toBe(200);
    expect(secondEpistemologyAlignment).not.toBeNull();
    expect(secondEpistemologyAlignment?.turnId).not.toBe(firstEpistemologyAlignment?.turnId);
  } finally {
    await harness.cleanup();
  }
}, 20_000);

test("analysis context previews evaluate the visible lens set from current session wording", async () => {
  const harness = await createTestHarness();

  try {
    const sessionReply = await harness.app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        title: "Bulk preview session",
        mode: "critic"
      }
    });
    const sessionBody = parseJson<{ session: { id: string } }>(sessionReply.body);

    const turnReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        sessionId: sessionBody.session.id,
        mode: "critic",
        message: "The resonance of a metaphor changes interpretation, shapes meaning, and shifts the practical consequences of inquiry."
      }
    });

    expect(turnReply.statusCode).toBe(200);

    const createReply = await harness.app.inject({
      method: "POST",
      url: "/analysis/contexts",
      payload: {
        name: "custom_semantics",
        canonicalTerms: {
          resonance: "how a metaphor carries meaning across related ideas",
          interpretation: "the space of possible readings created by wording"
        },
        coreMoves: [
          "trace how wording changes the space of interpretations"
        ],
        keyMetaphors: [
          "semantic field"
        ],
        internalDisputes: [],
        commonPitfalls: [
          "treating metaphor as decorative rather than structural"
        ]
      }
    });
    const createBody = parseJson<ContextDefinitionResponse>(createReply.body);

    const previewsReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/session/${encodeURIComponent(sessionBody.session.id)}/context-previews`
    });
    const previewsBody = parseJson<AnalysisContextPreviewsResponse>(previewsReply.body);

    expect(previewsReply.statusCode).toBe(200);
    expect(Object.keys(previewsBody.previews).length).toBeGreaterThan(1);
    expect(previewsBody.previews[createBody.context.id]?.alignment?.alignmentScore ?? 0).toBeGreaterThan(0);
    expect(previewsBody.previews[createBody.context.id]?.sourceExcerpt).toContain("resonance");
    expect(previewsBody.previews["context-pragmatism"]?.sourceMessageId).toBeTruthy();
  } finally {
    await harness.cleanup();
  }
}, 20_000);

test("analysis context previews surface interpretive claim-structure reads for capability claims", async () => {
  const harness = await createTestHarness();

  try {
    const contextsReply = await harness.app.inject({
      method: "GET",
      url: "/analysis/contexts"
    });
    const contextsBody = parseJson<ContextDefinitionsResponse>(contextsReply.body);
    const contextIds = Object.fromEntries(contextsBody.contexts.map((context) => [context.name, context.id]));

    const sessionReply = await harness.app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        title: "Capability claim session",
        mode: "critic"
      }
    });
    const sessionBody = parseJson<{ session: { id: string } }>(sessionReply.body);

    const turnReply = await harness.app.inject({
      method: "POST",
      url: "/chat/turn",
      payload: {
        sessionId: sessionBody.session.id,
        mode: "critic",
        message: "Creating procedurally generated art utilizing local llm models is possible when using models skilled in math and reasoning. These can provide relatively high quality procedurally drawn art if it is done correctly."
      }
    });

    expect(turnReply.statusCode).toBe(200);

    const previewsReply = await harness.app.inject({
      method: "GET",
      url: `/analysis/session/${encodeURIComponent(sessionBody.session.id)}/context-previews`
    });
    const previewsBody = parseJson<AnalysisContextPreviewsResponse>(previewsReply.body);

    expect(previewsReply.statusCode).toBe(200);
    expect(previewsBody.previews[contextIds.analytic_philosophy ?? ""]?.evaluation.label).toBe("Interpretive read");
    expect(previewsBody.previews[contextIds.logic_and_formal_systems ?? ""]?.evaluation.label).toBe("Interpretive read");
    expect(previewsBody.previews[contextIds.pragmatism ?? ""]?.evaluation.label).toBe("Interpretive read");
    expect(previewsBody.previews[contextIds.systems_theory ?? ""]?.evaluation.label).toBe("No direct lens hook yet");
  } finally {
    await harness.cleanup();
  }
}, 20_000);