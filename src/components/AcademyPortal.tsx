import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, MapPin, Phone, Globe, Clock, Star, Share2, 
  Search, ShieldCheck, Mail, ChevronRight, CheckCircle, 
  SlidersHorizontal, Sparkles, Building2, Eye, Compass, 
  Send, User, AlertTriangle, Plus, Trash2, Edit, ChevronLeft, Check, Play, FileText
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface Academy {
  id: string;
  name: string;
  address: string;
  city: string;
  neighborhood: string;
  phone: string;
  email: string;
  website: string;
  about: string;
  modalities: string[];
  hours: string;
  image: string;
  rating: number;
  reviewsCount: number;
  contactCount: number;
  viewsCount: number;
  status: 'PENDENTE' | 'ATIVO' | 'REJEITADO';
  reviews: { id: string; author: string; rating: number; text: string; date: string }[];
}

export const getHighResAcademyImage = (src: string, name: string = ''): string => {
  const normName = name.toLowerCase();
  
  if (normName.includes('iron gym') || src.includes('photo-1534438327276') || src.includes('a1')) {
    return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';
  }
  if (normName.includes('yoga') || normName.includes('surya') || src.includes('photo-1544367567') || src.includes('a2')) {
    return 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200';
  }
  if (normName.includes('acqua') || normName.includes('fitness') || normName.includes('natação') || src.includes('photo-1576013551') || src.includes('a3')) {
    return 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1200';
  }
  if (normName.includes('alliance') || normName.includes('jiu-jitsu') || src.includes('photo-1517838277') || src.includes('a4')) {
    return 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=1200';
  }
  
  // Upgrade sub-standard size requests to high resolution
  if (src && src.includes('unsplash.com/photo-')) {
    if (src.includes('w=600')) return src.replace('w=600', 'w=1200');
    if (src.includes('w=800')) return src.replace('w=800', 'w=1200');
    if (!src.includes('w=')) return `${src}&w=1200`;
  }
  
  return src || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1200';
};

interface AcademyImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
  className?: string;
  name?: string;
}

