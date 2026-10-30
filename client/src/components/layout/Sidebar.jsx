import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaHome,
  FaCalendarAlt,
  FaMapMarkedAlt,
  FaParking,
  FaShieldAlt,
  FaChartBar,
  FaUser,
  FaUsers,
  FaCarSide,
  FaTimes,
  FaChevronRight,
  FaAngleLeft,
  FaAngleRight,
} from 'react-icons/fa';
import Badge from '../Badge';

export const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: FaHome },
  { label: 'Reservations', path: '/reservations', icon: FaCalendarAlt },
  { label: 'Areas', path: '/areas', icon: FaMapMarkedAlt },
  { label: 'Slots', path: '/slots', icon: FaParking },
  { label: 'Security', path: '/security', icon: FaShieldAlt },
  { label: 'Reports', path: '/reports', icon: FaChartBar },
  { label: 'Users', path: '/users', icon: FaUsers },
  { label: 'Vehicles', path: '/vehicles', icon: FaCarSide },
  { label: 'Profile', path: '/profile', icon: FaUser }
];

export const roleNavMap = {
  student: ['/dashboard', '/reservations', '/profile'],
  lecturer: ['/dashboard', '/reservations', '/profile'],
  staff: ['/dashboard', '/reservations', '/profile'],
  security: ['/dashboard', '/security', '/profile'],
  admin: ['/dashboard', '/reservations', '/areas', '/slots', '/security', '/reports', '/users', '/vehicles', '/profile']
};

/**
 * Sidebar - Premium Dark Glass 3D SaaS Navigation Sidebar
 *
 * Supports collapsible desktop states, smooth mobile off-canvas drawer,
 * active indicator glow, tactile user badge, and brand emblem.
 */
const Sidebar = ({
  user,
  mobileOpen,
  setMobileOpen,
  isCollapsed = false,
  setIsCollapsed,
}) => {
  const visibleItems = navItems.filter((item) =>
    (roleNavMap[user?.role] || roleNavMap.student).includes(item.path)
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.08] bg-[#0A1020]/95 p-4 sm:p-5 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.6)] transition-all duration-300 ease-3d lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
      {/* Top subtle glow highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Brand & Logo Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* 3D Glowing Brand Emblem */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-cyan-500 p-0.5 shadow-glow-cyan-sm">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0A1020]/80 backdrop-blur-sm">
              <FaParking className="h-5 w-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </div>
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>Smart Campus</span>
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_6px_#22D3EE]" />
              </h1>
              <p className="text-xs font-medium text-slate-400 truncate">
                Parking reservation control
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
        >
          <FaTimes className="h-4 w-4" />
        </button>
      </div>

      {/* Signed-in User Micro-Card */}
      {!isCollapsed && (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#142238]/80 to-[#101A2E]/90 p-3.5 shadow-3d-sm backdrop-blur-md">
          {/* Top inner bevel highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-white shadow-glow-cyan-sm">
              {(user?.name || 'U').charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#101A2E] bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Signed in as</p>
              <p className="truncate text-sm font-semibold text-white">
                {user?.name || 'Campus user'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2">
            <span className="text-[11px] font-medium text-slate-400">Role</span>
            <Badge variant="cyan" size="sm" dot className="capitalize">
              {user?.role || 'student'}
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto py-1">
        {!isCollapsed && (
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Menu
          </div>
        )}
        {visibleItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 select-none ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600/35 via-cyan-500/20 to-transparent text-white border border-cyan-400/40 shadow-[0_0_20px_-3px_rgba(34,211,238,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05] hover:border-white/10 border border-transparent'
              } ${isCollapsed ? 'justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Left Indicator Bar */}
                {isActive && !isCollapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_#22D3EE]" />
                )}

                {/* Icon with Glowing Filter */}
                <Icon
                  aria-hidden="true"
                  className={`shrink-0 transition-all duration-200 ${
                    isCollapsed ? 'h-5 w-5' : 'h-4 w-4'
                  } ${
                    isActive
                      ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                      : 'text-slate-400 group-hover:text-cyan-300 group-hover:scale-110'
                  }`}
                />

                {/* Label text */}
                {!isCollapsed && (
                  <span className="flex-1 truncate">{label}</span>
                )}

                {/* Active Right Indicator */}
                {isActive && !isCollapsed && (
                  <FaChevronRight
                    aria-hidden="true"
                    className="text-[10px] text-cyan-400/80 transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Desktop Collapse / Expand Toggle Button */}
      {setIsCollapsed && (
        <div className="hidden lg:block pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white active:scale-95"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <FaAngleRight className="h-4 w-4 text-cyan-400" />
            ) : (
              <>
                <FaAngleLeft className="h-4 w-4 text-cyan-400" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

