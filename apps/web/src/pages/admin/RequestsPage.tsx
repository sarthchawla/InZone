import { useState, useEffect, useCallback } from 'react';
import { apiClient, getErrorMessage } from '../../api/client';

interface AccessRequest {
  id: string;
  email: string;
  name: string;
  reason: string | null;
  status: string;
  role: string;
  reviewedAt: string | null;
  createdAt: string;
}

export function RequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/access-requests');
      setRequests(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleApprove(id: string, role: string) {
    setError('');
    try {
      await apiClient.post(`/access-requests/${id}/approve`, { role });
      loadRequests();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleReject(id: string) {
    setError('');
    try {
      await apiClient.post(`/access-requests/${id}/reject`);
      loadRequests();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-16 w-full">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Access Requests</h1>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Pending</h2>
      {pending.length === 0 ? (
        <p className="text-stone-500 text-sm mb-6">No pending requests.</p>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100 mb-6">
          {pending.map((req) => (
            <PendingRequestRow
              key={req.id}
              request={req}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Reviewed</h2>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {reviewed.map((req) => (
              <div key={req.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{req.name}</p>
                    <p className="text-xs text-stone-500">{req.email}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      req.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {req.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PendingRequestRow({
  request,
  onApprove,
  onReject,
}: {
  request: AccessRequest;
  onApprove: (id: string, role: string) => void;
  onReject: (id: string) => void;
}) {
  const [role, setRole] = useState('user');

  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-900">{request.name}</p>
          <p className="text-xs text-stone-500">
            {request.email} &middot; {new Date(request.createdAt).toLocaleDateString()}
          </p>
          {request.reason && (
            <p className="text-sm text-stone-600 mt-1 italic">"{request.reason}"</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-stone-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-accent/30 focus:border-accent"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={() => onApprove(request.id, role)}
          className="bg-green-600 text-white rounded px-3 py-1 text-xs font-medium hover:bg-green-700 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(request.id)}
          className="bg-red-600 text-white rounded px-3 py-1 text-xs font-medium hover:bg-red-700 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
