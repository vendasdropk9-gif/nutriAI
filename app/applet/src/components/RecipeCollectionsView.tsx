import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderPlus, Folder, Bookmark, Clock, Utensils, Trash2, Plus, Check, Heart } from 'lucide-react';
import { Recipe } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

interface RecipeCollectionsViewProps {
  favoriteRecipes: (Recipe | string)[];
  onRemoveFavorite: (id: string) => void;
}

interface Collection {
  id: string;
  name: string;
  icon: string;
  recipeIds: string[];
}

export function RecipeCollectionsView({ favoriteRecipes, onRemoveFavorite }: RecipeCollectionsViewProps) {
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('nutriai_recipe_collections');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'c1', name: 'Café da Manhã', icon: '🌅', recipeIds: [] },
      { id: 'c2', name: 'High Protein', icon: '💪', recipeIds: [] },
      { id: 'c3', name: 'Rápido & Prático', icon: '⚡', recipeIds: [] },
      { id: 'c4', name: 'Low Carb', icon: '🥑', recipeIds: [] },
    ];
  });

  const [activeCollectionId, setActiveCollectionId] = useState<string>('all');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [assigningRecipeId, setAssigningRecipeId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('nutriai_recipe_collections', JSON.stringify(collections));
    } catch {}
  }, [collections]);

  const normalizedFavorites: Recipe[] = favoriteRecipes.map(item => {
    if (typeof item === 'string') {
      return { 
        id: item, 
        name: `Receita Favorita (${item.slice(0, 6)})`, 
        prepTime: '15 min', 
        nutrition: { calories: 350, protein: 25, carbs: 30, fat: 12 }, 
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        ingredients: ['Ingrediente principal'],
        instructions: ['Preparo simples']
      } as unknown as Recipe;
    }
    return item;
  });

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    playSfx('success');
    vibrate(20);
    const newCol: Collection = {
      id: 'col_' + Date.now(),
      name: newCollectionName.trim(),
      icon: '📁',
      recipeIds: []
    };
    setCollections(prev => [...prev, newCol]);
    setNewCollectionName('');
    setIsCreating(false);
  };

  const handleToggleRecipeInCollection = (collectionId: string, recipeId: string) => {
    playSfx('tap');
    vibrate(10);
    setCollections(prev => prev.map(col => {
      if (col.id === collectionId) {
        const exists = col.recipeIds.includes(recipeId);
        return {
          ...col,
          recipeIds: exists ? col.recipeIds.filter(id => id !== recipeId) : [...col.recipeIds, recipeId]
        };
      }
      return col;
    }));
  };

  const handleDeleteCollection = (collectionId: string) => {
    playSfx('error');
    vibrate(15);
    setCollections(prev => prev.filter(c => c.id !== collectionId));
    if (activeCollectionId === collectionId) setActiveCollectionId('all');
  };

  const activeCollection = collections.find(c => c.id === activeCollectionId);
  const displayedRecipes = activeCollectionId === 'all'
    ? normalizedFavorites
    : normalizedFavorites.filter(r => activeCollection?.recipeIds.includes(r.id));

  return (
    <div className="w-full bg-[#151B23] border border-slate-800 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
            <FolderPlus className="w-3 h-3" />
            Organização Inteligente
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">Coleções de Receitas</h3>
          <p className="text-xs sm:text-sm text-slate-400">Categorize suas receitas favoritas em pastas personalizadas.</p>
        </div>
        <button
          onClick={() => { playSfx('pop'); setIsCreating(prev => !prev); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Pasta</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateCollection} className="flex gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-700 animate-in fade-in">
          <input
            type="text"
            placeholder="Nome da coleção (ex: Pré-treino, Saladas...)"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs sm:text-sm outline-none focus:border-emerald-500"
            autoFocus
          />
          <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow">
            Criar
          </button>
        </form>
      )}

      {/* Collections Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => { playSfx('tap'); setActiveCollectionId('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeCollectionId === 'all'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Todas as Favoritas ({normalizedFavorites.length})</span>
        </button>
        {collections.map(col => (
          <div key={col.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { playSfx('tap'); setActiveCollectionId(col.id); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeCollectionId === col.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <span>{col.icon}</span>
              <span>{col.name}</span>
              <span className="ml-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{col.recipeIds.length}</span>
            </button>
            <button
              onClick={() => handleDeleteCollection(col.id)}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              title="Excluir coleção"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Recipes List in Active Collection */}
      <div className="space-y-3 pt-2">
        {displayedRecipes.length === 0 ? (
          <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
            <Folder className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 text-sm font-bold">Nenhuma receita nesta coleção.</p>
            <p className="text-slate-500 text-xs mt-1">Adicione suas receitas favoritas a esta pasta para organizá-las.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center relative group">
                <img src={recipe.imageUrl || recipe.image} alt={recipe.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{recipe.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Clock className="w-3 h-3 text-emerald-400" /> {recipe.prepTime}
                    <span>•</span>
                    <Utensils className="w-3 h-3 text-amber-400" /> {recipe.nutrition?.calories || 0} kcal
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setAssigningRecipeId(assigningRecipeId === recipe.id ? null : recipe.id)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-slate-700"
                  >
                    Pastas
                  </button>
                  <button
                    onClick={() => onRemoveFavorite(recipe.id)}
                    className="text-red-400 hover:text-red-300 p-1 text-center"
                    title="Remover dos favoritos"
                  >
                    <Heart className="w-4 h-4 fill-current mx-auto" />
                  </button>
                </div>

                {/* Collection Assignment Dropdown for this recipe */}
                {assigningRecipeId === recipe.id && (
                  <div className="absolute top-full right-0 mt-2 z-20 w-56 bg-[#0f172a] border border-slate-700 rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Adicionar à pasta:</p>
                    {collections.map(col => {
                      const isAssigned = col.recipeIds.includes(recipe.id);
                      return (
                        <button
                          key={col.id}
                          onClick={() => handleToggleRecipeInCollection(col.id, recipe.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all ${
                            isAssigned ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{col.icon}</span>
                            <span>{col.name}</span>
                          </span>
                          {isAssigned && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
