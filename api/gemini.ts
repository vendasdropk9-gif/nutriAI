import * as geminiServer from '../src/lib/gemini.server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {}
    }

    const { functionName, args } = body || {};

    if (!functionName || typeof functionName !== 'string') {
      return res.status(400).json({ error: 'Nome de função Gemini inválido ou ausente.' });
    }

    const func = (geminiServer as any)[functionName];
    if (!func || typeof func !== 'function') {
      return res.status(404).json({ error: `Função '${functionName}' não localizada no backend do Gemini.` });
    }

    const result = await func(...(args || []));
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Erro na execução da API Gemini Serverless Function:', err);
    return res.status(500).json({
      error: err?.message || 'Erro interno ao processar a requisição no servidor.'
    });
  }
}
