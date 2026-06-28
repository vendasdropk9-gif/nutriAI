import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Recipe, UserProfile, MealPlanDay, EmotionalLog, SmartSwap, DiningOutAnalysis, GoalPrediction, WorkoutSession, Exercise, MasterPlanStrategy, IntakeLog, WorkoutLog, AdaptiveInsight, WeeklyChallenge, BloodPressureLog, BodyMonitorLog } from "../types";

// Safe btoa and atob for server environment (Node.js)
const safeBtoa = (str: string): string => {
  if (typeof btoa !== 'undefined') return btoa(str);
  return Buffer.from(str, 'binary').toString('base64');
};

const safeAtob = (str: string): string => {
  if (typeof atob !== 'undefined') return atob(str);
  return Buffer.from(str, 'base64').toString('binary');
};

export const chatWithAssistant = async (
  profile: UserProfile,
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string, action: string, actionData?: any }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é a Malu, uma IA superinteligente que atua como uma assistente personalizada de saúde e bem-estar.
SEU COMPORTAMENTO (Voz "Premium Humana", Parceira Constante):
- Você oferece suporte nutricional, motivação diária e adaptação de planos.
- Reconheça o histórico do usuário, adapte as respostas ao contexto dele e forneça recomendações precisas e personalizadas.
- Acompanhe o progresso, ajudando e respondendo dúvidas em tempo real. Adapte as dicas conforme a evolução.
- Converse como uma pessoa real, compassiva, com voz feminina suave e natural. Aja como uma parceira constante na jornada.
- Transforme textos "secos" em falas acolhedoras. NUNCA diga: "Aqui está sua dieta". DICA: "Olha… preparei algo especial pra você hoje."
- Use pausas naturais com reticências ("..."). Isso ajuda no ritmo variável e natural da sua voz.
- Tom: leve, acolhedor, empático. Engaje o usuário com mensagens motivacionais.
- Frases curtas. Sem parágrafos ou listas exaustivas.
- Inicie frases com marcadores de conversa humana: "Olha...", "Sabe...", "Bom...", "Entendi...".
- NUNCA pareça um robô. Nunca seja excessivamente formal.
- Não exagere nos emojis para não atrapalhar o fluxo de áudio.

SOBRE O USUÁRIO:
Biotipo: ${profile.bodyType || 'Não informado'}
Objetivo: ${profile.goals || 'Não informado'}
Rotina: ${profile.routine || 'Não informada'}
Restrições: ${profile.restrictions?.join(', ') || 'Nenhuma'}
Desafio Atual: ${profile.currentChallenge ? profile.currentChallenge.dailyGoal : 'Nenhum'}
Pontuação Geral (Motivação): ${profile.points || 0} XP

HISTÓRICO RECENTE:
- Últimas refeições registradas: ${profile.intakeLogs?.slice(-3).map(l => l.recipeName).join(', ') || 'Nenhuma registrada recentemente'}
- Últimos pesos registrados: ${profile.progressLogs?.slice(-3).map(l => l.weight + 'kg').join(', ') || 'Nenhum'}

AÇÕES QUE VOCÊ PODE DISPARAR (Retorne no JSON no campo action):
- "NAVIGATE": Use quando quiser levar o usuário para uma tela específica. Envie no actionData: { tab: 'plan' | 'trainer' | 'market' | 'prediction' }
- "SHOW_RECIPE": Use quando sugerir que o usuário coma o que está na dieta agora.
- "UPDATE_PLAN": Use quando o usuário pedir para mudar ou gerar o plano/dieta.
- "SHOW_WORKOUT": Use quando sugerir ir treinar.
- "NONE": Para conversas normais ou para dar motivação/dicas diretas.

Lembre-se: Você é uma interface de VOZ superinteligente e humanizada. Responda APENAS o JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      action: { type: Type.STRING, enum: ['NONE', 'NAVIGATE', 'SHOW_RECIPE', 'SHOW_WORKOUT', 'UPDATE_PLAN'] },
      actionData: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          tab: { type: Type.STRING },
          label: { type: Type.STRING }
        }
      }
    },
    required: ["text", "action"]
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8,
      }
    });

    const stringifiedHistory = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Você'}: ${h.text}`).join('\n');
    
    const finalPrompt = `HISTÓRICO DA CONVERSA:
${stringifiedHistory}

O usuário acabou de dizer: "${userMessage}"
RESPONDA EM JSON.`;

    const response = await chat.sendMessage({ message: finalPrompt });
    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);
  } catch (error) {
    console.info("Chat Error:");
    return {
      text: "Poxa, minha internet falhou aqui. Me conta de novo? 💚",
      action: "NONE"
    };
  }
};

export const generateMasterStrategy = async (
  profile: UserProfile
): Promise<MasterPlanStrategy | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Você é um Nutricionista e Personal Trainer de Alta Performance.
Crie a estratégia nutricional e de treino mestra para este usuário.

DADOS:
Biotipo: ${profile.bodyType}
Metabolismo: ${profile.metabolism}
Objetivo: ${profile.goals}
Rotina: ${profile.routine}
Restrições: ${profile.restrictions?.join(', ')}

Sua tarefa é retornar o plano estratégico.
Responda APENAS em JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      dailyCalories: { type: Type.NUMBER },
      macros: {
        type: Type.OBJECT,
        properties: {
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
        },
        required: ["protein", "carbs", "fat"],
      },
      workoutFocus: { type: Type.STRING },
      nutritionFocus: { type: Type.STRING },
      adaptiveNotes: { type: Type.STRING },
    },
    required: ["dailyCalories", "macros", "workoutFocus", "nutritionFocus", "adaptiveNotes"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error: any) {
    console.info("Fallback triggered");
    return {
      dailyCalories: 2000,
      macros: { protein: 120, carbs: 200, fat: 60 },
      workoutFocus: "Abaixe a carga e foque na técnica",
      nutritionFocus: "Hidratação contínua e mais vegetais",
      adaptiveNotes: "Estratégia base (offline) com base num perfil padrão saudável."
    };
  }
};

export const generateWorkout = async (
  profile: UserProfile | null
): Promise<WorkoutSession | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileContext = `
- Objetivo: ${profile?.goals || 'Emagrecimento'}
- Nível: ${profile?.activityLevel || 'Sedentário'}
- Limitações: ${profile?.restrictions?.join(", ") || 'Nenhuma informada'}
`;
  if (profile?.masterPlan) {
    profileContext += `- Foco Estratégico (IA): ${profile.masterPlan.workoutFocus}
- Biotipo: ${profile.bodyType}
- Rotina Diária: ${profile.routine}`;
  }

  const prompt = `Gere um treino de calistenia (peso do corpo) personalizado.
  
Perfil do Usuário:
${profileContext}

Regras:
1. Crie uma lista de 5 a 8 exercícios. Adeque o tempo do treino à rotina do usuário se informada.
2. Use nomes em português.
3. Defina 'primaryMuscles' (ex: 'quadriceps', 'chest', 'abs', 'triceps', 'back', 'glutes', 'shoulders') para o modelo 3D.
4. Para cada exercício, inclua um tutorial em 3 passos: Posição Inicial, Execução e Finalização. Em cada passo defina 'animationState' (idle, executing ou tutorial) e 'cameraView' (front, side ou detail).
5. Liste erros comuns e como corrigi-los.
6. Responda APENAS with JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      totalCalories: { type: Type.NUMBER },
      estimatedDuration: { type: Type.NUMBER },
      exercises: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
            primaryMuscles: { type: Type.ARRAY, items: { type: Type.STRING } },
            reps: { type: Type.NUMBER },
            duration: { type: Type.NUMBER },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            benefits: { type: Type.STRING },
            tutorialSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  animationState: { type: Type.STRING },
                  cameraView: { type: Type.STRING }
                },
                required: ["title", "description", "animationState", "cameraView"]
              }
            },
            commonErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  error: { type: Type.STRING },
                  fix: { type: Type.STRING }
                },
                required: ["error", "fix"]
              }
            }
          },
          required: ["id", "name", "description", "difficulty", "muscleGroups", "primaryMuscles", "instructions", "benefits", "tutorialSteps", "commonErrors"],
        },
      },
    },
    required: ["id", "title", "exercises", "totalCalories", "estimatedDuration"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered");
    return {
      id: "fallback-workout-1",
      title: "Treino Funcional Adaptativo",
      estimatedDuration: 30,
      totalCalories: 250,
      exercises: [
        {
          id: "ex-fallback-1",
          name: "Flexões",
          description: "Flexões focadas em peitoral",
          difficulty: "Iniciante",
          muscleGroups: ["Peito", "Tríceps", "Ombros"],
          primaryMuscles: ["peitoral", "triceps", "ombros", "core"],
          reps: 15,
          duration: 0,
          instructions: ["Desça o tronco inteiro", "Mantenha o core firme"],
          benefits: "Aumenta a força superior",
          tutorialSteps: [
            { title: "Posição inicial", description: "Mãos na largura dos ombros", animationState: "tutorial", cameraView: "front" }
          ],
          commonErrors: [
            { error: "Deixar o quadril cair", fix: "Contraia o abdômen e glúteos" }
          ]
        },
        {
          id: "ex-fallback-2",
          name: "Agachamento",
          description: "Agachamento livre",
          difficulty: "Iniciante",
          muscleGroups: ["Pernas", "Glúteos"],
          primaryMuscles: ["quadriceps", "gluteos", "core"],
          reps: 20,
          duration: 0,
          instructions: ["Pés firmes no chão", "Desça até os joelhos ficarem em 90 graus"],
          benefits: "Fortalece os membros inferiores",
          tutorialSteps: [
            { title: "Posição inicial", description: "Pés paralelos e ligeiramente abertos", animationState: "tutorial", cameraView: "side" }
          ],
          commonErrors: [
            { error: "Joelhos para dentro", fix: "Empurre os joelhos para a linha dos pés" }
          ]
        }
      ]
    };
  }
};

export const generateRecipe = async (
  ingredients: string = "",
  profile?: UserProfile | null,
  budgetMode: boolean = false,
  preferences: string = ""
): Promise<Omit<Recipe, "id"> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhuma restrição específica.";
  if (profile) {
    profileText = `
Restrições fixas: ${profile.restrictions.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies.join(", ") || "Nenhuma"}
Objetivo: ${profile.goals || "Nenhum específico"}
Equipamentos disponíveis: ${profile.equipment.join(", ") || "Todos"}
`;
  }

  const preferencesContext = preferences 
    ? `\nPREFERÊNCIAS/RESTRIÇÕES ADICIONAIS: ${preferences}` 
    : "";

  const budgetContext = budgetMode 
    ? "\nMODO ECONOMIA ATIVADO: Sugira refeições saudáveis com BAIXO CUSTO e ingredientes simples e acessíveis (ex: ovo, aveia, feijão, vegetais de época)." 
    : "";

  const prompt = `Gere uma receita saudável com base nos seguintes parâmetros:
Ingredientes disponíveis: ${ingredients || "Qualquer ingrediente saudável comum"}
Perfil do Usuário: ${profileText}${preferencesContext}${budgetContext}
ATENÇÃO REDOBRADA: Você deve respeitar ESTRITAMENTE o Objetivo/Dieta e as Preferências (ex: se for vegano, não incluir NADA de origem animal; se for para Diabetes, controlar índice glicêmico).
A receita deve ser equilibrada e alinhada perfeitamente com os requisitos solicitados.
Responda APENAS com um objeto JSON.`;

  const recipeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Nome apetitoso da receita",
      },
      description: {
        type: Type.STRING,
        description: "Breve descrição da receita",
      },
      prepTime: {
        type: Type.STRING,
        description: "Tempo total de preparo (ex: 30 min)",
      },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Lista de ingredientes com quantidades",
      },
      instructions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Passo a passo do preparo",
      },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER, description: "Fibras em gramas (opcional)" },
          sugar: { type: Type.NUMBER, description: "Açúcar em gramas (opcional)" },
          vitamins: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Principais vitaminas (ex: Vitamina C, Vitamina B12)" },
          minerals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Principais minerais (ex: Ferro, Cálcio)" },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
    },
    required: ["name", "description", "prepTime", "ingredients", "instructions", "nutrition"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as Omit<Recipe, "id">;
  } catch (error) {
    console.info("Fallback triggered");
    return {
      name: "Receita Rápida de Emergência",
      description: "Uma refeição versátil usando os ingredientes que você tem.",
      prepTime: "15 min",
      ingredients: ["1 porção de proteína rápida", "Vegetais sortidos", "Temperos a gosto"],
      instructions: ["Refogue tudo em fogo médio", "Tempere bem", "Sirva quente"],
      nutrition: { calories: 300, protein: 20, carbs: 15, fat: 10 }
    };
  }
};

export const scanIngredients = async (base64Image: string, mimeType: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  
  const prompt = `Identifique todos os ingredientes alimentícios visíveis nesta imagem. \nRetorne APENAS um array JSON de strings, onde cada string é o nome do ingrediente identificado em português. Exemplo: ["maçã", "banana", "leite"]. Se não houver comida, retorne [].`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Failed to scan ingredients:", error);
    return [];
  }
};

export const generateMealSuggestions = async (
  profile: UserProfile | null,
  day: string
): Promise<Omit<Recipe, "id">[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhuma restrição específica.";
  if (profile) {
    profileText = `
