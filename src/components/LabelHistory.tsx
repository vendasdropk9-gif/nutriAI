import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export function LabelHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    async function fetchHistory() {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'foodLabelAnalyses'),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
    }
    fetchHistory();
  }, []);

  const filteredHistory = filterCategory === 'all' 
    ? history 
    : history.filter(item => item.category === filterCategory);

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Histórico de Rótulos</h3>
      <select 
        value={filterCategory} 
        onChange={(e) => setFilterCategory(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        <option value="all">Todas as categorias</option>
        <option value="fruits_veg">Frutas e Verduras</option>
        <option value="prepared_meal">Refeições Preparadas</option>
      </select>
      <ul className="space-y-2">
        {filteredHistory.map((item: any) => (
          <li key={item.id} className="p-2 border-b">
            <p className="font-semibold">{item.productName}</p>
            <p className="text-sm text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
