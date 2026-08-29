import * as geminiServer from '../src/lib/gemini.server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {}
    }

    const { text } = body || {};
    if (!text) {
      return res.status(400).json({ error: 'Nenhum texto informado.' });
    }

    const audio = await geminiServer.textToSpeech(text);
    return res.status(200).json({ audio: audio || null });
  } catch (err: any) {
    console.error('Erro no TTS Serverless handler:', err);
    return res.status(200).json({ audio: null, error: err?.message || 'Erro ao gerar áudio.' });
  }
}

