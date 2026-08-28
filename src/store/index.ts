import { create } from 'zustand';
import { AppState } from './types';
import { createPlayerSlice } from './slices/playerSlice';
import { createStoreSlice, DEFAULT_STORE } from './slices/storeSlice';
import { createDerivedSlice } from './slices/derivedSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createPlayerSlice(...a),
  ...createStoreSlice(...a),
  ...createDerivedSlice(...a),
}));

// 相容舊版 useStore 呼叫 (一對一相容，不破壞舊消費端解構)
export const useStore = useAppStore;

export * from './types';
export * from './sanitize';
export * from './firebaseSync';
export { DEFAULT_STORE };
