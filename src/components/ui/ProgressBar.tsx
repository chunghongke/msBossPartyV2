import { cn } from '@/utils/cn';

interface ProgressBarProps {
  current: number;
  total: number;
  variant?: 'green' | 'blue' | 'purple' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  current,
  total,
  variant = 'green',
  size = 'md',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;

  const heightClasses = {
    sm: 'h-2.5',
    md: 'h-4',
    lg: 'h-5',
  };

  const fillVariants = {
    green: 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
    blue: 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
    purple: 'bg-gradient-to-r from-fuchsia-400 to-purple-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
    gold: 'bg-gradient-to-r from-amber-300 to-yellow-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
  };

  return (
    <div className={cn('w-full select-none', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-black mb-1 text-[#3E2F20] dark:text-slate-200">
          <span>進度</span>
          <span className="font-fredoka font-black">
            {current} / {total} ({percentage}%)
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-[#3B2C1A]/20 dark:bg-black/40 rounded-full border-2 border-kerning-stroke p-[1.5px] overflow-hidden shadow-inner',
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out relative',
            fillVariants[variant]
          )}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 0 && (
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
