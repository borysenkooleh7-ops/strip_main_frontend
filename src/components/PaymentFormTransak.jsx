import React, { useState, useEffect } from 'react';
import transakSDK from '@transak/transak-sdk';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatCrypto } from '../utils/formatters';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

/**
 * Transak Payment Form
 *
 * This component uses Transak On-Ramp to allow users to buy USDT directly with their credit card.
 *
 * Business Model Change:
 * - OLD: User pays → You take 10% fee → Send USDT via Binance
 * - NEW: User buys USDT directly → Transak takes 3-5% fee → You earn 1-2% commission
 *
 * User Flow:
 * 1. User enters USD amount and wallet address
 * 2. Clicks "Buy USDT"
 * 3. Transak widget opens (embedded iframe)
 * 4. User completes KYC and payment in widget
 * 5. Transak sends USDT directly to user's wallet
 * 6. Your backend receives webhook notification
 * 7. You earn commission from Transak
 */

// Get Transak API key from environment
const transakApiKey = import.meta.env.VITE_TRANSAK_API_KEY;
const transakEnvironment = import.meta.env.VITE_TRANSAK_ENVIRONMENT || 'STAGING'; // STAGING or PRODUCTION

const PaymentFormTransak = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [usdAmount, setUsdAmount] = useState(100);
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('tron'); // TRC20
  const [estimatedUSDT, setEstimatedUSDT] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transakInstance, setTransakInstance] = useState(null);

  // Check if Transak is configured
  if (!transakApiKey) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-red-50 border-2 border-red-200">
          <h2 className="text-2xl font-bold mb-4 text-red-800">Configuration Error</h2>
          <p className="text-red-700">
            Transak payment system is not configured. Please contact the administrator.
          </p>
          <p className="text-sm text-red-600 mt-2">
            Missing: VITE_TRANSAK_API_KEY environment variable
          </p>
        </div>
      </div>
    );
  }

  // Calculate estimated USDT (rough estimate - actual amount determined by Transak)
  useEffect(() => {
    if (usdAmount >= 30 && usdAmount <= 10000) {
      calculateEstimate();
    }
  }, [usdAmount]);

  const calculateEstimate = () => {
    // Transak charges 3-5% fee, USDT is roughly 1:1 with USD
    // This is just an estimate - actual amount may vary
    const transakFeePercent = 0.04; // 4% average
    const afterFees = usdAmount * (1 - transakFeePercent);
    const estimatedUsdt = afterFees * 0.9995; // USDT market rate (~$1.00)

    setEstimatedUSDT(estimatedUsdt);
  };

  const handleBuyUSDT = async () => {
    if (!walletAddress) {
      toast.error('Please enter your USDT wallet address');
      return;
    }

    // Validate wallet address format
    if (network === 'tron' && !walletAddress.startsWith('T')) {
      toast.error('Invalid TRC20 address. Must start with T');
      return;
    }

    if ((network === 'ethereum' || network === 'polygon') && !walletAddress.startsWith('0x')) {
      toast.error('Invalid ERC20/Polygon address. Must start with 0x');
      return;
    }

    setLoading(true);

    try {
      // Create transaction record in your database
      const transactionData = {
        provider: 'transak',
        usdAmount: usdAmount,
        walletAddress: walletAddress,
        network: network,
        userId: user._id,
        status: 'initiated'
      };

      const response = await paymentAPI.createTransakOrder(transactionData);
      const { orderId } = response.data;

      // Initialize Transak widget
      const transak = new transakSDK({
        apiKey: transakApiKey,
        environment: transakEnvironment,

        // Pre-fill user information
        defaultCryptoCurrency: 'USDT',
        defaultFiatAmount: usdAmount,
        fiatCurrency: 'USD',

        // User's wallet
        walletAddress: walletAddress,

        // Network selection
        networks: network, // 'tron', 'ethereum', 'polygon', etc.

        // Customization
        themeColor: '6366f1', // Primary color (indigo-600)
        hostURL: window.location.origin,
        widgetHeight: '700px',
        widgetWidth: '100%',

        // Your partner order ID (for tracking)
        partnerOrderId: orderId,

        // User data (optional - helps with KYC)
        email: user.email,

        // Hide certain options
        hideMenu: true,
        disableWalletAddressForm: true, // Lock wallet address
      });

      // Event listeners
      transak.on(transakSDK.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
        console.log('✅ Transak widget initialized');
      });

      transak.on(transakSDK.EVENTS.TRANSAK_WIDGET_OPEN, () => {
        console.log('✅ Transak widget opened');
        toast.info('Complete your purchase in the Transak window');
      });

      transak.on(transakSDK.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
        console.log('❌ Transak widget closed');
        setLoading(false);
        setTransakInstance(null);
      });

      transak.on(transakSDK.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
        console.log('✅ Order successful:', orderData);
        toast.success('USDT purchase successful! Check your wallet in a few minutes.');

        // Update transaction status
        paymentAPI.updateTransakOrderStatus(orderId, {
          status: 'completed',
          transakOrderId: orderData.status.id,
          transakData: orderData
        });

        // Navigate to transaction details
        navigate(`/transaction/${orderId}`);
        setLoading(false);
      });

      transak.on(transakSDK.EVENTS.TRANSAK_ORDER_FAILED, (orderData) => {
        console.error('❌ Order failed:', orderData);
        toast.error('Purchase failed. Please try again.');

        // Update transaction status
        paymentAPI.updateTransakOrderStatus(orderId, {
          status: 'failed',
          transakOrderId: orderData.status.id,
          error: orderData.status.statusMessage || 'Order failed'
        });

        setLoading(false);
      });

      transak.on(transakSDK.EVENTS.TRANSAK_ORDER_CANCELLED, (orderData) => {
        console.log('❌ Order cancelled:', orderData);
        toast.warning('Purchase cancelled');

        // Update transaction status
        paymentAPI.updateTransakOrderStatus(orderId, {
          status: 'cancelled',
          transakOrderId: orderData.status?.id
        });

        setLoading(false);
      });

      // Initialize the widget
      setTransakInstance(transak);
      transak.init();

    } catch (error) {
      console.error('❌ Error initializing Transak:', error);
      toast.error(error.message || 'Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transakInstance) {
        transakInstance.close();
      }
    };
  }, [transakInstance]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Buy USDT with Card</h2>
          <p className="text-gray-600">
            Purchase USDT directly with your credit/debit card. USDT will be sent to your wallet automatically.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How it works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Enter amount and your USDT wallet address</li>
                <li>• Complete payment in secure Transak window</li>
                <li>• USDT arrives in your wallet within minutes</li>
                <li>• Fees: 3-5% included in purchase price</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              min="30"
              max="10000"
              step="1"
              value={usdAmount}
              onChange={(e) => setUsdAmount(parseFloat(e.target.value) || 0)}
              className="input text-lg"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Min: $30 | Max: $10,000
            </p>
          </div>

          {/* Estimated USDT Preview */}
          {estimatedUSDT && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">You Pay</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(usdAmount)}
                  </div>
                </div>
                <div className="text-4xl text-blue-600">→</div>
                <div>
                  <div className="text-sm text-gray-600">You Receive (Est.)</div>
                  <div className="text-3xl font-bold text-blue-600">
                    ~{formatCrypto(estimatedUSDT)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200 text-sm text-gray-600">
                <p>
                  <strong>Note:</strong> Actual amount may vary based on Transak's exchange rate and fees (3-5%).
                  Final amount will be shown in the payment window.
                </p>
              </div>
            </div>
          )}

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="input"
            >
              <option value="tron">TRC20 (Tron) - Recommended</option>
              <option value="ethereum">ERC20 (Ethereum)</option>
              <option value="polygon">Polygon</option>
              <option value="bsc">BEP20 (Binance Smart Chain)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {network === 'tron' && 'TRC20 has the lowest fees (~$1)'}
              {network === 'ethereum' && 'ERC20 fees can be high ($10-50)'}
              {network === 'polygon' && 'Polygon has low fees (~$0.50)'}
              {network === 'bsc' && 'BEP20 has low fees (~$0.50)'}
            </p>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              USDT Wallet Address ({network === 'tron' ? 'TRC20' : network === 'ethereum' ? 'ERC20' : network === 'polygon' ? 'Polygon' : 'BEP20'})
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={network === 'tron' ? 'TXYZxG5FdhZ5CdKWPSqZvC...' : '0x1234567890abcdef...'}
              className="input font-mono text-sm"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {network === 'tron' && 'Address must start with T (34 characters)'}
              {(network === 'ethereum' || network === 'polygon' || network === 'bsc') && 'Address must start with 0x (42 characters)'}
            </p>
          </div>

          {/* Buy Button */}
          <button
            onClick={handleBuyUSDT}
            disabled={loading || !estimatedUSDT || usdAmount < 30}
            className="w-full btn btn-primary text-lg py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Opening Payment Window...
              </span>
            ) : (
              `Buy ${estimatedUSDT ? formatCrypto(estimatedUSDT) : '...'} for ${formatCurrency(usdAmount)}`
            )}
          </button>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Secure payment powered by Transak. KYC verification required for first purchase.
            </p>
            <p className="text-xs text-gray-400">
              {transakEnvironment === 'STAGING' && '⚠️ TEST MODE - No real money will be charged'}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Important Information</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-green-600">✓</span>
              <span>USDT sent directly to your wallet (not held by us)</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600">✓</span>
              <span>Transaction typically completes in 5-30 minutes</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600">✓</span>
              <span>Supported payment methods: Credit/Debit cards, Apple Pay, Google Pay</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">ℹ</span>
              <span>First-time users will need to complete KYC verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFormTransak;
