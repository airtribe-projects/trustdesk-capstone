import { useState } from 'react';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import EvalDashboard from './pages/EvalDashboard';
import './App.css';

function App() {
  const [page, setPage] = useState<'tickets' | 'eval'>('tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => { setPage('tickets'); setSelectedTicketId(null); }}>
          TrustDesk
        </h1>
        <nav>
          <button className={page === 'tickets' ? 'active' : ''} onClick={() => { setPage('tickets'); setSelectedTicketId(null); }}>Tickets</button>
          <button className={page === 'eval' ? 'active' : ''} onClick={() => setPage('eval')}>Evaluation</button>
        </nav>
      </header>
      <main className="app-main">
        {page === 'tickets' && !selectedTicketId && (
          <TicketList onSelect={(id) => setSelectedTicketId(id)} />
        )}
        {page === 'tickets' && selectedTicketId && (
          <TicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
        )}
        {page === 'eval' && <EvalDashboard />}
      </main>
    </div>
  );
}

export default App;
