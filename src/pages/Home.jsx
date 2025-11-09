import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Convert <span className="text-primary-600">Card Payments</span>
            <br />to <span className="text-purple-600">USDT</span> Instantly
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Secure, fast, and transparent payment processing that converts your USD payments to USDT cryptocurrency automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/payment" className="btn btn-primary text-lg px-8 py-3">
                Make a Payment
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary text-lg px-8 py-3">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Secure & Safe</h3>
            <p className="text-gray-600">
              PCI-compliant payment processing powered by Stripe. Your data is always protected.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Instant Conversion</h3>
            <p className="text-gray-600">
              Your USDT is sent within minutes after payment confirmation. No waiting.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-5xl mb-4">💎</div>
            <h3 className="text-xl font-bold mb-2">Guaranteed Rates</h3>
            <p className="text-gray-600">
              Fixed conversion rates with no hidden fees. What you see is what you get.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Enter Amount', desc: 'Choose how much USD you want to convert', icon: '💵' },
            { step: '2', title: 'Pay with Card', desc: 'Securely pay with Visa or MasterCard', icon: '💳' },
            { step: '3', title: 'Auto Convert', desc: 'We convert your payment to USDT instantly', icon: '🔄' },
            { step: '4', title: 'Receive USDT', desc: 'USDT sent directly to your wallet', icon: '✅' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Transparent Pricing</h2>
        <p className="text-center text-gray-600 mb-12">Higher amounts get better rates</p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {[
            { name: 'Starter', range: '$0 - $100', rate: '0.85', example: '$100 = 85 USDT' },
            { name: 'Basic', range: '$100 - $250', rate: '0.88', example: '$250 = 220 USDT' },
            { name: 'Standard', range: '$250 - $500', rate: '0.90', example: '$450 = 405 USDT', popular: true },
            { name: 'Premium', range: '$500 - $1K', rate: '0.91', example: '$1,000 = 910 USDT' },
            { name: 'VIP', range: '$1,000+', rate: '0.92', example: '$2,000 = 1,840 USDT' },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`card relative ${
                tier.popular ? 'border-2 border-primary-500 shadow-xl' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}
              <div className="text-center">
                <div className="font-bold text-lg mb-2">{tier.name}</div>
                <div className="text-sm text-gray-600 mb-3">{tier.range}</div>
                <div className="text-3xl font-bold text-primary-600 mb-3">{tier.rate}</div>
                <div className="text-xs text-gray-500">{tier.example}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16">
        <div className="card bg-gradient-to-r from-primary-600 to-purple-600 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users converting USD to USDT securely
          </p>
          {isAuthenticated ? (
            <Link to="/payment" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
              Make Your First Payment
            </Link>
          ) : (
            <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
              Create Free Account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
