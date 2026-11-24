import {
  ChevronRight,
  Monitor,
  Music,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../game/audio';
import { CANVAS_HEIGHT, CANVAS_WIDTH, HEROES, LEVELS } from '../game/data';
import { BeatEmUpEngine } from '../game/engine';
import type {
  Difficulty,
  GameScreenState,
  HeroId,
  HudSnapshot,
  InputState,
} from '../game/types';

interface GameViewProps {
  heroId: HeroId;
  difficulty: Difficulty;
  startLevelIndex: number;
  screenState: GameScreenState;
  setScreenState: (s: GameScreenState) => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  onUpdateHighScore: (score: number) => void;
  onExitToMenu: () => void;
}

export function GameView({
  heroId,
  difficulty,
  startLevelIndex,
  screenState,
  setScreenState,
  sfxEnabled,
  onToggleSfx,
  onUpdateHighScore,
  onExitToMenu,
}: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BeatEmUpEngine | null>(null);

  const [crtEnabled, setCrtEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    heroId,
    hp: HEROES[heroId].maxHp,
    maxHp: HEROES[heroId].maxHp,
    lives: 3,
    continues: 3,
    score: 0,
    levelIndex: startLevelIndex,
    levelName: LEVELS[startLevelIndex].name,
    timeRemaining: 99,
    comboCounter: 0,
    goArrowActive: false,
    bossActive: false,
    bossName: '',
    bossTitle: '',
    bossHp: 0,
    bossMaxHp: 1,
    bannerText: null,
    enemiesDefeated: 0,
    foodsEaten: 0,
  }));

  const keysHeldRef = useRef<Set<string>>(new Set());
  const queuedActionsRef = useRef<{
    attack: boolean;
    jump: boolean;
    special: boolean;
    dashTrigger: boolean;
  }>({ attack: false, jump: false, special: false, dashTrigger: false });
  const touchDirsRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });
  const lastTapRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const screenStateRef = useRef(screenState);
  screenStateRef.current = screenState;

  const initEngine = useCallback(() => {
    const engine = new BeatEmUpEngine(heroId, difficulty, startLevelIndex, {
      onHudUpdate: (snap) => {
        setHud(snap);
        onUpdateHighScore(snap.score);
      },
      onStageClear: (snap) => {
        setHud(snap);
        onUpdateHighScore(snap.score);
        setScreenState('STAGE_CLEAR');
      },
      onGameOver: (snap) => {
        setHud(snap);
        onUpdateHighScore(snap.score);
        setScreenState('GAME_OVER');
      },
      onVictory: (snap) => {
        setHud(snap);
        onUpdateHighScore(snap.score);
        setScreenState('VICTORY');
      },
    });
    engineRef.current = engine;
    setHud(engine.getHudSnapshot());
  }, [heroId, difficulty, startLevelIndex, onUpdateHighScore, setScreenState]);

  useEffect(() => {
    initEngine();
    return () => {
      audio.stopMusic();
    };
  }, [initEngine]);

  // Keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const relevant = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyJ',
        'KeyK',
        'KeyL',
        'KeyZ',
        'KeyX',
        'KeyC',
        'ShiftLeft',
        'ShiftRight',
        'Escape',
        'KeyP',
        'Enter',
      ];
      if (relevant.includes(code)) {
        e.preventDefault();
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (screenStateRef.current === 'PLAYING') {
          audio.stopMusic();
          setScreenState('PAUSED');
        } else if (screenStateRef.current === 'PAUSED') {
          audio.startMusic(engineRef.current?.bossSpawned ?? false);
          setScreenState('PLAYING');
        }
        return;
      }

      if (code === 'Enter' && screenStateRef.current === 'STAGE_INTRO') {
        audio.unlock();
        audio.playUiSelect();
        audio.startMusic(false);
        setScreenState('PLAYING');
        return;
      }

      if (screenStateRef.current !== 'PLAYING') return;

      if (!e.repeat) {
        if (code === 'KeyJ' || code === 'KeyZ') {
          queuedActionsRef.current.attack = true;
        }
        if (code === 'KeyK' || code === 'KeyX') {
          queuedActionsRef.current.jump = true;
        }
        if (code === 'KeyL' || code === 'KeyC' || code === 'Space') {
          queuedActionsRef.current.special = true;
        }
        // Double-tap left/right dash
        if (
          code === 'ArrowLeft' ||
          code === 'ArrowRight' ||
          code === 'KeyA' ||
          code === 'KeyD'
        ) {
          const dirKey = code === 'ArrowLeft' || code === 'KeyA' ? 'L' : 'R';
          const now = performance.now();
          if (lastTapRef.current.key === dirKey && now - lastTapRef.current.time < 240) {
            queuedActionsRef.current.dashTrigger = true;
          }
          lastTapRef.current = { key: dirKey, time: now };
        }
      }

      keysHeldRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const onBlur = () => {
      keysHeldRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [setScreenState]);

  // Fixed-timestep 60fps loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const STEP_MS = 1000 / 60;

    const frame = (now: number) => {
      const delta = Math.min(80, now - lastTime);
      lastTime = now;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (screenStateRef.current === 'PLAYING') {
            accumulator += delta;
            while (accumulator >= STEP_MS) {
              const held = keysHeldRef.current;
              const touch = touchDirsRef.current;
              const q = queuedActionsRef.current;
              const input: InputState = {
                left: held.has('ArrowLeft') || held.has('KeyA') || touch.left,
                right: held.has('ArrowRight') || held.has('KeyD') || touch.right,
                up: held.has('ArrowUp') || held.has('KeyW') || touch.up,
                down: held.has('ArrowDown') || held.has('KeyS') || touch.down,
                dashHeld: held.has('ShiftLeft') || held.has('ShiftRight'),
                attackPressed: q.attack,
                jumpPressed: q.jump,
                specialPressed: q.special,
                dashTrigger: q.dashTrigger,
              };
              q.attack = false;
              q.jump = false;
              q.special = false;
              q.dashTrigger = false;

              engine.step(input);
              accumulator -= STEP_MS;
            }
          } else {
            accumulator = 0;
          }

          engine.render(ctx);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleToggleMusic = () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    audio.setMusicEnabled(next);
    if (next && screenState === 'PLAYING') {
      audio.startMusic(engineRef.current?.bossSpawned ?? false);
    }
  };

  const handleStartStage = () => {
    audio.unlock();
    audio.playUiSelect();
    audio.startMusic(false);
    setScreenState('PLAYING');
  };

  const handleNextStage = () => {
    const engine = engineRef.current;
    if (!engine) return;
    audio.playUiSelect();
    const nextIdx = engine.levelIndex + 1;
    if (nextIdx < LEVELS.length) {
      engine.loadLevel(nextIdx);
      setScreenState('STAGE_INTRO');
    } else {
      setScreenState('VICTORY');
    }
  };

  const handleContinue = () => {
    const engine = engineRef.current;
    if (!engine) return;
    audio.playUiSelect();
    engine.useContinue();
    setScreenState('PLAYING');
  };

  const handleRestartCampaign = () => {
    audio.playUiSelect();
    initEngine();
    setScreenState('STAGE_INTRO');
  };

  const currentLevel = LEVELS[hud.levelIndex] ?? LEVELS[0];
  const heroCfg = HEROES[hud.heroId];

  const bindDir = (dir: 'left' | 'right' | 'up' | 'down') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      touchDirsRef.current[dir] = true;
    },
    onPointerUp: () => {
      touchDirsRef.current[dir] = false;
    },
    onPointerLeave: () => {
      touchDirsRef.current[dir] = false;
    },
    onPointerCancel: () => {
      touchDirsRef.current[dir] = false;
    },
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Compact Arcade Top Control Strip */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-pixel text-xs sm:text-sm text-[#facc15] whitespace-nowrap">
            LIBERTADORES 1819
          </span>
          <span className="hidden md:inline text-xs text-slate-400 truncate">
            Nivel {currentLevel.id}/7 · {currentLevel.name}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setCrtEnabled((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
              crtEnabled
                ? 'bg-slate-800 border-[#facc15]/60 text-[#facc15]'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CRT</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMusic}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
              musicEnabled
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{musicEnabled ? 'Música' : 'Sin música'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSfx}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border bg-slate-900 border-slate-700 text-slate-200 hover:border-[#facc15] cursor-pointer whitespace-nowrap"
          >
            {sfxEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#facc15]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">SFX</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (screenState === 'PLAYING') {
                audio.stopMusic();
                setScreenState('PAUSED');
              } else if (screenState === 'PAUSED') {
                audio.startMusic(engineRef.current?.bossSpawned ?? false);
                setScreenState('PLAYING');
              }
            }}
            disabled={screenState !== 'PLAYING' && screenState !== 'PAUSED'}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border bg-slate-900 border-slate-700 text-white hover:border-[#facc15] disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            {screenState === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{screenState === 'PAUSED' ? 'Reanudar' : 'Pausa'}</span>
          </button>
        </div>
      </header>

      {/* Main 16-bit SNES Arcade Viewport */}
      <div className="relative w-full aspect-video bg-black border-2 border-slate-700 rounded overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block pixelated"
        />

        {crtEnabled && <div className="absolute inset-0 crt-scanlines" />}

        {/* STAGE INTRO OVERLAY */}
        {screenState === 'STAGE_INTRO' && (
          <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-lg w-full bg-slate-900 border-2 border-[#facc15] rounded p-6 sm:p-8 text-center space-y-5">
              <p className="font-pixel text-[10px] sm:text-xs text-[#facc15] tracking-widest">
                NIVEL {currentLevel.id} DE 7 · {currentLevel.dateLabel}
              </p>
              <h2 className="font-pixel text-lg sm:text-2xl text-white leading-snug">
                {currentLevel.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-300">
                {currentLevel.subtitle} — {currentLevel.location}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentLevel.briefing}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartStage}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs rounded cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>¡A LA CARGA!</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Jefe de etapa: <span className="text-red-400 font-semibold">{currentLevel.bossName}</span>
              </p>
            </div>
          </div>
        )}

        {/* PAUSE OVERLAY */}
        {screenState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-slate-900 border-2 border-slate-600 rounded p-6 text-center space-y-5">
              <h2 className="font-pixel text-lg text-[#facc15]">PAUSA</h2>
              <p className="text-xs text-slate-400">
                {heroCfg.name} · Nivel {currentLevel.id}: {currentLevel.name}
              </p>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    audio.startMusic(engineRef.current?.bossSpawned ?? false);
                    setScreenState('PLAYING');
                  }}
                  className="w-full py-3 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs rounded cursor-pointer"
                >
                  REANUDAR
                </button>
                <button
                  type="button"
                  onClick={handleRestartCampaign}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Reiniciar Campaña
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audio.stopMusic();
                    onExitToMenu();
                  }}
                  className="w-full py-2.5 bg-slate-950 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold rounded cursor-pointer"
                >
                  Volver al Menú Principal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE CLEAR OVERLAY */}
        {screenState === 'STAGE_CLEAR' && (
          <div className="absolute inset-0 bg-slate-950/88 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-400 rounded p-6 sm:p-8 text-center space-y-5">
              <p className="font-pixel text-xs text-emerald-400">¡VICTORIA EN LA ETAPA!</p>
              <h2 className="font-pixel text-base sm:text-xl text-white">
                {currentLevel.name} Liberada
              </h2>
              <div className="grid grid-cols-3 gap-3 bg-slate-950 border border-slate-800 rounded p-3 text-center">
                <div>
                  <p className="text-[11px] text-slate-400">Puntaje</p>
                  <p className="font-mono-tabular text-sm font-bold text-[#facc15]">{hud.score}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Derrotados</p>
                  <p className="font-mono-tabular text-sm font-bold text-white">{hud.enemiesDefeated}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Comidas</p>
                  <p className="font-mono-tabular text-sm font-bold text-emerald-400">{hud.foodsEaten}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNextStage}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs rounded cursor-pointer"
              >
                <span>SIGUIENTE NIVEL</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {screenState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-slate-950/92 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border-2 border-red-600 rounded p-6 sm:p-8 text-center space-y-5">
              <h2 className="font-pixel text-xl sm:text-2xl text-red-500">FIN DE LA PARTIDA</h2>
              <p className="text-sm text-slate-300">
                Caíste en {currentLevel.name}. Puntaje final:{' '}
                <span className="font-mono-tabular font-bold text-[#facc15]">{hud.score}</span>
              </p>
              <div className="space-y-2.5">
                {hud.continues > 0 && (
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full py-3.5 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs rounded cursor-pointer"
                  >
                    CONTINUAR ({hud.continues} RESTANTES)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRestartCampaign}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Campaña</span>
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="w-full py-2.5 bg-slate-950 border border-slate-700 text-slate-300 text-xs font-semibold rounded cursor-pointer"
                >
                  Volver al Menú
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FINAL VICTORY OVERLAY (BARREIRO DEFEATED AT PUENTE DE BOYACA!) */}
        {screenState === 'VICTORY' && (
          <div className="absolute inset-0 bg-slate-950/92 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-slate-900 border-2 border-[#facc15] rounded p-6 sm:p-8 text-center space-y-5">
              <div className="flex justify-center">
                <Trophy className="w-10 h-10 text-[#facc15]" />
              </div>
              <p className="font-pixel text-[11px] text-[#facc15]">7 DE AGOSTO DE 1819 · PUENTE DE BOYACÁ</p>
              <h2 className="font-pixel text-lg sm:text-xl text-white leading-snug">
                ¡COLOMBIA ES LIBRE!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {heroCfg.name} ha derrotado a <span className="text-red-400 font-semibold">José María Barreiro</span> y
                sellado la independencia de la Nueva Granada.
              </p>
              <div className="grid grid-cols-3 gap-3 bg-slate-950 border border-slate-800 rounded p-3">
                <div>
                  <p className="text-[11px] text-slate-400">Puntaje Final</p>
                  <p className="font-mono-tabular text-sm font-bold text-[#facc15]">{hud.score}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Realistas</p>
                  <p className="font-mono-tabular text-sm font-bold text-white">{hud.enemiesDefeated}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Comidas</p>
                  <p className="font-mono-tabular text-sm font-bold text-emerald-400">{hud.foodsEaten}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRestartCampaign}
                  className="flex-1 py-3.5 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs rounded cursor-pointer"
                >
                  JUGAR DE NUEVO
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Menú Principal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Strip & Touch / Mouse Arcade Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-900/60 border border-slate-800 rounded p-4">
        <div className="lg:col-span-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
          <span>
            <strong className="text-[#facc15]">Mover:</strong> Flechas / WASD
          </span>
          <span>
            <strong className="text-[#facc15]">Correr:</strong> Doble toque ←/→ o Shift
          </span>
          <span>
            <strong className="text-[#facc15]">Atacar / Agarrar:</strong> J o Z
          </span>
          <span>
            <strong className="text-[#facc15]">Saltar:</strong> K o X
          </span>
          <span>
            <strong className="text-[#facc15]">Especial:</strong> L, C o Espacio
          </span>
        </div>

        {/* Interactive Arcade Touch/Click Pad */}
        <div className="lg:col-span-5 flex items-center justify-between sm:justify-end gap-4 select-none">
          <div className="grid grid-cols-3 gap-1 w-28">
            <div />
            <button
              type="button"
              {...bindDir('up')}
              className="h-9 bg-slate-800 active:bg-slate-600 border border-slate-700 rounded text-xs font-bold text-white cursor-pointer"
              aria-label="Arriba"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              {...bindDir('left')}
              className="h-9 bg-slate-800 active:bg-slate-600 border border-slate-700 rounded text-xs font-bold text-white cursor-pointer"
              aria-label="Izquierda"
            >
              ◀
            </button>
            <button
              type="button"
              {...bindDir('down')}
              className="h-9 bg-slate-800 active:bg-slate-600 border border-slate-700 rounded text-xs font-bold text-white cursor-pointer"
              aria-label="Abajo"
            >
              ▼
            </button>
            <button
              type="button"
              {...bindDir('right')}
              className="h-9 bg-slate-800 active:bg-slate-600 border border-slate-700 rounded text-xs font-bold text-white cursor-pointer"
              aria-label="Derecha"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                queuedActionsRef.current.attack = true;
              }}
              className="px-3.5 py-3 bg-red-600 active:bg-red-500 text-white font-pixel text-[10px] rounded border border-red-400 cursor-pointer"
            >
              ATK
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                queuedActionsRef.current.jump = true;
              }}
              className="px-3.5 py-3 bg-sky-600 active:bg-sky-500 text-white font-pixel text-[10px] rounded border border-sky-400 cursor-pointer"
            >
              JMP
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                queuedActionsRef.current.special = true;
              }}
              className="px-3.5 py-3 bg-[#facc15] active:bg-yellow-300 text-slate-950 font-pixel text-[10px] rounded border border-yellow-200 cursor-pointer"
            >
              ESP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
