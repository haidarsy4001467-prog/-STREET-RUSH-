import {
  CARS,
  DEFAULT_UPGRADES,
  MAX_UPGRADE_LEVEL,
  getCarById,
  getCarUpgrades,
  getUpgradeCost,
} from './cars';
import type {
  Achievement,
  DailyMission,
  RaceApplyOutcome,
  RaceResult,
  SaveData,
  UpgradeStat,
} from './types';

export const SAVE_VERSION = 1;

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(120 * Math.pow(1.22, safeLevel - 1));
}

export function createDailyMissions(dateKey: string): DailyMission[] {
  return [
    {
      id: `m_coins_${dateKey}`,
      type: 'collect_coins',
      titleAr: 'اجمع 60 عملة ذهبية في السباقات',
      target: 60,
      progress: 0,
      rewardCoins: 180,
      rewardXp: 70,
      completed: false,
      claimed: false,
    },
    {
      id: `m_dist_${dateKey}`,
      type: 'distance',
      titleAr: 'اقطع مسافة 2,500 متر إجمالاً',
      target: 2500,
      progress: 0,
      rewardCoins: 220,
      rewardXp: 90,
      completed: false,
      claimed: false,
    },
    {
      id: `m_clean_${dateKey}`,
      type: 'no_crash_race',
      titleAr: 'أنهِ سباقاً واحداً دون أي اصطدام',
      target: 1,
      progress: 0,
      rewardCoins: 260,
      rewardXp: 110,
      completed: false,
      claimed: false,
    },
    {
      id: `m_nitro_${dateKey}`,
      type: 'use_nitro',
      titleAr: 'فعّل النيترو 8 مرات أثناء القيادة',
      target: 8,
      progress: 0,
      rewardCoins: 160,
      rewardXp: 65,
      completed: false,
      claimed: false,
    },
    {
      id: `m_races_${dateKey}`,
      type: 'play_races',
      titleAr: 'شارك في 3 سباقات اليوم',
      target: 3,
      progress: 0,
      rewardCoins: 200,
      rewardXp: 80,
      completed: false,
      claimed: false,
    },
  ];
}

export function createDefaultAchievements(): Achievement[] {
  return [
    {
      id: 'ach_first_race',
      titleAr: 'الانطلاقة الأولى',
      descriptionAr: 'أكمل أول سباق لك في شوارع المدينة.',
      metric: 'totalRaces',
      target: 1,
      progress: 0,
      rewardCoins: 120,
      rewardXp: 50,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_coin_hunter',
      titleAr: 'صياد الذهب',
      descriptionAr: 'اجمع 500 عملة ذهبية من السباقات.',
      metric: 'totalCoinsEarned',
      target: 500,
      progress: 0,
      rewardCoins: 300,
      rewardXp: 120,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_road_runner',
      titleAr: 'قاهر الطرق السريعة',
      descriptionAr: 'اقطع مسافة إجمالية قدرها 10,000 متر.',
      metric: 'totalDistance',
      target: 10000,
      progress: 0,
      rewardCoins: 450,
      rewardXp: 160,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_nitro_master',
      titleAr: 'سيد النيترو',
      descriptionAr: 'استخدم دفعة النيترو 25 مرة.',
      metric: 'totalNitroUses',
      target: 25,
      progress: 0,
      rewardCoins: 320,
      rewardXp: 130,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_clean_driver',
      titleAr: 'قيادة نظيفة',
      descriptionAr: 'أنهِ 3 سباقات دون أي اصطدام.',
      metric: 'cleanRaces',
      target: 3,
      progress: 0,
      rewardCoins: 500,
      rewardXp: 200,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_collector',
      titleAr: 'جامع السيارات',
      descriptionAr: 'افتح 4 سيارات مختلفة في المرآب.',
      metric: 'unlockedCarsCount',
      target: 4,
      progress: 1,
      rewardCoins: 600,
      rewardXp: 220,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_time_king',
      titleAr: 'ملك التوقيت',
      descriptionAr: 'فُز في تحدي الوقت 3 مرات.',
      metric: 'timeWins',
      target: 3,
      progress: 0,
      rewardCoins: 480,
      rewardXp: 180,
      unlocked: false,
      claimed: false,
    },
    {
      id: 'ach_gold_baron',
      titleAr: 'بطل تحدي العملات',
      descriptionAr: 'فُز في تحدي جمع العملات 3 مرات.',
      metric: 'coinWins',
      target: 3,
      progress: 0,
      rewardCoins: 520,
      rewardXp: 190,
      unlocked: false,
      claimed: false,
    },
  ];
}

