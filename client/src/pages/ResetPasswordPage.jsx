import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const ResetPasswordPage = () => {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' }); const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); if (!params.get('token')) return toast.error('This reset link is invalid.'); if (form.password.length < 6) return toast.error('Password must be at least 6 characters.'); if (form.password !== form.confirm) return toast.error('Passwords do not match.'); setSaving(true); try { const { data } = await api.post('/auth/reset-password', { token: params.get('token'), password: form.password }); toast.success(data.message || 'Password reset successful.'); navigate('/login', { replace: true }); } catch (error) { toast.error(error.response?.data?.message || 'Unable to reset password.'); } finally { setSaving(false); } };
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4"><div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl"><h1 className="text-2xl font-semibold">Choose a new password</h1><form onSubmit={submit} className="mt-6 space-y-4"><input required type="password" minLength="6" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="input" placeholder="New password" /><input required type="password" minLength="6" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} className="input" placeholder="Confirm new password" /><button disabled={saving} className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Reset password'}</button></form><p className="mt-5 text-center text-sm text-slate-400"><Link to="/login" className="text-cyan-300">Back to sign in</Link></p></div></div>;
};
export default ResetPasswordPage;
