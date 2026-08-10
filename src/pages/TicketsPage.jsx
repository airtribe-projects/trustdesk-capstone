import React, { useState, useEffect } from 'react';
import { fetchTickets, fetchTicketContext } from '../api/api';
import TicketList from '../components/TicketList';
import CustomerCard from '../components/CustomerCard';
import OrderCard from '../components/OrderCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, getStatusBadgeClass } from '../utils/formatters';
import { MessageSquare, Calendar, Globe } from 'lucide-react';

const TicketsPage = ({ addToast, onSelectTicketForDashboard }) => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
      if (data && data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].ticket_id);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Tickets Load Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    const loadContext = async () => {
      setIsContextLoading(true);
      try {
        const data = await fetchTicketContext(selectedTicketId);
        setContext(data);
      } catch (err) {
        addToast({ type: 'error', title: 'Context Error', message: err.message });
      } finally {
        setIsContextLoading(false);
      }
    };
    loadContext();
  }, [selectedTicketId]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', height: 'calc(100vh - 120px)' }}>
      <TicketList
        tickets={tickets}
        selectedTicketId={selectedTicketId}
        onSelectTicket={setSelectedTicketId}
        isLoading={isLoading}
        onRefresh={loadTickets}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
        {isContextLoading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <LoadingSpinner size="28px" message="Loading ticket details..." />
          </div>
        ) : !context ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
            Select a ticket from the left panel to inspect details.
          </div>
        ) : (
          <>
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1.2rem' }}>
                  <MessageSquare className="card-title-icon" size={20} />
                  <span>{context.ticket.subject}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${getStatusBadgeClass(context.ticket.status)}`}>
                    {context.ticket.status}
                  </span>
                  {onSelectTicketForDashboard && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => onSelectTicketForDashboard(selectedTicketId)}
                    >
                      Open in AI Dashboard
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.825rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                <div>ID: <strong style={{ color: 'var(--primary-700)', fontFamily: 'var(--font-mono)' }}>{context.ticket.ticket_id}</strong></div>
                <div>Channel: <strong>{context.ticket.channel}</strong></div>
                <div>Date: <strong>{formatDate(context.ticket.created_at)}</strong></div>
              </div>

              <div className="data-field">
                <span className="data-label">Ticket Inquiry Body</span>
                <div className="ticket-body-box">
                  {context.ticket.body}
                </div>
              </div>
            </div>

            <CustomerCard customer={context.customer} />
            <OrderCard order={context.order} />
          </>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
