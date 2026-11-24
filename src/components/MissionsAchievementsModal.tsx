import React, { useState } from 'react';
import { Award, CheckCircle2, Coins, Target, X } from 'lucide-react';
import { soundEngine } from '../game/audio';
import type { SaveData } from '../game/types';

interface MissionsAchievementsModalProps {
  save: SaveData;
  initialTab: 'missions' | 'achievements';
  onClose: () => void;
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achievementId: string) => void;
}

export const MissionsAchievementsModal: React.FC<MissionsAchievementsModalProps> = ({
  save,
  initialTab,
  onClose,
  onClaimMission,
  onClaimAchievement,
}) => {
  const [tab, setTab] = useState<'missions' | 'achievements'>(initialTab);

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
            aria-label="إغلاق"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-white">المهام والإنجازات</h2>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-amber-500/30 px-2.5 py-1.5">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-mono-num text-sm font-bold text-amber-300">
            {save.coins.toLocaleString('en-US')}
          </span>
        </div>
      </header>

      {/* Segmented Tabs */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-900 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('missions');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              tab === 'missions'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>المهام اليومية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('achievements');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              tab === 'achievements'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>الإنجازات</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2.5">
        {tab === 'missions'
          ? save.missions.map((m) => {
              const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
              return (
                <div
                  key={m.id}
                  className="rounded-2xl bg-slate-900/85 border border-white/10 p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-white">{m.titleAr}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="font-mono-num">
                          {m.progress.toLocaleString('en-US')} / {m.target.toLocaleString('en-US')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300 font-bold">+{m.rewardCoins} عملة</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-300 font-bold">+{m.rewardXp} XP</span>
                      </div>
                    </div>

                    {m.claimed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        تم الاستلام
                      </span>
                    ) : m.completed ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playVictoryOrLevelUp();
                          onClaimMission(m.id);
                        }}
                        className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 transition"
                      >
                        استلام المكافأة
                      </button>
                    ) : (
                      <span className="font-mono-num text-xs font-bold text-slate-400 shrink-0">
                        {pct}%
                      </span>
                    )}
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        m.completed ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          : save.achievements.map((a) => {
              const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
              return (
                <div
                  key={a.id}
                  className="rounded-2xl bg-slate-900/85 border border-white/10 p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-white">{a.titleAr}</h3>
                      <p className="text-[11px] text-slate-300">{a.descriptionAr}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="font-mono-num">
                          {a.progress.toLocaleString('en-US')} / {a.target.toLocaleString('en-US')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300 font-bold">+{a.rewardCoins} عملة</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-300 font-bold">+{a.rewardXp} XP</span>
                      </div>
                    </div>

                    {a.claimed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        مكتمل
                      </span>
                    ) : a.unlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playVictoryOrLevelUp();
                          onClaimAchievement(a.id);
                        }}
                        className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 transition"
                      >
                        استلام
                      </button>
                    ) : (
                      <span className="font-mono-num text-xs font-bold text-slate-400 shrink-0">
                        {pct}%
                      </span>
                    )}
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        a.unlocked ? 'bg-amber-400' : 'bg-sky-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
};
