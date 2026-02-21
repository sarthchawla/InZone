import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { signUp, signIn } from '../lib/auth-client';
import { apiClient, getErrorMessage } from '../api/client';
import { GoogleIcon } from '../components/ui/GoogleIcon';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'In what city were you born?',
  'What was the name of your first school?',
  "What is your mother's maiden name?",
  'What was the make of your first car?',
  'What is the name of the street you grew up on?',
  'What was your childhood nickname?',
  'What is your favorite book?',
];

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: '8+ characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'Special character' },
];

export function SignUpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [inviteEmail, setInviteEmail] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate invite token on mount
  useEffect(() => {
    if (token) {
      apiClient
        .get(`/invites/validate?token=${encodeURIComponent(token)}`)
        .then(({ data }) => {
          if (data.valid) {
            setTokenValid(true);
            setInviteEmail(data.email);
            setEmail(data.email);
          } else {
            setTokenValid(false);
          }
        })
        .catch(() => setTokenValid(false));
    }
  }, [token]);

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: password.length > 0 && rule.test(password),
  }));

  const questionsValid =
    questions.every((q) => q.question && q.answer.length >= 2) &&
    new Set(questions.map((q) => q.question)).size === 3;

  const formValid =
    email &&
    name &&
    password &&
    confirmPassword === password &&
    passwordChecks.every((c) => c.passed) &&
    questionsValid;

  async function handleGoogleSignUp() {
    if (token) {
      try {
        await apiClient.post('/invites/set-token', { token });
      } catch {
        setError('Failed to prepare invite. Try again.');
        return;
      }
    }
    signIn.social({
      provider: 'google',
      callbackURL: window.location.origin + '/',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        username: username || undefined,
        // Pass invite token as extra field
        fetchOptions: {
          body: {
            inviteToken: token || undefined,
          },
        },
      } as Parameters<typeof signUp.email>[0]);

      if (result.error) {
        setError(result.error.message || 'Sign-up failed.');
        setLoading(false);
        return;
      }

      // Set up security questions
      await apiClient.post('/security-questions/setup', {
        questions: questions.map((q) => ({
          question: q.question,
          answer: q.answer,
        })),
      });

      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (token && tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div
          role="status"
          aria-label="Loading"
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"
        />
      </div>
    );
  }

  if (token && tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0 p-4">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Invite</h1>
          <p className="text-stone-600 mb-6">
            This invite link is invalid, expired, or has already been used.
          </p>
          <Link to="/login" className="text-accent hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-accent mb-2 text-center">
          Create your InZone account
        </h1>
        <p className="text-stone-500 text-sm text-center mb-6">
          {inviteEmail ? `You've been invited as ${inviteEmail}` : 'Sign up with an approved email'}
        </p>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignUp}
          className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 rounded-lg px-4 py-3 text-stone-700 font-medium hover:bg-stone-50 transition-colors mb-4"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-stone-500">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!!inviteEmail}
              className={inviteEmail ? 'bg-stone-100' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Username <span className="text-stone-400">(optional)</span>
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-1 space-y-0.5">
              {passwordChecks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center gap-1.5 text-xs"
                  aria-label={`${check.label}: ${check.passed ? 'met' : 'not met'}`}
                >
                  <span className={check.passed ? 'text-green-500' : 'text-stone-400'}>
                    {check.passed ? '\u2713' : '\u2717'}
                  </span>
                  <span className={check.passed ? 'text-green-700' : 'text-stone-500'}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Confirm Password *
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-stone-700 mb-1">Security Questions</h3>
            <p className="text-xs text-stone-500 mb-3">
              Required — used to reset your password if forgotten.
            </p>
            {questions.map((q, i) => (
              <div key={i} className="mb-3">
                <select
                  value={q.question}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i] = { ...updated[i], question: e.target.value };
                    setQuestions(updated);
                  }}
                  aria-label={`Security question ${i + 1}`}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-1 focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  <option value="">Select a question</option>
                  {SECURITY_QUESTIONS.filter(
                    (sq) => sq === q.question || !questions.some((oq, oi) => oi !== i && oq.question === sq),
                  ).map((sq) => (
                    <option key={sq} value={sq}>
                      {sq}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  placeholder="Your answer"
                  value={q.answer}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i] = { ...updated[i], answer: e.target.value };
                    setQuestions(updated);
                  }}
                />
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            type="submit"
            className="w-full"
            disabled={!formValid || loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
