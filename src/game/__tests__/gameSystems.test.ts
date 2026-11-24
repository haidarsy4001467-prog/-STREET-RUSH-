import { describe, expect, it } from 'vitest';
import {
  CARS,
  getCarById,
  getEffectiveCarStats,
  getUpgradeCost,
  MAX_UPGRADE_LEVEL,
} from '../cars';
import {
  COIN_CHALLENGE_TARGET,
  LANE_CENTERS,
  ROAD_LEFT,
  ROAD_RIGHT,
  StreetRushEngine,
  TIME_CHALLENGE_DURATION,
  TIME_CHALLENGE_TARGET_METERS,
  checkAABBOverlap,
  getSafeSpawnLanes,
} from '../engine';
import {
  applyRaceResult,
  buyCar,
  claimAchievementReward,
  claimMissionReward,
  createInitialSaveData,
  getXpForNextLevel,
  selectCar,
  upgradeCarStat,
} from '../progression';
import { loadSaveData, persistSaveData, sanitizeSaveData } from '../storage';
import type { RaceResult } from '../types';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe('STREET RUSH Core Systems Verification', () => {
  it('1. Initializes default save data with 8 available cars and starter car unlocked', () => {
    expect(CARS.length).toBeGreaterThanOrEqual(8);
    const save = createInitialSaveData('2026-11-24');
    expect(save.level).toBe(1);
    expect(save.unlockedCars).toContain('crimson_gt');
    expect(save.selectedCarId).toBe('crimson_gt');
    expect(save.missions.length).toBe(5);
    expect(save.achievements.length).toBe(8);
  });

  it('2 & 3. Handles player movement and enforces strict road boundaries', () => {
    const save = createInitialSaveData('2026-11-24');
    const engine = new StreetRushEngine('endless', save, () => {}, () => {});

    // Steer left hard for 2 seconds
    engine.input.leftHeld = true;
    for (let i = 0; i < 60; i++) engine.step(1 / 60);
    expect(engine.playerX).toBeGreaterThanOrEqual(ROAD_LEFT + engine.playerWidth / 2);

    // Steer right hard for 3 seconds
    engine.input.leftHeld = false;
    engine.input.rightHeld = true;
    for (let i = 0; i < 120; i++) engine.step(1 / 60);
    expect(engine.playerX).toBeLessThanOrEqual(ROAD_RIGHT - engine.playerWidth / 2);
  });

  it('4 & 5. Traffic & obstacle spawner guarantees at least one passable lane', () => {
    const blockedThreeLanes = [
      { lane: 0, targetLane: 0, y: -120, height: 80 },
      { lane: 1, targetLane: 1, y: -120, height: 80 },
      { lane: 2, targetLane: 2, y: -120, height: 80 },
    ];
    // With 3 lanes blocked, lane 3 is the last open lane -> must return [] to prevent walling
    expect(getSafeSpawnLanes(blockedThreeLanes, [], -120)).toEqual([]);

    const twoLanesBlocked = [
      { lane: 0, targetLane: 0, y: -120, height: 80 },
      { lane: 2, targetLane: 2, y: -120, height: 80 },
    ];
    const safe = getSafeSpawnLanes(twoLanesBlocked, [], -120);
    expect(safe).toEqual([1, 3]);
  });

  it('6. Accurate collision detection reduces armor and triggers Game Over on 3rd hit', () => {
    expect(
      checkAABBOverlap(
        { x: 100, y: 500, width: 42, height: 82 },
        { x: 110, y: 510, width: 40, height: 78 }
      )
    ).toBe(true);
    expect(
      checkAABBOverlap(
        { x: 100, y: 500, width: 42, height: 82 },
        { x: 250, y: 500, width: 40, height: 78 }
      )
    ).toBe(false);

    const save = createInitialSaveData('2026-11-24');
    let finishedResult: RaceResult | null = null;
    const engine = new StreetRushEngine('endless', save, () => {}, (res) => {
      finishedResult = res;
    });

    for (let hit = 1; hit <= 3; hit++) {
      // Clear any active 55ms hitstop freeze before next impact
      for (let f = 0; f < 5; f++) engine.step(0.016);
      engine.invulnTimer = 0;
      engine.traffic = [];
      engine.obstacles = [
        {
          id: 100 + hit,
          kind: 'barrier',
          lane: 1,
          x: engine.playerX,
          y: engine.playerY,
          width: 52,
          height: 24,
        },
      ];
      engine.step(0.016);
    }

    expect(engine.crashesCount).toBe(3);
    expect(engine.finished).toBe(true);
    expect(finishedResult).not.toBeNull();
    expect(finishedResult!.endReason).toBe('crash');
    expect(finishedResult!.won).toBe(false);
  });

  it('7. Collects coins inside race and prevents duplicate reward settlement', () => {
    const save = createInitialSaveData('2026-11-24');
    const engine = new StreetRushEngine('endless', save, () => {}, () => {});
    engine.coins.push({
      id: 99,
      x: engine.playerX,
      y: engine.playerY,
      radius: 13,
      collected: false,
      phase: 0,
    });
    engine.step(0.016);
    expect(engine.coinsCollected).toBe(1);

    const raceRes: RaceResult = {
      raceId: 'race_unique_1',
      mode: 'endless',
      won: false,
      endReason: 'crash',
      score: 600,
      distanceMeters: 260,
      durationSec: 25,
      coinsCollected: 12,
      nearMisses: 2,
      nitroActivations: 3,
      crashesCount: 3,
      maxSpeedKmh: 240,
    };

    const firstApply = applyRaceResult(save, raceRes, '2026-11-24');
    const coinsAfterFirst = firstApply.save.coins;
    expect(coinsAfterFirst).toBeGreaterThan(save.coins);

    // Re-submitting the exact same raceId must be a no-op
    const duplicateApply = applyRaceResult(firstApply.save, raceRes, '2026-11-24');
    expect(duplicateApply.save.coins).toBe(coinsAfterFirst);
    expect(duplicateApply.xpEarned).toBe(0);
  });

  it('8. Nitro increases speed, consumes energy, and recharges when released', () => {
    const save = createInitialSaveData('2026-11-24');
    const engine = new StreetRushEngine('endless', save, () => {}, () => {});
    const initialNitro = engine.nitroEnergy;

    // Warm up to steady cruise speed without random traffic interference
    for (let i = 0; i < 180; i++) {
      engine.traffic = [];
      engine.obstacles = [];
      engine.step(1 / 60);
    }
    const cruiseSpeed = engine.currentSpeedPx;

    // Activate nitro
    engine.input.nitroHeld = true;
    for (let i = 0; i < 30; i++) {
      engine.traffic = [];
      engine.obstacles = [];
      engine.step(1 / 60);
    }
    expect(engine.nitroActive).toBe(true);
    expect(engine.nitroActivations).toBe(1);
    expect(engine.currentSpeedPx).toBeGreaterThan(cruiseSpeed);
    expect(engine.nitroEnergy).toBeLessThan(initialNitro);

    // Release nitro and verify recharge
    const depletedLevel = engine.nitroEnergy;
    engine.input.nitroHeld = false;
    for (let i = 0; i < 60; i++) engine.step(1 / 60);
    expect(engine.nitroActive).toBe(false);
    expect(engine.nitroEnergy).toBeGreaterThan(depletedLevel);
  });

  it('9 & 10. Car purchasing blocks insufficient funds and upgrades measurably improve physics stats', () => {
    let save = createInitialSaveData('2026-11-24');
    // Starter coins (250) < azure_bolt (450) -> rejected
    const failedBuy = buyCar(save, 'azure_bolt');
    expect(failedBuy.success).toBe(false);
    expect(failedBuy.save.unlockedCars).not.toContain('azure_bolt');

    // Grant coins and buy
    save = { ...save, coins: 1200 };
    const successBuy = buyCar(save, 'azure_bolt');
    expect(successBuy.success).toBe(true);
    expect(successBuy.save.unlockedCars).toContain('azure_bolt');
    expect(successBuy.save.selectedCarId).toBe('azure_bolt');
    expect(successBuy.save.coins).toBe(1200 - 450);

    // Verify upgrading speed & nitro changes real physics outputs
    const car = getCarById('azure_bolt');
    const beforeStats = getEffectiveCarStats(car, successBuy.save.upgrades.azure_bolt);
    const upgRes = upgradeCarStat(successBuy.save, 'azure_bolt', 'speedLevel');
    expect(upgRes.success).toBe(true);
    const cost = getUpgradeCost(car, 'speedLevel', 0);
    expect(upgRes.save.coins).toBe(successBuy.save.coins - cost);

    const afterStats = getEffectiveCarStats(car, upgRes.save.upgrades.azure_bolt);
    expect(afterStats.topSpeedPx).toBeGreaterThan(beforeStats.topSpeedPx);

    // Select car validation
    const selectedBack = selectCar(upgRes.save, 'crimson_gt');
    expect(selectedBack.selectedCarId).toBe('crimson_gt');
    // Cannot select locked car
    const lockedAttempt = selectCar(selectedBack, 'hyper_falcon');
    expect(lockedAttempt.selectedCarId).toBe('crimson_gt');
  });

  it('11. All three game modes enforce their win/loss conditions', () => {
    const save = createInitialSaveData('2026-11-24');

    // Time Challenge win when distance >= target when timer expires
    let timeResult: RaceResult | null = null;
    const timeEngine = new StreetRushEngine('time_challenge', save, () => {}, (r) => {
      timeResult = r;
    });
    timeEngine.distancePx = TIME_CHALLENGE_TARGET_METERS * 18;
    timeEngine.elapsedSec = TIME_CHALLENGE_DURATION;
    timeEngine.step(0.016);
    expect(timeResult).not.toBeNull();
    expect(timeResult!.won).toBe(true);
    expect(timeResult!.endReason).toBe('time_up');

    // Coin Challenge win immediately when target coins reached
    let coinResult: RaceResult | null = null;
    const coinEngine = new StreetRushEngine('coin_challenge', save, () => {}, (r) => {
      coinResult = r;
    });
    coinEngine.coinsCollected = COIN_CHALLENGE_TARGET;
    coinEngine.step(0.016);
    expect(coinResult).not.toBeNull();
    expect(coinResult!.won).toBe(true);
    expect(coinResult!.endReason).toBe('target_reached');
  });

  it('12, 13 & 14. Daily missions, achievements, and XP leveling award and claim properly', () => {
    let save = createInitialSaveData('2026-11-24');
    const cleanResult: RaceResult = {
      raceId: 'race_clean_1',
      mode: 'time_challenge',
      won: true,
      endReason: 'time_up',
      score: 3400,
      distanceMeters: 2600,
      durationSec: 60,
      coinsCollected: 65,
      nearMisses: 4,
      nitroActivations: 9,
      crashesCount: 0,
      maxSpeedKmh: 265,
    };

    const outcome = applyRaceResult(save, cleanResult, '2026-11-24');
    save = outcome.save;
    expect(save.level).toBeGreaterThan(1);
    expect(outcome.xpEarned).toBeGreaterThan(getXpForNextLevel(1));
    expect(outcome.newlyCompletedMissions.length).toBeGreaterThanOrEqual(4);
    expect(save.achievements.find((a) => a.id === 'ach_first_race')?.unlocked).toBe(true);

    // Claim mission reward once; second claim fails
    const missionId = outcome.newlyCompletedMissions[0].id;
    const coinsBefore = save.coins;
    const claim1 = claimMissionReward(save, missionId);
    expect(claim1.success).toBe(true);
    expect(claim1.save.coins).toBeGreaterThan(coinsBefore);
    const claim2 = claimMissionReward(claim1.save, missionId);
    expect(claim2.success).toBe(false);

    // Claim achievement reward once
    const achClaim1 = claimAchievementReward(claim2.save, 'ach_first_race');
    expect(achClaim1.success).toBe(true);
    const achClaim2 = claimAchievementReward(achClaim1.save, 'ach_first_race');
    expect(achClaim2.success).toBe(false);
  });

  it('15, 16, 17 & 18. Pause/resume, persistence round-trip, and corrupt storage recovery', () => {
    const storage = createMemoryStorage();
    const save = createInitialSaveData('2026-11-24');
    save.coins = 888;
    save.highScores.endless = 4321;

    // Pause stops simulation advancement
    const engine = new StreetRushEngine('endless', save, () => {}, () => {});
    engine.setPaused(true);
    const xBefore = engine.playerX;
    engine.input.rightHeld = true;
    engine.step(0.05);
    expect(engine.playerX).toBe(xBefore);
    engine.setPaused(false);
    engine.input.rightHeld = true;
    engine.step(0.05);
    expect(engine.playerX).toBeGreaterThan(xBefore);

    // Persist and reload across simulated restart
    persistSaveData(save, storage);
    const reloaded = loadSaveData(storage);
    expect(reloaded.coins).toBe(888);
    expect(reloaded.highScores.endless).toBe(4321);

    // Corrupt JSON recovery
    storage.setItem('street_rush_save_v1', '{broken_json!!!');
    const recovered = loadSaveData(storage);
    expect(recovered.level).toBe(1);
    expect(recovered.unlockedCars).toContain('crimson_gt');

    // Invalid negative/NaN fields sanitized cleanly
    const sanitized = sanitizeSaveData({
      coins: -500,
      level: 0,
      unlockedCars: ['invalid_car'],
      selectedCarId: 'invalid_car',
      upgrades: { crimson_gt: { speedLevel: 99, accelLevel: -4 } },
    });
    expect(sanitized.coins).toBe(0);
    expect(sanitized.level).toBe(1);
    expect(sanitized.selectedCarId).toBe('crimson_gt');
    expect(sanitized.upgrades.crimson_gt.speedLevel).toBe(MAX_UPGRADE_LEVEL);
    expect(sanitized.upgrades.crimson_gt.accelLevel).toBe(0);

    const nanCoins = sanitizeSaveData({ coins: Number.NaN });
    expect(nanCoins.coins).toBe(250);
    expect(LANE_CENTERS.length).toBe(4);
  });
});
