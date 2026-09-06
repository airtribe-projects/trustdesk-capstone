// src/components/TicketDetail.jsx
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function TicketDetail({ ticket, onBack }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const callApi = async (path, method = 'POST', body = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEMO_TOKEN || 'example_demo_token_12345'}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`Failed ${method} ${path}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <button onClick={onBack}>← Back to List</button>
      <h2>{ticket.subject}</h2>
      <p>{ticket.message}</p>
      <p><strong>Customer:</strong> {ticket.customerName || 'N/A'}</p>
      <p><strong>Priority:</strong> {ticket.priority || 'N/A'}</p>
      <p><strong>Category:</strong> {ticket.category || 'N/A'}</p>

      {error && <div style={{ color: '#ff4d4d' }}>Error: {error}</div>}
      {loading && <LoadingSpinner />}
      {status && (
        <pre style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto' }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => callApi(`/triage/${ticket.id}`)} disabled={loading}>Run Triage</button>
        <button onClick={() => callApi(`/draft/${ticket.id}`)} disabled={loading} style={{ marginLeft: '0.5rem' }}>Generate Draft</button>
        <button onClick={() => callApi(`/action/${ticket.id}`, 'POST', { action: 'resolve' })} disabled={loading} style={{ marginLeft: '0.5rem' }}>Propose Action</button>
        {status && status.proposalId && (
          <button
            onClick={() => callApi(`/approve/${status.proposalId}`, 'POST', { idempotencyKey: status.idempotencyKey })}
            disabled={loading}
            style={{ marginLeft: '0.5rem' }}
          >
            Approve Action
          </button>
        )}
      </div>
    </div>
  );
}
