import { NavLink } from 'react-router-dom';
import { FaHome, FaCar, FaMapMarkedAlt, FaParking, FaShieldAlt, FaChartBar, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: FaHome },
  { label: 'Reservations', path: '/reservations', icon: FaCar },
  { label: 'Areas', path: '/areas', icon: FaMapMarkedAlt },
  { label: 'Slots', path: '/slots', icon: FaParking },
  { label: 'Security', path: '/security', icon: FaShieldAlt },
  { label: 'Reports', path: '/reports', icon: FaChartBar },
  { label: 'Profile', path: '/profile', icon: FaUser }
];

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 w-72 border-r border-slate-800 bg-slate-900/80 p-6 backdrop-blur">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Smart Campus</h1>
          <p className="text-sm text-slate-400">Parking Reservation</p>
        </div>
        <nav className="space-y-2">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="ml-72 p-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Campus Parking Control Center</h2>
            <p className="text-sm text-slate-400">Manage reservations, slots, and analytics in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cyan-600/20 px-4 py-2 text-sm capitalize text-cyan-300">{user?.role || 'User'}</div>
            <button onClick={logout} className="text-sm text-slate-400 transition hover:text-white">Sign out</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
