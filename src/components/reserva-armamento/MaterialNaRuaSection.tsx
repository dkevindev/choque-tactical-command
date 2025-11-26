import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { cn } from '@/lib/utils';

interface MaterialCautelado {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface CautelaAtiva {
  id: string;
  policialId: string;
  policialNome: string;
  policialMatricula: string;
  materiais: MaterialCautelado[];
  dataCautela: Date;
}

// Emojis por categoria de material
const getCategoriaEmoji = (categoria: string): string => {
  const cat = categoria.toLowerCase();
  if (cat.includes('curta') || cat.includes('pistola')) return '🔫';
  if (cat.includes('longa') || cat.includes('fuzil') || cat.includes('espingarda')) return '🎯';
  if (cat.includes('munição') || cat.includes('municao')) return '💥';
  if (cat.includes('colete')) return '🦺';
  if (cat.includes('epi') || cat.includes('proteção')) return '🛡️';
  if (cat.includes('algema')) return '⛓️';
  if (cat.includes('rádio') || cat.includes('radio')) return '📻';
  return '⚙️';
};

// Gerar posição pseudo-aleatória baseada no ID (consistente)
const gerarPosicao = (id: string, index: number, total: number) => {
  const hash = id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const cols = Math.min(4, Math.ceil(Math.sqrt(total)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  const baseX = (col / cols) * 80 + 10;
  const baseY = (row / Math.ceil(total / cols)) * 70 + 15;
  
  const offsetX = (Math.abs(hash) % 15) - 7;
  const offsetY = (Math.abs(hash >> 8) % 15) - 7;
  
  return {
    x: Math.max(5, Math.min(90, baseX + offsetX)),
    y: Math.max(10, Math.min(85, baseY + offsetY))
  };
};

// Componente do Avatar do Policial com Balão
const PolicialAvatar = ({ 
  cautela, 
  posicao, 
  onClick,
  isExiting 
}: { 
  cautela: CautelaAtiva; 
  posicao: { x: number; y: number };
  onClick: () => void;
  isExiting?: boolean;
}) => {
  const materiaisResumo = cautela.materiais.slice(0, 3).map(m => 
    `${getCategoriaEmoji(m.categoria)} ${m.quantidade > 1 ? m.quantidade + 'x ' : ''}${m.nome.substring(0, 12)}`
  );
  
  if (cautela.materiais.length > 3) {
    materiaisResumo.push(`+${cautela.materiais.length - 3} itens`);
  }

  return (
    <div 
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-500 group",
        isExiting ? "animate-fade-out scale-0 opacity-0" : "animate-fade-in"
      )}
      style={{ 
        left: `${posicao.x}%`, 
        top: `${posicao.y}%`,
      }}
      onClick={onClick}
    >
      {/* Balão de Fala */}
      <div className={cn(
        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg",
        "bg-card/95 backdrop-blur-sm border border-border shadow-lg",
        "min-w-[120px] max-w-[160px] text-xs",
        "opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200",
        "group-hover:shadow-xl group-hover:z-50"
      )}>
        <div className="space-y-0.5">
          {materiaisResumo.map((item, i) => (
            <div key={i} className="truncate text-foreground/90">{item}</div>
          ))}
        </div>
        {/* Seta do Balão */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-card" />
      </div>
      
      {/* Avatar do Policial */}
      <div className={cn(
        "relative flex flex-col items-center",
        "animate-pulse"
      )} style={{ animationDuration: '3s' }}>
        <div className={cn(
          "text-3xl md:text-4xl select-none",
          "drop-shadow-lg group-hover:scale-125 transition-transform duration-200"
        )}>
          👮‍♂️
        </div>
        <div className={cn(
          "mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
          "bg-primary/20 text-primary-foreground border border-primary/30",
          "whitespace-nowrap max-w-[80px] truncate"
        )}>
          {cautela.policialNome.split(' ')[0]}
        </div>
      </div>
    </div>
  );
};

// Componente de Estatísticas
const DashboardStats = ({ 
  totalPoliciais, 
  totaisPorCategoria 
}: { 
  totalPoliciais: number;
  totaisPorCategoria: Record<string, number>;
}) => {
  const stats = [
    { emoji: '👮', label: 'Policiais', value: totalPoliciais, color: 'bg-blue-500/20 border-blue-500/30' },
    { emoji: '🔫', label: 'Armas', value: (totaisPorCategoria['arma curta'] || 0) + (totaisPorCategoria['arma longa'] || 0) + (totaisPorCategoria['armamento'] || 0), color: 'bg-red-500/20 border-red-500/30' },
    { emoji: '💥', label: 'Munições', value: totaisPorCategoria['munição'] || totaisPorCategoria['municao'] || 0, color: 'bg-orange-500/20 border-orange-500/30' },
    { emoji: '🛡️', label: 'EPIs', value: (totaisPorCategoria['epi'] || 0) + (totaisPorCategoria['colete'] || 0), color: 'bg-green-500/20 border-green-500/30' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-xl border",
            "transition-all duration-200 hover:scale-105",
            stat.color
          )}
        >
          <span className="text-2xl mb-1">{stat.emoji}</span>
          <span className="text-xl font-bold">{stat.value}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</span>
        </div>
      ))}
    </div>
  );
};

