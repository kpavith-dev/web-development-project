import React, { useId } from 'react';

/**
 * Input - Premium SaaS 3D Form Input
 *
 * Embedded dark input with inner shadow depth, cyan glow focus states,
 * left/right icon slots, and accessible error/helper messaging.
 * Built with React.forwardRef for seamless react-hook-form integration.
 */
const Input = React.forwardRef(
  (
    {
      label,
      id,
      name,
      type = 'text',
      placeholder,
      disabled = false,
      readOnly = false,
      required = false,
      error,
      helperText,
      icon,
      leftIcon,
      rightIcon,
      rightElement,
      className = '',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || (name ? `input-${name}` : generatedId);
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const activeLeftIcon = leftIcon || icon;
    const activeRightElement = rightElement || rightIcon;

    return (
      <div className={`w-full space-y-1.5 ${wrapperClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
          >
            {label}
            {required && <span className="ml-1 text-cyan-accent">*</span>}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative flex items-center">
          {/* Left Icon */}
          {activeLeftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
              {activeLeftIcon}
            </div>
          )}

          {/* Native Input */}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={`w-full rounded-xl border bg-secondary/90 text-sm text-text-main placeholder-text-muted/60 transition-all duration-200 outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.45)] focus-visible:outline-none ${
              activeLeftIcon ? 'pl-10' : 'pl-4'
            } ${
              activeRightElement ? 'pr-10' : 'pr-4'
            } py-3 ${
              error
                ? 'border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/25 focus:shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)]'
                : 'border-white/10 hover:border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:shadow-[0_0_15px_-3px_rgba(34,211,238,0.25)]'
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-canvas'
                : ''
            } ${className}`}
            {...props}
          />

          {/* Right Icon / Custom Element */}
          {activeRightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted">
              {activeRightElement}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p id={errorId} className="text-xs font-medium text-rose-400 animate-fadeIn">
            {error}
          </p>
        )}

        {/* Helper Message */}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

