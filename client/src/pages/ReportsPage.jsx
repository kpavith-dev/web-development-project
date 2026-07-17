import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await api.get('/reports');
        setReports(data.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load reports.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <p className="text-slate-400">Loading reports...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {reports.map((report) => (
        <div key={report._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">{`${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report`}</h2>
          <p className="mt-2 text-sm text-slate-400">{report.data?.summary || 'No report summary available.'}</p>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-cyan-600/20 to-slate-900 p-4 text-sm text-slate-300">
            Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'recently'}
          </div>
        </div>
      ))}
      {!reports.length && <p className="text-slate-400">No reports found.</p>}
    </div>
  );
};

export default ReportsPage;
