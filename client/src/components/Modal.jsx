import React, { useEffect, useId } from 'react';

/**
 * Modal - Premium SaaS 3D Dialog Overlay
 *
 * Provides a floating 3D modal panel with hardware-accelerated backdrop blur,
 * top neon accent bevels, escape key dismiss, and scroll lock.
 */
const Modal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  glow = 'cyan',
  className = '',
}) => {
  const titleId = useId();
  const descId = useId();

  // Handle body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  // Modal max-width variants
  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[92vw]',
  }[size] || 'max-w-md';

  // Glow styles
  const glowStyles = {
    none: '',
    cyan: 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_30px_-5px_rgba(34,211,238,0.2)] border-cyan-500/30',
    blue: 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_30px_-5px_rgba(59,130,246,0.2)] border-blue-500/30',
  }[glow] || 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-white/10';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-canvas/80 backdrop-blur-md transition-opacity duration-200"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      {/* 3D Modal Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full overflow-hidden rounded-2xl border bg-gradient-to-b from-[#142238] to-[#101A2E] text-text-main shadow-2xl backdrop-blur-xl ${sizeStyles} ${glowStyles} ${className}`}
      >
        {/* Top Accent Bevel Line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b border-white/5 px-6 py-5">
            <div className="space-y-1 pr-6">
              {title && (
                <h3
                  id={titleId}
                  className="text-lg font-semibold tracking-tight text-text-main"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className="text-xs text-text-secondary">
                  {description}
                </p>
              )}
            </div>

            {/* Close Button */}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-secondary/80 text-text-secondary transition-all hover:bg-card hover:text-white hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Modal Body Content */}
        <div className="px-6 py-5 text-sm text-text-secondary max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/5 bg-secondary/50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

