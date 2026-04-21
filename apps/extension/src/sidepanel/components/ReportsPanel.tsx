import type { ReportRecord } from "../types";

interface ReportsPanelProps {
  readonly reports: ReportRecord[];
  readonly selectedReport: ReportRecord | null;
  readonly onGenerate: (reportType: string) => Promise<void>;
  readonly onSelect: (report: ReportRecord) => void;
  readonly onDelete: (reportId: string) => Promise<void>;
  readonly onClearAll: () => Promise<void>;
  readonly busy: boolean;
}

const REPORT_TYPES = [
  { value: "session_overview", label: "Session overview" },
  { value: "contradictions", label: "Contradictions" },
  { value: "research", label: "Research summary" }
];

function formatReportType(reportType: string): string {
  return REPORT_TYPES.find((entry) => entry.value === reportType)?.label ?? reportType.replace(/_/g, " ");
}

function groupReports(reports: readonly ReportRecord[]): Array<{ value: string; label: string; reports: ReportRecord[] }> {
  return REPORT_TYPES
    .map((entry) => ({
      value: entry.value,
      label: entry.label,
      reports: reports.filter((report) => report.reportType === entry.value)
    }))
    .filter((group) => group.reports.length > 0);
}

export function ReportsPanel(props: ReportsPanelProps) {
  const groupedReports = groupReports(props.reports);
  const clearHistory = (): void => {
    if (props.reports.length === 0) {
      return;
    }

    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm("Delete all saved reports for this session?")) {
      return;
    }

    void props.onClearAll();
  };

  return (
    <section className="card compact-card reports-panel">
      <div className="section-heading reports-panel__heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Grounded reports</h2>
          <p className="detail-line">Open the latest report first, then prune or revisit older runs from history.</p>
        </div>
        <div className="reports-panel__heading-actions">
          <span className="count-badge">{props.reports.length} saved</span>
          {props.reports.length > 0 ? (
            <button className="ghost-button ghost-button--danger" type="button" disabled={props.busy} onClick={clearHistory}>
              Clear history
            </button>
          ) : null}
        </div>
      </div>

      <div className="quick-grid reports-panel__actions">
        {REPORT_TYPES.map((reportType) => (
          <button key={reportType.value} className="ghost-button" type="button" disabled={props.busy} onClick={() => void props.onGenerate(reportType.value)}>
            {reportType.label}
          </button>
        ))}
      </div>

      <div className="report-layout">
        <article className="report-viewer">
          {props.selectedReport ? (
            <>
              <div className="report-viewer__header">
                <div>
                  <p className="eyebrow">Selected report</p>
                  <h2>{props.selectedReport.title}</h2>
                  <div className="report-viewer__meta">
                    <span className="count-badge">{formatReportType(props.selectedReport.reportType)}</span>
                    <span className="count-badge">{new Date(props.selectedReport.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="report-viewer__actions">
                  <button className="ghost-button ghost-button--danger" type="button" disabled={props.busy} onClick={() => void props.onDelete(props.selectedReport.id)}>
                    Delete report
                  </button>
                </div>
              </div>
              <pre>{props.selectedReport.content}</pre>
            </>
          ) : <div className="empty-state">No reports yet. Generate one to see a grounded briefing here.</div>}
        </article>

        <aside className="reports-history" aria-label="Saved report history">
          <div className="reports-history__header">
            <div>
              <p className="eyebrow">History</p>
              <h3>Saved runs by report type</h3>
            </div>
          </div>
          {groupedReports.length === 0 ? (
            <div className="empty-state">History stays empty until you generate your first report.</div>
          ) : (
            groupedReports.map((group) => (
              <section key={group.value} className="reports-history__group">
                <div className="reports-history__group-header">
                  <strong>{group.label}</strong>
                  <span className="count-badge">{group.reports.length}</span>
                </div>
                <div className="report-list report-list--history">
                  {group.reports.map((report) => (
                    <div key={report.id} className="report-history-row">
                      <button
                        className={`report-item ${props.selectedReport?.id === report.id ? "report-item--active" : ""}`}
                        type="button"
                        onClick={() => props.onSelect(report)}
                      >
                        <strong>{report.title}</strong>
                        <small>{new Date(report.createdAt).toLocaleString()}</small>
                        <span className="detail-line">Latest saved {formatReportType(report.reportType).toLowerCase()} snapshot.</span>
                      </button>
                      <button
                        className="ghost-button ghost-button--danger reports-history__delete"
                        type="button"
                        disabled={props.busy}
                        aria-label={`Delete ${report.title}`}
                        onClick={() => void props.onDelete(report.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </aside>
      </div>
    </section>
  );
}