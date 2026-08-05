import React, { useState } from 'react';
import { Wrench, ShieldCheck, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { getStatusBadgeClass, formatToolName } from '../utils/formatters';

const ToolActionCard = ({
  toolExecution,
  onRequestTool,
  onApproveTool,
  onExecuteTool,
  isRequesting,
  isApproving,
  isExecuting,
  ticketId
}) => {
  const [selectedTool, setSelectedTool] = useState('create_replacement_order');

  const availableTools = [
    { id: 'create_replacement_order', label: 'Create Replacement Order' },
    { id: 'issue_refund', label: 'Issue Full Refund' },
    { id: 'extend_return_window', label: 'Extend Return Window (30 Days)' },
    { id: 'escalate_to_tier2', label: 'Escalate to Tier-2 Engineer' },
  ];

  return (
    <div className="card workflow-card" style={{ borderLeftColor: 'var(--warning-500)' }}>
      <div className="card-header">
        <div className="card-title">
          <Wrench className="card-title-icon" size={18} style={{ color: 'var(--warning-500)' }} />
          <span>Card 3: Tool Actions</span>
        </div>
        {toolExecution && (
          <span className={`badge ${getStatusBadgeClass(toolExecution.status)}`}>
            {toolExecution.status}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.825rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
        Human-in-the-loop tool execution for sensitive customer account actions requiring authorization.
      </p>

      {/* Recommended tool selection if no active execution */}
      {!toolExecution && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <span className="data-label" style={{ marginBottom: '0.35rem', display: 'block' }}>
              Select Recommended Tool
            </span>
            <select
              className="search-input"
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
            >
              {availableTools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => onRequestTool(ticketId, selectedTool)}
            disabled={isRequesting || !ticketId}
            style={{ backgroundColor: 'var(--warning-700)' }}
          >
            {isRequesting ? (
              <LoadingSpinner message="Requesting tool authorization..." />
            ) : (
              <>
                <Wrench size={16} />
                <span>Request Tool Action</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Tool Action Lifecycle */}
      {toolExecution && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="data-grid">
            <div className="data-field">
              <span className="data-label">Recommended Tool</span>
              <span className="data-value" style={{ fontWeight: 600 }}>
                {formatToolName(toolExecution.tool_name)}
              </span>
            </div>

            <div className="data-field">
              <span className="data-label">Action ID</span>
              <span className="data-value" style={{ fontFamily: 'var(--font-mono)' }}>
                #{toolExecution.id}
              </span>
            </div>
          </div>

          {/* Timeline of Statuses */}
          <div className="tool-timeline">
            {/* Step 1: Request */}
            <div className="tool-step completed">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color="var(--success-500)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>1. Action Requested</span>
              </div>
              <span className="badge badge-success">Done</span>
            </div>

            {/* Step 2: Approve */}
            <div className={`tool-step ${toolExecution.status === 'Approved' || toolExecution.status === 'Completed' ? 'completed' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {toolExecution.status === 'Approved' || toolExecution.status === 'Completed' ? (
                  <CheckCircle2 size={16} color="var(--success-500)" />
                ) : (
                  <ShieldCheck size={16} color="var(--warning-500)" />
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>2. Human Approval</span>
              </div>

              {toolExecution.status === 'Pending Approval' ? (
                <button
                  className="btn btn-success"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                  onClick={() => onApproveTool(toolExecution.id)}
                  disabled={isApproving}
                >
                  {isApproving ? <LoadingSpinner size="14px" /> : 'Approve Tool'}
                </button>
              ) : (
                <span className="badge badge-success">
                  By {toolExecution.approved_by || 'Sarah Jenkins'}
                </span>
              )}
            </div>

            {/* Step 3: Execute */}
            <div className={`tool-step ${toolExecution.status === 'Completed' ? 'completed' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {toolExecution.status === 'Completed' ? (
                  <CheckCircle2 size={16} color="var(--success-500)" />
                ) : (
                  <Play size={16} color="var(--slate-400)" />
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>3. System Execution</span>
              </div>

              {toolExecution.status === 'Approved' ? (
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                  onClick={() => onExecuteTool(toolExecution.id)}
                  disabled={isExecuting}
                >
                  {isExecuting ? <LoadingSpinner size="14px" /> : 'Execute Tool'}
                </button>
              ) : toolExecution.status === 'Completed' ? (
                <span className="badge badge-success">Executed</span>
              ) : (
                <span className="badge badge-neutral">Waiting</span>
              )}
            </div>
          </div>

          {/* Execution Result Banner */}
          {toolExecution.execution_result && (
            <div
              style={{
                backgroundColor: 'var(--success-50)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
                fontSize: '0.85rem',
                color: 'var(--success-700)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Execution Result:</strong>
                <div>{toolExecution.execution_result}</div>
              </div>
            </div>
          )}

          {/* Reset button to test another tool */}
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.775rem', padding: '0.35rem' }}
            onClick={() => onRequestTool(null, null, true)} // clear state
          >
            Request New Tool Action
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolActionCard;
