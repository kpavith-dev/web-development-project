import React from 'react';

/**
 * Card3D - Premium SaaS 3D Surface Card
 *
 * Provides a layered dark surface with subtle inner bevel highlights,
 * customizable elevation, optional 3D interactive lift on hover, and glow accents.
 */
const Card3D = ({
  children,
  as: Component = 'div',
  className = '',
  interactive = false,
  elevation = 'md',
  glow = 'none',
  header,
  footer,
  onClick,
  ...props
}) => {
  const isClickable = Boolean(onClick);
  const isInteractive = interactive || isClickable;

  // Elevation styles
  const elevationStyles = {
    flat: 'shadow-none border-white/5',
    sm: 'shadow-3d-sm border-white/5',
    md: 'shadow-3d border-white/10',
    lg: 'shadow-3d-lg border-white/15',
  }[elevation] || 'shadow-3d border-white/10';

  // Glow styles
  const glowStyles = {
    none: '',
    cyan: 'shadow-glow-cyan border-cyan-500/30',
    blue: 'shadow-glow-blue border-blue-500/30',
  }[glow] || '';

  // Interactive hover 3D styles
  const interactiveStyles = isInteractive
    ? 'cursor-pointer transition-all duration-250 ease-bounce-soft hover:-translate-y-1 hover:shadow-3d-hover hover:border-cyan-500/40 active:translate-y-0 active:shadow-3d focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080D1A]'
    : 'transition-shadow duration-200';

  return (
    <Component
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`relative overflow-hidden rounded-2xl bg-gradient-card text-text-main border backdrop-blur-sm ${elevationStyles} ${glowStyles} ${interactiveStyles} ${className}`}
      {...props}
    >
      {/* Subtle top edge highlight bevel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Header Slot */}
      {header && (
        <div className="border-b border-white/5 px-6 py-4">
          {header}
        </div>
      )}

      {/* Content Slot */}
      <div className="p-6">{children}</div>

      {/* Footer Slot */}
      {footer && (
        <div className="border-t border-white/5 bg-secondary/30 px-6 py-4">
          {footer}
        </div>
      )}
    </Component>
  );
};

export default Card3D;

