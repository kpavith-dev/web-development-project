const ReportsPage = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold">Daily Report</h2>
        <p className="mt-2 text-sm text-slate-400">Reservations, occupancy, and utilization summary.</p>
        <div className="mt-4 h-40 rounded-xl bg-gradient-to-br from-cyan-600/20 to-slate-900" />
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold">Monthly Report</h2>
        <p className="mt-2 text-sm text-slate-400">Monthly trend analysis and peak hours.</p>
        <div className="mt-4 h-40 rounded-xl bg-gradient-to-br from-violet-600/20 to-slate-900" />
      </div>
    </div>
  );
};

export default ReportsPage;
