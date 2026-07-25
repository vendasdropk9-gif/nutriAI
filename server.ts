import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { WebSocketServer } from "ws";
import * as geminiServer from "./src/lib/gemini.server";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, collection, getDocs, getDoc, query, where } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

async function startServer() {
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(firebaseApp);

  // Seed default couriers if none exist
  const seedCouriers = async () => {
    try {
      const q = query(collection(db, "couriers"));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log("Seeding default couriers into Firestore...");
        const defaultCouriers = [
          {
            id: "courier-1",
            name: "Carlos Santos",
            phone: "(11) 98765-4321",
            photoURL: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200&h=200",
            vehicleType: "moto",
            vehicleModel: "Honda CG 160 Fan (Vermelha)",
            routes: ["Paulista", "Centro", "Consolação", "Bela Vista"],
            hours: "08:00 - 20:00",
            rating: 4.9,
            ratingCount: 154,
            status: "available",
            currentLat: -23.5600,
            currentLng: -46.6570,
            createdAt: new Date().toISOString()
          },
          {
            id: "courier-2",
            name: "Mateus Lima (Eco)",
            phone: "(11) 97654-3210",
            photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
            vehicleType: "bicicleta",
            vehicleModel: "Caloi Explorer Carbon Sport (Verde)",
            routes: ["Pinheiros", "Paulista", "Jardins", "Vila Madalena"],
            hours: "09:00 - 18:00",
            rating: 4.8,
            ratingCount: 92,
            status: "available",
            currentLat: -23.5620,
            currentLng: -46.6550,
            createdAt: new Date().toISOString()
          },
          {
            id: "courier-3",
            name: "Julia Rocha (Veloz)",
            phone: "(11) 96543-2109",
            photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200",
            vehicleType: "bicicleta",
            vehicleModel: "Bicicleta Elétrica Specialized Turbo (Cinza)",
            routes: ["Consolação", "Bela Vista", "Vila Mariana", "Paraíso"],
            hours: "08:00 - 17:00",
            rating: 5.0,
            ratingCount: 210,
            status: "available",
            currentLat: -23.5595,
            currentLng: -46.6590,
            createdAt: new Date().toISOString()
          },
          {
            id: "courier-4",
            name: "Rodrigo Medeiros",
            phone: "(11) 95432-1098",
            photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200",
            vehicleType: "moto",
            vehicleModel: "Yamaha Fazer 250 ABS (Azul)",
            routes: ["Itaim Bibi", "Vila Olímpia", "Pinheiros", "Moema"],
            hours: "11:00 - 23:00",
            rating: 4.7,
            ratingCount: 118,
            status: "available",
            currentLat: -23.5680,
            currentLng: -46.6490,
            createdAt: new Date().toISOString()
          }
        ];

        for (const courier of defaultCouriers) {
          await setDoc(doc(db, "couriers", courier.id), courier);
        }
        console.log("Seeding complete!");
      }
    } catch (e) {
      console.error("Failed to seed couriers:", e);
    }
  };
  seedCouriers();

  const seedMedicinalHerbs = async () => {
    try {
      const q = query(collection(db, "medicinalHerbs"));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log("Seeding default medicinal herbs into Firestore...");
        const defaultHerbs = [
          {
            id: "herb-alecrim",
            popularName: "Alecrim",
            scientificName: "Rosmarinus officinalis",
            botanicalFamily: "Lamiaceae",
            otherNames: ["Alecrim-do-jardim", "Alecrim-da-horta"],
            description: "Planta arbustiva perene com aroma característico forte, muito utilizada em infusões para cansaço mental, digestão e circulação sanguínea.",
            origin: "Região do Mediterrâneo (amplamente aclimatada no Brasil)",
            biome: "Mata Atlântica / Cerrado (Cultivado)",
            states: ["SP", "MG", "RJ", "RS", "PR", "SC"],
            harvestSeason: "Ano todo",
            partUsed: "Folhas e sumidades floridas",
            properties: ["Estimulante digestivo", "Antiespasmódico", "Antioxidante", "Tônico circulatório", "Anti-inflamatório leve"],
            indications: [
              { name: "Má digestão", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Cansaço mental", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" },
              { name: "Gases intestinais", evidence: "Uso tradicional", badge: "🟠 Uso tradicional" }
            ],
            preparation: {
              amount: "1 colher de sobremesa de folhas",
              water: "150ml (1 xícara de chá)",
              temperature: "Fervente (100°C)",
              time: "Abafar por 5 a 10 minutos (infusão)",
              strain: "Coar imediatamente após o tempo de infusão",
              dosage: "Tomar 1 xícara após as principais refeições"
            },
            dosage: {
              traditional: "2 a 3 xícaras por dia",
              limit: "Máximo de 10g de folhas secas ao dia",
              maxDuration: "Não usar continuamente por mais de 3 semanas"
            },
            contraindications: {
              warnings: [
                "Contraindicado para gestantes (risco de estimulação uterina)",
                "Lactantes e crianças menores de 12 anos devem evitar",
                "Pessoas com hipertensão ou epilepsia devem consumir com moderação e sob orientação.",
                "Pode causar insônia se tomado próximo ao horário de dormir."
              ]
            },
            compounds: ["Ácido rosmarínico", "Cânfora", "Alecrim-cineol", "Flavonoides", "Triterpenos"],
            cultivation: {
              soil: "Solo arenoso, bem drenado, de fertilidade média",
              luminosity: "Sol pleno (mínimo de 6 horas diárias)",
              watering: "Espaçada (evitar encharcamento a qualquer custo)",
              climate: "Ameno a quente, tolera frio moderado"
            },
            curiosities: [
              "Historicamente associado à memória e à amizade, na Grécia Antiga estudantes usavam ramos na cabeça durante exames.",
              "No Brasil, é consagrado no uso popular e em rituais tradicionais de bem-estar."
            ],
            sources: ["Farmacopeia Brasileira (Anvisa)", "Formulário de Fitoterápicos da Farmacopeia Brasileira, 2ª Edição", "Monografia da OMS sobre Plantas Medicinais."],
            photoURL: "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=600&h=600",
            gallery: [
              "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=600&h=600",
              "https://images.unsplash.com/photo-1594007654729-407ededc4963?auto=format&fit=crop&q=80&w=600&h=600"
            ]
          },
          {
            id: "herb-capim-limao",
            popularName: "Capim-Limão",
            scientificName: "Cymbopogon citratus",
            botanicalFamily: "Poaceae",
            otherNames: ["Capim-santo", "Capim-cidreira", "Chá-de-estrada"],
            description: "Gramínea perene nativa da Ásia tropical, extremamente popular no Brasil pela sua ação calmante, analgésica e espasmolítica.",
            origin: "Ásia tropical (amplamente cultivada e naturalizada no Brasil)",
            biome: "Cerrado / Amazônia / Mata Atlântica",
            states: ["SP", "MG", "RJ", "BA", "CE", "PR", "PE"],
            harvestSeason: "Ano todo (melhor antes da floração)",
            partUsed: "Folhas frescas ou secas",
            properties: ["Sedativo suave", "Ansiolítico leve", "Antiespasmódico", "Digestivo", "Diaforético"],
            indications: [
              { name: "Ansiedade leve", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" },
              { name: "Cólicas abdominais", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" },
              { name: "Insônia leve", evidence: "Uso tradicional", badge: "🟠 Uso tradicional" }
            ],
            preparation: {
              amount: "1 colher de sopa de folhas frescas picadas",
              water: "150ml (1 xícara de chá)",
              temperature: "Fervente (100°C)",
              time: "Abafar por 10 minutos (infusão)",
              strain: "Coar com peneira fina para remover microfarpas das folhas",
              dosage: "Tomar morno, preferencialmente à noite"
            },
            dosage: {
              traditional: "3 xícaras ao dia",
              limit: "Sem limite rígido definido na literatura para infusão padrão, mas evitar excesso",
              maxDuration: "Consumo diário seguro por até 4 semanas consecutivas"
            },
            contraindications: {
              warnings: [
                "Pode provocar hipotensão (redução da pressão arterial) em pessoas sensíveis",
                "Evitar o uso em casos de dor abdominal de causa desconhecida",
                "Não recomendado o uso do óleo essencial por via oral sem supervisão profissional",
                "Seguro para gestantes em doses alimentares típicas (chá fraco), mas evitar infusões altamente concentradas."
              ]
            },
            compounds: ["Citral", "Mirceno", "Geraniol", "Limoneno", "Ácidos fenólicos"],
            cultivation: {
              soil: "Solo fértil, úmido e bem drenado",
              luminosity: "Sol pleno",
              watering: "Regular (gosta de umidade constante sem encharcar)",
              climate: "Tropical e subtropical úmido"
            },
            curiosities: [
              "As folhas contêm cristais microscópicos de sílica que podem cortar a pele ao manusear, por isso o nome 'capim'.",
              "Muito utilizado na culinária tailandesa como capim-limão (lemongrass)."
            ],
            sources: ["Memento Fitoterápico da Farmacopeia Brasileira (Anvisa)", "Fitoterapia Baseada em Evidências, Fiocruz.", "European Medicines Agency (EMA) Monograph."],
            photoURL: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600&h=600",
            gallery: [
              "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600&h=600"
            ]
          },
          {
            id: "herb-guaco",
            popularName: "Guaco",
            scientificName: "Mikania glomerata",
            botanicalFamily: "Asteraceae",
            otherNames: ["Erva-de-serpente", "Cipó-guaco", "Guaco-de-cheiro"],
            description: "Trepadeira lenhosa nativa do Brasil, consagrada cientificamente por sua potente ação broncodilatadora e expectorante contra tosses e afecções respiratórias.",
            origin: "Nativa do Sul e Sudeste do Brasil",
            biome: "Mata Atlântica",
            states: ["SP", "PR", "SC", "RS", "MG", "RJ"],
            harvestSeason: "Primavera e Verão",
            partUsed: "Folhas",
            properties: ["Broncodilatador", "Expectorante", "Antiasmático", "Anti-inflamatório respiratório"],
            indications: [
              { name: "Tosse produtiva", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Bronquite", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Resfriado comum", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" }
            ],
            preparation: {
              amount: "3g (1 colher de sobremesa) de folhas picadas",
              water: "150ml (1 xícara de chá)",
              temperature: "Fervente (100°C)",
              time: "Abafar por 10 a 15 minutos (infusão)",
              strain: "Coar em seguida",
              dosage: "Tomar de 2 a 3 vezes ao dia, preferencialmente morno"
            },
            dosage: {
              traditional: "Xarope ou chá caseiro: 10ml a 15ml (xarope) até 3 vezes ao dia",
              limit: "Não exceder 5g de folha seca ao dia",
              maxDuration: "Não utilizar por mais de 14 dias seguidos"
            },
            contraindications: {
              warnings: [
                "Rico em cumarina, substância que inibe a coagulação. Contraindicado para quem usa anticoagulantes.",
                "Contraindicado para gestantes (risco de sangramentos uterinos) e lactantes.",
                "Não recomendado para crianças menores de 2 anos.",
                "O uso prolongado pode causar distúrbios de coagulação e diarreia."
              ]
            },
            compounds: ["Cumarina", "Ácido caurenóico", "Flavonoides", "Diterpenos"],
            cultivation: {
              soil: "Solo argilo-arenoso, rico em matéria orgânica",
              luminosity: "Meia-sombra a sol pleno (necessita de suporte para trepar)",
              watering: "Frequente (manter solo úmido)",
              climate: "Subtropical a tropical úmido"
            },
            curiosities: [
              "O guaco era originalmente usado pelas populações indígenas do Brasil como antídoto tradicional contra picadas de cobras venenosas devido à sua atividade enzimática.",
              "É um dos fitoterápicos mais distribuídos pelo SUS do Brasil."
            ],
            sources: ["Formulário de Fitoterápicos da Farmacopeia Brasileira", "ANVISA - RDC nº 26/2014", "Artigos de revisão Fiocruz."],
            photoURL: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600&h=600",
            gallery: [
              "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600&h=600"
            ]
          },
          {
            id: "herb-espinheira-santa",
            popularName: "Espinheira-Santa",
            scientificName: "Monteverdia ilicifolia",
            botanicalFamily: "Celastraceae",
            otherNames: ["Salva-vidas", "Sombra-de-touro", "Espinho-de-deus"],
            description: "Pequena árvore nativa da região sul do Brasil, amplamente reconhecida pela medicina científica pela sua eficácia protetora gástrica equiparável ao omeprazol.",
            origin: "Nativa do Sul do Brasil e países vizinhos",
            biome: "Mata Atlântica / Pampa",
            states: ["RS", "SC", "PR", "SP", "MG"],
            harvestSeason: "Fim do verão",
            partUsed: "Folhas secas",
            properties: ["Antiulcerogênica", "Protetora da mucosa gástrica", "Antiácida", "Analgésica gástrica"],
            indications: [
              { name: "Gastrite", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Úlcera gástrica", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Azia e má digestão", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" }
            ],
            preparation: {
              amount: "1 colher de sopa de folhas secas picadas",
              water: "150ml (1 xícara de chá)",
              temperature: "Fervente (100°C)",
              time: "Abafar por 10 minutos (infusão)",
              strain: "Coar bem",
              dosage: "Tomar morno em jejum ou 30 minutos antes das refeições principais"
            },
            dosage: {
              traditional: "3 xícaras de chá por dia",
              limit: "Equivalente a 9g de folhas secas por dia",
              maxDuration: "Pode ser utilizado por até 6 semanas consecutivas sob acompanhamento"
            },
            contraindications: {
              warnings: [
                "Contraindicado para gestantes (pode provocar contração uterina) e lactantes (pode diminuir a secreção de leite materno).",
                "Não recomendado para crianças menores de 12 anos.",
                "Pessoas com hipersensibilidade à planta devem suspender o uso imediatamente se houver reações alérgicas."
              ]
            },
            compounds: ["Taninos", "Fridelineol", "Maitenina", "Flavonoides (como a quercetina)", "Triterpenos"],
            cultivation: {
              soil: "Solo úmido, fértil e profundo",
              luminosity: "Meia-sombra a sol pleno (crescimento lento)",
              watering: "Regular e moderada",
              climate: "Fresco a subtropical, resistente a geadas fracas"
            },
            curiosities: [
              "Seu nome popular 'Espinheira-Santa' deve-se à presença de pequenos espinhos nas margens das folhas e ao seu poder terapêutico, antigamente considerado um milagre sagrado para dores estomacais indomáveis.",
              "Foi um dos primeiros fitoterápicos brasileiros a ter eficácia exaustivamente comprovada por testes farmacológicos nacionais na década de 1980."
            ],
            sources: ["Farmacopeia Brasileira", "Monografia de Plantas Medicinais do SUS - Ministério da Saúde", "Estudos clínicos da Central de Medicamentos (CEME)."],
            photoURL: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=600&h=600",
            gallery: [
              "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=600&h=600"
            ]
          },
          {
            id: "herb-camomila",
            popularName: "Camomila",
            scientificName: "Matricaria chamomilla",
            botanicalFamily: "Asteraceae",
            otherNames: ["Camomila-comum", "Camomila-alemã", "Macela"],
            description: "Erva anual delicada de flores semelhantes a margaridas, famosa mundialmente e no Brasil por suas propriedades calmantes, ansiolíticas e anti-inflamatórias do trato digestivo.",
            origin: "Europa e Ásia ocidental (naturalizada e cultivada em larga escala no sul do Brasil)",
            biome: "Mata Atlântica / Pampa (Cultivado)",
            states: ["PR", "SC", "RS", "SP"],
            harvestSeason: "Primavera",
            partUsed: "Flores secas (capítulos florais)",
            properties: ["Calmante suave", "Ansiolítico", "Espasmolítico digestivo", "Carminativo", "Anti-inflamatório tópico e sistêmico"],
            indications: [
              { name: "Ansiedade e estresse", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Insônia leve", evidence: "Forte evidência científica", badge: "🟢 Forte evidência científica" },
              { name: "Cólicas infantis (chá fraco)", evidence: "Evidência moderada", badge: "🟡 Evidência moderada" }
            ],
            preparation: {
              amount: "1 colher de sopa de flores secas",
              water: "150ml (1 xícara de chá)",
              temperature: "Fervente (100°C)",
              time: "Abafar imediatamente por 5 a 10 minutos (infusão)",
              strain: "Coar com cuidado para não esmagar os capítulos florais",
              dosage: "Tomar antes de dormir ou entre as refeições"
            },
            dosage: {
              traditional: "3 a 4 xícaras de chá por dia",
              limit: "Equivalente a 12g de flores secas ao dia",
              maxDuration: "Consumo diário seguro por longos períodos se em doses recomendadas"
            },
            contraindications: {
              warnings: [
                "Evitar em pessoas com alergia conhecida a plantas da família Asteraceae (como margaridas).",
                "Evitar o uso concomitante com sedativos sintéticos ou álcool pela potencialização do efeito ansiolítico.",
                "O chá altamente concentrado pode provocar náuseas em estômagos vazios."
              ]
            },
            compounds: ["Apigenina (flavonoide calmante)", "Bisabolol", "Chamazuleno", "Cumarinas", "Óleo essencial rico"],
            cultivation: {
              soil: "Solo leve, bem drenado, medianamente fértil",
              luminosity: "Sol pleno",
              watering: "Regular (evitar solo encharcado ou extremamente seco)",
              climate: "Ameno a frio (desenvolve-se melhor em temperaturas baixas de outono/inverno)"
            },
            curiosities: [
              "A apigenina presente na camomila liga-se aos mesmos receptores cerebrais que os ansiolíticos de farmácia (receptores benzodiazepínicos), gerando relaxamento muscular e redução de ansiedade sem causar dependência.",
              "No Egito Antigo, a camomila era dedicada ao Deus do Sol, Rá, devido ao seu poder de curar febres."
            ],
            sources: ["Farmacopeia Brasileira", "Monografias da Agência Europeia de Medicamentos (EMA)", "National Institutes of Health (NIH) Camomile reviews."],
            photoURL: "https://images.unsplash.com/photo-1595971294624-80bcfba88235?auto=format&fit=crop&q=80&w=600&h=600",
            gallery: [
              "https://images.unsplash.com/photo-1595971294624-80bcfba88235?auto=format&fit=crop&q=80&w=600&h=600",
              "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=600&h=600"
            ]
          }
        ];

        for (const herb of defaultHerbs) {
          await setDoc(doc(db, "medicinalHerbs", herb.id), herb);
        }
        console.log("Medicinal herbs seeding complete!");
      }
    } catch (e) {
      console.error("Failed to seed medicinal herbs:", e);
    }
  };
  seedMedicinalHerbs();

  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware (increase limit for image base64 uploads)
  app.use(express.json({ limit: '10mb' }));

  // API Health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve the manual directly
  app.get(["/manual", "/manual.html"], (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "manual_nutriai.html"));
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
      console.error("Erro ao obter ervas medicinais em /api/herbs:", err);
      res.status(500).json({ error: err?.message || "Erro ao obter ervas medicinais." });
    }
  });

  // Secure API Proxy for all Gemini queries
  app.post("/api/gemini", async (req, res) => {
    console.log(`Received request for: ${req.body.functionName}`);
    const { functionName, args } = req.body;
    
    if (!functionName || typeof functionName !== "string") {
      return res.status(400).json({ error: "Nome de função inválido ou ausente." });
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

  app.post("/api/tts", express.json(), async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");
      
      res.json({ audio: base64Audio });
    } catch (e: any) {
      console.error("TTS error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ========== BACKEND DATABASE REST API ==========

  // 1. Cadastrar Usuário
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "E-mail, senha e nome completo são obrigatórios." });
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateAuthProfile(userCredential.user, { displayName: name });
      
      const userRef = doc(db, 'users', userCredential.user.uid);
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
        updatedAt: new Date().toISOString()
      });

      res.status(201).json({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name,
        status: "success"
      });
    } catch (err: any) {
      console.error("Erro ao cadastrar usuário no backend:", err);
      res.status(500).json({ error: err?.message || "Erro ao realizar o cadastro no banco." });
    }
  });

  // 2. Login de Usuário
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
        status: "success"
      });
    } catch (err: any) {
      console.error("Erro de login no backend:", err);
      res.status(401).json({ error: err?.message || "Credenciais inválidas." });
    }
  });

  // 3. Registrar Refeição (Ingestão)
  app.post("/api/meals/register", async (req, res) => {
    const { userId, log } = req.body;
    if (!userId || !log || !log.recipeName) {
      return res.status(400).json({ error: "ID de usuário e dados de registro válidos são obrigatórios." });
    }
    try {
      const logId = log.id || Math.random().toString(36).substring(7);
      const logRef = doc(db, 'users', userId, 'intakeLogs', logId);
      const dataToSave = {
        ...log,
        id: logId,
        userId,
        createdAt: new Date().toISOString()
      };
      await setDoc(logRef, dataToSave);
      res.json({ success: true, logId, data: dataToSave });
    } catch (err: any) {
      console.error("Erro ao registrar refeição no backend:", err);
      res.status(500).json({ error: err?.message || "Erro ao salvar refeição no banco de dados." });
    }
  });

  // 4. Atualizar Metas
  app.post("/api/goals/update", async (req, res) => {
    const { userId, goals } = req.body;
    if (!userId || goals === undefined) {
      return res.status(400).json({ error: "ID de usuário e metas são obrigatórios." });
    }
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        goals: goals,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true, goals });
    } catch (err: any) {
      console.error("Erro ao atualizar metas no backend:", err);
      res.status(500).json({ error: err?.message || "Erro ao persistir as novas metas." });
    }
  });

  // ========== ACADEMIES PARTNER & ADMIN API ==========

  // 1. Obter todas as academias ativas (Para busca pública dos alunos)
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
      console.error("Erro ao obter academias em /api/academies:", err);
      res.status(500).json({ error: err?.message || "Erro ao obter academias ativas." });
    }
  });

  // 2. Registrar nova academia (Onboarding voluntário com validação fiscal)
  app.post("/api/academies/register", async (req, res) => {
    const { name, address, city, neighborhood, phone, email, website, about, modalities, hours, image, ownerUid } = req.body;

    // Backend validation of critical structures
    if (!name?.trim() || !address?.trim() || !city?.trim() || !neighborhood?.trim() || !phone?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "Faltam campos essenciais para o cadastro: Nome, endereço, bairro, telefone e e-mail administrative." });
    }

    if (!Array.isArray(modalities) || modalities.length === 0) {
      return res.status(400).json({ error: "Selecione pelo menos uma modalidade de treino no cadastro." });
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
        status: "PENDENTE", // Every self-registered academy starts in moderation status
        reviews: [],
        ownerUid: ownerUid || null,
        createdAt: new Date().toISOString()
      };

      await setDoc(academyRef, newAcademy);

      // Log email delivery confirmation
      console.log(`[E-MAIL SIMULATED SENDER LOG] Despachado para ${email} com sucesso!`);

      res.status(201).json({
        success: true,
        academyId,
        academy: newAcademy,
        emailSimulate: {
          to: email,
          subject: `NutriAI Parceiros - Solicitação de Adesão: ${name}`,
          body: `Olá equipe da ${name}!\n\nRecebemos com sucesso o seu cadastro na plataforma de Academias Parceiras NutriAI.\n\nSeu cadastro encontra-se com o status "PENDENTE DE APROVAÇÃO". Faremos a moderação do seu registro nas próximas 24 horas. Assim que ativado, os alunos poderão visualizar seu contato e localização!\n\nAtenciosamente,\nEquipe de Parcerias NutriAI.`
        }
      });
    } catch (err: any) {
      console.error("Erro ao registrar academia no bando de dados:", err);
      res.status(500).json({ error: err?.message || "Erro ao registrar a academia." });
    }
  });

  // 3. Obter TODAS as academias registradas (Para o painel administrativo de moderação)
  app.get("/api/admin/academies", async (req, res) => {
    try {
      const querySnapshot = await getDocs(collection(db, "academies"));
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(list);
    } catch (err: any) {
      console.error("Erro ao carregar lista de moderação administrativa:", err);
      res.status(500).json({ error: err?.message || "Erro ao carregar lista administrativa." });
    }
  });

  // 4. Modificar Status de Revisão (Aprovar / Rejeitar / Reset)
  app.post("/api/admin/academies/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["PENDENTE", "ATIVO", "REJEITADO"].includes(status)) {
      return res.status(400).json({ error: "Status inválido. Escolha ATIVO, REJEITADO ou PENDENTE." });
    }

    try {
      const academyRef = doc(db, "academies", id);
      const snapshot = await getDoc(academyRef);
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Academia não encontrada." });
      }

      await updateDoc(academyRef, {
        status,
        updatedAt: new Date().toISOString()
      });

      res.json({ success: true, academyId: id, status });
    } catch (err: any) {
      console.error("Erro ao modificar status da academia:", err);
      res.status(500).json({ error: err?.message || "Erro ao atualizar status." });
    }
  });

  // 5. Atualizar Informações da empresa (pelo parceiro)
  app.post("/api/academies/:id/update", async (req, res) => {
    const { id } = req.params;
    const { fields } = req.body;

    try {
      const academyRef = doc(db, "academies", id);
      const snapshot = await getDoc(academyRef);
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Academia não encontrada." });
      }

      await updateDoc(academyRef, {
        ...fields,
        updatedAt: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Erro ao atualizar dados da academia:", err);
      res.status(500).json({ error: err?.message || "Erro ao processar as edições de perfil." });
    }
  });

  // 6. Incrementar métricas de cliques / visualizações
  app.post("/api/academies/:id/action", async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'view' ou 'contact'

    try {
      const academyRef = doc(db, "academies", id);
      const snapshot = await getDoc(academyRef);
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Academia não localizada para registrar ação." });
      }

      const currentData = snapshot.data();
      if (action === "view") {
        await updateDoc(academyRef, { viewsCount: (currentData.viewsCount || 0) + 1 });
      } else if (action === "contact") {
        await updateDoc(academyRef, { contactCount: (currentData.contactCount || 0) + 1 });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Erro de métricas." });
    }
  });

  // 7. Enviar nova avaliação
  app.post("/api/academies/:id/reviews", async (req, res) => {
    const { id } = req.params;
    const { author, rating, text } = req.body;

    if (!author?.trim() || rating === undefined || !text?.trim()) {
      return res.status(400).json({ error: "E-mail/Nome, nota e comentário são obrigatórios para a avaliação." });
    }

    try {
      const academyRef = doc(db, "academies", id);
      const snapshot = await getDoc(academyRef);
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Academia não localizada." });
      }

      const data = snapshot.data();
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
      console.error("Erro ao enviar avaliação:", err);
      res.status(500).json({ error: err?.message || "Erro ao postar avaliação." });
    }
  });

  // ================================================
  // DYNAMIC COURIERS & DELIVERY APIS FOR NUTRI-AI
  // ================================================

  // 1. Obter todos os entregadores ou filtrar por status/tipo
  app.get("/api/delivery/couriers", async (req, res) => {
    try {
      const q = query(collection(db, "couriers"));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => doc.data());
      res.json(list);
    } catch (err: any) {
      console.error("Erro ao listar entregadores:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Registrar um novo entregador
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
        vehicleType, // "moto" ou "bicicleta"
        vehicleModel: vehicleModel || (vehicleType === 'moto' ? "Honda CG 160cc" : "Bicicleta Caloi"),
        plate: plate || (vehicleType === 'moto' ? "ABC-1234" : "N/A"),
        routes: Array.isArray(routes) ? routes : [routes],
        hours, // ex: "08:00 - 18:50"
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
      console.error("Erro ao registrar entregador:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Criar uma nova entrega com atribuição automática do entregador mais próximo!
  app.post("/api/delivery/create", async (req, res) => {
    try {
      const { orderId, userId, items, total, vehicleType, deliveryAddress } = req.body;
      
      if (!orderId || !vehicleType) {
        return res.status(400).json({ error: "orderId e vehicleType são obrigatórios" });
      }

      // Procura entregadores desse tipo que estão disponíveis
      const q = query(
        collection(db, "couriers"), 
        where("vehicleType", "==", vehicleType),
        where("status", "==", "available")
      );
      const snap = await getDocs(q);
      const couriers = snap.docs.map(doc => doc.data());
      
      let assignedCourier = null;
      const storeLat = -23.5615;
      const storeLng = -46.6560;

      if (couriers.length > 0) {
        // Encontrar o entregador mais próximo (distância euclidiana simples)
        let minDistance = Infinity;
        for (const courier of couriers) {
          const latDiff = courier.currentLat - storeLat;
          const lngDiff = courier.currentLng - storeLng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          if (distance < minDistance) {
            minDistance = distance;
            assignedCourier = courier;
          }
        }
      }

      // Se nenhum disponível, atribui qualquer entregador do tipo ou cria um reserva
      if (!assignedCourier) {
        const fallbackQ = query(collection(db, "couriers"), where("vehicleType", "==", vehicleType));
        const fallbackSnap = await getDocs(fallbackQ);
        const fallbackCouriers = fallbackSnap.docs.map(doc => doc.data());
        if (fallbackCouriers.length > 0) {
          assignedCourier = fallbackCouriers[0];
        } else {
          // Criar entregador reserva dinâmico
          const fallbackId = "courier-backup-" + vehicleType;
          assignedCourier = {
            id: fallbackId,
            name: vehicleType === 'moto' ? "Gerson Andrade" : "Thiago Souza (Eco-Rider)",
            phone: "(11) 94444-5555",
            photoURL: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=200&h=200",
            vehicleType,
            vehicleModel: vehicleType === 'moto' ? "Yamaha Factor 150" : "Bicicleta Elétrica Sense Swift",
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
      }

      // Atualiza o status do entregador para 'delivering'
      await updateDoc(doc(db, "couriers", assignedCourier.id), { status: "delivering" });

      // Dados do cliente/usuário destino (com uma pequena variação de localização para o mapa)
      const endLat = -23.5700 + (Math.random() - 0.5) * 0.004;
      const endLng = -46.6450 + (Math.random() - 0.5) * 0.004;
      const eta = vehicleType === "moto" ? 12 : 20; // Moto é mais rápida, bicicleta é mais sustentável!

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
        status: "preparing", // status inicial
        progress: 0,
        etaMinutes: eta,
        startLat: storeLat,
        startLng: storeLng,
        endLat,
        endLng,
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
      console.error("Erro ao criar entrega:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Buscar e atualizar progresso em tempo real da entrega (Simulação orgânica)
  app.get("/api/delivery/orders/:id", async (req, res) => {
    try {
      const orderId = req.params.id;
      const deliveryRef = doc(db, "deliveries", orderId);
      const snap = await getDoc(deliveryRef);

      if (!snap.exists()) {
        return res.status(404).json({ error: "Entrega não encontrada." });
      }

      const delivery = snap.data() as any;

      // Se a entrega já está finalizada ou pendente no preparo, retorno imediato
      if (delivery.status === "delivered" || delivery.status === "preparing") {
        return res.json(delivery);
      }

      // Se estiver "accepted" ou "on_the_way", simulamos progresso incremental
      if (delivery.status === "accepted" || delivery.status === "on_the_way") {
        const lastUpdated = new Date(delivery.updatedAt).getTime();
        const now = Date.now();
        const secondsPassed = Math.floor((now - lastUpdated) / 1000);

        if (secondsPassed > 0) {
          let updatedStatus = delivery.status;
          let updatedProgress = delivery.progress;
          const notifications = [...(delivery.notifications || [])];

          // 1. Se estiver 'accepted', após alguns segundos passa para 'on_the_way'
          if (delivery.status === "accepted") {
            if (secondsPassed >= 6) {
              updatedStatus = "on_the_way";
              updatedProgress = 10;
              notifications.push({
                id: "notif-" + Date.now() + "-ship",
                title: "Saiu para Entrega",
                message: `O entregador ${delivery.courierName} retirou suas sacolas frescas no Sacolão e está em rota via ${delivery.vehicleType === 'moto' ? 'Moto' : 'Bicicleta'}!`,
                time: new Date().toISOString()
              });
            }
          } 
          // 2. Se estiver 'on_the_way', progress aumenta
          else if (delivery.status === "on_the_way") {
            const progressToAdd = Math.min(100 - delivery.progress, secondsPassed * 4); // +4% de progresso por segundo
            updatedProgress = delivery.progress + progressToAdd;

            if (updatedProgress >= 90 && delivery.progress < 90) {
              notifications.push({
                id: "notif-" + Date.now() + "-arrive",
                title: "Entregador Próximo",
                message: `Se prepare! O entregador ${delivery.courierName} está a menos de 2 minutos de você.`,
                time: new Date().toISOString()
              });
            }

            if (updatedProgress >= 100) {
              updatedProgress = 100;
              updatedStatus = "delivered";
              notifications.push({
                id: "notif-" + Date.now() + "-delivered",
                title: "Pedido Entregue",
                message: `Entrega realizada com sucesso. Avalie o entregador e ganhe pontos extras!`,
                time: new Date().toISOString()
              });

              // Atualiza status do entregador de volta para "available"
              try {
                await updateDoc(doc(db, "couriers", delivery.courierId), { status: "available" });
              } catch(e) {}
            }
          }

          // Interpolação de coordenadas com jitter
          const ratio = updatedProgress / 100;
          const lat = delivery.startLat + ratio * (delivery.endLat - delivery.startLat);
          const lng = delivery.startLng + ratio * (delivery.endLng - delivery.startLng);

          // Diferença de tempo estimada diminui
          const remainingMinutes = Math.max(0, Math.ceil(delivery.etaMinutes * (1 - ratio)));

          const updatedData = {
            status: updatedStatus,
            progress: updatedProgress,
            currentLat: lat,
            currentLng: lng,
            etaMinutes: remainingMinutes,
            notifications,
            updatedAt: new Date().toISOString()
          };

          await updateDoc(deliveryRef, updatedData);
          return res.json({ ...delivery, ...updatedData });
        }
      }

      res.json(delivery);
    } catch (err: any) {
      console.error("Erro ao obter entrega:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Atualizar status manualmente (Utilizado pelo Dashboard do Entregador)
  app.post("/api/delivery/orders/:id/update-status", async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      const deliveryRef = doc(db, "deliveries", orderId);
      const snap = await getDoc(deliveryRef);

      if (!snap.exists()) {
        return res.status(404).json({ error: "Entrega não localizada." });
      }

      const delivery = snap.data() as any;
      const notifications = [...(delivery.notifications || [])];
      let progress = delivery.progress;

      if (status === "accepted") {
        progress = 10;
        notifications.push({
          id: "notif-" + Date.now() + "-accept",
          title: "Aceito pelo Entregador",
          message: `O entregador ${delivery.courierName} aceitou seu pedido e está indo retirar suas hortaliças frescas.`,
          time: new Date().toISOString()
        });
      } else if (status === "on_the_way") {
        progress = 25;
        notifications.push({
          id: "notif-" + Date.now() + "-pickup",
          title: "Retirado & Em Trânsito",
          message: `Seu pedido foi coletado por ${delivery.courierName} e está a caminho de bicicleta/moto.`,
          time: new Date().toISOString()
        });
      } else if (status === "delivered") {
        progress = 100;
        notifications.push({
          id: "notif-" + Date.now() + "-complete",
          title: "Entregue!",
          message: `O entregador ${delivery.courierName} acaba de entregar seu pedido fresco. Bom apetite!`,
          time: new Date().toISOString()
        });

        // Libera entregador
        try {
          await updateDoc(doc(db, "couriers", delivery.courierId), { status: "available" });
        } catch(e) {}
      }

      const updatedData = {
        status,
        progress,
        notifications,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(deliveryRef, updatedData);
      res.json({ ...delivery, ...updatedData });
    } catch (err: any) {
      console.error("Erro ao atualizar status de entrega:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Enviar avaliação de entrega e re-calcular nota média do entregador
  app.post("/api/delivery/orders/:id/rate", async (req, res) => {
    try {
      const orderId = req.params.id;
      const { rating, comment } = req.body;

      if (!rating) {
        return res.status(400).json({ error: "Nota é obrigatória" });
      }

      const deliveryRef = doc(db, "deliveries", orderId);
      const dSnap = await getDoc(deliveryRef);

      if (!dSnap.exists()) {
        return res.status(404).json({ error: "Entrega não encontrada para avaliar." });
      }

      const delivery = dSnap.data();

      // Grava a avaliação no documento de entrega
      await updateDoc(deliveryRef, {
        rating: Number(rating),
        reviewText: comment || ""
      });

      // Se houver entregador atribuído, recalcula a nota média dele
      if (delivery.courierId) {
        const courierRef = doc(db, "couriers", delivery.courierId);
        const cSnap = await getDoc(courierRef);
        if (cSnap.exists()) {
          const courier = cSnap.data();
          const count = (courier.ratingCount || 1) + 1;
          const freshRating = parseFloat((((courier.rating || 5.0) * (courier.ratingCount || 1) + Number(rating)) / count).toFixed(2));
          await updateDoc(courierRef, {
            rating: freshRating,
            ratingCount: count
          });
        }
      }

      res.json({ success: true, rating, comment });
    } catch (err: any) {
      console.error("Erro ao avaliar entrega:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ================================================

  // Create HTTP server
  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Setup WebSocket Server for LiveAssistant
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  wss.on("connection", async (clientWs) => {
    let session: any = null;
    
    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (error: any) => {
            console.error("Gemini context error:", error);
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ error: "Conexão com IA falhou" }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.close();
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }, // Female sounding voice for "Malu"
          },
          systemInstruction: "Você é a Malu, uma assistente pessoal e Coach de Saúde. Fale em português brasileiro de forma natural. Seja muito amigável, concisa e direta, pois o usuário está conversando por voz através da API Live.",
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (err) {
          console.error("Error processing client WS message:", err);
        }
      });

      clientWs.on("close", () => {
        if (session) {
          try {
            session.close();
          } catch(e) {}
        }
      });
      
    } catch (err) {
      console.error("Error starting Gemini Live session:", err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ error: "Falha ao conectar - verifique a API Key no Settings" }));
        clientWs.close();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer().catch(console.error);
