import { useEffect, useState } from 'react';
import { FaCar, FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const blankVehicle = { vehicleNumber: '', vehicleType: 'car', vehicleBrand: '' };

const ProfilePage = () => {
  const { user: sessionUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(sessionUser || {});
  const [vehicles, setVehicles] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      const [profileRes, vehiclesRes] = await Promise.all([api.get('/users/profile'), api.get('/vehicles')]);
      setProfile(profileRes.data.data || {});
      setVehicles(vehiclesRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', profile);
      setProfile(data.data || {});
      updateUser(data.data || {});
      toast.success('Profile updated.');
      setEditingProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const addVehicle = async (event) => {
    event.preventDefault();
    try {
      await api.post('/vehicles', vehicleForm);
      setVehicleForm(blankVehicle);
      toast.success('Vehicle added.');
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add vehicle.');
    }
  };

  const deleteVehicle = async (id) => {
    try {
      await api.delete(`/vehicles/${id}`);
      toast.success('Vehicle removed.');
      setVehicles((current) => current.filter((vehicle) => vehicle._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove vehicle.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">My profile</h1>
            <p className="text-sm text-slate-400">Keep your campus information up to date.</p>
          </div>
          <button onClick={() => setEditingProfile((current) => !current)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300">
            {editingProfile ? 'Cancel' : 'Edit profile'}
          </button>
        </div>

        {editingProfile ? (
          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input required placeholder="Full name" value={profile.name || ''} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="input" />
              <input required type="email" placeholder="Email" value={profile.email || ''} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="input" />
              <select value={profile.role || 'student'} onChange={(event) => setProfile({ ...profile, role: event.target.value })} className="input">
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="staff">Staff</option>
                <option value="security">Security</option>
                <option value="admin">Admin</option>
              </select>
              <input placeholder="Registration number" value={profile.registrationNumber || ''} onChange={(event) => setProfile({ ...profile, registrationNumber: event.target.value })} className="input" />
              <input placeholder="Faculty" value={profile.faculty || ''} onChange={(event) => setProfile({ ...profile, faculty: event.target.value })} className="input" />
              <input placeholder="Department" value={profile.department || ''} onChange={(event) => setProfile({ ...profile, department: event.target.value })} className="input" />
              <input placeholder="Phone number" value={profile.phoneNumber || ''} onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })} className="input" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60">
                <FaSave /> {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Name</p>
                <p className="mt-1 font-semibold">{profile.name || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Email</p>
                <p className="mt-1 font-semibold">{profile.email || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Role</p>
                <p className="mt-1 font-semibold capitalize">{profile.role || 'student'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Registration number</p>
                <p className="mt-1 font-semibold">{profile.registrationNumber || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Faculty</p>
                <p className="mt-1 font-semibold">{profile.faculty || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Department</p>
                <p className="mt-1 font-semibold">{profile.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Phone number</p>
                <p className="mt-1 font-semibold">{profile.phoneNumber || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">My vehicles</h2>
          <p className="mt-1 text-sm text-slate-400">Add or remove your registered vehicles.</p>

          <form onSubmit={addVehicle} className="mt-5 space-y-3">
            <input required placeholder="Vehicle number" value={vehicleForm.vehicleNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleNumber: event.target.value })} className="input" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleType: event.target.value })} className="input">
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="ev">EV</option>
              </select>
              <input placeholder="Vehicle brand" value={vehicleForm.vehicleBrand} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleBrand: event.target.value })} className="input" />
            </div>
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500">
              <FaPlus /> Add vehicle
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          {vehicles.length ? (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div key={vehicle._id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-100">{vehicle.vehicleNumber}</p>
                    <p className="text-sm text-slate-400 capitalize">{vehicle.vehicleType || 'car'} · {vehicle.vehicleBrand || 'No brand'}</p>
                  </div>
                  <button onClick={() => deleteVehicle(vehicle._id)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-rose-300">
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              No vehicles registered yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
