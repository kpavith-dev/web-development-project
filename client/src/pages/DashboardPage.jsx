import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCar, FaMapMarkedAlt, FaUser, FaClock, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/dashboard');
        setDashboard(data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <p className="text-slate-400">Loading dashboard...</p>;

  const stats = dashboard || {};
  const statCards = [
    { title: 'Total Users', value: stats.totalUsers ?? 0, icon: FaUser, accent: 'from-cyan-500 to-blue-600' },
    { title: 'Parking Areas', value: stats.totalAreas ?? 0, icon: FaMapMarkedAlt, accent: 'from-violet-500 to-purple-600' },
    { title: 'Available Slots', value: stats.availableSlots ?? 0, icon: FaCar, accent: 'from-emerald-500 to-green-600' },
    { title: 'Today Reservations', value: stats.todaysReservations ?? 0, icon: FaClock, accent: 'from-amber-500 to-orange-600' }
  ];
  const utilization = stats.totalSlots ? Math.round(((stats.occupiedSlots || 0) / stats.totalSlots) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ title, value, icon: Icon, accent }) => (
          <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${accent} p-3`}><Icon className="text-xl" /></div>
            <p className="text-slate-400">{title}</p>
            <p className="text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-4 text-lg font-semibold">Today's Reservations</h3>
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <span>{stats.todaysReservations ?? 0} reservations</span>
            <span className="flex items-center gap-2 text-emerald-400"><FaCheckCircle /> Recorded</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-4 text-lg font-semibold">Parking Utilization</h3>
          <div className="h-48 rounded-xl bg-gradient-to-br from-cyan-600/20 to-slate-900 p-6">
            <p className="text-sm text-slate-400">Live overview</p>
            <p className="mt-3 text-4xl font-semibold">{utilization}%</p>
            <p className="mt-2 text-slate-500">Peak hours: {(stats.peakParkingHours || []).join(' - ') || 'Not available'}.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
