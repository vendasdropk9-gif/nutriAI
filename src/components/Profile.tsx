import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Check } from 'lucide-react';

interface ProfileProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

export function Profile({ profile, onSaveProfile }: ProfileProps) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    restrictions: profile?.restrictions?.join(', ') || '',
    allergies: profile?.allergies?.join(', ') || '',
    goals: profile?.goals || '',
    equipment: profile?.equipment?.join(', ') || '',
    weight: profile?.weight?.toString() || '',
    height: profile?.height?.toString() || '',
    age: profile?.age?.toString() || '',
    activityLevel: profile?.activityLevel || '',
    gender: profile?.gender || '',
    skinTone: profile?.skinTone || '',
    hairColor: profile?.hairColor || '',
  });
  
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const processedProfile: UserProfile = {
      name: formData.name,
      restrictions: formData.restrictions.split(',').map((s) => s.trim()).filter(Boolean),
      allergies: formData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      goals: formData.goals,
      equipment: formData.equipment.split(',').map((s) => s.trim()).filter(Boolean),
      weight: formData.weight ? Number(formData.weight) : undefined,
      height: formData.height ? Number(formData.height) : undefined,
      age: formData.age ? Number(formData.age) : undefined,
      activityLevel: formData.activityLevel,
      gender: formData.gender,
      skinTone: formData.skinTone,
      hairColor: formData.hairColor,
    };
    
    onSaveProfile(processedProfile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-12">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Seu Perfil
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
          Configure suas restrições e objetivos para receitas mais precisas.
        </p>
      </div>

      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 md:p-10 rounded-[32px] shadow-2xl border border-white/60 dark:border-slate-700/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Nome
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Chef Lucas"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Gênero
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              >
                <option value="">Selecione...</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro/Não informar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Idade
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Anos"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Peso (kg)
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="Ex: 70"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Altura (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="Ex: 175"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                  Nível de Atividade Física
               </label>
               <select
                  value={formData.activityLevel}
                  onChange={(e) => handleChange('activityLevel', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="sedentario">Sedentário (pouco ou nenhum exercício)</option>
                  <option value="leve">Leve (exercício leve 1-3 dias/semana)</option>
                  <option value="moderado">Moderado (exercício moderado 3-5 dias/semana)</option>
                  <option value="intenso">Intenso (exercício forte 6-7 dias/semana)</option>
                </select>
            </div>
            
            <div className="space-y-2">
               <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                  Tom de Pele
               </label>
               <select
                  value={formData.skinTone}
                  onChange={(e) => handleChange('skinTone', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="clara">Pele Clara</option>
                  <option value="media">Pele Média / Morena Clara</option>
                  <option value="parda">Pele Parda / Morena Escura</option>
                  <option value="escura">Pele Negra</option>
                </select>
            </div>

            <div className="space-y-2">
               <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                  Cor do Cabelo
               </label>
               <select
                  value={formData.hairColor}
                  onChange={(e) => handleChange('hairColor', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="preto">Preto</option>
                  <option value="castanho_escuro">Castanho Escuro</option>
                  <option value="castanho_claro">Castanho Claro</option>
                  <option value="loiro">Loiro</option>
                  <option value="ruivo">Ruivo</option>
                  <option value="grisalho">Grisalho / Branco</option>
                  <option value="careca">Careca / Sem cabelo</option>
                </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Restrições Alimentares (separadas por vírgula)
            </label>
            <input
              type="text"
              value={formData.restrictions}
              onChange={(e) => handleChange('restrictions', e.target.value)}
              placeholder="Ex: Vegano, Sem glúten"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Alergias (separadas por vírgula)
            </label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              placeholder="Ex: Amendoim, Laticínios"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Objetivos de Saúde
            </label>
            <input
              type="text"
              value={formData.goals}
              onChange={(e) => handleChange('goals', e.target.value)}
              placeholder="Ex: Perda de peso, Ganho muscular"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Equipamentos de Cozinha (separados por vírgula)
            </label>
            <input
              type="text"
              value={formData.equipment}
              onChange={(e) => handleChange('equipment', e.target.value)}
              placeholder="Ex: Forno, Micro-ondas, Air Fryer"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-8 py-4 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 flex items-center gap-2"
            >
              {isSaved ? (
                <>
                  <Check className="w-5 h-5" />
                  Salvo!
                </>
              ) : (
                'Salvar Perfil'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
