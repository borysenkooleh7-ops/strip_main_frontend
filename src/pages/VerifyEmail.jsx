import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Auto-verify if code and email are in URL
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const urlCode = searchParams.get('code');

    if (urlEmail && urlCode) {
      handleVerify(urlEmail, urlCode);
    }
  }, []);

  const handleVerify = async (emailParam, codeParam) => {
    const verifyEmail = emailParam || email;
    const verifyCode = codeParam || code;

    if (!verifyEmail || !verifyCode) {
      toast.error('Please enter both email and verification code');
      return;
    }

    setLoading(true);

    try {
      console.log('📧 Verifying email:', verifyEmail);
      const response = await authAPI.verifyEmail({
        email: verifyEmail,
        code: verifyCode
      });

      if (response.success) {
        console.log('✅ Email verified successfully');
        toast.success('Email verified successfully!');

        // Auto-login with the returned token and user
        if (response.data.token && response.data.user) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));

          // Use the auth context to update state
          await authLogin({ email: verifyEmail, password: '' }, true, response.data);

          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        console.error('❌ Verification failed:', response.message);
        toast.error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('❌ Verification error:', error);

      let errorMessage = error.message || 'Invalid or expired verification code';

      // Provide helpful error messages
      if (error.isTimeout) {
        errorMessage = 'Server is taking too long. Please wait and try again.';
      } else if (error.isNetworkError) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify();
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setResendLoading(true);

    try {
      console.log('📤 Resending verification code to:', email);
      const response = await authAPI.resendVerification({ email });

      if (response.success) {
        console.log('✅ Verification code resent successfully');
        toast.success('Verification code sent! Please check your email (and spam folder).');
      } else {
        console.error('❌ Failed to resend code:', response.message);
        toast.error(response.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('❌ Resend error:', error);

      let errorMessage = error.message || 'Failed to resend verification code';

      // Provide helpful error messages
      if (errorMessage.includes('Email service')) {
        errorMessage = 'Email service is not configured on the server. Please contact support.';
      } else if (error.isTimeout) {
        errorMessage = 'Server is waking up. Please wait 30 seconds and try again.';
      } else if (error.isNetworkError) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="text-gray-600 mt-2">
              Enter the 6-digit code we sent to your email
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="input text-center text-2xl font-mono tracking-widest"
                maxLength="6"
                pattern="[0-9]{6}"
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-primary-600 hover:text-primary-700 font-medium underline"
              >
                {resendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </p>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already verified?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Check your spam folder</strong> if you don't see the email in your inbox.
              The code expires in 15 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
