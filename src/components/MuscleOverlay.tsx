import React from 'react';
import { motion } from 'motion/react';

interface MuscleOverlayProps {
  activeMuscles: string[];
  isPlaying?: boolean;
}

// Map specific muscle names from the database to broad SVG regions
const mapMuscleToRegion = (muscle: string) => {
  const m = muscle.toLowerCase();
  if (m.includes('peito') || m.includes('peitoral')) return 'chest';
  if (m.includes('deltoide') || m.includes('ombro')) return 'shoulders';
  if (m.includes('trapézio') || m.includes('costas') || m.includes('dorsal')) return 'back';
  if (m.includes('bíceps')) return 'biceps';
  if (m.includes('tríceps')) return 'triceps';
  if (m.includes('antebraço')) return 'forearms';
  if (m.includes('abdômen') || m.includes('core')) return 'core';
  if (m.includes('quadríceps') || m.includes('coxa')) return 'quads';
  if (m.includes('glúteo') || m.includes('posterior')) return 'glutes_hamstrings';
  if (m.includes('panturrilha')) return 'calves';
  return 'other';
};

export function MuscleOverlay({ activeMuscles, isPlaying = true }: MuscleOverlayProps) {
  const regions = new Set(activeMuscles.map(mapMuscleToRegion));

  const isPrimary = (region: ReturnType<typeof mapMuscleToRegion>) => regions.has(region);

  const getFill = (region: ReturnType<typeof mapMuscleToRegion>) => isPrimary(region) ? 'url(#emeraldSSS)' : '#273449';
  const getOpacity = (region: ReturnType<typeof mapMuscleToRegion>) => isPrimary(region) ? 0.95 : 0.35;
  const getSegmentClass = (region: ReturnType<typeof mapMuscleToRegion>) => {
    if (!isPrimary(region)) return '';
    return isPlaying ? 'active-muscle-segment animate-pulse' : '';
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-[#0B0F14] rounded-2xl overflow-hidden backdrop-blur-md border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
      <svg viewBox="0 0 100 200" className="w-full h-full p-2 drop-shadow-2xl">
        <defs>
          {/* Subsurface Scattering & Normal Shading Gradient */}
          <linearGradient id="emeraldSSS" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <filter id="muscleGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1.2" specularExponent="20" lighting-color="#34d399" result="specOut">
              <fePointLight x="50" y="50" z="100" />
            </feSpecularLighting>
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="1" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
        
        {/* Head */}
        <circle cx="50" cy="22" r="14" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        
        {/* Shoulders */}
        <motion.path 
          d="M 28 45 Q 50 35 72 45 Q 88 55 82 70 L 18 70 Q 12 55 28 45 Z" 
          fill={getFill('shoulders')} 
          opacity={getOpacity('shoulders')} 
          animate={{ fill: getFill('shoulders'), opacity: getOpacity('shoulders') }}
          filter={isPrimary('shoulders') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('shoulders')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        
        {/* Chest */}
        <motion.path 
          d="M 33 45 Q 50 40 67 45 L 67 72 Q 50 82 33 72 Z" 
          fill={getFill('chest')} 
          opacity={getOpacity('chest')}
          animate={{ fill: getFill('chest'), opacity: getOpacity('chest') }}
          filter={isPrimary('chest') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('chest')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        
        {/* Core */}
        <motion.path 
          d="M 33 74 Q 50 84 67 74 L 62 112 Q 50 117 38 112 Z" 
          fill={getFill('core')} 
          opacity={getOpacity('core')}
          animate={{ fill: getFill('core'), opacity: getOpacity('core') }}
          filter={isPrimary('core') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('core')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        
        {/* Biceps/Triceps L */}
        <motion.path 
          d="M 26 48 L 12 85 L 22 88 L 30 55 Z" 
          fill={getFill('biceps')} 
          opacity={getOpacity('biceps')}
          animate={{ fill: getFill('biceps'), opacity: getOpacity('biceps') }}
          filter={isPrimary('biceps') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('biceps')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        {/* Biceps/Triceps R */}
        <motion.path 
          d="M 74 48 L 88 85 L 78 88 L 70 55 Z" 
          fill={getFill('biceps')} 
          opacity={getOpacity('biceps')}
          animate={{ fill: getFill('biceps'), opacity: getOpacity('biceps') }}
          filter={isPrimary('biceps') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('biceps')}
          stroke="#0f172a" strokeWidth="0.8"
        />

        {/* Forearms L */}
        <motion.path 
          d="M 12 88 L 5 120 L 13 122 L 20 89 Z" 
          fill={getFill('forearms')} 
          opacity={getOpacity('forearms')}
          animate={{ fill: getFill('forearms'), opacity: getOpacity('forearms') }}
          filter={isPrimary('forearms') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('forearms')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        {/* Forearms R */}
        <motion.path 
          d="M 88 88 L 95 120 L 87 122 L 80 89 Z" 
          fill={getFill('forearms')} 
          opacity={getOpacity('forearms')}
          animate={{ fill: getFill('forearms'), opacity: getOpacity('forearms') }}
          filter={isPrimary('forearms') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('forearms')}
          stroke="#0f172a" strokeWidth="0.8"
        />

        {/* Quads L */}
        <motion.path 
          d="M 36 114 L 23 157 L 40 157 L 46 117 Z" 
          fill={getFill('quads')} 
          opacity={getOpacity('quads')}
          animate={{ fill: getFill('quads'), opacity: getOpacity('quads') }}
          filter={isPrimary('quads') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('quads')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        {/* Quads R */}
        <motion.path 
          d="M 64 114 L 77 157 L 60 157 L 54 117 Z" 
          fill={getFill('quads')} 
          opacity={getOpacity('quads')}
          animate={{ fill: getFill('quads'), opacity: getOpacity('quads') }}
          filter={isPrimary('quads') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('quads')}
          stroke="#0f172a" strokeWidth="0.8"
        />

        {/* Calves L */}
        <motion.path 
          d="M 24 160 L 20 197 L 33 197 L 38 160 Z" 
          fill={getFill('calves')} 
          opacity={getOpacity('calves')}
          animate={{ fill: getFill('calves'), opacity: getOpacity('calves') }}
          filter={isPrimary('calves') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('calves')}
          stroke="#0f172a" strokeWidth="0.8"
        />
        {/* Calves R */}
        <motion.path 
          d="M 76 160 L 80 197 L 67 197 L 62 160 Z" 
          fill={getFill('calves')} 
          opacity={getOpacity('calves')}
          animate={{ fill: getFill('calves'), opacity: getOpacity('calves') }}
          filter={isPrimary('calves') ? 'url(#muscleGlow)' : ''}
          className={getSegmentClass('calves')}
          stroke="#0f172a" strokeWidth="0.8"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-bold text-white bg-slate-900/90 px-2.5 py-1 rounded-full backdrop-blur border border-emerald-500/30 shadow-lg">
          Anatomia 3D • SSS Ativado
        </span>
      </div>

      <div className="absolute bottom-2 left-2 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-emerald-500/30">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_6px_#34d399] animate-pulse"></div> Foco Muscular
        </div>
      </div>
    </div>
  );
}
