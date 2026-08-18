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
      error: "Variável GEMINI_API_KEY não configurada na Vercel. Adicione em Settings > Environment Variables."
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

// ========== ACADEMIES PARTNER & ADMIN API ==========
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
    console.error("Erro ao carregar academias:", err);
    res.status(500).json({ error: err?.message || "Erro ao obter academias ativas." });
  }
});

app.post("/api/academies/register", async (req, res) => {
  const { name, address, city, neighborhood, phone, email, website, about, modalities, hours, image, ownerUid } = req.body;
  if (!name?.trim() || !address?.trim() || !city?.trim() || !neighborhood?.trim() || !phone?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Faltam campos essenciais para o cadastro." });
  }
  if (!Array.isArray(modalities) || modalities.length === 0) {
    return res.status(400).json({ error: "Selecione pelo menos uma modalidade." });
  }
  try {
    const academyId = "gym-" + Date.now();
    const academyRef = doc(db, "academies", academyId);
    const newAcademy = {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website?.trim() || "https://nutriai.app",
      about: about?.trim() || "Academia parceira focada no bem-estar integral.",
      modalities,
      hours: hours?.trim() || "Seg a Sex: 06h às 22h • Sáb: 08h às 16h",
      image: image || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800",
      rating: 5.0,
      reviewsCount: 0,
      contactCount: 0,
      viewsCount: 1,
      status: "PENDENTE",
      reviews: [],
      ownerUid: ownerUid || null,
      createdAt: new Date().toISOString()
    };
    await setDoc(academyRef, newAcademy);
    res.status(201).json({ success: true, academyId, academy: newAcademy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao registrar a academia." });
  }
});

app.get("/api/admin/academies", async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, "academies"));
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao carregar lista administrativa." });
  }
});

app.post("/api/admin/academies/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["PENDENTE", "ATIVO", "REJEITADO"].includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }
  try {
    const academyRef = doc(db, "academies", id);
    await updateDoc(academyRef, { status, updatedAt: new Date().toISOString() });
    res.json({ success: true, academyId: id, status });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao atualizar status." });
  }
});