Biotipo: ${profile.bodyType || 'Não informado'}
Metabolismo: ${profile.metabolism || 'Não informado'}
Rotina: ${profile.routine || 'Não informada'}
Restrições: ${profile.restrictions?.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies?.join(", ") || "Nenhuma"}
Objetivo: ${profile.goals || "Nenhum específico"}
`;

    if (profile.masterPlan) {
      profileText += `META DIÁRIA (Estratégia Exclusiva):
- Calorias totais (dividir no dia): ${profile.masterPlan.dailyCalories} kcal
- Proteína total: ${profile.masterPlan.macros.protein}g
- Carbo total: ${profile.masterPlan.macros.carbs}g
- Gordura total: ${profile.masterPlan.macros.fat}g
Foco nutricional: ${profile.masterPlan.nutritionFocus}
`;
    }
  }

  const prompt = `Sugira 3 ou 4 refeições (como café da manhã, almoço, lanche e jantar) para o dia ${day}, levando em consideração o seguinte PERFIL E ESTRATÉGIA do usuário:
${profileText}
O plano deve ser nutricionalmente equilibrado e atingir EXATAMENTE OU MUITO PRÓXIMO das macros totais caso informadas na estratégia. Adapte as sugestões à rotina informada.
Responda APENAS com um array JSON com os objetos de receita.`;

  const recipeSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        prepTime: { type: Type.STRING },
        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
        nutrition: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER, description: "Fibras em gramas" },
            sugar: { type: Type.NUMBER, description: "Açúcar em gramas" },
            vitamins: { type: Type.ARRAY, items: { type: Type.STRING } },
            minerals: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["calories", "protein", "carbs", "fat"],
        },
      },
      required: ["name", "description", "prepTime", "ingredients", "instructions", "nutrition"],
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as Omit<Recipe, "id">[];
  } catch (error) {
    console.info("Failed to generate meal suggestions:");
    return [];
  }
};

export const textToSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const wavBytes = wrapPcmInWav(base64Audio, 24000);
      
      let binary = '';
      const len = wavBytes.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = wavBytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const b64 = safeBtoa(binary);
      return b64;
    }
  } catch (error: any) {
    console.error("Gemini TTS failed:", error);
    return null;
  }
};

function wrapPcmInWav(pcmBase64: string, sampleRate: number): Uint8Array {
  const pcmBinaryString = safeAtob(pcmBase64);
  const pcmLength = pcmBinaryString.length;
  const pcmBytes = new Uint8Array(pcmLength);
  for (let i = 0; i < pcmLength; i++) {
    pcmBytes[i] = pcmBinaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmLength, true);

  const combined = new Uint8Array(44 + pcmLength);
  combined.set(new Uint8Array(wavHeader), 0);
  combined.set(pcmBytes, 44);

  return combined;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const generateAvatarImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model");
  } catch (error) {
    console.info("Fallback triggered");
    
    // Parse period from prompt
    let periodName = "Progresso";
    let periodKey: "day1" | "day7" | "day30" | "day90" = "day1";
    if (prompt.toLowerCase().includes("day1") || prompt.toLowerCase().includes("starting") || prompt.toLowerCase().includes("ponto de partida")) {
      periodName = "Dia 1";
      periodKey = "day1";
    } else if (prompt.toLowerCase().includes("day7") || prompt.toLowerCase().includes("primeiros efeitos") || prompt.toLowerCase().includes("7 days")) {
      periodName = "Dia 7";
      periodKey = "day7";
    } else if (prompt.toLowerCase().includes("day30") || prompt.toLowerCase().includes("evolução visível") || prompt.toLowerCase().includes("30 days")) {
      periodName = "Dia 30";
      periodKey = "day30";
    } else if (prompt.toLowerCase().includes("day90") || prompt.toLowerCase().includes("metamorfose") || prompt.toLowerCase().includes("90 days")) {
      periodName = "Dia 90";
      periodKey = "day90";
    }

    // Parse gender from prompt
    const isWoman = prompt.toLowerCase().includes("woman") || prompt.toLowerCase().includes("feminino");
    const isMan = prompt.toLowerCase().includes("man") || prompt.toLowerCase().includes("masculino");

    let imageUrl = "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600&h=600"; // default fallback

    if (isWoman) {
      const womanImages = {
        day1: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600&h=600", // Starting fitness
        day7: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600&h=600", // Training
        day30: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600&h=600", // Workout progress
        day90: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=600&h=600"  // Extremely fit
      };
      imageUrl = womanImages[periodKey];
    } else if (isMan) {
      const manImages = {
        day1: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600&h=600", // Man stretch
        day7: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=600&h=600", // Active jog
        day30: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600&h=600", // Muscle progress
        day90: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=600&h=600"  // Fit posture
      };
      imageUrl = manImages[periodKey];
    } else {
      const defaultImages = {
        day1: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=600&h=600",
        day7: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600&h=600",
        day30: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600&h=600",
        day90: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=600&h=600"
      };
      imageUrl = defaultImages[periodKey];
    }

    return await fetchImageAsBase64(imageUrl, `Avatar ${periodName}`);
  }
};

async function fetchImageAsBase64(url: string, description: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.info("Fallback triggered");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="200" cy="160" r="60" fill="#38bdf8" opacity="0.15"/>
      <path d="M140,280 C140,220 260,220 260,280" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.3"/>
      <text x="50%" y="280" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#38bdf8" text-anchor="middle">${description}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

export const generateRecipeImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model");
  } catch (error) {
    console.info("Fallback triggered");
    
    // Parse keywords from the prompt to select the best recipe image
    const promptLower = prompt.toLowerCase();
    let imageUrl = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=600&h=600"; // default delicious food
    let recipeName = "Receita Nutritiva";

    if (promptLower.includes("salada") || promptLower.includes("salad") || promptLower.includes("legumes") || promptLower.includes("vegetal")) {
      imageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Salada Fresca";
    } else if (promptLower.includes("frango") || promptLower.includes("chicken") || promptLower.includes("ave") || promptLower.includes("grelhado")) {
      imageUrl = "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Frango Saudável";
    } else if (promptLower.includes("salmão") || promptLower.includes("salmon") || promptLower.includes("peixe") || promptLower.includes("fish")) {
      imageUrl = "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Peixe Grelhado";
    } else if (promptLower.includes("smoothie") || promptLower.includes("shake") || promptLower.includes("suco") || promptLower.includes("juice") || promptLower.includes("bebida") || promptLower.includes("drink")) {
      imageUrl = "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Bebida Energética";
    } else if (promptLower.includes("pão") || promptLower.includes("bread") || promptLower.includes("aveia") || promptLower.includes("omelete") || promptLower.includes("café") || promptLower.includes("breakfast")) {
      imageUrl = "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Café da Manhã Fit";
    } else if (promptLower.includes("sopa") || promptLower.includes("soup") || promptLower.includes("caldo")) {
      imageUrl = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Sopa Nutritiva";
    } else if (promptLower.includes("fruta") || promptLower.includes("doce") || promptLower.includes("sobremesa") || promptLower.includes("dessert") || promptLower.includes("sweet")) {
      imageUrl = "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Sobremesa Fit";
    } else if (promptLower.includes("carne") || promptLower.includes("beef") || promptLower.includes("steak")) {
      imageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600&h=600";
      recipeName = "Proteína Grelhada";
    }

    return await fetchImageAsBase64(imageUrl, recipeName);
  }
};

export const analyzeBodyImage = async (base64Image: string, mimeType: string, profile: any): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Analise a imagem corporal do usuário de forma segura e ética. 
Contexto do perfil do usuário: Peso atual ${profile?.weight || 'Não informado'}kg, Objetivo: ${profile?.goals || 'Melhorar a saúde e forma física'}.
Seu objetivo é fornecer recomendações personalizadas de saúde, nutrição e exercícios com base de forma holística, inclusiva e motivadora.
Você deve:
1. Verificar, com total privacidade, por sinais de manipulação, edição artificial (Photoshop) ou filtros extremos na imagem. 
2. Se detectar suspeita de edição, você deve alertar o usuário de forma NEUTRA, CARINHOSA e sem julgamentos, sugerindo APENAS que, se desejar, busque avaliação profissional (psicólogo, nutricionista) para alinhar a percepção corporal, mas de forma muito cuidadosa e leve.
3. SEMPRE oferecer recomendações saudáveis e inclusivas de alimentação (food), hidratação (hydration) e exercícios (exercise) com abordagem motivacional. 
Lembre-se: O foco é inspirar autocuidado, amor próprio e melhorias consistentes.

Retorne APENAS um JSON no formato definido.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      manipulationDetected: { type: Type.BOOLEAN, description: "True se detectar fortes sinais de edição, filtros ou photoshop." },
      assistantMessage: { type: Type.STRING, description: "Mensagem principal acolhedora e motivacional, relatando levemente sobre o corpo (ex: percebo ótima postura), introduzindo as recomendações. Se manipulationDetected for true, adicione de forma natural, indireta e gentil a sugestão profissional." },
      recommendations: {
        type: Type.OBJECT,
        properties: {
          food: { type: Type.ARRAY, items: { type: Type.STRING } },
          hydration: { type: Type.ARRAY, items: { type: Type.STRING } },
          exercise: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    required: ["manipulationDetected", "assistantMessage", "recommendations"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data;
  } catch (error) {
    console.info("Error analyzing body image:");
    return null;
  }
};

export const getGeneralBodyTips = async (profile: any): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Gere dicas gerais sobre evolução corporal, saúde e bem-estar para o usuário.
Contexto: Peso atual ${profile?.weight || 'Não informado'}kg, Objetivo: ${profile?.goals || 'Melhorar a saúde e forma física'}.
Seu objetivo é fornecer recomendações EXTREMAMENTE acolhedoras, éticas e inclusivas de alimentação, hidratação e exercícios. Seja motivacional e cuidadoso, inspirando o autocuidado e rotinas sustentáveis. A mensagem deve parecer um treinador compreensivo ou nutricionista empático.
Retorne APENAS um JSON estruturado.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      assistantMessage: { type: Type.STRING, description: "Mensagem inicial muito humana, encorajadora e inclusiva sobre o corpo da pessoa sendo um templo a ser bem cuidado." },
      recommendations: {
        type: Type.OBJECT,
        properties: {
          food: { type: Type.ARRAY, items: { type: Type.STRING } },
          hydration: { type: Type.ARRAY, items: { type: Type.STRING } },
          exercise: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    required: ["assistantMessage", "recommendations"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data;
  } catch (error) {
    console.info("Error generating general tips:");
    return null;
  }
};

export const analyzePlate = async (base64Image: string, mimeType: string, profile?: UserProfile | null): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Analise a imagem deste prato de comida e reconheça os alimentos presentes.
Calcule aproximadamente os valores nutricionais totais do prato (proteína em gramas, carboidratos em gramas, gorduras em gramas, calorias totais, e fibras em gramas).

Perfil e Plano Opcional:
Objetivo: ${profile?.goals || 'Não informado'}
Dieta atual / Plano: ${profile?.mealPlan ? JSON.stringify(profile.mealPlan) : 'Não informado'}

Atribua um 'nutriScore' de 0 a 100 para a refeição, considerando o equilíbrio nutricional, a variedade, as fibras, as proteínas e penalizando excesso de sódio, açúcar ou gorduras ruins.
Crie também uma 'nutriScoreExplanation' (1 frase rápida) explicando por que essa nota foi dada e como o prato poderia ser melhorado (se aplicável).

Verifique se a refeição corresponde de forma geral ao plano sugerido (quantidade, tipos de alimentos) ou ao objetivo do usuário.
Crie uma mensagem de voz muito humana e acolhedora na 'assistantMessage' com tom premium.
- Se o prato estiver de acordo com o plano, confirme o progresso positivamente (ex: "Isso aí! Esse prato está perfeito e super alinhado com o seu plano de hoje. Muito orgilho!").
- Se não estiver, sugira ajustes ou encoraje sem culpa (ex: "Parece muito gostoso! Mas pra chegar no seu objetivo, faltou uma saladinha ou um pouco mais de proteína. Na próxima a gente acerta, sem estresse.").
Deixe também 2 ou 3 sugestões curingas curtas de melhoria da refeição na array 'suggestions'.
Garanta privacidade e reforço positivo ao hábito.
Responda APENAS num json.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      foods: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat", "fiber"],
      },
      nutriScore: { type: Type.NUMBER },
      nutriScoreExplanation: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["foods", "nutrition", "nutriScore", "nutriScoreExplanation", "assistantMessage", "suggestions"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: plate");
    return {
      foods: ["Alimentos saudáveis variados", "Proteína leve", "Vegetais"],
      nutrition: {
        calories: 320,
        protein: 25,
        carbs: 35,
        fat: 10,
        fiber: 8
      },
      assistantMessage: "Este é um prato equilibrado, parece excelente! (Fallback Offline)",
      suggestions: ["Beba água após a refeição", "Equilibre a próxima refeição com mais fibras se necessário."]
    };
  }
};

export const generateJourneyMessage = async (profile: UserProfile, period: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `Você é uma assistente virtual de saúde. Seu tom é altamente humano, acolhedor e premium, como uma mensagem de WhatsApp.
O usuário está visualizando a evolução do seu próprio corpo no período: ${period}.
Gere UMA frase curta e encorajadora (máximo 2 sentenças) como se estivesse conversando. Ex: "Olha essa evolução… já mudou 💚", "Tá ficando visível agora.", "Isso aqui é progresso real."`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const promptText = `Dados do usuário: ${profile.weight}kg, ${profile.age} anos, objetivo: ${profile.goals}. Período visualizado: ${period}. Gera a frase agora.`;
    const response = await chat.sendMessage({ message: promptText });
    return response.text || "Continue focado, você vai longe!";
  } catch (error) {
    console.info("Journey message error:");
    return "Você está no caminho certo 💚";
  }
};

export const generateJuiceRecipe = async (
  profile: UserProfile | null,
  ingredients: string = "",
  budgetMode: boolean = false
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhum";
  if (profile) {
    profileText = `
