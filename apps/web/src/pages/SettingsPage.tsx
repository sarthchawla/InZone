import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { authClient } from '../lib/auth-client';
import { apiClient, getErrorMessage } from '../api/client';
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

function SectionCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-card border border-border rounded-xl shadow-sm"
    >
      {children}
    </motion.section>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 px-6 pt-6 pb-4">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </motion.p>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user && 'role' in user && (user as { role?: string }).role === 'admin';
  const currentUsername = user && 'username' in user ? (user as { username?: string }).username ?? '' : '';

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(currentUsername);
  const [profileMsg, setProfileMsg] = useState('');

  const [hasCredential, setHasCredential] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const [sqConfigured, setSqConfigured] = useState(false);
  const [showSqForm, setShowSqForm] = useState(false);
  const [sqQuestions, setSqQuestions] = useState([
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);
  const [sqMsg, setSqMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/security-questions/status')
      .then(({ data }) => setSqConfigured(data.configured))
      .catch(() => {});

    // Check if user has a credential (email/password) account
    authClient.listAccounts().then((res) => {
      if (res.data) {
        const hasCred = res.data.some(
          (acc: { providerId?: string; provider?: string }) =>
            acc.providerId === 'credential' || acc.provider === 'credential',
        );
        setHasCredential(hasCred);
      }
    }).catch(() => {
      // Fallback: assume credential exists (shows change password form)
      setHasCredential(true);
    });
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setError('');
    try {
      await authClient.updateUser({
        name,
        username: username || undefined,
      } as Parameters<typeof authClient.updateUser>[0]);
      setProfileMsg('Profile updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');
    setError('');
    try {
      if (hasCredential) {
        // User already has a password — change it
        const result = await authClient.changePassword({
          currentPassword,
          newPassword,
        });
        if (result.error) {
          setError(result.error.message || 'Failed to change password.');
          return;
        }
        setPasswordMsg('Password changed.');
      } else {
        // OAuth-only user — set password for the first time (server-only API)
        await apiClient.post('/auth/set-password', { newPassword });
        setPasswordMsg('Password set! You can now sign in with email and password.');
        setHasCredential(true);
      }
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleUpdateSQ(e: React.FormEvent) {
    e.preventDefault();
    setSqMsg('');
    setError('');
    try {
      await apiClient.post('/security-questions/setup', {
        questions: sqQuestions.map((q) => ({ question: q.question, answer: q.answer })),
      });
      setSqMsg('Security questions updated.');
      setShowSqForm(false);
      setSqConfigured(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSignOutAll() {
    try {
      await authClient.revokeOtherSessions();
      setProfileMsg('All other sessions revoked.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const passwordFormValid = hasCredential
    ? !!(currentPassword && newPassword)
    : !!newPassword;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-16 w-full">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, security, and preferences</p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm"
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          <span>{error}</span>
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Profile section */}
        <SectionCard delay={0.05}>
          <SectionHeader
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            title="Profile"
            description="Your personal information and display name"
          />
          <form onSubmit={handleUpdateProfile} className="px-6 pb-6 space-y-4">
            {/* Avatar + role row */}
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              {user?.image ? (
                <img src={user.image} alt={user.name ?? ''} className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              {isAdmin && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-1 rounded-md">
                  Admin
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-secondary-foreground mb-1.5">Display name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-foreground mb-1.5">
                  Username <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={currentUsername || 'e.g. johndoe'}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-foreground mb-1.5">Email</label>
              <div className="flex items-center min-h-[44px] w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {user?.email}
                <span className="ml-auto text-xs text-muted-foreground">Read-only</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
              <SuccessMessage message={profileMsg} />
            </div>
          </form>
        </SectionCard>

        {/* Security section */}
        <SectionCard delay={0.1}>
          <SectionHeader
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
            title="Security"
            description="Password and account recovery options"
          />
          <div className="px-6 pb-6">
            {/* Password form — adapts based on whether user has credential account */}
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              {hasCredential === false ? (
                <>
                  <h3 className="text-sm font-medium text-secondary-foreground">Set a password</h3>
                  <p className="text-xs text-muted-foreground">
                    You signed up with Google. Add a password so you can also sign in with email.
                  </p>
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </>
              ) : (
                <>
                  <h3 className="text-sm font-medium text-secondary-foreground">Change password</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <Input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!passwordFormValid}
                >
                  {hasCredential === false ? 'Set Password' : 'Update Password'}
                </Button>
                <SuccessMessage message={passwordMsg} />
              </div>
            </form>

            {/* Divider */}
            <div className="border-t border-border my-6" />

            {/* Security Questions */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-secondary-foreground">Security questions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sqConfigured ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Configured
                      </span>
                    ) : (
                      <span className="text-amber-600">Not configured — needed for password recovery</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowSqForm(!showSqForm)}
                  className="text-sm font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  {showSqForm ? 'Cancel' : sqConfigured ? 'Update' : 'Set Up'}
                </button>
              </div>

              {showSqForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleUpdateSQ}
                  className="mt-4 space-y-4"
                >
                  {sqQuestions.map((q, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Question {i + 1}
                      </label>
                      <select
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...sqQuestions];
                          updated[i] = { ...updated[i], question: e.target.value };
                          setSqQuestions(updated);
                        }}
                        aria-label={`Security question ${i + 1}`}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring/30 focus:border-primary"
                      >
                        <option value="">Select a question</option>
                        {SECURITY_QUESTIONS.filter(
                          (sq) =>
                            sq === q.question ||
                            !sqQuestions.some((oq, oi) => oi !== i && oq.question === sq),
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
                          const updated = [...sqQuestions];
                          updated[i] = { ...updated[i], answer: e.target.value };
                          setSqQuestions(updated);
                        }}
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={
                        sqQuestions.some((q) => !q.question || q.answer.length < 2) ||
                        new Set(sqQuestions.map((q) => q.question)).size !== 3
                      }
                    >
                      Save Questions
                    </Button>
                    <SuccessMessage message={sqMsg} />
                  </div>
                </motion.form>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard delay={0.15}>
          <div className="flex items-start gap-3 px-6 pt-6 pb-4">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Irreversible actions that affect your account</p>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between p-3 border border-red-200 bg-red-50/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Sign out all other devices</p>
                <p className="text-xs text-muted-foreground mt-0.5">Revoke all sessions except your current one</p>
              </div>
              <Button variant="danger" size="sm" onClick={handleSignOutAll}>
                Sign Out Others
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
