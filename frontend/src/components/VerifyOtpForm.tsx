import React, { useState, useEffect, useCallback } from 'react';
import { Key, Loader2 } from 'lucide-react';
import api from '../api/axios';

interface VerifyOtpFormProps {
  email: string;
  publicKey?: string;
  onVerified: (userData: Record<string, unknown>) => void;
  onBack?: () => void;
  submitLabel?: string;
  sendOnMount?: boolean;
}

const VerifyOtpForm = ({
  email,
  publicKey,
  onVerified,
  onBack,
  submitLabel = 'Verify & Continue',
  sendOnMount = false,
}: VerifyOtpFormProps) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/verify-otp', {
        email,
        code: otp,
        ...(publicKey ? { publicKey } : {}),
      });

      if (response.data.success) {
        onVerified(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    setError('');
    setInfo('');
    setResending(true);

    try {
      const response = await api.post('/api/auth/resend-otp', { email });
      if (response.data.success) {
        setInfo(response.data.message);
        setOtp('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  }, [email]);

  useEffect(() => {
    if (sendOnMount) {
      handleResend();
    }
  }, [sendOnMount, handleResend]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-600 text-center">
        We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      {info && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm border border-green-100">
          {info}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Enter Verification Code</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Key className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 transition-all outline-none text-center tracking-widest text-lg font-mono"
            placeholder="123456"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : submitLabel}
      </button>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
        >
          {resending ? 'Sending...' : "Didn't receive a code? Resend"}
        </button>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back
          </button>
        )}
      </div>
    </form>
  );
};

export default VerifyOtpForm;
