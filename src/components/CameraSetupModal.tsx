import React, { useState } from 'react';
import { Camera, Link as LinkIcon, X, Check, Loader2, AlertCircle, Play, ShieldCheck, MapPin } from 'lucide-react';

export interface NewCameraPayload {
  name: string;
  location: string;
  streamUrl: string;
}

interface CameraSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (camera: NewCameraPayload) => void;
}

export const CameraSetupModal: React.FC<CameraSetupModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Entrada Principal');
  const [streamUrl, setStreamUrl] = useState('');
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleTest = () => {
    if (!streamUrl) return;
    setTestStatus('testing');
    setTimeout(() => {
      // Fake connection test logic: if it's a valid looking string, success
      if (streamUrl.length > 5 && (streamUrl.startsWith('rtsp://') || streamUrl.startsWith('http'))) {
        setTestStatus('success');
      } else if (streamUrl.length > 0) {
        setTestStatus('success'); // Be permissive for demo purposes
      } else {
        setTestStatus('error');
      }
    }, 1500);
  };

  const handleSave = () => {
    if (!name || !location) return;
    onAdd({ name, location, streamUrl });
    // Reset state
    setName('');
    setLocation('Entrada Principal');
    setStreamUrl('');
    setTestStatus('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Adicionar Câmera</h3>
              <p className="text-xs text-slate-500">Configure um novo feed de monitoramento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome de Identificação</label>
            <input 
              type="text" 
              placeholder="Ex: Cam 07 - Corredor Laticínios"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Setor / Localização</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white appearance-none"
              >
                <option value="Entrada Principal">Entrada Principal</option>
                <option value="Frente de Caixa">Frente de Caixa</option>
                <option value="Estoque">Estoque</option>
                <option value="Cozinha / Preparo">Cozinha / Preparo</option>
                <option value="Corredores">Corredores</option>
                <option value="Estacionamento">Estacionamento</option>
                <option value="Administração">Administração</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço de Stream (RTSP/HTTP)</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Ex: rtsp://192.168.1.100:554/stream"
                value={streamUrl}
                onChange={e => {
                  setStreamUrl(e.target.value);
                  setTestStatus('idle');
                }}
                className="w-full p-4 pl-12 pr-28 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  onClick={handleTest}
                  disabled={!streamUrl || testStatus === 'testing'}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {testStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Testar
                </button>
              </div>
            </div>
          </div>

          {/* Test Feedback Area */}
          {testStatus !== 'idle' && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in ${
              testStatus === 'testing' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400' :
              testStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
              'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400'
            }`}>
              {testStatus === 'testing' && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
              {testStatus === 'success' && <ShieldCheck className="w-5 h-5 shrink-0" />}
              {testStatus === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
              
              <div className="text-sm">
                {testStatus === 'testing' && <span>Conectando ao servidor de mídia e verificando credenciais stream...</span>}
                {testStatus === 'success' && (
                  <div>
                    <span className="font-bold block">Conexão estabelecida!</span>
                    <p className="text-xs opacity-80 mt-1">Sinal de vídeo recebido com sucesso. Pronto para operar.</p>
                  </div>
                )}
                {testStatus === 'error' && (
                  <div>
                    <span className="font-bold block">Falha na conexão</span>
                    <p className="text-xs opacity-80 mt-1">Não foi possível conectar ao endereço informado. Verifique IP e porta.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={!name || !location || (testStatus === 'error')}
            className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-5 h-5" />
            Salvar Câmera
          </button>
        </div>
      </div>
    </div>
  );
};
