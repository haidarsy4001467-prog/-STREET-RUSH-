import React, { useState } from 'react';
import {
  Download,
  Gamepad2,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Volume2,
  X,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import type { ControlSettings, SaveData, SoundSettings } from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsModalProps {
  save: SaveData;
  onClose: () => void;
  onUpdateSound: (sound: SoundSettings) => void;
  onUpdateControls: (controls: ControlSettings) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  save,
  onClose,
  onUpdateSound,
  onUpdateControls,
  onResetAllData,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const toggleSoundKey = (key: 'musicEnabled' | 'sfxEnabled') => {
    soundEngine.playClick();
    onUpdateSound({ ...save.sound, [key]: !save.sound[key] });
  };

  const toggleControlKey = (key: 'touchDrag' | 'steerButtons') => {
    soundEngine.playClick();
    // Ensure at least one steering method remains active
    const nextVal = !save.controls[key];
    if (!nextVal && key === 'touchDrag' && !save.controls.steerButtons) return;
    if (!nextVal && key === 'steerButtons' && !save.controls.touchDrag) return;
    onUpdateControls({ ...save.controls, [key]: nextVal });
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
            aria-label="إغلاق الإعدادات"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-white">الإعدادات والمعلومات</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
        {/* Audio Section */}
        <section className="rounded-2xl bg-slate-900/85 border border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Volume2 className="w-4 h-4 text-sky-400" />
            <h3>الصوت والموسيقى</h3>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">الموسيقى الخلفية</span>
            <button
              type="button"
              onClick={() => toggleSoundKey('musicEnabled')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                save.sound.musicEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {save.sound.musicEnabled ? 'مفعّلة' : 'متوقفة'}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>مستوى صوت الموسيقى</span>
              <span className="font-mono-num">{Math.round(save.sound.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(save.sound.musicVolume * 100)}
              onChange={(e) =>
                onUpdateSound({ ...save.sound, musicVolume: Number(e.target.value) / 100 })
              }
              className="w-full accent-sky-400"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-200">المؤثرات الصوتية (المحرك والاصطدام)</span>
            <button
              type="button"
              onClick={() => toggleSoundKey('sfxEnabled')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                save.sound.sfxEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {save.sound.sfxEnabled ? 'مفعّلة' : 'متوقفة'}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>مستوى صوت المؤثرات</span>
              <span className="font-mono-num">{Math.round(save.sound.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(save.sound.sfxVolume * 100)}
              onChange={(e) =>
                onUpdateSound({ ...save.sound, sfxVolume: Number(e.target.value) / 100 })
              }
              className="w-full accent-rose-500"
            />
          </div>
        </section>

        {/* Controls & Graphics */}
        <section className="rounded-2xl bg-slate-900/85 border border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Gamepad2 className="w-4 h-4 text-rose-400" />
            <h3>التحكم ومظهر المدينة</h3>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">التحكم بالسحب باللمس</span>
            <button
              type="button"
              onClick={() => toggleControlKey('touchDrag')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                save.controls.touchDrag
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {save.controls.touchDrag ? 'مفعّل' : 'معطّل'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">أزرار التوجيه يمين / يسار</span>
            <button
              type="button"
              onClick={() => toggleControlKey('steerButtons')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                save.controls.steerButtons
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {save.controls.steerButtons ? 'ظاهرة' : 'مخفية'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">وقت السباق (ليلي / نهاري)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdateControls({ ...save.controls, dayNight: 'night' });
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                  save.controls.dayNight === 'night'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                ليلي
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdateControls({ ...save.controls, dayNight: 'day' });
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                  save.controls.dayNight === 'day'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                نهاري
              </button>
            </div>
          </div>
        </section>

        {/* Android & Privacy Info */}
        <section className="rounded-2xl bg-slate-900/85 border border-white/10 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <h3>معلومات التطبيق والخصوصية</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-slate-300">
            <span>اسم الحزمة:</span>
            <span className="font-mono-num text-left text-white">com.streetrush.game</span>
            <span>الإصدار:</span>
            <span className="font-mono-num text-left text-white">1.0.0 (Code 1)</span>
            <span>العمل دون إنترنت:</span>
            <span className="text-left text-emerald-300 font-bold">مدعوم بالكامل</span>
          </div>
          <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-300 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              تحفظ اللعبة تقدمك محلياً على جهازك فقط دون جمع أي بيانات شخصية ودون أذونات حساسة أو إعلانات.
            </span>
          </div>

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => void install()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 py-2.5 text-xs font-bold text-white transition"
            >
              <Download className="w-4 h-4" />
              <span>تثبيت التطبيق على الجهاز</span>
            </button>
          )}
        </section>

        {/* Reset Data */}
        <section className="rounded-2xl bg-slate-900/60 border border-rose-500/20 p-4 space-y-2">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setConfirmReset(true);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 py-2.5 text-xs font-bold text-rose-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط بيانات التقدم</span>
            </button>
          ) : (
            <div className="space-y-2 text-center">
              <p className="text-xs font-bold text-rose-300">
                هل أنت متأكد من مسح جميع العملات والسيارات والإنجازات؟
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onResetAllData();
                    setConfirmReset(false);
                  }}
                  className="rounded-lg bg-rose-600 py-2 text-xs font-black text-white"
                >
                  نعم، امسح الكل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConfirmReset(false);
                  }}
                  className="rounded-lg bg-slate-800 py-2 text-xs font-bold text-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
