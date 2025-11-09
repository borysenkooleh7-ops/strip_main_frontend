import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { transactionAPI } from '../services/api';
import websocketService from '../services/websocket';
import { formatCurrency, formatCrypto, formatDate, truncateAddress, copyToClipboard } from '../utils/formatters';
import { toast } from 'react-toastify';

const TransactionStatus = () => {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransaction();

    // Listen for real-time updates
    websocketService.on('transaction_update', handleTransactionUpdate);

    return () => {
      websocketService.off('transaction_update', handleTransactionUpdate);
    };
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const response = await transactionAPI.getTransaction(id);
      setTransaction(response.data.transaction);
    } catch (error) {
      toast.error('Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionUpdate = (data) => {
    if (data.transactionId === id) {
      fetchTransaction();
    }
  };

  const getStepStatus = (step) => {
    if (!transaction) return 'pending';

    const statusOrder = [
      'pending',
      'payment_processing',
      'payment_confirmed',
      'converting_to_usdt',
      'usdt_sent',
      'completed'
    ];

    const currentIndex = statusOrder.indexOf(transaction.status);
    const stepIndex = statusOrder.indexOf(step);

    if (transaction.status === 'failed') {
      return currentIndex >= stepIndex ? 'failed' : 'pending';
    }

    if (currentIndex >= stepIndex) {
      return 'completed';
    } else if (currentIndex + 1 === stepIndex) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  const steps = [
    { key: 'payment_processing', label: 'Payment Processing', icon: '💳' },
    { key: 'payment_confirmed', label: 'Payment Confirmed', icon: '✅' },
    { key: 'converting_to_usdt', label: 'Converting to USDT', icon: '🔄' },
    { key: 'usdt_sent', label: 'USDT Sent', icon: '🚀' },
    { key: 'completed', label: 'Completed', icon: '🎉' },
  ];

  const handleCopyAddress = async (address) => {
    const success = await copyToClipboard(address);
    if (success) {
      toast.success('Address copied to clipboard');
    }
  };

  const handleCopyTxHash = async (hash) => {
    const success = await copyToClipboard(hash);
    if (success) {
      toast.success('Transaction hash copied');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Transaction not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Transaction Status</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
            transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {transaction.status === 'completed' ? '✅ Completed' :
             transaction.status === 'failed' ? '❌ Failed' :
             '⏳ Processing'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Transaction ID:</span>
            <p className="font-mono text-xs mt-1">{transaction._id}</p>
          </div>
          <div>
            <span className="text-gray-600">Date:</span>
            <p className="font-medium mt-1">{formatDate(transaction.initiatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-6">Progress</h3>

        <div className="relative">
          {steps.map((step, index) => {
            const status = getStepStatus(step.key);

            return (
              <div key={step.key} className="flex items-start mb-8 last:mb-0">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={`absolute left-6 top-12 w-0.5 h-16 ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'active' ? 'bg-primary-500' :
                    'bg-gray-300'
                  }`} style={{ marginTop: '0.5rem' }}></div>
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                  status === 'completed' ? 'bg-green-100 ring-4 ring-green-500' :
                  status === 'active' ? 'bg-primary-100 ring-4 ring-primary-500 animate-pulse' :
                  status === 'failed' ? 'bg-red-100 ring-4 ring-red-500' :
                  'bg-gray-100'
                }`}>
                  {status === 'completed' ? '✓' :
                   status === 'failed' ? '✗' :
                   step.icon}
                </div>

                {/* Content */}
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">{step.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {status === 'completed' ? 'Completed' :
                     status === 'active' ? 'In progress...' :
                     status === 'failed' ? 'Failed' :
                     'Waiting...'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Amount Paid</span>
            <span className="font-bold text-lg">{formatCurrency(transaction.amountUSD)}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">USDT Received</span>
            <span className="font-bold text-lg text-primary-600">{formatCrypto(transaction.usdtAmount)}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Exchange Rate</span>
            <span className="font-medium">1 USD = {transaction.exchangeRate} USDT</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Service Fee</span>
            <span className="font-medium">{formatCurrency(transaction.conversionFee)} ({transaction.feePercentage}%)</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Network</span>
            <span className="font-medium">{transaction.blockchainNetwork}</span>
          </div>

          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Wallet Address</span>
            <button
              onClick={() => handleCopyAddress(transaction.walletAddress)}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
            >
              <span className="font-mono text-sm">{truncateAddress(transaction.walletAddress)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {transaction.transactionHash && (
            <div className="py-3 bg-green-50 rounded-lg px-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Transaction Hash</span>
                <button
                  onClick={() => handleCopyTxHash(transaction.transactionHash)}
                  className="flex items-center space-x-2 text-green-700 hover:text-green-800"
                >
                  <span className="font-mono text-xs">{truncateAddress(transaction.transactionHash, 10, 10)}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <a
                href={`https://tronscan.org/#/transaction/${transaction.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline mt-2 inline-block"
              >
                View on Blockchain Explorer →
              </a>
            </div>
          )}

          {transaction.errorMessage && (
            <div className="py-3 bg-red-50 rounded-lg px-4">
              <span className="text-red-800 font-medium">Error: {transaction.errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionStatus;
