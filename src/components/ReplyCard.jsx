import React, { useState } from 'react';
import { MessageSquare, Check, X, FileText, Send, UserCheck, Clock } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { getStatusBadgeClass, formatDate } from '../utils/formatters';

const ReplyCard = ({
  replyData,
  onGenerateReply,
  onApproveReply,
  onRejectReply,
  isGenerating,
  isApproving,
  isRejecting,
  ticketId,
  hasTriage
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    onRejectReply(ticketId, rejectReason.trim());
    setShowRejectBox(false);
    setRejectReason('');
  };

  return (
    <div className="card workflow-card" style={{ borderLeftColor: 'var(--info-500)' }}>
      <div className="card-header">
        <div className="card-title">
          <MessageSquare className="card-title-icon" size={18} style={{ color: 'var(--info-500)' }} />
          <span>Card 2: AI Draft Reply</span>
        </div>
        {replyData && (
          <span className={`badge ${getStatusBadgeClass(replyData.status)}`}>
            {replyData.status}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.825rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
        Generates policy-grounded support response using customer history & retrieved knowledge docs.
      </p>

      {!hasTriage && !replyData && (
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-50)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '0.875rem', fontSize: '0.8rem', color: 'var(--warning-700)' }}>
          Tip: Run AI Triage (Card 1) first for best grounding accuracy.
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        onClick={() => onGenerateReply(ticketId)}
        disabled={isGenerating || !ticketId}
        style={{ backgroundColor: 'var(--info-700)' }}
      >
        {isGenerating ? (
          <LoadingSpinner message="Drafting reply grounded in policy..." />
        ) : (
          <>
            <FileText size={16} />
            <span>Generate Draft Reply</span>
          </>
        )}
      </button>

      {replyData && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <span className="data-label">Generated Response</span>
            <div className="response-box" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
              {replyData.reply}
            </div>
          </div>

          {/* Citations & Policy Sources */}
          <div>
            <span className="data-label">Grounding Citations</span>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              <span className="citation-tag">DOC-POL-101 (Return Policy)</span>
              <span className="citation-tag">DOC-POL-204 (Warranty Guide)</span>
            </div>
          </div>

          {/* Review Buttons when Draft */}
          {replyData.status === 'Draft' || !replyData.approved ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-success"
                  style={{ flex: 1 }}
                  onClick={() => onApproveReply(ticketId)}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    <LoadingSpinner message="Approving..." />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Approve Reply</span>
                    </>
                  )}
                </button>

                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => setShowRejectBox(!showRejectBox)}
                  disabled={isApproving || isRejecting}
                >
                  <X size={16} />
                  <span>Reject Reply</span>
                </button>
              </div>

              {showRejectBox && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ borderRadius: 'var(--radius-md)' }}
                  />
                  <button
                    className="btn btn-danger"
                    onClick={handleRejectSubmit}
                    disabled={!rejectReason.trim()}
                  >
                    Confirm Rejection
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* After Approval/Rejection details */
            <div
              style={{
                backgroundColor: replyData.status === 'Approved' ? 'var(--success-50)' : 'var(--danger-50)',
                border: `1px solid ${replyData.status === 'Approved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: replyData.status === 'Approved' ? 'var(--success-700)' : 'var(--danger-700)' }}>
                  {replyData.status === 'Approved' ? 'Reply Approved for Sending' : 'Draft Reply Rejected'}
                </span>
                <span className={`badge ${getStatusBadgeClass(replyData.status)}`}>
                  {replyData.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--slate-700)', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserCheck size={14} />
                  <span>Reviewed by: <strong>{replyData.approved_by || 'Abhishek Prasad (Lead Agent)'}</strong></span>
                </div>
                {replyData.review_comment && (
                  <div>Comment: {replyData.review_comment}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--slate-500)' }}>
                  <Clock size={12} />
                  <span>{formatDate(new Date())}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReplyCard;
