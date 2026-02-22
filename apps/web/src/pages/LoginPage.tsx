import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signIn } from '../lib/auth-client';
import { GoogleIcon } from '../components/ui/GoogleIcon';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: 'Your sign-in session expired. Please try again.',
  unable_to_create_user: 'An invite or approved access request is required to sign up.',
  oauth_error: 'Something went wrong during sign-in. Please try again.',
  access_denied: 'Access was denied. Please try again or request access.',
};

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pick up OAuth error from redirect query params
  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      setError(OAUTH_ERROR_MESSAGES[errorCode] || `Sign-in failed: ${errorCode}`);
      // Clean the URL without triggering a re-render loop
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setError('');
    setLoading(true);

    try {
      const isEmail = identifier.includes('@');
      const result = isEmail
        ? await signIn.email({ email: identifier, password })
        : await signIn.username({ username: identifier, password });

      if (result.error) {
        setError(result.error.message || 'Invalid credentials.');
        setLoading(false);
        return;
      }
      // Full page load to ensure the session cookie is picked up by useSession()
      // (client-side navigate would race against the session cache)
      window.location.href = '/';
    } catch {
      setError('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-surface-0 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-accent mb-2 text-center">InZone</h1>
        <p className="text-stone-600 mb-6 text-center">Sign in to manage your boards</p>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={() =>
            signIn.social({
              provider: 'google',
              callbackURL: window.location.origin + '/',
            })
          }
          className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 rounded-lg px-4 py-3 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
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
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email or Username
            </label>
            <Input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="submit"
              variant="primary"
              disabled={!identifier || !password || loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Link
              to="/reset-password"
              className="text-sm text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-200 text-center">
          <p className="text-sm text-stone-500">
            Don't have an account?{' '}
            <Link to="/request-access" className="text-accent hover:underline font-medium">
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
