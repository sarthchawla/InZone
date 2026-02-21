import { useState, useEffect, useCallback } from 'react';
import { apiClient, getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface Invite {
  id: string;
  email: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  creator?: { name: string; email: string };
}

export function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newLink, setNewLink] = useState('');
  const [loading, setLoading] = useState(false);

  const loadInvites = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/invites');
      setInvites(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSuccess('');
    setNewLink('');
    setLoading(true);

    try {
      const { data } = await apiClient.post('/invites', { email, role });
      setNewLink(data.inviteLink);
      setSuccess(`Invite created for ${email}`);
      setEmail('');
      loadInvites();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    setError('');
    try {
      await apiClient.delete(`/invites/${id}`);
      loadInvites();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/signup?token=${token}`;
    navigator.clipboard.writeText(link);
  }

  const pending = invites.filter((i) => i.status === 'pending');
  const history = invites.filter((i) => i.status !== 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Invite Management</h1>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white border border-stone-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!email || loading}
            className="whitespace-nowrap"
          >
            Create Invite
          </Button>
        </div>
      </form>

      {(success || newLink) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          {success && <p className="text-green-700 text-sm font-medium mb-2">{success}</p>}
          {newLink && (
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white border border-green-200 rounded px-2 py-1 flex-1 truncate">
                {newLink}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(newLink)}
                className="bg-green-600 text-white rounded px-3 py-1 text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Pending Invites</h2>
      {pending.length === 0 ? (
        <p className="text-stone-500 text-sm mb-6">No pending invites.</p>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100 mb-6">
          {pending.map((invite) => (
            <div key={invite.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">{invite.email}</p>
                <p className="text-xs text-stone-500">
                  Role: {invite.role} &middot; Expires{' '}
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(invite.token)}
                  className="text-xs text-accent hover:underline"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => handleRevoke(invite.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">History</h2>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {history.map((invite) => (
              <div key={invite.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">{invite.email}</p>
                  <p className="text-xs text-stone-500">
                    Role: {invite.role} &middot;{' '}
                    <span className="capitalize">{invite.status}</span>{' '}
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
