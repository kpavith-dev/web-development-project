import React from 'react';
import Card3D from './Card3D';

/**
 * StatCard - Premium SaaS 3D KPI / Metric Display Card
 *
 * Displays high-contrast metrics, illuminated icon containers, trend comparisons,
 * and loading skeletons for dashboard analytics.
 */
const StatCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  changePeriod,
  icon,
  glow = 'cyan',
  loading = false,
  subtitle,
  className = '',
  onClick,
  ...props
}) => {
  // Glow accents for icon badge
  const iconGlowStyles = {
    none: 'bg-card text-text-secondary border-white/10',
    cyan: 'bg-cyan-950/50 text-cyan-accent border-cyan-500/40 shadow-[0_0_15px_-2px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]',
    blue: 'bg-primary-950/50 text-primary-400 border-primary-500/40 shadow-[0_0_15px_-2px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]',
  }[glow] || 'bg-cyan-950/50 text-cyan-accent border-cyan-500/40';

  // Trend badge styles
  const trendStyles = {
    increase: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
    decrease: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
    neutral: 'text-text-secondary bg-slate-800/50 border-slate-700/50',
  }[changeType] || 'text-text-secondary bg-slate-800/50 border-slate-700/50';

  return (
    <Card3D
      interactive={Boolean(onClick)}
      onClick={onClick}
      glow={glow === 'none' ? 'none' : glow}
      className={`p-0 ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Card Label / Title */}
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {title}
          </p>

          {/* Metric Value */}
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800/80 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">
              {value}
            </div>
          )}
        </div>

        {/* Illuminated 3D Icon Container */}
        {icon && (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl backdrop-blur-md transition-transform duration-300 group-hover:scale-105 ${iconGlowStyles}`}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Footer / Trend Indicator / Subtitle */}
      {(change !== undefined || subtitle || loading) && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/5 text-xs text-text-secondary">
          {loading ? (
            <div className="h-4 w-36 animate-pulse rounded bg-slate-800/60" />
          ) : (
            <>
              {change !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${trendStyles}`}
                >
                  {changeType === 'increase' && '↑'}
                  {changeType === 'decrease' && '↓'}
                  {change}
                </span>
              )}
              {changePeriod && <span>{changePeriod}</span>}
              {subtitle && !changePeriod && <span>{subtitle}</span>}
            </>
          )}
        </div>
      )}
    </Card3D>
  );
};

export default StatCard;

