import React, { useState, useMemo } from 'react';
import { 
  CURATED_AVATARS, 
  getAvatarById, 
  AvatarCatalogItem
} from '../data/avatarCatalog';
import { Avatar3D } from './Avatar3D';
import { UserProfile } from '../types';
import { 
  Check, 
  Sparkles, 
  Zap, 
  Cpu, 
  Sliders, 
  Layers, 
  Eye, 
  Activity, 
  Play, 
  RotateCw,
  ShieldCheck,
  UserCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AvatarGalleryProps {
  userProfile?: UserProfile;
  onSelectAvatar: (avatarId: string, customConfig?: Partial<AvatarCatalogItem['modelConfig']>) => void | Promise<void>;
  onClose?: () => void;
  isModal?: boolean;
}

export const AvatarGallery: React.FC<AvatarGalleryProps> = ({
  userProfile,
  onSelectAvatar,
  onClose,
  isModal = false
}) => {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    userProfile?.avatarId || 'athena-fit-pro'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewAnimation, setPreviewAnimation] = useState<'idle' | 'executing' | 'tutorial' | 'perfect'>('idle');
  const [previewView, setPreviewView] = useState<'front' | 'side' | 'detail'>('front');
  const [activeExerciseMuscles, setActiveExerciseMuscles] = useState<string[]>(['peitoral', 'ombros']);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Customization overrides
  const [customSkinTone, setCustomSkinTone] = useState<string | null>(null);
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(null);
  const [lowMemoryMode, setLowMemoryMode] = useState<boolean>(
    userProfile?.avatarLowMemoryMode || false
  );

  const activeAvatar = useMemo(() => {
    return getAvatarById(selectedAvatarId);
  }, [selectedAvatarId]);

  const filteredAvatars = useMemo(() => {
    if (selectedCategory === 'all') return CURATED_AVATARS;
    return CURATED_AVATARS.filter(a => a.category === selectedCategory);
  }, [selectedCategory]);

  const categories: { id: string; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos Modelos', icon: '🌟' },
    { id: 'athletic', label: 'Atlético & Definição', icon: '⚡' },
    { id: 'hypertrophy', label: 'Hipertrofia & Força', icon: '💪' },
    { id: 'cyber', label: 'Cyber Bio & Neon', icon: '🦾' },
    { id: 'endurance', label: 'Endurance & Cardio', icon: '🏃' },
    { id: 'yoga', label: 'Flex & Calistenia', icon: '🧘' }
  ];

  const handleApplyAvatar = async () => {
    setIsSaving(true);
    try {
      const customConfig: Partial<AvatarCatalogItem['modelConfig']> = {};
      if (customSkinTone) customConfig.skinColor = customSkinTone;
      if (customAccentColor) customConfig.accentColor = customAccentColor;

      await onSelectAvatar(selectedAvatarId, customConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onClose) {
        setTimeout(onClose, 800);
      }
    } catch (e) {
      console.error('Failed to save avatar:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const skinTones = [
    { label: 'Claro', value: '#ffd1aa' },
    { label: 'Dourado', value: '#e0ac69' },
    { label: 'Moreno', value: '#c68642' },
    { label: 'Bronzeado', value: '#8d5524' },
    { label: 'Escuro', value: '#3b2219' },
    { label: 'Cyber Titan', value: '#1e293b' }
  ];

  const accentColors = [
    { label: 'Verde Esmeralda', value: '#10b981' },
    { label: 'Ciano Neon', value: '#06b6d4' },
    { label: 'Âmbar Solar', value: '#f59e0b' },
    { label: 'Rosa Magenta', value: '#ec4899' },
    { label: 'Violeta Elétrico', value: '#8b5cf6' },
    { label: 'Azul Índigo', value: '#3b82f6' }
  ];

  const previewConfig = useMemo(() => {
    return {
      skinColor: customSkinTone || activeAvatar.modelConfig.skinColor,
      accentColor: customAccentColor || activeAvatar.modelConfig.accentColor,
    };
  }, [customSkinTone, customAccentColor, activeAvatar]);

  return (
    <div id="avatar-gallery-root" className="w-full max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modelos 3D Realistas & DRACO Loader</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Galeria de Avatares Biomecânicos
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Selecione o avatar que guiará seus treinos no Simulador 3D, Guia Postural e Análise com Câmera.
              Totalmente otimizado com compressão geométrica DRACO para carregamento ultrarrápido em qualquer dispositivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="avatar-save-btn"
              onClick={handleApplyAvatar}
              disabled={isSaving}
              className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all duration-200 ${
                saveSuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Salvando no Perfil...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Avatar Ativado!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Definir como Avatar Ativo</span>
                </>
              )}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`avatar-filter-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 border ${
              selectedCategory === cat.id
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Left Catalog Cards, Right 3D Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar Cards List (7 Cols on large screen) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {filteredAvatars.length} Modelos Disponíveis
            </span>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Compressão DRACO v1.5.7 Ativa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAvatars.map((avatar) => {
              const isSelected = avatar.id === selectedAvatarId;
              const isCurrentProfileAvatar = userProfile?.avatarId === avatar.id;

              return (
                <motion.div
                  key={avatar.id}
                  id={`avatar-card-${avatar.id}`}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedAvatarId(avatar.id);
                    setCustomSkinTone(null);
                    setCustomAccentColor(null);
                  }}
                  className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-950/40'
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-inner"
                        style={{
                          backgroundColor: `${avatar.modelConfig.accentColor}20`,
                          color: avatar.modelConfig.accentColor,
                          border: `1px solid ${avatar.modelConfig.accentColor}40`
                        }}
                      >
                        {avatar.gender === 'female' ? '♀' : avatar.gender === 'male' ? '♂' : '◈'}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-white text-sm leading-tight">
                          {avatar.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {avatar.bodyType}
                        </span>
                      </div>
                    </div>

                    {isCurrentProfileAvatar && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                    {avatar.description}
                  </p>

                  {/* Highlights & DRACO Metric */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap gap-1">
                      {avatar.highlights.slice(0, 2).map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium"
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Cpu className="w-3 h-3" />
                        {avatar.dracoSpecs.compressedMemory}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        -{avatar.dracoSpecs.memoryReductionPercent} memória
                      </span>
                    </div>
                  </div>

                  {/* Selection Glow Indicator */}
                  {isSelected && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1"
                      style={{ backgroundColor: avatar.modelConfig.accentColor }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Performance & DRACO Info Box */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Otimização de Hardware & Memória GPU</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Os modelos 3D utilizam quantização de coordenadas inteiras de 14 bits e decodificação multi-thread via Web Workers.
              Isso garante taxa estável de 60 FPS no Simulador 3D mesmo em celulares com 2GB-4GB de memória RAM.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="low-memory-toggle"
                  checked={lowMemoryMode}
                  onChange={(e) => setLowMemoryMode(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-300 font-medium">Modo Super Econômico de VRAM (LOD reduzido)</span>
              </label>

              <span className="text-slate-500 font-mono text-[10px]">LOD: {lowMemoryMode ? 'Eco' : 'Ultra HD'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive 3D Stage & Customizer (5 Cols on large screen) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl relative flex flex-col">
            {/* View Controls & Action Toolbar */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-1">
                {(['front', 'side', 'detail'] as const).map((view) => (
                  <button
                    key={view}
                    id={`preview-view-${view}`}
                    onClick={() => setPreviewView(view)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      previewView === view
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {view === 'front' ? 'Frente' : view === 'side' ? 'Perfil' : 'Detalhe'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {(['idle', 'executing', 'tutorial'] as const).map((anim) => (
                  <button
                    key={anim}
                    id={`preview-anim-${anim}`}
                    onClick={() => setPreviewAnimation(anim)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors flex items-center gap-1 ${
                      previewAnimation === anim
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{anim === 'idle' ? 'Postura' : anim === 'executing' ? 'Agachamento' : 'Tutorial'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Canvas Preview Window */}
            <div className="w-full relative h-[380px] sm:h-[440px]">
              <Avatar3D
                avatarId={selectedAvatarId}
                avatarConfig={previewConfig}
                activeMuscles={activeExerciseMuscles}
                animation={previewAnimation}
                view={previewView}
                qualityLevel={lowMemoryMode ? 'low' : 'high'}
                showDracoBadge={true}
              />
            </div>

            {/* Avatar Details & Real-Time Customizer */}
            <div className="p-5 bg-slate-950/90 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">
                    {activeAvatar.name}
                  </h3>
                  <p className="text-xs text-emerald-400 font-medium">
                    {activeAvatar.category.toUpperCase()} • {activeAvatar.bodyType}
                  </p>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-slate-400 text-[10px] block">Decodificação DRACO</span>
                  <span className="text-emerald-400 font-bold">~15ms</span>
                </div>
              </div>

              {/* Skin Tone Palette */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Tom de Pele & Textura</span>
                <div className="flex items-center gap-2">
                  {skinTones.map((t) => (
                    <button
                      key={t.value}
                      id={`skin-tone-${t.value}`}
                      onClick={() => setCustomSkinTone(t.value)}
                      title={t.label}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        (customSkinTone || activeAvatar.modelConfig.skinColor) === t.value
                          ? 'scale-125 border-emerald-400 shadow-md ring-2 ring-emerald-500/40'
                          : 'border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: t.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Cyber Glow Accent Palette */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Luzes Neon & HUD</span>
                <div className="flex items-center gap-2">
                  {accentColors.map((c) => (
                    <button
                      key={c.value}
                      id={`accent-color-${c.value}`}
                      onClick={() => setCustomAccentColor(c.value)}
                      title={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        (customAccentColor || activeAvatar.modelConfig.accentColor) === c.value
                          ? 'scale-125 border-white shadow-md ring-2 ring-cyan-500/40'
                          : 'border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Muscle Simulation Toggles */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Teste de Ativação Muscular 3D</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'peitoral', label: 'Peitoral' },
                    { id: 'quadríceps', label: 'Quadríceps' },
                    { id: 'deltoides', label: 'Deltóides' },
                    { id: 'glúteos', label: 'Glúteos' },
                    { id: 'abdômen', label: 'Abdômen' },
                    { id: 'bíceps', label: 'Bíceps' }
                  ].map((m) => {
                    const isActive = activeExerciseMuscles.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        id={`muscle-toggle-${m.id}`}
                        onClick={() => {
                          if (isActive) {
                            setActiveExerciseMuscles(prev => prev.filter(x => x !== m.id));
                          } else {
                            setActiveExerciseMuscles(prev => [...prev, m.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Final Confirm Button */}
              <button
                id="avatar-apply-bottom-btn"
                onClick={handleApplyAvatar}
                disabled={isSaving}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:opacity-95 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
              >
                {isSaving ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Atualizando Perfil...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Avatar Ativado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Aplicar Este Avatar ao Meu Perfil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
