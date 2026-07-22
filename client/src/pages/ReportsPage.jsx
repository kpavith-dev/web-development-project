import { useState } from 'react';
import { FaChartBar, FaClipboardList } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const reportTypes = [
  { key: 'daily', label: 'Daily report' },
  { key: 'weekly', label: 'Weekly report' },
  { key: 'monthly', label: 'Monthly report' }
];

const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loadingType, setLoadingType] = useState('');

  const generateReport = async (type) => {
    setLoadingType(type);
    try {
      const { data } = await api.post('/reports', { type });
      setReport(data.data || null);
      toast.success(`${type} report generated.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to generate report.');
    } finally {
      setLoadingType('');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <FaChartBar />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Analytics reports</h1>
            <p className="text-sm text-slate-400">Generate parking summaries for daily, weekly, or monthly review.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {reportTypes.map(({ key, label }) => (
            <button key={key} onClick={() => generateReport(key)} disabled={loadingType === key} className="rounded-xl border border-slate-700 px-4 py-4 text-left transition hover:border-cyan-500 hover:bg-slate-800 disabled:opacity-60">
              <p className="font-semibold text-slate-100">{label}</p>
              <p className="mt-1 text-sm text-slate-400">Generate snapshot</p>
            </button>
          ))}
        </div>
      </section>

      {report && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center gap-2 text-cyan-300">
            <FaClipboardList />
            <h2 className="text-lg font-semibold">Generated report</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Type</p>
              <p className="mt-1 font-semibold capitalize">{report.type || 'daily'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Generated</p>
              <p className="mt-1 font-semibold">{new Date(report.generatedAt || Date.now()).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Summary</p>
              <p className="mt-1 font-semibold">{report.data?.summary || 'Ready for review'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Report snapshot</p>
              <span className="text-sm text-slate-400">Simple visual summary</span>
            </div>
            <div className="space-y-3">
              {['Reserved', 'Occupied', 'Available'].map((label, index) => {
                const width = [60, 35, 85][index];
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-400">
                      <span>{label}</span>
                      <span>{width}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ReportsPage;
