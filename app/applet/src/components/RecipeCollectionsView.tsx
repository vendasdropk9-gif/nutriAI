import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderPlus, Folder, Bookmark, Clock, Utensils, Trash2, Plus, 
  Check, Heart, Edit3, Search, Sparkles, FolderCheck, X, Eye, 
  Flame, CheckCircle2, MoreVertical, ChevronRight, Tag
} from 'lucide-react';
import { Recipe } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface Collection {
  id: string;
  name: string;
  icon: string;
  description?: string;
  recipeIds: string[];
  createdAt?: string;
}

export interface RecipeCollectionsViewProps {
  favoriteRecipes?: Recipe[];
  savedRecipes?: Recipe[];
  recipes?: Recipe[];
  onRemoveFavorite?: (id: string) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
  title?: string;
  description?: string;
  className?: string;
  isCompact?: boolean;
}

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: 'c1', name: 'Weekly Meal Prep', icon: '🥗', description: 'Preparo semanal de marmitas e porções planejadas', recipeIds: [] },
  { id: 'c2', name: 'Post-Workout', icon: '💪', description: 'Refeições ricas em proteína para recuperação muscular', recipeIds: [] },
  { id: 'c3', name: 'Desserts', icon: '🍨', description: 'Sobremesas e doces saudáveis sem açúcar refinado', recipeIds: [] },
  { id: 'c4', name: 'Café da Manhã', icon: '🌅', description: 'Opções energéticas para começar o dia', recipeIds: [] },
  { id: 'c5', name: 'Rápido & Prático', icon: '⚡', description: 'Receitas express prontas em até 15 minutos', recipeIds: [] },
];

const SUGGESTED_FOLDERS = [
  { name: 'Weekly Meal Prep', icon: '🥗' },
  { name: 'Post-Workout', icon: '💪' },
  { name: 'Desserts', icon: '🍨' },
  { name: 'High Protein', icon: '🥩' },
  { name: 'Low Carb', icon: '🥑' },
  { name: 'Snacks Saudáveis', icon: '🍓' },
  { name: 'Jantar Leve', icon: '🍲' },
  { name: 'Marmitas Fit', icon: '🍱' },
];

const EMOJI_PALETTE = ['🥗', '💪', '🍨', '⚡', '🥑', '🥞', '🍲', '🍓', '🥪', '🍱', '🥣', '🍳', '🥩', '🥦', '🍕', '🧁', '🍎', '🍵'];

