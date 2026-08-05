import React, { useState } from 'react';
import { Search, User, Sparkles } from 'lucide-react';

const Header = ({ title, activeTicketId, onSearchKnowledge, setActiveTab }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearchKnowledge) onSearchKnowledge(searchQuery.trim());
      if (setActiveTab) setActiveTab('knowledge');
    }
  };

  return (
    <header className="header">
      <div className="header-title-container">
        <h1 className="page-title">{title || 'Dashboard'}</h1>
        {activeTicketId && (
          <span className="badge badge-primary">
            Active Ticket: {activeTicketId}
          </span>
        )}
      </div>

      <form className="header-search" onSubmit={handleSearchSubmit}>
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="Search Knowledge Base policy..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="header-actions">
        <div className="agent-profile">
          <div className="agent-avatar">SA</div>
          <div className="agent-info">
            <span className="agent-name">Sarah Jenkins</span>
            <span className="agent-role">Tier-3 AI Support Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
