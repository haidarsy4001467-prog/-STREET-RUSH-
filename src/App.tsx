import { useCallback, useEffect, useRef, useState } from 'react';
import { GarageModal } from './components/GarageModal';
import { HomeScreen, type ScreenModal } from './components/HomeScreen';
import { MissionsAchievementsModal } from './components/MissionsAchievementsModal';
import { PauseModal } from './components/PauseModal';
import { RaceScreen } from './components/RaceScreen';
import { ResultsModal } from './components/ResultsModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { soundEngine } from './game/audio';
import type { StreetRushEngine } from './game/engine';
import {
  applyRaceResult,
  buyCar,
  claimAchievementReward,
  claimMissionReward,
  selectCar,
  upgradeCarStat,
} from './game/progression';
import { loadSaveData, persistSaveData, resetSaveData } from './game/storage';
import type {
  ControlSettings,
  GameMode,
  RaceApplyOutcome,
  RaceResult,
  SaveData,
  SoundSettings,
  UpgradeStat,
} from './game/types';

type AppView = 'TITLE_MENU' | 'PLAYING' | 'RESULTS';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [view, setView] = useState<AppView>('TITLE_MENU');
  const [selectedMode, setSelectedMode] = useState<GameMode>('endless');
  const [paused, setPaused] = useState(false);
  const [raceInstanceKey, setRaceInstanceKey] = useState(1);
  const [activeModal, setActiveModal] = useState<ScreenModal>(null);
  const [shopCarId, setShopCarId] = useState<string | undefined>(undefined);
  const [lastResult, setLastResult] = useState<{
    result: RaceResult;
    outcome: RaceApplyOutcome;
  } | null>(null);

  const engineRef = useRef<StreetRushEngine | null>(null);

  // Sync sound settings & persist save on change
  useEffect(() => {
    soundEngine.updateSettings(save.sound);
    persistSaveData(save);
  }, [save]);

  // Enter / Space shortcut to start from Title Menu when no modal is open
  useEffect(() => {
    if (view !== 'TITLE_MENU' || activeModal !== null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        soundEngine.unlock();
        soundEngine.playClick();
        setPaused(false);
        setLastResult(null);
        setRaceInstanceKey((k) => k + 1);
        setView('PLAYING');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, activeModal]);

  const handleStartRace = useCallback(() => {
    soundEngine.unlock();
    setPaused(false);
    setLastResult(null);
    setRaceInstanceKey((k) => k + 1);
    setView('PLAYING');
  }, []);

  const handleRaceComplete = useCallback((result: RaceResult) => {
    if (result.endReason === 'aborted') {
      setPaused(false);
      setView('TITLE_MENU');
      return;
    }
    setSave((prev) => {
      const outcome = applyRaceResult(prev, result);
      setLastResult({ result, outcome });
      return outcome.save;
    });
    setPaused(false);
    setView('RESULTS');
  }, []);

  const handleRestartRace = useCallback(() => {
    setPaused(false);
    setLastResult(null);
    setRaceInstanceKey((k) => k + 1);
    setView('PLAYING');
  }, []);

  const handleQuitToMenu = useCallback(() => {
    engineRef.current?.unmount();
    setPaused(false);
    setLastResult(null);
    setView('TITLE_MENU');
  }, []);

  const handleBuyCar = (carId: string) => {
    let outcome: { success: boolean; errorAr?: string } = { success: false };
    setSave((prev) => {
      const res = buyCar(prev, carId);
      outcome = { success: res.success, errorAr: res.errorAr };
      return res.save;
    });
    return outcome;
  };

  const handleSelectCar = (carId: string) => {
    setSave((prev) => selectCar(prev, carId));
  };

  const handleUpgradeStat = (carId: string, stat: UpgradeStat) => {
    let outcome: { success: boolean; errorAr?: string } = { success: false };
    setSave((prev) => {
      const res = upgradeCarStat(prev, carId, stat);
      outcome = { success: res.success, errorAr: res.errorAr };
      return res.save;
    });
    return outcome;
  };

  const handleClaimMission = (missionId: string) => {
    setSave((prev) => claimMissionReward(prev, missionId).save);
  };

  const handleClaimAchievement = (achievementId: string) => {
    setSave((prev) => claimAchievementReward(prev, achievementId).save);
  };

  const handleUpdateSound = (sound: SoundSettings) => {
    setSave((prev) => ({ ...prev, sound }));
  };

  const handleUpdateControls = (controls: ControlSettings) => {
    setSave((prev) => ({ ...prev, controls }));
  };

  const handleToggleSoundQuick = () => {
    const anyOn = save.sound.musicEnabled || save.sound.sfxEnabled;
    handleUpdateSound({
      ...save.sound,
      musicEnabled: !anyOn,
      sfxEnabled: !anyOn,
    });
  };

  const handleToggleDayNight = () => {
    handleUpdateControls({
      ...save.controls,
      dayNight: save.controls.dayNight === 'night' ? 'day' : 'night',
    });
  };

  const handleResetAll = () => {
    const fresh = resetSaveData();
    setSave(fresh);
  };

  return (
    <div
      dir="rtl"
      className="h-[100dvh] w-full bg-[#05070B] flex items-center justify-center overflow-hidden sm:p-3"
    >
      {/* 9:16 Portrait Mobile Game Shell */}
      <div className="relative h-full w-full sm:h-auto sm:max-h-[94dvh] sm:w-auto sm:aspect-[9/16] max-w-[460px] overflow-hidden sm:rounded-[28px] sm:border sm:border-white/15 bg-[#0B0E14] shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
        {view === 'TITLE_MENU' && (
          <HomeScreen
            save={save}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            onStartRace={handleStartRace}
            onOpenModal={(modal) => {
              setShopCarId(undefined);
              setActiveModal(modal);
            }}
            onToggleSoundQuick={handleToggleSoundQuick}
            onToggleDayNight={handleToggleDayNight}
          />
        )}

        {(view === 'PLAYING' || view === 'RESULTS') && (
          <RaceScreen
            mode={selectedMode}
            save={save}
            paused={paused || view === 'RESULTS'}
            raceInstanceKey={raceInstanceKey}
            onPauseToggle={() => setPaused((p) => !p)}
            onRaceComplete={handleRaceComplete}
            engineRefOut={engineRef}
          />
        )}

        {view === 'PLAYING' && paused && (
          <PauseModal
            sound={save.sound}
            onResume={() => setPaused(false)}
            onRestart={handleRestartRace}
            onQuitToMenu={handleQuitToMenu}
            onUpdateSound={handleUpdateSound}
          />
        )}

        {view === 'RESULTS' && lastResult && (
          <ResultsModal
            result={lastResult.result}
            outcome={lastResult.outcome}
            onPlayAgain={handleRestartRace}
            onMainMenu={handleQuitToMenu}
          />
        )}

        {/* Modals from Title Menu */}
        {(activeModal === 'garage' || activeModal === 'car_select') && (
          <GarageModal
            save={save}
            initialTab={activeModal}
            onClose={() => setActiveModal(null)}
            onBuyCar={handleBuyCar}
            onSelectCar={handleSelectCar}
            onOpenShopForCar={(cid) => {
              setShopCarId(cid);
              setActiveModal('shop');
            }}
          />
        )}

        {activeModal === 'shop' && (
          <ShopModal
            save={save}
            initialCarId={shopCarId}
            onClose={() => setActiveModal(null)}
            onUpgradeStat={handleUpgradeStat}
            onOpenGarage={() => setActiveModal('garage')}
          />
        )}

        {(activeModal === 'missions' || activeModal === 'achievements') && (
          <MissionsAchievementsModal
            save={save}
            initialTab={activeModal}
            onClose={() => setActiveModal(null)}
            onClaimMission={handleClaimMission}
            onClaimAchievement={handleClaimAchievement}
          />
        )}

        {activeModal === 'settings' && (
          <SettingsModal
            save={save}
            onClose={() => setActiveModal(null)}
            onUpdateSound={handleUpdateSound}
            onUpdateControls={handleUpdateControls}
            onResetAllData={handleResetAll}
          />
        )}
      </div>
    </div>
  );
}
