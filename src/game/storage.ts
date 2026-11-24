import { CARS, DEFAULT_UPGRADES, MAX_UPGRADE_LEVEL } from './cars';
import {
  SAVE_VERSION,
  createDefaultAchievements,
  createInitialSaveData,
  getLocalDateKey,
  refreshDailyMissionsIfNeeded,
  syncAchievements,
} from './progression';
import type { CarUpgradeState, SaveData } from './types';

export const STORAGE_KEY = 'street_rush_save_v1';

function computeChecksum(data: Omit<SaveData, 'checksum'>): string {
  const payload = JSON.stringify({
    v: data.version,
    c: data.coins,
    x: data.xp,
    l: data.level,
    u: data.unlockedCars,
    s: data.selectedCarId,
    up: data.upgrades,
    hs: data.highScores,
    td: data.totalDistance,
    tr: data.totalRaces,
  });
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

export function sanitizeSaveData(raw: unknown, dateKey: string = getLocalDateKey()): SaveData {
  const fallback = createInitialSaveData(dateKey);
  if (!raw || typeof raw !== 'object') return fallback;

  const obj = raw as Partial<SaveData>;
  const validCarIds = new Set(CARS.map((c) => c.id));

  const unlockedSet = new Set<string>(['crimson_gt']);
  if (Array.isArray(obj.unlockedCars)) {
    for (const id of obj.unlockedCars) {
      if (typeof id === 'string' && validCarIds.has(id)) {
        unlockedSet.add(id);
      }
    }
  }
  const unlockedCars = Array.from(unlockedSet);

  const selectedCarId =
    typeof obj.selectedCarId === 'string' && unlockedSet.has(obj.selectedCarId)
      ? obj.selectedCarId
      : 'crimson_gt';

  const upgrades: Record<string, CarUpgradeState> = {};
  for (const carId of unlockedCars) {
    const rawUp = obj.upgrades?.[carId];
    upgrades[carId] = rawUp
      ? {
          speedLevel: clampInt(rawUp.speedLevel, 0, MAX_UPGRADE_LEVEL, 0),
          accelLevel: clampInt(rawUp.accelLevel, 0, MAX_UPGRADE_LEVEL, 0),
          handlingLevel: clampInt(rawUp.handlingLevel, 0, MAX_UPGRADE_LEVEL, 0),
          nitroLevel: clampInt(rawUp.nitroLevel, 0, MAX_UPGRADE_LEVEL, 0),
        }
      : { ...DEFAULT_UPGRADES };
  }

  const missionsDate =
    typeof obj.missionsDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.missionsDate)
      ? obj.missionsDate
      : dateKey;

  const defaultAchievements = createDefaultAchievements();
  const rawAchMap = new Map(
    Array.isArray(obj.achievements) ? obj.achievements.map((a) => [a?.id, a]) : []
  );
  const achievements = defaultAchievements.map((def) => {
    const saved = rawAchMap.get(def.id);
    if (!saved) return def;
    return {
      ...def,
      progress: clampInt(saved.progress, 0, def.target, 0),
      unlocked: Boolean(saved.unlocked),
      claimed: Boolean(saved.claimed),
    };
  });

  const base: SaveData = {
    version: SAVE_VERSION,
    coins: clampInt(obj.coins, 0, 99_999_999, fallback.coins),
    xp: clampInt(obj.xp, 0, 99_999_999, 0),
    level: clampInt(obj.level, 1, 999, 1),
    unlockedCars,
    selectedCarId,
    upgrades,
    highScores: {
      endless: clampInt(obj.highScores?.endless, 0, 999_999_999, 0),
      time_challenge: clampInt(obj.highScores?.time_challenge, 0, 999_999_999, 0),
      coin_challenge: clampInt(obj.highScores?.coin_challenge, 0, 999_999_999, 0),
    },
    totalDistance: clampInt(obj.totalDistance, 0, 999_999_999, 0),
    totalRaces: clampInt(obj.totalRaces, 0, 9_999_999, 0),
    totalCoinsEarned: clampInt(obj.totalCoinsEarned, 0, 999_999_999, 0),
    totalNitroUses: clampInt(obj.totalNitroUses, 0, 9_999_999, 0),
    cleanRaces: clampInt(obj.cleanRaces, 0, 9_999_999, 0),
    timeWins: clampInt(obj.timeWins, 0, 9_999_999, 0),
    coinWins: clampInt(obj.coinWins, 0, 9_999_999, 0),
    missionsDate,
    missions:
      Array.isArray(obj.missions) && obj.missions.length === fallback.missions.length
        ? obj.missions.map((m, i) => {
            const def = fallback.missions[i];
            return {
              ...def,
              id: typeof m?.id === 'string' ? m.id : def.id,
              progress: clampInt(m?.progress, 0, def.target, 0),
              completed: Boolean(m?.completed),
              claimed: Boolean(m?.claimed),
            };
          })
        : fallback.missions,
    achievements,
    sound: {
      musicEnabled: obj.sound?.musicEnabled ?? true,
      sfxEnabled: obj.sound?.sfxEnabled ?? true,
      musicVolume:
        typeof obj.sound?.musicVolume === 'number'
          ? Math.max(0, Math.min(1, obj.sound.musicVolume))
          : 0.45,
      sfxVolume:
        typeof obj.sound?.sfxVolume === 'number'
          ? Math.max(0, Math.min(1, obj.sound.sfxVolume))
          : 0.75,
    },
    controls: {
      touchDrag: obj.controls?.touchDrag ?? true,
      steerButtons: obj.controls?.steerButtons ?? true,
      dayNight: obj.controls?.dayNight === 'day' ? 'day' : 'night',
    },
    processedRaceIds: Array.isArray(obj.processedRaceIds)
      ? obj.processedRaceIds.filter((id): id is string => typeof id === 'string').slice(-30)
      : [],
    checksum: '',
  };

  const refreshed = refreshDailyMissionsIfNeeded(base, dateKey);
  const synced = syncAchievements(refreshed);
  const finalSave: SaveData = { ...refreshed, achievements: synced.achievements };
  finalSave.checksum = computeChecksum(finalSave);
  return finalSave;
}

export function loadSaveData(storage: Pick<Storage, 'getItem'> | undefined = getSafeLocalStorage()): SaveData {
  const dateKey = getLocalDateKey();
  if (!storage) return createInitialSaveData(dateKey);

  try {
    const rawText = storage.getItem(STORAGE_KEY);
    if (!rawText) {
      const fresh = createInitialSaveData(dateKey);
      fresh.checksum = computeChecksum(fresh);
      return fresh;
    }
    const parsed = JSON.parse(rawText);
    return sanitizeSaveData(parsed, dateKey);
  } catch {
    const fresh = createInitialSaveData(dateKey);
    fresh.checksum = computeChecksum(fresh);
    return fresh;
  }
}

export function persistSaveData(
  save: SaveData,
  storage: Pick<Storage, 'setItem'> | undefined = getSafeLocalStorage()
): SaveData {
  const sanitized = sanitizeSaveData(save, getLocalDateKey());
  if (!storage) return sanitized;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Gracefully handle quota exceeded or private mode without crashing the app
  }
  return sanitized;
}

export function resetSaveData(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = getSafeLocalStorage()
): SaveData {
  const fresh = createInitialSaveData(getLocalDateKey());
  fresh.checksum = computeChecksum(fresh);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore storage errors
    }
  }
  return fresh;
}

function getSafeLocalStorage(): Storage | undefined {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
