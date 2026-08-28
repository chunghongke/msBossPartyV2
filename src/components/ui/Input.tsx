import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean | string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-stone-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900/90 px-3 py-2 text-sm font-bold text-[#3E2F20] dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 shadow-inner transition-all',
            'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 dark:focus:border-amber-400 dark:focus:ring-amber-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-stone-100 dark:disabled:bg-slate-800',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-400/30',
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center text-stone-400 dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
