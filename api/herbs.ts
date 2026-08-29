import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { DEFAULT_MEDICINAL_HERBS } from "../src/data/medicinalHerbsData";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    const q = query(collection(db, "medicinalHerbs"));
    const querySnapshot = await getDocs(q);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (list.length > 0) {
      return res.status(200).json(list);
    }
  } catch (err: any) {
    console.warn("Aviso ao carregar ervas do Firestore no handler /api/herbs, usando catálogo integrado:", err?.message || err);
  }

  return res.status(200).json(DEFAULT_MEDICINAL_HERBS);
}
