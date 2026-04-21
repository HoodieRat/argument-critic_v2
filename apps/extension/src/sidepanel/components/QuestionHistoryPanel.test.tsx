import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuestionHistoryPanel } from "./QuestionHistoryPanel";
import type { QuestionRecord } from "../types";

function createQuestion(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    id: overrides.id ?? "question-1",
    sessionId: overrides.sessionId ?? "session-1",
    topic: overrides.topic ?? null,
    questionText: overrides.questionText ?? "What evidence directly supports this claim?",
    whyAsked: overrides.whyAsked ?? "The supporting evidence is still implicit.",
    whatItTests: overrides.whatItTests ?? "Whether the claim is actually backed by evidence.",
    critiqueType: overrides.critiqueType ?? "empirical_gap",
    status: overrides.status ?? "unanswered",
    priority: overrides.priority ?? 1,
    sourceTurnId: overrides.sourceTurnId ?? "turn-1",
    createdAt: overrides.createdAt ?? "2026-04-21T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-21T00:00:00.000Z"
  };
}

function createProps(overrides: Partial<React.ComponentProps<typeof QuestionHistoryPanel>> = {}): React.ComponentProps<typeof QuestionHistoryPanel> {
  const activeQuestion = createQuestion();
  const previousQuestion = createQuestion({
    id: "question-2",
    questionText: "What assumption is doing the hidden work here?",
    status: "answered",
    critiqueType: "assumption_conflict"
  });

  return {
    sessionTitle: overrides.sessionTitle ?? "Working Session",
    activeQuestions: overrides.activeQuestions ?? [activeQuestion],
    questions: overrides.questions ?? [activeQuestion, previousQuestion],
    onFilter: overrides.onFilter ?? vi.fn(async () => undefined),
    onAnswer: overrides.onAnswer ?? vi.fn(async () => undefined),
    onArchive: overrides.onArchive ?? vi.fn(async () => undefined),
    onResolve: overrides.onResolve ?? vi.fn(async () => undefined),
    onReopen: overrides.onReopen ?? vi.fn(async () => undefined),
    onClearAll: overrides.onClearAll ?? vi.fn(async () => undefined)
  };
}

test("keeps question context collapsed while preserving answer and reopen actions", async () => {
  const user = userEvent.setup();
  const onAnswer = vi.fn(async () => undefined);
  const onReopen = vi.fn(async () => undefined);

  render(<QuestionHistoryPanel {...createProps({ onAnswer, onReopen })} />);

  expect(screen.getByText("Question context").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByText("Why it was asked").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByPlaceholderText("Answer this question directly.")).toHaveAttribute("rows", "2");
  expect(screen.getByText("1 shown")).toBeInTheDocument();

  await user.type(screen.getByPlaceholderText("Answer this question directly."), "Because the claim cites no source.");
  await user.click(screen.getByRole("button", { name: "Save answer" }));
  await user.click(screen.getByRole("button", { name: "Reopen" }));

  expect(onAnswer).toHaveBeenCalledWith("question-1", "Because the claim cites no source.");
  expect(onReopen).toHaveBeenCalledWith("question-2");
});