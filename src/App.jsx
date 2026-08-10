import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastNotification from './components/ToastNotification';
import Dashboard from './pages/Dashboard';
import TicketsPage from './pages/TicketsPage';
import KnowledgePage from './pages/KnowledgePage';
import EvaluationPage from './pages/EvaluationPage';
import { checkHealth } from './api/api';
import './styles/main.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');

  // Check FastAPI backend connection on mount
  useEffect(() => {
    const verifyBackend = async () => {
      const res = await checkHealth();
      if (res && res.status === 'offline') {
        setIsBackendOnline(false);
      } else {
        setIsBackendOnline(true);
      }
    };
    verifyBackend();

    const interval = setInterval(verifyBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  // Toast management helper
  const addToast = ({ type = 'info', title, message }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 5s
    setTimeout(() => {
      removeToast(id);
    }, 5500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleKnowledgeSearchHeader = (query) => {
    setKnowledgeSearchQuery(query);
    setActiveTab('knowledge');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'AI Support Operations Dashboard';
      case 'tickets':
        return 'Tickets Directory';
      case 'knowledge':
        return 'Knowledge Base Policies';
      case 'evaluation':
        return 'AI Evaluation Benchmarks';
      default:
        return 'TrustDesk';
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendOnline={isBackendOnline}
      />

      {/* Main Content Workspace */}
      <div className="main-wrapper">
        <Header
          title={getPageTitle()}
          onSearchKnowledge={handleKnowledgeSearchHeader}
          setActiveTab={setActiveTab}
        />

        <main className="content-area">
          {activeTab === 'dashboard' && (
            <Dashboard addToast={addToast} />
          )}

          {activeTab === 'tickets' && (
            <TicketsPage
              addToast={addToast}
              onSelectTicketForDashboard={(ticketId) => {
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgePage
              addToast={addToast}
              initialQuery={knowledgeSearchQuery}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationPage addToast={addToast} />
          )}
        </main>
      </div>

      {/* Toast Notification Layer */}
      <ToastNotification toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;