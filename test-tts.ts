import { GoogleGenAI, Modality } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

function wrapPcmInWav(pcmBase64: string, sampleRate: number): Uint8Array {
  const pcmBinaryString = atob(pcmBase64);
  const pcmLength = pcmBinaryString.length;
  const pcmBytes = new Uint8Array(pcmLength);
  for (let i = 0; i < pcmLength; i++) {
    pcmBytes[i] = pcmBinaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: "Nutri A I" }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const wavBytes = wrapPcmInWav(base64Audio, 24000);
      fs.writeFileSync("src/assets/audio/nutriai_gemini.wav", Buffer.from(wavBytes));
      console.log("Audio generated and saved!");
    } else {
      console.log("No audio generated.");
    }
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
run();
