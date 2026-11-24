import React from 'react';
import { Home, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../game/audio';
import type { SoundSettings } from '../game/types';

interface PauseModalProps {
  sound: SoundSettings;
  onResume: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
  onUpdateSound: (next: SoundSettings) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  sound,
  onResume,
  onRestart,
  onQuitToMenu,
  onUpdateSound,
}) => {
  const click = (fn: () => void) => {
    soundEngine.playClick();
    fn();
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-xs rounded-2xl bg-[#111622] border border-white/15 p-5 shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-white">توقف مؤقت</h2>
          <p className="text-xs text-slate-400">السباق محفوظ مؤقتاً، يمكنك المتابعة في أي لحظة</p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => click(onResume)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 py-3 text-sm font-black text-white transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>استئناف السباق</span>
          </button>

          <button
            type="button"
            onClick={() => click(onRestart)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 py-2.5 text-sm font-bold text-white transition"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>إعادة السباق</span>
          </button>

          <button
            type="button"
            onClick={() => click(onQuitToMenu)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 py-2.5 text-sm font-bold text-slate-200 transition"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>العودة للقائمة الرئيسية</span>
          </button>
        </div>

        {/* Instant Audio Controls */}
        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              click(() => onUpdateSound({ ...sound, musicEnabled: !sound.musicEnabled }))
            }
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition ${
              sound.musicEnabled
                ? 'bg-sky-500/15 border-sky-400/40 text-sky-200'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}
          >
            {sound.musicEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>الموسيقى</span>
          </button>

          <button
            type="button"
            onClick={() =>
              click(() => onUpdateSound({ ...sound, sfxEnabled: !sound.sfxEnabled }))
            }
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition ${
              sound.sfxEnabled
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}
          >
            {sound.sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>المؤثرات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
