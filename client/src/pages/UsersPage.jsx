import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaUserShield } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const roles = ['student', 'lecturer', 'staff', 'security', 'admin'];

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', active: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { ...filters, limit: 10 } });
      setUsers(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load users.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, [filters]);

  const updateUser = async (id, update) => {
    try {
      await api.patch(`/users/${id}`, update);
      toast.success('User updated.');
      loadUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Could not update user.'); }
  };

  const openDetail = async (id) => {
    try { const { data } = await api.get(`/users/${id}`); setDetail(data.data); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to load user details.'); }
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><FaUserShield /></span><div><h1 className="text-xl font-semibold">User management</h1><p className="text-sm text-slate-400">Search, review roles, and manage account access.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><input className="input" placeholder="Search name, email, or registration" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} /><select className="input" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value, page: 1 })}><option value="">All roles</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select><select className="input" value={filters.active} onChange={(event) => setFilters({ ...filters, active: event.target.value, page: 1 })}><option value="">All account states</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Registered</th><th className="p-4">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading users…</td></tr> : users.length ? users.map((user) => <tr key={user._id} className="border-b border-slate-800 last:border-0"><td className="p-4"><button onClick={() => openDetail(user._id)} className="font-semibold text-cyan-300 hover:underline">{user.name}</button><p className="text-slate-400">{user.email}</p></td><td className="p-4"><select aria-label={`Role for ${user.name}`} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 capitalize" value={user.role} onChange={(event) => updateUser(user._id, { role: event.target.value })}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></td><td className="p-4"><button onClick={() => updateUser(user._id, { isActive: !user.isActive })} className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{user.isActive ? 'Active' : 'Inactive'}</button></td><td className="p-4 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td><td className="p-4"><button onClick={() => openDetail(user._id)} className="text-cyan-300 hover:underline">Details</button></td></tr>) : <tr><td colSpan="5" className="p-8 text-center text-slate-400">No users match these filters.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-800 p-4 text-sm text-slate-400"><span>{pagination.total} users</span><div className="flex gap-2"><button aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="rounded border border-slate-700 p-2 disabled:opacity-40"><FaChevronLeft /></button><span className="px-2 py-2">Page {pagination.page} of {pagination.totalPages || 1}</span><button aria-label="Next page" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="rounded border border-slate-700 p-2 disabled:opacity-40"><FaChevronRight /></button></div></div>
    </section>
    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><section className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex justify-between gap-3"><div><h2 className="text-xl font-semibold">{detail.user.name}</h2><p className="text-slate-400">{detail.user.email}</p></div><button onClick={() => setDetail(null)} className="text-slate-400">Close</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h3 className="font-semibold">Vehicles</h3><p className="mt-2 text-sm text-slate-400">{detail.vehicles.length ? detail.vehicles.map((vehicle) => vehicle.vehicleNumber).join(', ') : 'No vehicles registered.'}</p></div><div><h3 className="font-semibold">Recent reservations</h3><p className="mt-2 text-sm text-slate-400">{detail.reservations.length ? detail.reservations.map((reservation) => `${reservation.reservationId} (${reservation.status})`).join(', ') : 'No reservation history.'}</p></div></div></section></div>}
  </div>;
};

export default UsersPage;
