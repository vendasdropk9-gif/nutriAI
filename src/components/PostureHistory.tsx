import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingDown } from 'lucide-react';

const data = [
  { name: 'Ombros', desalinhamentos: 12 },
  { name: 'Quadril', desalinhamentos: 8 },
  { name: 'Joelhos', desalinhamentos: 5 },
  { name: 'Coluna', desalinhamentos: 15 },
];

export const PostureHistory = () => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white space-y-4">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-teal-400" />
        <h2 className="text-lg font-bold">Histórico de Postura Semanal</h2>
      </div>
      <p className="text-xs text-slate-400">Principais pontos de desalinhamento identificados nos seus treinos.</p>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
            <Bar dataKey="desalinhamentos" fill="#0d9488" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
