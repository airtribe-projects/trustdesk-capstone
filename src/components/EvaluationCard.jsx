import React from 'react';
import { BarChart2, Play, CheckCircle2, XCircle, Award } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const EvaluationCard = ({
  evalData,
  onRunEvaluation,
  isLoading,
  compact = false
}) => {
  return (
    <div className={`card ${compact ? 'workflow-card' : ''}`} style={compact ? { borderLeftColor: 'var(--primary-600)' } : {}}>
      <div className="card-header">
        <div className="card-title">
          <BarChart2 className="card-title-icon" size={18} />
          <span>{compact ? 'Card 4: Evaluation' : 'AI Performance Evaluation'}</span>
        </div>
        {evalData && (
          <span className="badge badge-primary">
            Accuracy: {evalData.accuracy}%
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.825rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
        Benchmarks AI triage predictions against curated evaluation test cases to measure system accuracy.
      </p>

      <button
        className="btn btn-primary btn-block"
        onClick={onRunEvaluation}
        disabled={isLoading}
      >
        {isLoading ? (
          <LoadingSpinner message="Running AI evaluation suite..." />
        ) : (
          <>
            <Play size={16} />
            <span>Run Evaluation</span>
          </>
        )}
      </button>

      {evalData && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Metric cards */}
          <div className="metrics-grid" style={compact ? { gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' } : {}}>
            <div className="metric-card">
              <span className="metric-title">Accuracy Rate</span>
              <span className="metric-value accuracy">{evalData.accuracy}%</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Passed Cases</span>
              <span className="metric-value passed">{evalData.passed}</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Failed Cases</span>
              <span className="metric-value failed">{evalData.failed}</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Total Test Cases</span>
              <span className="metric-value">{evalData.total_cases}</span>
            </div>
          </div>

          {/* Results table */}
          {evalData.results && evalData.results.length > 0 && (
            <div>
              <span className="data-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                Evaluation Test Breakdown ({evalData.results.length} Cases)
              </span>

              <div className="items-table-container" style={{ maxHeight: compact ? '240px' : '450px', overflowY: 'auto' }}>
                <table className="eval-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Expected Category</th>
                      <th>Predicted Category</th>
                      <th style={{ textAlign: 'center' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalData.results.map((res, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-700)' }}>
                          {res.ticket_id}
                        </td>
                        <td>{res.expected_category}</td>
                        <td>{res.predicted_category}</td>
                        <td style={{ textAlign: 'center' }}>
                          {res.passed ? (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} />
                              PASS
                            </span>
                          ) : (
                            <span className="badge badge-danger">
                              <XCircle size={12} />
                              FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluationCard;
