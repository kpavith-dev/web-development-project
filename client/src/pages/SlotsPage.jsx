import { useEffect, useState } from 'react';
import { FaEdit, FaParking, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptySlot = { slotNumber: '', parkingArea: '', vehicleTypeAllowed: 'car', status: 'available' };

const statusColors = {
  available: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  reserved: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  occupied: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  maintenance: 'border-slate-700 bg-slate-800 text-slate-300'
};

const SlotsPage = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(emptySlot);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  const loadSlots = async () => {
    try {
      const [slotsRes, areasRes] = await Promise.all([api.get('/slots'), api.get('/areas')]);
      setSlots(slotsRes.data.data || []);
      setAreas(areasRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load parking slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptySlot);
    setModalOpen(true);
  };

  const openEdit = (slot) => {
    setEditingId(slot._id);
    setForm({
      slotNumber: slot.slotNumber || '',
      parkingArea: slot.parkingArea?._id || '',
      vehicleTypeAllowed: slot.vehicleTypeAllowed || 'car',
      status: slot.status || 'available'
    });
    setModalOpen(true);
  };

  const saveSlot = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.put(`/slots/${editingId}`, form);
        toast.success('Slot updated.');
      } else {
        await api.post('/slots', form);
        toast.success('Slot created.');
      }
      setModalOpen(false);
      setForm(emptySlot);
      setEditingId(null);
      loadSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save slot.');
    }
  };

  const deleteSlot = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await api.delete(`/slots/${id}`);
      toast.success('Slot deleted.');
      loadSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete slot.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div>
          <h1 className="text-xl font-semibold">Parking slots</h1>
          <p className="text-sm text-slate-400">Review slot allocation and status across campus.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500">
            <FaPlus /> Add slot
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span>Loading slots...</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {slots.map((slot) => (
            <div key={slot._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Slot</p>
                  <h2 className="text-xl font-semibold">{slot.slotNumber}</h2>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(slot)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-500 hover:text-cyan-300">
                      <FaEdit />
                    </button>
                    <button onClick={() => deleteSlot(slot._id)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-rose-300">
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span className="text-sm text-slate-400">Area</span>
                  <span className="font-medium text-slate-100">{slot.parkingArea?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span className="text-sm text-slate-400">Vehicle type</span>
                  <span className="font-medium capitalize text-slate-100">{slot.vehicleTypeAllowed || 'car'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span className="text-sm text-slate-400">Status</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColors[slot.status] || statusColors.maintenance}`}>
                    {slot.status}
                  </span>
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
              <h2 className="text-xl font-semibold">{editingId ? 'Edit slot' : 'Add slot'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">Close</button>
            </div>
            <form onSubmit={saveSlot} className="space-y-4">
              <input required placeholder="Slot number" value={form.slotNumber} onChange={(event) => setForm({ ...form, slotNumber: event.target.value })} className="input" />
              <select required value={form.parkingArea} onChange={(event) => setForm({ ...form, parkingArea: event.target.value })} className="input">
                <option value="">Select area</option>
                {areas.map((area) => (
                  <option key={area._id} value={area._id}>{area.name}</option>
                ))}
              </select>
              <select value={form.vehicleTypeAllowed} onChange={(event) => setForm({ ...form, vehicleTypeAllowed: event.target.value })} className="input">
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="ev">EV</option>
              </select>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="input">
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
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

export default SlotsPage;
