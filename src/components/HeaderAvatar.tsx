import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Camera, Upload, Sparkles, Check, X } from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

interface HeaderAvatarProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
  onOpenProfileTab: () => void;
}

const PRESET_AVATARS = [
  { id: 'chef', label: 'Chef Saudável', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'fitness-woman', label: 'Atleta Fitness', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'fitness-man', label: 'Treino & Força', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'wellness', label: 'Zen & Bem-Estar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'runner', label: 'Corrida & Energia', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'nature', label: 'Vitalidade Natural', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300' },
];

export function HeaderAvatar({ profile, onSaveProfile, onOpenProfileTab }: HeaderAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentPhoto = profile?.photoURL;
  const userName = profile?.name || 'Meu Perfil';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    playSfx('tap');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          const updatedProfile: UserProfile = {
            ...(profile || {}),
            name: profile?.name || 'Usuário NutriAI',
            photoURL: compressedDataUrl,
            restrictions: profile?.restrictions || [],
            allergies: profile?.allergies || [],
            goals: profile?.goals || '',
            equipment: profile?.equipment || [],
          };

          onSaveProfile(updatedProfile);
          playSfx('crystal');
          vibrate([30, 40]);
          setIsUploading(false);
          setIsOpen(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same image can be reselected
    event.target.value = '';
  };

  const handleSelectPreset = (url: string) => {
    playSfx('crystal');
    vibrate(20);
    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: profile?.name || 'Usuário NutriAI',
      photoURL: url,
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
    };
    onSaveProfile(updatedProfile);
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0">
      {/* Hidden File Input for Native Gallery / Camera Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header Profile Photo Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          playSfx('tap');
          vibrate(10);
          setIsOpen(!isOpen);
        }}
        className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full p-[1.5px] overflow-hidden focus:outline-none cursor-pointer flex items-center justify-center ring-2 ring-emerald-500/40 hover:ring-emerald-500 shadow-sm transition-all"
        title={`${userName} - Alterar foto ou ver perfil`}
        id="header-user-avatar-btn"
      >
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={userName}
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs sm:text-sm">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
        )}

        {/* Small Camera Badge */}
        <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-600 text-white rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-xs">
          <Camera className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
        </div>
      </motion.button>

      {/* Popover / Modal Menu for Changing Photo or Selecting from Gallery (Rendered via Portal to avoid any clipping) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div 
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
                role="dialog"
                aria-modal="true"
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-[340px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col gap-4 text-left"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          Foto do Perfil
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Atualize sua foto no NutriAI
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Processando foto...' : 'Escolher da Galeria do Celular'}</span>
                  </button>

                  {/* Preset Avatars */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      Ou escolha um avatar:
                    </span>
                    <div className="grid grid-cols-6 gap-2">
                      {PRESET_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => handleSelectPreset(av.url)}
                          className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            currentPhoto === av.url
                              ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                          title={av.label}
                        >
                          <img
                            src={av.url}
                            alt={av.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {currentPhoto === av.url && (
                            <div className="absolute inset-0 bg-emerald-600/40 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Link to full profile tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenProfileTab();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Acessar Perfil Completo</span>
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
