import { format } from 'date-fns';

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCrypto = (amount, symbol = 'USDT') => {
  return `${amount.toFixed(2)} ${symbol}`;
};

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const formatShortDate = (date) => {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM dd, yyyy');
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    payment_processing: 'bg-blue-100 text-blue-800',
    payment_confirmed: 'bg-green-100 text-green-800',
    converting_to_usdt: 'bg-purple-100 text-purple-800',
    usdt_sent: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusText = (status) => {
  const texts = {
    pending: 'Pending',
    payment_processing: 'Processing Payment',
    payment_confirmed: 'Payment Confirmed',
    converting_to_usdt: 'Converting to USDT',
    usdt_sent: 'USDT Sent',
    completed: 'Completed',
    failed: 'Failed',
  };
  return texts[status] || status;
};

export const truncateAddress = (address, start = 6, end = 4) => {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};