app.post("/api/academies/:id/update", async (req, res) => {
  const { id } = req.params;
  const { fields } = req.body;
  try {
    const academyRef = doc(db, "academies", id);
    await updateDoc(academyRef, { ...fields, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao atualizar dados." });
  }
});

app.post("/api/academies/:id/action", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  try {
    const academyRef = doc(db, "academies", id);
    const snap = await getDoc(academyRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Academia não encontrada." });
    }
    const current = snap.data();
    if (action === "view") {
      await updateDoc(academyRef, { viewsCount: (current.viewsCount || 0) + 1 });
    } else if (action === "contact") {
      await updateDoc(academyRef, { contactCount: (current.contactCount || 0) + 1 });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao computar métrica." });
  }
});

app.post("/api/academies/:id/reviews", async (req, res) => {
  const { id } = req.params;
  const { author, rating, text } = req.body;
  if (!author?.trim() || rating === undefined || !text?.trim()) {
    return res.status(400).json({ error: "Dados incompletos para avaliação." });
  }
  try {
    const academyRef = doc(db, "academies", id);
    const snap = await getDoc(academyRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Academia não encontrada." });
    }
    const data = snap.data();
    const currentReviews = data.reviews || [];
    const currentReviewsCount = data.reviewsCount || 0;
    const currentRating = data.rating || 5.0;
    const newReview = {
      id: "review-" + Date.now(),
      author: author.trim(),
      rating: Number(rating),
      text: text.trim(),
      date: new Date().toLocaleDateString("pt-BR")
    };
    const updatedReviews = [newReview, ...currentReviews];
    const newRating = parseFloat(((currentRating * currentReviewsCount + Number(rating)) / (currentReviewsCount + 1)).toFixed(1));
    await updateDoc(academyRef, {
      reviews: updatedReviews,
      reviewsCount: currentReviewsCount + 1,
      rating: newRating
    });
    res.json({ success: true, reviews: updatedReviews, rating: newRating, reviewsCount: currentReviewsCount + 1 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao postar avaliação." });
  }
});

// ========== DELIVERY APIS ==========
app.get("/api/delivery/couriers", async (req, res) => {
  try {
    const q = query(collection(db, "couriers"));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data());
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/delivery/couriers/register", async (req, res) => {
  try {
    const { name, phone, cnh, rg, vehicleType, vehicleModel, plate, routes, hours } = req.body;
    if (!name || !phone || !cnh || !vehicleType || !routes || !hours) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes!" });
    }
    const id = "courier-" + Math.random().toString(36).substring(2, 7);
    const newCourier = {
      id,
      name,
      phone,
      cnh,
      rg,
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200",
      vehicleType,
      vehicleModel: vehicleModel || (vehicleType === "moto" ? "Honda CG 160cc" : "Bicicleta Caloi"),
      plate: plate || (vehicleType === "moto" ? "ABC-1234" : "N/A"),
      routes: Array.isArray(routes) ? routes : [routes],
      hours,
      rating: 5.0,
      ratingCount: 1,
      status: "available",
      currentLat: -23.5615 + (Math.random() - 0.5) * 0.01,
      currentLng: -46.6560 + (Math.random() - 0.5) * 0.01,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "couriers", id), newCourier);
    res.status(201).json({ success: true, courier: newCourier });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/delivery/create", async (req, res) => {
  try {
    const { orderId, userId, items, total, vehicleType, deliveryAddress } = req.body;
    if (!orderId || !vehicleType) {
      return res.status(400).json({ error: "orderId e vehicleType são obrigatórios" });
    }
    const q = query(
      collection(db, "couriers"),
      where("vehicleType", "==", vehicleType),
      where("status", "==", "available")
    );
    const snap = await getDocs(q);
    const couriers = snap.docs.map(doc => doc.data());
    let assignedCourier = couriers[0] || null;
    const storeLat = -23.5615;
    const storeLng = -46.6560;

    if (!assignedCourier) {
      const fallbackId = "courier-backup-" + vehicleType;
      assignedCourier = {
        id: fallbackId,
        name: vehicleType === "moto" ? "Gerson Andrade" : "Thiago Souza (Eco-Rider)",
        phone: "(11) 94444-5555",
        photoURL: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=200&h=200",
        vehicleType,
        vehicleModel: vehicleType === "moto" ? "Yamaha Factor 150" : "Bicicleta Elétrica Sense Swift",
        routes: ["Paulista", "Centro"],
        hours: "24h",
        rating: 4.9,
        ratingCount: 15,
        status: "available",
        currentLat: storeLat + 0.001,
        currentLng: storeLng - 0.001,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "couriers", fallbackId), assignedCourier);
    }

    try {
      await updateDoc(doc(db, "couriers", assignedCourier.id), { status: "delivering" });
    } catch (e) {}

    const eta = vehicleType === "moto" ? 12 : 20;
    const deliveryDoc = {
      id: orderId,
      orderId,
      userId: userId || "anonymous",
      total: Number(total) || 0,
      vehicleType,
      courierId: assignedCourier.id,
      courierName: assignedCourier.name,
      courierPhone: assignedCourier.phone,
      courierPhoto: assignedCourier.photoURL,
      courierRating: assignedCourier.rating,
      vehicleModel: assignedCourier.vehicleModel,
      status: "preparing",
      progress: 0,
      etaMinutes: eta,
      startLat: storeLat,
      startLng: storeLng,
      endLat: -23.5700,
      endLng: -46.6450,
      currentLat: storeLat,
      currentLng: storeLng,
      deliveryAddress: deliveryAddress || "Avenida Paulista, 1500 - Bela Vista",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notifications: [
        {
          id: "notif-1",
          title: "Pedido Confirmado",
          message: "Seu pedido de hortifruti fresco foi confirmado!",
          time: new Date().toISOString()
        }
      ]
    };

    await setDoc(doc(db, "deliveries", orderId), deliveryDoc);
    res.status(201).json(deliveryDoc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/delivery/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const deliveryRef = doc(db, "deliveries", orderId);
    const snap = await getDoc(deliveryRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Entrega não encontrada." });
    }
    res.json(snap.data());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/delivery/orders/:id/update-status", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const deliveryRef = doc(db, "deliveries", orderId);
    await updateDoc(deliveryRef, { status, updatedAt: new Date().toISOString() });
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
