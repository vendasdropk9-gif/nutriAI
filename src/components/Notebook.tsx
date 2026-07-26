import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Search, Trash2, Edit2, Calendar, Tag, AlertCircle, Save, X, Check,
  Sparkles, ListFilter, Clipboard, Info, Share2, Eye, Filter, Heart, Dumbbell, Apple, Brain, Pill, HelpCircle
} from 'lucide-react';
import { Note, UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from '../lib/firebase';

interface NotebookProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: <BookOpen className="w-4 h-4" />, color: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'diet', label: 'Dieta & Receitas', icon: <Apple className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400' },
  { id: 'workout', label: 'Treino & Cardio', icon: <Dumbbell className="w-4 h-4" />, color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400' },
  { id: 'health', label: 'Saúde & Pressão', icon: <Heart className="w-4 h-4" />, color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400' },
  { id: 'mind', label: 'Mental & Sono', icon: <Brain className="w-4 h-4" />, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400' },
  { id: 'supps', label: 'Suplementos', icon: <Pill className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400' },
  { id: 'others', label: 'Outros', icon: <HelpCircle className="w-4 h-4" />, color: 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/40 dark:text-slate-400' },
];

export function Notebook({ profile, onUpdateProfile, onAwardPoints }: NotebookProps) {
  const notes = useMemo(() => profile?.notes || [], [profile?.notes]);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Note Form state
  const [isEditing, setIsEditing] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('diet');
  const [tagsInput, setTagsInput] = useState('');
  
  // View mode
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = 
        note.title.toLowerCase().includes(search.toLowerCase()) || 
        note.content.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search, selectedCategory]);

  const handleOpenNewNote = () => {
    playSfx('tap');
    setIsEditing(true);
    setActiveNoteId(null);
    setTitle('');
    setContent('');
    setCategory('diet');
    setTagsInput('');
  };

  const handleOpenEditNote = (note: Note) => {
    playSfx('tap');
    setIsEditing(true);
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'diet');
    setTagsInput(note.tags ? note.tags.join(', ') : '');
    setViewingNote(null);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta anotação?')) return;
    
    playSfx('tap');
    vibrate(30);

    // Filter out item locally
    const updatedNotes = notes.filter(n => n.id !== id);
    onUpdateProfile({ notes: updatedNotes });

    // Firebase Delete
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'notes', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Erro ao deletar nota no Firestore, depletado localmente.', err);
      }
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    playSfx('success');
    vibrate(40);

    const isNew = !activeNoteId;
    const noteId = activeNoteId || `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const nowIso = new Date().toISOString();
    const currentUserId = auth.currentUser?.uid || 'anonymous';

    const newNote: Note = {
      id: noteId,
      userId: currentUserId,
      title: title.trim(),
      content: content.trim(),
      category,
      tags: parsedTags,
      createdAt: isNew ? nowIso : (notes.find(n => n.id === activeNoteId)?.createdAt || nowIso),
      updatedAt: nowIso
    };

    // Save locally
    let updatedNotes = [...notes];
    if (isNew) {
      updatedNotes = [newNote, ...updatedNotes];
      if (onAwardPoints) {
        onAwardPoints(10, 'Anotação pessoal adicionada');
      }
    } else {
      updatedNotes = updatedNotes.map(n => n.id === activeNoteId ? newNote : n);
    }

    onUpdateProfile({ notes: updatedNotes });
    setIsEditing(false);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'notes', noteId);
        await setDoc(docRef, {
          userId: currentUserId,
          title: newNote.title,
          content: newNote.content,
          category: newNote.category,
          tags: newNote.tags,
          createdAt: newNote.createdAt,
          updatedAt: nowIso
        });
      } catch (err) {
        console.warn('Erro ao salvar no Firestore. Salvo em cache local.', err);
      }
    }
  };

  const getCategoryTheme = (catId?: string) => {
    switch (catId) {
      case 'diet': return { label: 'Dieta & Receitas', color: 'text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20' };
      case 'workout': return { label: 'Treino & Cardio', color: 'text-indigo-500 bg-indigo-500/10 dark:text-indigo-400 border-indigo-500/20' };
      case 'health': return { label: 'Saúde & Pressão', color: 'text-rose-500 bg-rose-500/10 dark:text-rose-400 border-rose-500/20' };
      case 'mind': return { label: 'Mental & Sono', color: 'text-purple-500 bg-purple-500/10 dark:text-purple-400 border-purple-500/20' };
      case 'supps': return { label: 'Suplementos', color: 'text-amber-500 bg-amber-500/10 dark:text-amber-400 border-amber-500/20' };
      default: return { label: 'Outros', color: 'text-slate-500 bg-slate-500/10 dark:text-slate-400 border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Block with glass background */}
      <div className="relative clay-card p-6 md:p-8 rounded-3xl overflow-hidden shadow-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
              <BookOpen className="w-6 h-6 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400">
                Bloco de Notas
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 dark:text-white leading-tight">
              Anotações Pessoais
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Organize seus treinos, crie listas de compras, registre insights sobre suas refeições e adicione hábitos livres do seu dia.
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenNewNote}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-sm text-white shadow-md shadow-amber-500/10 transition-all cursor-pointer hover:opacity-95 shrink-0"
            id="new-note-trigger-btn"
          >
            <Plus className="w-4 h-4" /> Nova Anotação
          </motion.button>
        </div>

        {/* Counter Widget */}
        <div className="mt-6 flex flex-wrap gap-4 items-center border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clipboard className="w-4 h-4 text-slate-400" />
            <span>Total: <strong>{notes.length}</strong> anotações</span>
          </div>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>Suas notas sincronizam instantaneamente na nuvem com segurança.</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar notas pelo título ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-slate-200/60 bg-white/70 dark:border-slate-800/85 dark:bg-slate-900/50 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSfx('tap');
                setSelectedCategory(cat.id);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm dark:text-slate-950'
                  : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Notes Grid Display */}
      {filteredNotes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl"
        >
          <div className="relative w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <BookOpen className="w-8 h-8" />
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full">
              <Plus className="w-3 h-3" />
            </div>
          </div>
          <h3 className="text-lg font-serif font-bold text-slate-700 dark:text-slate-300">
            Nenhuma anotação encontrada
          </h3>
          <p className="text-sm text-slate-500 max-w-xs mt-1">
            {search || selectedCategory !== 'all' 
              ? 'Tente alterar os seus filtros de pesquisa para visualizar outras anotações.'
              : 'Clique em "Nova Anotação" acima para começar a preencher o seu caderno pautado.'}
          </p>
          {!search && selectedCategory === 'all' && (
            <button
              onClick={handleOpenNewNote}
              className="mt-4 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
            >
              Criar primeira nota
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note) => {
              const theme = getCategoryTheme(note.category);
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    playSfx('tap');
                    setViewingNote(note);
                  }}
                  className="group relative cursor-pointer clay-card bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 p-6 rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all text-left"
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${theme.color}`}>
                        {theme.label}
                      </span>
                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditNote(note);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar nota"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Excluir nota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-slate-800 dark:text-neutral-100 leading-snug group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                      {note.title}
                    </h4>

                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-4 leading-relaxed whitespace-pre-wrap font-sans">
                      {note.content}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/40 flex flex-wrap gap-2 items-center justify-between text-[11px] text-slate-400 font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(note.updatedAt).toLocaleDateString('pt-BR')}</span>
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
                        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{note.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Note Creation / Editing Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-800/80 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-white">
                    {activeNoteId ? 'Editar Anotação' : 'Criar Nova Anotação'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-5 mt-5 text-left">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Título da Anotação
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Minhas Metas Fitness de Julho"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm font-medium"
                  />
                </div>

                {/* Grid for Category & Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Categoria / Tema
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm font-medium"
                    >
                      <option value="diet" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🍎 Dieta & Receitas</option>
                      <option value="workout" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🏋️ Treino & Cardio</option>
                      <option value="health" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">❤️ Saúde & Pressão</option>
                      <option value="mind" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🧠 Mental & Sono</option>
                      <option value="supps" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">💊 Suplementos</option>
                      <option value="others" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📝 Outros</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Etiquetas / Tags <span className="text-[10px] text-slate-450 uppercase">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Ex: foco, hipertrofia, jejum"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    O que deseja registrar hoje?
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva aqui suas ideias, treinos concluídos, objetivos de macros, lista de mercado livre, lista de treinos, diário alimentar..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Salvar Nota
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Detail Viewing Modal */}
      <AnimatePresence>
        {viewingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-800/80 max-h-[90vh] overflow-y-auto"
            >
              {/* Header with Category band */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryTheme(viewingNote.category).color}`}>
                      {getCategoryTheme(viewingNote.category).label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{new Date(viewingNote.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-white leading-snug">
                    {viewingNote.title}
                  </h3>
                </div>
                
                <button
                  onClick={() => setViewingNote(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="py-6 min-h-[160px] text-left">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {viewingNote.content}
                </p>
              </div>

              {/* Tags Section if exist */}
              {viewingNote.tags && viewingNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pb-5 mb-5 border-b border-slate-50 dark:border-slate-800/30 text-left">
                  <Tag className="w-3.5 h-3.5 text-slate-450 mr-1 shrink-0" />
                  {viewingNote.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700/30 font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditNote(viewingNote)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" /> Editar Nota
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
