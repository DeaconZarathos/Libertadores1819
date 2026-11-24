import { Play, Shield, Sword, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { FOODS, LEVELS } from '../game/data';
import type { Difficulty } from '../game/types';

interface TitleScreenProps {
  difficulty: Difficulty;
  onChangeDifficulty: (d: Difficulty) => void;
  onStartSelect: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  highScore: number;
}

const KEY_ART_URL = '/src/assets/images/river_city_intro_art_1795480600016.jpg';

export function TitleScreen({
  difficulty,
  onChangeDifficulty,
  onStartSelect,
  sfxEnabled,
  onToggleSfx,
  highScore,
}: TitleScreenProps) {
  const [imgError, setImgError] = useState(false);

  const healingFoods = Object.values(FOODS).filter((f) => !f.isTreasure);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8">
      {/* Top arcade bar */}
      <header className="flex items-center justify-between gap-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-sm sm:text-base text-[#facc15] tracking-wide whitespace-nowrap">
            LIBERTADORES 1819
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden sm:inline text-xs font-mono-tabular text-slate-400 whitespace-nowrap">
            RÉCORD: {String(highScore).padStart(7, '0')}
          </span>
          <button
            type="button"
            onClick={onToggleSfx}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded hover:border-[#facc15] transition-colors whitespace-nowrap cursor-pointer"
            aria-label={sfxEnabled ? 'Silenciar sonido' : 'Activar sonido'}
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4 text-[#facc15]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{sfxEnabled ? 'Audio activo' : 'Audio apagado'}</span>
          </button>
        </div>
      </header>

      {/* Main Hero Arcade Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 relative bg-slate-950 border-2 border-slate-800 rounded overflow-hidden aspect-video flex items-center justify-center">
          {!imgError ? (
            <img
              src={KEY_ART_URL}
              alt="Simón Bolívar y Francisco de Paula Santander en el Puente de Boyacá, arte pixelado estilo NES"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover pixelated"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#172554] via-[#1e293b] to-[#7f1d1d] p-8 text-center">
              <Sword className="w-12 h-12 text-[#facc15] mb-3" />
              <p className="font-pixel text-lg text-[#facc15]">LIBERTADORES 1819</p>
              <p className="text-sm text-slate-300 mt-2">La aventura de la independencia</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-5">
            <p className="font-pixel text-[11px] text-[#facc15] tracking-wider">
              7 NIVELES HISTÓRICOS
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/70 border border-slate-800 rounded p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <h1 className="font-pixel text-2xl sm:text-3xl leading-snug text-white">
              LA AVENTURA DE LA INDEPENDENCIA
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Elige a <span className="text-[#facc15] font-semibold">Simón Bolívar</span> o a{' '}
              <span className="text-[#38bdf8] font-semibold">Francisco de Paula Santander</span>, rompe las líneas
              de la Corona Española a lo largo de siete batallas y enfrenta al general{' '}
              <span className="text-red-400 font-semibold">José María Barreiro</span> en el Puente de Boyacá.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dificultad</p>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded">
              <button
                type="button"
                onClick={() => onChangeDifficulty('normal')}
                className={`px-3 py-2.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  difficulty === 'normal'
                    ? 'bg-[#facc15] text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => onChangeDifficulty('veterano')}
                className={`px-3 py-2.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  difficulty === 'veterano'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Veterano
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onStartSelect}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#facc15] hover:bg-yellow-300 text-slate-950 font-pixel text-xs sm:text-sm rounded transition-colors cursor-pointer shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>ELEGIR HÉROE Y JUGAR</span>
            </button>
            <p className="text-xs text-slate-400 text-center">
              Controles: Flechas o WASD · J/Z Atacar · K/X Saltar · L/C/Espacio Especial
            </p>
          </div>
        </div>
      </section>

      {/* Campaign Map & Colombian Food Recovery Info */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-xs text-[#facc15]">RUTA DE LOS 7 NIVELES</h2>
            <span className="text-xs text-slate-400">1810 — 1819</span>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {LEVELS.map((lvl) => (
              <li
                key={lvl.id}
                className="flex items-start gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded"
              >
                <span className="font-pixel text-[11px] text-[#facc15] pt-0.5 shrink-0">0{lvl.id}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{lvl.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {lvl.dateLabel} · Jefe: {lvl.bossName}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-xs text-emerald-400">PROVISIONES CRIOLLAS</h2>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Destruye cajas y barriles coloniales para encontrar comida autóctona colombiana y recuperar tu energía:
          </p>
          <ul className="space-y-2.5 text-sm">
            {healingFoods.map((food) => (
              <li
                key={food.kind}
                className="flex items-center justify-between py-1.5 border-b border-slate-800/70 last:border-b-0"
              >
                <div>
                  <span className="font-medium text-slate-100">{food.name}</span>
                  <span className="text-xs text-slate-500 ml-2">· {food.region}</span>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-emerald-400">
                  +{food.healHp} HP
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
