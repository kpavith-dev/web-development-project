import React from 'react';

/**
 * Badge - Premium SaaS Status Badge & Chip
 *
 * Micro-component with glowing status dots, glass borders, and subtle 3D inner bevels.
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className = '',
  ...props
}) => {
  // Size tokens
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  // Variant color definitions
  const variantStyles = {
    default:
      'bg-slate-800/80 text-text-secondary border-slate-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    primary:
      'bg-primary-950/70 text-primary-300 border-primary-500/40 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    cyan:
      'bg-cyan-950/70 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_-2px_rgba(34,211,238,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    info:
      'bg-cyan-950/70 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_-2px_rgba(34,211,238,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    success:
      'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    warning:
      'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    danger:
      'bg-rose-950/70 text-rose-300 border-rose-500/40 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    error:
      'bg-rose-950/70 text-rose-300 border-rose-500/40 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    purple:
      'bg-purple-950/70 text-purple-300 border-purple-500/40 shadow-[0_0_12px_-2px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
  }[variant] || 'bg-slate-800/80 text-text-secondary border-slate-700/60';

  // Status dot colors
  const dotColor = {
    default: 'bg-slate-400',
    primary: 'bg-primary-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]',
    cyan: 'bg-cyan-accent shadow-[0_0_6px_rgba(34,211,238,0.8)]',
    info: 'bg-cyan-accent shadow-[0_0_6px_rgba(34,211,238,0.8)]',
    success: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
    warning: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    danger: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]',
    error: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]',
    purple: 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]',
  }[variant] || 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-md select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
          aria-hidden="true"
        />
      )}

      {/* Icon slot */}
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}

      {/* Badge text */}
      <span>{children}</span>
    </span>
  );
};

export default Badge;

