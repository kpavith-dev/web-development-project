import React from 'react';

/**
 * Button - Premium SaaS 3D Button
 *
 * Provides tactile elevation, responsive press depth, bevel highlights,
 * integrated loading spinner, and diverse variant scales.
 */
const Button = React.forwardRef(
  (
    {
      children,
      type = 'button',
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      disabled = false,
      leftIcon,
      rightIcon,
      icon,
      fullWidth = false,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Size variants
    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 rounded-lg gap-1.5',
      sm: 'text-xs px-3.5 py-1.5 rounded-lg gap-2',
      md: 'text-sm px-5 py-2.5 rounded-xl gap-2.5',
      lg: 'text-base px-6 py-3.5 rounded-xl gap-3',
    }[size] || 'text-sm px-5 py-2.5 rounded-xl gap-2.5';

    // Visual variants
    const variantStyles = {
      primary:
        'bg-gradient-primary text-white shadow-3d-sm hover:shadow-glow-cyan-sm hover:brightness-110 active:shadow-inner-depth border border-cyan-300/30',
      secondary:
        'bg-gradient-to-b from-card to-secondary text-text-main border border-white/10 shadow-3d-sm hover:border-cyan-400/40 hover:bg-card-hover active:shadow-inner-depth',
      cyan:
        'bg-cyan-accent text-canvas font-bold shadow-3d-sm hover:bg-cyan-300 hover:shadow-glow-cyan active:shadow-inner-depth border border-cyan-200/50',
      outline:
        'bg-transparent text-cyan-400 border border-cyan-500/40 shadow-sm hover:bg-cyan-500/10 hover:border-cyan-400 active:bg-cyan-500/20',
      ghost:
        'bg-transparent text-text-secondary border border-transparent hover:bg-white/5 hover:text-text-main active:bg-white/10 shadow-none',
      danger:
        'bg-gradient-danger text-white shadow-3d-sm hover:brightness-110 hover:shadow-[0_0_20px_-3px_rgba(239,68,68,0.4)] active:shadow-inner-depth border border-red-400/30',
    }[variant] || 'bg-gradient-primary text-white border border-cyan-300/30';

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        onClick={onClick}
        className={`relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-bounce-soft select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080D1A] ${
          fullWidth ? 'w-full' : ''
        } ${sizeStyles} ${variantStyles} ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed pointer-events-none'
            : 'hover:-translate-y-0.5 active:translate-y-0.5'
        } ${className}`}
        {...props}
      >
        {/* Top inner bevel highlight */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Loading Spinner */}
        {loading && (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}

        {/* Left / Single Icon */}
        {!loading && (leftIcon || icon) && (
          <span className="inline-flex shrink-0 items-center">{leftIcon || icon}</span>
        )}

        {/* Button Content */}
        <span className="truncate">
          {loading && loadingText ? loadingText : children}
        </span>

        {/* Right Icon */}
        {!loading && rightIcon && (
          <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