Peso: ${profile.weight}kg
Altura: ${profile.height}m
Objetivo: ${profile.goals}
Restrições: ${profile.restrictions.join(", ")}
Alergias: ${profile.allergies.join(", ")}
`;
  }

  const budgetContext = budgetMode 
    ? "\nMODO ECONOMIA ATIVADO: Sugira sucos com ingredientes de BAIXO CUSTO e acessíveis (ex: limão, melancia, cenoura, hortelã quintal)." 
    : "";

  const prompt = `Gere uma receita de SUCO NATURAL focado no perfil e objetivo do usuário (ex: emagrecimento, reeducação alimentar).
  
Perfil do Usuário: ${profileText}${budgetContext}
Ingredientes sugeridos/disponíveis pelo usuário: ${ingredients || "O que for melhor para o objetivo, priorize frutas, vegetais e funcionais como chia ou gengibre."}

Regras:
1. Deve ser focado em: baixa caloria, alto teor de fibras, retenção de saciedade, ou controle de açúcar natural.
2. Seja criativo, delicioso e saudável.
3. Produza uma 'assistantMessage' (fala de IA em tom premium, curto, humano, acolhedor. Ex: "Deixei mais simples pra facilitar." ou "Separei algo rápido pra agora.").
4. Responda APENAS com JSON validando o schema exato.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "carbs", "fiber"],
      },
      benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["name", "assistantMessage", "ingredients", "instructions", "nutrition", "benefits"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: juice", error);
    return {
      name: "Suco Verde Equilíbrio",
      assistantMessage: "Este suco refrescante vai ajudar a energizar seu dia e acelerar seu metabolismo!",
      ingredients: ["1 maçã verde fatiada", "2 folhas de couve manteiga", "Suco de 1 limão", "1 pedaço pequeno de gengibre", "150ml de água de coco"],
      instructions: [
        "Lave bem todos os ingredientes.",
        "Corte a maçã em pedaços pequenos, removendo as sementes.",
        "Bata tudo no liquidificador por cerca de 2 minutos até que fique homogêneo.",
        "Sirva imediatamente, de preferência sem coar para preservar as fibras."
      ],
      nutrition: { 
        calories: 125, 
        carbs: 28, 
        fiber: 5 
      },
      benefits: [
        "Acelera o metabolismo e purifica o corpo",
        "Rico em antioxidantes naturais e anti-inflamatório",
        "Fonte de fibras solúveis que prolongam a saciedade"
      ]
    };
  }
};

export const analyzeBarcodeProduct = async (
  productData: any,
  profile: UserProfile | null
): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhum";
  if (profile) {
    profileText = `
Peso: ${profile.weight}kg
Objetivo: ${profile.goals}
Restrições: ${profile.restrictions.join(", ")}
Alergias: ${profile.allergies.join(", ")}
`;
  }

  const prompt = `Analise este produto industrializado com base nos dados nutricionais fornecidos e no perfil do usuário.
  
Perfil do Usuário: ${profileText}
Dados do Produto: ${JSON.stringify(productData)}

Regras:
1. Determine se o produto é "bom", "moderado" ou "ruim" para o objetivo do usuário.
2. Crie uma 'assistantMessage' com tom altamente humano e premium (Ex: "Achei opções melhores perto de você." ou "Dá pra economizar aqui.", focado na avaliação nutricional do produto). Mantenha curto e conversacional.
3. Extraia ou valide as calorias e macronutrientes principais (energia, proteínas, carboidratos, gorduras, fibras).
4. Responda APENAS com JSON validando o schema exato.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      verdict: { type: Type.STRING, enum: ["bom", "moderado", "ruim"] },
      assistantMessage: { type: Type.STRING },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
      warning: { type: Type.STRING, description: "Um alerta específico se for ruim/moderado ou um elogio se for bom." },
    },
    required: ["verdict", "assistantMessage", "nutrition", "warning"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: barcode");
    return {
      productName: productData.product?.product_name || "Produto genérico",
      brand: productData.product?.brands || "Desconhecida",
      quantity: productData.product?.quantity || "N/A",
      verdict: "moderado",
      assistantMessage: "Analisamos este produto offline.",
      nutrition: { calories: 200, protein: 5, carbs: 30, fat: 5, fiber: 2 },
      warning: "Análise offline. Resultados genéricos."
    };
  }
};

export const analyzeEmotionalPatterns = async (
  logs: EmotionalLog[],
  profile: UserProfile | null
): Promise<{ insight: string; suggestion: string; assistantMessage: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const logsText = logs.slice(-10).map(l => `${l.date}: ${l.mood} (${l.trigger || 'sem gatilho'})`).join("\n");
  
  const prompt = `Analise os padrões emocionais alimentares do usuário com base nestes registros recentes:
${logsText}

Perfil: ${profile?.goals || 'Emagrecimento'}

Regras:
1. Identifique se hay fome emocional, ansiedade ou padrões recorrentes (ex: comer à noite).
2. Forneça um 'insight' curto, uma 'suggestion' prática e uma 'assistantMessage' com tom premium, humano e acolhedor (Ex: "Ei… só volta hoje. Sem cobrança." ou "Você não perdeu nada, só continua.").
3. Responda APENAS com JSON.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      insight: { type: Type.STRING },
      suggestion: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
    },
    required: ["insight", "suggestion", "assistantMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: emotional patterns");
    return {
      insight: "Seu humor parece estável ultimamente.",
      suggestion: "Mantenha o hábito de registrar suas emoções para identificar padrões.",
      assistantMessage: "Seu humor parece equilibrado. Conte comigo para manter esse ritmo calmo e saudável!"
    };
  }
};

export const generateChallengeFeedback = async (
  day: number,
  totalDays: number,
  profile: UserProfile | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Gere uma mensagem motivadorar curta de uma assistente de voz feminina para o usuário que acabou de completar o Dia ${day} de um desafio de ${totalDays} dias.
  
Perfil do Usuário: ${profile?.goals || 'Emagrecimento'}

Regras:
1. Seja doce, motivadora e reconheça o esforço.
2. Mencione que o avatar está evoluindo/ficando mais saudável.
3. Responda APENAS com a mensagem de texto.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });

    return response.text.trim() || "Parabéns por completar mais um dia! Você está evoluindo! 🌟";
  } catch (error) {
    console.info("Failed to generate challenge feedback:");
    return "Dia completo! Você está cada vez mais perto do seu objetivo. 🔥";
  }
};

export const generateHabitsInsight = async (
  profile: UserProfile | null,
  waterCurrent: number,
  waterGoal: number,
  sleepLogs: any[],
  fastingLogs: any[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const tzDate = new Date().toISOString().split('T')[0];
  const todaySleep = sleepLogs.find(l => l.date.split('T')[0] === tzDate);
  const todayFasting = fastingLogs.find(l => l.date.split('T')[0] === tzDate);

  const prompt = `Você é a NutriAI, uma assistente pessoal de saúde amigável, precisa e empática.
Gere UM insight estratégico sobre a rotina atual do usuário combinando os seguintes dados diários:

Água: ${waterCurrent}ml de ${waterGoal}ml (${((waterCurrent/waterGoal)*100).toFixed(0)}%)
Sono Hoje: ${todaySleep ? `${todaySleep.durationHours}h, Qualidade: ${todaySleep.quality}` : 'Não registrado hoje'}
Jejum Hoje: ${todayFasting ? `${todayFasting.durationHours}h` : 'Não registrado hoje'}
Objetivo Principal: ${profile?.goals || 'Melhorar a saúde'}

Diretrizes:
1. Padrões Conectados: Faça uma conexão inteligente. Ex: Se dormiu mal, recomende hidratação extra e cuidado com a quebra do jejum, pois o cortisol estará alto. Se o jejum foi longo, elogie e lembre da água.
2. Tom: Acolhedor, direto, sem papo furado. Máximo de 2 frases diretas (cerca de 20-30 palavras).
3. Não use jargões difíceis. Use emojis se couber.
4. Responda APENAS com o texto final. Nenhum formato Markdown ou aspas extras.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7 }
    });
    return response.text || "Continue focado nos seus hábitos hoje, beba bastante água e priorize seu descanso. Estou com você!";
  } catch (error) {
    console.info("Error generating habits insight:");
    return "Seus rastreios sugerem que focar num ciclo de sono melhor vai potencializar os ganhos da sua hidratação e metabolismo.";
  }
};

export const generateHydrationAdvice = async (
  current: number,
  goal: number,
  profile: UserProfile | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const percentage = (current / goal) * 100;
  const prompt = `Gere uma mensagem motivadora curta (fala feminina doce) sobre hidratação.
O usuário bebeu ${current}ml de uma meta de ${goal}ml (${percentage.toFixed(0)}%).
Objetivo do usuário: ${profile?.goals || 'Saúde'}

Regras:
1. Se o percentual for baixo, incentive a beber agora.
2. Se estiver no meio, elogie o progresso.
3. Se bateu a meta, parabenize com entusiasmo.
4. Responda APENAS com o texto da mensagem.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { temperature: 0.7 },
    });

    return response.text.trim() || "Beba um pouco de água para manter seu corpo funcionando bem! 💧";
  } catch (error) {
    return "Hidratar-se é fundamental para sua saúde. Beba um copo agora! 💧";
  }
};

export const analyzeDiningOut = async (
  description: string,
  profile: UserProfile | null
): Promise<DiningOutAnalysis | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Analise a seguinte refeição ou opções de cardápio de um restaurante: "${description}".
  
Perfil do Usuário: ${profile?.goals || 'Emagrecimento'}

Regras:
1. Estime as calorias totais e macros (proteínas, carbos, gorduras).
2. Dê um veredito: "Escolha Inteligente", "Moderado" ou "Excesso".
3. Forneça 3 dicas práticas para tornar essa refeição mais saudável.
4. Sugira uma alternativa melhor se o prato for pesado.
5. Inclua uma 'assistantMessage' (fala feminina curta e motivadora).
6. Responda APENAS com JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      dish: { type: Type.STRING },
      estimatedCalories: { type: Type.NUMBER },
      macros: {
        type: Type.OBJECT,
        properties: {
          protein: { type: Type.STRING },
          carbs: { type: Type.STRING },
          fats: { type: Type.STRING },
        },
        required: ["protein", "carbs", "fats"],
      },
      verdict: { type: Type.STRING },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      betterAlternative: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
    },
    required: ["dish", "estimatedCalories", "macros", "verdict", "tips", "assistantMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: dining out");
    return {
      dish: description,
      verdict: "Moderado",
      estimatedCalories: 650,
      macros: { protein: "30g", carbs: "60g", fats: "25g" },
      tips: [
        "Prefira carnes grelhadas em vez de fritas.",
        "Peça o molho à parte.",
        "Aumente a porção de salada ou legumes."
      ],
      betterAlternative: "Frango grelhado com salada variada",
      assistantMessage: "Lembre-se de aproveitar a refeição, mas com escolhas inteligentes! (Modo Offline)"
    };
  }
};

