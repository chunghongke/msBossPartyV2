import React, { createContext, useContext, useState, useEffect } from 'react';
import { GroupConfig } from '@/types/group';
import { getFirebaseApp } from '@/services/firebase';

const SAVED_GROUPS_KEY = 'boss_party_saved_groups';
const ACTIVE_GROUP_ID_KEY = 'boss_party_active_group_id';

interface GroupContextType {
  activeGroup: GroupConfig | null;
  savedGroups: GroupConfig[];
  isLoading: boolean;
  switchGroup: (groupId: string) => void;
  saveGroup: (group: GroupConfig) => void;
  removeGroup: (groupId: string) => void;
  parseInviteLink: (hashOrUrl: string) => GroupConfig | null;
  generateInviteLink: (group: GroupConfig) => string;
}

const GroupContext = createContext<GroupContextType | null>(null);

export const GroupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedGroups, setSavedGroups] = useState<GroupConfig[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const parseInviteLink = (hashOrUrl: string): GroupConfig | null => {
    try {
      const match = hashOrUrl.match(/invite=([A-Za-z0-9+/=_-]+)/);
      if (!match || !match[1]) return null;

      let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const decodedJson = decodeURIComponent(escape(atob(base64)));
      const parsed = JSON.parse(decodedJson);

      if (parsed.name && parsed.firebaseConfig && parsed.firebaseConfig.databaseURL) {
        return {
          id: parsed.id || `group_${Date.now()}`,
          name: parsed.name,
          firebaseConfig: parsed.firebaseConfig,
          joinedAt: parsed.joinedAt || Date.now(),
        };
      }
      return null;
    } catch (e) {
      console.warn('解析邀請連結失敗:', e);
      return null;
    }
  };

  useEffect(() => {
    try {
      const storedGroupsJson = localStorage.getItem(SAVED_GROUPS_KEY);
      const storedActiveId = localStorage.getItem(ACTIVE_GROUP_ID_KEY);

      let groups: GroupConfig[] = storedGroupsJson ? JSON.parse(storedGroupsJson) : [];

      const hash = window.location.hash;
      if (hash && hash.includes('invite=')) {
        const inviteGroup = parseInviteLink(hash);
        if (inviteGroup) {
          const existsIndex = groups.findIndex((g) => g.id === inviteGroup.id);
          if (existsIndex >= 0) {
            groups[existsIndex] = inviteGroup;
          } else {
            groups.push(inviteGroup);
          }
          localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(groups));
          localStorage.setItem(ACTIVE_GROUP_ID_KEY, inviteGroup.id);
          setActiveGroupId(inviteGroup.id);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }

      setSavedGroups(groups);
      if (storedActiveId && groups.some((g) => g.id === storedActiveId)) {
        setActiveGroupId(storedActiveId);
      } else if (groups.length > 0) {
        setActiveGroupId(groups[0].id);
      }
    } catch (err) {
      console.error('初始化群組失敗:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activeGroup = savedGroups.find((g) => g.id === activeGroupId) || null;

  useEffect(() => {
    if (activeGroup?.firebaseConfig) {
      try {
        getFirebaseApp(activeGroup.firebaseConfig);
      } catch (err) {
        console.error('Firebase 連線切換失敗:', err);
      }
    }
  }, [activeGroup]);

  const switchGroup = (groupId: string) => {
    if (savedGroups.some((g) => g.id === groupId)) {
      setActiveGroupId(groupId);
      localStorage.setItem(ACTIVE_GROUP_ID_KEY, groupId);
    }
  };

  const saveGroup = (group: GroupConfig) => {
    setSavedGroups((prev) => {
      const existsIndex = prev.findIndex((g) => g.id === group.id);
      let updated: GroupConfig[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = group;
      } else {
        updated = [...prev, group];
      }
      localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(updated));
      return updated;
    });

    setActiveGroupId(group.id);
    localStorage.setItem(ACTIVE_GROUP_ID_KEY, group.id);
  };

  const removeGroup = (groupId: string) => {
    setSavedGroups((prev) => {
      const updated = prev.filter((g) => g.id !== groupId);
      localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(updated));
      if (activeGroupId === groupId) {
        const nextActive = updated[0]?.id || null;
        setActiveGroupId(nextActive);
        if (nextActive) {
          localStorage.setItem(ACTIVE_GROUP_ID_KEY, nextActive);
        } else {
          localStorage.removeItem(ACTIVE_GROUP_ID_KEY);
        }
      }
      return updated;
    });
  };

  const generateInviteLink = (group: GroupConfig): string => {
    const payload = {
      id: group.id,
      name: group.name,
      firebaseConfig: group.firebaseConfig,
    };
    const json = JSON.stringify(payload);
    const base64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#invite=${base64}`;
  };

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        savedGroups,
        isLoading,
        switchGroup,
        saveGroup,
        removeGroup,
        parseInviteLink,
        generateInviteLink,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup 必須在 GroupProvider 內部使用！');
  }
  return context;
};
