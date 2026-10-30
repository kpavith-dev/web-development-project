import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Sidebar, Navbar } from '../components/layout';

/**
 * MainLayout - Premium 3D Dark SaaS Layout
 *
 * Implements a modern dark glass dashboard shell with responsive sidebar,
 * top navigation bar, real-time notifications dropdown, and fluid content container.
 */
const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/notifications')
      .then(({ data }) => {
        if (isMounted) {
          setNotifications(data.data || []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch {
      /* Keep the current state if syncing fails. */
    }
  };

  const markRead = async (notification) => {
    if (notification.isRead) return;
    try {
      const { data } = await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((current) =>
        current.map((item) => (item._id === notification._id ? data.data : item))
      );
    } catch {
      /* The dropdown remains usable if a notification was removed. */
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas text-text-main overflow-x-hidden">
      {/* Background ambient lighting accents */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(34,211,238,0.06),rgba(255,255,255,0))]" />

      {/* Accessible Mobile Off-Canvas Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-[#04070E]/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden cursor-default"
        />
      )}

      {/* Premium 3D Dark Glass Sidebar */}
      <Sidebar
        user={user}
        mobileOpen={open}
        setMobileOpen={setOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`relative z-10 flex min-h-screen flex-col p-4 sm:p-6 lg:p-8 transition-all duration-300 ease-3d ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        {/* Modern Top Navigation Bar */}
        <Navbar
          user={user}
          logout={logout}
          onOpenMobileMenu={() => setOpen(true)}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markAllRead={markAllRead}
          markRead={markRead}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 min-w-0">{children}</main>

        {/* Premium SaaS System Footer */}
        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-4 pb-2 text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="font-medium text-slate-400">Smart Campus Parking System</span>
            <span>•</span>
            <span className="text-slate-500">v0.1.0-phase1</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Secure Cloud Enclave</span>
            <span>•</span>
            <span className="text-cyan-400/80">3D SaaS Architecture</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
