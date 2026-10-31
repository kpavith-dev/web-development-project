import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCar, FaMapMarkedAlt, FaUser, FaClock, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import api from '../services/api';
import { campusDateKey } from '../utils/campusTime';
import { StatCard, Card3D, Badge } from '../components';

const statusBadgeVariant = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  expired: 'default',
  'checked-in': 'cyan',
  'checked-out': 'default'
};

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const today = campusDateKey();
        const [dashboardRes, reservationsRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/reservations', { params: { date: today, limit: 100 } })
        ]);
        setDashboard(dashboardRes.data.data || null);
        setReservations(reservationsRes.data.data || []);
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
      <div className="space-y-6">
        {/* KPI Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            icon={<FaUser />}
            glow="cyan"
            loading
          />
          <StatCard
            title="Parking Areas"
            icon={<FaMapMarkedAlt />}
            glow="blue"
            loading
          />
          <StatCard
            title="Available Slots"
            icon={<FaCar />}
            glow="cyan"
            loading
          />
          <StatCard
            title="Today Reservations"
            icon={<FaClock />}
            glow="blue"
            loading
          />
        </div>

        {/* Lower Section Skeleton Placeholders to prevent layout shift */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card3D className="min-h-[280px]">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 rounded-lg bg-slate-800/80" />
                <div className="h-4 w-16 rounded bg-slate-800/60" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-14 rounded-xl bg-slate-800/50" />
                <div className="h-14 rounded-xl bg-slate-800/50" />
                <div className="h-14 rounded-xl bg-slate-800/50" />
              </div>
            </div>
          </Card3D>
          <Card3D className="min-h-[280px]">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-slate-800/80" />
                <div className="h-6 w-40 rounded-lg bg-slate-800/80" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="h-28 rounded-xl bg-slate-800/50" />
                <div className="h-28 rounded-xl bg-slate-800/50" />
              </div>
              <div className="h-4 w-64 rounded bg-slate-800/60 pt-2" />
            </div>
          </Card3D>
        </div>
      </div>
    );
  }

  const stats = dashboard || {};
  const statCards = [
    { title: 'Total Users', value: stats.totalUsers ?? 0, icon: <FaUser />, glow: 'cyan' },
    { title: 'Parking Areas', value: stats.totalAreas ?? 0, icon: <FaMapMarkedAlt />, glow: 'blue' },
    { title: 'Available Slots', value: stats.availableSlots ?? 0, icon: <FaCar />, glow: 'cyan' },
    { title: 'Today Reservations', value: stats.todaysReservations ?? reservations.length, icon: <FaClock />, glow: 'blue' }
  ];
  const activeSlots = stats.activeSlots ?? ((stats.availableSlots || 0) + (stats.occupiedSlots || 0) + (stats.reservedSlots || 0) + (stats.maintenanceSlots || 0));
  const availability = activeSlots ? Math.round(((stats.availableSlots || 0) / activeSlots) * 100) : 0;
  const utilization = activeSlots ? Math.round((((stats.occupiedSlots || 0) + (stats.reservedSlots || 0)) / activeSlots) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 3D KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon, glow }) => (
          <StatCard
            key={title}
            title={title}
            value={value}
            icon={icon}
            glow={glow}
            className="group transition-all duration-200 hover:border-white/20"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Today's Reservations Panel */}
        <Card3D className="flex flex-col justify-between" elevation="md">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight text-text-main">
                Today&apos;s reservations
              </h3>
              <Badge variant="default" size="sm" className="font-medium text-text-secondary">
                {reservations.length} Today
              </Badge>
            </div>

            {reservations.length ? (
              <div className="space-y-3">
                {reservations.slice(0, 6).map((reservation) => (
                  <div
                    key={reservation._id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-canvas-subtle/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-cyan-500/30 hover:bg-card-hover/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-main text-sm sm:text-base">
                        {reservation.slot?.slotNumber || 'Slot pending'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
                        <FaClock className="h-3 w-3 shrink-0 text-cyan-400/80" />
                        <span>
                          {reservation.arrivalTime} - {reservation.departureTime}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={statusBadgeVariant[reservation.status] || 'default'}
                      dot
                      size="sm"
                      className="capitalize shrink-0"
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-canvas-subtle/40 px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-secondary/80 text-text-muted shadow-inner-depth">
                  <FaClock className="text-xl text-text-muted" />
                </div>
                <p className="text-sm font-medium text-text-secondary">
                  No reservations recorded for today yet.
                </p>
              </div>
            )}
          </div>
        </Card3D>

        {/* Current Slot Status Panel */}
        <Card3D className="flex flex-col justify-between" elevation="md">
          <div>
            <div className="mb-4 flex items-center gap-2.5 text-cyan-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-accent shadow-[0_0_12px_-2px_rgba(34,211,238,0.3)]">
                <FaCalendarAlt className="text-sm" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-text-main">
                Current slot status
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-xl border border-white/5 bg-canvas-subtle/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-cyan-500/20">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
                <div className="mb-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Availability
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
                      {availability}%
                    </p>
                  </div>
                  <p className="text-right text-xs sm:text-sm font-medium text-text-secondary">
                    {stats.availableSlots ?? 0} of {activeSlots} active slots
                  </p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas-deep border border-white/5 shadow-inner-depth p-[1px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.35)] transition-all duration-500"
                    style={{ width: `${availability}%` }}
                  />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-white/5 bg-canvas-subtle/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-blue-500/20">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
                <div className="mb-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Utilization
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
                      {utilization}%
                    </p>
                  </div>
                  <p className="text-right text-xs sm:text-sm font-medium text-text-secondary">
                    {(stats.occupiedSlots ?? 0) + (stats.reservedSlots ?? 0)} occupied or reserved
                  </p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas-deep border border-white/5 shadow-inner-depth p-[1px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.35)] transition-all duration-500"
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 pt-3 border-t border-white/5 text-xs sm:text-sm text-text-secondary">
            <FaCheckCircle className="h-4 w-4 shrink-0 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            <span>Utilization counts active slots that are occupied or reserved.</span>
          </div>
        </Card3D>
      </div>
    </div>
  );
};

export default DashboardPage;
