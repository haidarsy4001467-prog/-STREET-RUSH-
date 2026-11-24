import React, { useState } from 'react';
import {
  Award,
  Car,
  Coins,
  Download,
  Gauge,
  Moon,
  Play,
  Settings,
  ShoppingBag,
  Sun,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import { getCarById, getCarUpgrades, getEffectiveCarStats } from '../game/cars';
import { getXpForNextLevel } from '../game/progression';
import type { GameMode, SaveData } from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CarPreviewCanvas } from './CarPreviewCanvas';

export type ScreenModal =
  | null
  | 'garage'
  | 'car_select'
  | 'shop'
  | 'missions'
  | 'achievements'
  | 'settings';

interface HomeScreenProps {
  save: SaveData;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onStartRace: () => void;
  onOpenModal: (modal: ScreenModal) => void;
  onToggleSoundQuick: () => void;
  onToggleDayNight: () => void;
}

const MODE_LABELS: { id: GameMode; titleAr: string; hintAr: string }[] = [
  { id: 'endless', titleAr: 'السباق المفتوح', hintAr: 'سرعة متصاعدة دون نهاية' },
  { id: 'time_challenge', titleAr: 'تحدي الوقت', hintAr: 'اقطع 1,200م خلال 60 ثانية' },
  { id: 'coin_challenge', titleAr: 'تحدي العملات', hintAr: 'اجمع 35 عملة قبل نفاد الوقت' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  save,
  selectedMode,
  onSelectMode,
  onStartRace,
  onOpenModal,
  onToggleSoundQuick,
  onToggleDayNight,
}) => {
  const activeCar = getCarById(save.selectedCarId);
  const upgrades = getCarUpgrades(save.upgrades, activeCar.id);
  const stats = getEffectiveCarStats(activeCar, upgrades);
  const xpNeeded = getXpForNextLevel(save.level);
  const xpPct = Math.min(100, Math.round((save.xp / xpNeeded) * 100));

  const unclaimedMissions = save.missions.filter((m) => m.completed && !m.claimed).length;
  const unclaimedAchievements = save.achievements.filter((a) => a.unlocked && !a.claimed).length;

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const bestForMode = save.highScores[selectedMode] ?? 0;
  const soundMuted = !save.sound.musicEnabled && !save.sound.sfxEnabled;

  const handleClick = (fn: () => void) => {
    soundEngine.unlock();
    soundEngine.playClick();
    fn();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0B0E14] text-slate-100 flex flex-col justify-between">
      {/* Key-Art Backdrop */}
      <img
        src="/src/assets/images/street_rush_hero_1795538579550.jpg"
        alt="STREET RUSH خلفية سباق الشوارع"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover object-bottom opacity-40 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A10]/95 via-[#0B0E14]/75 to-[#07090D]/95 pointer-events-none" />

      {/* Top Status Header */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-bold text-white">المستوى {save.level}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-sky-400">
                {save.xp}/{xpNeeded} XP
              </span>
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-l from-sky-400 to-rose-500 transition-all duration-300"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/90 border border-amber-500/30 px-2.5 py-1.5">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono-num text-sm font-bold text-amber-300">
              {save.coins.toLocaleString('en-US')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleClick(onToggleDayNight)}
            title={save.controls.dayNight === 'night' ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
            aria-label="تبديل الإضاءة ليل ونهار"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/90 border border-white/10 text-slate-200 hover:border-sky-400/50 transition"
          >
            {save.controls.dayNight === 'night' ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleClick(onToggleSoundQuick)}
            title={soundMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            aria-label={soundMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/90 border border-white/10 text-slate-200 hover:border-rose-500/50 transition"
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-4 py-3 overflow-y-auto custom-scroll">
        {/* Bespoke Brand Lockup & High Score */}
        <div className="flex flex-col items-center text-center pt-1">
          <svg
            viewBox="0 0 320 68"
            className="w-64 h-auto drop-shadow-[0_4px_20px_rgba(225,29,72,0.4)]"
            aria-label="STREET RUSH"
          >
            <defs>
              <linearGradient id="srGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="55%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
            <path d="M18 14 L52 14 L42 22 L8 22 Z" fill="#E11D48" />
            <path d="M268 14 L302 14 L292 22 L258 22 Z" fill="#0EA5E9" />
            <text
              x="160"
              y="39"
              textAnchor="middle"
              fill="url(#srGrad)"
              fontSize="32"
              fontWeight="900"
              letterSpacing="3"
              fontStyle="italic"
              fontFamily="Cairo, sans-serif"
            >
              STREET RUSH
            </text>
            <text
              x="160"
              y="60"
              textAnchor="middle"
              fill="#CBD5E1"
              fontSize="14"
              fontWeight="700"
              fontFamily="Cairo, sans-serif"
            >
              سباق الشوارع السريع
            </text>
          </svg>

          <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>أعلى نتيجة:</span>
            <span className="font-mono-num font-bold text-white">
              {bestForMode.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Active Car Centerpiece */}
        <div className="my-2 flex items-center justify-between rounded-xl bg-slate-900/75 border border-white/10 px-3 py-2">
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs text-sky-400 font-semibold">{activeCar.categoryAr}</span>
            <h2 className="text-lg font-extrabold text-white leading-tight">{activeCar.nameAr}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
              <span>سرعة {stats.displaySpeed}</span>
              <span aria-hidden="true">·</span>
              <span>تسارع {stats.displayAccel}</span>
              <span aria-hidden="true">·</span>
              <span>نيترو {stats.displayNitro}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => handleClick(() => onOpenModal('car_select'))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white whitespace-nowrap transition"
              >
                <Car className="w-3.5 h-3.5 text-rose-400" />
                اختيار السيارة
              </button>
              <button
                type="button"
                onClick={() => handleClick(() => onOpenModal('shop'))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 px-2.5 py-1.5 text-xs font-bold text-sky-300 whitespace-nowrap transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                تطوير
              </button>
            </div>
          </div>

          <div className="shrink-0 rounded-lg bg-slate-950/70 border border-white/5 overflow-hidden">
            <CarPreviewCanvas
              car={activeCar}
              width={92}
              height={118}
              showNitro
              isNight={save.controls.dayNight === 'night'}
            />
          </div>
        </div>

        {/* 3 Real Game Modes Selector */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-900/90 p-1 border border-white/10">
            {MODE_LABELS.map((m) => {
              const active = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleClick(() => onSelectMode(m.id))}
                  className={`rounded-lg py-2 px-1.5 text-xs font-bold transition whitespace-nowrap truncate ${
                    active
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {m.titleAr}
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-slate-300">
            {MODE_LABELS.find((m) => m.id === selectedMode)?.hintAr}
          </p>
        </div>

        {/* Primary Race CTA */}
        <button
          type="button"
          onClick={() => handleClick(onStartRace)}
          className="mt-2 w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-l from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 active:scale-[0.99] py-3.5 px-6 text-lg font-black text-white shadow-[0_8px_24px_rgba(225,29,72,0.45)] border border-rose-400/30 transition"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>ابدأ السباق</span>
        </button>

        {/* Secondary Navigation Grid (Every single required button wired) */}
        <nav aria-label="أقسام اللعبة" className="mt-2.5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleClick(() => onOpenModal('garage'))}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/10 py-2.5 px-2 text-xs font-bold text-slate-100 transition min-h-[56px]"
          >
            <Gauge className="w-4 h-4 text-rose-400" />
            <span>المرآب</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick(() => onOpenModal('shop'))}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/10 py-2.5 px-2 text-xs font-bold text-slate-100 transition min-h-[56px]"
          >
            <ShoppingBag className="w-4 h-4 text-sky-400" />
            <span>المتجر</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick(() => onOpenModal('missions'))}
            className="relative flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/10 py-2.5 px-2 text-xs font-bold text-slate-100 transition min-h-[56px]"
          >
            <Target className="w-4 h-4 text-amber-400" />
            <span>المهام اليومية</span>
            {unclaimedMissions > 0 && (
              <span className="absolute top-1.5 left-1.5 font-mono-num text-[10px] font-black text-amber-300">
                +{unclaimedMissions}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleClick(() => onOpenModal('achievements'))}
            className="relative flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/10 py-2.5 px-2 text-xs font-bold text-slate-100 transition min-h-[56px]"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>الإنجازات</span>
            {unclaimedAchievements > 0 && (
              <span className="absolute top-1.5 left-1.5 font-mono-num text-[10px] font-black text-emerald-300">
                +{unclaimedAchievements}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleClick(() => onOpenModal('car_select'))}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/10 py-2.5 px-2 text-xs font-bold text-slate-100 transition min-h-[56px]"
          >
            <Car className="w-4 h-4 text-indigo-400" />
            <span>السيارات</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick(() => onOpenModal('settings'))}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/10 py-2.5 px-2 text-xs font-bold text-slate-100 transition min-h-[56px]"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span>الإعدادات</span>
          </button>
        </nav>

        {/* Optional In-App PWA Install Action + Controls Hint */}
        <div className="mt-2 flex flex-col items-center gap-1.5">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => void install()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-400/40 py-2 text-xs font-bold text-sky-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت اللعبة على الهاتف (PWA)</span>
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="text-xs text-sky-300 underline underline-offset-4"
            >
              تثبيت STREET RUSH على iOS
            </button>
          )}
          <p className="text-[11px] text-slate-400 text-center">
            التحكم: السحب باللمس أو الأسهم · مسافة للنيترو · Esc للإيقاف
          </p>
        </div>
      </main>

      {showIOSGuide && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-white/15 p-5 text-right space-y-3">
            <h3 className="text-base font-bold text-white">تثبيت اللعبة على iPhone / iPad</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              1. اضغط على زر المشاركة في متصفح Safari.
              <br />
              2. اختر «إضافة إلى الشاشة الرئيسية» للعب بوضع ملء الشاشة ودون اتصال.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-lg bg-rose-600 py-2 text-xs font-bold text-white"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
