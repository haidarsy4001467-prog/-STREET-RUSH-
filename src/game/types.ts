export type GameMode = 'endless' | 'time_challenge' | 'coin_challenge';
export type TimeOfDay = 'night' | 'day';
export type CarBodyStyle = 'coupe' | 'hyper' | 'muscle' | 'gt' | 'cyber' | 'prototype';
export type UpgradeStat = 'speedLevel' | 'accelLevel' | 'handlingLevel' | 'nitroLevel';

export interface CarSpec {
  id: string;
  nameAr: string;
  categoryAr: string;
  descriptionAr: string;
  price: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bodyStyle: CarBodyStyle;
  /** Base ratings on a 1..100 scale for UI display */
  baseTopSpeed: number;
  baseAcceleration: number;
  baseHandling: number;
  baseNitroCapacity: number;
}

export interface CarUpgradeState {
  speedLevel: number;
  accelLevel: number;
  handlingLevel: number;
  nitroLevel: number;
}

export interface EffectiveCarStats {
  /** Maximum forward scroll speed in logical px/sec */
  topSpeedPx: number;
  /** Forward acceleration rate in logical px/sec^2 */
  accelRate: number;
  /** Lateral steering responsiveness in logical px/sec */
  handlingSpeed: number;
  /** Maximum nitro pool (100 = baseline) */
  nitroMax: number;
  /** Nitro passive + near-miss regen multiplier */
  nitroRegenPerSec: number;
  /** Display ratings 0..100 */
  displaySpeed: number;
  displayAccel: number;
  displayHandling: number;
  displayNitro: number;
}

export type MissionType =
  | 'collect_coins'
  | 'distance'
  | 'no_crash_race'
  | 'use_nitro'
  | 'play_races';

export interface DailyMission {
  id: string;
  type: MissionType;
  titleAr: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  completed: boolean;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  titleAr: string;
  descriptionAr: string;
  metric:
    | 'totalRaces'
    | 'totalCoinsEarned'
    | 'totalDistance'
    | 'totalNitroUses'
    | 'cleanRaces'
    | 'unlockedCarsCount'
    | 'timeWins'
    | 'coinWins';
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface SoundSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface ControlSettings {
  touchDrag: boolean;
  steerButtons: boolean;
  dayNight: TimeOfDay;
}

export interface HighScores {
  endless: number;
  time_challenge: number;
  coin_challenge: number;
}

export interface SaveData {
  version: number;
  coins: number;
  xp: number;
  level: number;
  unlockedCars: string[];
  selectedCarId: string;
  upgrades: Record<string, CarUpgradeState>;
  highScores: HighScores;
  totalDistance: number;
  totalRaces: number;
  totalCoinsEarned: number;
  totalNitroUses: number;
  cleanRaces: number;
  timeWins: number;
  coinWins: number;
  missionsDate: string;
  missions: DailyMission[];
  achievements: Achievement[];
  sound: SoundSettings;
  controls: ControlSettings;
  processedRaceIds: string[];
  checksum: string;
}

export interface RaceResult {
  raceId: string;
  mode: GameMode;
  won: boolean;
  endReason: 'crash' | 'time_up' | 'target_reached' | 'aborted';
  score: number;
  distanceMeters: number;
  durationSec: number;
  coinsCollected: number;
  nearMisses: number;
  nitroActivations: number;
  crashesCount: number;
  maxSpeedKmh: number;
}

export interface RaceApplyOutcome {
  save: SaveData;
  xpEarned: number;
  bonusCoins: number;
  levelBefore: number;
  levelAfter: number;
  levelUpRewardCoins: number;
  isNewHighScore: boolean;
  newlyCompletedMissions: DailyMission[];
  newlyUnlockedAchievements: Achievement[];
}
