import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const SlotsPage = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data } = await api.get('/slots');
        setSlots(data.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load parking slots.');
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  if (loading) return <p className="text-slate-400">Loading parking slots...</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {slots.map((slot) => {
        const status = slot.status || 'available';
        const isAvailable = status === 'available';
        return (
          <div key={slot._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Slot {slot.slotNumber}</h3>
              <span className={`rounded-full px-3 py-1 text-sm ${isAvailable ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-600/20 text-amber-400'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-400">{slot.parkingArea?.name || 'Unassigned area'} &bull; {slot.vehicleTypeAllowed || 'car'}</p>
          </div>
        );
      })}
      {!slots.length && <p className="text-slate-400">No parking slots found.</p>}
    </div>
  );
};

export default SlotsPage;
