// src/App.jsx
import React, { useEffect, useState } from "react";
import TicketForm from "./components/TicketForm";

function TicketCard({ ticket }) {
  return (
    <div className="card">
      <h3>{ticket.subject || "No Subject"}</h3>
      <p>{ticket.message}</p>
      <p><strong>Customer:</strong> {ticket.customerName || "-"}</p>
      <p><strong>Priority:</strong> {ticket.priority || "-"} | <strong>Category:</strong> {ticket.category || "-"}</p>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = async () => {
    try {
      const resp = await fetch("/api/tickets");
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleTicketCreated = () => {
    fetchTickets();
  };

  return (
    <div className="app-container" style={{ padding: "2rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1.5rem" }}>TrustDesk Dashboard</h1>
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      <TicketForm onSuccess={handleTicketCreated} />
      <h2 style={{ marginTop: "2rem" }}>Existing Tickets</h2>
      {loading ? (
        <p>Loading tickets...</p>
      ) : (
        tickets.map((t) => <TicketCard key={t.id} ticket={t} />)
      )}
    </div>
  );
}
