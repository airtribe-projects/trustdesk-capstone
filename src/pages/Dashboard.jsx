import React, { useState, useEffect } from 'react';
import TicketList from '../components/TicketList';
import CustomerCard from '../components/CustomerCard';
import OrderCard from '../components/OrderCard';
import TriageCard from '../components/TriageCard';
import ReplyCard from '../components/ReplyCard';
import ToolActionCard from '../components/ToolActionCard';
import EvaluationCard from '../components/EvaluationCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  fetchTickets,
  fetchTicketContext,
  runTriage,
  generateReply,
  approveReply,
  rejectReply,
  getReply,
  requestToolAction,
  approveToolAction,
  executeToolAction,
  runEvaluation
} from '../api/api';
import { MessageSquare, Calendar, Globe, AlertCircle } from 'lucide-react';

const Dashboard = ({ addToast }) => {
  // Main state
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketContext, setTicketContext] = useState(null);

  // Workflow cards state
  const [triageData, setTriageData] = useState(null);
  const [replyData, setReplyData] = useState(null);
  const [toolExecution, setToolExecution] = useState(null);
  const [evalData, setEvalData] = useState(null);

  // Loading states
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isApprovingReply, setIsApprovingReply] = useState(false);
  const [isRejectingReply, setIsRejectingReply] = useState(false);
  const [isRequestingTool, setIsRequestingTool] = useState(false);
  const [isApprovingTool, setIsApprovingTool] = useState(false);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [isEvalLoading, setIsEvalLoading] = useState(false);

  // Load initial tickets list
  const loadTickets = async () => {
    setIsTicketsLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
      if (data && data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].ticket_id);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to load tickets',
        message: err.message
      });
    } finally {
      setIsTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // When selected ticket changes, fetch context and existing workflow data
  useEffect(() => {
    if (!selectedTicketId) return;

    const loadContextAndState = async () => {
      setIsContextLoading(true);
      // Reset card states for new ticket
      setTriageData(null);
      setReplyData(null);
      setToolExecution(null);

      try {
        const context = await fetchTicketContext(selectedTicketId);
        setTicketContext(context);

        // Check if reply already exists for this ticket
        try {
          const existingReply = await getReply(selectedTicketId);
          if (existingReply) setReplyData(existingReply);
        } catch (e) {
          // ignore
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to load ticket context',
          message: err.message
        });
      } finally {
        setIsContextLoading(false);
      }
    };

    loadContextAndState();
  }, [selectedTicketId]);

  // CARD 1: RUN AI TRIAGE
  const handleRunTriage = async (ticketId) => {
    if (!ticketId) return;
    setIsTriageLoading(true);
    try {
      const res = await runTriage(ticketId);
      setTriageData(res);
      addToast({
        type: 'success',
        title: 'AI Triage Completed',
        message: `Category: ${res.category} | Priority: ${res.priority}`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Triage Failed',
        message: err.message
      });
    } finally {
      setIsTriageLoading(false);
    }
  };

  // CARD 2: GENERATE DRAFT REPLY
  const handleGenerateReply = async (ticketId) => {
    if (!ticketId) return;
    setIsGeneratingReply(true);
    try {
      const res = await generateReply(ticketId);
      setReplyData(res);
      addToast({
        type: 'success',
        title: 'Draft Reply Generated',
        message: 'Grounded response generated using company knowledge base.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Reply Generation Failed',
        message: err.message
      });
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleApproveReply = async (ticketId) => {
    setIsApprovingReply(true);
    try {
      const res = await approveReply(ticketId, 'Sarah Jenkins (Lead Agent)');
      if (res.draft) setReplyData(res.draft);
      else setReplyData(prev => prev ? { ...prev, status: 'Approved', approved: true, approved_by: 'Sarah Jenkins (Lead Agent)' } : null);

      addToast({
        type: 'success',
        title: 'Reply Approved',
        message: 'Support draft response approved for delivery.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message
      });
    } finally {
      setIsApprovingReply(false);
    }
  };

  const handleRejectReply = async (ticketId, comment) => {
    setIsRejectingReply(true);
    try {
      const res = await rejectReply(ticketId, comment);
      if (res.draft) setReplyData(res.draft);
      else setReplyData(prev => prev ? { ...prev, status: 'Rejected', approved: false, review_comment: comment } : null);

      addToast({
        type: 'info',
        title: 'Reply Rejected',
        message: `Feedback recorded: ${comment}`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message
      });
    } finally {
      setIsRejectingReply(false);
    }
  };

  // CARD 3: TOOL ACTIONS
  const handleRequestTool = async (ticketId, toolName, clearOnly = false) => {
    if (clearOnly) {
      setToolExecution(null);
      return;
    }
    if (!ticketId || !toolName) return;
    setIsRequestingTool(true);
    try {
      const res = await requestToolAction(ticketId, toolName);
      setToolExecution(res);
      addToast({
        type: 'info',
        title: 'Tool Action Requested',
        message: `Tool: ${toolName} requested. Status: Pending Approval.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Tool Request Failed',
        message: err.message
      });
    } finally {
      setIsRequestingTool(false);
    }
  };

  const handleApproveTool = async (executionId) => {
    setIsApprovingTool(true);
    try {
      const res = await approveToolAction(executionId, 'Sarah Jenkins');
      if (res.tool_action) setToolExecution(res.tool_action);
      else setToolExecution(prev => prev ? { ...prev, status: 'Approved', approved_by: 'Sarah Jenkins' } : null);

      addToast({
        type: 'success',
        title: 'Tool Approved',
        message: 'Action authorized. Ready for system execution.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Tool Approval Failed',
        message: err.message
      });
    } finally {
      setIsApprovingTool(false);
    }
  };

  const handleExecuteTool = async (executionId) => {
    setIsExecutingTool(true);
    try {
      const res = await executeToolAction(executionId);
      if (res.tool_action) setToolExecution(res.tool_action);
      else setToolExecution(prev => prev ? { ...prev, status: 'Completed', execution_result: res.message || 'Executed successfully.' } : null);

      addToast({
        type: 'success',
        title: 'Tool Executed',
        message: res.message || 'System tool action executed successfully.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Tool Execution Failed',
        message: err.message
      });
    } finally {
      setIsExecutingTool(false);
    }
  };

  // CARD 4: RUN EVALUATION
  const handleRunEvaluation = async () => {
    setIsEvalLoading(true);
    try {
      const res = await runEvaluation();
      setEvalData(res);
      addToast({
        type: 'success',
        title: 'Evaluation Finished',
        message: `Accuracy: ${res.accuracy}% (${res.passed}/${res.total_cases} passed)`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Evaluation Failed',
        message: err.message
      });
    } finally {
      setIsEvalLoading(false);
    }
  };

  const currentTicket = ticketContext?.ticket;
  const currentCustomer = ticketContext?.customer;
  const currentOrder = ticketContext?.order;

  return (
    <div className="dashboard-grid">
      {/* LEFT PANEL - TICKET LIST */}
      <TicketList
        tickets={tickets}
        selectedTicketId={selectedTicketId}
        onSelectTicket={setSelectedTicketId}
        isLoading={isTicketsLoading}
        onRefresh={loadTickets}
      />

      {/* CENTER PANEL - TICKET & CUSTOMER/ORDER CONTEXT */}
      <div className="center-panel">
        {isContextLoading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <LoadingSpinner size="28px" message="Fetching ticket details and context..." />
          </div>
        ) : !currentTicket ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
            <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>Select a ticket from the left panel to inspect context.</p>
          </div>
        ) : (
          <>
            {/* Ticket Subject & Message Details */}
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1.15rem' }}>
                  <MessageSquare className="card-title-icon" size={20} />
                  <span>{currentTicket.subject}</span>
                </div>
                <span className={`badge ${getStatusBadgeClass(currentTicket.status)}`}>
                  {currentTicket.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>
                <div>
                  Ticket ID: <strong style={{ color: 'var(--primary-700)', fontFamily: 'var(--font-mono)' }}>{currentTicket.ticket_id}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Globe size={12} />
                  <span>Channel: {currentTicket.channel}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={12} />
                  <span>Submitted: {formatDate(currentTicket.created_at)}</span>
                </div>
              </div>

              <div className="data-field" style={{ marginBottom: '0.5rem' }}>
                <span className="data-label">Customer Inquiry Body</span>
                <div className="ticket-body-box">
                  {currentTicket.body}
                </div>
              </div>
            </div>

            {/* Customer Information Card */}
            <CustomerCard customer={currentCustomer} />

            {/* Order Information Card */}
            <OrderCard order={currentOrder} />
          </>
        )}
      </div>

      {/* RIGHT PANEL - 4 AI WORKFLOW CARDS */}
      <div className="right-panel">
        {/* CARD 1: AI TRIAGE */}
        <TriageCard
          triageData={triageData}
          onRunTriage={handleRunTriage}
          isLoading={isTriageLoading}
          ticketId={selectedTicketId}
        />

        {/* CARD 2: AI DRAFT REPLY */}
        <ReplyCard
          replyData={replyData}
          onGenerateReply={handleGenerateReply}
          onApproveReply={handleApproveReply}
          onRejectReply={handleRejectReply}
          isGenerating={isGeneratingReply}
          isApproving={isApprovingReply}
          isRejecting={isRejectingReply}
          ticketId={selectedTicketId}
          hasTriage={!!triageData}
        />

        {/* CARD 3: TOOL ACTIONS */}
        <ToolActionCard
          toolExecution={toolExecution}
          onRequestTool={handleRequestTool}
          onApproveTool={handleApproveTool}
          onExecuteTool={handleExecuteTool}
          isRequesting={isRequestingTool}
          isApproving={isApprovingTool}
          isExecuting={isExecutingTool}
          ticketId={selectedTicketId}
        />

        {/* CARD 4: EVALUATION */}
        <EvaluationCard
          evalData={evalData}
          onRunEvaluation={handleRunEvaluation}
          isLoading={isEvalLoading}
          compact={true}
        />
      </div>
    </div>
  );
};

export default Dashboard;
