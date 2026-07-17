import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await login(form);
      toast.success(response.message || 'Login successful');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage your parking reservations.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required autoComplete="email" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" required minLength="6" autoComplete="current-password" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60">
            <FaSignInAlt />
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Don&apos;t have an account? <Link className="text-cyan-400" to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
