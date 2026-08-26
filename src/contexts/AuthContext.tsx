import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player } from '@/types/player';
import { verifyPassword, canManagePlayer, canManageCharacter } from '@/services/crypto';

const AUTH_PLAYER_KEY = 'boss_party_auth_player_name';

interface AuthContextType {
  currentPlayer: Player | null;
  isAdmin: boolean;
  login: (playerName: string, passwordInput?: string, allPlayers?: Player[]) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canManagePlayerName: (targetPlayerName: string) => boolean;
  canManageChar: (charOwnerPlayerName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  players: Player[];
}> = ({ children, players }) => {
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_PLAYER_KEY);
  });

  // 僅當本地儲存有有效登入名稱且存在於 players 時才認證成功；未登入者保持 null 訪客唯讀身分
  const currentPlayer = players.find((p) => p.name === currentPlayerName) || null;
  const isAdmin = Boolean(currentPlayer?.isAdmin);

  const login = async (
    playerName: string,
    passwordInput: string = '',
    allPlayers: Player[] = players
  ): Promise<{ success: boolean; error?: string }> => {
    const targetPlayer = allPlayers.find((p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase());
    if (!targetPlayer) {
      return { success: false, error: '找不到該玩家名稱！' };
    }

    if (targetPlayer.passwordHash) {
      const isCorrect = await verifyPassword(passwordInput, targetPlayer.passwordHash);
      if (!isCorrect) {
        return { success: false, error: '密碼錯誤，請重新輸入！' };
      }
    }

    setCurrentPlayerName(targetPlayer.name);
    localStorage.setItem(AUTH_PLAYER_KEY, targetPlayer.name);
    return { success: true };
  };

  const logout = () => {
    setCurrentPlayerName(null);
    localStorage.removeItem(AUTH_PLAYER_KEY);
  };

  const canManagePlayerName = (targetPlayerName: string): boolean => {
    return canManagePlayer(currentPlayer, targetPlayerName);
  };

  const canManageChar = (charOwnerPlayerName: string): boolean => {
    return canManageCharacter(currentPlayer, charOwnerPlayerName);
  };

  return (
    <AuthContext.Provider
      value={{
        currentPlayer,
        isAdmin,
        login,
        logout,
        canManagePlayerName,
        canManageChar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必須在 AuthProvider 內部使用！');
  }
  return context;
};
