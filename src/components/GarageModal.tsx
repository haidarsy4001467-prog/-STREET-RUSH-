import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Coins, Lock, Wrench, X } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { CARS, getCarUpgrades, getEffectiveCarStats } from '../game/cars';
import type { SaveData } from '../game/types';
import { CarPreviewCanvas } from './CarPreviewCanvas';

interface GarageModalProps {
  save: SaveData;
  initialTab?: 'garage' | 'car_select';
  onClose: () => void;
  onBuyCar: (carId: string) => { success: boolean; errorAr?: string };
  onSelectCar: (carId: string) => void;
  onOpenShopForCar: (carId: string) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  save,
  onClose,
  onBuyCar,
  onSelectCar,
  onOpenShopForCar,
}) => {
  const initialIdx = Math.max(
    0,
    CARS.findIndex((c) => c.id === save.selectedCarId)
  );
  const [index, setIndex] = useState(initialIdx);
  const [feedback, setFeedback] = useState<string | null>(null);

  const car = CARS[index];
  const isOwned = save.unlockedCars.includes(car.id);
  const isSelected = save.selectedCarId === car.id;
  const upgrades = getCarUpgrades(save.upgrades, car.id);
  const stats = getEffectiveCarStats(car, upgrades);
  const canAfford = save.coins >= car.price;

  const prevCar = () => {
    soundEngine.playClick();
    setFeedback(null);
    setIndex((i) => (i - 1 + CARS.length) % CARS.length);
  };

  const nextCar = () => {
    soundEngine.playClick();
    setFeedback(null);
    setIndex((i) => (i + 1) % CARS.length);
  };

  const handlePrimaryAction = () => {
    if (isOwned) {
      soundEngine.playClick();
      onSelectCar(car.id);
      setFeedback(`تم اختيار ${car.nameAr} للسباق القادم.`);
    } else {
      const res = onBuyCar(car.id);
      if (res.success) {
        soundEngine.playVictoryOrLevelUp();
        setFeedback(`مبروك! تم شراء واختيار ${car.nameAr}.`);
      } else {
        soundEngine.playClick();
        setFeedback(res.errorAr ?? 'رصيد العملات غير كافٍ.');
      }
    }
  };

  const statRows = [
    { label: 'السرعة القصوى', value: stats.displaySpeed, color: 'bg-rose-500' },
    { label: 'التسارع', value: stats.displayAccel, color: 'bg-amber-400' },
    { label: 'التحكم والثبات', value: stats.displayHandling, color: 'bg-emerald-400' },
    { label: 'طاقة النيترو', value: stats.displayNitro, color: 'bg-sky-400' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0B0E14] text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111622]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="إغلاق المرآب"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-white">المرآب والسيارات</h2>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-amber-500/30 px-2.5 py-1.5">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-mono-num text-sm font-bold text-amber-300">
            {save.coins.toLocaleString('en-US')}
          </span>
        </div>
      </header>

      {/* Main Car Stage */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 flex flex-col justify-between gap-3">
        {/* Carousel Stage */}
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{car.categoryAr}</span>
            <span className="font-mono-num">
              {index + 1} / {CARS.length}
            </span>
          </div>

          <div className="w-full flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevCar}
              aria-label="السيارة السابقة"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-white transition shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <CarPreviewCanvas
                car={car}
                width={144}
                height={158}
                showNitro={isOwned}
                isNight={save.controls.dayNight === 'night'}
              />
            </div>

            <button
              type="button"
              onClick={nextCar}
              aria-label="السيارة التالية"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-white transition shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center mt-1 space-y-1">
            <h3 className="text-xl font-black text-white">{car.nameAr}</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs">{car.descriptionAr}</p>
          </div>
        </div>

        {/* Performance Bars */}
        <div className="rounded-2xl bg-slate-900/75 border border-white/10 p-3.5 space-y-2.5">
          {statRows.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">{row.label}</span>
                <span className="font-mono-num font-bold text-slate-300">{row.value}/100</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${row.color} transition-all duration-300`}
                  style={{ width: `${row.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Car Thumbnails Strip */}
        <div className="grid grid-cols-4 gap-1.5">
          {CARS.map((c, idx) => {
            const owned = save.unlockedCars.includes(c.id);
            const active = idx === index;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFeedback(null);
                  setIndex(idx);
                }}
                className={`rounded-xl border p-2 text-center transition flex flex-col items-center gap-1 ${
                  active
                    ? 'bg-rose-600/20 border-rose-500 text-white'
                    : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span
                  className="h-3 w-7 rounded-sm border border-white/25"
                  style={{ backgroundColor: c.primaryColor }}
                />
                <span className="text-[10px] font-bold truncate w-full">{c.nameAr}</span>
                <span className="font-mono-num text-[9px] text-slate-400">
                  {owned ? (save.selectedCarId === c.id ? 'مختارة' : 'مملوكة') : c.price}
                </span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="rounded-xl bg-slate-900 border border-sky-400/35 px-3 py-2 text-center text-xs font-bold text-sky-200">
            {feedback}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!isOwned && !canAfford}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-black transition ${
              isSelected
                ? 'bg-emerald-600 text-white'
                : isOwned
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : canAfford
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-white/10'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                <span>السيارة المختارة حالياً</span>
              </>
            ) : isOwned ? (
              <span>اختيار للسباق</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>شراء بـ {car.price.toLocaleString('en-US')} عملة</span>
              </>
            )}
          </button>

          {isOwned && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenShopForCar(car.id);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 border border-sky-400/40 px-4 py-3 text-sm font-bold text-sky-200 transition"
            >
              <Wrench className="w-4 h-4" />
              <span>ترقية</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
