import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await register(form);
      toast.success(response.message || 'Registration successful');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold">Create Account</h1>
          <p className="mt-2 text-sm text-slate-400">Join the university parking system.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required autoComplete="name" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="email" required autoComplete="email" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" required minLength="6" autoComplete="new-password" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" placeholder="Password (minimum 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60">
            <FaUserPlus />
            {submitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account? <Link className="text-cyan-400" to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
