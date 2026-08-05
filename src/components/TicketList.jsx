import React, { useState } from 'react';
import TicketCard from './TicketCard';
import LoadingSpinner from './LoadingSpinner';
import { Search, Inbox, RefreshCw } from 'lucide-react';

const TicketList = ({
  tickets = [],
  selectedTicketId,
  onSelectTicket,
  isLoading,
  onRefresh
}) => {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus =
      filterStatus === 'ALL' ||
      t.status.toUpperCase() === filterStatus.toUpperCase();
    const matchesSearch =
      !searchFilter ||
      t.ticket_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="left-panel">
      <div className="card" style={{ padding: '1rem' }}>
        <div className="card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
          <div className="card-title">
            <Inbox className="card-title-icon" size={18} />
            <span>Support Tickets</span>
            <span className="badge badge-neutral" style={{ marginLeft: '0.25rem' }}>
              {tickets.length}
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.5rem' }}
              title="Refresh Tickets List"
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'spinner-primary' : ''} />
            </button>
          )}
        </div>

        <div className="ticket-list-header">
          {/* Quick Search inside list */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }}
            />
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem 0.45rem 2.2rem' }}
              placeholder="Filter tickets..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          {/* Status Filter Chips */}
          <div className="ticket-list-filters">
            {['ALL', 'NEW', 'IN PROGRESS', 'RESOLVED'].map((st) => (
              <button
                key={st}
                className={`filter-chip ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Cards List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {isLoading && tickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner size="24px" message="Fetching support tickets..." />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>
            No tickets match the selected filter.
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.ticket_id}
              ticket={ticket}
              isSelected={selectedTicketId === ticket.ticket_id}
              onClick={onSelectTicket}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TicketList;
