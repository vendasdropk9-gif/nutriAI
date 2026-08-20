import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import { createViteServer } from "vite";

// Firebase
import { initializeFirebase } from "./firebase";

// Rotas
import authRoutes from "./routes/auth";
import herbRoutes from "./routes/herbs";
import geminiRoutes from "./routes/gemini";
import academyRoutes from "./routes/academies";
import courierRoutes from "./routes/couriers";
import deliveryRoutes from "./routes/delivery";
import mealRoutes from "./routes/meals";
import goalRoutes from "./routes/goals";

// Seeds
import { seedCouriers } from "./seeds/couriers";
import { seedMedicinalHerbs } from "./seeds/medicinalHerbs";

// Websocket Gemini Live
import { initializeWebsocket } from "./websocket";

// Middlewares
import { errorHandler } from "./middleware/errors";
import { logger } from "./middleware/logger";

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  // Firebase
  const { db, auth } = initializeFirebase();

  // Seeds
  await seedCouriers(db);
  await seedMedicinalHerbs(db);

  const app = express();

  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(logger);

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "NutriAI Backend Online",
      version: "2.0.0",
      timestamp: new Date().toISOString()
    });
  });

  // Manual HTML
  app.get(["/manual", "/manual.html"], (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "manual_nutriai.html"));
  });

  // API
  app.use("/api/auth", authRoutes(db, auth));
  app.use("/api/herbs", herbRoutes(db));
  app.use("/api/gemini", geminiRoutes(db));
  app.use("/api/academies", academyRoutes(db));
  app.use("/api/couriers", courierRoutes(db));
  app.use("/api/delivery", deliveryRoutes(db));
  app.use("/api/meals", mealRoutes(db));
  app.use("/api/goals", goalRoutes(db));

  // Tratamento global de erros
  app.use(errorHandler);

  // Servidor HTTP
  const server = createServer(app);

  // WebSocket Gemini Live
  initializeWebsocket(server);

  // Desenvolvimento (Vite)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), "dist");

    app.use(express.static(dist));

    app.get("*", (req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log("=========================================");
    console.log("🚀 NutriAI Backend iniciado");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("🔥 Firebase conectado");
    console.log("🤖 Gemini conectado");
    console.log("📦 Firestore conectado");
    console.log("=========================================");
  });
}

bootstrap().catch((err) => {
  console.error("Erro ao iniciar servidor:");
  console.error(err);
  process.exit(1);
});