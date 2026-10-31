import { useEffect, useState } from 'react';
import { FaCar, FaCheck, FaChevronLeft, FaChevronRight, FaPowerOff, FaTimes, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { Card3D, Input, Select, Badge, Button } from '../components';

const verificationStatusOptions = [
  { value: '', label: 'All verification statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const vehicleTypeOptions = [
  { value: '', label: 'All vehicle types' },
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'ev', label: 'EV' },
];

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: 10,
        ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {})
      };
      const { data } = await api.get('/vehicles/admin', { params });
      setVehicles(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: data.data?.length || 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const approve = async (id) => {
    if (!window.confirm('Approve this vehicle for reservations?')) return;
    try {
      await api.patch(`/vehicles/${id}/verify`);
      toast.success('Vehicle approved.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not approve vehicle.');
    }
  };

  const reject = async () => {
    if (!reason.trim()) return toast.info('Enter a rejection reason.');
    try {
      await api.patch(`/vehicles/${rejecting}/reject`, { rejectionReason: reason });
      toast.success('Vehicle rejected.');
      setRejecting(null);
      setReason('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reject vehicle.');
    }
  };

  const toggleActive = async (vehicle) => {
    if (!window.confirm(`${vehicle.isActive ? 'Deactivate' : 'Activate'} ${vehicle.vehicleNumber}?`)) return;
    try {
      await api.patch(`/vehicles/${vehicle._id}/active`, { isActive: !vehicle.isActive });
      toast.success('Vehicle status updated.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update vehicle.');
    }
  };

  const badgeStyles = (vehicle) => {
    if (!vehicle.isActive) {
      return 'bg-rose-950/70 text-rose-300 border-rose-500/40 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]';
    }
    switch (vehicle.verificationStatus) {
      case 'verified':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]';
      case 'rejected':
        return 'bg-rose-950/70 text-rose-300 border-rose-500/40 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]';
      case 'pending':
      default:
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]';
    }
  };

  const badgeDotStyles = (vehicle) => {
    if (!vehicle.isActive) {
      return 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]';
    }
    switch (vehicle.verificationStatus) {
      case 'verified':
        return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]';
      case 'rejected':
        return 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]';
      case 'pending':
      default:
        return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium 3D Page Header & Filter Section */}
      <Card3D elevation="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* 3D Glowing Vehicle Emblem */}
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-cyan-500 p-0.5 shadow-glow-cyan-sm">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0A1020]/80 backdrop-blur-sm">
                <FaCar className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Vehicle verification
                </h1>
                <span className="hidden sm:inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
              </div>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
                Review submitted vehicle identities and control reservation eligibility.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Search vehicle number or model"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
            leftIcon={<FaSearch className="text-text-muted text-sm" />}
            aria-label="Search vehicle number or model"
          />
          <Select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}
            options={verificationStatusOptions}
            aria-label="Filter by verification status"
          />
          <Select
            value={filters.type}
            onChange={(event) => setFilters({ ...filters, type: event.target.value, page: 1 })}
            options={vehicleTypeOptions}
            aria-label="Filter by vehicle type"
          />
        </div>
      </Card3D>

      {/* Main Table Content Container */}
      <Card3D
        elevation="md"
        footer={
          pagination && pagination.total !== undefined ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-400 w-full">
              <span className="font-medium text-slate-400">
                <span className="font-semibold text-white">{pagination.total}</span> vehicles
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Previous page"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  leftIcon={<FaChevronLeft className="h-3 w-3" />}
                  className="h-8 w-8 !p-0 border-white/10"
                />
                <span className="px-2 text-xs sm:text-sm font-medium text-slate-400">
                  Page <span className="font-semibold text-white">{pagination.page}</span> of{' '}
                  <span className="font-semibold text-white">{pagination.totalPages || 1}</span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Next page"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  leftIcon={<FaChevronRight className="h-3 w-3" />}
                  className="h-8 w-8 !p-0 border-white/10"
                />
              </div>
            </div>
          ) : null
        }
      >
        <div className="-m-6 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-white/10 bg-secondary/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Vehicle / owner</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
                      <span className="text-sm font-medium text-slate-300">Loading vehicles…</span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length ? (
                vehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="border-b border-white/5 align-top transition-colors hover:bg-white/[0.03] last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-bold tracking-tight text-white text-base">{vehicle.vehicleNumber}</p>
                      <p className="text-sm font-medium text-slate-300 mt-0.5">{vehicle.user?.name || 'Owner unavailable'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{vehicle.user?.email || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Badge variant="cyan" size="sm" className="font-semibold uppercase tracking-wider">
                          {vehicle.vehicleType === 'ev' ? 'EV' : vehicle.vehicleType}
                        </Badge>
                        <span className="font-medium text-white capitalize">
                          {vehicle.vehicleBrand || 'No brand'} {vehicle.model || ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        Registration: <span className="font-mono text-slate-300">{vehicle.registrationNumber || '—'}</span> · Color: <span className="capitalize text-slate-300">{vehicle.color || '—'}</span>
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur-md ${badgeStyles(vehicle)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badgeDotStyles(vehicle)}`} aria-hidden="true" />
                        {!vehicle.isActive ? 'inactive' : vehicle.verificationStatus}
                      </span>
                      {vehicle.rejectionReason && (
                        <p className="mt-2 max-w-xs text-xs text-rose-300 font-medium">{vehicle.rejectionReason}</p>
                      )}
                      {vehicle.verifiedAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          Reviewed {new Date(vehicle.verifiedAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(vehicle.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {vehicle.verificationStatus !== 'verified' && (
                          <Button
                            variant="primary"
                            size="xs"
                            leftIcon={<FaCheck className="h-3 w-3" />}
                            onClick={() => approve(vehicle._id)}
                            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400/40 text-white shadow-3d-sm font-semibold"
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={<FaTimes className="h-3 w-3" />}
                          onClick={() => {
                            setRejecting(vehicle._id);
                            setReason(vehicle.rejectionReason || '');
                          }}
                          className="!border-rose-500/40 !text-rose-300 hover:!bg-rose-500/10 hover:!border-rose-400 font-medium"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          leftIcon={<FaPowerOff className="h-3 w-3" />}
                          onClick={() => toggleActive(vehicle)}
                          className="border-white/10 text-slate-300 hover:text-white hover:border-white/20 font-medium"
                        >
                          {vehicle.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FaCar className="h-8 w-8 text-slate-600 mb-1" />
                      <span className="text-sm font-medium text-slate-400">No vehicles match these filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card3D>

      {/* Rejection Modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-md p-4">
          <section className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#142238] to-[#101A2E] p-6 shadow-2xl text-text-main relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
            <h2 className="text-lg font-semibold tracking-tight text-white">Reject vehicle</h2>
            <p className="mt-1 text-sm text-slate-400">Give the owner a clear reason so they can correct and resubmit it.</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength="500"
              className="input mt-4 min-h-28"
              placeholder="Rejection reason"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setRejecting(null)}
                className="border border-white/10 text-slate-300 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={reject}
                className="font-semibold shadow-3d-sm"
              >
                Reject vehicle
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
