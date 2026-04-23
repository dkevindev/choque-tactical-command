import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Megaphone, AlertTriangle, Newspaper, Cake, Sparkles } from 'lucide-react';

type TipoNoticia = 'noticia' | 'determinacao' | 'aviso' | 'aniversario';

interface Slide {
  id: string;
  tipo: TipoNoticia;
  titulo: string;
  mensagem: string;
  autor?: string;
  dataPublicacao?: Date;
  prioridade?: number;
  aniversariantes?: { nome: string; postoGrad: string }[];
  imagemUrl?: string;
}

const tipoConfig: Record<TipoNoticia, { label: string; gradient: string; icon: any; tagBg: string }> = {
  noticia: {
    label: 'NOTÍCIA',
    gradient: 'from-blue-600 via-blue-700 to-indigo-900',
    icon: Newspaper,
    tagBg: 'bg-blue-500',
  },
  determinacao: {
    label: 'DETERMINAÇÃO',
    gradient: 'from-red-600 via-red-700 to-rose-900',
    icon: Megaphone,
    tagBg: 'bg-red-500',
  },
  aviso: {
    label: 'AVISO',
    gradient: 'from-amber-500 via-orange-600 to-orange-800',
    icon: AlertTriangle,
    tagBg: 'bg-amber-500',
  },
  aniversario: {
    label: 'ANIVERSARIANTES DO DIA',
    gradient: 'from-yellow-400 via-amber-500 to-pink-600',
    icon: Cake,
    tagBg: 'bg-pink-500',
  },
};

