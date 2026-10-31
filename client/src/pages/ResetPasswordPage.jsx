import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { Card3D, Input, Button } from '../components';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!params.get('token')) return toast.error('This reset link is invalid.');
    if (form.password.length < 6 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      return toast.error('Password must contain at least 6 characters, including uppercase, lowercase and a number.');
    }
    if (form.password !== form.confirm) return toast.error('Passwords do not match.');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token: params.get('token'), password: form.password });
      toast.success(data.message || 'Password reset successful.');
      navigate('/login', { replace: true });
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        backendErrors.forEach((err) => {
          const msg = typeof err === 'string' ? err : err?.message || err?.msg;
          if (msg) toast.error(msg);
        });
      } else {
        toast.error(error.response?.data?.message || 'Unable to reset password.');
      }
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Choose a new password</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Create a new, strong password to secure your account.
          </p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              minLength="6"
              autoComplete="new-password"
              placeholder="New password"
              aria-label="New password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
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
            <p className="mt-1.5 text-xs text-text-muted">
              Password must contain at least 6 characters, including uppercase, lowercase and a number.
            </p>
          </div>

          <Input
            type={showConfirm ? 'text' : 'password'}
            required
            minLength="6"
            autoComplete="new-password"
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            value={form.confirm}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
            leftIcon={<FaLock className="text-text-muted" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="p-1 text-text-muted hover:text-text-main focus:outline-none transition-colors"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            }
          />

          <Button
            type="submit"
            fullWidth
            variant="primary"
            size="lg"
            disabled={saving}
            loading={saving}
            loadingText="Saving…"
            leftIcon={<FaCheckCircle />}
          >
            Reset password
          </Button>
        </form>

        {/* Footer Navigation */}
        <p className="mt-5 text-center text-sm text-text-secondary">
          <Link
            to="/login"
            className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </Card3D>
    </div>
  );
};

export default ResetPasswordPage;
