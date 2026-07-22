import { useEffect, useState } from 'react';
import { FaCalendarPlus, FaQrcode, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const todayString = () => new Date().toISOString().slice(0, 10);

const initialForm = () => ({
  slot: '',
  bookingDate: todayString(),
  arrivalTime: '08:00',
  departureTime: '10:00'
});

const statusClasses = {
  pending: 'bg-amber-500/15 text-amber-300',
  confirmed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
  expired: 'bg-slate-700 text-slate-300',
  'checked-in': 'bg-cyan-500/15 text-cyan-300',
  'checked-out': 'bg-slate-700 text-slate-300'
};

const ReservationsPage = () => {
  const [form, setForm] = useState(initialForm);
  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReservations = async () => {
    setLoadingReservations(true);
    try {
      const { data } = await api.get('/reservations');
      setReservations(data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load reservations.');
    } finally {
      setLoadingReservations(false);
    }
  };

  const loadSlots = async () => {
    if (!form.bookingDate || !form.arrivalTime || !form.departureTime) return;
    setLoadingSlots(true);
    try {
      const { data } = await api.get('/slots', {
        params: {
          date: form.bookingDate,
          arrivalTime: form.arrivalTime,
          departureTime: form.departureTime
        }
      });
      setSlots(data.data || []);
    } catch (error) {
      setSlots([]);
      toast.error(error.response?.data?.message || 'Unable to load available slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    loadSlots();
  }, [form.bookingDate, form.arrivalTime, form.departureTime]);

  const reserve = async (event) => {
    event.preventDefault();
    if (!form.slot) {
      toast.error('Select an available slot first.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reservations', form);
      toast.success('Reservation created successfully.');
      setShowForm(false);
      setForm(initialForm());
      await Promise.all([loadReservations(), loadSlots()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reservation could not be created.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelReservation = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await api.delete(`/reservations/${id}`);
      toast.success('Reservation cancelled.');
      loadReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not cancel reservation.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><FaCalendarPlus /></span>
            <div>
              <h1 className="text-xl font-semibold">Reservations</h1>
              <p className="text-sm text-slate-400">Book a slot, view your QR pass, and manage future visits.</p>
            </div>
          </div>
          <button onClick={() => setShowForm((current) => !current)} className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500">
            {showForm ? 'Close form' : 'New reservation'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={reserve} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Booking date</label>
                <input type="date" min={todayString()} value={form.bookingDate} onChange={(event) => setForm({ ...form, bookingDate: event.target.value, slot: '' })} className="input" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Arrival time</label>
                <input type="time" value={form.arrivalTime} onChange={(event) => setForm({ ...form, arrivalTime: event.target.value, slot: '' })} className="input" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Departure time</label>
                <input type="time" value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value, slot: '' })} className="input" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Available slot</label>
                {loadingSlots ? (
                  <div className="flex h-[48px] items-center justify-center rounded-xl border border-slate-700 text-sm text-slate-400">Checking availability...</div>
                ) : (
                  <select value={form.slot} onChange={(event) => setForm({ ...form, slot: event.target.value })} className="input" required>
                    <option value="">Select slot</option>
                    {slots.map((slot) => (
                      <option key={slot._id} value={slot._id}>{slot.slotNumber} · {slot.parkingArea?.name || 'Campus area'}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={submitting} className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60">
                {submitting ? 'Creating...' : 'Confirm reservation'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">My reservations</h2>
            <p className="text-sm text-slate-400">Track status, cancellation, and QR access.</p>
          </div>
        </div>

        {loadingReservations ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span>Loading reservations...</span>
            </div>
          </div>
        ) : reservations.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {reservations.map((reservation) => (
              <article key={reservation._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Reservation</p>
                    <p className="font-semibold text-slate-100">{reservation.reservationId}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[reservation.status] || statusClasses.expired}`}>
                    {reservation.status}
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <span className="text-slate-400">Slot</span>
                    <span>{reservation.slot?.slotNumber || 'Pending allocation'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <span className="text-slate-400">Date</span>
                    <span>{new Date(reservation.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <span className="text-slate-400">Time</span>
                    <span>{reservation.arrivalTime} - {reservation.departureTime}</span>
                  </div>
                </div>

                {reservation.qrCode && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-cyan-300">
                      <FaQrcode />
                      <span className="text-sm">QR code</span>
                    </div>
                    <img src={reservation.qrCode} alt="Reservation QR" className="h-24 w-24 rounded-lg border border-slate-700 bg-white p-1" />
                  </div>
                )}

                {['pending', 'confirmed'].includes(reservation.status) && (
                  <button onClick={() => cancelReservation(reservation._id)} className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/40 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10">
                    <FaTimes /> Cancel reservation
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-400">
            No reservations found yet. Create your first booking to get started.
          </div>
        )}
      </section>
    </div>
  );
};

export default ReservationsPage;