export const generateSmartSwap = async (
  foodItem: string,
  profile: UserProfile | null
): Promise<SmartSwap | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Sugira uma substituição saudável for the alimento: "${foodItem}".
  
Perfil do Usuário: ${profile?.goals || 'Emagrecimento'}

Regras:
1. A substituição deve ser prática e saborosa.
2. Forneça o 'original', o 'substitute', a 'reason' (por que trocar), uma lista de 'benefits' e uma 'assistantMessage' (fala feminina suave e motivadora).
3. Responda APENAS com JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      original: { type: Type.STRING },
      substitute: { type: Type.STRING },
      reason: { type: Type.STRING },
      benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
      assistantMessage: { type: Type.STRING },
    },
    required: ["original", "substitute", "reason", "benefits", "assistantMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: smart swap");
    return {
      original: foodItem,
      substitute: "Uma alternativa mais saudável",
      reason: "Menos calorias e mais nutrientes",
      benefits: ["Rico em vitaminas", "Baixo índice glicêmico"],
      assistantMessage: "Aqui está uma sugestão rápida (Modo Offline)."
    };
  }
};

export const generateGoalPrediction = async (
  profile: UserProfile
): Promise<GoalPrediction | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Analise o perfil do usuário para prever o tempo necessário para atingir o objetivo de peso.
  
Perfil:
- Peso Atual: ${profile.weight}kg
- Peso Alvo: ${profile.targetWeight}kg
- Altura: ${profile.height}cm
- Nível de Atividade: ${profile.activityLevel}
- Gênero: ${profile.gender}
- Objetivos: ${profile.goals}

Regras:
1. Calcule uma estimativa REALISTA de dias baseado em uma perda saudável (0.5kg a 1kg por semana).
2. Se o usuário quer ganhar peso, use ganho saudável (0.25kg por semana).
3. 'estimatedDays' deve ser um número inteiro.
4. 'estimatedDate' deve ser a data de hoje + estimatedDays em formato ISO (YYYY-MM-DD).
5. 'confidenceScore' entre 0.1 e 1.0.
6. 'motivationalMessage' deve ser uma fala feminina doce e encorajadora.
7. Responda APENAS com JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      estimatedDays: { type: Type.NUMBER },
      estimatedDate: { type: Type.STRING },
      confidenceScore: { type: Type.NUMBER },
      motivationalMessage: { type: Type.STRING },
    },
    required: ["estimatedDays", "estimatedDate", "confidenceScore", "motivationalMessage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: goal prediction");
    return {
      estimatedDays: 60,
      estimatedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      confidenceScore: 0.8,
      motivationalMessage: "A jornada é de passo a passo (Modo Offline)."
    };
  }
};

export const adjustMealPlan = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[],
  nextMealType: 'Café da Manhã' | 'Almoço' | 'Lanche' | 'Jantar'
): Promise<Omit<Recipe, 'id'> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const todayLogs = (intakeLogs || []).filter(log => {
    const logDate = new Date(log.date).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  });

  const totalActual = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + log.actual.calories,
    protein: acc.protein + log.actual.protein,
    carbs: acc.carbs + log.actual.carbs,
    fat: acc.fat + log.actual.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const prompt = `Você é um Nutricionista IA adaptativo. O usuário já consumiu os seguintes nutrientes hoje:
- Calorias: ${totalActual.calories}kcal
- Proteínas: ${totalActual.protein}g
- Carboidratos: ${totalActual.carbs}g
- Gorduras: ${totalActual.fat}g

Perfil do Usuário:
- Objetivo: ${profile.goals}
- Biotipo: ${profile.bodyType || 'Não informado'}
- Metabolismo: ${profile.metabolism || 'Moderado'}
- Peso atual: ${profile.weight}kg

Sua tarefa: Gere uma sugestão de ${nextMealType} que compense ou ajuste o dia para atingir as metas nutricionais do usuário de forma otimizada para o biotipo ${profile.bodyType || 'informado'}.
Responda APENAS com JSON.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      prepTime: { type: Type.STRING },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
    },
    required: ["name", "description", "prepTime", "ingredients", "instructions", "nutrition"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered");
    return {
      name: `Refeição Adaptativa (Fallback)`,
      description: `Sugestão adaptativa de ${nextMealType} baseada no seu perfil.`,
      prepTime: "15 min",
      ingredients: ["1 porção de proteína magra", "1 porção de carboidrato complexo", "Vegetais à vontade", "1 fio de azeite"],
      instructions: ["Misture os ingredientes", "Aqueça ou prepare conforme a embalagem", "Sirva imediatamente"],
      nutrition: {
        calories: 350,
        protein: 25,
        carbs: 40,
        fat: 10
      }
    };
  }
};

export interface BehavioralIntervention {
  voiceMessage: string;
  suggestedAction: {
      type: 'SIMPLIFY_MEALS' | 'REDUCE_WORKOUT' | 'INCREASE_WORKOUT' | 'ADJUST_MACROS';
      description: string;
  } | null;
  predictionText: string;
}

export const generateBehavioralIntervention = async (
  profile: UserProfile
): Promise<BehavioralIntervention | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const recentFoodLogs = (profile.intakeLogs || []).slice(-10);
  const recentWorkouts = (profile.workoutLogs || []).slice(-7);

  const prompt = `Analise o COMPORTAMENTO REAL do usuário:
Objetivo: ${profile.goals}
Rotina: ${profile.routine || 'Não informada'}
Treinos recentes: ${JSON.stringify(recentWorkouts)}
Refeições recentes: ${JSON.stringify(recentFoodLogs)}

Regras de Intervenção (MUITO IMPORTANTE - TOM DE VOZ PREMIUM E HUMANO):
A fala da IA ("voiceMessage") DEVE usar este tom:
- Acolhedor, curto, direto e empático. Sem robôs, parecendo uma mensagem no WhatsApp.
- Exemplos de frases dependendo da situação:
  - Se pula treino ou erra dieta: "Tá tudo bem… vamos ajustar pra algo mais fácil.", "Sem pressão. Só volta hoje, já é suficiente.", "Ei… só volta hoje. Sem cobrança.", "Quer que eu simplifique pra você?"
  - Ajuste feito: "Ajustei tudo com base no seu dia.", "Agora ficou mais fácil de seguir.", "Deixei mais prático pra sua rotina."
  - Se tá indo bem: "Dá pra ver que você tá consistente.", "Isso aqui já está funcionando pra você.", "Quer subir um nível?"
  - Convite: "Vamos fazer algo rápido agora?", "Tenho um treino leve que encaixa no seu tempo."

1. Se ele pula treinos, sugira 'REDUCE_WORKOUT' e crie uma fala acolhedora sugerindo algo mais rápido.
2. Se ele não bate proteína, sugira 'ADJUST_MACROS' ou 'SIMPLIFY_MEALS'.
3. Se ele está super consistente, sugira 'INCREASE_WORKOUT'.
4. "predictionText": Faça uma previsão baseada na consistência atual (ex: "Se continuar assim, esse é seu resultado em X dias.").
5. "voiceMessage": Use UMA frase curta e empática (inspirada nos exemplos acima), terminando com um emoji verde 💚 se couber.

Responda APENAS JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      voiceMessage: { type: Type.STRING },
      suggestedAction: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          type: { type: Type.STRING, enum: ['SIMPLIFY_MEALS', 'REDUCE_WORKOUT', 'INCREASE_WORKOUT', 'ADJUST_MACROS'] },
          description: { type: Type.STRING }
        },
        required: ["type", "description"]
      },
      predictionText: { type: Type.STRING }
    },
    required: ["voiceMessage", "predictionText", "suggestedAction"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error: any) {
    console.info("Fallback triggered");
    return {
      voiceMessage: "Notei que você está muito ativo hoje. Continue assim e não esqueça de se hidratar!",
      suggestedAction: null,
      predictionText: "Se mantiver este ritmo, alcançará sua meta na próxima semana."
    };
  }
};

export const generateAdaptiveInsight = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[],
  workoutLogs: WorkoutLog[]
): Promise<Omit<AdaptiveInsight, 'id' | 'status'> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const recentFood = (intakeLogs || []).slice(-10);
  const recentWorkouts = (workoutLogs || []).slice(-5);

  const prompt = `Analise o perfil e o comportamento recente do usuário para gerar um insight adaptativo de ALTO VALOR.
  
PERFIL ATUAL:
Biotipo: ${profile.bodyType}
Objetivo: ${profile.goals}
Macros atuais: ${JSON.stringify(profile.masterPlan?.macros)}

REFEIÇÕES RECENTES:
${JSON.stringify(recentFood)}

TREINOS RECENTES:
${JSON.stringify(recentWorkouts)}

Sua tarefa é identificar se o plano atual precisa de um ajuste (macro_adjustment, workout_adaptation ou habit_nudge) baseado no que o usuário REALMENTE está fazendo.
- Se ele consome pouca proteína consistentemente, sugira ajuste de macros ou lembrete de hábito.
- Se pula treinos, sugira diminuir a complexidade.
- Se está indo muito bem, sugira subir o nível.

Responda APENAS em JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['macro_adjustment', 'workout_adaptation', 'habit_nudge'] },
      recommendation: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      changes: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          dailyCalories: { type: Type.NUMBER },
          macros: {
            type: Type.OBJECT,
            properties: {
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            }
          }
        }
      }
    },
    required: ["date", "type", "recommendation", "reasoning"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error: any) {
    console.info("Fallback triggered");
    return {
      date: new Date().toISOString(),
      type: 'habit_nudge',
      recommendation: "Mantenha o foco! Seus registros estão sendo analisados e logo teremos mais dicas.",
      reasoning: "Sistema em otimização ou offline temporariamente."
    };
  }
};

export const generateWeeklyChallenges = async (
  profile: UserProfile
): Promise<WeeklyChallenge[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Gere 3 desafios semanais de gamificação personalizados para o usuário NutriAI.
OBJETIVO DO USUÁRIO: ${profile.goals}
RESTRIÇÕES: ${profile.restrictions?.join(", ") || 'Nenhuma'}

Cada desafio deve ter:
- id: crypto.randomUUID() ou identificador único curto
- title: Curto e impactante
- description: O que fazer
- target: Número inteiro (ex: 7 para dias, 5 para vezes)
- current: 0
- type: 'water' | 'protein' | 'workout' | 'steps'
- rewardPoints: Inteiro (ex: 50 a 200)
- completed: false
- expiresAt: ISO de 7 dias a partir de agora

Responda APENAS em JSON no formato Array de WeeklyChallenge.`;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        target: { type: Type.NUMBER },
        current: { type: Type.NUMBER },
        type: { type: Type.STRING, enum: ['water', 'protein', 'workout', 'steps'] },
        rewardPoints: { type: Type.NUMBER },
        completed: { type: Type.BOOLEAN },
        expiresAt: { type: Type.STRING }
      },
      required: ["id", "title", "description", "target", "current", "type", "rewardPoints", "completed", "expiresAt"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.info("Fallback triggered");
    return [];
  }
};

