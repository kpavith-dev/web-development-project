import React, { useId } from 'react';

/**
 * Select - Premium SaaS 3D Form Select
 *
 * Custom styled dropdown selector with inner depth, cyan focus ring,
 * custom SVG chevron arrow, and full react-hook-form forwardRef support.
 */
const Select = React.forwardRef(
  (
    {
      label,
      id,
      name,
      options = [],
      children,
      placeholder,
      disabled = false,
      required = false,
      error,
      helperText,
      leftIcon,
      className = '',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || (name ? `select-${name}` : generatedId);
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    return (
      <div className={`w-full space-y-1.5 ${wrapperClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
          >
            {label}
            {required && <span className="ml-1 text-cyan-accent">*</span>}
          </label>
        )}

        {/* Select Wrapper */}
        <div className="relative flex items-center">
          {/* Left Icon */}
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
              {leftIcon}
            </div>
          )}

          {/* Native Select with custom styling */}
          <select
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={`w-full appearance-none rounded-xl border bg-secondary/90 text-sm text-text-main transition-all duration-200 outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.45)] focus-visible:outline-none ${
              leftIcon ? 'pl-10' : 'pl-4'
            } pr-10 py-3 ${
              error
                ? 'border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/25 focus:shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)]'
                : 'border-white/10 hover:border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:shadow-[0_0_15px_-3px_rgba(34,211,238,0.25)]'
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-canvas'
                : 'cursor-pointer'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-secondary text-text-muted">
                {placeholder}
              </option>
            )}

            {/* Render options from array if passed */}
            {options.map((opt) => {
              const value = typeof opt === 'object' ? opt.value : opt;
              const label = typeof opt === 'object' ? opt.label : opt;
              const optDisabled = typeof opt === 'object' ? opt.disabled : false;

              return (
                <option
                  key={value}
                  value={value}
                  disabled={optDisabled}
                  className="bg-secondary text-text-main py-1"
                >
                  {label}
                </option>
              );
            })}

            {/* Render raw children if passed */}
            {children}
          </select>

          {/* Custom Sleek Chevron Icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p id={errorId} className="text-xs font-medium text-rose-400">
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

Select.displayName = 'Select';

export default Select;

