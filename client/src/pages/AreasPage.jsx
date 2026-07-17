import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const AreasPage = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const { data } = await api.get('/areas');
        setAreas(data.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load parking areas.');
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  if (loading) return <p className="text-slate-400">Loading parking areas...</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {areas.map((area) => (
        <div key={area._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold">{area.name}</h3>
          <p className="mt-2 text-sm text-slate-400">{area.description || 'No description available.'}</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Total Slots</span>
            <span className="font-semibold">{area.totalSlots}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Available</span>
            <span className="font-semibold text-emerald-400">{area.availableSlots}</span>
          </div>
        </div>
      ))}
      {!areas.length && <p className="text-slate-400">No parking areas found.</p>}
    </div>
  );
};

export default AreasPage;