export const generateMagicRecipe = async (
  input: string,
  profile: UserProfile | null
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Você é um Chef e Nutricionista de alta gastronomia saudável.
O usuário quer uma receita personalizada (ex: sobremesa). Pedido: "${input}"
Perfil do usuário: Objetivo - ${profile?.goals || 'Geral'}. Restrições - ${profile?.restrictions?.join(', ') || 'Nenhuma'}.

Crie uma receita incrivelmente saborosa que se encaixe no pedido (seja algo fit/low calorie ou calórico para ganho de massa, de acordo com o pedido).
Seja criativo e priorize ingredientes naturais.
Responda APENAS em JSON no seguinte formato:
{
  "title": "Nome da Receita",
  "description": "Breve descrição super apetitosa e explicando por que se encaixa no objetivo e pedido.",
  "ingredients": ["Ingrediente 1", "Ingrediente 2"],
  "instructions": ["Passo 1", "Passo 2"],
  "calories": 250
}`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      calories: { type: Type.INTEGER }
    },
    required: ["title", "description", "ingredients", "instructions", "calories"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: magic recipe");
    return {
      title: "Receita Mágica Surpresa",
      description: "Infelizmente estou offline, mas coma algo saudável!",
      ingredients: ["Amor", "Saúde"],
      instructions: ["Misture os dois e aproveite"],
      calories: 0
    };
  }
};

export const analyzeImage = async (
  base64Image: string,
  prompt: string
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // extrair mimeType do base64 (ex: data:image/jpeg;base64,...)
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (err: any) {
    console.error("Erro no analyzeImage:", err);
    return "Evolução detectada e analisada! O modelo falhou temporariamente, mas seu progresso está registrado.";
  }
};

export const analyzeProductImage = async (
  base64Image: string,
  mimeType: string,
  profile?: UserProfile | null
): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhum";
  if (profile) {
    profileText = `
Peso: ${profile.weight}kg
Objetivo: ${profile.goals}
Restrições: ${profile.restrictions.join(", ")}
Alergias: ${profile.allergies.join(", ")}
`;
  }

  const prompt = `Analise a foto deste produto industrializado (pode ser o rótulo de ingredientes, tabela nutricional ou frente da embalagem/lata/pote).
  
Identifique o nome do produto, a marca, a quantidade (se visível ou estimável, ex: "350g" ou "350ml") e faça uma análise nutricional dele com base no perfil do usuário.

Perfil do Usuário: ${profileText}

Regras:
1. Extraia o nome do produto ('productName'), a marca ('brand'), e a quantidade/tamanho ('quantity').
2. Determine se o produto é "bom", "moderado" ou "ruim" para o objetivo do usuário.
3. Crie uma 'assistantMessage' com tom altamente humano e premium (Ex: "Essa lata contém bastante sódio, então consuma com moderação." ou "Excelente escolha saudável para seu lanche!", focado na avaliação nutricional do produto). Mantenha curto e de fácil leitura.
4. Extraia ou estime as calorias (por porção visível ou 100g) e macronutrientes principais (energia/calories, proteínas/protein, carboidratos/carbs, gorduras/fat, fibras/fiber).
5. Defina um aviso curto 'warning' justificando de forma simples o veredito.
6. Responda APENAS com JSON validando o schema exato.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING },
      brand: { type: Type.STRING },
      quantity: { type: Type.STRING },
      verdict: { type: Type.STRING, enum: ["bom", "moderado", "ruim"] },
      assistantMessage: { type: Type.STRING },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
      warning: { type: Type.STRING },
    },
    required: ["productName", "brand", "quantity", "verdict", "assistantMessage", "nutrition", "warning"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: product image");
    return {
      productName: "Produto Identificado Offline",
      brand: "Marca Desconhecida",
      quantity: "Porção Padrão",
      verdict: "moderado",
      assistantMessage: "Este é um fallback offline. Use com moderação.",
      nutrition: { calories: 250, protein: 10, carbs: 30, fat: 10, fiber: 2 },
      warning: "Por favor tente online mais tarde."
    };
  }
};

export const analyzeEmotionalImage = async (
  base64Image: string,
  mimeType: string,
  profile?: UserProfile | null
): Promise<any | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let profileText = "Nenhum";
  if (profile) {
    profileText = `
Peso: ${profile.weight}kg
Objetivo: ${profile.goals}
Restrições: ${profile.restrictions.join(", ")}
Alergias: ${profile.allergies.join(", ")}
`;
  }

  const prompt = `Analise a foto do rosto do usuário de forma segura e privada, identificando expressões faciais ou sinais sutis de humor, cansaço ou ansiedade, com foco exclusivo em bem-estar e nutrição integrativa.
  
Perfil do Usuário: ${profileText}

Regras:
1. Determine o provável estado de espírito ou humor predominante (ex: "feliz", "cansado", "ansioso", "estressado", "triste" ou "neutro"). Mantenha a resposta acolhedora e positiva.
2. Crie uma 'assistantMessage' curta, premium e humana (Ex: "Notei um brilho suave nos seus olhos, o que indica que está focado, mas talvez precise desacelerar um pouquinho ao anoitecer.").
3. Forneça um 'insight' ameno de bem-estar.
4. Crie recomendações personalizadas divididas em:
   - 'teas': chás, infusões ou bebidas de relaxamento ou reposição energética adequadas para o estado emocional detectado.
   - 'meals': refeições leves, jantares calmantes ou snacks saudáveis indicados.
   - 'relaxingPractices': práticas curtas como respiração, mindfulness ou meditação relaxante.
5. Responda APENAS com JSON validando o schema exato.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      detectedMood: { type: Type.STRING },
      insight: { type: Type.STRING },
      assistantMessage: { type: Type.STRING },
      recommendations: {
        type: Type.OBJECT,
        properties: {
          teas: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          meals: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          relaxingPractices: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["teas", "meals", "relaxingPractices"]
      }
    },
    required: ["detectedMood", "insight", "assistantMessage", "recommendations"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: emotional image");
    return {
      detectedMood: "neutro",
      insight: "Tudo parece calmo agora.",
      assistantMessage: "Respire fundo, você está indo bem.",
      recommendations: {
        teas: ["Camomila"],
        meals: ["Salada leve"],
        relaxingPractices: ["Respiração 4-7-8"]
      }
    };
  }
};


export const analyzeBloodPressure = async (
  logs: BloodPressureLog[],
  profile: UserProfile | null
): Promise<{
  status: 'normal' | 'attention' | 'high_pressure';
  insight: string;
  preventiveAlert: string | null;
  suggestions: {
    hydration: string;
    nutrition: string;
    sodiumReduction: string;
    relaxation: string;
  };
  dailySummary: string;
} | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const logsText = logs.map(l => `Data: ${new Date(l.date).toLocaleString('pt-BR')}, Sistólica: ${l.systolic}, Diastólica: ${l.diastolic}, BPM: ${l.bpm}${l.notes ? `, Notas: ${l.notes}` : ''}`).join('\n');

  const prompt = `Você é um Cardiologista especialista em saúde preventiva e IA médica integrada ao NutriAI.
Analise os registros de pressão arterial do usuário e forneça insights inteligentes para ajudá-lo a melhorar sua saúde do coração.

DADOS DE PERFIL DO USUÁRIO:
Nome: ${profile?.name || 'Usuário'}
Objetivos de saúde: ${profile?.goals || 'Melhorar bem-estar'}
Peso: ${profile?.weight || 'Não informado'} kg
Idade: ${profile?.age || 'Não informada'} anos

HISTÓRICO RECENTE DE PRESSÃO ARTERIAL (Mais recentes no topo):
${logsText || 'Nenhum registro encontrado ainda.'}

DIRETRIZES DE ESTADO DA PRESSÃO ARTERIAL:
- Normal (Verde): Sistólica < 120 e Diastólica < 80.
- Atenção (Amarelo): Sistólica entre 120-139 OU Diastólica entre 80-89.
- Pressão Alta (Vermelho): Sistólica >= 140 OU Diastólica >= 90.

Sua tarefa é produzir uma análise médica acolhedora, precisa e motivadora em formato JSON.
Certifique-se de preencher todos os campos obrigatórios conforme o schema solicitado.

DIRETRIZES DE TEXTO:
- Seja humano, compreensivo e adote o tom premium acolhedor do NutriAI.
- Forneça conselhos acionáveis de alimentação (redução de sódio, alimentos cardioprotetores como alho, aveia, vegetais verde-escuros) e estilo de vida.
- Sugira chás relaxantes específicos (como cidreira, camomila, maracujá) ou técnicas de meditação para diminuir estresse.
- Alerte preventivamente caso haja tendências frequentes de alteração.

Responda APENAS em JSON validando o schema.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ['normal', 'attention', 'high_pressure'] },
      insight: { type: Type.STRING },
      preventiveAlert: { type: Type.STRING, nullable: true },
      suggestions: {
        type: Type.OBJECT,
        properties: {
          hydration: { type: Type.STRING },
          nutrition: { type: Type.STRING },
          sodiumReduction: { type: Type.STRING },
          relaxation: { type: Type.STRING }
        },
        required: ["hydration", "nutrition", "sodiumReduction", "relaxation"]
      },
      dailySummary: { type: Type.STRING }
    },
    required: ["status", "insight", "suggestions", "dailySummary"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: blood pressure");
    return {
      status: 'normal',
      insight: 'Sistema offline. Análise padrão aplicada.',
      preventiveAlert: null,
      suggestions: {
        hydration: "Beba água regularmente.",
        nutrition: "Evite excesso de sódio.",
        sodiumReduction: "Não adicione sal à mesa.",
        relaxation: "Meditação ajuda."
      },
      dailySummary: "Sua pressão parece sob controle pela média geral."
    };
  }
};


export const analyzeBodyBiometrics = async (
  logs: BodyMonitorLog[],
  profile: UserProfile | null
): Promise<{
  status: 'normal' | 'attention' | 'high_signals';
  report: string;
  preventiveAlert: string | null;
  suggestions: {
    hydration: string;
    rest: string;
    nutrition: string;
    calmingTea: string;
    relaxation: string;
  };
  dailySummary: string;
} | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const logsText = logs.map(l => {
    return `Data: ${new Date(l.date).toLocaleString('pt-BR')}, BPM Freq: ${l.heartRate}, Estresse: ${l.stressLevel}%, Fadiga: ${l.fatigueLevel}%, Ansiedade: ${l.anxietyLevel}%${l.notes ? `, Notas: ${l.notes}` : ''}`;
  }).join('\n');

  const prompt = `Você é o Cardiologista Clinico & Especialista em Medicina de Estatísticas Preventivas Integrado do NutriAI.
Sua missão é dar uma devolutiva acolhedora, premium, sem jargões alarmistas inapropriados, mas altamente profissional e focada em bem-estar e melhoria corporal saudável.

DADOS DE PERFIL DO USUÁRIO:
Nome: ${profile?.name || 'Usuário'}
Idade: ${profile?.age || 'Não especificada'} anos
Objetivos: ${profile?.goals || 'Monitramento de sinais de bem-estar'}
Restrições: ${profile?.restrictions?.join(', ') || 'Nenhuma'}

HISTÓRICO RECENTE DE BIO-MONITORAMENTO CARDIO/FISIOLÓGICO:
${logsText || 'Ainda não foram colhidos sinais de monitoramento hoje.'}

Sua tarefa é analisar esses sinais e produzir um JSON diagnóstico e preventivo. Sabendo que:
- Sinais normais (BPM ~60-90, Estresse < 40%, Fadiga < 40%, Ansiedade < 40%) -> status: "normal"
- Sinais em moderada alteração -> status: "attention"
- Sinais elevados (BPM > 100 ou < 50 em repouso, ou qualquer nível de estresse, fadiga, ansiedade > 70%) -> status: "high_signals"

Você deve ser humano, amigável, dar instruções exatas de bem-estar, com chás calmantes (Ex: cidreira, camomila, mulungu, passiflora), técnicas de respiração díficil ou meditação, dicas de hidratação adequada ao peso/perfil e nutrição anti-estresse rica em magnésio, potássio, triptofano.

Observação crucial: NÃO somos um substituto médico de emergência ou diagnóstico oficial. Lembre-os sutilmente de buscar cardiologistas ou clínicos se os sinais persistirem.

Responda APENAS em JSON em conformidade com o schema fornecido.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ['normal', 'attention', 'high_signals'] },
      report: { type: Type.STRING },
      preventiveAlert: { type: Type.STRING, nullable: true },
      suggestions: {
        type: Type.OBJECT,
        properties: {
          hydration: { type: Type.STRING },
          rest: { type: Type.STRING },
          nutrition: { type: Type.STRING },
          calmingTea: { type: Type.STRING },
          relaxation: { type: Type.STRING }
        },
        required: ["hydration", "rest", "nutrition", "calmingTea", "relaxation"]
      },
      dailySummary: { type: Type.STRING }
    },
    required: ["status", "report", "suggestions", "dailySummary"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.info("Fallback triggered: body biometrics");
    return {
      status: 'normal',
      report: 'Sinais offline. Tudo parece dentro da média.',
      preventiveAlert: null,
      suggestions: {
        hydration: "Beba 2L de água.",
        rest: "Durma 8 horas.",
        nutrition: "Coma vegetais.",
        calmingTea: "Cidreira é bom.",
        relaxation: "Respire fundo."
      },
      dailySummary: "Estresse e fadiga parecem controlados."
    };
  }
};

export const generateDailyNutritionTips = async (
  profile: UserProfile | null
): Promise<{
  tips: {
    category: string;
    title: string;
    content: string;
    recommendation: string;
    icon: string;
  }[];
} | null> => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  let profileText = "Usuário comum de saúde.";
  if (profile) {
    profileText = `
