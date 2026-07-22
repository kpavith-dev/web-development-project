import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { FaHome, FaCar, FaMapMarkedAlt, FaParking, FaShieldAlt, FaChartBar, FaUser, FaBars, FaBell, FaSignOutAlt } from 'react-icons/fa';
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

const roleNavMap = {
  student: ['/dashboard', '/reservations', '/areas', '/slots', '/profile'],
  lecturer: ['/dashboard', '/reservations', '/areas', '/slots', '/profile'],
  staff: ['/dashboard', '/reservations', '/areas', '/slots', '/profile'],
  security: ['/dashboard', '/security', '/profile'],
  admin: ['/dashboard', '/reservations', '/areas', '/slots', '/security', '/reports', '/profile']
};

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const visibleItems = navItems.filter((item) => (roleNavMap[user?.role] || roleNavMap.student).includes(item.path));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-800 bg-slate-900/95 p-6 backdrop-blur transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Smart Campus</h1>
          <p className="text-sm text-slate-400">Parking reservation control</p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">Signed in as</p>
          <p className="mt-1 font-semibold text-white">{user?.name || 'Campus user'}</p>
          <p className="text-sm capitalize text-cyan-300">{user?.role || 'student'}</p>
        </div>

        <nav className="space-y-2">
          {visibleItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
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

      <div className="p-4 lg:ml-72 lg:p-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-700 p-2 lg:hidden"><FaBars /></button>
            <div>
              <h2 className="text-xl font-semibold">Campus Parking Control Center</h2>
              <p className="text-sm text-slate-400">Manage reservations, slots, and analytics in one place.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cyan-600/20 px-4 py-2 text-sm capitalize text-cyan-300">{user?.name || 'User'}</div>
            <button className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300">
              <FaBell />
            </button>
            <button onClick={logout} className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-500 hover:text-rose-300">
              <FaSignOutAlt /> Sign out
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
};

export default MainLayout;
