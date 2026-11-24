import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Coins, Flame, Pause, Shield } from 'lucide-react';
import { soundEngine } from '../game/audio';
import {
  StreetRushEngine,
  WORLD_WIDTH,
  type HudSnapshot,
} from '../game/engine';
import type { GameMode, RaceResult, SaveData } from '../game/types';

interface RaceScreenProps {
  mode: GameMode;
  save: SaveData;
  paused: boolean;
  raceInstanceKey: number;
  onPauseToggle: () => void;
  onRaceComplete: (result: RaceResult) => void;
  engineRefOut: React.MutableRefObject<StreetRushEngine | null>;
}

export const RaceScreen: React.FC<RaceScreenProps> = ({
  mode,
  save,
  paused,
  raceInstanceKey,
  onPauseToggle,
  onRaceComplete,
  engineRefOut,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<StreetRushEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    mode,
    score: 0,
    distanceMeters: 0,
    speedKmh: 0,
    coinsCollected: 0,
    nitroRatio: 1,
    nitroActive: false,
    armor: 3,
    maxArmor: 3,
    timeRemaining: mode === 'time_challenge' ? 60 : mode === 'coin_challenge' ? 75 : 0,
    targetMeters: 1200,
    targetCoins: 35,
    nearMisses: 0,
    comboMessage: null,
  });

  // Mount & run 60fps simulation engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new StreetRushEngine(mode, save, setHud, onRaceComplete);
    engineRef.current = engine;
    engineRefOut.current = engine;
    engine.mount(canvas);

    const handleResize = () => engine.resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.unmount();
      engineRef.current = null;
      engineRefOut.current = null;
    };
    // Intentionally re-instantiate only on mode or explicit restart key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, raceInstanceKey]);

  // Sync pause state to engine
  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  // Keyboard controls + blur safety
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onPauseToggle();
        return;
      }

      if (paused) return;

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        eng.input.leftHeld = true;
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        eng.input.rightHeld = true;
      } else if (e.key === ' ' || e.key === 'Shift' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        eng.input.nitroHeld = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        eng.input.leftHeld = false;
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        eng.input.rightHeld = false;
      } else if (e.key === ' ' || e.key === 'Shift' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        eng.input.nitroHeld = false;
      }
    };

    const onBlur = () => {
      engineRef.current?.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [paused, onPauseToggle]);

  // Pointer / Touch drag on Canvas
  const mapClientXToWorld = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return WORLD_WIDTH / 2;
    const rect = canvas.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    return ratio * WORLD_WIDTH;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    soundEngine.unlock();
    if (!save.controls.touchDrag || paused) return;
    const eng = engineRef.current;
    if (!eng) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    eng.input.pointerActive = true;
    eng.input.pointerTargetX = mapClientXToWorld(e.clientX);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current;
    if (!eng || !eng.input.pointerActive || paused) return;
    eng.input.pointerTargetX = mapClientXToWorld(e.clientX);
  };

  const handleCanvasPointerUp = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.input.pointerActive = false;
    eng.input.pointerTargetX = null;
  };

  const setLeft = (held: boolean) => {
    soundEngine.unlock();
    if (engineRef.current) engineRef.current.input.leftHeld = held;
  };
  const setRight = (held: boolean) => {
    soundEngine.unlock();
    if (engineRef.current) engineRef.current.input.rightHeld = held;
  };
  const setNitro = (held: boolean) => {
    soundEngine.unlock();
    if (engineRef.current) engineRef.current.input.nitroHeld = held;
  };

  const nitroPct = Math.round(Math.max(0, Math.min(100, hud.nitroRatio * 100)));

  return (
    <div className="relative h-full w-full overflow-hidden bg-black select-none">
      {/* Isolated 2D Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        style={{ touchAction: 'none' }}
        className="block h-full w-full"
      />

      {/* Low-Occlusion Top HUD (pointer-events-none except pause button) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 flex items-start justify-between gap-2">
        {/* Distance, Score & Coins */}
        <div className="flex flex-col gap-1.5 rounded-xl bg-slate-950/75 border border-white/10 px-3 py-2 text-right">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono-num font-black text-white text-sm">
              {hud.distanceMeters.toLocaleString('en-US')} م
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono-num font-bold text-sky-300">
              {hud.speedKmh} كم/س
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-mono-num font-bold text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {mode === 'coin_challenge'
                ? `${hud.coinsCollected}/${hud.targetCoins}`
                : hud.coinsCollected}
            </span>
            {mode !== 'endless' && (
              <>
                <span className="text-slate-400">·</span>
                <span
                  className={`font-mono-num font-bold ${
                    hud.timeRemaining <= 10 ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  {hud.timeRemaining}ث
                </span>
              </>
            )}
          </div>
        </div>

        {/* Armor + Pause */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-950/75 border border-white/10 px-2.5 py-2">
            <Shield className="w-3.5 h-3.5 text-rose-400 ml-1" />
            {Array.from({ length: hud.maxArmor }).map((_, idx) => (
              <span
                key={idx}
                className={`h-2.5 w-3 rounded-sm transition-colors ${
                  idx < hud.armor ? 'bg-rose-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onPauseToggle();
            }}
            aria-label="إيقاف مؤقت"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-white transition active:scale-95"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Progress Strip (Time Challenge distance goal) */}
      {mode === 'time_challenge' && (
        <div className="pointer-events-none absolute inset-x-4 top-[74px] z-10">
          <div className="h-1.5 w-full rounded-full bg-slate-900/80 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-l from-emerald-400 to-sky-400 transition-all duration-150"
              style={{
                width: `${Math.min(100, (hud.distanceMeters / hud.targetMeters) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Combo / Near Miss Callout */}
      {hud.comboMessage && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center">
          <div className="rounded-lg bg-slate-950/85 border border-sky-400/50 px-3 py-1 text-xs font-extrabold text-sky-300 shadow-lg">
            {hud.comboMessage}
          </div>
        </div>
      )}

      {/* Bottom Ergonomic Touch Controls (compact strip leaving >=85% playfield clear) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 flex items-end justify-between gap-2">
        {/* Steer Buttons (in RTL, right side is Right, left side is Left) */}
        {save.controls.steerButtons ? (
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setRight(true);
              }}
              onPointerUp={() => setRight(false)}
              onPointerLeave={() => setRight(false)}
              onPointerCancel={() => setRight(false)}
              aria-label="تحريك لليمين"
              className="flex h-14 w-16 items-center justify-center rounded-2xl bg-slate-950/80 active:bg-rose-600/80 border border-white/20 text-white shadow-lg transition"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setLeft(true);
              }}
              onPointerUp={() => setLeft(false)}
              onPointerLeave={() => setLeft(false)}
              onPointerCancel={() => setLeft(false)}
              aria-label="تحريك لليسار"
              className="flex h-14 w-16 items-center justify-center rounded-2xl bg-slate-950/80 active:bg-rose-600/80 border border-white/20 text-white shadow-lg transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Nitro Boost Button + Energy Gauge */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="w-28 rounded-lg bg-slate-950/85 border border-white/10 px-2 py-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-sky-300 mb-0.5">
              <span>نيترو</span>
              <span className="font-mono-num">{nitroPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.nitroActive ? 'bg-white' : 'bg-sky-400'
                }`}
                style={{ width: `${nitroPct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              setNitro(true);
            }}
            onPointerUp={() => setNitro(false)}
            onPointerLeave={() => setNitro(false)}
            onPointerCancel={() => setNitro(false)}
            aria-label="تفعيل النيترو"
            className={`flex h-14 w-28 items-center justify-center gap-1.5 rounded-2xl border font-black text-sm shadow-lg transition ${
              hud.nitroActive
                ? 'bg-sky-500 border-white text-white scale-95'
                : nitroPct >= 18
                ? 'bg-sky-600/85 hover:bg-sky-500 border-sky-300/50 text-white'
                : 'bg-slate-900/75 border-white/10 text-slate-400'
            }`}
          >
            <Flame className="w-5 h-5" />
            <span>نيترو</span>
          </button>
        </div>
      </div>
    </div>
  );
};
