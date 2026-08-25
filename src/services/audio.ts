import { get, set, del } from 'idb-keyval';

const CUSTOM_AUDIO_STORE_KEY = 'boss_party_custom_audio_blob';
let sharedAudioCtx: AudioContext | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;

export function unlockAudioContext(): AudioContext | null {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch (e) {
    console.warn('AudioContext 解鎖失敗:', e);
    return null;
  }
}

export function playSyntheticChime(volume: number = 0.8) {
  try {
    const ctx = unlockAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.4, now);
    masterGain.connect(ctx.destination);

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const startTime = now + index * 0.08;
      const duration = 0.5;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.warn('播放合成音效失敗:', e);
  }
}

export function stopNotificationChime() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

export async function playNotificationChime(
  type: 'short' | 'long' | 'custom' | 'synth' = 'short',
  volume: number = 0.8
) {
  stopNotificationChime();
  unlockAudioContext();

  if (type === 'synth') {
    playSyntheticChime(volume);
    return;
  }

  let srcUrl = './chime_short.mp3';

  if (type === 'long') {
    srcUrl = './chime_long.mp3';
  } else if (type === 'custom') {
    const blob = await getCustomAudioBlob();
    if (blob) {
      currentBlobUrl = URL.createObjectURL(blob);
      srcUrl = currentBlobUrl;
    }
  }

  try {
    const audio = new Audio(srcUrl);
    audio.volume = Math.max(0, Math.min(1, volume));
    currentAudioElement = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('音訊播放被瀏覽器阻擋，切換為合成音效:', err);
        playSyntheticChime(volume);
      });
    }
  } catch (e) {
    console.warn('載入音效失敗，切換為合成音效:', e);
    playSyntheticChime(volume);
  }
}

export async function saveCustomAudioBlob(file: File): Promise<string> {
  await set(CUSTOM_AUDIO_STORE_KEY, file);
  return file.name;
}

export async function getCustomAudioBlob(): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(CUSTOM_AUDIO_STORE_KEY);
    return blob || null;
  } catch {
    return null;
  }
}

export async function deleteCustomAudioBlob(): Promise<void> {
  await del(CUSTOM_AUDIO_STORE_KEY);
}