export function AcademyImage({ src, alt, onClick, className = "", name = "" }: AcademyImageProps) {
  const [imgSrc, setImgSrc] = useState(() => getHighResAcademyImage(src, name));
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImgSrc(getHighResAcademyImage(src, name));
    setHasError(false);
    setIsLoading(true);
  }, [src, name]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError || !imgSrc) {
    const lowerName = name.toLowerCase();
    let bgGradient = "from-emerald-500 to-teal-600";
    let emblem = "🏋️";
    
    if (lowerName.includes("yoga") || lowerName.includes("surya")) {
      bgGradient = "from-teal-500 to-cyan-600";
      emblem = "🧘";
    } else if (lowerName.includes("acqua") || lowerName.includes("natação") || lowerName.includes("piscina")) {
      bgGradient = "from-blue-500 to-indigo-600";
      emblem = "🏊";
    } else if (lowerName.includes("jiu") || lowerName.includes("box") || lowerName.includes("luta")) {
      bgGradient = "from-stone-700 to-slate-900";
      emblem = "🥋";
    }

    return (
      <div 
        onClick={onClick}
        className={`w-full h-full bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer ${className}`}
      >
        <span className="text-4xl md:text-5xl mb-2 filter drop-shadow-md animate-bounce">{emblem}</span>
        <span className="text-white font-serif font-bold text-sm block tracking-wide">{name || "Academia"}</span>
        <span className="text-white/60 font-mono text-[9px] uppercase tracking-widest mt-1">Conexão Offline/Segura Fallback</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
          <Dumbbell className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-all duration-500 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100 hover:scale-105'}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

const PRESET_ACADEMIAS: Academy[] = [
  {
    id: 'a1',
    name: 'Iron Gym Premium',
    address: 'Av. Rebouças, 2200',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    phone: '(11) 98765-4321',
    email: 'contato@irongymbrasil.com.br',
    website: 'https://irongymbrasil.com.br',
    about: 'O maior centro de alta performance de Pinheiros. Equipamentos importados de última geração, ambiente climatizado, professores graduados e acompanhamento personalizado para hipertrofia e condicionamento extremo.',
    modalities: ['Musculação', 'Crossfit', 'Treino Funcional', 'Zumba'],
    hours: 'Seg a Sex: 06h às 23h • Sáb: 08h às 18h • Dom: 09h às 13h',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200',
    rating: 4.9,
    reviewsCount: 48,
    contactCount: 124,
    viewsCount: 1540,
    status: 'ATIVO',
    reviews: [
      { id: 'rev1', author: 'Roberto Santos', rating: 5, text: 'Melhores aparelhos de musculação de São Paulo. Equipe sempre atenta e prestativa.', date: '21/05/2026' },
      { id: 'rev2', author: 'Mariana Lima', rating: 4, text: 'Muito boa, mas costuma encher bastante perto das 19h. Fora isso, impecável.', date: '19/05/2026' }
    ]
  },
  {
    id: 'a2',
    name: 'Surya Yoga & Wellness',
    address: 'Rua Harmonia, 450',
    city: 'São Paulo',
    neighborhood: 'Vila Madalena',
    phone: '(11) 99123-4567',
    email: 'namaste@suryayoga.com.br',
    website: 'https://suryayoga.com.br',
    about: 'Um santuário de paz na Vila Madalena. Oferecemos práticas diárias de Vinyasa, Hatha, Ashtanga Yoga e meditações guiadas, em sintonia com soluções holísticas de bem-estar, chá bar orgânico e terapeutas credenciados.',
    modalities: ['Yoga', 'Pilates', 'Meditação', 'Treino Funcional'],
    hours: 'Seg a Sex: 07h às 21h • Sáb: 09h às 14h',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200',
    rating: 4.8,
    reviewsCount: 32,
    contactCount: 88,
    viewsCount: 920,
    status: 'ATIVO',
    reviews: [
      { id: 'rev3', author: 'Camila Flores', rating: 5, text: 'Praticar yoga nesse espaço renova minhas energias antes do trabalho. O jardim de chás é maravilhoso!', date: '15/05/2026' }
    ]
  },
  {
    id: 'a3',
    name: 'Acqua & Fitness Centro Esportivo',
    address: 'Al. Lorena, 1010',
    city: 'São Paulo',
    neighborhood: 'Jardins',
    phone: '(11) 97777-8888',
    email: 'suporte@acquafit.com.br',
    website: 'https://acquafit.com.br',
    about: 'Instalações aquáticas modernas de alta qualidade para todas as idades. Nossas piscinas são semiolímpicas, salinizadas e aquecidas na temperatura perfeita para natação esportiva e hidroginástica de alta intensidade.',
    modalities: ['Natação', 'Hidroginástica', 'Musculação', 'Pilates'],
    hours: 'Seg a Sex: 06h às 22h • Sáb: 08h às 15h',
    image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1200',
    rating: 4.7,
    reviewsCount: 19,
    contactCount: 65,
    viewsCount: 610,
    status: 'ATIVO',
    reviews: [
      { id: 'rev4', author: 'Thiago Neves', rating: 4, text: 'Piscina aquecida salinizada muito bem tratada. Vestiários limpos e seguros.', date: '12/05/2026' }
    ]
  },
  {
    id: 'a4',
    name: 'Alliance Jiu-Jitsu & Functional Box',
    address: 'Av. Moema, 350',
    city: 'São Paulo',
    neighborhood: 'Moema',
    phone: '(11) 96155-2244',
    email: 'alliancemoema@jiujitsu.com.br',
    website: 'https://alliancemoema.com.br',
    about: 'Lutas, autodefesa e condicionamento físico de alta intensidade unificados em Moema. Treine jiu-jitsu com campeões mundiais ou desafie seus limites na nossa área de Boxe e Treino Funcional.',
    modalities: ['Jiu-Jitsu', 'Lutas / Boxe', 'Treino Funcional'],
    hours: 'Seg a Sex: 07h às 22h • Sáb: 09h às 15h',
    image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=1200',
    rating: 4.9,
    reviewsCount: 55,
    contactCount: 145,
    viewsCount: 1680,
    status: 'ATIVO',
    reviews: [
      { id: 'rev5', author: 'Marcelo Medeiros', rating: 5, text: 'Excelente ambiente familiar e técnica impecável dos sanseis. Recomendado de olhos fechados.', date: '21/05/2026' }
    ]
  }
];

const MODALIDADE_OPTIONS = [
  'Musculação', 'Yoga', 'Pilates', 'Crossfit', 'Natação', 'Hidroginástica', 'Lutas / Boxe', 'Jiu-Jitsu', 'Treino Funcional', 'Zumba', 'Spinning', 'Meditação'
];

const PRESET_COVERS = [
  { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200', label: 'Academia Musculação' },
  { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200', label: 'Estúdio de Yoga' },
  { url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=1200', label: 'Crossfit / Funcional' },
  { url: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1200', label: 'Natação / Piscina' }
];

export function AcademyPortal() {
  const [viewMode, setViewMode] = useState<'explore' | 'partner' | 'admin'>('explore');
  
  // Academies List State
  const [academies, setAcademies] = useState<Academy[]>(() => {
    const local = localStorage.getItem('nutri-academies');
    return local ? JSON.parse(local) : PRESET_ACADEMIAS;
  });

  // Admin section states
  const [adminAcademies, setAdminAcademies] = useState<Academy[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Load from database on mount
  const loadAcademies = (retries = 2) => {
    fetch('/api/academies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAcademies(data);
        } else {
          // Empty DB: use fallback preset and seed
          setAcademies(PRESET_ACADEMIAS);
          PRESET_ACADEMIAS.forEach(entry => {
            fetch('/api/academies/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...entry, ownerUid: 'preset' })
            })
            .then(r => r.json())
            .then(resData => {
              if (resData.success && resData.academyId) {
                fetch(`/api/admin/academies/${resData.academyId}/status`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'ATIVO' })
                }).then(() => {
                  fetch('/api/academies')
                    .then(r => r.json())
                    .then(latest => { if (Array.isArray(latest) && latest.length > 0) setAcademies(latest); });
                });
              }
            });
          });
        }
      })
      .catch(err => {
        if (retries > 0) {
          console.warn(`Erro ao carregar do banco de dados, tentando novamente em 1.5s (${retries} tentativas restantes)...`);
          setTimeout(() => loadAcademies(retries - 1), 1500);
        } else {
          console.warn("Utilizando presets locais após falhas na conexão:", err.message || err);
          setAcademies(PRESET_ACADEMIAS);
        }
      });
  };

  const loadAdminAcademies = () => {
    setAdminLoading(true);
    fetch('/api/admin/academies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAdminAcademies(data);
        }
      })
      .catch(err => console.warn("Erro ao obter academias de administrador:", err))
      .finally(() => setAdminLoading(false));
  };

  useEffect(() => {
    loadAcademies();
  }, []);

  useEffect(() => {
    localStorage.setItem('nutri-academies', JSON.stringify(academies));
  }, [academies]);

  // Explore Workspace States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Todos');
  const [selectedModality, setSelectedModality] = useState('Todos');
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
  
  // Reviews state on detail modal
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Partner Registration State
  const [regStep, setRegStep] = useState<'welcome' | 'form' | 'submitted' | 'dashboard'>('welcome');
  const [myAcademyId, setMyAcademyId] = useState<string | null>(() => {
    return localStorage.getItem('nutri-my-academy-id');
  });

  // Check if we already have registered an academy to skip to dashboard if partner clicked
  useEffect(() => {
    if (myAcademyId) {
      const myAcademy = academies.find(a => a.id === myAcademyId);
      if (myAcademy) {
        setRegStep('dashboard');
      } else {
        localStorage.removeItem('nutri-my-academy-id');
        setMyAcademyId(null);
        setRegStep('welcome');
      }
    }
  }, [myAcademyId, academies]);

  // Onboarding Form FormFields State
  const [businessName, setBusinessName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [about, setAbout] = useState('');
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [hours, setHours] = useState('Seg a Sex: 06h às 22h • Sáb: 08h às 16h');
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0].url);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  // Form validations state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Simulated email delivery view state
  const [simulatedEmail, setSimulatedEmail] = useState<{ to: string; subject: string; body: string } | null>(null);

  // Filter lists based on data
  const neighborhoodsList = ['Todos', ...Array.from(new Set(academies.filter(a => a.status === 'ATIVO').map(a => a.neighborhood)))];
  
  const activeAcademies = academies.filter(a => a.status === 'ATIVO');

  const filteredAcademies = activeAcademies.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.about.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNeighborhood = selectedNeighborhood === 'Todos' || a.neighborhood === selectedNeighborhood;
    const matchesModality = selectedModality === 'Todos' || a.modalities.includes(selectedModality);

    return matchesSearch && matchesNeighborhood && matchesModality;
  });

  const triggerToast = (msg: string) => {
    alert(msg);
  };

  // Submit academy form validation & handling
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const errorList: string[] = [];

    if (!businessName.trim()) errors.name = 'Nome da academia é obrigatório.';
    if (!cnpj.trim()) errors.cnpj = 'CNPJ é obrigatório (para validação fiscal).';
    else if (!/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(cnpj) && cnpj.length < 11) {
      errors.cnpj = 'Insira um CNPJ válido.';
    }
    if (!phone.trim()) errors.phone = 'Telefone para contato direto é obrigatório.';
    if (!email.trim()) errors.email = 'E-mail administrativo é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'E-mail inválido.';
    }
    if (!address.trim()) errors.address = 'Endereço completo é obrigatório.';
    if (!neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório.';
    if (!city.trim()) errors.city = 'Cidade é obrigatória.';
    if (selectedModalities.length === 0) {
      errorList.push('Por favor, selecione pelo menos uma modalidade esportiva.');
    }

    if (Object.keys(errors).length > 0 || errorList.length > 0) {
      setFieldErrors(errors);
      setValidationErrors(errorList);
      playSfx('tap');
      vibrate(100);
      return;
    }

    setFieldErrors({});
    setValidationErrors([]);

    const finalCover = customCoverUrl ? customCoverUrl : coverUrl;

    const registrationPayload = {
      name: businessName,
      address,
      city: city || 'São Paulo - SP',
      neighborhood,
      phone,
      email,
      website: website || 'https://nutriai.app',
      about: about || 'Academia parceira focada no bem-estar integral.',
      modalities: selectedModalities,
      hours,
      image: finalCover,
      ownerUid: 'owner-' + Date.now()
    };

    // Post to Express backend APIs
    fetch('/api/academies/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationPayload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        setValidationErrors([data.error]);
        playSfx('tap');
        return;
      }

      if (data.success && data.academyId) {
        setMyAcademyId(data.academyId);
        localStorage.setItem('nutri-my-academy-id', data.academyId);
        
        // Populate display state
        setAcademies(prev => [...prev, { id: data.academyId, ...data.academy }]);
        
        // Show simulated email confirmation receipt from real server json
        if (data.emailSimulate) {
          setSimulatedEmail({
            to: data.emailSimulate.to,
            subject: data.emailSimulate.subject,
            body: data.emailSimulate.body
          });
        }

        playSfx('success');
        vibrate([50, 100]);
        setRegStep('submitted');
      }
    })
    .catch(err => {
      console.error(err);
      setValidationErrors(['Falha na conexão com o servidor. Tente novamente.']);
    });
  };

  const handleSimulateApproval = () => {
    if (!myAcademyId) return;
    
    fetch(`/api/admin/academies/${myAcademyId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ATIVO" })
    })
    .then(r => r.json())
    .then(() => {
      loadAcademies();
      setAcademies(prev => prev.map(a => {
        if (a.id === myAcademyId) {
          return { ...a, status: 'ATIVO' };
        }
        return a;
      }));
      playSfx('success');
      vibrate([40, 40]);
      triggerToast('Simulação efetuada! Sua academia foi ativada com sucesso e agora está pública no aplicativo!');
    });
  };

  const handleUpdateAcademyDetails = (updatedFields: Partial<Academy>) => {
    if (!myAcademyId) return;

    fetch(`/api/academies/${myAcademyId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: updatedFields })
    })
    .then(() => {
      setAcademies(prev => prev.map(a => {
        if (a.id === myAcademyId) {
          return { ...a, ...updatedFields };
        }
        return a;
      }));
      triggerToast('Informações da sua academia atualizadas com sucesso!');
    })
    .catch(err => console.error("Erro ao atualizar:", err));
  };

  const handlePostReview = (e: React.FormEvent, academyId: string) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewText.trim()) {
      alert('Preencha seu nome e comentário.');
      return;
    }

    fetch(`/api/academies/${academyId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: reviewAuthor, rating: reviewRating, text: reviewText })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.reviews) {
        setAcademies(prev => prev.map(a => {
          if (a.id === academyId) {
            return {
              ...a,
              reviews: data.reviews,
              rating: data.rating,
              reviewsCount: data.reviewsCount
            };
          }
          return a;
        }));

        // Keep detail modal selected item in sync
        setSelectedAcademy(prev => (prev && prev.id === academyId ? {
          ...prev,
          reviews: data.reviews,
          rating: data.rating,
          reviewsCount: data.reviewsCount
        } : prev));

        setReviewAuthor('');
        setReviewText('');
        setReviewSuccess(true);
        playSfx('success');
        setTimeout(() => {
          setReviewSuccess(false);
        }, 4000);
      }
    })
    .catch(err => console.error(err));
  };

  const handleContactClick = (academy: Academy) => {
    // Record click on server
    fetch(`/api/academies/${academy.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'contact' })
    })
    .then(() => {
      setAcademies(prev => prev.map(a => {
        if (a.id === academy.id) {
          return { ...a, contactCount: (a.contactCount || 0) + 1 };
        }
        return a;
      }));
    });

    playSfx('tap');
    vibrate(20);
    
    // Simulate contact redirection safely
    window.open(`https://api.whatsapp.com/send?phone=${academy.phone.replace(/\D/g, '')}&text=Ol%C3%A1%2C%20vi%20a%20sua%20academia%20no%20app%20NutriAI%20e%20gostaria%20de%20saber%2520mais!`, '_blank');
  };

  const handleViewAcademy = (academy: Academy) => {
    // Record view on server
    fetch(`/api/academies/${academy.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' })
    })
    .then(() => {
      setAcademies(prev => prev.map(a => {
        if (a.id === academy.id) {
          return { ...a, viewsCount: (a.viewsCount || 0) + 1 };
        }
        return a;
      }));
    });

    setSelectedAcademy(academy);
    playSfx('tap');
    vibrate(10);
  };

  const myAcademy = myAcademyId ? academies.find(a => a.id === myAcademyId) : null;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 px-1 sm:px-4">
      
      {/* Visual Header */}
      <div className="text-center space-y-4 mb-10">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-800 dark:text-emerald-400">
          Academias Parceiras & Fitness
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
          Encontre os melhores locais avaliados de treino da sua região, ou registre a sua própria academia para conectar-se com nossa comunidade fitness.
        </p>

        {/* Tab Selection */}
        <div className="inline-flex flex-wrap p-1 bg-slate-100 dark:bg-slate-850 rounded-[20px] mx-auto border border-slate-200/60 dark:border-slate-800 gap-1 justify-center">
          <button
            onClick={() => {
              setViewMode('explore');
              playSfx('tap');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              viewMode === 'explore'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            Buscar Academias
          </button>
          
          <button
            onClick={() => {
              setViewMode('partner');
              playSfx('tap');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              viewMode === 'partner'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Portal do Parceiro Gym
          </button>

          <button
            onClick={() => {
              setViewMode('admin');
              playSfx('tap');
              loadAdminAcademies();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              viewMode === 'admin'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Moderação Staff
          </button>
        </div>
      </div>

      {/* WORKSPACE 1: ACTIVE DISCOVERY MAP & LIST FOR USERS */}
      {viewMode === 'explore' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Controls Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-5 rounded-[24px] shadow-sm flex flex-col md:flex-row gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, bairro ou palavra-chave..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      playSfx('success');
                      vibrate(60);
                    }
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  playSfx('success');
                  vibrate(60);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs md:text-sm px-5 py-3 rounded-xl shrink-0 transition-all shadow-md shadow-emerald-500/15 cursor-pointer flex items-center justify-center"
                id="academy-search-apply-btn"
              >
                Buscar
              </motion.button>
            </div>

            {/* Neighborhood Filter */}
            <div className="w-full md:w-56 space-y-1">
              <select
                value={selectedNeighborhood}
                onChange={e => setSelectedNeighborhood(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none border-none cursor-pointer"
              >
                <option value="Todos">📍 Todos os Bairros</option>
                {neighborhoodsList.filter(n => n !== 'Todos').map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Modality Filter */}
            <div className="w-full md:w-56 space-y-1">
              <select
                value={selectedModality}
                onChange={e => setSelectedModality(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none border-none cursor-pointer"
              >
                <option value="Todos">🏋️ Todas as Modalidades</option>
                {MODALIDADE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Core List of active academies */}
          {filteredAcademies.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
              <SlidersHorizontal className="w-12 h-12 text-slate-400 mx-auto animate-pulse" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">Nenhuma academia disponível no filtro</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                  Tente alterar os termos de busca ou filtros de bairros para visualizar outras opções.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedNeighborhood('Todos');
                  setSelectedModality('Todos');
                }}
                className="px-6 py-2.5 bg-emerald-550 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
              {filteredAcademies.map(academy => (
                <div
                  key={academy.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-sm rounded-3xl overflow-hidden group hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Cover image banner */}
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      <AcademyImage
                        src={academy.image}
                        alt={academy.name}
                        onClick={() => handleViewAcademy(academy)}
                        name={academy.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                      />
                      <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-bold text-emerald-600 tracking-wider uppercase border border-white/20 shadow-sm">
                        📍 {academy.neighborhood}
                      </div>
                      
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1 text-white border border-white/10 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        {academy.rating} ({academy.reviewsCount})
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Base stats */}
                      <div className="space-y-1.5">
                        <h4
                          onClick={() => handleViewAcademy(academy)}
                          className="font-serif text-xl sm:text-2xl text-slate-850 dark:text-white font-semibold cursor-pointer hover:text-emerald-600 transition-colors"
                        >
                          {academy.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 leading-relaxed">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {academy.address} - {academy.city}
                        </p>
                      </div>

                      {/* Modalites chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {academy.modalities.map(m => (
                          <span
                            key={m}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                          >
                            {m}
                          </span>
                        ))}
                      </div>

                      <p className="text-slate-500 dark:text-slate-450 text-xs leading-relaxed line-clamp-3">
                        {academy.about}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-slate-50 dark:border-slate-850/50 mt-auto flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleViewAcademy(academy)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      Ver Detalhes
                    </button>

                    <button
                      onClick={() => handleContactClick(academy)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-550 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 duration-150"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Falar c/ Consultor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKSPACE 2: PARTNER ONBOARDING CORE FOR BUSINESS */}
      {viewMode === 'partner' && (
        <div className="max-w-4xl mx-auto space-y-8 duration-300 animate-in fade-in">
          
          {/* Welcome Dashboard Step Selector */}
          {regStep === 'welcome' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-xl flex flex-col md:flex-row">
              <div className="md:w-1/2 p-8 md:p-12 space-y-6 flex flex-col justify-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest rounded-full border border-emerald-500/10">
                  <Dumbbell className="w-3.5 h-3.5" />
                  NutriAI Gym Connection
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl text-slate-900 dark:text-white leading-tight font-medium">
                  Cadastre sua Academia no <span className="text-emerald-600">NutriAI</span>
                </h3>
                <p className="text-slate-500 dark:text-slate-450 text-sm leading-relaxed">
                  Conecte o seu estabelecimento físico com dezenas de alunos próximos do seu bairro que buscam melhores hábitos de vida e exercícios integrativos com nossa inteligência artificial.
                </p>

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-405 leading-relaxed">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Permita adesões e captação de clientes 100% direta, sem comissões.
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-405 leading-relaxed">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Consulte estatísticas e editores de grade de horários a qualquer hora.
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-405 leading-relaxed">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Status de aprovação de cadastro seguro e com validação contra spam.
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setRegStep('form');
                      playSfx('tap');
                    }}
                    className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-full transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 duration-150"
                  >
                    Iniciar Cadastro
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="md:w-1/2 bg-slate-50 dark:bg-slate-950 p-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.3)_0%,transparent_70%)] animate-pulse" />
                <div className="relative text-center space-y-6 max-w-xs">
                  <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-center text-emerald-500 shadow-lg mx-auto">
                    <Building2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Fácil e Confiável</h5>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                      Sua academia passa por uma moderação rápida em até 24 horas para garantir que as informações estão completas para os alunos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Wizard Step */}
          {regStep === 'form' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 sm:p-10 shadow-lg space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-5">
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-slate-850 dark:text-white font-semibold">Formulário de Entrada</h3>
                  <p className="text-xs text-slate-450">Insira as informações do estabelecimento para nossa moderação.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegStep('welcome');
                    playSfx('tap');
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl transition-colors"
                >
                  Voltar
                </button>
              </div>

              {/* Warnings List if validation fails */}
              {(validationErrors.length > 0 || Object.keys(fieldErrors).length > 0) && (
                <div className="bg-red-50 dark:bg-red-950/10 border border-red-150 dark:border-red-950/30 p-4 rounded-2xl space-y-1 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-red-800 dark:text-red-400 leading-relaxed font-medium">
                    {validationErrors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                    {Object.values(fieldErrors).map((fErr, idx) => (
                      <div key={idx}>{fErr}</div>
                    ))}
                    Registre campos corretamente para podermos prosseguir.
                  </div>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                
                {/* Section 1: Basic Identifiers */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome da Academia</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Studio Fitness Integrativo"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.name ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ ou CPF Responsável</label>
                    <input
                      required
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={cnpj}
                      onChange={e => setCnpj(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.cnpj ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone de Contato (WhatsApp)</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: (11) 99999-9999"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.phone ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail para Moderação & Avisos</label>
                    <input
                      required
                      type="email"
                      placeholder="gerencia@academia.com.br"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.email ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Section 2: Contact Options & About */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Site Oficial / Instagram Link</label>
                    <input
                      type="text"
                      placeholder="Ex: https://instagram.com/suaacademia"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ring-1 ring-slate-205 dark:ring-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horários de Funcionamento</label>
                    <input
                      type="text"
                      placeholder="Ex: Seg a Sex: 06h às 22h • Sábado: 08h às 14h"
                      value={hours}
                      onChange={e => setHours(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ring-1 ring-slate-205 dark:ring-slate-700"
                    />
                  </div>
                </div>

                {/* Section 3: Modalities Checklist */}
                <div className="space-y-3.5 bg-slate-50 dark:bg-slate-850/40 p-5 rounded-2xl">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Modalidades Oferecidas</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MODALIDADE_OPTIONS.map(mod => {
                      const isChecked = selectedModalities.includes(mod);
                      return (
                        <label
                          key={mod}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all select-none ${
                            isChecked
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-450'
                              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedModalities(prev => prev.filter(v => v !== mod));
                              } else {
                                setSelectedModalities(prev => [...prev, mod]);
                              }
                            }}
                            className="hidden"
                          />
                          <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isChecked && '✓'}
                          </span>
                          <span className="text-xs font-semibold">{mod}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Physical Address details */}
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Físico Completo</label>
                    <input
                      required
                      type="text"
                      placeholder="Rua, Avenida, número..."
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.address ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bairro / Região</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Pinheiros, Moema"
                      value={neighborhood}
                      onChange={e => setNeighborhood(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.neighborhood ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-semibold">Cidade & Estado</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: São Paulo - SP"
                      value={city || 'São Paulo - SP'}
                      onChange={e => setCity(e.target.value)}
                      className={`w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.city ? 'ring-2 ring-red-400' : 'ring-1 ring-slate-205 dark:ring-slate-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Section 5: Image Cover upload representation */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Foto Ilustrativa do Local</label>
                  <p className="text-xs text-slate-500">Escolha uma imagem de capa recomendada ou insira um link customizado que dê visibilidade ao seu espaço de treino.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {PRESET_COVERS.map(cover => (
                      <div
                        key={cover.url}
                        onClick={() => {
                          setCoverUrl(cover.url);
                          setCustomCoverUrl('');
                        }}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          coverUrl === cover.url && !customCoverUrl
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 scale-102'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={cover.url} className="w-full h-full object-cover select-none" alt="" />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                          <span className="text-[10px] text-white font-bold">{cover.label}</span>
                        </div>
                        {coverUrl === cover.url && !customCoverUrl && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Ou cole o link URL de uma foto própria:</label>
                    <input
                      type="text"
                      placeholder="https://exemplo.com/foto-do-meu-espaco.jpg"
                      value={customCoverUrl}
                      onChange={e => {
                        setCustomCoverUrl(e.target.value);
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-700"
                    />
                  </div>
                </div>

                {/* Section 6: About the gym description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Apresentação para os Alunos (Sobre Nós)</label>
                  <textarea
                    rows={4}
                    placeholder="Fale um pouco sobre o ambiente, professores credenciados, estacionamento e os diferenciais que atraem pessoas para treinar com vocês..."
                    value={about}
                    onChange={e => setAbout(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-sm rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRegStep('welcome');
                      playSfx('tap');
                    }}
                    className="px-6 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-colors"
                  >
                    Retroceder
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98"
                  >
                    Confirmar e Enviar Cadastro
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Submitted Screen - Confirmation of Email Receipt */}
          {regStep === 'submitted' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-550 max-w-2xl mx-auto text-center">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 sm:p-12 rounded-[40px] shadow-2xl relative space-y-6">
                
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-3xl text-slate-850 dark:text-white font-semibold">Solicitação Enviada!</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    Sua academia se registrou no aplicativo de forma independente. O perfil entrou em status de revisão e em aprovação.
                  </p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-5 rounded-2xl flex flex-col sm:flex-row gap-3 items-center text-left">
                  <Mail className="w-7 h-7 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 leading-relaxed pr-2">
                    <strong>Confirmação enviada:</strong> Um e-mail de confirmação e as regras de publicação foram despachados para <strong>{email}</strong>. Aguarde a ativação pública.
                  </div>
                </div>

                {/* Simulated Email Accordion for visual validation */}
                {simulatedEmail && (
                  <div className="text-left bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 p-4 rounded-xl space-y-2 font-mono text-[11px] text-slate-650 dark:text-slate-400 overflow-hidden">
                    <p className="font-bold border-b border-slate-200 dark:border-slate-800 pb-1 text-[10px] uppercase text-emerald-600">Simulação de Inbox Recebido (Fins de Conferência)</p>
                    <p><strong>De:</strong> NutriAI Partners Team &lt;parcerias@nutriai.com&gt;</p>
                    <p><strong>Para:</strong> {simulatedEmail.to}</p>
                    <p><strong>Assunto:</strong> {simulatedEmail.subject}</p>
                    <p className="whitespace-pre-line text-xs pt-1 border-t border-slate-100 dark:border-slate-850 leading-relaxed font-sans">{simulatedEmail.body}</p>
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={() => {
                      setRegStep('dashboard');
                      playSfx('tap');
                    }}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-150 flex items-center justify-center gap-1 shadow-md"
                  >
                    Acessar Meu Painel de Monitoração
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Owner Dashboard Step - Edit Details & Mod Moderate actions */}
          {regStep === 'dashboard' && myAcademy && (
            <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-350">
              
              {/* Profile details & status widgets */}
              <aside className="lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-6">
                  
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-850">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-bold text-lg select-none">
                      {myAcademy.name ? myAcademy.name.charAt(0) : 'G'}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-slate-850 dark:text-white text-base truncate max-w-[170px]">
                        {myAcademy.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5">
                        📍 {myAcademy.neighborhood}
                      </p>
                    </div>
                  </div>

                  {/* Operational Status Display */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status do Cadastro</span>
                    
                    {myAcademy.status === 'PENDENTE' ? (
                      <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-250/50 p-4 rounded-xl space-y-2 animate-pulse">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-xs">
                          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                          Sob Revisão IA & Humana
                        </div>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                          Sua academia passou nas verificações iniciais da fila e está sob validação contra spam. Ela não aparecerá no canal público de alunos até ser ativada.
                        </p>
                        
                        <div className="pt-2 border-t border-amber-200/40 space-y-1">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Etapas de Moderação:</p>
                          <div className="flex gap-1.5 items-center text-[10px]">
                            <span className="text-emerald-500 font-bold">✓ Cadastro Recebido</span>
                          </div>
                          <div className="flex gap-1.5 items-center text-[10px] text-amber-600 dark:text-amber-400">
                            <span>● Em Análise Documental</span>
                          </div>
                          <div className="flex gap-1.5 items-center text-[10px] text-slate-400">
                            <span>○ Ativação Pública Mapas</span>
                          </div>
                        </div>

                        {/* MODERATION SIMULATOR BUTTON */}
                        <div className="pt-4">
                          <button
                            onClick={handleSimulateApproval}
                            className="w-full py-2 bg-emerald-555 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Aprovação Direta (Simulação)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-250/50 p-4 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-450 font-bold text-xs">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          Cadastro Ativo & Listado
                        </div>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                          Pronto! Seu perfil está aprovado, validado e já é visível na busca principal.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Helpful Quick Stats list */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Canal de Métricas</span>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Visualizações de Perfil</span>
                      <strong className="text-slate-800 dark:text-slate-200">{myAcademy.viewsCount}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Cliques p/ Entrar em Contato</span>
                      <strong className="text-slate-800 dark:text-slate-200">{myAcademy.contactCount}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Avaliações Recebidas</span>
                      <strong className="text-slate-800 dark:text-slate-200">{myAcademy.reviewsCount}</strong>
                    </div>
                  </div>

                  {/* Reset Account simulate option */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (confirm('Deseja realmente simular uma nova empresa do zero? Isso remove a sua academia associada.')) {
                          setAcademies(prev => prev.filter(a => a.id !== myAcademyId));
                          setMyAcademyId(null);
                          localStorage.removeItem('nutri-my-academy-id');
                          setRegStep('welcome');
                          playSfx('tap');
                        }
                      }}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-red-500 font-bold text-[10px] rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    >
                      Remover Academia & Recomeçar Onboarding
                    </button>
                  </div>

                </div>
              </aside>

              {/* Edit core metrics & details panel */}
              <main className="lg:col-span-8 space-y-6">
                
                {/* Visual Overview header card */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none" />
                  <span className="text-[10px] font-bold uppercase tracking-widest block bg-white/20 w-fit px-2.5 py-0.5 rounded-full">Painel Admin do Proprietário</span>
                  <p className="font-serif text-2xl sm:text-3.5xl font-medium tracking-tight">Altere as Informações e Grade de Práticas</p>
                  <p className="text-xs sm:text-sm text-white/85 max-w-lg leading-relaxed">
                    Você pode alterar os telefones, links e descrição sobre as modalidades da sua academia a qualquer momento para atualizar na busca final dos alunos.
                  </p>
                </div>

                {/* Inline Editing Form Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-3xl space-y-6 shadow-sm">
                  <h4 className="font-serif text-lg text-slate-850 dark:text-white font-semibold">Editar Perfil Ativo</h4>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Academia</label>
                      <input
                        type="text"
                        value={myAcademy.name}
                        onChange={e => handleUpdateAcademyDetails({ name: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label>
                      <input
                        type="text"
                        value={myAcademy.phone}
                        onChange={e => handleUpdateAcademyDetails({ phone: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Website / Link Oficial</label>
                      <input
                        type="text"
                        value={myAcademy.website}
                        onChange={e => handleUpdateAcademyDetails({ website: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Grade de Horários</label>
                      <input
                        type="text"
                        value={myAcademy.hours}
                        onChange={e => handleUpdateAcademyDetails({ hours: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Endereço Completo</label>
                      <input
                        type="text"
                        value={myAcademy.address}
                        onChange={e => handleUpdateAcademyDetails({ address: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Apresentação da Academia (Sobre Nós)</label>
                      <textarea
                        rows={3}
                        value={myAcademy.about}
                        onChange={e => handleUpdateAcademyDetails({ about: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-xl outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
                      />
                    </div>
                  </div>
                </div>

              </main>

            </div>
          )}

        </div>
      )}

      {viewMode === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 sm:p-8 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none" />
            <span className="text-[10px] font-bold uppercase tracking-widest block bg-white/20 w-fit px-2.5 py-0.5 rounded-full">Espaço de Gestão Governança</span>
            <p className="font-serif text-2xl sm:text-3.5xl font-medium tracking-tight">Moderação de Estabelecimentos</p>
            <p className="text-xs sm:text-sm text-white/85 max-w-xl leading-relaxed">
              Consulte cadastros de academias entrantes de forma independente na plataforma. Revise dados cadastrais, CNPJ, telefone, e controle quais aparecerão no aplicativo final para os alunos.
            </p>
          </div>

          {/* Mini Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-xs text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Solicitado</span>
              <strong className="text-2xl text-slate-800 dark:text-white font-serif">{adminAcademies.length}</strong>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-xs text-center">
              <span className="block text-[10px] uppercase font-bold text-amber-500">Aguardando Revisão</span>
              <strong className="text-2xl text-amber-500 font-serif">{adminAcademies.filter(a => a.status === 'PENDENTE').length}</strong>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-xs text-center">
              <span className="block text-[10px] uppercase font-bold text-emerald-500">Ativas no App</span>
              <strong className="text-2xl text-emerald-500 font-serif">{adminAcademies.filter(a => a.status === 'ATIVO').length}</strong>
            </div>
          </div>

          {/* Admin Academy Cards */}
          {adminLoading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500">Carregando lista de moderação do Firestore...</p>
            </div>
          ) : adminAcademies.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-slate-500 font-bold">Nenhum cadastro de academia registrado no banco de dados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {adminAcademies.map(ac => {
                const handleUpdateStatus = (newStatus: 'ATIVO' | 'REJEITADO' | 'PENDENTE') => {
                  fetch(`/api/admin/academies/${ac.id}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                  })
                  .then(r => r.json())
                  .then(data => {
                    if (data.success) {
                      triggerToast(`Status da academia "${ac.name}" atualizado para ${newStatus} com sucesso!`);
                      loadAdminAcademies();
                      loadAcademies();
                      playSfx('success');
                    }
                  })
                  .catch(err => console.error(err));
                };

                return (
                  <div key={ac.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex gap-4 items-center">
                      <AcademyImage src={ac.image} alt={ac.name} name={ac.name} className="w-16 h-16 rounded-xl shrink-0" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-sm text-slate-800 dark:text-white">{ac.name}</strong>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            ac.status === 'ATIVO' 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : ac.status === 'REJEITADO' 
                              ? 'bg-rose-500/10 text-rose-600' 
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {ac.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{ac.address} - {ac.neighborhood}, {ac.city}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-400">Modalidades: {ac.modalities.join(', ')} | Tel: {ac.phone} | E-mail: {ac.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-none pt-3 sm:pt-0">
                      {ac.status !== 'ATIVO' && (
                        <button
                          onClick={() => handleUpdateStatus('ATIVO')}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprovar
                        </button>
                      )}
                      {ac.status !== 'REJEITADO' && (
                        <button
                          onClick={() => handleUpdateStatus('REJEITADO')}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Rejeitar
                        </button>
                      )}
                      {ac.status !== 'PENDENTE' && (
                        <button
                          onClick={() => handleUpdateStatus('PENDENTE')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Resetar p/ Análise
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL INTENSE CARD FOR EXPLORATION */}
      <AnimatePresence>
        {selectedAcademy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAcademy(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row md:h-[620px]"
            >
              <button
                onClick={() => setSelectedAcademy(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                title="Fechar"
              >
                ✕
              </button>

              {/* Side Cover Panel */}
              <div className="md:w-5/12 relative h-48 md:h-full shrink-0 select-none">
                <AcademyImage
                  src={selectedAcademy.image}
                  alt={selectedAcademy.name}
                  name={selectedAcademy.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 block">📍 Região: {selectedAcademy.neighborhood}</span>
                  <h3 className="font-serif text-white font-bold text-2xl leading-tight">{selectedAcademy.name}</h3>
                  
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs mt-2 font-bold">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <span>{selectedAcademy.rating} de {selectedAcademy.reviewsCount} avaliações</span>
                  </div>
                </div>
              </div>

              {/* Core Info & Review lists Panel */}
              <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6">
                  
                  {/* Address & Hours */}
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Endereço & Contatos</span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{selectedAcademy.address} - São Paulo, SP</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 leading-relaxed">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {selectedAcademy.hours}
                    </p>
                  </div>

                  {/* Modalities tags */}
                  <div className="space-y-2">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Modalidades do Espaço</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedAcademy.modalities.map(mod => (
                        <span
                          key={mod}
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/10"
                        >
                          🏋️ {mod}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description About */}
                  <div className="space-y-2">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Sobre o Estabelecimento</span>
                    <p className="text-slate-600 dark:text-slate-350 text-xs sm:text-sm leading-relaxed">
                      {selectedAcademy.about}
                    </p>
                  </div>

                  {/* Reviews Section */}
                  <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Feedback da Comunidade</span>
                    
                    {selectedAcademy.reviews.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-xs italic">Nenhuma avaliação até o momento. Seja o primeiro a opinar!</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedAcademy.reviews.map(rev => (
                          <div key={rev.id} className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{rev.author}</span>
                              <span className="text-slate-400 dark:text-slate-500 text-[10px]">{rev.date}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-xs text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                />
                              ))}
                            </div>
                            <p className="text-slate-650 dark:text-slate-400 text-[11px] leading-relaxed">{rev.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Review Form */}
                    <form onSubmit={(e) => handlePostReview(e, selectedAcademy.id)} className="pt-2 space-y-3 border-t border-slate-50 dark:border-slate-850/50">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Deixe sua Avaliação</span>
                      
                      {reviewSuccess && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-450 text-xs py-2 px-3 rounded-lg border border-emerald-100 font-bold">
                          ✓ Obrigado! Sua avaliação foi adicionada ao espaço com sucesso.
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3">
                        <input
                          required
                          type="text"
                          placeholder="Seu Nome"
                          value={reviewAuthor}
                          onChange={e => setReviewAuthor(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-lg outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-805 p-2 px-3 rounded-lg">
                          <span className="text-[11px] text-slate-450 font-bold">Estrelas:</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <button
                                type="button"
                                key={i}
                                onClick={() => setReviewRating(i + 1)}
                                className="transition-all scale-102 hover:scale-110 active:scale-95 text-xs"
                              >
                                <Star
                                  className={`w-4 h-4 ${i < reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          required
                          type="text"
                          placeholder="Fale um pouco sobre o espaço, equipe e instalações..."
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white text-xs rounded-lg outline-none ring-1 ring-slate-205 dark:ring-slate-705 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          className="absolute right-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg h-[calc(100%-8px)] top-1 flex items-center justify-center gap-1 active:scale-95 transition-transform"
                        >
                          <Send className="w-3 h-3" />
                          Enviar
                        </button>
                      </div>
                    </form>

                  </div>

                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-850/50 flex gap-4 mt-8 items-center">
                  <a
                    href={selectedAcademy.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-805 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-205 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-slate-500" />
                    Site Oficial
                  </a>

                  <button
                    onClick={() => handleContactClick(selectedAcademy)}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-650 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 duration-100"
                  >
                    <Phone className="w-4 h-4" />
                    Marcar Aula Experimental WhatsApp
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