export function createInitialSaveData(dateKey: string = getLocalDateKey()): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 250, // Starting balance so player can immediately test upgrades or save for car #2
    xp: 0,
    level: 1,
    unlockedCars: ['crimson_gt'],
    selectedCarId: 'crimson_gt',
    upgrades: {
      crimson_gt: { ...DEFAULT_UPGRADES },
    },
    highScores: {
      endless: 0,
      time_challenge: 0,
      coin_challenge: 0,
    },
    totalDistance: 0,
    totalRaces: 0,
    totalCoinsEarned: 0,
    totalNitroUses: 0,
    cleanRaces: 0,
    timeWins: 0,
    coinWins: 0,
    missionsDate: dateKey,
    missions: createDailyMissions(dateKey),
    achievements: createDefaultAchievements(),
    sound: {
      musicEnabled: true,
      sfxEnabled: true,
      musicVolume: 0.45,
      sfxVolume: 0.75,
    },
    controls: {
      touchDrag: true,
      steerButtons: true,
      dayNight: 'night',
    },
    processedRaceIds: [],
    checksum: '',
  };
}

export function syncAchievements(save: SaveData): {
  achievements: Achievement[];
  newlyUnlocked: Achievement[];
} {
  const metricValues: Record<Achievement['metric'], number> = {
    totalRaces: save.totalRaces,
    totalCoinsEarned: save.totalCoinsEarned,
    totalDistance: save.totalDistance,
    totalNitroUses: save.totalNitroUses,
    cleanRaces: save.cleanRaces,
    unlockedCarsCount: save.unlockedCars.length,
    timeWins: save.timeWins,
    coinWins: save.coinWins,
  };

  const newlyUnlocked: Achievement[] = [];
  const updated = save.achievements.map((ach) => {
    const val = Math.min(ach.target, metricValues[ach.metric] ?? ach.progress);
    const wasUnlocked = ach.unlocked;
    const unlocked = wasUnlocked || val >= ach.target;
    const next: Achievement = {
      ...ach,
      progress: val,
      unlocked,
    };
    if (!wasUnlocked && unlocked) {
      newlyUnlocked.push(next);
    }
    return next;
  });

  return { achievements: updated, newlyUnlocked };
}

export function grantXpAndLevelUp(
  currentLevel: number,
  currentXp: number,
  gainedXp: number
): { level: number; xp: number; rewardCoins: number } {
  let level = Math.max(1, currentLevel);
  let xp = Math.max(0, currentXp) + Math.max(0, Math.round(gainedXp));
  let rewardCoins = 0;

  while (xp >= getXpForNextLevel(level)) {
    xp -= getXpForNextLevel(level);
    level += 1;
    rewardCoins += level * 100;
  }

  return { level, xp, rewardCoins };
}

export function refreshDailyMissionsIfNeeded(
  save: SaveData,
  dateKey: string = getLocalDateKey()
): SaveData {
  if (save.missionsDate === dateKey && save.missions.length > 0) {
    return save;
  }
  return {
    ...save,
    missionsDate: dateKey,
    missions: createDailyMissions(dateKey),
  };
}

