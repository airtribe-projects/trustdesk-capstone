import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  BarChart2,
  ShieldCheck,
  Activity
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isBackendOnline }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart2 },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <ShieldCheck size={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="brand-name">TrustDesk</span>
            <span className="brand-badge">AI OPS</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--slate-400)' }}>
            Enterprise Support Platform
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="backend-status-card">
          <div className="status-header">
            <div className="status-indicator">
              <span className={`status-dot ${isBackendOnline ? '' : 'offline'}`}></span>
              <span>{isBackendOnline ? 'FastAPI Connected' : 'Backend Offline'}</span>
            </div>
            <Activity size={14} color={isBackendOnline ? 'var(--success-500)' : 'var(--danger-500)'} />
          </div>
          <div className="status-url">{window.location.origin}</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
