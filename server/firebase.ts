// firebase.ts

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";

import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

import {
  getAuth,
  Auth,
  connectAuthEmulator,
} from "firebase/auth";

import firebaseConfig from "./firebase-applet-config.json";

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initializeFirebase() {
  // Evita múltiplas inicializações
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  db = getFirestore(
    app,
    firebaseConfig.firestoreDatabaseId
  );

  auth = getAuth(app);

  // Emuladores (opcional)
  if (
    process.env.USE_FIREBASE_EMULATOR === "true"
  ) {
    try {
      connectFirestoreEmulator(
        db,
        "127.0.0.1",
        8080
      );

      connectAuthEmulator(
        auth,
        "http://127.0.0.1:9099",
        {
          disableWarnings: true,
        }
      );

      console.log("🧪 Firebase Emulator conectado");
    } catch {
      console.log("⚠️ Emulator já conectado");
    }
  }

  console.log("🔥 Firebase inicializado");

  return {
    app,
    db,
    auth,
  };
}

export { app, db, auth };