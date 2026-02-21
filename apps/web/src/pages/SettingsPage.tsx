import { useState, useEffect } from 'react';
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

export function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMsg, setProfileMsg] = useState('');

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
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setError('');
    try {
      await authClient.updateUser({ name });
      setProfileMsg('Profile updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');
    setError('');
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (result.error) {
        setError(result.error.message || 'Failed to change password.');
        return;
      }
      setPasswordMsg('Password changed.');
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Settings</h1>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Profile */}
      <section className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Profile</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <p className="text-sm text-stone-500">{user?.email} (read-only)</p>
          </div>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
          {profileMsg && <p role="status" className="text-sm text-green-600">{profileMsg}</p>}
        </form>
      </section>

      {/* Security */}
      <section className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Security</h2>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-stone-700">Change Password</h3>
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!currentPassword || !newPassword}
          >
            Change Password
          </Button>
          {passwordMsg && <p role="status" className="text-sm text-green-600">{passwordMsg}</p>}
        </form>

        {/* Security Questions */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-stone-700">Security Questions</h3>
              <p className="text-xs text-stone-500">
                {sqConfigured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <button
              onClick={() => setShowSqForm(!showSqForm)}
              className="text-sm text-accent hover:underline"
            >
              {showSqForm ? 'Cancel' : 'Update'}
            </button>
          </div>

          {showSqForm && (
            <form onSubmit={handleUpdateSQ} className="space-y-3">
              {sqQuestions.map((q, i) => (
                <div key={i}>
                  <select
                    value={q.question}
                    onChange={(e) => {
                      const updated = [...sqQuestions];
                      updated[i] = { ...updated[i], question: e.target.value };
                      setSqQuestions(updated);
                    }}
                    aria-label={`Security question ${i + 1}`}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-1 focus:ring-2 focus:ring-accent/30 focus:border-accent"
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
              <Button
                type="submit"
                variant="primary"
                disabled={
                  sqQuestions.some((q) => !q.question || q.answer.length < 2) ||
                  new Set(sqQuestions.map((q) => q.question)).size !== 3
                }
              >
                Update Questions
              </Button>
              {sqMsg && <p role="status" className="text-sm text-green-600">{sqMsg}</p>}
            </form>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <Button variant="danger" onClick={handleSignOutAll}>
          Sign Out All Other Devices
        </Button>
      </section>
    </div>
  );
}
