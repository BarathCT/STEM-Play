import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { API_BASE } from '@/utils/auth';

export default function ForgotPasswordDialog({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [resendSec, setResendSec] = useState(0); // 30s countdown after send

  useEffect(() => {
    let timer;
    if (step === 2 && resendSec > 0) {
      timer = setInterval(() => setResendSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendSec]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentifier('');
      setOtpDigits(['', '', '', '', '', '']);
      setPwd('');
      setPwd2('');
      setErr('');
      setInfo('');
      setResendSec(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const otp = otpDigits.join('');

  async function post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
  }

  async function requestCode(e) {
    e?.preventDefault?.();
    setErr('');
    setInfo('');
    setSubmitting(true);
    try {
      await post('/auth/forgot', { identifier });
      setInfo('If an account exists, a code has been sent. The code expires in 5 minutes.');
      setStep(2);
      setResendSec(30); // throttle UI
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(e) {
    e?.preventDefault?.();
    setErr('');
    setSubmitting(true);
    try {
      await post('/auth/verify-otp', { identifier, otp });
      setStep(3);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(e) {
    e?.preventDefault?.();
    setErr('');
    if (pwd !== pwd2) {
      setErr('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await post('/auth/reset', { identifier, otp, newPassword: pwd });
      setInfo('Password updated. You can sign in now.');
      onSuccess?.();
      onClose?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeOnBackdrop(e) {
    e.stopPropagation();
    onClose?.();
  }

  function stop(e) {
    e.stopPropagation();
  }

  function handleOtpChange(i, val) {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otpDigits];
    next[i] = v;
    setOtpDigits(next);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (otpDigits[i]) {
        // clear current
        const next = [...otpDigits];
        next[i] = '';
        setOtpDigits(next);
        return;
      }
      if (i > 0) inputsRef.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputsRef.current[i + 1]?.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeOnBackdrop}>
      <div className="absolute inset-0 bg-transparent backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150" />
      <div
        className="relative bg-white rounded-lg w-full max-w-sm mx-4 shadow-2xl border p-4"
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fp-title"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 id="fp-title" className="text-lg font-semibold">Reset password</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 && (
          <form onSubmit={requestCode} className="grid gap-2">
            <label className="text-sm text-gray-700">Email or Parent email</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="you@example.com or parent@example.com"
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
            >
              {submitting ? 'Sending...' : 'Send code'}
            </button>
            {info && <p className="text-xs text-green-700">{info}</p>}
            {err && <p className="text-xs text-red-600">{err}</p>}
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyCode} className="grid gap-3">
            <div>
              <label className="text-sm text-gray-700">Enter the 6‑digit code</label>
              <div className="mt-1 flex gap-2 justify-between">
                {[0,1,2,3,4,5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-10 h-12 border rounded-md text-center text-lg font-semibold tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={otpDigits[i]}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    maxLength={1}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-gray-500">Code expires in 5 minutes</span>
                <button
                  type="button"
                  disabled={resendSec > 0}
                  onClick={requestCode}
                  className={`underline ${resendSec > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-700 hover:text-blue-800'}`}
                >
                  {resendSec > 0 ? `Resend in ${resendSec}s` : 'Resend code'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || otp.length !== 6}
              className="w-full px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
            >
              {submitting ? 'Verifying...' : 'Verify code'}
            </button>
            {info && <p className="text-xs text-green-700">{info}</p>}
            {err && <p className="text-xs text-red-600">{err}</p>}
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword} className="grid gap-2">
            <label className="text-sm text-gray-700">New password</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              placeholder="At least 6 characters"
            />
            <label className="text-sm text-gray-700">Confirm password</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
            >
              {submitting ? 'Updating...' : 'Set new password'}
            </button>
            {info && <p className="text-xs text-green-700">{info}</p>}
            {err && <p className="text-xs text-red-600">{err}</p>}
          </form>
        )}
      </div>
    </div>
  );
}