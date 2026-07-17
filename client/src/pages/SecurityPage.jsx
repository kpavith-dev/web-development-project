import { FaQrcode, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';

const SecurityPage = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold">QR Verification</h2>
        <p className="mt-2 text-sm text-slate-400">Scan reservation QR codes and verify entry or exit.</p>
        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-10 text-center">
          <FaQrcode className="mx-auto text-6xl text-cyan-400" />
          <p className="mt-4 text-slate-400">Camera scanner ready for deployment.</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold">Today's Access</h3>
          <div className="mt-4 space-y-3">
            {['R1001', 'R1003'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <span>{item}</span>
                <FaCheckCircle className="text-emerald-400" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold">Security Actions</h3>
          <div className="mt-4 flex gap-3">
            <button className="rounded-xl bg-emerald-600 px-4 py-2">Approve Entry</button>
            <button className="rounded-xl bg-amber-600 px-4 py-2">Approve Exit</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
