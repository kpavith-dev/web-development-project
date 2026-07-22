import { useEffect, useState } from 'react';
import { FaQrcode, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const SecurityPage = () => {
  const [reservationId, setReservationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      const { data } = await api.get('/reservations');
      const today = new Date().toISOString().slice(0, 10);
      setReservations((data.data || []).filter((item) => item.bookingDate?.slice(0, 10) === today));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load today\'s reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const submit = async (action) => {
    if (!reservationId.trim()) {
      toast.info('Enter a reservation reference first.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post(`/security/${action === 'check-in' ? 'check-in' : 'check-out'}`, { reservationId: reservationId.trim() });
      setResult(data.data || null);
      toast.success(data.message || `${action === 'check-in' ? 'Check-in' : 'Check-out'} approved.`);
      loadReservations();
    } catch (error) {
      setResult(null);
      toast.error(error.response?.data?.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
            <FaQrcode />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Entry & exit verification</h1>
            <p className="text-sm text-slate-400">Approve check-in or check-out using a reservation reference.</p>
          </div>
        </div>

        <label className="mt-8 block text-sm text-slate-300">Reservation ID</label>
        <input autoFocus value={reservationId} onChange={(event) => setReservationId(event.target.value)} placeholder="e.g. RES-1720000000000" className="input mt-2" />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button disabled={busy} onClick={() => submit('check-in')} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold transition hover:bg-emerald-500 disabled:opacity-60">
            <FaSignInAlt /> Approve entry
          </button>
          <button disabled={busy} onClick={() => submit('check-out')} className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-semibold transition hover:bg-amber-500 disabled:opacity-60">
            <FaSignOutAlt /> Approve exit
          </button>
        </div>

        {result && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-slate-200">
            <p className="text-slate-400">Latest action</p>
            <p className="mt-1 font-semibold">{result.reservationId}</p>
            <p className="mt-1 capitalize text-emerald-300">{result.status}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold">Today&apos;s reservations</h2>
        <p className="mt-1 text-sm text-slate-400">Monitor the active list for approval.</p>

        {loading ? (
          <div className="mt-5 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 py-8 text-slate-300">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span>Loading reservations...</span>
            </div>
          </div>
        ) : reservations.length ? (
          <div className="mt-5 space-y-3">
            {reservations.map((reservation) => (
              <div key={reservation._id} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-100">{reservation.reservationId}</p>
                    <p className="text-sm text-slate-400">{reservation.slot?.slotNumber || 'Slot pending'} · {reservation.arrivalTime} - {reservation.departureTime}</p>
                  </div>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold capitalize text-cyan-300">{reservation.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            No reservations were found for today.
          </div>
        )}
      </section>
    </div>
  );
};

export default SecurityPage;
