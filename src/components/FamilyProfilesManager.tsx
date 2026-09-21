import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Check, Heart, Shield, Sparkles, UserCheck, 
  Trash2, Share2, Copy, CheckCircle2, Dog, Baby, User, Scale, Flame 
} from 'lucide-react';
import { UserProfile } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { playSfx, vibrate } from '../lib/sensory';

export interface FamilyMemberProfile {
  id: string;
  name: string;
  relationship: 'main' | 'partner' | 'child' | 'elder' | 'pet';
  age: number;
  weight: number; // kg
  goal: string;
  dailyCalories: number;
  allergies: string[];
  dietaryRestrictions: string[];
  avatarUrl?: string;
  isPet?: boolean;
}

const DEFAULT_FAMILY: FamilyMemberProfile[] = [
  {
    id: 'main_user',
    name: 'Você (Principal)',
    relationship: 'main',
    age: 32,
    weight: 72,
    goal: 'Ganho de Massa & Saúde Global',
    dailyCalories: 2200,
    allergies: ['Lactose'],
    dietaryRestrictions: ['Sem Glúten'],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'partner_profile',
    name: 'Cônjuge (Ana)',
    relationship: 'partner',
    age: 30,
    weight: 60,
    goal: 'Perda de Gordura & Definição',
    dailyCalories: 1800,
    allergies: [],
    dietaryRestrictions: ['Low Carb'],
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'child_profile',
    name: 'Lucas (Filho)',
    relationship: 'child',
    age: 8,
    weight: 28,
    goal: 'Crescimento Saudável & Nutrição Infantil',
    dailyCalories: 1600,
    allergies: ['Amendoim'],
    dietaryRestrictions: ['Pouco Açúcar'],
    avatarUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'pet_profile',
    name: 'Thor (Golden Retriever)',
    relationship: 'pet',
    age: 3,
    weight: 31,
    goal: 'Dieta Natural Canina & Pelagem Brilhante',
    dailyCalories: 950,
    allergies: ['Frango Processado'],
    dietaryRestrictions: ['Alimentação Natural BARF'],
    isPet: true,
    avatarUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200&h=200'
  }
];

interface FamilyProfilesManagerProps {
  currentProfile: UserProfile | null;
  onSelectProfile?: (profile: FamilyMemberProfile) => void;
}

export function FamilyProfilesManager({ currentProfile, onSelectProfile }: FamilyProfilesManagerProps) {
  const [members, setMembers] = useLocalStorage<FamilyMemberProfile[]>('nutri-family-members', DEFAULT_FAMILY);
  const [activeId, setActiveId] = useLocalStorage<string>('nutri-active-family-id', 'main_user');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form for new member
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState<'partner' | 'child' | 'elder' | 'pet'>('child');
  const [newAge, setNewAge] = useState(10);
  const [newWeight, setNewWeight] = useState(35);
  const [newGoal, setNewGoal] = useState('Alimentação Equilibrada');
  const [newCalories, setNewCalories] = useState(1800);
  const [newAllergies, setNewAllergies] = useState('');

  const activeMember = members.find(m => m.id === activeId) || members[0];

  const handleSwitchMember = (member: FamilyMemberProfile) => {
    playSfx('tap');
    vibrate(12);
    setActiveId(member.id);
    if (onSelectProfile) {
      onSelectProfile(member);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    playSfx('success');
    vibrate(20);

    const isPet = newRelationship === 'pet';
    const newMember: FamilyMemberProfile = {
      id: `family_${Date.now()}`,
      name: newName.trim(),
      relationship: newRelationship,
      age: Number(newAge),
      weight: Number(newWeight),
      goal: newGoal,
      dailyCalories: Number(newCalories),
      allergies: newAllergies.split(',').map(a => a.trim()).filter(Boolean),
      dietaryRestrictions: [],
      isPet,
      avatarUrl: isPet 
        ? 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=200&h=200'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200'
    };

    setMembers([...members, newMember]);
    setShowAddModal(false);
    setNewName('');
  };

  const handleDeleteMember = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'main_user') return; // protect primary profile
    playSfx('tap');
    vibrate(15);
    setMembers(members.filter(m => m.id !== id));
    if (activeId === id) {
      setActiveId('main_user');
    }
  };

  const handleShareFamilyGoals = () => {
    playSfx('tap');
    vibrate(15);
    const summaryText = members.map(m => `• ${m.name}: ${m.dailyCalories} kcal/dia (${m.goal})`).join('\n');
    const shareMessage = `👨‍👩‍👧‍👦 Metas Nutricionais da Família no NutriAI:\n\n${summaryText}\n\nAcompanhado em tempo real pelo NutriAI!`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareMessage);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Gestão de Perfil Familiar & Pets</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                {members.length} Perfis Ativos
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gerencie dietas, restrições e calorias diárias de toda a família em uma única conta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareFamilyGoals}
            className="px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-indigo-500" />}
            <span>{copiedLink ? 'Copiado!' : 'Compartilhar Metas'}</span>
          </button>

          <button
            onClick={() => { setShowAddModal(true); playSfx('tap'); }}
            className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Familiar</span>
          </button>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {members.map(member => {
          const isActive = member.id === activeId;
          return (
            <div
              key={member.id}
              onClick={() => handleSwitchMember(member)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                isActive
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="relative">
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                  />
                  {member.isPet ? (
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-white text-[10px]">
                      <Dog className="w-3 h-3" />
                    </span>
                  ) : member.relationship === 'child' ? (
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-sky-500 text-white text-[10px]">
                      <Baby className="w-3 h-3" />
                    </span>
                  ) : null}
                </div>

                {isActive && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Ativo
                  </span>
                )}

                {member.id !== 'main_user' && (
                  <button
                    onClick={(e) => handleDeleteMember(member.id, e)}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                    title="Remover perfil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
                  {member.name}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {member.age} anos • {member.weight} kg
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{member.dailyCalories} kcal/dia</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 truncate text-[10px]">
                  {member.goal}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Member Selected Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src={activeMember.avatarUrl}
            alt={activeMember.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400"
          />
          <div>
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
              Perfil Selecionado Atualmente
            </span>
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{activeMember.name}</span>
              <span className="text-xs font-normal text-indigo-200">({activeMember.goal})</span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-indigo-100">
          <div className="text-center">
            <span className="block text-[10px] text-indigo-300">Alergias</span>
            <span>{activeMember.allergies.length > 0 ? activeMember.allergies.join(', ') : 'Nenhuma'}</span>
          </div>
          <div className="h-8 w-px bg-indigo-700/60" />
          <div className="text-center">
            <span className="block text-[10px] text-indigo-300">Calorias Recomendadas</span>
            <span className="text-emerald-400 font-bold">{activeMember.dailyCalories} kcal</span>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Familiar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Cadastrar Novo Familiar ou Pet
            </h3>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Nome do Integrante
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria (Cônjuge) ou Rex (Dog)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Vínculo
                  </label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="partner">Cônjuge</option>
                    <option value="child">Filho(a) / Criança</option>
                    <option value="elder">Idoso(a)</option>
                    <option value="pet">Pet (Cão/Gato)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Idade (Anos)
                  </label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Calorias / dia
                  </label>
                  <input
                    type="number"
                    value={newCalories}
                    onChange={(e) => setNewCalories(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Alergias (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Amendoim, Lactose, Corante"
                  value={newAllergies}
                  onChange={(e) => setNewAllergies(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-md"
                >
                  Salvar Integrante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