export function buyCar(
  save: SaveData,
  carId: string
): { success: boolean; save: SaveData; errorAr?: string } {
  const car = CARS.find((c) => c.id === carId);
  if (!car) {
    return { success: false, save, errorAr: 'السيارة غير موجودة.' };
  }
  if (save.unlockedCars.includes(carId)) {
    return {
      success: true,
      save: { ...save, selectedCarId: carId },
    };
  }
  if (save.coins < car.price) {
    return { success: false, save, errorAr: 'رصيد العملات غير كافٍ لشراء هذه السيارة.' };
  }

  const nextSave: SaveData = {
    ...save,
    coins: save.coins - car.price,
    unlockedCars: [...save.unlockedCars, carId],
    selectedCarId: carId,
    upgrades: {
      ...save.upgrades,
      [carId]: getCarUpgrades(save.upgrades, carId),
    },
  };

  const synced = syncAchievements(nextSave);
  return {
    success: true,
    save: { ...nextSave, achievements: synced.achievements },
  };
}

export function selectCar(save: SaveData, carId: string): SaveData {
  if (!save.unlockedCars.includes(carId)) {
    return save;
  }
  return { ...save, selectedCarId: carId };
}

export function upgradeCarStat(
  save: SaveData,
  carId: string,
  stat: UpgradeStat
): { success: boolean; save: SaveData; errorAr?: string } {
  if (!save.unlockedCars.includes(carId)) {
    return { success: false, save, errorAr: 'يجب شراء السيارة أولاً قبل تطويرها.' };
  }
  const car = getCarById(carId);
  const currentUpgrades = getCarUpgrades(save.upgrades, carId);
  const currentLevel = currentUpgrades[stat];

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return { success: false, save, errorAr: 'وصل هذا الجزء إلى الحد الأقصى للتطوير.' };
  }

  const cost = getUpgradeCost(car, stat, currentLevel);
  if (save.coins < cost) {
    return { success: false, save, errorAr: 'رصيد العملات غير كافٍ للتطوير.' };
  }

  const nextUpgrades = {
    ...currentUpgrades,
    [stat]: currentLevel + 1,
  };

  return {
    success: true,
    save: {
      ...save,
      coins: save.coins - cost,
      upgrades: {
        ...save.upgrades,
        [carId]: nextUpgrades,
      },
    },
  };
}

export function claimMissionReward(
  save: SaveData,
  missionId: string
): { success: boolean; save: SaveData; levelUpCoins: number } {
  const target = save.missions.find((m) => m.id === missionId);
  if (!target || !target.completed || target.claimed) {
    return { success: false, save, levelUpCoins: 0 };
  }

  const leveled = grantXpAndLevelUp(save.level, save.xp, target.rewardXp);
  const nextMissions = save.missions.map((m) =>
    m.id === missionId ? { ...m, claimed: true } : m
  );

  return {
    success: true,
    levelUpCoins: leveled.rewardCoins,
    save: {
      ...save,
      coins: save.coins + target.rewardCoins + leveled.rewardCoins,
      level: leveled.level,
      xp: leveled.xp,
      missions: nextMissions,
    },
  };
}

export function claimAchievementReward(
  save: SaveData,
  achievementId: string
): { success: boolean; save: SaveData; levelUpCoins: number } {
  const target = save.achievements.find((a) => a.id === achievementId);
  if (!target || !target.unlocked || target.claimed) {
    return { success: false, save, levelUpCoins: 0 };
  }

  const leveled = grantXpAndLevelUp(save.level, save.xp, target.rewardXp);
  const nextAchievements = save.achievements.map((a) =>
    a.id === achievementId ? { ...a, claimed: true } : a
  );

  return {
    success: true,
    levelUpCoins: leveled.rewardCoins,
    save: {
      ...save,
      coins: save.coins + target.rewardCoins + leveled.rewardCoins,
      level: leveled.level,
      xp: leveled.xp,
      achievements: nextAchievements,
    },
  };
}