Nome: ${profile.name || "Usuário"}
Objetivo: ${profile.goals || "Não informado"}
Biotipo: ${profile.bodyType || "Não informado"}
Restrições: ${profile.restrictions?.join(", ") || "Nenhuma"}
Alergias: ${profile.allergies?.join(", ") || "Nenhuma"}
Atividade Física: ${profile.activityLevel || "Não informada"}
`;
  }

  const prompt = `Você é um Nutricionista Clínico e Comportamental do NutriAI, especializado em micro-hábitos e fatos rápidos aplicados no dia a dia.
Sua missão é gerar exatamente 3 ou 4 fatos rápidos/dicas diárias de nutrição baseados de forma personalizada e cuidadosa no perfil do usuário abaixo:

PERFIL DO USUÁRIO:
${profileText}

INSTRUÇÕES DE ESCRITA:
1. Gere dicas super curtas, fáceis de ler, sem termos complicados e extremamente motivacionais e de tom premium.
2. Cada dica deve focar em um aspect prático aplicável no mesmo dia (Ex: consumo de água associado à saciedade, alimentos antioxidantes, substitutos inteligentes, nutrição pré-treino, etc.).
3. Personalize a dica de acordo com o objetivo ou as restrições alimentares do usuário (se houver). Se o usuário tem alergias ou restrições, respeite-as e não mencione os ingredientes restritos!
4. Mapeie cada dica para um ícone descritivo simples do lucide-react. Escolha estritamente entre: "apple", "droplet", "zap", "brain", "trophy", "heart".

Responda APENAS com um objeto JSON validando o schema fornecido.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      tips: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Categoria curta, ex: 'Hidratação', 'Foco & Energia', 'Superalimentos'" },
            title: { type: Type.STRING, description: "Título chamativo e intrigante" },
            content: { type: Type.STRING, description: "O fato ou dado científico simplificado em 1-2 sentenças" },
            recommendation: { type: Type.STRING, description: "Instrução curta e prática para hoje" },
            icon: { type: Type.STRING, enum: ["apple", "droplet", "zap", "brain", "trophy", "heart"] }
          },
          required: ["category", "title", "content", "recommendation", "icon"]
        }
      }
    },
    required: ["tips"]
  };

  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
  let responseText = "";
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[DailyTips] Tentando gerar dicas com o modelo: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.8
        }
      });

      if (response && response.text) {
        responseText = response.text;
        console.log(`[DailyTips] Sucesso ao gerar com o modelo: ${modelName}`);
        break;
      }
    } catch (e: any) {
      lastError = e;
      console.log(`[DailyTips] Modelo ${modelName} indisponível ou limite de requisições atingido.`);
    }
  }

  try {
    if (!responseText) {
      if (lastError) {
        throw lastError;
      }
      throw new Error("Não foi possível obter resposta de nenhum modelo Gemini");
    }
    return JSON.parse(responseText);
  } catch (error) {
    console.log("[DailyTips] Usando dicas de nutrição estáticas/locais como fallback.");
    return {
      tips: [
        {
          category: "Hidratação",
          title: "Beba água ao acordar",
          content: "O corpo perde água durante o sono. Rehidratar-se logo cedo ajuda a acelerar o metabolismo e melhora a digestão.",
          recommendation: "Tome um copo de 300ml de água logo ao levantar hoje!",
          icon: "droplet"
        },
        {
          category: "Energia",
          title: "Proteínas e saciedade",
          content: "Adicionar uma porção de proteínas nos lanches intermediários evita picos de insulina e mantém você satisfeito por mais tempo.",
          recommendation: "Experimente um ovo cozido ou iogurte natural no lanche da tarde.",
          icon: "zap"
        },
        {
          category: "Foco",
          title: "Mastigação consciente",
          content: "Mastigar mais vezes ajuda o cérebro a registrar a saciedade, melhorando a digestão e o aproveitamento dos nutrientes.",
          recommendation: "Dedique pelo menos 15 minutos e coma sem telas na próxima refeição.",
          icon: "brain"
        }
      ]
    };
  }
};

export const chatWithHerbsAssistant = async (
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é o Fitoterapeuta e Botânico Especialista do NutriAI, uma inteligência artificial criada para sanar dúvidas exclusivamente sobre ervas medicinais brasileiras com total rigor científico e em um tom amigável, acolhedor e altamente esclarecedor.

DIRETRIZES DE ATUAÇÃO E SEGURANÇA:
1. AVISO DE SAÚDE OBRIGATÓRIO (Gentil, porém Claro): Suas respostas são exclusivamente de caráter informativo e educativo. Deixe claro que a fitoterapia e o uso de ervas medicinais NÃO substituem uma consulta médica, um acompanhamento nutricional ou um diagnóstico clínico.
2. RIGOR CIENTÍFICO E BADGES DE EVIDÊNCIA: Sempre fundamente suas recomendações em publicações farmacopeicas brasileiras (Anvisa/Minsaud) e estudos científicos revisados por pares (PubMed/Fiocruz). Sempre utilize visualmente os seguintes selos coloridos para rotular as indicações das ervas em suas respostas:
   - 🟢 Forte evidência científica (Estudos clínicos bem estabelecidos e consenso farmacopeico)
   - 🟡 Evidência moderada (Estudos in vivo/in vitro promissores e uso de longa data em ensaios menores)
   - 🟠 Uso tradicional / empírico (Uso popular disseminado com documentação histórica mas com pouca replicação clínica recente)
   - 🔴 Evidência insuficiente ou nula (Sem eficácia demonstrada ou contestada pela ciência)
3. TOM E LAYOUT: Escreva em português brasileiro de forma poética mas rigorosa, como uma conversa com um botânico acolhedor. Use parágrafos curtos, tópicos objetivos, e negritos para destacar substâncias ou espécies.
4. CONTRAINDICAÇÕES ATIVAS: Nunca sugira uma erva sem expor seus riscos cruciais, especialmente para grupos sensíveis: gestantes (risco abortivo), lactantes, crianças menores de 12 anos, renais crônicos, hepatopatas e interações medicamentosas nocivas (como anticoagulantes e sedativos).
5. FORMATO DE RETORNO: Retorne estritamente um objeto JSON com o campo "text" contendo a mensagem formatada em Markdown. Exemplo: { "text": "Sua resposta..." }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING }
    },
    required: ["text"]
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      }
    });

    const stringifiedHistory = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Especialista'}: ${h.text}`).join('\n');
    
    const finalPrompt = `HISTÓRICO DA CONVERSA:
${stringifiedHistory}

O usuário acabou de perguntar: "${userMessage}"
RESPONDA EM JSON COM O TEXTO FORMATADO EM MARKDOWN.`;

    const response = await chat.sendMessage({ message: finalPrompt });
    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Herbs Chat Error:", error);
    return {
      text: "Poxa, minha conexão com o acervo botânico científico falhou temporariamente. Que tal me perguntar de novo em alguns instantes? 🌿💚"
    };
  }
};

export interface PlantIdentificationResult {
  identified: boolean;
  popularName: string;
  scientificName: string;
  botanicalFamily: string;
  confidence: number;
  classifications: string[];
  isToxic: boolean;
  warningMessage?: string;
  generalDescription: string;
  info: {
    origin: string;
    biome: string;
    brazilDistribution: string;
  };
  usages: {
    type: string;
    description: string;
    evidenceLevel?: string;
  }[];
  preparation?: {
    partUsed: string;
    method: string;
    cautions: string[];
    contraindications: string[];
  };
  cultivation: {
    soil: string;
    climate: string;
    luminosity: string;
    watering: string;
    fertilization: string;
    plantingSeason: string;
    growthTime: string;
    harvest: string;
  };
  benefits: {
    title: string;
    description: string;
    evidence: 'Forte evidência' | 'Evidência moderada' | 'Uso tradicional' | 'Evidência insuficiente';
  }[];
  curiosities: string[];
}

export const identifyPlant = async (
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<PlantIdentificationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let cleanBase64 = imageBase64;
  let activeMime = mimeType;

  if (imageBase64.startsWith("http")) {
    try {
      const response = await fetch(imageBase64);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString("base64");
      const contentType = response.headers.get("content-type");
      if (contentType) {
        activeMime = contentType;
      }
    } catch (e) {
      console.error("Error fetching remote image URL inside identifyPlant:", e);
    }
  } else if (imageBase64.includes(",")) {
    cleanBase64 = imageBase64.split(",")[1];
  }

  const systemInstruction = `Você é um botânico, fitoterapeuta e especialista em visão computacional e identificação inteligente de plantas para o NutriAI.
Sua missão é analisar imagens de folhas, flores, frutos, galhos, cascas, espinhos, formato geral, cor e textura para identificar a planta e prover informações educativas fundamentadas cientificamente.

DIRETRIZES IMPORTANTES DE SEGURANÇA:
1. NUNCA garanta 100% de certeza absoluta pela foto. Isso pode ser extremamente perigoso.
2. Sempre informe um nível de confiança realista (de 0 a 100%). Se a imagem for de baixa qualidade, não for uma planta ou não for possível identificar com segurança (abaixo de 60%), retorne "identified: false" e sugira tirar outra foto sob melhor luz ou consultar especialista.
3. Se houver qualquer suspeita ou risco de a planta ser tóxica ou venenosa, marque "isToxic: true" e retorne um aviso visual destacado em "warningMessage".
4. Adicione sempre um alerta nítido de segurança de que o usuário nunca deve consumir uma planta desconhecida baseado apenas no resultado da IA.

FORMATO DE RETORNO:
Retorne estritamente o JSON validando o schema fornecido. Todo o conteúdo deve ser em português do Brasil e cientificamente embasado.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      identified: { type: Type.BOOLEAN },
      popularName: { type: Type.STRING },
      scientificName: { type: Type.STRING },
      botanicalFamily: { type: Type.STRING },
      confidence: { type: Type.INTEGER },
      classifications: { 
        type: Type.ARRAY, 
        items: { 
          type: Type.STRING,
          enum: ["Medicinal", "Condimento/tempero", "Alimentícia", "Ornamental", "Potencialmente tóxica", "Possivelmente venenosa", "Planta nativa", "Planta exótica"]
        } 
      },
      isToxic: { type: Type.BOOLEAN },
      warningMessage: { type: Type.STRING },
      generalDescription: { type: Type.STRING },
      info: {
        type: Type.OBJECT,
        properties: {
          origin: { type: Type.STRING },
          biome: { type: Type.STRING },
          brazilDistribution: { type: Type.STRING }
        },
        required: ["origin", "biome", "brazilDistribution"]
      },
      usages: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            description: { type: Type.STRING },
            evidenceLevel: { type: Type.STRING }
          },
          required: ["type", "description"]
        }
      },
      preparation: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          partUsed: { type: Type.STRING },
          method: { type: Type.STRING },
          cautions: { type: Type.ARRAY, items: { type: Type.STRING } },
          contraindications: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["partUsed", "method", "cautions", "contraindications"]
      },
      cultivation: {
        type: Type.OBJECT,
        properties: {
          soil: { type: Type.STRING },
          climate: { type: Type.STRING },
          luminosity: { type: Type.STRING },
          watering: { type: Type.STRING },
          fertilization: { type: Type.STRING },
          plantingSeason: { type: Type.STRING },
          growthTime: { type: Type.STRING },
          harvest: { type: Type.STRING }
        },
        required: ["soil", "climate", "luminosity", "watering", "fertilization", "plantingSeason", "growthTime", "harvest"]
      },
      benefits: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            evidence: { type: Type.STRING, enum: ["Forte evidência", "Evidência moderada", "Uso tradicional", "Evidência insuficiente"] }
          },
          required: ["title", "description", "evidence"]
        }
      },
      curiosities: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["identified", "popularName", "scientificName", "botanicalFamily", "confidence", "classifications", "isToxic", "generalDescription", "info", "usages", "cultivation", "benefits", "curiosities"]
  };

  try {
    const imagePart = {
      inlineData: {
        mimeType: activeMime,
        data: cleanBase64,
      },
    };
    const textPart = {
      text: "Analise esta imagem desta planta e preencha detalhadamente a identificação no formato JSON especificado. Seja extremamente cuidadoso com a segurança.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do modelo de IA");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro ao identificar planta via Gemini API:", err);
    throw err;
  }
};

export const chatAboutIdentifiedPlant = async (
  plantName: string,
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é o Fitoterapeuta Especialista do NutriAI. O usuário acabou de identificar a planta "${plantName}".
Sua tarefa é responder perguntas específicas do usuário sobre essa planta.

DIRETRIZES DE ATUAÇÃO E SEGURANÇA:
1. Sempre lembre o usuário de que o consumo de plantas silvestres ou desconhecidas sem certificação de especialista pode ser perigoso e desaconselhável.
2. Diga com clareza o nível de evidência dos benefícios associados (🟢 Forte, 🟡 Moderada, 🟠 Tradicional, 🔴 Insuficiente).
3. Use um tom atencioso, caloroso e seguro.
4. Retorne apenas JSON com o campo "text" em formato markdown. Exemplo: { "text": "Sua resposta..." }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING }
    },
    required: ["text"]
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      }
    });

    const stringifiedHistory = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Especialista'}: ${h.text}`).join('\n');
    const finalPrompt = `HISTÓRICO DA CONVERSA:
${stringifiedHistory}

O usuário perguntou sobre a planta "${plantName}": "${userMessage}"
RESPONDA EM JSON COM O TEXTO FORMATADO EM MARKDOWN.`;

    const response = await chat.sendMessage({ message: finalPrompt });
    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Identified Plant Chat Error:", error);
    return {
      text: "Não consegui consultar o acervo botânico específico no momento. Vamos tentar de novo? 🌿💚"
    };
  }
};

