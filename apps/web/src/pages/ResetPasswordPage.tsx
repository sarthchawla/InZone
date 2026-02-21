import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, getErrorMessage } from '../api/client';
import { authClient } from '../lib/auth-client';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: '8+ characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'Special character' },
];

type Step = 'identify' | 'questions' | 'reset' | 'done';

export function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState(['', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier) return;
    setError('');
    setLoading(true);

    try {
      const { data } = await apiClient.post('/security-questions/questions', { identifier });
      setQuestions(data.questions);
      setStep('questions');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (answers.some((a) => !a)) return;
    setError('');
    setLoading(true);

    try {
      const { data } = await apiClient.post('/security-questions/verify', {
        identifier,
        answers,
      });
      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setError('');
    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword,
        token: resetToken,
      });
      if (result.error) {
        setError(result.error.message || 'Failed to reset password.');
        setLoading(false);
        return;
      }
      setStep('done');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: newPassword.length > 0 && rule.test(newPassword),
  }));

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
          <p className="text-gray-600 text-sm mb-4">Your password has been updated. Please sign in.</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 'identify' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Reset Your Password</h1>
            <form onSubmit={handleIdentify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={!identifier || loading}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {step === 'questions' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Answer Your Security Questions
            </h1>
            <form onSubmit={handleVerify} className="space-y-4">
              {questions.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{q}</label>
                  <input
                    type="text"
                    value={answers[i]}
                    onChange={(e) => {
                      const updated = [...answers];
                      updated[i] = e.target.value;
                      setAnswers(updated);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={answers.some((a) => !a) || loading}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-4 text-center">Set New Password</h1>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-1 space-y-0.5">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5 text-xs">
                      <span className={check.passed ? 'text-green-500' : 'text-gray-400'}>
                        {check.passed ? '✓' : '✗'}
                      </span>
                      <span className={check.passed ? 'text-green-700' : 'text-gray-500'}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={
                  !passwordChecks.every((c) => c.passed) ||
                  newPassword !== confirmPassword ||
                  loading
                }
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
