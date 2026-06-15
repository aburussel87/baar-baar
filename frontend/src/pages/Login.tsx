import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { generateKeyPair } from '../utils/crypto';
import VerifyOtpForm from '../components/VerifyOtpForm';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [tempPrivateKey, setTempPrivateKey] = useState<string | null>(null);
  const [tempPublicKey, setTempPublicKey] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const keys = await generateKeyPair();
      setTempPrivateKey(keys.privateKey);
      setTempPublicKey(keys.publicKey);

      const response = await api.post('/api/auth/login', { 
        email, 
        password,
        publicKey: keys.publicKey 
      });
      
      if (response.data.success) {
        login({ ...response.data.data, privateKey: keys.privateKey });
        navigate('/chat');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'UNVERIFIED') {
        setShowOtp(true);
        setError('');
      } else {
        setError(err.response?.data?.message || 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = (userData: Record<string, unknown>) => {
    login({ ...userData, privateKey: tempPrivateKey } as Parameters<typeof login>[0]);
    navigate('/chat');
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError('');
      const keys = await generateKeyPair();
      const res = await api.post('/api/auth/google', {
        token: credentialResponse.credential,
        publicKey: keys.publicKey
      });
      if (res.data.success) {
        login({ ...res.data.data, privateKey: keys.privateKey });
        navigate('/chat');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-white px-4 py-12">
      <div className="max-w-md w-full glass p-8 rounded-2xl shadow-xl">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {showOtp ? 'Verify your email' : 'Welcome back'}
        </h2>
        <p className="text-center text-gray-500 mb-8">
          {showOtp
            ? 'Your account needs email verification before you can sign in'
            : 'Sign in to your account to continue'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100">
            {error}
          </div>
        )}

        {showOtp ? (
          <VerifyOtpForm
            email={email}
            publicKey={tempPublicKey || undefined}
            onVerified={handleVerified}
            onBack={() => setShowOtp(false)}
            submitLabel="Verify & Sign In"
            sendOnMount
          />
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 transition-all outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
                theme="outline"
                size="large"
              />
            </div> */}
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
