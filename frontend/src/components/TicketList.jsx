// src/components/TicketList.jsx
import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function TicketList({ onCreate, onSelect, refreshFlag }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/tickets')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tickets');
        return res.json();
      })
      .then(data => {
        setTickets(data.tickets || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [refreshFlag]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="card">Error: {error}</div>;

  return (
    <div>
      <button onClick={onCreate}>Create Ticket</button>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tickets.map(t => (
          <li key={t.id} className="card">
            <strong>{t.subject}</strong>
            <p>{t.message?.slice(0, 60)}{t.message?.length > 60 ? '…' : ''}</p>
            <button onClick={() => onSelect(t)}>View Details</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
