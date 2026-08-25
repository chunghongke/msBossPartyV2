import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'green' | 'blue' | 'danger' | 'parchment' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold tracking-wide select-none transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none';

    const variants = {
      primary:
        'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 text-white border-2.5 border-kerning-stroke shadow-maple-btn hover:brightness-110 active:translate-y-[2px] active:shadow-maple-btn-active focus-visible:ring-orange-400',
      gold:
        'bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 text-slate-900 border-2.5 border-kerning-stroke shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_0_#B8860B] hover:brightness-110 active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_#B8860B] focus-visible:ring-yellow-400',
      green:
        'bg-gradient-to-b from-emerald-400 via-green-500 to-emerald-600 text-white border-2.5 border-kerning-stroke shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_0_#1B5E20] hover:brightness-110 active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_#1B5E20] focus-visible:ring-green-400',
      blue:
        'bg-gradient-to-b from-sky-400 via-blue-500 to-blue-600 text-white border-2.5 border-kerning-stroke shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_0_#0D47A1] hover:brightness-110 active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_#0D47A1] focus-visible:ring-blue-400',
      danger:
        'bg-gradient-to-b from-red-400 via-rose-500 to-red-600 text-white border-2.5 border-kerning-stroke shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_0_#7F1D1D] hover:brightness-110 active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_#7F1D1D] focus-visible:ring-red-400',
      parchment:
        'bg-[#FDF5E6] dark:bg-slate-800 text-[#4A3B2C] dark:text-slate-100 border-2.5 border-kerning-stroke shadow-[0_3px_0_#D4B982] dark:shadow-[0_3px_0_#0F172A] hover:bg-[#FFF8E7] dark:hover:bg-slate-700 active:translate-y-[2px] active:shadow-[0_1px_0_#D4B982] focus-visible:ring-amber-500',
      ghost:
        'text-stone-700 dark:text-stone-200 hover:bg-stone-500/15 dark:hover:bg-white/10 active:bg-stone-500/25 dark:active:bg-white/20 border border-transparent rounded-lg focus-visible:ring-stone-400 font-bold',
    };

    const sizes = {
      sm: 'px-3 py-1 text-xs rounded-lg gap-1.5',
      md: 'px-4 py-2 text-sm rounded-xl gap-2',
      lg: 'px-6 py-2.5 text-base rounded-2xl gap-2.5',
      icon: 'w-9 h-9 p-0 rounded-xl justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
