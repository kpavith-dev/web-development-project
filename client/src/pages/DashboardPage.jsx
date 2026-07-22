import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCar, FaMapMarkedAlt, FaUser, FaClock, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import api from '../services/api';

const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-300',
  confirmed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
  expired: 'bg-slate-700 text-slate-300',
  'checked-in': 'bg-cyan-500/15 text-cyan-300',
  'checked-out': 'bg-slate-700 text-slate-300'
};

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dashboardRes, reservationsRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/reservations')
        ]);
        setDashboard(dashboardRes.data.data || null);
        const today = new Date().toISOString().slice(0, 10);
        setReservations((reservationsRes.data.data || []).filter((item) => item.bookingDate?.slice(0, 10) === today));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const stats = dashboard || {};
  const statCards = [
    { title: 'Total Users', value: stats.totalUsers ?? 0, icon: FaUser, accent: 'from-cyan-500 to-blue-600' },
    { title: 'Parking Areas', value: stats.totalAreas ?? 0, icon: FaMapMarkedAlt, accent: 'from-violet-500 to-purple-600' },
    { title: 'Available Slots', value: stats.availableSlots ?? 0, icon: FaCar, accent: 'from-emerald-500 to-green-600' },
    { title: 'Today Reservations', value: stats.todaysReservations ?? reservations.length, icon: FaClock, accent: 'from-amber-500 to-orange-600' }
  ];
  const utilization = stats.totalSlots ? Math.round(((stats.availableSlots || 0) / stats.totalSlots) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ title, value, icon: Icon, accent }) => (
          <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${accent} p-3`}>
              <Icon className="text-xl" />
            </div>
            <p className="text-slate-400">{title}</p>
            <p className="text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Today&apos;s reservations</h3>
            <span className="text-sm text-slate-400">{reservations.length} active</span>
          </div>
          {reservations.length ? (
            <div className="space-y-3">
              {reservations.slice(0, 6).map((reservation) => (
                <div key={reservation._id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-100">{reservation.slot?.slotNumber || 'Slot pending'}</p>
                    <p className="text-sm text-slate-400">{reservation.arrivalTime} - {reservation.departureTime}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[reservation.status] || statusStyles.expired}`}>
                    {reservation.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              No reservations recorded for today yet.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center gap-2 text-cyan-300">
            <FaCalendarAlt />
            <h3 className="text-lg font-semibold">Parking utilization</h3>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400">Available slots</p>
                <p className="text-4xl font-semibold text-white">{utilization}%</p>
              </div>
              <div className="text-right text-sm text-slate-400">
                <p>{stats.availableSlots ?? 0} available</p>
                <p>{stats.totalSlots ?? 0} total</p>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${utilization}%` }} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <FaCheckCircle className="text-emerald-400" />
              {stats.occupiedSlots ?? 0} slots currently occupied.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
