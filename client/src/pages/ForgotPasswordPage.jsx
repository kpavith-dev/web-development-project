import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { Card3D, Input, Button, Badge } from '../components';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to request a reset link.');
    } finally {
      setSending(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Reset your password</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your email and we&apos;ll send a reset link if an eligible account exists.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-5 shadow-[0_0_20px_-3px_rgba(16,185,129,0.25)] backdrop-blur-sm animate-fadeIn">
            <div className="mb-2">
              <Badge variant="success" dot size="sm">
                Request Sent
              </Badge>
            </div>
            <p className="text-sm font-medium leading-relaxed text-emerald-200">
              If an account exists for that email, a reset link has been sent.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              aria-label="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              leftIcon={<FaEnvelope className="text-text-muted" />}
            />
            <Button
              type="submit"
              fullWidth
              variant="primary"
              size="lg"
              disabled={sending}
              loading={sending}
              loadingText="Sending…"
              leftIcon={<FaPaperPlane />}
            >
              Send reset link
            </Button>
          </form>
        )}

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

export default ForgotPasswordPage;
