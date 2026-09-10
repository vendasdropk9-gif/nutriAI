import React, { useState, useEffect } from 'react';
import { WifiOff, BookOpen } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { getOfflineRecipes } from '../lib/offlineRecipes';
import { OfflineRecipesModal } from './OfflineRecipesModal';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = () => {
      setOfflineCount(getOfflineRecipes().length);
    };
    updateCount();
    window.addEventListener('app:offline-recipes-updated', updateCount);
    
    const handleOpen = () => setIsModalOpen(true);
    window.addEventListener('app:open-offline-recipes', handleOpen);

    return () => {
      window.removeEventListener('app:offline-recipes-updated', updateCount);
      window.removeEventListener('app:open-offline-recipes', handleOpen);
    };
  }, []);

  return (
    <>
      <OfflineRecipesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-600/95 border border-amber-400/40 p-2.5 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Modo Offline ativo</span>
          </div>

          {offlineCount > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Abrir receitas salvas para preparo offline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ver {offlineCount} {offlineCount === 1 ? 'Receita Salva' : 'Receitas Salvas'}</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
