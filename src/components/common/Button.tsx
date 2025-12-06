import React, { ButtonHTMLAttributes, forwardRef, ReactElement } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    fullWidth = false,
    disabled,
    children,
    asChild = false,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primaryDark focus:ring-primary shadow-sm hover:shadow-md rounded-base',
      secondary: 'bg-accent text-white hover:opacity-90 focus:ring-accent shadow-sm hover:shadow-md rounded-base',
      outline: 'border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary rounded-base',
      ghost: 'text-textSecondary hover:text-textMain hover:bg-muted focus:ring-muted',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md rounded-base'
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    
    const widthClass = fullWidth ? 'w-full' : '';
    
    const buttonClasses = cn(
      baseClasses,
      variants[variant],
      sizes[size],
      widthClass,
      loading && 'cursor-wait',
      className
    );
    
    // If asChild is true, clone the child element with our classes
    if (asChild && React.isValidElement(children)) {
      const child = children as ReactElement;
      return React.cloneElement(child, {
        className: cn(buttonClasses, child.props.className),
        disabled: disabled || loading || child.props.disabled,
        children: (
          <>
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {child.props.children}
          </>
        ),
        ...props,
      });
    }
    
    return (
      <button
        className={buttonClasses}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;