import { useCallback, useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { GameView } from './components/GameView';
import { TitleScreen } from './components/TitleScreen';
import { audio } from './game/audio';
import type { Difficulty, GameScreenState, HeroId } from './game/types';

const HIGH_SCORE_KEY = 'libertadores_1819_highscore';

export default function App() {
  const [screenState, setScreenState] = useState<GameScreenState>('TITLE_MENU');
  const [selectedHero, setSelectedHero] = useState<HeroId>('bolivar');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [startLevelIndex, setStartLevelIndex] = useState(0);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const handleToggleSfx = useCallback(() => {
    setSfxEnabled((prev) => {
      const next = !prev;
      audio.setSfxEnabled(next);
      return next;
    });
  }, []);

  const handleUpdateHighScore = useCallback((score: number) => {
    setHighScore((prev) => {
      if (score > prev) {
        try {
          localStorage.setItem(HIGH_SCORE_KEY, String(score));
        } catch {
          // ignore storage errors
        }
        return score;
      }
      return prev;
    });
  }, []);

  const handleStartSelect = useCallback(() => {
    audio.unlock();
    audio.playUiSelect();
    setScreenState('CHARACTER_SELECT');
  }, []);

  const handleConfirmHero = useCallback(() => {
    audio.unlock();
    audio.playUiSelect();
    setScreenState('STAGE_INTRO');
  }, []);

  const handleExitToMenu = useCallback(() => {
    audio.stopMusic();
    setScreenState('TITLE_MENU');
  }, []);

  return (
    <main className="min-h-screen bg-[#0b101b] text-slate-100 flex flex-col justify-center">
      {screenState === 'TITLE_MENU' && (
        <TitleScreen
          difficulty={difficulty}
          onChangeDifficulty={setDifficulty}
          onStartSelect={handleStartSelect}
          sfxEnabled={sfxEnabled}
          onToggleSfx={handleToggleSfx}
          highScore={highScore}
        />
      )}

      {screenState === 'CHARACTER_SELECT' && (
        <CharacterSelect
          selectedHero={selectedHero}
          onSelectHero={(id) => {
            audio.playUiSelect();
            setSelectedHero(id);
          }}
          startLevelIndex={startLevelIndex}
          onChangeStartLevel={setStartLevelIndex}
          onConfirm={handleConfirmHero}
          onBack={() => setScreenState('TITLE_MENU')}
        />
      )}

      {screenState !== 'TITLE_MENU' && screenState !== 'CHARACTER_SELECT' && (
        <GameView
          heroId={selectedHero}
          difficulty={difficulty}
          startLevelIndex={startLevelIndex}
          screenState={screenState}
          setScreenState={setScreenState}
          sfxEnabled={sfxEnabled}
          onToggleSfx={handleToggleSfx}
          onUpdateHighScore={handleUpdateHighScore}
          onExitToMenu={handleExitToMenu}
        />
      )}
    </main>
  );
}
