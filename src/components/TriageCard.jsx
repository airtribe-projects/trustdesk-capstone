import React from 'react';
import { Cpu, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { getPriorityBadgeClass } from '../utils/formatters';

const TriageCard = ({
  triageData,
  onRunTriage,
  isLoading,
  ticketId
}) => {
  return (
    <div className="card workflow-card">
      <div className="card-header">
        <div className="card-title">
          <Cpu className="card-title-icon" size={18} />
          <span>Card 1: AI Triage</span>
        </div>
        {triageData && (
          <span className="badge badge-success">
            <CheckCircle2 size={12} />
            Triaged
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.825rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
        Analyzes customer issue, predicts category, assesses sentiment, and evaluates escalation rules.
      </p>

      <button
        className="btn btn-primary btn-block"
        onClick={() => onRunTriage(ticketId)}
        disabled={isLoading || !ticketId}
      >
        {isLoading ? (
          <LoadingSpinner message="Analyzing ticket with Gemini..." />
        ) : (
          <>
            <Sparkles size={16} />
            <span>Run AI Triage</span>
          </>
        )}
      </button>

      {triageData && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="data-grid">
            <div className="data-field">
              <span className="data-label">Category</span>
              <span className="data-value" style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                {triageData.category}
              </span>
            </div>

            <div className="data-field">
              <span className="data-label">Priority</span>
              <div>
                <span className={`badge ${getPriorityBadgeClass(triageData.priority)}`}>
                  {triageData.priority}
                </span>
              </div>
            </div>

            <div className="data-field">
              <span className="data-label">Sentiment</span>
              <span className="data-value" style={{ textTransform: 'capitalize' }}>
                {triageData.sentiment}
              </span>
            </div>

            <div className="data-field">
              <span className="data-label">Escalation Required</span>
              <div>
                {triageData.escalate ? (
                  <span className="badge badge-danger">
                    <AlertTriangle size={12} />
                    Escalate to Tier-2
                  </span>
                ) : (
                  <span className="badge badge-success">No Escalation</span>
                )}
              </div>
            </div>
          </div>

          {triageData.reason && (
            <div>
              <span className="data-label">AI Reasoning & Guardrail Checks</span>
              <div className="ai-reason-box">
                {triageData.reason}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TriageCard;
