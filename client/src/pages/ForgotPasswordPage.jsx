import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try { await api.post('/auth/forgot-password', { email }); setSent(true); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to request a reset link.'); }
    finally { setSending(false); }
  };
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4"><div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl"><h1 className="text-2xl font-semibold">Reset your password</h1><p className="mt-2 text-sm text-slate-400">Enter your email and we&apos;ll send a reset link if an eligible account exists.</p>{sent ? <p className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200">If an account exists for that email, a reset link has been sent.</p> : <form onSubmit={submit} className="mt-6 space-y-4"><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="Email address" /><button disabled={sending} className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold disabled:opacity-60">{sending ? 'Sending…' : 'Send reset link'}</button></form>}<p className="mt-5 text-center text-sm text-slate-400"><Link to="/login" className="text-cyan-300">Back to sign in</Link></p></div></div>;
};
export default ForgotPasswordPage;
