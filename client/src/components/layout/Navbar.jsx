import React from 'react';
import { FaBars, FaBell, FaSignOutAlt } from 'react-icons/fa';
import NotificationDropdown from './NotificationDropdown';
import Badge from '../Badge';

/**
 * Navbar - Premium 3D Dark SaaS Top Navigation Bar
 *
 * Provides responsive control center branding, active user pill,
 * real-time notification trigger with badge indicators, and sign-out action.
 */
const Navbar = ({
  user,
  logout,
  onOpenMobileMenu,
  notifications = [],
  showNotifications,
  setShowNotifications,
  markAllRead,
  markRead,
}) => {
  return (
    <header className="relative mb-6 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E172B]/85 px-4 py-3.5 shadow-3d-sm backdrop-blur-xl sm:px-6">
      {/* Top subtle inner bevel highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />

      {/* Left: Mobile Toggle & Page Header */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMobileMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 shadow-3d-sm transition-all duration-200 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95 lg:hidden"
        >
          <FaBars className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Campus Parking Control Center</span>
          </h2>
          <p className="hidden sm:block text-xs text-slate-400 truncate mt-0.5">
            Manage reservations, slots, and analytics in one place.
          </p>
        </div>
      </div>

      {/* Right: User Chip, Notifications, Sign Out */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* User Status Chip */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-secondary/80 px-3.5 py-1.5 shadow-3d-sm backdrop-blur-md">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-white shadow-glow-cyan-sm">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs sm:text-sm font-medium capitalize text-cyan-300">
            {user?.name || 'User'}
          </span>
          <Badge variant="cyan" size="sm" className="hidden md:inline-flex capitalize">
            {user?.role || 'student'}
          </Badge>
        </div>

        {/* Notifications Popover Controller */}
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setShowNotifications((prev) => !prev)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 shadow-3d-sm active:scale-95 ${
              showNotifications
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-glow-cyan-sm'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300'
            }`}
          >
            <FaBell className="h-4 w-4" />
            {notifications.some((notification) => !notification.isRead) && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
            markAllRead={markAllRead}
            markRead={markRead}
          />
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-rose-300 shadow-3d-sm transition-all duration-200 hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-rose-200 hover:shadow-[0_0_15px_-3px_rgba(244,63,94,0.35)] active:scale-95"
        >
          <FaSignOutAlt className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

