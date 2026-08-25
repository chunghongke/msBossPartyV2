import { useState } from 'react';
import { cn } from '@/utils/cn';

const DEFAULT_EMOJIS = [
  '🍁', '🗡️', '🏹', '🧙‍♂️', '🦹', '🐱', '🐶', '🦊', '🐻', '🐼',
  '🦁', '🐯', '🐰', '🐸', '🦄', '🐲', '🍄', '⭐', '🔥', '💧',
  '⚡', '❄️', '🌸', '👑', '🛡️', '⚔️', '💎', '🎮', '🍕', '🍰',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [customInput, setCustomInput] = useState('');

  const handleCustomAdd = () => {
    const clean = customInput.trim();
    if (!clean) return;
    onChange(clean);
    setCustomInput('');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 p-2 bg-black/5 dark:bg-black/30 rounded-2xl border-2 border-slate-300 dark:border-slate-700 max-h-40 overflow-y-auto">
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center text-base transition-transform active:scale-95 border-2',
              value === emoji
                ? 'border-amber-500 bg-amber-500/20 shadow-sm scale-110'
                : 'border-transparent hover:bg-black/10'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="自訂 Emoji 或文字 (例如 🦊)"
          className="flex-1 px-3 py-1.5 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
          maxLength={4}
        />
        <button
          type="button"
          onClick={handleCustomAdd}
          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-95 transition-all"
        >
          套用
        </button>
      </div>
    </div>
  );
}
