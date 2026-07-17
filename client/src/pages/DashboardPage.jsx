import { FaCar, FaMapMarkedAlt, FaUser, FaClock, FaCheckCircle } from 'react-icons/fa';

const statCards = [
  { title: 'Total Users', value: '248', icon: FaUser, accent: 'from-cyan-500 to-blue-600' },
  { title: 'Parking Areas', value: '6', icon: FaMapMarkedAlt, accent: 'from-violet-500 to-purple-600' },
  { title: 'Available Slots', value: '84', icon: FaCar, accent: 'from-emerald-500 to-green-600' },
  { title: 'Today Reservations', value: '37', icon: FaClock, accent: 'from-amber-500 to-orange-600' }
];

const DashboardPage = () => {
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-4 text-lg font-semibold">Today's Reservations</h3>
          <div className="space-y-3">
            {['A12 - Student Parking', 'B04 - Staff Parking', 'C09 - Visitor Parking'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <span>{item}</span>
                <span className="flex items-center gap-2 text-emerald-400"><FaCheckCircle /> Confirmed</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-4 text-lg font-semibold">Parking Utilization</h3>
          <div className="h-48 rounded-xl bg-gradient-to-br from-cyan-600/20 to-slate-900 p-6">
            <p className="text-sm text-slate-400">Live overview</p>
            <p className="mt-3 text-4xl font-semibold">72%</p>
            <p className="mt-2 text-slate-500">Peak hours expected between 08:00 - 10:00.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
