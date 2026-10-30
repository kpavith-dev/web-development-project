import React, { useEffect, useRef } from 'react';
import { FaBell, FaCheck } from 'react-icons/fa';
import Badge from '../Badge';

/**
 * NotificationDropdown - Premium 3D Dark SaaS Notification Popover
 *
 * Displays live campus notifications with unread counters, tactile read-state toggles,
 * mark-all-read action, and outside-click auto-dismissal.
 */
const NotificationDropdown = ({
  isOpen,
  onClose,
  notifications = [],
  markAllRead,
  markRead,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0E172B]/95 p-4 shadow-3d-lg backdrop-blur-2xl transition-all duration-200 animate-in fade-in zoom-in-95"
    >
      {/* Top inner bevel highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      {/* Dropdown Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white text-sm">
            Notifications ({unreadCount} unread)
          </p>
          {unreadCount > 0 && (
            <Badge variant="cyan" size="sm" dot>
              {unreadCount} new
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="text-xs font-medium text-cyan-400 transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {notifications.length ? (
          notifications.map((notification) => {
            const isRead = Boolean(notification.isRead);
            return (
              <button
                key={notification._id}
                type="button"
                onClick={() => markRead(notification)}
                className={`group relative w-full rounded-xl p-3 text-left transition-all duration-200 border ${
                  isRead
                    ? 'border-white/[0.04] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:border-white/10'
                    : 'border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-primary-950/30 to-secondary/40 text-slate-200 shadow-[0_0_15px_-4px_rgba(34,211,238,0.2)] hover:border-cyan-400/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium leading-snug ${isRead ? 'text-slate-300' : 'text-white'}`}>
                    {notification.title}
                  </p>
                  {!isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_6px_#22D3EE]" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {notification.message}
                </p>
                {!isRead && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 group-hover:text-cyan-200">
                    <FaCheck className="h-2.5 w-2.5" /> Mark as read
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            <FaBell className="mx-auto mb-2 h-7 w-7 text-slate-600/60" />
            <p>No notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;

