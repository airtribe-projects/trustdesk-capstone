// src/App.jsx
import React, { useEffect, useState } from 'react';

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch tickets from backend (proxy via /api)
    fetch('/api/tickets')
      .then(res => res.json())
      .then(data => {
        setTickets(data.tickets || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading tickets', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>TrustDesk Dashboard</h1>
      {loading ? (
        <p>Loading tickets...</p>
      ) : (
        <ul>
          {tickets.map(t => (
            <li key={t.id}>[{t.id}] {t.subject}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
