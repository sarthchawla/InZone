import { useState, useEffect, useCallback } from 'react';
import { authClient } from '../../lib/auth-client';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const result = await authClient.admin.listUsers({
        query: { limit: 100 },
      });
      if (result.data) {
        setUsers(
          result.data.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: (u as { role?: string | null }).role ?? null,
            banned: (u as { banned?: boolean | null }).banned ?? null,
            createdAt: u.createdAt.toString(),
          })),
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleSetRole(userId: string, role: 'admin' | 'user') {
    setError('');
    try {
      await authClient.admin.setRole({ userId, role });
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleBan(userId: string) {
    setError('');
    try {
      await authClient.admin.banUser({ userId });
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleUnban(userId: string) {
    setError('');
    try {
      await authClient.admin.unbanUser({ userId });
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Permanently remove this user and all their data?')) return;
    setError('');
    try {
      await authClient.admin.removeUser({ userId });
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">User Management</h1>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 text-stone-600 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-stone-600 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-stone-600 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-stone-600 font-medium">Status</th>
              <th className="text-right px-4 py-3 text-stone-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-stone-900">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs bg-accent-light text-accent px-1.5 py-0.5 rounded">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs ${u.banned ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {u.banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() =>
                            handleSetRole(u.id, u.role === 'admin' ? 'user' : 'admin')
                          }
                          className="text-xs text-accent hover:underline"
                        >
                          {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                        </button>
                        {u.banned ? (
                          <button
                            onClick={() => handleUnban(u.id)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(u.id)}
                            className="text-xs text-orange-600 hover:underline"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(u.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
