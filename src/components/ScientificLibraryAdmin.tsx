import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, FileText, Database, Shield, Upload, Search, Activity, AlertTriangle, RefreshCw, X, CheckCircle, ExternalLink, Settings, Layers, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Helper to determine if we are ready
const isReady = !!((import.meta as any).env?.VITE_SUPABASE_URL && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

interface LibraryStats {
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  errorDocuments: number;
  totalPages: number;
  totalChunks: number;
}

interface Document {
  id: string;
  title: string;
  author: string;
  institution: string;
  year: string;
  category_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  trust_level: string;
  page_count: number;
  created_at: string;
}

export function ScientificLibraryAdmin() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isReady) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // For a real implementation, we'd call an API endpoint that aggregates these safely, 
      // but here we can query supabase directly if RLS allows admin, or use the backend.
      // Let's use the backend API to ensure we don't expose things or require complex RLS for aggregation
      const res = await fetch('/api/admin/library/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDocuments(data.documents);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Enviando...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));
    // In a real app we'd open a modal to collect metadata first.
    formData.append('trust_level', 'high');
    formData.append('category', 'Geral');

    try {
      const res = await fetch('/api/admin/library/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Falha no upload');
      setUploadStatus('Processando...');
      
      // Wait a bit, then reload
      setTimeout(() => {
        loadData();
        setIsUploading(false);
        setUploadStatus('');
      }, 2000);
    } catch (error) {
      setUploadStatus('Erro no upload');
      setTimeout(() => setIsUploading(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 pt-safe-top">
      <div className="bg-emerald-600 px-6 py-8 rounded-b-3xl text-white shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-semibold font-poppins">Biblioteca Científica</h1>
          </div>
          <button className="p-2 bg-emerald-500 rounded-full hover:bg-emerald-400 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <p className="text-emerald-100 mt-2 text-sm">Painel Administrativo da Malu RAG</p>
      </div>

      <div className="px-6 mt-6 max-w-7xl mx-auto space-y-6">
        
        {/* Upload Action */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 flex flex-col items-center justify-center text-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".pdf" 
            className="hidden" 
          />
          
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
            {isUploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>
          <h3 className="font-semibold text-neutral-800 text-lg mb-2">
            {isUploading ? uploadStatus : 'Adicionar novo documento'}
          </h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm">
            Faça upload de PDFs científicos (Farmacopeia, ANVISA, artigos). Eles serão extraídos, divididos e vetorizados.
          </p>
          <button 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-emerald-600 text-white px-8 py-3 rounded-full font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            + ADICIONAR DOCUMENTO
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="flex items-center space-x-2 text-emerald-600 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Documentos</span>
            </div>
            <span className="text-2xl font-bold text-neutral-800">{stats?.totalDocuments || 0}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="flex items-center space-x-2 text-blue-600 mb-2">
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">Páginas</span>
            </div>
            <span className="text-2xl font-bold text-neutral-800">{stats?.totalPages || 0}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="flex items-center space-x-2 text-indigo-600 mb-2">
              <Hash className="w-4 h-4" />
              <span className="text-sm font-medium">Trechos (Chunks)</span>
            </div>
            <span className="text-2xl font-bold text-neutral-800">{stats?.totalChunks || 0}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="flex items-center space-x-2 text-amber-500 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Embeddings</span>
            </div>
            <span className="text-2xl font-bold text-neutral-800">{stats?.totalChunks || 0}</span>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-neutral-800 font-poppins">Fontes Indexadas</h2>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Buscar fontes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase())).map((doc) => (
              <div key={doc.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-neutral-800">{doc.title}</h3>
                    {doc.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {doc.status === 'processing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                    {doc.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-neutral-500">
                    <span>{doc.page_count} páginas</span>
                    <span>•</span>
                    <span>Confiança: {doc.trust_level}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    Ver detalhes
                  </button>
                  <button className="p-2 text-neutral-400 hover:text-emerald-600 transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            {documents.length === 0 && !loading && (
              <div className="p-12 text-center text-neutral-500">
                <Database className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>Nenhum documento encontrado na base.</p>
                <p className="text-sm mt-1">Execute o script SQL e adicione seu primeiro PDF.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
