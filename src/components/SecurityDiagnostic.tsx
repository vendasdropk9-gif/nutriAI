import React, { useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'passed' | 'failed';
  message: string;
}

export const SecurityDiagnostic: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    const tests: TestResult[] = [
      { name: 'Unauthorized Read', status: 'pending', message: 'Testing...' },
      { name: 'Unauthorized Write', status: 'pending', message: 'Testing...' },
    ];
    setResults(tests);

    // Test 1: Unauthorized Read (read another user's profile)
    try {
      await getDoc(doc(db, 'users/unauthorized-user-123'));
      tests[0] = { name: 'Unauthorized Read', status: 'failed', message: 'Read succeeded (Should be blocked)' };
    } catch (e: any) {
      if (e.code === 'permission-denied') tests[0] = { name: 'Unauthorized Read', status: 'passed', message: 'Read blocked as expected' };
      else tests[0] = { name: 'Unauthorized Read', status: 'failed', message: `Unexpected error: ${e.message}` };
    }

    // Test 2: Unauthorized Write
    try {
      await setDoc(doc(db, 'users/unauthorized-user-123/data/test'), { hack: true });
      tests[1] = { name: 'Unauthorized Write', status: 'failed', message: 'Write succeeded (Should be blocked)' };
      // cleanup
      await deleteDoc(doc(db, 'users/unauthorized-user-123/data/test'));
    } catch (e: any) {
      if (e.code === 'permission-denied') tests[1] = { name: 'Unauthorized Write', status: 'passed', message: 'Write blocked as expected' };
      else tests[1] = { name: 'Unauthorized Write', status: 'failed', message: `Unexpected error: ${e.message}` };
    }

    setResults([...tests]);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white space-y-4">
      <h2 className="text-lg font-bold">Diagnóstico de Segurança Firestore</h2>
      <button onClick={runTests} className="bg-teal-600 px-4 py-2 rounded-xl text-sm font-bold">Executar Testes de Segurança</button>
      
      <div className="space-y-2">
        {results.map(r => (
          <div key={r.name} className="flex items-center gap-2 text-sm p-2 bg-slate-800 rounded-lg">
            {r.status === 'passed' ? <ShieldCheck className="text-emerald-400 w-4 h-4" /> : <ShieldAlert className="text-red-400 w-4 h-4" />}
            <span>{r.name}: {r.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
