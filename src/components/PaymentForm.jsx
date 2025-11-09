import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatCrypto } from '../utils/formatters';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Initialize Stripe with public key
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  console.error('Stripe publishable key is missing. Please set VITE_STRIPE_PUBLIC_KEY in your environment variables.');
}

const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const PaymentFormInner = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [usdAmount, setUsdAmount] = useState(450);
  const [walletAddress, setWalletAddress] = useState('');
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Check if Stripe is configured
  if (!stripePublicKey) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-red-50 border-2 border-red-200">
          <h2 className="text-2xl font-bold mb-4 text-red-800">Configuration Error</h2>
          <p className="text-red-700">
            Stripe payment system is not configured. Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  // Fetch conversion rate when amount changes
  useEffect(() => {
    if (usdAmount >= 10 && usdAmount <= 10000) {
      fetchConversionRate();
    }
  }, [usdAmount]);

  const fetchConversionRate = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getConversionRate(usdAmount);
      setConversion(response.data);
    } catch (error) {
      console.error('Failed to fetch conversion rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!walletAddress) {
      toast.error('Please enter your USDT wallet address');
      return;
    }

    setProcessing(true);

    try {
      // Create payment intent
      const response = await paymentAPI.createPaymentIntent({
        usdAmount,
        walletAddress,
        currency: 'USD',
        network: 'TRC20'
      });

      const { clientSecret, transaction } = response.data;

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email: user.email,
            name: user.fullName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful! Converting to USDT...');
        navigate(`/transaction/${transaction._id}`);
      }
    } catch (error) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Pay with Card, Receive USDT</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              min="10"
              max="10000"
              step="0.01"
              value={usdAmount}
              onChange={(e) => setUsdAmount(parseFloat(e.target.value) || 0)}
              className="input"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Min: $10 | Max: $10,000
            </p>
          </div>

          {/* Conversion Preview */}
          {conversion && !loading && (
            <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-6 border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600">You Pay</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(usdAmount)}
                  </div>
                </div>
                <div className="text-4xl text-primary-600">→</div>
                <div>
                  <div className="text-sm text-gray-600">You Receive</div>
                  <div className="text-3xl font-bold text-primary-600">
                    {formatCrypto(conversion.usdtAmount)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t border-primary-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Exchange Rate:</span>
                  <span className="font-medium">1 USD = {conversion.exchangeRate} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee ({conversion.feePercentage}%):</span>
                  <span className="font-medium">{formatCurrency(conversion.conversionFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tier:</span>
                  <span className="font-medium text-primary-600">{conversion.tierName}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-2 text-green-700 bg-green-50 rounded px-3 py-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Guaranteed Minimum Amount</span>
              </div>
            </div>
          )}

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              USDT Wallet Address (TRC20)
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="TXYZxG5FdhZ5CdKWPSqZvC..."
              className="input font-mono text-sm"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter your TRC20 (Tron) USDT wallet address
            </p>
          </div>

          {/* Card Element */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!stripe || processing || loading || !conversion}
            className="w-full btn btn-primary text-lg py-3"
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay ${formatCurrency(usdAmount)} & Receive ${conversion ? formatCrypto(conversion.usdtAmount) : '...'}`
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Secure payment powered by Stripe. Your USDT will be sent within minutes.
          </p>
        </form>
      </div>
    </div>
  );
};

const PaymentForm = () => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner />
    </Elements>
  );
};

export default PaymentForm;
