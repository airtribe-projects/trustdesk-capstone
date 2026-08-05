import React from 'react';
import { ShoppingBag, Truck, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { formatDate, formatCurrency, getStatusBadgeClass } from '../utils/formatters';

const OrderCard = ({ order }) => {
  if (!order) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShoppingBag className="card-title-icon" size={18} />
            <span>Order Information</span>
          </div>
        </div>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          No order context available for this ticket.
        </p>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <ShoppingBag className="card-title-icon" size={18} />
          <span>Order Context</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: 'var(--slate-500)' }}>
            #{order.order_id}
          </span>
        </div>
        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="data-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="data-field">
          <span className="data-label">Payment Status</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CreditCard size={14} color="var(--slate-400)" />
            <span className={`badge ${getStatusBadgeClass(order.payment_status)}`}>
              {order.payment_status}
            </span>
          </div>
        </div>

        <div className="data-field">
          <span className="data-label">Tracking Number</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Truck size={14} color="var(--slate-400)" />
            <span className="data-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {order.tracking_number || 'N/A'}
            </span>
          </div>
        </div>

        <div className="data-field">
          <span className="data-label">Return Window Until</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} color="var(--slate-400)" />
            <span className="data-value">
              {order.eligible_return_until ? formatDate(order.eligible_return_until) : 'Expired / Not eligible'}
            </span>
          </div>
        </div>

        <div className="data-field">
          <span className="data-label">Order Total</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <DollarSign size={14} color="var(--slate-400)" />
            <span className="data-value" style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
              {formatCurrency(order.total, order.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Purchased Items Sub-Table */}
      <div>
        <span className="data-label" style={{ marginBottom: '0.35rem', display: 'block' }}>
          Items Purchased ({items.length})
        </span>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>No items listed.</p>
        ) : (
          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product Name / SKU</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name || item.product_name || item.sku || `Item #${idx + 1}`}</div>
                      {item.sku && <div style={{ fontSize: '0.725rem', color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>SKU: {item.sku}</div>}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity || 1}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(item.price || item.unit_price || 0, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
