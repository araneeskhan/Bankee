// Utility functions can be added here
// For example:

export const formatCurrency = (amount) => {
  return `$${amount.toFixed(2)}`;
};

export const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date';
  
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Add any other utility functions you need 