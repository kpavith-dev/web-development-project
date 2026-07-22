import { useEffect, useState } from 'react';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyArea = { name: '', description: '', totalSlots: '' };

const AreasPage = () => {
  const { user } = useAuth();
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(emptyArea);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  const loadAreas = async () => {
    try {
      const { data } = await api.get('/areas');
      setAreas(data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load parking areas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyArea);
    setModalOpen(true);
  };

  const openEdit = (area) => {
    setEditingId(area._id);
    setForm({
      name: area.name || '',
      description: area.description || '',
      totalSlots: area.totalSlots ?? ''
    });
    setModalOpen(true);
  };

  const saveArea = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, totalSlots: Number(form.totalSlots) };
      if (editingId) {
        await api.put(`/areas/${editingId}`, payload);
        toast.success('Area updated.');
      } else {
        await api.post('/areas', payload);
        toast.success('Area created.');
      }
      setModalOpen(false);
      setForm(emptyArea);
      setEditingId(null);
      loadAreas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save area.');
    }
  };

  const deleteArea = async (id) => {
    if (!window.confirm('Delete this parking area?')) return;
    try {
      await api.delete(`/areas/${id}`);
      toast.success('Area deleted.');
      loadAreas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete area.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div>
          <h1 className="text-xl font-semibold">Parking areas</h1>
          <p className="text-sm text-slate-400">Manage campus parking zones and capacities.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500">
            <FaPlus /> Add area
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span>Loading areas...</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {areas.map((area) => (
            <div key={area._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{area.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{area.description || 'No description provided.'}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(area)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-500 hover:text-cyan-300">
                      <FaEdit />
                    </button>
                    <button onClick={() => deleteArea(area._id)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-rose-300">
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total slots</p>
                  <p className="mt-1 text-xl font-semibold">{area.totalSlots ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Available</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-300">{area.availableSlots ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Occupied</p>
                  <p className="mt-1 text-xl font-semibold text-rose-300">{area.occupiedSlots ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Reserved</p>
                  <p className="mt-1 text-xl font-semibold text-amber-300">{area.reservedSlots ?? 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit area' : 'Add area'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">Close</button>
            </div>
            <form onSubmit={saveArea} className="space-y-4">
              <input required placeholder="Area name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input" />
              <textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input min-h-[100px]" />
              <input required min="1" type="number" placeholder="Total slots" value={form.totalSlots} onChange={(event) => setForm({ ...form, totalSlots: event.target.value })} className="input" />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300">Cancel</button>
                <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreasPage;
