import { doc, getDocFromServer, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface DiagnosticResult {
  status: 'success' | 'error';
  message: string;
}

export async function diagnoseFirestoreConnection(): Promise<DiagnosticResult> {
  const testPath = 'test/connection';
  const testDoc = doc(db, testPath);

  try {
    await getDocFromServer(testDoc);
    
    if (auth.currentUser) {
        const userTestPath = `users/${auth.currentUser.uid}/test/permissions`;
        const userTestDoc = doc(db, userTestPath);
        await setDoc(userTestDoc, { timestamp: Date.now() });
        await deleteDoc(userTestDoc);
        return { status: 'success', message: 'Conexão Segura: Firestore ativo e permissões validadas.' };
    }
    
    return { status: 'success', message: 'Conexão Segura: Firestore ativo.' };
  } catch (error: any) {
    console.error("Diagnostic failure:", error);
    return { status: 'error', message: `Erro de Conexão/Permissão: ${error.message || 'Falha desconhecida'}` };
  }
}