// Parse data de nascimento aceitando string ISO, número Excel serial ou Date
const parseNascimento = (raw: any): Date | null => {
  if (!raw) return null;
  try {
    if (typeof raw === 'number') {
      return new Date((raw - 25569) * 86400 * 1000);
    }
    if (raw?.toDate) return raw.toDate();
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const PainelNoticias = () => {
  const [noticias, setNoticias] = useState<Slide[]>([]);
  const [aniversariantes, setAniversariantes] = useState<{ nome: string; postoGrad: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [hojeKey, setHojeKey] = useState(() => new Date().toDateString());

  // Listener de notícias ativas e não expiradas
  useEffect(() => {
    const q = query(collection(db, 'noticias_totem'), where('ativa', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const hoje = new Date();
      const lista: Slide[] = snap.docs
        .map(d => {
          const data: any = d.data();
          const exp = data.dataExpiracao?.toDate ? data.dataExpiracao.toDate() : (data.dataExpiracao ? new Date(data.dataExpiracao) : null);
          if (exp && exp < hoje) return null;
          const pub = data.dataPublicacao?.toDate ? data.dataPublicacao.toDate() : new Date();
          return {
            id: d.id,
            tipo: (data.tipo || 'noticia') as TipoNoticia,
            titulo: data.titulo || '',
            mensagem: data.mensagem || '',
            autor: data.autor,
            dataPublicacao: pub,
            prioridade: data.prioridade ?? 5,
            imagemUrl: data.imagemUrl || undefined,
          } as Slide;
        })
        .filter((x): x is Slide => x !== null)
        .sort((a, b) => (b.prioridade! - a.prioridade!) || ((b.dataPublicacao?.getTime() || 0) - (a.dataPublicacao?.getTime() || 0)));
      setNoticias(lista);
    });
    return () => unsub();
  }, []);

  // Carregar aniversariantes (refresh diário + manual via config_painel/aniversariantes)
  const carregarAniversariantes = async () => {
    try {
      const snap = await getDocs(collection(db, 'policiais'));
      const hoje = new Date();
      const dia = hoje.getDate();
      const mes = hoje.getMonth();
      const lista: { nome: string; postoGrad: string }[] = [];
      snap.forEach(d => {
        const p: any = d.data();
        const raw = p['Data de Nascimento'] ?? p.dataNascimento ?? p.NASCIMENTO;
        const dt = parseNascimento(raw);
        if (dt && dt.getDate() === dia && dt.getMonth() === mes) {
          const nome = p['NOME DE GUERRA1'] || p.NOME || 'Policial';
          const postoGrad = p['Post/Grad'] || p.postoGrad || '';
          lista.push({ nome, postoGrad });
        }
      });
      setAniversariantes(lista);
    } catch (e) {
      console.error('[PainelNoticias] Erro ao carregar aniversariantes:', e);
    }
  };

  useEffect(() => {
    carregarAniversariantes();
    // Recarregar quando o dia mudar
    const i = setInterval(() => {
      const k = new Date().toDateString();
      if (k !== hojeKey) {
        setHojeKey(k);
        carregarAniversariantes();
      }
    }, 60000);
    return () => { clearInterval(i); };
  }, [hojeKey]);

  // Listener de refresh manual
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config_painel', 'aniversariantes'), () => {
      carregarAniversariantes();
    });
    return () => unsub();
  }, []);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Slides finais (aniversário injetado no início)
  const slides = useMemo<Slide[]>(() => {
    const base: Slide[] = [];
    if (aniversariantes.length > 0) {
      base.push({
        id: '__aniversario__',
        tipo: 'aniversario',
        titulo: '🎉 PARABÉNS AOS ANIVERSARIANTES DE HOJE 🎉',
        mensagem: 'Que Deus abençoe sua jornada — RPMONT',
        aniversariantes,
        prioridade: 99,
      });
    }
    return [...base, ...noticias];
  }, [aniversariantes, noticias]);

  // Auto-play
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setIndex(i => (i + 1) % slides.length);
    }, 8000);
    return () => clearInterval(t);
  }, [slides.length]);

  // Reset index quando lista encolhe
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  if (slides.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center px-8 py-12 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-border">
        <Sparkles className="h-20 w-20 text-primary/60 mb-6" />
        <h2 className="text-4xl font-bold text-foreground mb-3">CAVALARIA PMCE — RPMONT</h2>
        <p className="text-xl text-muted-foreground">Painel de notícias e determinações</p>
        <p className="text-sm text-muted-foreground mt-8">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}
          {now.toLocaleTimeString('pt-BR')}
        </p>
      </div>
    );
  }

  const slide = slides[index];
  const cfg = tipoConfig[slide.tipo];
  const Icon = cfg.icon;
  const isAniv = slide.tipo === 'aniversario';

  return (
    <div className="w-full h-full flex flex-col select-none pointer-events-none">
      <div
        key={slide.id + '-' + index}
        className={`relative flex-1 rounded-2xl overflow-hidden bg-gradient-to-br ${cfg.gradient} shadow-2xl animate-fade-in`}
      >
        {/* Decorações */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10 h-full flex flex-col p-10">
          {/* Tag */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`${cfg.tagBg} rounded-full p-3 shadow-lg ${isAniv ? 'animate-pulse' : ''}`}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/25 text-white border-white/40 text-base font-bold tracking-wider px-4 py-1">
                {cfg.label}
              </Badge>
            </div>
            {slide.dataPublicacao && !isAniv && (
              <span className="text-white/80 text-sm">
                {slide.dataPublicacao.toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Conteúdo */}
          {isAniv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-white">
              <h2 className="text-5xl md:text-6xl font-extrabold mb-8 drop-shadow-lg animate-pulse">
                {slide.titulo}
              </h2>
              <div className="space-y-3 max-h-[55%] overflow-hidden">
                {slide.aniversariantes!.map((p, i) => (
                  <p key={i} className="text-3xl md:text-4xl font-bold tracking-wide drop-shadow">
                    🎂 <span className="opacity-90">{p.postoGrad}</span> <span>{p.nome}</span>
                  </p>
                ))}
              </div>
              <p className="mt-8 text-xl md:text-2xl italic opacity-95">
                {slide.mensagem}
              </p>
            </div>
          ) : (
            <div className={`flex-1 flex ${slide.imagemUrl ? 'flex-row gap-8 items-center' : 'flex-col justify-center'} text-white min-h-0 overflow-hidden`}>
              <div className={`${slide.imagemUrl ? 'w-3/5' : 'w-full'} flex flex-col justify-center min-w-0 overflow-hidden max-h-full`}>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-6 drop-shadow-lg leading-tight break-words [overflow-wrap:anywhere]">
                  {slide.titulo}
                </h2>
                <p className="text-2xl md:text-3xl leading-relaxed opacity-95 whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-hidden">
                  {slide.mensagem}
                </p>
                {slide.autor && (
                  <p className="mt-8 text-base opacity-75 break-words">— {slide.autor}</p>
                )}
              </div>
              {slide.imagemUrl && (
                <div className="w-2/5 flex-shrink-0 flex items-center justify-center max-h-full">
                  <img
                    src={slide.imagemUrl}
                    alt={slide.titulo}
                    className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-2xl border-4 border-white/30"
                  />
                </div>
              )}
            </div>
          )}

          {/* Indicadores */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé com data/hora */}
      <div className="text-center mt-3 text-foreground">
        <p className="text-lg font-semibold">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}
          <span className="text-primary">{now.toLocaleTimeString('pt-BR')}</span>
        </p>
      </div>
    </div>
  );
};

export default PainelNoticias;
