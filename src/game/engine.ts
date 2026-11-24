import { soundEngine } from './audio';
import { drawTopDownCar, drawTruckOrVan } from './carRenderer';
import { getCarById, getCarUpgrades, getEffectiveCarStats } from './cars';
import type {
  CarBodyStyle,
  CarSpec,
  ControlSettings,
  EffectiveCarStats,
  GameMode,
  RaceResult,
  SaveData,
} from './types';

export const WORLD_WIDTH = 420;
export const WORLD_HEIGHT = 746;
export const ROAD_LEFT = 38;
export const ROAD_RIGHT = 382;
export const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT; // 344
export const LANE_COUNT = 4;
export const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT; // 86
export const LANE_CENTERS = [
  ROAD_LEFT + LANE_WIDTH * 0.5,
  ROAD_LEFT + LANE_WIDTH * 1.5,
  ROAD_LEFT + LANE_WIDTH * 2.5,
  ROAD_LEFT + LANE_WIDTH * 3.5,
];

export const TIME_CHALLENGE_DURATION = 60;
export const TIME_CHALLENGE_TARGET_METERS = 1200;
export const COIN_CHALLENGE_TARGET = 35;
export const COIN_CHALLENGE_DURATION = 75;

export interface TrafficEntity {
  id: number;
  kind: 'sedan' | 'suv' | 'truck' | 'rival';
  lane: number;
  targetLane: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speedPx: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bodyStyle: CarBodyStyle;
  laneShiftTelegraph: number; // > 0 means blinking before moving
  nearMissed: boolean;
}

export interface ObstacleEntity {
  id: number;
  kind: 'barrier' | 'cone';
  lane: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoinEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  phase: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface HudSnapshot {
  mode: GameMode;
  score: number;
  distanceMeters: number;
  speedKmh: number;
  coinsCollected: number;
  nitroRatio: number;
  nitroActive: boolean;
  armor: number; // 3 down to 0
  maxArmor: number;
  timeRemaining: number;
  targetMeters: number;
  targetCoins: number;
  nearMisses: number;
  comboMessage: string | null;
}

export interface InputState {
  leftHeld: boolean;
  rightHeld: boolean;
  nitroHeld: boolean;
  pointerActive: boolean;
  pointerTargetX: number | null;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Shrink-wrapped AABB collision helper for crisp, fair arcade feel */
export function checkAABBOverlap(a: RectBounds, b: RectBounds, tolerance = 0.84): boolean {
  const aw = a.width * tolerance;
  const ah = a.height * tolerance;
  const bw = b.width * tolerance;
  const bh = b.height * tolerance;
  return (
    Math.abs(a.x - b.x) * 2 < aw + bw &&
    Math.abs(a.y - b.y) * 2 < ah + bh
  );
}

/**
 * Fairness solver: returns available lane indices for spawning at spawnY
 * while guaranteeing at least 1 lane remains completely passable in the band.
 */
export function getSafeSpawnLanes(
  traffic: Pick<TrafficEntity, 'lane' | 'targetLane' | 'y' | 'height'>[],
  obstacles: Pick<ObstacleEntity, 'lane' | 'y' | 'height'>[],
  spawnY: number,
  bandHalfHeight = 165
): number[] {
  const occupied = new Set<number>();

  for (const t of traffic) {
    if (Math.abs(t.y - spawnY) < bandHalfHeight + t.height * 0.5) {
      occupied.add(t.lane);
      occupied.add(t.targetLane);
    }
  }
  for (const o of obstacles) {
    if (Math.abs(o.y - spawnY) < bandHalfHeight + o.height * 0.5) {
      occupied.add(o.lane);
    }
  }

  // Always reserve at least 1 clear lane!
  const freeLanes: number[] = [];
  for (let i = 0; i < LANE_COUNT; i++) {
    if (!occupied.has(i)) freeLanes.push(i);
  }
  if (freeLanes.length <= 1) {
    return [];
  }
  // Never fill the last remaining open lane
  return freeLanes;
}

export class StreetRushEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private lastTimestamp = 0;

  public mode: GameMode;
  public car: CarSpec;
  public stats: EffectiveCarStats;
  public controls: ControlSettings;

