import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import pdf from "pdf-parse-new";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');

export const upload = multer({ dest: '/tmp/library_uploads/' });

function chunkText(text: string, pageNum: number, maxTokens = 500) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxTokens * 4) {
      if (currentChunk.trim().length > 0) {
        chunks.push({ content: currentChunk.trim(), page: pageNum });
      }
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push({ content: currentChunk.trim(), page: pageNum });
  }
  return chunks;
}

export async function handleLibraryUpload(req: any, res: any) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const title = req.body.title || req.file.originalname;
  const trust_level = req.body.trust_level || 'high';
  
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    const fullText = pdfData.text;
    const pageCount = pdfData.numpages || 1;
    const charsPerPage = Math.floor(fullText.length / pageCount) || 1;
    
    let docId = uuidv4();
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const { data: docRecord, error: docErr } = await supabase.from('library_documents').insert({
        title,
        status: 'processing',
        trust_level,
        page_count: pageCount
      }).select().single();
      
      if (!docErr && docRecord) docId = docRecord.id;
    }

    let allChunks: any[] = [];
    for (let p = 1; p <= pageCount; p++) {
      const pageText = fullText.slice((p-1)*charsPerPage, p*charsPerPage);
      const pageChunks = chunkText(pageText, p);
      allChunks.push(...pageChunks);
    }
    
    res.status(200).json({ success: true, message: 'Processing started', documentId: docId });
    
    (async () => {
      try {
        for (let i = 0; i < allChunks.length; i++) {
          const chunk = allChunks[i];
          try {
            const embedResponse = await ai.models.embedContent({
              model: 'gemini-embedding-2-preview',
              contents: chunk.content
            });
            const embedding = embedResponse.embeddings?.[0]?.values;
            
            if (embedding && supabaseUrl && !supabaseUrl.includes('placeholder')) {
               await supabase.from('library_chunks').insert({
                 document_id: docId,
                 page_number: chunk.page,
                 chunk_index: i,
                 content: chunk.content,
                 embedding
               });
            }
          } catch (e) {
            console.error('Error generating embedding for chunk:', e);
          }
        }
        
        if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
          await supabase.from('library_documents')
            .update({ status: 'completed' })
            .eq('id', docId);
        }
      } catch (e) {
        console.error('Background processing error:', e);
      }
    })();
    
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getLibraryStats(req: any, res: any) {
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    const { count: totalDocs } = await supabase.from('library_documents').select('*', { count: 'exact', head: true });
    const { count: totalChunks } = await supabase.from('library_chunks').select('*', { count: 'exact', head: true });
    const { data: documents } = await supabase.from('library_documents').select('*').order('created_at', { ascending: false });
    
    return res.json({
      stats: {
        totalDocuments: totalDocs || 0,
        totalChunks: totalChunks || 0,
        totalPages: documents?.reduce((acc, d) => acc + (d.page_count || 0), 0) || 0
      },
      documents: documents || []
    });
  }
  
  res.json({
    stats: { totalDocuments: 0, totalPages: 0, totalChunks: 0 },
    documents: []
  });
}

export async function searchScientificLibrary(query: string) {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) return [];
  
  try {
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: query
    });
    const embedding = embedResponse.embeddings?.[0]?.values;
    
    if (embedding) {
      const { data, error } = await supabase.rpc('search_library_chunks', {
        query_embedding: embedding,
        match_count: 5
      });
      
      if (!error && data) {
        return data;
      }
    }
  } catch (e) {
    console.error('Error searching library:', e);
  }
  return [];
}
