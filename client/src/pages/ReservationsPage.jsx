import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { FaStar, FaFileDownload } from 'react-icons/fa';
import api from '../services/api';

const statusStyle = { available: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', reserved: 'bg-amber-500/20 text-amber-300 border-amber-500/40', occupied: 'bg-rose-500/20 text-rose-300 border-rose-500/40', maintenance: 'bg-slate-700 text-slate-300 border-slate-600' };

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const load = async () => {
    try {
      const [reservationResponse, slotResponse] = await Promise.all([api.get('/reservations'), api.get('/slots')]);
      setReservations(reservationResponse.data.data); setSlots(slotResponse.data.data);
    } catch { toast.error('Unable to load reservation information.'); }
  };
  useEffect(() => {
    load();
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socket.on('slot:updated', (slot) => setSlots((items) => items.map((item) => item._id === slot._id ? { ...item, ...slot } : item)));
    return () => socket.disconnect();
  }, []);
  const action = async (reservation, type) => {
    try { await api.post(`/reservations/${reservation._id}/${type}`); toast.success(`Successfully checked ${type === 'check-in' ? 'in' : 'out'}.`); load(); } catch (error) { toast.error(error.response?.data?.message || 'Action could not be completed.'); }
  };
  const receipt = (reservation) => {
    const popup = window.open('', '_blank');
    popup.document.write(`<title>Parking receipt</title><h1>Smart Campus Parking</h1><h2>Reservation receipt</h2><p>Reference: ${reservation.reservationId}</p><p>Slot: ${reservation.slot?.slotNumber || '-'}</p><p>Date: ${new Date(reservation.bookingDate).toLocaleDateString()}</p><p>${reservation.arrivalTime} – ${reservation.departureTime}</p><p>Status: ${reservation.status}</p><script>window.print()</script>`);
    popup.document.close();
  };
  const submitFeedback = async () => {
    if (!selected || !rating) return toast.info('Select a rating first.');
    try { await api.post('/feedback', { reservation: selected._id, rating }); toast.success('Thanks for your feedback!'); setRating(0); } catch (error) { toast.error(error.response?.data?.message || 'Could not send feedback.'); }
  };
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Live parking map</h2><p className="text-sm text-slate-400">Updates automatically as vehicles check in and out.</p></div><div className="flex gap-2 text-xs">{Object.keys(statusStyle).map((key) => <span key={key} className={`rounded-full border px-2 py-1 capitalize ${statusStyle[key]}`}>{key}</span>)}</div></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">{slots.map((slot) => <div key={slot._id} className={`rounded-xl border p-3 text-center ${statusStyle[slot.status] || statusStyle.available}`}><p className="font-bold">{slot.slotNumber}</p><p className="text-[10px] uppercase">{slot.status}</p></div>)}</div></section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold">My reservations</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{reservations.map((reservation) => <article key={reservation._id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex justify-between"><div><p className="font-semibold">{reservation.slot?.slotNumber || 'Parking slot'}</p><p className="text-sm text-slate-400">{new Date(reservation.bookingDate).toLocaleDateString()} · {reservation.arrivalTime}–{reservation.departureTime}</p></div><span className="capitalize text-cyan-300">{reservation.status}</span></div><div className="mt-4 flex flex-wrap items-center gap-2"><button onClick={() => setSelected(reservation)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">Show QR</button>{['pending', 'confirmed'].includes(reservation.status) && <button onClick={() => action(reservation, 'check-in')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm">Check in</button>}{reservation.status === 'checked-in' && <button onClick={() => action(reservation, 'check-out')} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm">Check out</button>}<button onClick={() => receipt(reservation)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm"><FaFileDownload /> Receipt</button></div></article>)}</div></section>
    {selected && <section className="rounded-2xl border border-cyan-500/40 bg-slate-900 p-6"><div className="flex flex-wrap items-center gap-6"><QRCodeSVG value={selected.qrCode || selected.reservationId} size={140} bgColor="transparent" fgColor="#e2e8f0" /><div><h3 className="text-lg font-semibold">Check-in QR</h3><p className="text-sm text-slate-400">Present this code at the parking entrance.</p><div className="mt-4 flex gap-1">{[1,2,3,4,5].map((value) => <button key={value} onClick={() => setRating(value)} className={value <= rating ? 'text-amber-400' : 'text-slate-600'}><FaStar /></button>)}</div><button onClick={submitFeedback} className="mt-2 text-sm text-cyan-300">Submit feedback</button></div></div></section>}
  </div>;
}
