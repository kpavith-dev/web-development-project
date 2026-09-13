import { useEffect, useState } from 'react';
import { FaCar, FaCheck, FaPowerOff, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/vehicles/admin'); setVehicles(data.data || []); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to load vehicles.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const approve = async (id) => {
    if (!window.confirm('Approve this vehicle for reservations?')) return;
    try { await api.patch(`/vehicles/${id}/verify`); toast.success('Vehicle approved.'); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not approve vehicle.'); }
  };
  const reject = async () => {
    if (!reason.trim()) return toast.info('Enter a rejection reason.');
    try { await api.patch(`/vehicles/${rejecting}/reject`, { rejectionReason: reason }); toast.success('Vehicle rejected.'); setRejecting(null); setReason(''); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not reject vehicle.'); }
  };
  const toggleActive = async (vehicle) => {
    if (!window.confirm(`${vehicle.isActive ? 'Deactivate' : 'Activate'} ${vehicle.vehicleNumber}?`)) return;
    try { await api.patch(`/vehicles/${vehicle._id}/active`, { isActive: !vehicle.isActive }); toast.success('Vehicle status updated.'); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not update vehicle.'); }
  };
  const badge = (vehicle) => !vehicle.isActive ? 'bg-rose-500/15 text-rose-300' : vehicle.verificationStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-300' : vehicle.verificationStatus === 'rejected' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300';

  return <div className="space-y-6"><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><FaCar /></span><div><h1 className="text-xl font-semibold">Vehicle verification</h1><p className="text-sm text-slate-400">Review submitted vehicle identities and control reservation eligibility.</p></div></div></section><section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400"><tr><th className="p-4">Vehicle / owner</th><th className="p-4">Details</th><th className="p-4">Verification</th><th className="p-4">Submitted</th><th className="p-4">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading vehicles…</td></tr> : vehicles.length ? vehicles.map((vehicle) => <tr key={vehicle._id} className="border-b border-slate-800 align-top last:border-0"><td className="p-4"><p className="font-semibold">{vehicle.vehicleNumber}</p><p className="text-slate-400">{vehicle.user?.name || 'Owner unavailable'}</p><p className="text-slate-500">{vehicle.user?.email || ''}</p></td><td className="p-4 text-slate-300"><p className="capitalize">{vehicle.vehicleType} · {vehicle.vehicleBrand || 'No brand'} {vehicle.model || ''}</p><p className="text-slate-400">Registration: {vehicle.registrationNumber || '—'} · {vehicle.color || '—'}</p></td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge(vehicle)}`}>{!vehicle.isActive ? 'inactive' : vehicle.verificationStatus}</span>{vehicle.rejectionReason && <p className="mt-2 max-w-xs text-xs text-rose-200">{vehicle.rejectionReason}</p>}{vehicle.verifiedAt && <p className="mt-2 text-xs text-slate-500">Reviewed {new Date(vehicle.verifiedAt).toLocaleDateString()}</p>}</td><td className="p-4 text-slate-400">{new Date(vehicle.createdAt).toLocaleDateString()}</td><td className="p-4"><div className="flex gap-2">{vehicle.verificationStatus !== 'verified' && <button onClick={() => approve(vehicle._id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold"><FaCheck className="inline" /> Approve</button>}<button onClick={() => { setRejecting(vehicle._id); setReason(vehicle.rejectionReason || ''); }} className="rounded-lg border border-rose-500/60 px-3 py-2 text-xs text-rose-200"><FaTimes className="inline" /> Reject</button><button onClick={() => toggleActive(vehicle)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200"><FaPowerOff className="inline" /> {vehicle.isActive ? 'Deactivate' : 'Activate'}</button></div></td></tr>) : <tr><td colSpan="5" className="p-8 text-center text-slate-400">No vehicles have been submitted.</td></tr>}</tbody></table></div></section>{rejecting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"><h2 className="text-lg font-semibold">Reject vehicle</h2><p className="mt-1 text-sm text-slate-400">Give the owner a clear reason so they can correct and resubmit it.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength="500" className="input mt-4 min-h-28" placeholder="Rejection reason" /><div className="mt-4 flex justify-end gap-3"><button onClick={() => setRejecting(null)} className="rounded-xl border border-slate-700 px-4 py-2">Cancel</button><button onClick={reject} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold">Reject vehicle</button></div></section></div>}</div>;
};

export default VehiclesPage;
