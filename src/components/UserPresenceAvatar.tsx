import React, { useState } from 'react';
import { useUserPresence } from '../hooks/usePresence';
import { User, Activity, Globe } from 'lucide-react';
import { UserPresence, PresenceStatus } from '../types';

interface UserPresenceAvatarProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  photoURL?: string;
  presenceOverride?: UserPresence | null;
  statusOverride?: PresenceStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatusBadge?: boolean;
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
}

export function UserPresenceAvatar({
  userId,
  userName,
  userEmail,
  photoURL,
  presenceOverride,
  statusOverride,
  size = 'md',
  showStatusBadge = false,
  showTooltip = true,
  className = '',
  onClick
}: UserPresenceAvatarProps) {
  const { presence, isActive, statusInfo } = useUserPresence(userId || userEmail || userName);
  const [imageError, setImageError] = useState(false);

  // Active/inactive state calculation
  const effectiveIsActive = statusOverride !== undefined 
    ? statusOverride === 'active' 
    : (presenceOverride ? presenceOverride.status === 'active' : isActive);

  const displayPhoto = photoURL || presenceOverride?.photoURL || presence?.photoURL;
  const displayName = userName || presenceOverride?.userName || presence?.userName || 'Comprador';
  const displayAction = presenceOverride?.currentAction || presence?.currentAction || (effectiveIsActive ? 'Navegando no aplicativo' : 'Inativo');

  // Size dimensions
  const sizeMap = {
    xs: { container: 'w-7 h-7', text: 'text-[10px]', dot: 'w-2 h-2', dotOffset: '-bottom-0.5 -right-0.5', icon: 'w-3.5 h-3.5' },
    sm: { container: 'w-9 h-9', text: 'text-xs', dot: 'w-2.5 h-2.5', dotOffset: 'bottom-0 right-0', icon: 'w-4 h-4' },
    md: { container: 'w-12 h-12', text: 'text-sm', dot: 'w-3.5 h-3.5', dotOffset: 'bottom-0 right-0', icon: 'w-6 h-6' },
    lg: { container: 'w-16 h-16', text: 'text-base', dot: 'w-4 h-4', dotOffset: 'bottom-0.5 right-0.5', icon: 'w-8 h-8' },
    xl: { container: 'w-20 h-20', text: 'text-xl', dot: 'w-5 h-5', dotOffset: 'bottom-1 right-1', icon: 'w-10 h-10' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Fallback initial
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';

  const tooltipText = effectiveIsActive 
    ? `🟢 ${displayName} está ativo(a) e navegando agora (${displayAction})` 
    : `🔴 ${displayName} está inativo(a) (${statusInfo.sublabel})`;

  return (
    <div 
      className={`inline-flex items-center gap-2.5 ${className}`}
      onClick={onClick}
      title={showTooltip ? tooltipText : undefined}
    >
      <div className={`relative ${currentSize.container} shrink-0 select-none`}>
        {/* Buyer Photo / Avatar Frame */}
        <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center">
          {displayPhoto && !imageError ? (
            <img 
              src={displayPhoto} 
              alt={displayName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 ${currentSize.text}`}>
              {initial}
            </div>
          )}
        </div>

        {/* Real-Time Colored Presence Dot */}
        <div className={`absolute ${currentSize.dotOffset} flex items-center justify-center`}>
          {effectiveIsActive ? (
            <>
              {/* Soft Pulsing Animation Ring */}
              <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping`} />
              {/* Green Dot: Active & Browsing */}
              <span 
                className={`relative inline-block ${currentSize.dot} rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm`}
                aria-label="Usuário ativo e navegando"
              />
            </>
          ) : (
            /* Red Dot: Inactive */
            <span 
              className={`relative inline-block ${currentSize.dot} rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 shadow-sm`}
              aria-label="Usuário inativo"
            />
          )}
        </div>
      </div>

      {/* Optional Status Badge Pill */}
      {showStatusBadge && (
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {displayName}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${effectiveIsActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className={`text-[11px] font-semibold ${effectiveIsActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {effectiveIsActive ? 'Ativo e Navegando' : statusInfo.sublabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
