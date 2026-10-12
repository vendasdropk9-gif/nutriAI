import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile } from "../types";
import { getGeminiApiKey } from "./gemini.server";

export const generateNutritionalTip = async (profile: UserProfile | null): Promise<string> => {
  const ai = new GoogleGenAI({
    apiKey: getGeminiApiKey(),
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const prompt = `Você é um nutricionista especialista em ciência dos alimentos.
Forneça uma curiosidade curta, fascinante e baseada em ciência sobre hábitos alimentares que seja relevante para o perfil do usuário.
Perfil do Usuário:
Objetivo: ${profile?.goals || "Saúde"}
Estilo de vida: ${profile?.activityLevel || "Moderado"}
Restrições: ${profile?.restrictions?.join(', ') || "Nenhuma"}

A curiosidade deve ter no máximo 2 frases e ser escrita em português brasileiro, motivadora e informativa.
Responda APENAS com o texto da curiosidade.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });

    return response.text || "Comer conscientemente melhora a digestão e ajuda seu corpo a absorver melhor os nutrientes!";
  } catch (error) {
    console.error("Erro ao gerar dica nutricional:", error);
    return "Comer conscientemente melhora a digestão e ajuda seu corpo a absorver melhor os nutrientes!";
  }
};
