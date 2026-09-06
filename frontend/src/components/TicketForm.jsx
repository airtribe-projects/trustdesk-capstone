// src/components/TicketForm.jsx
import React, { useState } from 'react';

export default function TicketForm({ onSuccess, onCancel }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer demo-token"
      },
        body: JSON.stringify({ subject, message, customerName, priority, category }),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      await res.json();
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create New Ticket</h2>
      {error && <div className="card" style={{ background: '#ff4d4d' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} required />

        <label>Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} required />

        <label>Customer Name</label>
        <input value={customerName} onChange={e => setCustomerName(e.target.value)} required />

        <label>Priority</label>
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option>Billing</option>
          <option>Technical</option>
          <option>General</option>
        </select>

        <div style={{ marginTop: '1rem' }}>
          <button type="submit" disabled={loading}> {loading ? 'Creating...' : 'Create'} </button>
          <button type="button" onClick={onCancel} style={{ marginLeft: '0.5rem' }} disabled={loading}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
