import React from 'react';
import { Award, Coins, Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { soundEngine } from '../game/audio';
import type { RaceApplyOutcome, RaceResult } from '../game/types';

interface ResultsModalProps {
  result: RaceResult;
  outcome: RaceApplyOutcome;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  result,
  outcome,
  onPlayAgain,
  onMainMenu,
}) => {
  const bestScore = outcome.save.highScores[result.mode] ?? result.score;
  const totalCoinsWon = result.coinsCollected + outcome.bonusCoins + outcome.levelUpRewardCoins;
  const leveledUp = outcome.levelAfter > outcome.levelBefore;

  const titleText =
    result.mode === 'endless'
      ? 'انتهى السباق!'
      : result.won
      ? 'فوز مستحق!'
      : result.endReason === 'time_up'
      ? 'انتهى الوقت!'
      : 'تحطمت السيارة!';

  const click = (fn: () => void) => {
    soundEngine.playClick();
    fn();
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#111622] border border-white/15 p-5 shadow-2xl space-y-4 max-h-[92%] overflow-y-auto custom-scroll">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 mx-auto mb-1">
            <Trophy className={`w-6 h-6 ${result.won ? 'text-amber-400' : 'text-rose-400'}`} />
          </div>
          <h2 className="text-2xl font-black text-white">{titleText}</h2>
          {outcome.isNewHighScore && (
            <p className="text-xs font-extrabold text-amber-300">رقم قياسي جديد في هذا النمط!</p>
          )}
        </div>

        {/* Score & Best */}
        <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">النتيجة النهائية</div>
            <div className="font-mono-num text-2xl font-black text-white">
              {result.score.toLocaleString('en-US')}
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-slate-400">أفضل نتيجة</div>
            <div className="font-mono-num text-base font-bold text-amber-300">
              {bestScore.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-900/65 border border-white/10 p-2.5">
            <div className="text-slate-400">المسافة المقطوعة</div>
            <div className="font-mono-num text-base font-bold text-white mt-0.5">
              {result.distanceMeters.toLocaleString('en-US')} م
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/65 border border-white/10 p-2.5">
            <div className="text-slate-400">مدة السباق</div>
            <div className="font-mono-num text-base font-bold text-white mt-0.5">
              {result.durationSec} ثانية
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/65 border border-white/10 p-2.5">
            <div className="text-slate-400">العملات المجمعة</div>
            <div className="font-mono-num text-base font-bold text-amber-300 mt-0.5 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>+{totalCoinsWon.toLocaleString('en-US')}</span>
            </div>
            {outcome.bonusCoins > 0 && (
              <div className="text-[10px] text-emerald-300 mt-0.5">
                شاملة +{outcome.bonusCoins} مكافأة إنهاء
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-900/65 border border-white/10 p-2.5">
            <div className="text-slate-400">نقاط الخبرة</div>
            <div className="font-mono-num text-base font-bold text-sky-300 mt-0.5">
              +{outcome.xpEarned} XP
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              المستوى الحالي: {outcome.levelAfter}
            </div>
          </div>
        </div>

        {/* Level Up / Missions / Achievements Rewards Notice */}
        {leveledUp && (
          <div className="rounded-xl bg-sky-500/15 border border-sky-400/40 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-sky-200">
              <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
              <span>ارتقيت إلى المستوى {outcome.levelAfter}!</span>
            </div>
            <span className="font-mono-num font-bold text-amber-300">
              +{outcome.levelUpRewardCoins} عملة
            </span>
          </div>
        )}

        {(outcome.newlyCompletedMissions.length > 0 || outcome.newlyUnlockedAchievements.length > 0) && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3 space-y-1 text-xs text-emerald-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>تقدم جديد جاهز للاستلام:</span>
            </div>
            {outcome.newlyCompletedMissions.map((m) => (
              <div key={m.id} className="text-[11px] text-slate-200">
                · مهمة مكتملة: {m.titleAr}
              </div>
            ))}
            {outcome.newlyUnlockedAchievements.map((a) => (
              <div key={a.id} className="text-[11px] text-amber-200">
                · إنجاز جديد: {a.titleAr}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => click(onPlayAgain)}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 py-3 text-sm font-black text-white transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة اللعب</span>
          </button>

          <button
            type="button"
            onClick={() => click(onMainMenu)}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 py-3 text-sm font-bold text-white transition"
          >
            <Home className="w-4 h-4" />
            <span>القائمة الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
