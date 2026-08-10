import React from 'react';
import { UserCheck, ShieldCheck, Mail, MapPin, Award } from 'lucide-react';
import { getTierBadgeClass } from '../utils/formatters';

const CustomerCard = ({ customer }) => {
  if (!customer) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <UserCheck className="card-title-icon" size={18} />
            <span>Customer Profile</span>
          </div>
        </div>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          No customer context loaded. Select a ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <UserCheck className="card-title-icon" size={18} />
          <span>Customer Profile</span>
        </div>
        <span className={`badge ${customer.verified ? 'badge-success' : 'badge-warning'}`}>
          <ShieldCheck size={12} />
          {customer.verified ? 'Verified Account' : 'Unverified'}
        </span>
      </div>

      <div className="data-grid">
        <div className="data-field">
          <span className="data-label">Customer Name</span>
          <span className="data-value" style={{ fontWeight: 600 }}>{customer.name || 'N/A'}</span>
        </div>

        <div className="data-field">
          <span className="data-label">Email Address</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Mail size={14} color="var(--slate-400)" />
            <span className="data-value">{customer.email || 'N/A'}</span>
          </div>
        </div>

        <div className="data-field">
          <span className="data-label">Customer Tier</span>
          <div>
            <span className={`badge ${getTierBadgeClass(customer.tier)}`}>
              <Award size={12} />
              {customer.tier ? (customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)) : 'Standard'}
            </span>
          </div>
        </div>

        <div className="data-field">
          <span className="data-label">Country</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={14} color="var(--slate-400)" />
            <span className="data-value" style={{ fontWeight: 600 }}>{customer.country || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
