import React, { useState } from 'react';
import { ArrowUpCircle, Coins, Flame, Gauge, Navigation, Wrench, X, Zap } from 'lucide-react';
import { soundEngine } from '../game/audio';
import {
  CARS,
  MAX_UPGRADE_LEVEL,
  getCarById,
  getCarUpgrades,
  getEffectiveCarStats,
  getUpgradeCost,
} from '../game/cars';
import type { SaveData, UpgradeStat } from '../game/types';
import { CarPreviewCanvas } from './CarPreviewCanvas';

interface ShopModalProps {
  save: SaveData;
  initialCarId?: string;
  onClose: () => void;
  onUpgradeStat: (carId: string, stat: UpgradeStat) => { success: boolean; errorAr?: string };
  onOpenGarage: () => void;
}

const UPGRADE_ITEMS: {
  stat: UpgradeStat;
  titleAr: string;
  effectAr: string;
  icon: React.FC<{ className?: string }>;
  accent: string;
}[] = [
  {
    stat: 'speedLevel',
    titleAr: 'السرعة القصوى',
    effectAr: 'تزيد السرعة الفعلية القصوى على الطريق السريع.',
    icon: Gauge,
    accent: 'text-rose-400',
  },
  {
    stat: 'accelLevel',
    titleAr: 'قوة التسارع',
    effectAr: 'استجابة أسرع عند الانطلاق وبعد التجاوزات.',
    icon: Zap,
    accent: 'text-amber-400',
  },
  {
    stat: 'handlingLevel',
    titleAr: 'التحكم والثبات',
    effectAr: 'انتقال أسرع وأكثر دقة بين المسارات لتفادي العقبات.',
    icon: Navigation,
    accent: 'text-emerald-400',
  },
  {
    stat: 'nitroLevel',
    titleAr: 'خزان النيترو والشحن',
    effectAr: 'يزيد سعة خزان النيترو وسرعة إعادة الشحن التلقائي.',
    icon: Flame,
    accent: 'text-sky-400',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  save,
  initialCarId,
  onClose,
  onUpgradeStat,
  onOpenGarage,
}) => {
  const [carId, setCarId] = useState(
    initialCarId && save.unlockedCars.includes(initialCarId)
      ? initialCarId
      : save.selectedCarId
  );
  const [notice, setNotice] = useState<string | null>(null);

  const car = getCarById(carId);
  const upgrades = getCarUpgrades(save.upgrades, car.id);
  const stats = getEffectiveCarStats(car, upgrades);
  const ownedCars = CARS.filter((c) => save.unlockedCars.includes(c.id));

  const handleUpgrade = (stat: UpgradeStat, label: string) => {
    const res = onUpgradeStat(car.id, stat);
    if (res.success) {
      soundEngine.playVictoryOrLevelUp();
      setNotice(`تمت ترقية ${label} لسيارة ${car.nameAr} بنجاح!`);
    } else {
      soundEngine.playClick();
      setNotice(res.errorAr ?? 'تعذّر إتمام الترقية.');
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0B0E14] text-slate-100">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111622]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="إغلاق المتجر"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-white">متجر التطوير</h2>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-amber-500/30 px-2.5 py-1.5">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-mono-num text-sm font-bold text-amber-300">
            {save.coins.toLocaleString('en-US')}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
        {/* Owned Car Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ownedCars.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setNotice(null);
                setCarId(c.id);
              }}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition whitespace-nowrap ${
                c.id === car.id
                  ? 'bg-rose-600 border-rose-400 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.nameAr}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenGarage();
            }}
            className="shrink-0 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-200 whitespace-nowrap"
          >
            + شراء سيارات جديدة
          </button>
        </div>

        {/* Car Summary Card */}
        <div className="flex items-center justify-between rounded-2xl bg-slate-900/80 border border-white/10 p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
              <Wrench className="w-3.5 h-3.5" />
              <span>تجهيز الأداء</span>
            </div>
            <h3 className="text-lg font-black text-white">{car.nameAr}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-300 font-mono-num">
              <span>السرعة: {stats.displaySpeed}</span>
              <span>التسارع: {stats.displayAccel}</span>
              <span>التحكم: {stats.displayHandling}</span>
              <span>النيترو: {stats.displayNitro}</span>
            </div>
          </div>

          <CarPreviewCanvas
            car={car}
            width={88}
            height={104}
            showNitro
            isNight={save.controls.dayNight === 'night'}
          />
        </div>

        {notice && (
          <div className="rounded-xl bg-slate-900 border border-emerald-400/40 px-3 py-2 text-center text-xs font-bold text-emerald-200">
            {notice}
          </div>
        )}

        {/* 4 Performance Upgrade Cards */}
        <div className="space-y-2.5">
          {UPGRADE_ITEMS.map((item) => {
            const level = upgrades[item.stat];
            const isMax = level >= MAX_UPGRADE_LEVEL;
            const cost = getUpgradeCost(car, item.stat, level);
            const canAfford = save.coins >= cost;
            const Icon = item.icon;

            return (
              <div
                key={item.stat}
                className="rounded-2xl bg-slate-900/85 border border-white/10 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${item.accent}`} />
                      <h4 className="text-sm font-extrabold text-white">{item.titleAr}</h4>
                      <span className="font-mono-num text-xs text-slate-400">
                        {level}/{MAX_UPGRADE_LEVEL}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{item.effectAr}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isMax || !canAfford}
                    onClick={() => handleUpgrade(item.stat, item.titleAr)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition whitespace-nowrap ${
                      isMax
                        ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-slate-800 border border-white/10 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>{isMax ? 'الحد الأقصى' : `${cost} عملة`}</span>
                  </button>
                </div>

                {/* 5-step Level Indicator */}
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-colors ${
                        idx < level ? 'bg-sky-400' : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
