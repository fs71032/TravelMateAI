import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchUsers, setUserActive, updateUserRole, type ManagedUser } from '../services/userService';

const ROLE_OPTIONS = ['admin', 'manager', 'planner', 'user'];

function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (id: string, role: string) => {
    const previous = users;
    setSavingId(id);
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, role } : u)));
    try {
      await updateUserRole(id, role);
    } catch (err) {
      setError((err as Error).message || 'Failed to update role.');
      setUsers(previous);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    const previous = users;
    setSavingId(id);
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, is_active: nextActive ? 1 : 0 } : u)));
    try {
      await setUserActive(id, nextActive);
    } catch (err) {
      setError((err as Error).message || 'Failed to update status.');
      setUsers(previous);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Administration</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">User &amp; role management</h1>
          <p className="mt-2 text-slate-400">Assign roles and control account access for the whole team.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="mb-4 rounded border border-rose-700 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.email === currentUser?.user.email;
              const isActive = Boolean(u.is_active);
              return (
                <tr key={u.id} className="border-b border-slate-900">
                  <td className="px-4 py-3 font-semibold text-white">
                    {u.name}
                    {isSelf && <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">You</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={savingId === u.id || isSelf}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-100 disabled:opacity-50"
                    >
                      {!ROLE_OPTIONS.includes(u.role) && <option value={u.role}>{u.role}</option>}
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={savingId === u.id || isSelf}
                      onClick={() => handleToggleActive(u.id, !isActive)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        You can't change your own role or disable your own account — ask another admin if you need that changed.
      </p>
    </section>
  );
}

export default UserManagementPage;