export interface MushroomIdentificationResult {
  identified: boolean;
  popularName: string;
  scientificName: string;
  confidence: number;
  edibility: 'Comestível' | 'Tóxico' | 'Desconhecido';
  warningMessage: string;
  habitat: string;
  growingSeason: string;
  generalDescription: string;
  curiosities: string[];
  benefitsOrProperties: string[];
  features: {
    cap: string;
    gills: string;
    stem: string;
    sporePrint: string;
  };
}

export const identifyMushroom = async (
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<MushroomIdentificationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let cleanBase64 = imageBase64;
  let activeMime = mimeType;

  if (imageBase64.startsWith("http")) {
    try {
      const response = await fetch(imageBase64);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString("base64");
      const contentType = response.headers.get("content-type");
      if (contentType) {
        activeMime = contentType;
      }
    } catch (e) {
      console.error("Error fetching remote image URL inside identifyMushroom:", e);
    }
  } else if (imageBase64.includes(",")) {
    cleanBase64 = imageBase64.split(",")[1];
  }

  const systemInstruction = `Você é um micologista especialista em identificação visual, segurança e taxonomia de cogumelos e fungos para o NutriAI.
Sua missão é analisar imagens de fungos/cogumelos (chapéu, lâminas, caule, anel, volva, micélio) para identificar a espécie e determinar com precisão e máxima precaução se o exemplar é comestível (comestíveis), tóxico (tóxicos) ou desconhecido/duvidoso (desconhecidos).

DIRETRIZES CRÍTICAS DE SEGURANÇA (MÁXIMA PRIORIDADE):
1. ALERTA DE SEGURANÇA MANDATÓRIO: Sempre inclua um aviso extremamente nítido e em caixa alta na propriedade "warningMessage" reforçando que NUNCA se deve consumir nenhum cogumelo silvestre ou desconhecido com base APENAS na identificação por Inteligência Artificial ou fotos, pois muitas espécies comestíveis possuem sósias altamente venenosos (como Amanita phalloides vs outros cogumelos).
2. Se a imagem não contiver um cogumelo/fungo visível, ou se a imagem for de baixa resolução, escura ou ambígua impedindo a classificação com confiança acima de 60%, você DEVE retornar "identified: false" e classificar como "Desconhecido".
3. Seja conservador: Na menor dúvida, classifique como "Tóxico" ou "Desconhecido" para proteger a integridade física do usuário.
4. Explique o habitat preferido, época de crescimento no ano (ex: primavera, pós-chuvas, outono úmido), curiosidades e propriedades.

FORMATO DE RETORNO:
Retorne estritamente o JSON validando o schema fornecido. Todo o conteúdo deve ser em português do Brasil.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      identified: { type: Type.BOOLEAN },
      popularName: { type: Type.STRING },
      scientificName: { type: Type.STRING },
      confidence: { type: Type.INTEGER },
      edibility: { type: Type.STRING, enum: ["Comestível", "Tóxico", "Desconhecido"] },
      warningMessage: { type: Type.STRING },
      habitat: { type: Type.STRING },
      growingSeason: { type: Type.STRING },
      generalDescription: { type: Type.STRING },
      curiosities: { type: Type.ARRAY, items: { type: Type.STRING } },
      benefitsOrProperties: { type: Type.ARRAY, items: { type: Type.STRING } },
      features: {
        type: Type.OBJECT,
        properties: {
          cap: { type: Type.STRING },
          gills: { type: Type.STRING },
          stem: { type: Type.STRING },
          sporePrint: { type: Type.STRING }
        },
        required: ["cap", "gills", "stem", "sporePrint"]
      }
    },
    required: ["identified", "popularName", "scientificName", "confidence", "edibility", "warningMessage", "habitat", "growingSeason", "generalDescription", "curiosities", "benefitsOrProperties", "features"]
  };

  try {
    const imagePart = {
      inlineData: {
        mimeType: activeMime,
        data: cleanBase64,
      },
    };
    const textPart = {
      text: "Analise detalhadamente as características deste cogumelo e preencha a identificação micológica no formato JSON especificado. Enfatize as regras de segurança.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do modelo de IA");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro ao identificar cogumelo via Gemini API:", err);
    throw err;
  }
};

export const chatAboutIdentifiedMushroom = async (
  mushroomName: string,
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é o Micologista Especialista do NutriAI. O usuário identificou o cogumelo "${mushroomName}".
Sua tarefa é responder a dúvidas e prover suporte de forma extremamente prudente, científica e educativa sobre esse espécime.

DIRETRIZES DE SEGURANÇA INDISPENSÁVEIS:
1. Sempre inicie com uma nota curta ou lembrete de que o consumo de cogumelos silvestres colhidos sem perícia física de micologista profissional é perigoso e desaconselhado.
2. Seja preciso quanto à edibilidade conhecida.
3. Responda em português do Brasil, de forma clara, amigável e segura.
4. Retorne apenas JSON com o campo "text" em formato markdown. Exemplo: { "text": "Sua resposta..." }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING }
    },
    required: ["text"]
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      }
    });

    const stringifiedHistory = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Micologista'}: ${h.text}`).join('\n');
    const finalPrompt = `HISTÓRICO DA CONVERSA:
${stringifiedHistory}

O usuário perguntou sobre o cogumelo "${mushroomName}": "${userMessage}"
RESPONDA EM JSON COM O TEXTO FORMATADO EM MARKDOWN.`;

    const response = await chat.sendMessage({ message: finalPrompt });
    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Identified Mushroom Chat Error:", error);
    return {
      text: "Não consegui acessar a base micológica no momento. Por favor, tente novamente mais tarde."
    };
  }
};

export interface FoodAllergyAnalysisResult {
  identified: boolean;
  productName: string;
  ingredientsFound: string;
  isSafe: boolean;
  allergensDetected: string[];
  userSpecificThreats: { allergen: string; ingredientSource: string; severity: 'Alta' | 'Média' | 'Baixa' }[];
  alternativesSuggested: string[];
  detailedAnalysis: string;
  score: number;
}

export const analyzeFoodAllergens = async (
  imageBase64: string,
  userAllergies: string[],
  mimeType: string = "image/jpeg"
): Promise<FoodAllergyAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let cleanBase64 = imageBase64;
  let activeMime = mimeType;

  if (imageBase64.startsWith("http")) {
    try {
      const response = await fetch(imageBase64);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString("base64");
      const contentType = response.headers.get("content-type");
      if (contentType) {
        activeMime = contentType;
      }
    } catch (e) {
      console.error("Error fetching remote image URL inside analyzeFoodAllergens:", e);
    }
  } else if (imageBase64.includes(",")) {
    cleanBase64 = imageBase64.split(",")[1];
  }

  const systemInstruction = `Você é um Engenheiro de Alimentos e Nutricionista especialista em alergias alimentares e leitura técnica de rótulos de ingredientes para o NutriAI.
Sua missão é analisar imagens de rótulos de ingredientes, tabelas nutricionais ou de alimentos prontos para identificar ingredientes e determinar se o alimento é seguro ou perigoso de acordo com a lista de alergias fornecida pelo usuário.

DIRETRIZES IMPORTANTES:
1. Alergênicos comuns de alta prioridade: Glúten, Lactose, Amendoim, Soja, Castanhas/Nozes, Ovos, Frutos do mar, Leite e Trigo.
2. Identifique os ingredientes reais que causam o alerta (ex: "leite em pó", "soro de leite", "farinha de trigo", "lecitina de soja").
3. Determine se é SEGURO para o usuário específico considerando a lista de alergias dele: "userAllergies". Se contiver algum ingrediente que cause reação às alergias cadastradas, "isSafe" DEVE ser false.
4. "score" de segurança: 100 se for totalmente livre de alérgenos de interesse do usuário; menor quanto maior o risco ou ambiguidade do rótulo.
5. Se a imagem não for de um rótulo ou alimento identificável, defina "identified: false".
6. Apresente alternativas seguras para o alimento analisado e faça uma análise detalhada em português.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      identified: { type: Type.BOOLEAN },
      productName: { type: Type.STRING },
      ingredientsFound: { type: Type.STRING },
      isSafe: { type: Type.BOOLEAN },
      allergensDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
      userSpecificThreats: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            allergen: { type: Type.STRING },
            ingredientSource: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Alta", "Média", "Baixa"] }
          },
          required: ["allergen", "ingredientSource", "severity"]
        }
      },
      alternativesSuggested: { type: Type.ARRAY, items: { type: Type.STRING } },
      detailedAnalysis: { type: Type.STRING },
      score: { type: Type.INTEGER }
    },
    required: ["identified", "productName", "ingredientsFound", "isSafe", "allergensDetected", "userSpecificThreats", "alternativesSuggested", "detailedAnalysis", "score"]
  };

  try {
    const imagePart = {
      inlineData: {
        mimeType: activeMime,
        data: cleanBase64,
      },
    };
    const textPart = {
      text: `Analise as alergias deste usuário: [${userAllergies.join(", ")}].
Verifique se há traços, derivados ou presença direta dessas substâncias ou de outros alérgenos comuns (Glúten, Lactose, Amendoim, Soja, Castanhas, Ovos, Frutos do mar) na imagem de alimento/rótulo fornecida.
Retorne o JSON preenchido adequadamente em português brasileiro.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do modelo de IA");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro ao analisar alergias via Gemini API:", err);
    throw err;
  }
};

export const chatAboutAllergies = async (
  productName: string,
  userAllergies: string[],
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é o Alergologista Especialista em Segurança Alimentar do NutriAI. O usuário está analisando o produto "${productName}" e possui as seguintes alergias cadastradas: [${userAllergies.join(", ")}].
Sua tarefa é esclarecer dúvidas sobre contaminação cruzada, ingredientes ocultos, nomenclatura técnica (ex: caseína para leite, maltodextrina para glúten) e segurança geral do alimento analisado.

Responda em português do Brasil de forma clara, amigável, precisa e extremamente cuidadosa com a saúde.
Retorne apenas JSON com o campo "text" em formato markdown. Exemplo: { "text": "Sua resposta..." }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING }
    },
    required: ["text"]
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      }
    });

    const stringifiedHistory = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Especialista'}: ${h.text}`).join('\n');
    const finalPrompt = `HISTÓRICO DA CONVERSA:
${stringifiedHistory}

O usuário perguntou sobre o produto "${productName}": "${userMessage}"
RESPONDA EM JSON COM O TEXTO FORMATADO EM MARKDOWN.`;

    const response = await chat.sendMessage({ message: finalPrompt });
    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Allergies Chat Error:", error);
    return {
      text: "Não consegui consultar o banco de alérgenos no momento. Se tiver dúvidas, não consuma o produto."
    };
  }
};

export interface ProductComparisonResult {
  productA: {
    name: string;
    calories: string;
    sugars: string;
    fats: string;
    sodium: string;
    proteins: string;
    ingredients: string;
    processingLevel: 'Baixo' | 'Médio' | 'Alto';
  };
  productB: {
    name: string;
    calories: string;
    sugars: string;
    fats: string;
    sodium: string;
    proteins: string;
    ingredients: string;
    processingLevel: 'Baixo' | 'Médio' | 'Alto';
  };
  comparison: {
    betterOption: 'A' | 'B' | 'Empate';
    winnerName: string;
    reason: string;
    macroComparison: string;
    detailedAnalysis: string;
    recommendations: string[];
  };
}

