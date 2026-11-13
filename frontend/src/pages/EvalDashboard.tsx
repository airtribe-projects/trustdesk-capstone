import { useState } from 'react';
import { api } from '../services/api';
import type { EvalRun } from '../types';

export default function EvalDashboard() {
  const [evalRun, setEvalRun] = useState<EvalRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true); setError('');
    try { setEvalRun(await api.runEvaluation()); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleLoad = async () => {
    setLoading(true); setError('');
    try { setEvalRun(await api.getLatestEvaluation()); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="eval-dashboard">
      <h2>Evaluation Dashboard</h2>
      <div className="eval-controls">
        <button className="action-btn primary" onClick={handleRun} disabled={loading}>{loading ? 'Running...' : 'Run Evaluation'}</button>
        <button className="action-btn secondary" onClick={handleLoad} disabled={loading}>Load Latest</button>
      </div>
      {error && <div className="error">{error}</div>}
      {evalRun?.metrics && (
        <>
          <div className="metrics-grid">
            <div className="metric-card"><h4>Category Accuracy</h4><span className="metric-value">{pct(evalRun.metrics.category_accuracy)}</span></div>
            <div className="metric-card"><h4>Priority Accuracy</h4><span className="metric-value">{pct(evalRun.metrics.priority_accuracy)}</span></div>
            <div className="metric-card"><h4>Citation Coverage</h4><span className="metric-value">{pct(evalRun.metrics.citation_coverage)}</span></div>
            <div className="metric-card"><h4>Unsafe Block Rate</h4><span className="metric-value">{pct(evalRun.metrics.unsafe_action_block_rate)}</span></div>
            <div className="metric-card"><h4>Escalation Accuracy</h4><span className="metric-value">{pct(evalRun.metrics.escalation_accuracy)}</span></div>
            <div className="metric-card"><h4>Total Cases</h4><span className="metric-value">{evalRun.metrics.total_cases}</span></div>
          </div>
          <h3>Per-Case Results</h3>
          <table className="eval-table">
            <thead><tr><th>Case</th><th>Ticket</th><th>Category</th><th>Priority</th><th>Citations</th><th>Unsafe Blocked</th><th>Escalation</th><th>Passed</th></tr></thead>
            <tbody>
              {evalRun.case_results?.map(c => (
                <tr key={c.case_id} className={c.passed ? 'pass' : 'fail'}>
                  <td>{c.case_id}</td><td>{c.ticket_id}</td>
                  <td>{c.category_match ? '✅' : '❌'} {c.predicted_category}</td>
                  <td>{c.priority_match ? '✅' : '❌'} {c.predicted_priority}</td>
                  <td>{c.citation_covered ? '✅' : '❌'}</td>
                  <td>{c.unsafe_blocked === undefined ? '—' : c.unsafe_blocked ? '✅' : '❌'}</td>
                  <td>{c.escalation_match ? '✅' : '❌'}</td>
                  <td className={c.passed ? 'pass-cell' : 'fail-cell'}>{c.passed ? '✅ PASS' : '❌ FAIL'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
