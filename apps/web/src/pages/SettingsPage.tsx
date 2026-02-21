import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authClient } from '../lib/auth-client';
import { apiClient, getErrorMessage } from '../api/client';

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Profile */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-500">{user?.email} (read-only)</p>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
          {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
        </form>
      </section>

      {/* Security */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-700">Change Password</h3>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!currentPassword || !newPassword}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Change Password
          </button>
          {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
        </form>

        {/* Security Questions */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Security Questions</h3>
              <p className="text-xs text-gray-500">
                {sqConfigured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <button
              onClick={() => setShowSqForm(!showSqForm)}
              className="text-sm text-blue-600 hover:underline"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-1"
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
                  <input
                    type="text"
                    placeholder="Your answer"
                    value={q.answer}
                    onChange={(e) => {
                      const updated = [...sqQuestions];
                      updated[i] = { ...updated[i], answer: e.target.value };
                      setSqQuestions(updated);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={
                  sqQuestions.some((q) => !q.question || q.answer.length < 2) ||
                  new Set(sqQuestions.map((q) => q.question)).size !== 3
                }
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Update Questions
              </button>
              {sqMsg && <p className="text-sm text-green-600">{sqMsg}</p>}
            </form>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <button
          onClick={handleSignOutAll}
          className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Sign Out All Other Devices
        </button>
      </section>
    </div>
  );
}
