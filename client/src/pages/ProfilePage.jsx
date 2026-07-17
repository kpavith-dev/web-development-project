import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user: authenticatedUser } = useAuth();
  const [user, setUser] = useState(authenticatedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/users/profile');
        setUser(data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <p className="text-slate-400">Loading profile...</p>;

  const vehicle = [user?.vehicleBrand, user?.vehicleType, user?.vehicleNumber].filter(Boolean).join(' • ') || 'Not provided';
  const fields = [
    ['Name', user?.name],
    ['Registration Number', user?.registrationNumber],
    ['Vehicle', vehicle],
    ['Faculty', user?.faculty],
    ['Department', user?.department],
    ['Phone Number', user?.phoneNumber]
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-xl font-semibold">User Profile</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[fields.slice(0, 3), fields.slice(3)].map((column, index) => (
          <div key={index} className="space-y-3">
            {column.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="font-semibold">{value || 'Not provided'}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;
