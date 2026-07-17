const AreasPage = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[
        { name: 'Zone A', slots: 40, available: 18, desc: 'Primary student parking' },
        { name: 'Zone B', slots: 25, available: 12, desc: 'Staff and lecturer parking' },
        { name: 'Zone C', slots: 20, available: 6, desc: 'Visitor and event parking' }
      ].map((area) => (
        <div key={area.name} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold">{area.name}</h3>
          <p className="mt-2 text-sm text-slate-400">{area.desc}</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Total Slots</span>
            <span className="font-semibold">{area.slots}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Available</span>
            <span className="font-semibold text-emerald-400">{area.available}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AreasPage;
