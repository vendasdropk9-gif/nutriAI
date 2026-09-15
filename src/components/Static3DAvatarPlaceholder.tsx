import React from 'react';
import { motion } from 'motion/react';
import { Activity, Sparkles, Zap, Layers, Cpu } from 'lucide-react';
import realisticAvatarImg from '../assets/images/realistic_fitness_avatar_1789485014929.jpg';

interface Static3DAvatarPlaceholderProps {
  title?: string;
  subtitle?: string;
  heightClass?: string;
  badgeText?: string;
  showMetrics?: boolean;
}

export function Static3DAvatarPlaceholder({
  title = 'Inicializando Modelo 3D & Biomecânica',
  subtitle = 'Carregando malhas anatômicas e acelerador WebGL...',
  heightClass = 'h-[400px] sm:h-[480px]',
  badgeText = '3D GPU Engine',
  showMetrics = true,
}: Static3DAvatarPlaceholderProps) {
  return (
    <div
      className={`w-full ${heightClass} relative flex flex-col items-center justify-center overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-[#09101d] via-[#040810] to-[#020408] border border-emerald-500/20 select-none p-4`}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/25 via-emerald-950/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Floating Status Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/40 text-xs font-bold text-emerald-400 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
        <span>{badgeText}</span>
      </div>

      {showMetrics && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-400/40 text-xs font-bold text-blue-400 shadow-lg">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Renderização Otimizada</span>
        </div>
      )}

      {/* Center Static Avatar with Scanning Laser Effect */}
      <div className="relative w-full max-h-[70%] flex items-center justify-center my-auto">
        {/* Subtle pulsing silhouette image */}
        <div className="relative max-h-[260px] sm:max-h-[320px] flex items-center justify-center">
          <img
            src={realisticAvatarImg}
            alt="3D Avatar Placeholder"
            className="max-h-[260px] sm:max-h-[320px] w-auto object-contain opacity-60 filter grayscale contrast-125 drop-shadow-[0_0_25px_rgba(16,185,129,0.3)] rounded-2xl"
            referrerPolicy="no-referrer"
          />

          {/* Biometric Scanning Line */}
          <motion.div
            className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981]"
            animate={{
              top: ['0%', '100%', '0%'],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Circular Holographic Ring */}
          <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-emerald-500/25 border-dashed animate-spin pointer-events-none [animation-duration:12s]" />
        </div>
      </div>

      {/* Bottom Loading Progress & Message */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400 animate-pulse" />
          <p className="text-white text-xs sm:text-sm font-bold tracking-wide text-center">
            {title}
          </p>
        </div>

        <p className="text-slate-400 text-[11px] sm:text-xs text-center max-w-xs">
          {subtitle}
        </p>

        {/* Shimmering Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-emerald-500/30 mt-1">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full"
            initial={{ width: '15%' }}
            animate={{ width: ['20%', '85%', '95%'] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>
    </div>
  );
}
