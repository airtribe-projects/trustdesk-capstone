import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Ticket } from '../types';

interface Props { onSelect: (id: string) => void; }

const priorityColors: Record<string, string> = { urgent: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };
const categoryIcons: Record<string, string> = { refund: '💰', shipping: '📦', warranty: '🔧', billing: '💳', account_security: '🔒', general: '📋' };

export default function TicketList({ onSelect }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.getTickets().then(setTickets).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="loading">Loading tickets...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="ticket-list">
      <h2>Support Tickets</h2>
      <div className="ticket-grid">
        {tickets.map(t => (
          <div key={t.ticketId} className="ticket-card" onClick={() => onSelect(t.ticketId)}>
            <div className="ticket-card-header">
              <span className="ticket-id">{t.ticketId}</span>
              <span className="ticket-channel">{t.channel}</span>
            </div>
            <h3>{t.subject}</h3>
            <p className="ticket-body-preview">{t.body.substring(0, 100)}...</p>
            <div className="ticket-card-footer">
              {t.triageCategory && <span className="badge category">{categoryIcons[t.triageCategory] || '📋'} {t.triageCategory}</span>}
              {t.triagePriority && <span className="badge priority" style={{ backgroundColor: priorityColors[t.triagePriority] || '#6b7280' }}>{t.triagePriority}</span>}
              {t.triageEscalation && <span className="badge escalation">⚠️ Escalate</span>}
              {!t.triageCategory && <span className="badge pending">Not triaged</span>}
            </div>
            <div className="ticket-meta">
              <span>{t.customer?.name || t.customerId}</span>
              <span>{new Date(t.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
