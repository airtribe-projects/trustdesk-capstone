// Date and time formatting helpers
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null) return '$0.00';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(num);
};

// Priority badge classes
export const getPriorityBadgeClass = (priority) => {
  const p = (priority || '').toLowerCase();
  switch (p) {
    case 'urgent':
    case 'high':
      return 'badge-danger';
    case 'medium':
      return 'badge-warning';
    case 'low':
      return 'badge-info';
    default:
      return 'badge-secondary';
  }
};

// Status badge classes
export const getStatusBadgeClass = (status) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'new':
    case 'open':
    case 'pending approval':
      return 'badge-warning';
    case 'in progress':
    case 'approved':
      return 'badge-primary';
    case 'resolved':
    case 'closed':
    case 'completed':
      return 'badge-success';
    case 'rejected':
    case 'failed':
      return 'badge-danger';
    default:
      return 'badge-neutral';
  }
};

// Tier badge classes
export const getTierBadgeClass = (tier) => {
  const t = (tier || '').toLowerCase();
  switch (t) {
    case 'vip':
    case 'platinum':
    case 'gold':
      return 'badge-gold';
    case 'silver':
      return 'badge-silver';
    default:
      return 'badge-tier';
  }
};

// Tool name human format
export const formatToolName = (toolName) => {
  if (!toolName) return 'Custom Action';
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
