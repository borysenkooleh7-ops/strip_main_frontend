import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionAPI } from '../services/api';
import { formatCurrency, formatCrypto, formatDate, getStatusColor, getStatusText } from '../utils/formatters';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [statistics, setStatistics] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await transactionAPI.getStatistics();
      setStatistics(response.data.statistics);
      setRecentTransactions(response.data.recentTransactions);
    } catch (error) {
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="text-sm opacity-90">Total Transactions</div>
          <div className="text-3xl font-bold mt-2">{statistics?.totalTransactions || 0}</div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="text-sm opacity-90">Total USD Spent</div>
          <div className="text-3xl font-bold mt-2">{formatCurrency(statistics?.totalUSD || 0)}</div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="text-sm opacity-90">Total USDT Received</div>
          <div className="text-3xl font-bold mt-2">{formatCrypto(statistics?.totalUSDT || 0)}</div>
        </div>

        <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="text-sm opacity-90">Success Rate</div>
          <div className="text-3xl font-bold mt-2">
            {statistics?.totalTransactions > 0
              ? Math.round((statistics.completedCount / statistics.totalTransactions) * 100)
              : 0}%
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/payment"
            className="flex items-center space-x-3 p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
          >
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center text-white text-2xl">
              💳
            </div>
            <div>
              <div className="font-semibold text-gray-900">New Payment</div>
              <div className="text-sm text-gray-600">Convert USD to USDT</div>
            </div>
          </Link>

          <Link
            to="/transactions"
            className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl">
              📊
            </div>
            <div>
              <div className="font-semibold text-gray-900">View Transactions</div>
              <div className="text-sm text-gray-600">See all history</div>
            </div>
          </Link>

          <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-2xl">
              📈
            </div>
            <div>
              <div className="font-semibold text-gray-900">Current Rate</div>
              <div className="text-sm text-gray-600">1 USD = 0.90 USDT</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Recent Transactions</h2>
          <Link to="/transactions" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💸</div>
            <p className="text-gray-600 mb-4">No transactions yet</p>
            <Link to="/payment" className="btn btn-primary">
              Make Your First Payment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount USD</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">USDT Received</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatDate(transaction.initiatedAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amountUSD)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-primary-600">
                      {formatCrypto(transaction.usdtAmount)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/transaction/${transaction._id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pricing Tiers */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6">Pricing Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { name: 'Starter', range: '$0 - $100', rate: '0.85', example: '$100 → 85 USDT' },
            { name: 'Basic', range: '$100 - $250', rate: '0.88', example: '$250 → 220 USDT' },
            { name: 'Standard', range: '$250 - $500', rate: '0.90', example: '$450 → 405 USDT', highlight: true },
            { name: 'Premium', range: '$500 - $1,000', rate: '0.91', example: '$1,000 → 910 USDT' },
            { name: 'VIP', range: '$1,000+', rate: '0.92', example: '$2,000 → 1,840 USDT' },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`p-4 rounded-lg border-2 ${
                tier.highlight
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className={`font-bold ${tier.highlight ? 'text-primary-600' : 'text-gray-900'}`}>
                {tier.name}
              </div>
              <div className="text-sm text-gray-600 mt-1">{tier.range}</div>
              <div className="text-lg font-bold mt-2">{tier.rate}</div>
              <div className="text-xs text-gray-500 mt-2">{tier.example}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
