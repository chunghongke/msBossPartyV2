import React from 'react';
import { cn } from '@/utils/cn';
import { Difficulty } from '@/types/boss';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'extreme' | 'hard' | 'normal' | 'easy' | 'reset' | 'completed' | 'guest' | 'gold' | 'parchment';
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'normal', size = 'sm', className, children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center font-bold tracking-tight rounded-md border border-kerning-stroke select-none shadow-[0_1.5px_0_rgba(0,0,0,0.4)]';

  const variants = {
    extreme: 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_1.5px_0_#7F1D1D]',
    hard: 'bg-gradient-to-b from-amber-400 to-orange-600 text-white shadow-[0_1.5px_0_#9A3412]',
    normal: 'bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-[0_1.5px_0_#1E3A8A]',
    easy: 'bg-gradient-to-b from-blue-300 to-sky-500 text-slate-900 shadow-[0_1.5px_0_#0369A1]',
    reset: 'bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white shadow-[0_1.5px_0_#581C87]',
    completed: 'bg-gradient-to-b from-emerald-400 to-green-600 text-white shadow-[0_1.5px_0_#14532D]',
    guest: 'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white shadow-[0_1.5px_0_#312E81]',
    gold: 'bg-gradient-to-b from-yellow-300 to-amber-500 text-slate-900 shadow-[0_1.5px_0_#B8860B]',
    parchment: 'bg-[#F5ECD7] dark:bg-slate-700 text-[#4A3B2C] dark:text-slate-200 shadow-[0_1.5px_0_#D4B982]',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map: Record<Difficulty, { label: string; variant: 'easy' | 'normal' | 'hard' | 'extreme' }> = {
    easy: { label: '簡', variant: 'easy' },
    normal: { label: '普', variant: 'normal' },
    hard: { label: '困', variant: 'hard' },
    extreme: { label: '極', variant: 'extreme' },
  };
  const { label, variant } = map[difficulty] || { label: difficulty, variant: 'normal' };
  return <Badge variant={variant}>{label}</Badge>;
}
