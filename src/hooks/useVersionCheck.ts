import { useState, useEffect, useCallback, useRef } from 'react';

const SESSION_UPDATED_KEY = 'bp_last_updated_version';

export function useVersionCheck() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const latestRemoteBuildTimeRef = useRef<number | null>(null);

  // 清除 URL 中的 _t 快取破除參數，保持網址乾淨
  useEffect(() => {
    if (window.location.search.includes('_t=')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('_t');
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }
  }, []);

  const checkVersion = useCallback(async () => {
    // 若當前畫面已顯示新版本提示，不重複發送
    if (hasNewVersion) return;

    try {
      setIsChecking(true);
      const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const versionUrl = `${baseUrl}/version.json?t=${Date.now()}`;
      const res = await fetch(versionUrl, { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        const remoteBuildTime = Number(data.buildTime);
        const currentAppTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;

        if (remoteBuildTime && currentAppTime) {
          // 僅在遠端版本時間「大於」當前客戶端編譯時間時，才認定為新版（避免時鐘誤差或舊版比對錯誤）
          const isRemoteNewer = remoteBuildTime > currentAppTime;

          // 檢查是否剛剛已經針對此版本執行過【立即更新】（避免瀏覽器或伺服器快取導致重整後重複跳出）
          const lastUpdated = sessionStorage.getItem(SESSION_UPDATED_KEY);
          const hasAlreadyUpdatedToThis = lastUpdated ? Number(lastUpdated) >= remoteBuildTime : false;

          if (import.meta.env.DEV) {
            console.log(
              `[VersionCheck] 檢查結果 -> 客戶端: ${currentAppTime}, 伺服器: ${remoteBuildTime}, 伺服器更新: ${isRemoteNewer}, 已更新過此版: ${hasAlreadyUpdatedToThis}`
            );
          }

          if (isRemoteNewer && !hasAlreadyUpdatedToThis) {
            latestRemoteBuildTimeRef.current = remoteBuildTime;
            setHasNewVersion(true);
          }
        }
      }
    } catch {
      // 網路斷線或暫時無法連線時靜默忽略
    } finally {
      setIsChecking(false);
    }
  }, [hasNewVersion]);

  useEffect(() => {
    // 首次載入 5 秒後執行第一次檢查
    const initialTimer = window.setTimeout(checkVersion, 5000);

    // 每 5 分鐘在背景輪詢檢查一次 (可依需求調整頻率)
    const intervalTimer = window.setInterval(checkVersion, 5 * 60 * 1000);

    // 當使用者切換回視窗焦點時檢查
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    const handleFocus = () => {
      checkVersion();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkVersion]);

  const reload = useCallback(() => {
    // 記錄當前正在更新至此版本，防止重整後因快取延遲再次重複跳出
    if (latestRemoteBuildTimeRef.current) {
      sessionStorage.setItem(SESSION_UPDATED_KEY, String(latestRemoteBuildTimeRef.current));
    }
    // 加入時間戳參數破除瀏覽器對 index.html 的快取，強制載入伺服器最新 HTML
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now().toString());
    window.location.replace(url.toString());
  }, []);

  // 開發環境除錯測試輔助（生產環境會被 tree-shake）
  useEffect(() => {
    if (import.meta.env.DEV) {
      const win = window as unknown as {
        __triggerUpdate?: () => void;
        __checkVersion?: () => Promise<void>;
      };
      win.__triggerUpdate = () => {
        setHasNewVersion(prev => !prev);
      };
      win.__checkVersion = () => {
        sessionStorage.removeItem(SESSION_UPDATED_KEY);
        return checkVersion();
      };
    }
  }, [checkVersion]);

  return {
    hasNewVersion,
    isChecking,
    checkVersion,
    reload,
  };
}
