import React from 'react';
import { Player } from '@/types/player';
import { cn } from '@/utils/cn';

interface PlayerAvatarProps {
  player?: Player | null;
  avatarEmoji?: string;
  avatarImage?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  avatarEmoji,
  avatarImage,
  name,
  size = 'md',
  className,
}) => {
  const imgUrl = avatarImage || player?.avatarImage;
  const emoji = avatarEmoji || player?.avatarEmoji || '👤';
  const playerName = name || player?.name || '冒險者';

  return (
    <div
      className={cn(
        'relative rounded-2xl flex items-center justify-center shrink-0 overflow-hidden font-sans select-none transition-transform',
        'bg-amber-400/20 border-2 border-amber-400/60 shadow-inner',
        SIZE_MAP[size],
        className
      )}
      title={playerName}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={playerName}
          className="w-full h-full object-cover rounded-full select-none pointer-events-none"
          onError={(e: any) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span className="flex items-center justify-center leading-none">
          {emoji}
        </span>
      )}
    </div>
  );
};
