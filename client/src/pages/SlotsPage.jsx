const SlotsPage = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {['A01', 'A02', 'B01', 'B02', 'C01', 'C02'].map((slot) => (
        <div key={slot} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Slot {slot}</h3>
            <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-sm text-emerald-400">Available</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">Zone A • Car • EV friendly</p>
        </div>
      ))}
    </div>
  );
};

export default SlotsPage;
