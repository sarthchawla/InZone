import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient, getErrorMessage } from '../api/client';
import { authClient } from '../lib/auth-client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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
  const direction = useRef(1);
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
      direction.current = 1;
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
      direction.current = 1;
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
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="bg-card shadow rounded-lg p-8 w-full max-w-sm text-center" role="status">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Password Reset!</h2>
          <p className="text-muted-foreground text-sm mb-4">Your password has been updated. Please sign in.</p>
          <Link
            to="/login"
            className="inline-block bg-primary text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    );
  }

  const slideVariants = {
    enter: { x: direction.current > 0 ? 40 : -40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: direction.current > 0 ? -40 : 40, opacity: 0 },
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="bg-card shadow rounded-lg p-8 w-full max-w-sm">
        <div className="mb-6" role="group" aria-label="Password reset progress">
          <div className="flex items-center justify-between mb-2">
            {['Identify', 'Verify', 'Reset'].map((label, i) => {
              const stepKey = ['identify', 'questions', 'reset'] as const;
              const currentIdx = stepKey.indexOf(step as typeof stepKey[number]);
              const isComplete = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={label} className="flex items-center gap-2" aria-current={isCurrent ? 'step' : undefined}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isComplete || isCurrent ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isComplete ? '\u2713' : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => {
              const stepKey = ['identify', 'questions', 'reset'];
              const currentIdx = stepKey.indexOf(step);
              return (
                <div key={i} className={`h-1 flex-1 rounded ${i <= currentIdx ? 'bg-primary' : 'bg-muted'}`} />
              );
            })}
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'identify' && (
            <motion.div
              key="identify"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-2xl font-bold font-display text-foreground mb-6 text-center">Reset Your Password</h1>
              <form onSubmit={handleIdentify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground mb-1">
                    Email or Username
                  </label>
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full"
                  disabled={!identifier || loading}
                >
                  {loading ? 'Loading...' : 'Continue'}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'questions' && (
            <motion.div
              key="questions"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-xl font-bold font-display text-foreground mb-4 text-center">
                Answer Your Security Questions
              </h1>
              <form onSubmit={handleVerify} className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-secondary-foreground mb-1">{q}</label>
                    <Input
                      type="text"
                      value={answers[i]}
                      onChange={(e) => {
                        const updated = [...answers];
                        updated[i] = e.target.value;
                        setAnswers(updated);
                      }}
                    />
                  </div>
                ))}
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full"
                  disabled={answers.some((a) => !a) || loading}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'reset' && (
            <motion.div
              key="reset"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-xl font-bold font-display text-foreground mb-4 text-center">Set New Password</h1>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground mb-1">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className="mt-1 space-y-0.5" aria-label="Password strength indicators">
                    {passwordChecks.map((check) => (
                      <div key={check.label} className="flex items-center gap-1.5 text-xs">
                        <span className={check.passed ? 'text-green-500' : 'text-muted-foreground'}>
                          {check.passed ? '\u2713' : '\u2717'}
                        </span>
                        <span className={check.passed ? 'text-green-700' : 'text-muted-foreground'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground mb-1">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full"
                  disabled={
                    !passwordChecks.every((c) => c.passed) ||
                    newPassword !== confirmPassword ||
                    loading
                  }
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link to="/login" className="text-primary hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
