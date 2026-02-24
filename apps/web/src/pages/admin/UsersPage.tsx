import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { authClient } from '../../lib/auth-client';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

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
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean; userId: string }>({ open: false, userId: '' });

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

  function handleRemove(userId: string) {
    setRemoveConfirm({ open: true, userId });
  }

  async function confirmRemove() {
    setError('');
    try {
      await authClient.admin.removeUser({ userId: removeConfirm.userId });
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-16 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} registered {users.length === 1 ? 'user' : 'users'}
          </p>
        </div>
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

      {/* Users grid (cards on mobile, table on desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      >
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Joined</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u, i) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.03 * i }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.name}
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                you
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {u.role === 'admin' && (
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        )}
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.banned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!isSelf && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() =>
                              handleSetRole(u.id, u.role === 'admin' ? 'user' : 'admin')
                            }
                            className="text-xs font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                          {u.banned ? (
                            <button
                              onClick={() => handleUnban(u.id)}
                              className="text-xs font-medium text-green-600 hover:bg-green-50 px-2 py-1 rounded-md transition-colors"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(u.id)}
                              className="text-xs font-medium text-amber-600 hover:bg-amber-50 px-2 py-1 rounded-md transition-colors"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(u.id)}
                            className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-border">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.name}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {u.role || 'user'}
                    </span>
                    {u.banned ? (
                      <span className="text-[10px] font-medium text-red-600">Banned</span>
                    ) : (
                      <span className="text-[10px] font-medium text-green-600">Active</span>
                    )}
                  </div>
                </div>
                {!isSelf && (
                  <div className="flex gap-2 pl-13">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleSetRole(u.id, u.role === 'admin' ? 'user' : 'admin')
                      }
                    >
                      {u.role === 'admin' ? 'Demote' : 'Promote'}
                    </Button>
                    {u.banned ? (
                      <Button size="sm" variant="ghost" onClick={() => handleUnban(u.id)}>
                        Unban
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleBan(u.id)}>
                        Ban
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleRemove(u.id)}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {users.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No users found
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        open={removeConfirm.open}
        onOpenChange={(open) => setRemoveConfirm((prev) => ({ ...prev, open }))}
        title="Remove User"
        message="Permanently remove this user and all their data?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemove}
      />
    </div>
  );
}
