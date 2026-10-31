import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Card3D, Input, Button } from '../components';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080D1A] px-4 py-12">
      {/* Ambient cyan and blue glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-primary-600/5 blur-[120px]" />

      <Card3D className="relative z-10 w-full max-w-md border-white/10 shadow-3d-lg" elevation="lg">
        {/* 3D Parking Logo & Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-[0_10px_25px_-5px_rgba(34,211,238,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-cyan-300/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-deep/40 backdrop-blur-xs border border-white/20">
              <span className="text-2xl font-black tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                P
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Welcome Back</h1>
          <p className="mt-2 text-sm text-text-secondary">Sign in to manage your parking reservations.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            leftIcon={<FaEnvelope className="text-text-muted" />}
          />
          <Input
            type={showPassword ? 'text' : 'password'}
            required
            minLength="6"
            autoComplete="current-password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            leftIcon={<FaLock className="text-text-muted" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 text-text-muted hover:text-text-main focus:outline-none transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            }
          />
          <Button
            type="submit"
            fullWidth
            variant="primary"
            size="lg"
            disabled={submitting}
            loading={submitting}
            loadingText="Signing In..."
            leftIcon={<FaSignInAlt />}
          >
            Sign In
          </Button>
        </form>

        {/* Footer Navigation */}
        <p className="mt-5 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors" to="/register">
            Register
          </Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors" to="/forgot-password">
            Forgot password?
          </Link>
        </p>
      </Card3D>
    </div>
  );
};

export default LoginPage;
