import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Olá",
      config: {
        responseModalities: ["AUDIO"],
      }
    });
    console.log("Success with 2.5-flash-audio!");
  } catch (e: any) {
    console.log("Error 2.5:", e.message);
  }
}
run();