// Modal de Detalhes do Policial
const ModalDetalhePolicial = ({ 
  cautela, 
  open, 
  onClose 
}: { 
  cautela: CautelaAtiva | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!cautela) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-4xl">👮‍♂️</span>
            <div>
              <div className="text-lg">{cautela.policialNome}</div>
              <div className="text-sm text-muted-foreground font-normal">Mat: {cautela.policialMatricula}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            ⏱️ Cautelado em: {cautela.dataCautela.toLocaleString('pt-BR')}
          </div>
          
          <div className="space-y-2">
            <div className="font-semibold text-sm">📦 Materiais Cautelados:</div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {cautela.materiais.map((material, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getCategoriaEmoji(material.categoria)}</span>
                      <div>
                        <div className="font-medium text-sm">{material.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {material.categoria}
                          {material.numeroSerie && ` • ${material.numeroSerie}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Qtd: {material.quantidade}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente Principal
const MaterialNaRuaSection = () => {
  const [cautelasAtivas, setCautelasAtivas] = useState<CautelaAtiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCautela, setSelectedCautela] = useState<CautelaAtiva | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, 'cautelas_provisorias'), where('status', '==', 'pendente'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const novasCautelas = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCautela: data.dataCautela?.toDate?.() || new Date()
        } as CautelaAtiva;
      });
      
      // Detectar cautelas removidas para animação
      const novosIds = new Set(novasCautelas.map(c => c.id));
      const idsAtuais = new Set(cautelasAtivas.map(c => c.id));
      
      idsAtuais.forEach(id => {
        if (!novosIds.has(id)) {
          setExitingIds(prev => new Set([...prev, id]));
          setTimeout(() => {
            setExitingIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 500);
        }
      });
      
      setCautelasAtivas(novasCautelas);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cautelasAtivas]);

  // Calcular totais por categoria
  const totaisPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {};
    cautelasAtivas.forEach(cautela => {
      cautela.materiais.forEach(material => {
        const cat = material.categoria.toLowerCase();
        totais[cat] = (totais[cat] || 0) + material.quantidade;
      });
    });
    return totais;
  }, [cautelasAtivas]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="text-4xl animate-bounce mb-2">🚔</div>
          <div className="text-muted-foreground">Carregando material na rua...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">🚔</span>
          Material na Rua
          <Badge variant="outline" className="ml-auto text-xs">
            Tempo Real
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dashboard de Estatísticas */}
        <DashboardStats 
          totalPoliciais={cautelasAtivas.length}
          totaisPorCategoria={totaisPorCategoria}
        />

        {/* Mapa Visual */}
        {cautelasAtivas.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-b from-muted/30 to-muted/10 rounded-xl border border-dashed">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-lg font-medium text-muted-foreground">
              Nenhum material na rua!
            </div>
            <div className="text-sm text-muted-foreground/70">
              Todos os materiais foram devolvidos
            </div>
          </div>
        ) : (
          <>
            {/* Área do Mapa */}
            <div 
              className={cn(
                "relative h-[320px] md:h-[400px] rounded-xl overflow-hidden",
                "bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90",
                "border border-border/50"
              )}
            >
              {/* Elementos decorativos do mapa */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-[10%] left-[20%] w-16 h-8 bg-white/20 rounded" />
                <div className="absolute top-[30%] left-[60%] w-20 h-10 bg-white/20 rounded" />
                <div className="absolute top-[60%] left-[30%] w-24 h-6 bg-white/20 rounded" />
                <div className="absolute top-[70%] left-[70%] w-12 h-12 bg-white/20 rounded" />
                <div className="absolute top-[20%] left-[80%] w-8 h-16 bg-white/20 rounded" />
                
                {/* Linhas de ruas */}
                <div className="absolute top-0 left-[25%] w-px h-full bg-white/30" />
                <div className="absolute top-0 left-[50%] w-px h-full bg-white/30" />
                <div className="absolute top-0 left-[75%] w-px h-full bg-white/30" />
                <div className="absolute top-[33%] left-0 w-full h-px bg-white/30" />
                <div className="absolute top-[66%] left-0 w-full h-px bg-white/30" />
              </div>

              {/* Título do Mapa */}
              <div className="absolute top-2 left-2 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full text-xs text-white/70 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                ÁREA OPERACIONAL
              </div>

              {/* Policiais no Mapa */}
              {cautelasAtivas.map((cautela, index) => {
                const posicao = gerarPosicao(cautela.id, index, cautelasAtivas.length);
                return (
                  <PolicialAvatar
                    key={cautela.id}
                    cautela={cautela}
                    posicao={posicao}
                    onClick={() => setSelectedCautela(cautela)}
                    isExiting={exitingIds.has(cautela.id)}
                  />
                );
              })}
            </div>

            {/* Resumo Escrito */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                📋 Resumo Detalhado
              </div>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2 pr-4">
                  {cautelasAtivas.map((cautela) => (
                    <div 
                      key={cautela.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border bg-muted/30",
                        "hover:bg-muted/50 cursor-pointer transition-colors"
                      )}
                      onClick={() => setSelectedCautela(cautela)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">👮‍♂️</span>
                        <div>
                          <div className="font-medium text-sm">{cautela.policialNome}</div>
                          <div className="text-xs text-muted-foreground">
                            Mat: {cautela.policialMatricula} • {cautela.dataCautela.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {cautela.materiais.slice(0, 4).map((m, i) => (
                            <span 
                              key={i} 
                              className="text-sm bg-background rounded-full w-6 h-6 flex items-center justify-center border"
                              title={m.nome}
                            >
                              {getCategoriaEmoji(m.categoria)}
                            </span>
                          ))}
                          {cautela.materiais.length > 4 && (
                            <span className="text-xs bg-muted rounded-full w-6 h-6 flex items-center justify-center border">
                              +{cautela.materiais.length - 4}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {cautela.materiais.reduce((sum, m) => sum + m.quantidade, 0)} itens
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>

      {/* Modal de Detalhes */}
      <ModalDetalhePolicial
        cautela={selectedCautela}
        open={!!selectedCautela}
        onClose={() => setSelectedCautela(null)}
      />
    </Card>
  );
};

export default MaterialNaRuaSection;
