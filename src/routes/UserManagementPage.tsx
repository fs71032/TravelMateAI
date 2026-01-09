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