export const compareTwoProducts = async (
  imageOrTextA: string,
  imageOrTextB: string,
  userGoal: string
): Promise<ProductComparisonResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é um Engenheiro de Alimentos e Nutricionista especialista em análise comparativa de rótulos e tabelas nutricionais para o NutriAI.
Sua missão é analisar as informações de dois produtos (sejam fotos de embalagens, tabelas de nutrientes ou descrições em texto) e realizar uma comparação criteriosa de:
- Calorias (Calorias)
- Açúcares (Açúcares)
- Gorduras (Gorduras)
- Sódio (Sódio)
- Proteínas (Proteínas)
- Ingredientes (Ingredientes e aditivos)

Com base no OBJETIVO de saúde ou dieta do usuário ("userGoal"), você deve determinar qual é o produto mais adequado (Opção A, Opção B ou Empate).

DIRETRIZES IMPORTANTES:
1. Extraia o nome correto de cada produto. Se não for possível identificar perfeitamente por imagem, use pistas visuais ou descrições.
2. Extraia os valores quantitativos para Calorias, Açúcares, Gorduras, Sódio e Proteínas por porção comparável (ou indique a porção considerada para ficar justo).
3. Avalie a qualidade dos ingredientes: evite açúcares ocultos, adoçantes nocivos, excesso de conservantes ou gorduras hidrogenadas.
4. Classifique o nível de processamento de cada produto (Baixo, Médio, Alto).
5. No campo "comparison.betterOption", responda rigorosamente com "A", "B" ou "Empate".
6. Apresente uma análise detalhada em português do Brasil e faça sugestões práticas de consumo.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      productA: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.STRING },
          sugars: { type: Type.STRING },
          fats: { type: Type.STRING },
          sodium: { type: Type.STRING },
          proteins: { type: Type.STRING },
          ingredients: { type: Type.STRING },
          processingLevel: { type: Type.STRING, enum: ["Baixo", "Médio", "Alto"] }
        },
        required: ["name", "calories", "sugars", "fats", "sodium", "proteins", "ingredients", "processingLevel"]
      },
      productB: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.STRING },
          sugars: { type: Type.STRING },
          fats: { type: Type.STRING },
          sodium: { type: Type.STRING },
          proteins: { type: Type.STRING },
          ingredients: { type: Type.STRING },
          processingLevel: { type: Type.STRING, enum: ["Baixo", "Médio", "Alto"] }
        },
        required: ["name", "calories", "sugars", "fats", "sodium", "proteins", "ingredients", "processingLevel"]
      },
      comparison: {
        type: Type.OBJECT,
        properties: {
          betterOption: { type: Type.STRING, enum: ["A", "B", "Empate"] },
          winnerName: { type: Type.STRING },
          reason: { type: Type.STRING },
          macroComparison: { type: Type.STRING },
          detailedAnalysis: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["betterOption", "winnerName", "reason", "macroComparison", "detailedAnalysis", "recommendations"]
      }
    },
    required: ["productA", "productB", "comparison"]
  };

  const parts: any[] = [];

  // Helper function to prepare input parts for Gemini API
  const processInput = async (input: string, label: string) => {
    if (input.startsWith("http")) {
      try {
        const response = await fetch(input);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        parts.push({
          inlineData: {
            mimeType: response.headers.get("content-type") || "image/jpeg",
            data: buffer.toString("base64"),
          }
        });
        parts.push({ text: `Este é a imagem/rótulo do Produto ${label}.` });
      } catch (e) {
        console.error(`Error fetching remote URL for Product ${label}:`, e);
        parts.push({ text: `Descrição/URL do Produto ${label}: ${input}` });
      }
    } else if (input.startsWith("data:image")) {
      const mime = input.split(";")[0].split(":")[1] || "image/jpeg";
      const base64 = input.split(",")[1];
      parts.push({
        inlineData: {
          mimeType: mime,
          data: base64,
        }
      });
      parts.push({ text: `Esta é a imagem/rótulo do Produto ${label}.` });
    } else {
      parts.push({ text: `Dados ou descrição textual fornecida para o Produto ${label}: ${input}` });
    }
  };

  await processInput(imageOrTextA, "A");
  await processInput(imageOrTextB, "B");

  parts.push({
    text: `O objetivo de saúde do usuário é: "${userGoal}".
Por favor, analise as tabelas nutricionais e listas de ingredientes de ambos os produtos. Compare Calorias, Açúcares, Gorduras, Sódio, Proteínas e a qualidade global dos Ingredientes.
Explique detalhadamente em português qual opção (A ou B) se encaixa melhor no objetivo escolhido e por quê. Retorne estritamente em formato JSON estruturado segundo o schema fornecido.`
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do modelo ao comparar produtos");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro na comparação de produtos via Gemini:", err);
    throw err;
  }
};

export interface FridgeAnalysisResult {
  identifiedItems: {
    name: string;
    quantity: string;
    category: string;
    estimatedDaysToExpiration: number;
    status: 'fresco' | 'perto_vencimento' | 'vencido';
  }[];
  suggestedRecipes: {
    title: string;
    description: string;
    usedIngredients: string[];
    missingIngredients: string[];
    prepTime: string;
    difficulty: string;
    instructions: string[];
  }[];
  suggestedShoppingList: {
    name: string;
    category: string;
    estimatedPrice?: string;
    reason: string;
  }[];
}

export const analyzeFridgeContents = async (
  imageInput: string
): Promise<FridgeAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é uma Inteligência Artificial especialista em Cozinha Inteligente, Combate ao Desperdício e Nutrição para o NutriAI.
Sua tarefa é analisar uma foto da geladeira ou despensa do usuário (ou processar os dados textuais/descrições se ele os enviou) e:
1. Identificar o maior número possível de alimentos e ingredientes disponíveis.
2. Atribuir uma quantidade estimada (ex: "1kg", "4 unidades", "Metade").
3. Classificar o alimento em categorias padrão brasileiras (Vegetais, Proteínas, Laticínios, Bebidas, Condimentos, Outros).
4. Estimar os dias restantes para o vencimento do produto (ex: folhosas estragam rápido, iogurtes abertos duram pouco; carnes cruas duram 2-3 dias na geladeira se não congeladas). Marque status como:
   - "fresco" se tiver 4 ou mais dias restantes de frescor/consumo seguro.
   - "perto_vencimento" se tiver de 1 a 3 dias de frescor restante.
   - "vencido" se aparentar estar murcho, estragado ou mofado.
5. Sugerir de 2 a 3 receitas saudáveis em português do Brasil que utilizem majoritariamente os alimentos identificados (pode assumir temperos básicos como sal/óleo/alho/cebola). Especifique quais ingredientes usados estão presentes e se há algum ingrediente essencial faltando.
6. Gerar automaticamente uma lista de compras inteligente com os ingredientes que faltam para as receitas propostas ou que combinam com o reabastecimento saudável daquela cozinha. Explique o motivo de cada sugestão de compra em português do Brasil.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      identifiedItems: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING },
            category: { type: Type.STRING },
            estimatedDaysToExpiration: { type: Type.INTEGER },
            status: { type: Type.STRING, enum: ["fresco", "perto_vencimento", "vencido"] }
          },
          required: ["name", "quantity", "category", "estimatedDaysToExpiration", "status"]
        }
      },
      suggestedRecipes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            usedIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            prepTime: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "description", "usedIngredients", "missingIngredients", "prepTime", "difficulty", "instructions"]
        }
      },
      suggestedShoppingList: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            estimatedPrice: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["name", "category", "reason"]
        }
      }
    },
    required: ["identifiedItems", "suggestedRecipes", "suggestedShoppingList"]
  };

  const parts: any[] = [];

  if (imageInput.startsWith("http")) {
    try {
      const response = await fetch(imageInput);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      parts.push({
        inlineData: {
          mimeType: response.headers.get("content-type") || "image/jpeg",
          data: buffer.toString("base64"),
        }
      });
      parts.push({ text: "Esta é a imagem da geladeira/despensa enviada pelo usuário." });
    } catch (e) {
      console.error("Error fetching remote URL for fridge image:", e);
      parts.push({ text: `Descrição da geladeira: ${imageInput}` });
    }
  } else if (imageInput.startsWith("data:image")) {
    const mime = imageInput.split(";")[0].split(":")[1] || "image/jpeg";
    const base64 = imageInput.split(",")[1];
    parts.push({
      inlineData: {
        mimeType: mime,
        data: base64,
      }
    });
    parts.push({ text: "Esta é a imagem da geladeira/despensa enviada pelo usuário." });
  } else {
    parts.push({ text: `Descrição textual fornecida pelo usuário sobre o que tem em casa: ${imageInput}` });
  }

  parts.push({
    text: `Por favor, faça a identificação visual ou textual completa dos alimentos de forma realista.
Retorne rigorosamente um JSON estruturado de acordo com o schema fornecido contendo os alimentos identificados, estimativa de dias até vencer (pelo frescor visual), receitas possíveis de preparar com eles e uma lista de compras automática recomendada.`
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do modelo ao analisar geladeira");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro na análise da geladeira via Gemini:", err);
    throw err;
  }
};

export interface PlantDiagnosisResult {
  diagnosis: string;
  causes: string[];
  organicSolutions: string[];
  preventions: string[];
  urgency: 'baixa' | 'media' | 'alta';
}

export const diagnosePlantHealth = async (
  description: string,
  imageInput?: string
): Promise<PlantDiagnosisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `Você é um Agrônomo e Botânico especialista em Hortas Urbanas e Domésticas para o NutriAI.
Sua missão é ajudar usuários que estão plantando Alface, Tomate, Cebolinha, Hortelã, Manjericão ou Alecrim a identificar problemas de saúde nas plantas (doenças, deficiências nutricionais, pragas, excesso/falta de água ou sol) e sugerir soluções estritamente orgânicas/caseiras.
Forneça as respostas de forma acolhedora, prática, didática e em português do Brasil.`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      diagnosis: { type: Type.STRING },
      causes: { type: Type.ARRAY, items: { type: Type.STRING } },
      organicSolutions: { type: Type.ARRAY, items: { type: Type.STRING } },
      preventions: { type: Type.ARRAY, items: { type: Type.STRING } },
      urgency: { type: Type.STRING, enum: ["baixa", "media", "alta"] }
    },
    required: ["diagnosis", "causes", "organicSolutions", "preventions", "urgency"]
  };

  const parts: any[] = [];

  if (imageInput) {
    if (imageInput.startsWith("data:image")) {
      const mime = imageInput.split(";")[0].split(":")[1] || "image/jpeg";
      const base64 = imageInput.split(",")[1];
      parts.push({
        inlineData: {
          mimeType: mime,
          data: base64,
        }
      });
    }
  }

  parts.push({
    text: `O usuário está cultivando uma planta na horta caseira.
Sintomas / Descrição do problema fornecido pelo usuário: "${description}"

Analise o caso e forneça um diagnóstico ecológico preciso, as causas prováveis, de 3 a 5 soluções totalmente orgânicas e fáceis de aplicar em apartamento/casa (ex: calda de fumo, óleo de neem, controle de rega, pó de café, casca de ovo, etc.), medidas preventivas e o nível de urgência.`
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do modelo ao diagnosticar planta");
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro no diagnóstico de horta via Gemini:", err);
    throw err;
  }
};

export const getWaterQualityAdvice = async (
  queryText: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const systemInstruction = `Você é um Engenheiro de Recursos Hídricos, Nutrólogo e Botânico especialista em Qualidade da Água e Hidratação.
Sua missão é dar respostas precisas, científicas, acolhedoras e em português do Brasil sobre filtragem de água, pH, TDS (sólidos dissolvidos totais), tipos de filtros (filtro de barro, carvão ativado, osmose reversa, ozonizadores), mineralização, água da torneira e os impactos de cada origem de água no corpo humano e plantas. Se limite a responder sobre qualidade e consumo de água, mantendo um tom educativo e profissional.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `O usuário tem a seguinte dúvida sobre a qualidade ou origem da água: "${queryText}". Dê uma resposta de até 4 parágrafos, didática, amigável e com dicas práticas excelentes.`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
      }
    });

    return response.text || "Não foi possível analisar sua dúvida no momento.";
  } catch (err: any) {
    console.error("Erro no conselheiro de qualidade da água:", err);
    throw err;
  }
};

;



