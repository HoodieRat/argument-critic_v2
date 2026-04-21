import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReportsPanel } from "./ReportsPanel";
import type { ReportRecord } from "../types";

function createReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: overrides.id ?? "report-1",
    sessionId: overrides.sessionId ?? "session-1",
    reportType: overrides.reportType ?? "session_overview",
    title: overrides.title ?? "Session overview",
    content: overrides.content ?? "# Session overview\nGrounded in stored session data.",
    createdAt: overrides.createdAt ?? "2026-04-21T12:00:00.000Z"
  };
}

function createProps(overrides: Partial<React.ComponentProps<typeof ReportsPanel>> = {}): React.ComponentProps<typeof ReportsPanel> {
  const newestOverview = createReport();
  const contradictionReport = createReport({
    id: "report-2",
    reportType: "contradictions",
    title: "Contradictions report",
    createdAt: "2026-04-21T12:05:00.000Z"
  });

  return {
    reports: overrides.reports ?? [newestOverview, contradictionReport],
    selectedReport: Object.prototype.hasOwnProperty.call(overrides, "selectedReport") ? (overrides.selectedReport ?? null) : newestOverview,
    onGenerate: overrides.onGenerate ?? vi.fn(async () => undefined),
    onSelect: overrides.onSelect ?? vi.fn(),
    onDelete: overrides.onDelete ?? vi.fn(async () => undefined),
    onClearAll: overrides.onClearAll ?? vi.fn(async () => undefined),
    busy: overrides.busy ?? false
  };
}

test("foregrounds the selected report and groups saved history by report type", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const props = createProps({ onSelect });

  render(<ReportsPanel {...props} />);

  expect(screen.getByRole("heading", { name: "Grounded reports" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: props.selectedReport?.title ?? "", level: 2 })).toBeInTheDocument();
  expect(screen.getByText("Saved runs by report type")).toBeInTheDocument();
  expect(screen.getByText("Contradictions report")).toBeInTheDocument();

  await user.click(screen.getByText("Contradictions report").closest("button")!);

  expect(onSelect).toHaveBeenCalledWith(props.reports[1]);
});

test("supports deleting the selected report and clearing session history", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn(async () => undefined);
  const onClearAll = vi.fn(async () => undefined);
  const props = createProps({ onDelete, onClearAll });
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<ReportsPanel {...props} />);

  await user.click(screen.getByRole("button", { name: "Delete report" }));
  await user.click(screen.getByRole("button", { name: "Clear history" }));

  expect(onDelete).toHaveBeenCalledWith(props.selectedReport?.id);
  expect(onClearAll).toHaveBeenCalled();

  confirmSpy.mockRestore();
});

test("shows a clear empty state when no reports are saved yet", () => {
  render(<ReportsPanel {...createProps({ reports: [], selectedReport: null })} />);

  expect(screen.getByText("No reports yet. Generate one to see a grounded briefing here.")).toBeInTheDocument();
  expect(screen.getByText("History stays empty until you generate your first report.")).toBeInTheDocument();
});