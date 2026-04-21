# API

All routes are served by the local companion on `http://127.0.0.1:4317` by default.

## Health

- `GET /health`
  Returns basic readiness and session count.

## Runtime

- `GET /runtime/status`
  Returns readiness, managed-process count, session count, and managed-Chrome launch status.

- `POST /runtime/shutdown`
  Triggers local shutdown through the shared shutdown coordinator.

- `GET /runtime/settings`
  Returns `researchEnabled` and `launchChrome`.

- `PUT /runtime/settings`
  Updates `researchEnabled` and `launchChrome`.

## Sessions

- `GET /sessions`
  Lists sessions ordered by most recent update.

- `POST /sessions`
  Creates a new session.

- `GET /sessions/:sessionId`
  Returns the session, its chronological messages, and its active questions.

## Analysis

- `GET /analysis/session/:sessionId`
  Returns the persisted analysis snapshot for the session, using the latest saved alignment row for each context.

- `GET /analysis/turn/:turnId`
  Returns critiques, uncertainties, and alignments for a specific turn.

- `GET /analysis/contexts`
  Lists built-in and user-created analysis contexts.

- `GET /analysis/contexts/:contextId`
  Returns one analysis context definition.

- `GET /analysis/session/:sessionId/contexts/:contextId/preview`
  Returns an on-demand alignment preview for the selected context using the latest user message in the session when no persisted alignment exists yet.

- `GET /analysis/session/:sessionId/context-previews`
  Returns on-demand alignment previews for the current visible context set using the latest user message in the session.

- `POST /analysis/contexts`
  Creates a user-defined context.

  Request fields:
  `name`, `canonicalTerms`, `coreMoves`, `keyMetaphors`, `internalDisputes`, `commonPitfalls`

- `DELETE /analysis/contexts/:contextId`
  Deletes a user-created context.

- `POST /analysis/familiarities`
  Creates a familiarity signal for a claim or uncertainty.

  Request fields:
  `sessionId`, optional `uncertaintyId`, optional `assumptionId`, optional `claimId`, `signalType`, optional `userNote`

- `GET /analysis/familiarities/:sessionId`
  Lists familiarity signals for a session.

Custom context JSON shape:

```json
{
  "name": "custom semantics",
  "canonicalTerms": {
    "resonance": "how wording carries meaning"
  },
  "coreMoves": ["trace how wording changes interpretation"],
  "keyMetaphors": ["semantic field"],
  "internalDisputes": [
    {
      "position": "thick description",
      "proponents": ["example thinker"],
      "briefDescription": "prefers richer language over minimal formalism"
    }
  ],
  "commonPitfalls": ["treating metaphor as decorative"]
}
```

Built-in contexts currently seeded by the server:

- `phenomenology`
- `pragmatism`
- `epistemology`
- `systems_theory`
- `analytic_philosophy`
- `logic_and_formal_systems`

## Chat

- `POST /chat/turn`
  Runs a normal chat or critic turn.

  Request fields:
  `sessionId`, `mode`, `message`, optional `topic`, optional `includeResearch`

- `POST /chat/cancel`
  Cancels the active in-flight turn for a session.

## Database Mode

- `POST /database/query`
  Runs a deterministic database query, optionally followed by interpretation.

  Request fields:
  `sessionId`, `query`, optional `interpret`

## Questions

- `GET /questions/active?sessionId=...`
  Returns the latest five unresolved questions.

- `GET /questions/history?sessionId=...&status=...`
  Returns question history, optionally filtered by status.

- `POST /questions/:questionId/answer`
  Persists an answer and marks the question answered.

- `POST /questions/:questionId/archive`
  Archives a question.

- `POST /questions/:questionId/resolve`
  Marks a question resolved.

- `POST /questions/:questionId/reopen`
  Reopens a historical question into the active queue.

## Reports

- `GET /reports?sessionId=...`
  Lists saved reports.

- `POST /reports/generate`
  Generates and stores a procedural report.

  Request fields:
  `sessionId`, `reportType`

## Capture

- `POST /capture/submit`
  Stores a screenshot or crop submission.

  Request fields:
  `sessionId`, `dataUrl`, `mimeType`, `analyze`, optional `crop`

## Research

- `GET /research?sessionId=...`
  Lists imported research runs.

- `POST /research/import`
  Imports GPT-Researcher payloads when research is enabled.

  Request fields:
  `sessionId`, `payload`, optional `provider`, `enabledForContext`