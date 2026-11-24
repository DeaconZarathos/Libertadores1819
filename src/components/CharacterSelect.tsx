import { ArrowLeft, ChevronRight, Sword } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HEROES, LEVELS } from '../game/data';
import type { HeroId } from '../game/types';

interface CharacterSelectProps {
  selectedHero: HeroId;
  onSelectHero: (id: HeroId) => void;
  startLevelIndex: number;
  onChangeStartLevel: (idx: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-400 w-20">{label}</span>
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="h-2.5 flex-1 rounded-xs border border-slate-700"
            style={{ backgroundColor: n <= value ? color : '#0f172a' }}
          />
        ))}
      </div>
    </div>
  );
}

export function CharacterSelect({
  selectedHero,
  onSelectHero,
  startLevelIndex,
  onChangeStartLevel,
  onConfirm,
  onBack,
}: CharacterSelectProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const heroList = [HEROES.bolivar, HEROES.santander];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        onSelectHero('bolivar');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        onSelectHero('santander');
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectHero, onConfirm, onBack]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <h1 className="font-pixel text-sm sm:text-base text-[#facc15] text-center">
          SELECCIONA TU LIBERTADOR
        </h1>
        <span className="text-xs text-slate-400 hidden sm:inline">← / → · Enter</span>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {heroList.map((hero) => {
          const isSelected = selectedHero === hero.id;
          return (
            <button
              key={hero.id}
              type="button"
              onClick={() => onSelectHero(hero.id)}
              className={`text-left p-5 rounded border-2 transition-all cursor-pointer flex flex-col gap-4 ${
                isSelected
                  ? 'bg-slate-900 border-[#facc15] shadow-[0_0_24px_rgba(250,204,21,0.18)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 bg-slate-950 border-2 border-slate-700 rounded overflow-hidden flex items-center justify-center">
                  {!imgErrors[hero.id] ? (
                    <img
                      src={hero.portraitUrl}
                      alt={`Retrato pixelado de ${hero.name}`}
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors((prev) => ({ ...prev, [hero.id]: true }))}
                      className="w-full h-full object-cover pixelated"
                    />
                  ) : (
                    <Sword className="w-10 h-10" style={{ color: hero.accentColor }} />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-pixel text-[10px]"
                      style={{ color: hero.accentColor }}
                    >
                      {isSelected ? '1P SELECCIONADO' : 'DISPONIBLE'}
                    </span>
                  </div>
                  <h2 className="font-pixel text-sm sm:text-base text-white leading-snug">
                    {hero.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-300">{hero.title}</p>
                  <p className="text-xs text-slate-400">{hero.style}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <StatBar label="Velocidad" value={hero.stats.velocidad} color={hero.accentColor} />
                <StatBar label="Fuerza" value={hero.stats.fuerza} color={hero.accentColor} />
                <StatBar label="Alcance" value={hero.stats.alcance} color={hero.accentColor} />
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded p-3 space-y-1">
                <p className="text-xs font-semibold text-white">
                  Especial: <span style={{ color: hero.accentColor }}>{hero.specialName}</span>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{hero.specialDesc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stage Start Selector + Confirm */}
      <div className="bg-slate-900/70 border border-slate-800 rounded p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
        <div className="space-y-2 flex-1">
          <label htmlFor="start-level-select" className="block text-xs font-semibold text-slate-300">
            Nivel de inicio de campaña (1 al 7)
          </label>
          <select
            id="start-level-select"
            value={startLevelIndex}
            onChange={(e) => onChangeStartLevel(Number(e.target.value))}
            className="w-full md:w-96 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-[#facc15]"
          >
            {LEVELS.map((lvl, idx) => (
              <option key={lvl.id} value={idx}>
                Nivel {lvl.id}: {lvl.name} ({lvl.dateLabel})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center justify-center gap-2 px-7 py-4 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs sm:text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>COMENZAR BATALLA</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