  // Player state
  public playerX = LANE_CENTERS[1];
  public playerY = WORLD_HEIGHT - 148;
  public playerWidth = 42;
  public playerHeight = 82;
  public playerAngle = 0;
  public currentSpeedPx = 220;
  public nitroEnergy = 100;
  public nitroActive = false;
  public nitroActivations = 0;
  public armor = 3;
  public readonly maxArmor = 3;
  public invulnTimer = 0;
  public hitFlashTimer = 0;

  // Race metrics
  public raceId: string;
  public distancePx = 0;
  public distanceMeters = 0;
  public score = 0;
  public coinsCollected = 0;
  public nearMisses = 0;
  public crashesCount = 0;
  public maxSpeedKmh = 0;
  public elapsedSec = 0;
  public paused = false;
  public finished = false;
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private roadScroll = 0;
  private comboMessage: string | null = null;
  private comboTimer = 0;

  // Entities & pooling
  private nextEntityId = 1;
  public traffic: TrafficEntity[] = [];
  public obstacles: ObstacleEntity[] = [];
  public coins: CoinEntity[] = [];
  private particles: Particle[] = [];

  private trafficSpawnTimer = 0.6;
  private obstacleSpawnTimer = 2.4;
  private coinSpawnTimer = 0.9;

  public input: InputState = {
    leftHeld: false,
    rightHeld: false,
    nitroHeld: false,
    pointerActive: false,
    pointerTargetX: null,
  };

  private onHudUpdate: (hud: HudSnapshot) => void;
  private onRaceComplete: (result: RaceResult) => void;
  private hudSyncAccum = 0;