export function RecipeCollectionsView({
  favoriteRecipes,
  savedRecipes,
  recipes,
  onRemoveFavorite,
  onSelectRecipe,
  title,
  description,
  className = '',
  isCompact = false,
}: RecipeCollectionsViewProps) {
  const { user } = useAuth();
  
  // Normalized recipe list from any prop variant
  const allRecipes: Recipe[] = useMemo(() => {
    const rawList = recipes || savedRecipes || favoriteRecipes || [];
    return rawList.filter((r): r is Recipe => Boolean(r && (r.id || (r as any).name)));
  }, [recipes, savedRecipes, favoriteRecipes]);

  // Collections state initialized from localStorage
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('nutriai_recipe_collections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Erro ao carregar coleções locais:', err);
    }
    return DEFAULT_COLLECTIONS;
  });

  const [activeCollectionId, setActiveCollectionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionIcon, setNewCollectionIcon] = useState('🥗');
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  
  // Managing folders for a specific recipe
  const [assigningRecipe, setAssigningRecipe] = useState<Recipe | null>(null);
  
  // Inspection modal
  const [inspectingRecipe, setInspectingRecipe] = useState<Recipe | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nutriai_recipe_collections', JSON.stringify(collections));
    } catch (err) {
      console.warn('Erro ao salvar coleções locais:', err);
    }
  }, [collections]);

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user?.uid) return;
    const loadFirestoreCollections = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'recipe_collections');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.collections) && data.collections.length > 0) {
            setCollections(data.collections);
          }
        }
      } catch (err) {
        console.warn('Aviso: Firestore offline ou sem permissão para coleções:', err);
      }
    };
    loadFirestoreCollections();
  }, [user?.uid]);

  const saveToFirestore = async (updated: Collection[]) => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'recipe_collections');
      await setDoc(docRef, { collections: updated, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Aviso ao sincronizar coleções no Firestore:', err);
    }
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    playSfx('success');
    vibrate(20);

    const newCol: Collection = {
      id: crypto.randomUUID(),
      name: newCollectionName.trim(),
      icon: newCollectionIcon || '📁',
      recipeIds: [],
      createdAt: new Date().toISOString()
    };

    const updated = [...collections, newCol];
    setCollections(updated);
    saveToFirestore(updated);
    setNewCollectionName('');
    setIsCreating(false);
    setActiveCollectionId(newCol.id);
  };

  const handleApplyPreset = (presetName: string, presetIcon: string) => {
    setNewCollectionName(presetName);
    setNewCollectionIcon(presetIcon);
    playSfx('tap');
    vibrate(10);
  };

  const handleToggleRecipeInCollection = (collectionId: string, recipeId: string) => {
    playSfx('tap');
    vibrate(15);
    setCollections(prev => {
      const updated = prev.map(col => {
        if (col.id === collectionId) {
          const exists = col.recipeIds.includes(recipeId);
          return {
            ...col,
            recipeIds: exists ? col.recipeIds.filter(id => id !== recipeId) : [...col.recipeIds, recipeId]
          };
        }
        return col;
      });
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleDeleteCollection = (collectionId: string) => {
    playSfx('error');
    vibrate(25);
    setCollections(prev => {
      const updated = prev.filter(c => c.id !== collectionId);
      saveToFirestore(updated);
      return updated;
    });
    if (activeCollectionId === collectionId) setActiveCollectionId('all');
  };

  const handleStartRename = (col: Collection) => {
    playSfx('tap');
    vibrate(10);
    setEditingCollection(col);
    setEditName(col.name);
    setEditIcon(col.icon);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editName.trim()) return;
    playSfx('success');
    vibrate(15);

    setCollections(prev => {
      const updated = prev.map(c => 
        c.id === editingCollection.id ? { ...c, name: editName.trim(), icon: editIcon || c.icon } : c
      );
      saveToFirestore(updated);
      return updated;
    });
    setEditingCollection(null);
  };

  // Filter recipes based on active collection and search query
  const activeCollection = collections.find(c => c.id === activeCollectionId);
  const displayedRecipes = useMemo(() => {
    let list = activeCollectionId === 'all'
      ? allRecipes
      : allRecipes.filter(r => activeCollection?.recipeIds.includes(r.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.name || (r as any).title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.ingredients || []).some(ing => ing.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allRecipes, activeCollectionId, activeCollection, searchQuery]);

  return (
    <div className={`w-full bg-white/70 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-[32px] p-5 sm:p-7 shadow-xl space-y-6 ${className}`}>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-black uppercase tracking-wider mb-1.5">
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Pastas & Coleções</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {title || 'Coleções de Receitas'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {description || 'Crie pastas personalizadas como Weekly Meal Prep, Post-Workout e Desserts para organizar suas receitas salvas.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => { playSfx('pop'); setIsCreating(prev => !prev); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Pasta</span>
        </button>
      </div>

      {/* Create New Folder Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateCollection} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-emerald-500/30 dark:border-emerald-500/20 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Criar Nova Pasta Personalizada
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions Chips */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sugestões Rápidas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_FOLDERS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset.name, preset.icon)}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji selector */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ícone da Pasta:</p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {EMOJI_PALETTE.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setNewCollectionIcon(emoji); playSfx('tap'); }}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all shrink-0 ${
                        newCollectionIcon === emoji 
                          ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-105' 
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input & Submit */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-xl">{newCollectionIcon}</span>
                  <input
                    type="text"
                    placeholder="Nome da pasta (ex: Weekly Meal Prep, Post-Workout...)"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="flex-1 bg-transparent text-slate-900 dark:text-white text-xs sm:text-sm outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newCollectionName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    Salvar Pasta
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Collection Modal */}
      {editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Editar Pasta</h4>
              <button onClick={() => setEditingCollection(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRename} className="space-y-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5">
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="w-10 text-center text-xl bg-transparent outline-none"
                  maxLength={2}
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm font-semibold outline-none"
                  placeholder="Nome da pasta"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Navigation Tabs + Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
            <button
              type="button"
              onClick={() => { playSfx('tap'); setActiveCollectionId('all'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeCollectionId === 'all'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Todas as Receitas</span>
              <span className="text-[10px] bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded-full font-black">
                {allRecipes.length}
              </span>
            </button>

            {collections.map(col => {
              const count = col.recipeIds.length;
              const isActive = activeCollectionId === col.id;
              return (
                <div key={col.id} className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { playSfx('tap'); setActiveCollectionId(col.id); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <span>{col.icon}</span>
                    <span>{col.name}</span>
                    <span className="text-[10px] bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded-full font-black">
                      {count}
                    </span>
                  </button>

                  {/* Edit and Delete action controls for folder */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleStartRename(col)}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
                      title="Editar nome da pasta"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(col.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      title="Excluir pasta"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search bar inside current folder */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar em ${activeCollection ? activeCollection.name : 'todas as receitas'}...`}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Recipes in active collection */}
      <div className="space-y-4 pt-1">
        {displayedRecipes.length === 0 ? (
          <div className="text-center p-8 sm:p-12 bg-slate-50/60 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl">
              {activeCollection?.icon || '📁'}
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchQuery ? 'Nenhuma receita encontrada para a busca.' : 'Nenhuma receita nesta pasta ainda.'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery 
                ? 'Tente buscar por outro termo ou limpe a busca.' 
                : 'Abra qualquer receita e clique em "Pastas" para adicioná-la a esta coleção.'}
            </p>
            {activeCollectionId !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveCollectionId('all')}
                className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Ver todas as receitas salvas ({allRecipes.length})
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRecipes.map((recipe) => {
              const recipeName = recipe.name || (recipe as any).title || 'Receita';
              const recipeImage = recipe.imageUrl || recipe.image || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=400';
              const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;
              const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;

              // Which collections this recipe belongs to
              const assignedCollections = collections.filter(c => c.recipeIds.includes(recipe.id));

              return (
                <motion.div
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all space-y-3 group"
                >
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <img 
                        src={recipeImage} 
                        alt={recipeName} 
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=400';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {recipeName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {recipe.prepTime && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              {recipe.prepTime}
                            </span>
                          )}
                          {calories > 0 && (
                            <span className="flex items-center gap-1 font-mono">
                              <Flame className="w-3 h-3 text-orange-400" />
                              {calories} kcal
                            </span>
                          )}
                        </div>

                        {protein > 0 && (
                          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {protein}g de proteína
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Collections Badges */}
                    <div className="flex flex-wrap gap-1 min-h-[20px]">
                      {assignedCollections.map(col => (
                        <span 
                          key={col.id} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          <span>{col.icon}</span>
                          <span>{col.name}</span>
                        </span>
                      ))}
                      {assignedCollections.length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">Sem pasta associada</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setAssigningRecipe(recipe)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-300 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700/80 cursor-pointer"
                    >
                      <FolderCheck className="w-3.5 h-3.5" />
                      <span>Pastas</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectRecipe) {
                            onSelectRecipe(recipe);
                          } else {
                            setInspectingRecipe(recipe);
                          }
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Ver detalhes da receita"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {onRemoveFavorite && (
                        <button
                          type="button"
                          onClick={() => onRemoveFavorite(recipe.id)}
                          className="p-1.5 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remover das favoritas"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign to Folders Modal / Drawer */}
      <AnimatePresence>
        {assigningRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    Organizar em Pastas
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {assigningRecipe.name || (assigningRecipe as any).title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningRecipe(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {collections.map(col => {
                  const isAssigned = col.recipeIds.includes(assigningRecipe.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleToggleRecipeInCollection(col.id, assigningRecipe.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all border ${
                        isAssigned
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{col.icon}</span>
                        <div className="text-left">
                          <p className="font-bold leading-tight">{col.name}</p>
                          {col.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-1">{col.description}</p>
                          )}
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isAssigned 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAssigningRecipe(null)}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recipe Inspection Modal */}
      <AnimatePresence>
        {inspectingRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {inspectingRecipe.prepTime || '20 min'}
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {inspectingRecipe.name || (inspectingRecipe as any).title}
                  </h3>
                </div>
                <button 
                  onClick={() => setInspectingRecipe(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inspectingRecipe.imageUrl && (
                <img 
                  src={inspectingRecipe.imageUrl} 
                  alt={inspectingRecipe.name} 
                  className="w-full h-44 object-cover rounded-2xl shadow-sm"
                />
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {inspectingRecipe.description}
              </p>

              {/* Nutrition row */}
              <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Kcal</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{inspectingRecipe.nutrition?.calories ?? inspectingRecipe.calories ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Proteína</p>
                  <p className="text-sm font-black text-emerald-600">{inspectingRecipe.nutrition?.protein ?? inspectingRecipe.protein ?? 0}g</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Carbos</p>
                  <p className="text-sm font-black text-amber-500">{inspectingRecipe.nutrition?.carbs ?? inspectingRecipe.carbs ?? 0}g</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Gorduras</p>
                  <p className="text-sm font-black text-rose-500">{inspectingRecipe.nutrition?.fat ?? inspectingRecipe.fat ?? 0}g</p>
                </div>
              </div>

              {/* Ingredients list */}
              {inspectingRecipe.ingredients && inspectingRecipe.ingredients.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Ingredientes</h5>
                  <ul className="space-y-1">
                    {inspectingRecipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {inspectingRecipe.instructions && inspectingRecipe.instructions.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Modo de Preparo</h5>
                  <ol className="space-y-2">
                    {inspectingRecipe.instructions.map((step, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setInspectingRecipe(null)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
