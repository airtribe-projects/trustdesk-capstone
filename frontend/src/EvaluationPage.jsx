import { useEffect, useState } from "react";

const summaryCards = [
  ["Cases Evaluated", "casesEvaluated", false],
  ["Category Accuracy", "categoryAccuracy", true],
  ["Priority Accuracy", "priorityAccuracy", true],
  ["Escalation Accuracy", "escalationAccuracy", true],
  ["Citation Coverage", "citationCoverage", true],
  ["Guardrail Pass Rate", "guardrailPassRate", true],
  ["Overall Score", "overallScore", true],
];

function titleCase(value = "") {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueLabel(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "Not returned";
  return titleCase(value);
}

function Badge({ passed, children }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {children}
    </span>
  );
}

function EvaluationPage({ request }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError("");

    try {
      setSummary(await request("/evaluation"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-w-0 lg:col-span-2">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
        <div>
          <p className="text-sm font-semibold text-slate-900">Evaluation</p>
          <p className="mt-0.5 text-xs text-slate-500">Live AI quality and guardrail evaluation</p>
        </div>
        <button type="button" onClick={loadSummary} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Evaluating..." : "Run again"}
        </button>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        {loading && !summary && (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 text-center">
            <div>
              <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              <p className="mt-3 text-sm font-medium text-slate-700">Running live evaluation...</p>
              <p className="mt-1 text-xs text-slate-500">Each ticket is analyzed against its expected labels.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-800">Evaluation could not be completed</p>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <button type="button" onClick={loadSummary} className="mt-4 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-800">Try again</button>
          </div>
        )}

        {summary && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map(([label, key, isPercentage]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {summary.metrics[key]}{isPercentage ? "%" : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Evaluation cases</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Predictions are compared with the stored evaluation fixtures.</p>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{summary.metrics.casesEvaluated} cases</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Ticket</th>
                      <th className="px-5 py-3 font-semibold">Expected</th>
                      <th className="px-5 py-3 font-semibold">Predicted</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Priority</th>
                      <th className="px-5 py-3 font-semibold">Escalation</th>
                      <th className="px-5 py-3 font-semibold">Citation</th>
                      <th className="px-5 py-3 font-semibold">Guardrail</th>
                      <th className="px-5 py-3 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.tickets.map((ticket) => (
                      <tr key={ticket.ticketId} className="align-top text-sm text-slate-700">
                        <td className="max-w-xs px-5 py-4"><p className="font-mono text-xs text-slate-500">{ticket.ticketId}</p><p className="mt-1 font-medium text-slate-800">{ticket.subject}</p>{ticket.error && <p className="mt-1 text-xs text-rose-600">{ticket.error}</p>}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">{titleCase(ticket.category.expected)} · {titleCase(ticket.priority.expected)} · {valueLabel(ticket.escalation.expected)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">{valueLabel(ticket.category.predicted)} · {valueLabel(ticket.priority.predicted)} · {valueLabel(ticket.escalation.predicted)}</td>
                        <td className="px-5 py-4"><Badge passed={ticket.category.passed}>{ticket.category.passed ? "Pass" : "Fail"}</Badge></td>
                        <td className="px-5 py-4"><Badge passed={ticket.priority.passed}>{ticket.priority.passed ? "Pass" : "Fail"}</Badge></td>
                        <td className="px-5 py-4"><Badge passed={ticket.escalation.passed}>{ticket.escalation.passed ? "Pass" : "Fail"}</Badge></td>
                        <td className="px-5 py-4"><Badge passed={ticket.citation.valid}>{ticket.citation.valid ? "Valid" : "Missing"}</Badge></td>
                        <td className="px-5 py-4">{ticket.guardrail.isCase ? <Badge passed={ticket.guardrail.safelyHandled}>{ticket.guardrail.safelyHandled ? "Pass" : "Fail"}</Badge> : <span className="text-xs text-slate-400">N/A</span>}</td>
                        <td className="px-5 py-4"><Badge passed={ticket.passed}>{ticket.passed ? "Pass" : "Fail"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default EvaluationPage;
