import React, { useState, useEffect } from 'react';
import { Camera, Wifi, WifiOff, AlertTriangle, ShieldCheck, Maximize2, Settings, Loader2, Plus } from 'lucide-react';
import { CameraSetupModal, NewCameraPayload } from './CameraSetupModal';

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'connecting';
  lastPing: string;
}

const mockCameras: CameraFeed[] = [
  { id: 'cam-1', name: 'Cam 01 - Cozinha', location: 'Cozinha', status: 'online', lastPing: 'Agora mesmo' },
  { id: 'cam-2', name: 'Cam 02 - Frente de Loja', location: 'Balcão Principal', status: 'online', lastPing: 'Agora mesmo' },
  { id: 'cam-3', name: 'Cam 03 - Estoque', location: 'Corredor B', status: 'offline', lastPing: 'Há 5 minutos' },
];

export const CameraDashboard: React.FC = () => {
  const [cameras, setCameras] = useState<CameraFeed[]>(mockCameras);
  const [selectedCam, setSelectedCam] = useState<CameraFeed | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const handleAddCamera = (newCamPayload: NewCameraPayload) => {
    if (cameras.length >= 4) return;
    const newCamera: CameraFeed = {
      id: `cam-${Date.now()}`,
      name: newCamPayload.name,
      location: newCamPayload.location,
      status: 'connecting',
      lastPing: 'Conectando...'
    };
    setCameras(prev => [...prev, newCamera]);
  };
  
  // Simulate connection updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCameras(prev => prev.map(cam => {
        if (cam.status === 'connecting') {
          return { ...cam, status: Math.random() > 0.5 ? 'online' : 'connecting', lastPing: 'Agora mesmo' };
        }
        if (cam.id === 'cam-3' && Math.random() > 0.8) {
          return { ...cam, status: 'online', lastPing: 'Agora mesmo' };
        }
        return cam;
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-emerald-500" />
            Central de Câmeras
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Monitoramento ao vivo de todas as áreas do estabelecimento.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 font-medium text-sm hidden sm:flex">
            <ShieldCheck className="w-4 h-4" />
            Sistema Seguro
          </div>
          <button 
            onClick={() => setIsSetupModalOpen(true)}
            disabled={cameras.length >= 4}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 text-white rounded-xl flex items-center gap-2 font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 disabled:shadow-none disabled:cursor-not-allowed"
            title={cameras.length >= 4 ? "Limite máximo de 4 câmeras atingido" : "Adicionar nova câmera"}
          >
            <Plus className="w-4 h-4" />
            Nova Câmera
          </button>
          <button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {cameras.length >= 4 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>Você atingiu o limite de <strong>4 câmeras ativas</strong> do seu plano atual. Para adicionar mais dispositivos de monitoramento, faça um upgrade no seu painel de configurações.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cameras.map(cam => (
          <div key={cam.id} className="bg-slate-950 rounded-[24px] overflow-hidden border border-slate-800 flex flex-col group relative">
            <div className="p-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-800 absolute top-0 w-full z-10">
              <div className="flex flex-col">
                <span className="font-semibold text-white">{cam.name}</span>
                <span className="text-xs text-slate-400">{cam.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline-block">{cam.lastPing}</span>
                {cam.status === 'online' && (
                  <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1.5 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Online
                  </div>
                )}
                {cam.status === 'offline' && (
                  <div className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-xs font-medium flex items-center gap-1.5 border border-rose-500/30">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </div>
                )}
                {cam.status === 'connecting' && (
                  <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1.5 border border-amber-500/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Conectando
                  </div>
                )}
                <button 
                  onClick={() => setSelectedCam(cam)}
                  className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="aspect-video w-full bg-slate-900 relative flex items-center justify-center">
              {cam.status === 'online' ? (
                <div className="absolute inset-0 w-full h-full">
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.03]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="border border-white/50" />
                    ))}
                  </div>
                  {/* Fake camera feed representation */}
                  <div className="w-full h-full object-cover bg-gradient-to-br from-slate-800 to-slate-900" />
                  <div className="absolute bottom-4 left-4 text-xs font-mono text-white/50 drop-shadow-md">
                    REC ⏺ {new Date().toLocaleTimeString()} - {cam.name}
                  </div>
                </div>
              ) : cam.status === 'connecting' ? (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <span className="text-sm">Estabelecendo conexão...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-rose-500/50" />
                  <span className="text-sm">Sinal Perdido</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Expanded Modal */}
      {selectedCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-950 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-white text-lg">{selectedCam.name}</h3>
                <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">{selectedCam.location}</span>
              </div>
              <button 
                onClick={() => setSelectedCam(null)}
                className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full bg-black relative flex items-center justify-center">
              {selectedCam.status === 'online' ? (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                   <div className="absolute bottom-6 left-6 text-sm font-mono text-white/70 drop-shadow-md">
                    {new Date().toLocaleString()} - HD 1080p - 30FPS
                  </div>
                  <div className="absolute top-6 right-6">
                     <div className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div> LIVE
                     </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <WifiOff className="w-12 h-12 mb-4 opacity-50" />
                  <p>Sem sinal da câmera.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CameraSetupModal 
        isOpen={isSetupModalOpen} 
        onClose={() => setIsSetupModalOpen(false)} 
        onAdd={handleAddCamera}
      />
    </div>
  );
};
