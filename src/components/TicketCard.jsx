import React from 'react';
import { formatDate, getStatusBadgeClass } from '../utils/formatters';
import { MessageSquare, Mail, Phone, Globe } from 'lucide-react';

const ChannelIcon = ({ channel }) => {
  const c = (channel || '').toLowerCase();
  if (c.includes('email')) return <Mail size={12} />;
  if (c.includes('phone') || c.includes('call')) return <Phone size={12} />;
  if (c.includes('web') || c.includes('portal')) return <Globe size={12} />;
  return <MessageSquare size={12} />;
};

const TicketCard = ({ ticket, isSelected, onClick }) => {
  return (
    <div
      className={`ticket-item-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(ticket.ticket_id)}
    >
      <div className="ticket-item-top">
        <span className="ticket-id-tag">{ticket.ticket_id}</span>
        <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>

      <div className="ticket-item-subject" title={ticket.subject}>
        {ticket.subject}
      </div>

      <div className="ticket-item-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ChannelIcon channel={ticket.channel} />
          <span>{ticket.channel || 'Email'}</span>
        </div>
        <span>{formatDate(ticket.created_at)}</span>
      </div>
    </div>
  );
};

export default TicketCard;