export function applyRaceResult(
  rawSave: SaveData,
  result: RaceResult,
  dateKey: string = getLocalDateKey()
): RaceApplyOutcome {
  const save = refreshDailyMissionsIfNeeded(rawSave, dateKey);

  // Guard against duplicate reward processing for the same raceId
  if (save.processedRaceIds.includes(result.raceId)) {
    return {
      save,
      xpEarned: 0,
      bonusCoins: 0,
      levelBefore: save.level,
      levelAfter: save.level,
      levelUpRewardCoins: 0,
      isNewHighScore: false,
      newlyCompletedMissions: [],
      newlyUnlockedAchievements: [],
    };
  }

  const distance = Math.max(0, Math.round(result.distanceMeters));
  const collected = Math.max(0, Math.round(result.coinsCollected));
  const score = Math.max(0, Math.round(result.score));

  // Mode completion bonus coins
  let bonusCoins = 0;
  if (result.endReason !== 'aborted') {
    if (result.mode === 'endless') {
      bonusCoins = Math.floor(distance / 250) * 15;
    } else if (result.mode === 'time_challenge') {
      bonusCoins = result.won ? 140 + Math.floor(distance / 300) * 10 : 40;
    } else if (result.mode === 'coin_challenge') {
      bonusCoins = result.won ? 160 : 35;
    }
    if (result.crashesCount === 0 && distance >= 300) {
      bonusCoins += 40; // Clean run bonus
    }
  }

  const xpEarned =
    result.endReason === 'aborted'
      ? Math.floor(distance / 60)
      : Math.max(
          15,
          Math.round(distance / 25 + collected * 1.4 + result.nearMisses * 5 + (result.won ? 60 : 0))
        );

  const leveled = grantXpAndLevelUp(save.level, save.xp, xpEarned);
  const prevBest = save.highScores[result.mode] ?? 0;
  const isNewHighScore = score > prevBest;

  const cleanFinish = result.endReason !== 'aborted' && result.crashesCount === 0 && distance >= 350;

  // Update daily missions
  const newlyCompletedMissions: DailyMission[] = [];
  const nextMissions = save.missions.map((m) => {
    if (m.completed) return m;
    let delta = 0;
    if (m.type === 'collect_coins') delta = collected;
    else if (m.type === 'distance') delta = distance;
    else if (m.type === 'no_crash_race') delta = cleanFinish ? 1 : 0;
    else if (m.type === 'use_nitro') delta = result.nitroActivations;
    else if (m.type === 'play_races') delta = distance >= 80 ? 1 : 0;

    const progress = Math.min(m.target, m.progress + delta);
    const completed = progress >= m.target;
    const next: DailyMission = { ...m, progress, completed };
    if (completed) newlyCompletedMissions.push(next);
    return next;
  });

  const nextSavePreAch: SaveData = {
    ...save,
    coins: save.coins + collected + bonusCoins + leveled.rewardCoins,
    xp: leveled.xp,
    level: leveled.level,
    highScores: {
      ...save.highScores,
      [result.mode]: Math.max(prevBest, score),
    },
    totalDistance: save.totalDistance + distance,
    totalRaces: save.totalRaces + (distance >= 60 ? 1 : 0),
    totalCoinsEarned: save.totalCoinsEarned + collected + bonusCoins,
    totalNitroUses: save.totalNitroUses + result.nitroActivations,
    cleanRaces: save.cleanRaces + (cleanFinish ? 1 : 0),
    timeWins: save.timeWins + (result.mode === 'time_challenge' && result.won ? 1 : 0),
    coinWins: save.coinWins + (result.mode === 'coin_challenge' && result.won ? 1 : 0),
    missions: nextMissions,
    processedRaceIds: [...save.processedRaceIds.slice(-30), result.raceId],
  };

  const syncedAch = syncAchievements(nextSavePreAch);

  return {
    save: {
      ...nextSavePreAch,
      achievements: syncedAch.achievements,
    },
    xpEarned,
    bonusCoins,
    levelBefore: save.level,
    levelAfter: leveled.level,
    levelUpRewardCoins: leveled.rewardCoins,
    isNewHighScore,
    newlyCompletedMissions,
    newlyUnlockedAchievements: syncedAch.newlyUnlocked,
  };
}
