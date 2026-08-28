import { useAppStore } from '@/store';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Team, RaidSchedule } from '@/types/party';
import { playNotificationChime } from '@/services/audio';

const NOTIF_SETTINGS_KEY = 'boss_party_notif_settings';

export interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number;
  chimeType: 'short' | 'long' | 'synth' | 'custom';
  volume: number;
  customAudioName?: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  advanceMinutes: 10,
  chimeType: 'short',
  volume: 0.8,
};

interface NotifContextType {
  settings: NotificationSettings;
  permission: NotificationPermission;
  updateSettings: (partial: Partial<NotificationSettings>) => void;
  requestPermission: () => Promise<boolean>;
  testSendNotification: () => Promise<void>;
  getTeamEffectiveSchedule: (team: Team) => (RaidSchedule & { isTemp: boolean }) | null;
}

const NotifContext = createContext<NotifContextType | null>(null);

export const NotifProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const store = useAppStore((s) => s.store);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem(NOTIF_SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const alertedTeamKeysRef = useRef<Set<string>>(new Set());

  const updateSettings = (partial: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('您的瀏覽器不支援 Web Notifications 系統推播！');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        updateSettings({ enabled: true });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('請求推播權限失敗:', e);
      return false;
    }
  };

    const getTeamEffectiveSchedule = useCallback((team: Team): (RaidSchedule & { isTemp: boolean }) | null => {
    if (!team || !team.schedule) return null;
    let s: any = null;
    let isTemp = false;

    if (team.schedule.tempOverride) {
      s = team.schedule.tempOverride;
      isTemp = true;
    } else if (team.schedule.recurring) {
      s = team.schedule.recurring;
      isTemp = false;
    } else if (typeof team.schedule === 'object') {
      s = team.schedule;
    }

    if (!s) return null;

    let timeStr = typeof s.timeStr === 'string' ? s.timeStr : (typeof s.time === 'string' ? s.time : '');
    if (!timeStr && (s.recurringHour !== undefined || s.hour !== undefined)) {
      const h = String(s.recurringHour ?? s.hour ?? 21).padStart(2, '0');
      const m = String(s.recurringMin ?? s.minute ?? s.min ?? 0).padStart(2, '0');
      timeStr = `${h}:${m}`;
    }

    if (!timeStr || !timeStr.includes(':')) {
      return null;
    }

    const dayOfWeek = typeof s.dayOfWeek === 'number' ? s.dayOfWeek : (typeof s.day === 'number' ? s.day : 4);

    return {
      dayOfWeek,
      timeStr,
      isTemp,
    };
  }, []);

  const checkIfTeamCompleted = useCallback(
    (team: Team): boolean => {
      if (!team?.memberTargets || team.memberTargets.length === 0) return true;
      return team.memberTargets.every((m) => {
        const key = Object.keys(store.weeklyRecords).find(
          (k) => store.weeklyRecords[k].charId === m.charId && store.weeklyRecords[k].teamId === team.id
        );
        return key ? store.weeklyRecords[key].isCompleted : false;
      });
    },
    [store.weeklyRecords]
  );

    const checkRaidReminders = useCallback(() => {
    if (!settings.enabled || permission !== 'granted') return;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    Object.values(store.teams || {}).forEach((team) => {
      if (!team) return;
      const schedule = getTeamEffectiveSchedule(team);
      if (!schedule || !schedule.timeStr || typeof schedule.timeStr !== 'string') return;

      if (checkIfTeamCompleted(team)) return;

      const timeParts = schedule.timeStr.split(':');
      if (timeParts.length < 2) return;

      const targetHour = parseInt(timeParts[0], 10);
      const targetMin = parseInt(timeParts[1], 10);
      if (isNaN(targetHour) || isNaN(targetMin)) return;

      const targetTotalMins = targetHour * 60 + targetMin;
      const currentTotalMins = currentHour * 60 + currentMin;

      const diffMins = (schedule.dayOfWeek - currentDay) * 1440 + (targetTotalMins - currentTotalMins);

      const alertKey = `${team.id}_${schedule.dayOfWeek}_${schedule.timeStr}_${now.toDateString()}`;

      if (diffMins <= settings.advanceMinutes && diffMins >= -5) {
        if (!alertedTeamKeysRef.current.has(alertKey)) {
          alertedTeamKeysRef.current.add(alertKey);

          playNotificationChime(settings.chimeType, settings.volume);

          if ('Notification' in window && Notification.permission === 'granted') {
            const timeDesc = diffMins <= 0 ? '現在' : `${diffMins} 分鐘後`;
            new Notification('🍁 BossParty 出團提醒！', {
              body: `隊伍預定於 ${timeDesc} 出團討伐 BOSS，請準備集合！`,
              icon: './icon.png',
            });
          }
        }
      }
    });
  }, [settings, permission, store.teams, getTeamEffectiveSchedule, checkIfTeamCompleted]);

  useEffect(() => {
    const timer = setInterval(() => {
      checkRaidReminders();
    }, 30000);
    return () => clearInterval(timer);
  }, [checkRaidReminders]);

  const testSendNotification = async () => {
    await playNotificationChime(settings.chimeType, settings.volume);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍁 BossParty 測試推播通知', {
        body: '這是一則測試通知，出團時間即將到來時會收到類似提醒！',
        icon: './icon.png',
      });
    } else {
      console.warn('請先允許通知權限，才能在桌面或手機收到推播提醒！');
    }
  };

  return (
    <NotifContext.Provider
      value={{
        settings,
        permission,
        updateSettings,
        requestPermission,
        testSendNotification,
        getTeamEffectiveSchedule,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
};

export const useNotif = () => {
  const context = useContext(NotifContext);
  if (!context) {
    throw new Error('useNotif 必須在 NotifProvider 內部使用！');
  }
  return context;
};