  constructor(
    mode: GameMode,
    save: SaveData,
    onHudUpdate: (hud: HudSnapshot) => void,
    onRaceComplete: (result: RaceResult) => void
  ) {
    this.mode = mode;
    this.car = getCarById(save.selectedCarId);
    const upgrades = getCarUpgrades(save.upgrades, this.car.id);
    this.stats = getEffectiveCarStats(this.car, upgrades);
    this.controls = { ...save.controls };
    this.nitroEnergy = this.stats.nitroMax;
    this.raceId = `race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.onHudUpdate = onHudUpdate;
    this.onRaceComplete = onRaceComplete;

    // Pre-allocate particle pool
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#F59E0B',
      });
    }
  }

  public mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    this.lastTimestamp = performance.now();
    soundEngine.startEngine();
    this.emitHud();
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  public unmount(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    soundEngine.stopEngine();
    this.canvas = null;
    this.ctx = null;
  }

  public resizeCanvas(): void {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(WORLD_WIDTH * dpr);
    this.canvas.height = Math.round(WORLD_HEIGHT * dpr);
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  public setPaused(pause: boolean): void {
    this.paused = pause;
    if (pause) {
      soundEngine.stopEngine();
      this.clearInputs();
    } else if (!this.finished) {
      this.lastTimestamp = performance.now();
      soundEngine.startEngine();
    }
  }

  public clearInputs(): void {
    this.input.leftHeld = false;
    this.input.rightHeld = false;
    this.input.nitroHeld = false;
    this.input.pointerActive = false;
    this.input.pointerTargetX = null;
  }

  public abortRace(): void {
    if (this.finished) return;
    this.finished = true;
    soundEngine.stopEngine();
    this.onRaceComplete(this.buildResult(false, 'aborted'));
  }

  private loop = (timestamp: number): void => {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(Math.max(rawDt, 0), 0.05);

    if (!this.paused && !this.finished) {
      this.step(dt);
    }
    this.render();

    if (!this.finished) {
      this.rafId = window.requestAnimationFrame(this.loop);
    }
  };

  /** Deterministic simulation tick — directly callable in unit tests */
  public step(dt: number): void {
    if (this.finished || this.paused) return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 28);
      return;
    }

    this.elapsedSec += dt;
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.shakeIntensity > 0) this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 26);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboMessage = null;
    }

    // Difficulty ramp over distance
    const difficultyMultiplier = 1 + Math.min(0.45, this.distanceMeters / 6500);
    const desiredTopSpeed = this.stats.topSpeedPx * difficultyMultiplier;

    // Nitro logic
    const wantsNitro = this.input.nitroHeld;
    if (wantsNitro && (this.nitroActive ? this.nitroEnergy > 0.5 : this.nitroEnergy >= 18)) {
      if (!this.nitroActive) {
        this.nitroActive = true;
        this.nitroActivations += 1;
        soundEngine.playNitroBurst();
        soundEngine.setNitroSound(true);
      }
      this.nitroEnergy = Math.max(0, this.nitroEnergy - 32 * dt);
      if (this.nitroEnergy <= 0.5) {
        this.nitroActive = false;
        soundEngine.setNitroSound(false);
      }
    } else {
      if (this.nitroActive) {
        this.nitroActive = false;
        soundEngine.setNitroSound(false);
      }
      this.nitroEnergy = Math.min(
        this.stats.nitroMax,
        this.nitroEnergy + this.stats.nitroRegenPerSec * dt
      );
    }

    const targetSpeed = this.nitroActive ? desiredTopSpeed * 1.46 : desiredTopSpeed;
    const accelFactor = this.nitroActive ? this.stats.accelRate * 2.4 : this.stats.accelRate;
    if (this.currentSpeedPx < targetSpeed) {
      this.currentSpeedPx = Math.min(targetSpeed, this.currentSpeedPx + accelFactor * dt);
    } else {
      this.currentSpeedPx = Math.max(targetSpeed, this.currentSpeedPx - 280 * dt);
    }

    const kmh = Math.round(this.currentSpeedPx * 0.29);
    if (kmh > this.maxSpeedKmh) this.maxSpeedKmh = kmh;
    soundEngine.updateEngine(this.currentSpeedPx / this.stats.topSpeedPx, this.nitroActive);

    // Steering: support both touch-drag and directional buttons/keys
    let steerDir = 0;
    if (this.input.leftHeld) steerDir -= 1;
    if (this.input.rightHeld) steerDir += 1;

    let vx = steerDir * this.stats.handlingSpeed;
    if (steerDir === 0 && this.controls.touchDrag && this.input.pointerActive && this.input.pointerTargetX !== null) {
      const diff = this.input.pointerTargetX - this.playerX;
      const maxFollow = this.stats.handlingSpeed * 1.35;
      vx = Math.max(-maxFollow, Math.min(maxFollow, diff * 12));
    }

    this.playerX += vx * dt;
    const minX = ROAD_LEFT + this.playerWidth / 2 + 5;
    const maxX = ROAD_RIGHT - this.playerWidth / 2 - 5;
    this.playerX = Math.max(minX, Math.min(maxX, this.playerX));

    // Smooth visual banking angle
    const targetAngle = (vx / this.stats.handlingSpeed) * 0.16;
    this.playerAngle += (targetAngle - this.playerAngle) * Math.min(1, dt * 14);

    // Advance road & distance
    const dy = this.currentSpeedPx * dt;
    this.roadScroll = (this.roadScroll + dy) % 80;
    this.distancePx += dy;
    this.distanceMeters = Math.floor(this.distancePx / 18);
    this.score =
      this.distanceMeters * 2 +
      this.coinsCollected * 25 +
      this.nearMisses * 45;

    // Nitro exhaust particles
    if (this.nitroActive && Math.random() < 0.85) {
      this.spawnParticle(
        this.playerX + (Math.random() - 0.5) * 18,
        this.playerY + this.playerHeight * 0.48,
        (Math.random() - 0.5) * 45,
        180 + Math.random() * 120,
        0.24,
        4,
        '#38BDF8'
      );
    }

    // Spawners
    this.updateSpawners(dt, difficultyMultiplier);

    // Update Traffic
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const t = this.traffic[i];
      // Traffic moves upward in world, so relative downward motion on canvas is (playerSpeed - trafficSpeed)
      t.y += (this.currentSpeedPx - t.speedPx) * dt;

      // Rival lane weaving with visible telegraph
      if (t.kind === 'rival' && t.lane === t.targetLane && t.y > 40 && t.y < 380 && Math.random() < 0.45 * dt) {
        const candidate = t.lane + (Math.random() < 0.5 ? -1 : 1);
        if (candidate >= 0 && candidate < LANE_COUNT) {
          const blocked = this.traffic.some(
            (other) =>
              other.id !== t.id &&
              (other.lane === candidate || other.targetLane === candidate) &&
              Math.abs(other.y - t.y) < 130
          );
          if (!blocked) {
            t.targetLane = candidate;
            t.laneShiftTelegraph = 0.65;
          }
        }
      }

      if (t.lane !== t.targetLane) {
        if (t.laneShiftTelegraph > 0) {
          t.laneShiftTelegraph -= dt;
        } else {
          const destX = LANE_CENTERS[t.targetLane];
          const dx = destX - t.x;
          if (Math.abs(dx) < 2) {
            t.x = destX;
            t.lane = t.targetLane;
          } else {
            t.x += Math.sign(dx) * Math.min(Math.abs(dx), 145 * dt);
          }
        }
      }

      // Near-miss bonus check
      if (!t.nearMissed && Math.abs(t.y - this.playerY) < 42) {
        const gapX = Math.abs(t.x - this.playerX) - (t.width + this.playerWidth) / 2;
        if (gapX > 0 && gapX < 24) {
          t.nearMissed = true;
          this.nearMisses += 1;
          this.nitroEnergy = Math.min(this.stats.nitroMax, this.nitroEnergy + 14);
          this.showCombo('تجاوز خطير +14% نيترو!');
          soundEngine.playNearMiss();
        }
      }

      // Collision check
      if (
        this.invulnTimer <= 0 &&
        checkAABBOverlap(
          { x: this.playerX, y: this.playerY, width: this.playerWidth, height: this.playerHeight },
          { x: t.x, y: t.y, width: t.width, height: t.height }
        )
      ) {
        this.handleCrash(t.x, t.y);
        t.y = WORLD_HEIGHT + 300; // push crashed vehicle out
      }

      if (t.y > WORLD_HEIGHT + 160 || t.y < -360) {
        this.traffic.splice(i, 1);
      }
    }

    // Update Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += this.currentSpeedPx * dt;

      if (
        this.invulnTimer <= 0 &&
        checkAABBOverlap(
          { x: this.playerX, y: this.playerY, width: this.playerWidth, height: this.playerHeight },
          { x: o.x, y: o.y, width: o.width, height: o.height },
          0.82
        )
      ) {
        this.handleCrash(o.x, o.y);
        this.obstacles.splice(i, 1);
        continue;
      }

      if (o.y > WORLD_HEIGHT + 120) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.y += this.currentSpeedPx * dt;
      c.phase += dt * 7;

      // Gentle magnetic pull near player car
      const dx = this.playerX - c.x;
      const dyCoin = this.playerY - c.y;
      const dist = Math.hypot(dx, dyCoin);
      if (dist < 76) {
        c.x += (dx / Math.max(1, dist)) * 280 * dt;
        c.y += (dyCoin / Math.max(1, dist)) * 280 * dt;
      }

      if (!c.collected && dist < 34) {
        c.collected = true;
        this.coinsCollected += 1;
        soundEngine.playCoin();
        for (let p = 0; p < 7; p++) {
          const ang = (Math.PI * 2 * p) / 7;
          this.spawnParticle(c.x, c.y, Math.cos(ang) * 110, Math.sin(ang) * 110, 0.3, 3.5, '#FBBF24');
        }
        this.coins.splice(i, 1);
        continue;
      }

      if (c.y > WORLD_HEIGHT + 60) {
        this.coins.splice(i, 1);
      }
    }

    // Update Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Check Mode Win / Loss conditions
    this.checkModeConditions();

    // Throttled HUD sync (~15Hz) so React UI stays ultra-smooth without hurting 60fps canvas
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.065) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private checkModeConditions(): void {
    if (this.finished) return;

    if (this.armor <= 0) {
      this.finishRace(false, 'crash');
      return;
    }

    if (this.mode === 'time_challenge') {
      if (this.elapsedSec >= TIME_CHALLENGE_DURATION) {
        const won = this.distanceMeters >= TIME_CHALLENGE_TARGET_METERS;
        this.finishRace(won, 'time_up');
      }
    } else if (this.mode === 'coin_challenge') {
      if (this.coinsCollected >= COIN_CHALLENGE_TARGET) {
        this.finishRace(true, 'target_reached');
      } else if (this.elapsedSec >= COIN_CHALLENGE_DURATION) {
        this.finishRace(false, 'time_up');
      }
    }
  }

  private finishRace(won: boolean, endReason: RaceResult['endReason']): void {
    if (this.finished) return;
    this.finished = true;
    soundEngine.stopEngine();
    if (won) {
      soundEngine.playVictoryOrLevelUp();
    }
    this.emitHud();
    this.onRaceComplete(this.buildResult(won, endReason));
  }

  private buildResult(won: boolean, endReason: RaceResult['endReason']): RaceResult {
    return {
      raceId: this.raceId,
      mode: this.mode,
      won,
      endReason,
      score: this.score,
      distanceMeters: this.distanceMeters,
      durationSec: Math.round(this.elapsedSec),
      coinsCollected: this.coinsCollected,
      nearMisses: this.nearMisses,
      nitroActivations: this.nitroActivations,
      crashesCount: this.crashesCount,
      maxSpeedKmh: this.maxSpeedKmh,
    };
  }

  private handleCrash(impactX: number, impactY: number): void {
    this.crashesCount += 1;
    this.armor = Math.max(0, this.armor - 1);
    this.invulnTimer = 1.35;
    this.hitFlashTimer = 0.2;
    this.hitstopTimer = 0.055;
    this.shakeIntensity = 12;
    this.currentSpeedPx = Math.max(210, this.currentSpeedPx * 0.55);
    this.nitroActive = false;
    soundEngine.setNitroSound(false);
    soundEngine.playCrash();

    const cx = (this.playerX + impactX) / 2;
    const cy = (this.playerY + impactY) / 2;
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 210;
      this.spawnParticle(
        cx,
        cy,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        0.42,
        3 + Math.random() * 4,
        i % 2 === 0 ? '#FB7185' : '#FBBF24'
      );
    }

    if (this.armor > 0) {
      this.showCombo('انتبه! تضرر الهيكل');
    }
    this.emitHud();
  }

  private showCombo(msg: string): void {
    this.comboMessage = msg;
    this.comboTimer = 1.35;
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string
  ): void {
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.life = life;
        p.maxLife = life;
        p.size = size;
        p.color = color;
        return;
      }
    }
  }

  private updateSpawners(dt: number, difficulty: number): void {
    // Traffic spawner
    this.trafficSpawnTimer -= dt;
    if (this.trafficSpawnTimer <= 0) {
      const baseInterval = Math.max(0.46, 1.15 / difficulty);
      this.trafficSpawnTimer = baseInterval * (0.78 + Math.random() * 0.44);

      const spawnY = -120;
      const safeLanes = getSafeSpawnLanes(this.traffic, this.obstacles, spawnY, 150);
      if (safeLanes.length > 0) {
        const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        this.spawnTrafficVehicle(lane, spawnY, difficulty);
      }
    }

    // Dynamic obstacle spawner
    this.obstacleSpawnTimer -= dt;
    if (this.obstacleSpawnTimer <= 0) {
      this.obstacleSpawnTimer = Math.max(1.3, 2.7 / difficulty) * (0.85 + Math.random() * 0.45);
      const spawnY = -80;
      const safeLanes = getSafeSpawnLanes(this.traffic, this.obstacles, spawnY, 155);
      if (safeLanes.length > 0) {
        const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        const isBarrier = Math.random() < 0.55;
        this.obstacles.push({
          id: this.nextEntityId++,
          kind: isBarrier ? 'barrier' : 'cone',
          lane,
          x: LANE_CENTERS[lane],
          y: spawnY,
          width: isBarrier ? 52 : 28,
          height: isBarrier ? 24 : 28,
        });
      }
    }

    // Coin line spawner
    this.coinSpawnTimer -= dt;
    if (this.coinSpawnTimer <= 0) {
      this.coinSpawnTimer = this.mode === 'coin_challenge' ? 0.72 : 1.15;
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const hasObstacle = this.obstacles.some((o) => o.lane === lane && o.y < 20);
      if (!hasObstacle) {
        const count = this.mode === 'coin_challenge' ? 4 : 3;
        for (let c = 0; c < count; c++) {
          this.coins.push({
            id: this.nextEntityId++,
            x: LANE_CENTERS[lane],
            y: -45 - c * 46,
            radius: 13,
            collected: false,
            phase: c * 0.6,
          });
        }
      }
    }
  }

  private spawnTrafficVehicle(lane: number, y: number, difficulty: number): void {
    const roll = Math.random();
    const kind: TrafficEntity['kind'] =
      roll < 0.18 ? 'truck' : roll < 0.4 ? 'rival' : roll < 0.7 ? 'suv' : 'sedan';

    const palettes = [
      { p: '#475569', s: '#1E293B', a: '#CBD5E1' },
      { p: '#0369A1', s: '#0C4A6E', a: '#BAE6FD' },
      { p: '#B45309', s: '#78350F', a: '#FDE68A' },
      { p: '#4F46E5', s: '#312E81', a: '#C7D2FE' },
      { p: '#BE123C', s: '#881337', a: '#FECDD3' },
      { p: '#15803D', s: '#14532D', a: '#BBF7D0' },
    ];
    const pal = palettes[Math.floor(Math.random() * palettes.length)];

    const speedPx =
      kind === 'truck'
        ? 170 + Math.random() * 55
        : kind === 'rival'
        ? (280 + Math.random() * 80) * Math.min(1.25, difficulty)
        : 220 + Math.random() * 90;

    this.traffic.push({
      id: this.nextEntityId++,
      kind,
      lane,
      targetLane: lane,
      x: LANE_CENTERS[lane],
      y,
      width: kind === 'truck' ? 48 : kind === 'suv' ? 44 : 40,
      height: kind === 'truck' ? 116 : kind === 'suv' ? 88 : 78,
      speedPx,
      primaryColor: pal.p,
      secondaryColor: pal.s,
      accentColor: pal.a,
      bodyStyle: kind === 'rival' ? 'gt' : 'coupe',
      laneShiftTelegraph: 0,
      nearMissed: false,
    });
  }

  private emitHud(): void {
    const timeRemaining =
      this.mode === 'time_challenge'
        ? Math.max(0, Math.ceil(TIME_CHALLENGE_DURATION - this.elapsedSec))
        : this.mode === 'coin_challenge'
        ? Math.max(0, Math.ceil(COIN_CHALLENGE_DURATION - this.elapsedSec))
        : 0;

    this.onHudUpdate({
      mode: this.mode,
      score: this.score,
      distanceMeters: this.distanceMeters,
      speedKmh: Math.round(this.currentSpeedPx * 0.29),
      coinsCollected: this.coinsCollected,
      nitroRatio: this.nitroEnergy / this.stats.nitroMax,
      nitroActive: this.nitroActive,
      armor: this.armor,
      maxArmor: this.maxArmor,
      timeRemaining,
      targetMeters: TIME_CHALLENGE_TARGET_METERS,
      targetCoins: COIN_CHALLENGE_TARGET,
      nearMisses: this.nearMisses,
      comboMessage: this.comboMessage,
    });
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const isNight = this.controls.dayNight === 'night';

    ctx.save();
    if (this.shakeIntensity > 0.2) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    // 1. City shoulders / urban environment
    ctx.fillStyle = isNight ? '#0B1120' : '#1E293B';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Passing city blocks / light poles on left & right shoulders
    for (let y = (this.roadScroll * 1.5) % 120 - 120; y < WORLD_HEIGHT + 120; y += 120) {
      // Left sidewalk blocks
      ctx.fillStyle = isNight ? '#111827' : '#334155';
      ctx.fillRect(4, y, ROAD_LEFT - 10, 92);
      ctx.fillRect(ROAD_RIGHT + 6, y + 30, WORLD_WIDTH - ROAD_RIGHT - 10, 92);

      // Streetlights
      ctx.fillStyle = isNight ? '#FDE047' : '#CBD5E1';
      ctx.beginPath();
      ctx.arc(ROAD_LEFT - 8, y + 46, 3.5, 0, Math.PI * 2);
      ctx.arc(ROAD_RIGHT + 8, y + 76, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (isNight) {
        const glowL = ctx.createRadialGradient(ROAD_LEFT - 8, y + 46, 2, ROAD_LEFT - 8, y + 46, 34);
        glowL.addColorStop(0, 'rgba(253, 224, 71, 0.18)');
        glowL.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = glowL;
        ctx.beginPath();
        ctx.arc(ROAD_LEFT - 8, y + 46, 34, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Asphalt Highway
    const roadGrad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
    if (isNight) {
      roadGrad.addColorStop(0, '#131722');
      roadGrad.addColorStop(0.5, '#1B2130');
      roadGrad.addColorStop(1, '#131722');
    } else {
      roadGrad.addColorStop(0, '#334155');
      roadGrad.addColorStop(0.5, '#475569');
      roadGrad.addColorStop(1, '#334155');
    }
    ctx.fillStyle = roadGrad;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, WORLD_HEIGHT);

    // Racing red & white curbs along edges
    const curbSegment = 40;
    for (let y = (this.roadScroll % (curbSegment * 2)) - curbSegment * 2; y < WORLD_HEIGHT + curbSegment; y += curbSegment) {
      const isRed = Math.floor((y - this.roadScroll) / curbSegment) % 2 === 0;
      ctx.fillStyle = isRed ? '#E11D48' : '#F8FAFC';
      ctx.fillRect(ROAD_LEFT - 4, y, 5, curbSegment);
      ctx.fillRect(ROAD_RIGHT - 1, y, 5, curbSegment);
    }

    // Dashed lane dividers
    ctx.fillStyle = isNight ? 'rgba(226, 232, 240, 0.35)' : 'rgba(248, 250, 252, 0.72)';
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const lx = ROAD_LEFT + lane * LANE_WIDTH - 2;
      for (let y = this.roadScroll - 80; y < WORLD_HEIGHT + 80; y += 80) {
        ctx.fillRect(lx, y, 4, 38);
      }
    }

    // 3. Gold Coins
    for (const c of this.coins) {
      const rx = Math.max(4, Math.abs(Math.cos(c.phase)) * c.radius);
      ctx.save();
      ctx.translate(c.x, c.y);

      // Soft gold glow
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, c.radius * 1.6);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, c.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (rx > 7) {
        ctx.fillStyle = '#FEF9C3';
        ctx.fillRect(-1.5, -6, 3, 12);
      }
      ctx.restore();
    }

    // 4. Obstacles (Road barriers & Cones)
    for (const o of this.obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.kind === 'barrier') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-o.width / 2 + 2, -o.height / 2 + 4, o.width, o.height);
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height);
        ctx.fillStyle = '#F8FAFC';
        for (let sx = -o.width / 2 + 6; sx < o.width / 2 - 4; sx += 16) {
          ctx.fillRect(sx, -o.height / 2, 8, o.height);
        }
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-o.width / 2, -o.height / 2, o.width, o.height);
      } else {
        // Traffic cone
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(2, 3, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Traffic Vehicles
    for (const t of this.traffic) {
      if (t.kind === 'truck') {
        drawTruckOrVan(ctx, t.x, t.y, t.width, t.height, t.primaryColor, isNight);
      } else {
        const blink =
          t.laneShiftTelegraph > 0
            ? t.targetLane < t.lane
              ? 'left'
              : 'right'
            : null;
        drawTopDownCar(ctx, {
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          primaryColor: t.primaryColor,
          secondaryColor: t.secondaryColor,
          accentColor: t.accentColor,
          bodyStyle: t.bodyStyle,
          isNight,
          blinkSignal: blink,
          timeSec: this.elapsedSec,
        });
      }
    }

    // 6. Player Car (blinks during brief post-crash invulnerability)
    const showPlayer = this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 14) % 2 === 0;
    if (showPlayer) {
      drawTopDownCar(ctx, {
        x: this.playerX,
        y: this.playerY,
        width: this.playerWidth,
        height: this.playerHeight,
        primaryColor: this.car.primaryColor,
        secondaryColor: this.car.secondaryColor,
        accentColor: this.car.accentColor,
        bodyStyle: this.car.bodyStyle,
        angle: this.playerAngle,
        isNight,
        nitroActive: this.nitroActive,
        hitFlash: this.hitFlashTimer,
        timeSec: this.elapsedSec,
        isPlayer: true,
      });
    }

    // 7. Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 8. Nitro Speed Lines around edges
    if (this.nitroActive) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const lx = i < 6 ? 12 + (i % 3) * 14 : WORLD_WIDTH - 12 - (i % 3) * 14;
        const ly = ((this.elapsedSec * 1400 + i * 130) % (WORLD_HEIGHT + 120)) - 60;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + 55);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
