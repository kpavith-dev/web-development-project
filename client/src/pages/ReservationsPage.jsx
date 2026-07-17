import { useState } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';

const ReservationsPage = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reservations</h2>
          <p className="text-sm text-slate-400">Search, manage, and review parking bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
            <FaSearch className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none" placeholder="Search reservation" />
          </label>
          <button className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 font-semibold">
            <FaPlus /> New Booking
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {[{ id: 'R1001', slot: 'A12', status: 'Confirmed' }, { id: 'R1002', slot: 'B04', status: 'Pending' }, { id: 'R1003', slot: 'C09', status: 'Cancelled' }].map((item) => (
          <div key={item.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{item.id}</p>
              <p className="text-sm text-slate-400">Slot {item.slot}</p>
            </div>
            <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReservationsPage;
