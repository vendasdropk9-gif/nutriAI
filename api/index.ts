import express from "express";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, collection, getDocs, getDoc, query, where } from "firebase/firestore";
import * as geminiServer from "../src/lib/gemini.server";
import firebaseConfig from "../firebase-applet-config.json";

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

const app = express();

app.use(express.json({ limit: "15mb" }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET Medicinal Herbs
app.get("/api/herbs", async (req, res) => {
  try {
    const q = query(collection(db, "medicinalHerbs"));
    const querySnapshot = await getDocs(q);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    res.json(list);
  } catch (err: any) {
    console.error("Erro ao obter ervas medicinais:", err);
    res.status(500).json({ error: err?.message || "Erro ao obter ervas medicinais." });
  }
});

// Secure API Proxy for all Gemini queries
app.post("/api/gemini", async (req, res) => {
  const { functionName, args } = req.body || {};

  if (!functionName || typeof functionName !== "string") {
    return res.status(400).json({ error: "Nome de função inválido ou ausente." });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Variável GEMINI_API_KEY não configurada na Vercel."
    });
  }

  const func = (geminiServer as any)[functionName];
  if (!func || typeof func !== "function") {
    return res.status(404).json({ error: `Função '${functionName}' não localizada no backend.` });
  }

  try {
    const result = await func(...(args || []));
    res.json(result);
  } catch (err: any) {
    console.error(`Erro na execução da API Gemini '${functionName}':`, err);
    res.status(500).json({ error: err?.message || "Erro interno ao processar a requisição." });
  }
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "E-mail, senha e nome completo são obrigatórios." });
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateAuthProfile(userCredential.user, { displayName: name });

    const userRef = doc(db, "users", userCredential.user.uid);
    await setDoc(userRef, {
      name,
      email,
      goals: "Me alimentar melhor",
      preferences: "Sem preferências gravadas",
      restrictions: [],
      allergies: [],
      points: 0,
      streak: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: name,
      status: "success",
    });
  } catch (err: any) {
    console.error("Erro ao cadastrar usuário:", err);
    res.status(500).json({ error: err?.message || "Erro ao realizar o cadastro no banco." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    res.json({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      status: "success",
    });
  } catch (err: any) {
    console.error("Erro de login:", err);
    res.status(401).json({ error: err?.message || "Credenciais inválidas." });
  }
});

app.post("/api/meals/register", async (req, res) => {
  const { userId, log } = req.body;
  if (!userId || !log || !log.recipeName) {
    return res.status(400).json({ error: "ID de usuário e dados de registro válidos são obrigatórios." });
  }
  try {
    const logId = log.id || Math.random().toString(36).substring(7);
    const logRef = doc(db, "users", userId, "intakeLogs", logId);
    const dataToSave = {
      ...log,
      id: logId,
      userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(logRef, dataToSave);
    res.json({ success: true, logId, data: dataToSave });
  } catch (err: any) {
    console.error("Erro ao registrar refeição:", err);
    res.status(500).json({ error: err?.message || "Erro ao salvar refeição no banco de dados." });
  }
});

app.post("/api/goals/update", async (req, res) => {
  const { userId, goals } = req.body;
  if (!userId || goals === undefined) {
    return res.status(400).json({ error: "ID de usuário e metas são obrigatórios." });
  }
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      goals: goals,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, goals });
  } catch (err: any) {
    console.error("Erro ao atualizar metas:", err);
    res.status(500).json({ error: err?.message || "Erro ao persistir as novas metas." });
  }
});

// Academies endpoints
app.get("/api/academies", async (req, res) => {
  try {
    const q = query(collection(db, "academies"), where("status", "==", "ATIVO"));
    const querySnapshot = await getDocs(q);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao obter academias." });
  }
});

// Delivery Couriers endpoints
app.get("/api/delivery/couriers", async (req, res) => {
  try {
    const q = query(collection(db, "couriers"));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao obter entregadores." });
  }
});

export default app;
