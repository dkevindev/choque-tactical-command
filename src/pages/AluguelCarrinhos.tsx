import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Play, Square, Settings, BarChart3, Car, Clock, DollarSign, Trash2, Edit2, ChevronLeft, ChevronRight, Volume2, Percent, Infinity, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, addDays, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import brinkarLogo from '@/assets/brinkar-logo.jpeg';

interface Carrinho {
  id: string;
  nome: string;
  valorMinuto: number;
  ativo: boolean;
}

interface Aluguel {
  id: string;
  carrinhoId: string;
  carrinhoNome: string;
  inicio: Timestamp;
  fim?: Timestamp;
  duracaoMinutos: number;
  valorTotal: number;
  finalizado: boolean;
  tipo: 'minutos' | 'valor' | 'tempo_livre';
  valorOriginal?: number;
  valorDevolvido?: number;
}

interface AluguelAtivo {
  carrinhoId: string;
  aluguelId: string;
  inicio: Date;
  duracaoMinutos: number;
  tempoRestante: number;
  valorTotal: number;
  alertaTocado: boolean;
  tipo: 'minutos' | 'valor' | 'tempo_livre';
}

const AluguelCarrinhos = () => {
  const [carrinhos, setCarrinhos] = useState<Carrinho[]>([]);
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [alugueisAtivos, setAlugueisAtivos] = useState<Map<string, AluguelAtivo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState('painel');
  
  // Cadastro de carrinho
  const [novoCarrinho, setNovoCarrinho] = useState({ nome: '', valorMinuto: '' });
  const [editandoCarrinho, setEditandoCarrinho] = useState<Carrinho | null>(null);
  const [dialogCadastro, setDialogCadastro] = useState(false);
  
  // Iniciar aluguel
  const [carrinhoSelecionado, setCarrinhoSelecionado] = useState<Carrinho | null>(null);
  const [dialogAluguel, setDialogAluguel] = useState(false);
  const [tipoAluguel, setTipoAluguel] = useState<'minutos' | 'valor' | 'desconto' | 'tempo_livre'>('minutos');
  const [inputMinutos, setInputMinutos] = useState('');
  const [inputValor, setInputValor] = useState('');
  const [descontoMinutos, setDescontoMinutos] = useState('');
  const [descontoValor, setDescontoValor] = useState('');
  
  // Dialog de encerramento antecipado
  const [dialogEncerramentoAntecipado, setDialogEncerramentoAntecipado] = useState(false);
  const [aluguelParaEncerrar, setAluguelParaEncerrar] = useState<{ carrinhoId: string; aluguel: AluguelAtivo; carrinho: Carrinho } | null>(null);
  
  // Estado para prevenir cliques múltiplos
  const [processando, setProcessando] = useState(false);
  
  // Audio ref para alerta sonoro
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Relatórios
  const [dataRelatorio, setDataRelatorio] = useState(new Date());
  const [tipoRelatorio, setTipoRelatorio] = useState<'diario' | 'mensal'>('diario');
  const [alugueisMensais, setAlugueisMensais] = useState<Aluguel[]>([]);

  // Carregar carrinhos
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'carrinhos_aluguel'), orderBy('nome')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Carrinho));
        setCarrinhos(data);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Inicializar áudio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleaOqwoZQFBcnc6rO6qJ1LxEzjtn/nIZ/n7F9KwYAMYP/5NKbiHtrRxgAAzSr/+zGnI9mcj0EADaf/+jIoYladj0DADCb/+vHoIpYdzwDAC6Y/+rIoIlYeDwCACyW/+rJn4hXeDsCACqU/+rKn4dWeTsCACiS/+nKn4ZVejsCACSP/+nLoIVUezoCAB+M/+jMoYNSejoCABqJ/+fNoYJQejoCABWF/+bOooFPejkCABCA/+XPon9NejkCAAt8/+TQo35MezkCAAZ4/+PQpHxLfDkCAAFz/+LRpXtKfDgCAPxu/+HSp3lJfTgCAPdq/+DTqHhHfTcCAPJl/97UqnZGfTcCAPVh/93VrHVFfjYCAPld/9zWrnNDfjYCAPxa/9vXsHFCfjUCAP9X/9rYsnBBfjQCAP9V/9rYs25AfjQCAP9T/9rYtW0/fjMCAP9Q/9nZt2s+fjMCAP9O/9jZuWo8fjICAP9L/9fauWk7fjECAP9J/9faumi6fjECAP9H/9bbu2i5fjACAP9F/9XcvGe4fi8CAP9D/9Tcvma4fi4CAP9B/9PdwGW3fi4CAP8//9LewWS2fi0CAP89/9HewmO1fiwCAP87/9DfxGK0fiwCAP85/8/gxWGzfisCAP83/87gx2CyfioCAPy1/83hx1+xfioCAP+z/8ziyV6wfikCAP+x/8vjyl2vfikCAP+v/8rjzFyufiggAP+t/8nkzlutficgAP+r/8jl0FqsfiYgAP+p/8fm0lmrfiUgAP+n/8bn1FeqfiQgAP+l/8Xo1larfiMgAP+j/8Tp2FWqfyIgAP+h/8Pp2lSpfyEgAP+f/8Lq3FOnfyAgAP+d/8Hr3lKmfx8gAP+b/8Ds4FGlfx4gAP+Z/7/s4lCkfx0gAP+X/77t5E+jfxwgAP+V/73u5k6ifxsgAP+T/7zv6E2hfxogAP+R/7vv6kyggBkgAP+P/7rw7EufgBggAP+N/7nx7kqegBcgAP+L/7jy8EmcgBYg');
    audioRef.current.volume = 0.8;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const tocarAlerta = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setTimeout(() => audioRef.current?.play().catch(() => {}), 300);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 600);
    }
  };

  // Carregar aluguéis ativos
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'alugueis_carrinhos'), where('finalizado', '==', false)),
      (snapshot) => {
        const novosAtivos = new Map<string, AluguelAtivo>();
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as Aluguel;
          const inicio = data.inicio.toDate();
          const agora = new Date();
          const tempoDecorrido = Math.floor((agora.getTime() - inicio.getTime()) / 1000);
          
          // Para tempo livre, não há tempo restante (usa tempo negativo para mostrar decorrido)
          const isTempo_livre = data.tipo === 'tempo_livre';
          const tempoTotal = isTempo_livre ? 0 : data.duracaoMinutos * 60;
          const tempoRestante = isTempo_livre ? -tempoDecorrido : Math.max(0, tempoTotal - tempoDecorrido);
          
          const prevAluguel = alugueisAtivos.get(data.carrinhoId);
          
          novosAtivos.set(data.carrinhoId, {
            carrinhoId: data.carrinhoId,
            aluguelId: docSnap.id,
            inicio,
            duracaoMinutos: data.duracaoMinutos,
            tempoRestante,
            valorTotal: data.valorTotal,
            alertaTocado: prevAluguel?.alertaTocado || false,
            tipo: data.tipo as 'minutos' | 'valor' | 'tempo_livre'
          });
        });
        setAlugueisAtivos(novosAtivos);
      }
    );
    return () => unsubscribe();
  }, []);

  // Carregar histórico de aluguéis para relatórios diários
  useEffect(() => {
    if (tipoRelatorio !== 'diario') return;
    
    const inicioData = startOfDay(dataRelatorio);
    const fimData = endOfDay(dataRelatorio);
    
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'alugueis_carrinhos'),
        where('inicio', '>=', Timestamp.fromDate(inicioData)),
        where('inicio', '<=', Timestamp.fromDate(fimData))
      ),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aluguel));
        setAlugueis(data);
      }
    );
    return () => unsubscribe();
  }, [dataRelatorio, tipoRelatorio]);

  // Carregar histórico de aluguéis para relatórios mensais
  useEffect(() => {
    if (tipoRelatorio !== 'mensal') return;
    
    const inicioMes = startOfMonth(dataRelatorio);
    const fimMes = endOfMonth(dataRelatorio);
    
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'alugueis_carrinhos'),
        where('inicio', '>=', Timestamp.fromDate(inicioMes)),
        where('inicio', '<=', Timestamp.fromDate(fimMes))
      ),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aluguel));
        setAlugueisMensais(data);
      }
    );
    return () => unsubscribe();
  }, [dataRelatorio, tipoRelatorio]);

  // Atualizar cronômetros a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setAlugueisAtivos(prev => {
        const novos = new Map(prev);
        novos.forEach((aluguel, carrinhoId) => {
          const agora = new Date();
          const tempoDecorrido = Math.floor((agora.getTime() - aluguel.inicio.getTime()) / 1000);
          
          // Para tempo livre, continua contando (negativo)
          if (aluguel.tipo === 'tempo_livre') {
            novos.set(carrinhoId, { ...aluguel, tempoRestante: -tempoDecorrido });
          } else {
            const tempoTotal = aluguel.duracaoMinutos * 60;
            const tempoRestante = Math.max(0, tempoTotal - tempoDecorrido);
            
            if (tempoRestante === 0 && prev.get(carrinhoId)?.tempoRestante !== 0 && !aluguel.alertaTocado) {
              tocarAlerta();
              novos.set(carrinhoId, { ...aluguel, tempoRestante, alertaTocado: true });
            } else {
              novos.set(carrinhoId, { ...aluguel, tempoRestante });
            }
          }
        });
        return novos;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const salvarCarrinho = async () => {
    if (!novoCarrinho.nome || !novoCarrinho.valorMinuto) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      if (editandoCarrinho) {
        await updateDoc(doc(db, 'carrinhos_aluguel', editandoCarrinho.id), {
          nome: novoCarrinho.nome,
          valorMinuto: parseFloat(novoCarrinho.valorMinuto)
        });
        toast.success('Carrinho atualizado!');
      } else {
        await addDoc(collection(db, 'carrinhos_aluguel'), {
          nome: novoCarrinho.nome,
          valorMinuto: parseFloat(novoCarrinho.valorMinuto),
          ativo: true
        });
        toast.success('Carrinho cadastrado!');
      }
      setNovoCarrinho({ nome: '', valorMinuto: '' });
      setEditandoCarrinho(null);
      setDialogCadastro(false);
    } catch (error) {
      toast.error('Erro ao salvar carrinho');
    }
  };

  const excluirCarrinho = async (id: string) => {
    if (alugueisAtivos.has(id)) {
      toast.error('Carrinho está alugado!');
      return;
    }
    try {
      await deleteDoc(doc(db, 'carrinhos_aluguel', id));
      toast.success('Carrinho excluído!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const iniciarAluguel = async () => {
    if (!carrinhoSelecionado || processando) return;

    let duracaoMinutos = 0;
    let valorTotal = 0;
    let tipo: 'minutos' | 'valor' | 'tempo_livre' = 'minutos';

    if (tipoAluguel === 'tempo_livre') {
      // Tempo livre - sem duração definida, valor será calculado ao encerrar
      duracaoMinutos = 0;
      valorTotal = 0;
      tipo = 'tempo_livre';
    } else if (tipoAluguel === 'minutos') {
      const minutos = parseInt(inputMinutos) || 0;
      if (minutos <= 0) {
        toast.error('Informe os minutos');
        return;
      }
      duracaoMinutos = minutos;
      valorTotal = duracaoMinutos * carrinhoSelecionado.valorMinuto;
      tipo = 'minutos';
    } else if (tipoAluguel === 'valor') {
      const valor = parseFloat(inputValor) || 0;
      if (valor <= 0) {
        toast.error('Informe o valor');
        return;
      }
      valorTotal = valor;
      duracaoMinutos = Math.floor(valorTotal / carrinhoSelecionado.valorMinuto);
      if (duracaoMinutos <= 0) {
        toast.error('Valor insuficiente para 1 minuto');
        return;
      }
      tipo = 'valor';
    } else if (tipoAluguel === 'desconto') {
      const minutos = parseInt(descontoMinutos) || 0;
      const valor = parseFloat(descontoValor) || 0;
      if (minutos <= 0) {
        toast.error('Informe os minutos');
        return;
      }
      if (valor <= 0) {
        toast.error('Informe o valor');
        return;
      }
      duracaoMinutos = minutos;
      valorTotal = valor;
      tipo = 'minutos';
    }

    setProcessando(true);
    try {
      await addDoc(collection(db, 'alugueis_carrinhos'), {
        carrinhoId: carrinhoSelecionado.id,
        carrinhoNome: carrinhoSelecionado.nome,
        inicio: Timestamp.now(),
        duracaoMinutos,
        valorTotal,
        finalizado: false,
        tipo
      });
      
      if (tipoAluguel === 'tempo_livre') {
        toast.success(`Tempo livre iniciado para ${carrinhoSelecionado.nome}`);
      } else {
        toast.success(`Aluguel iniciado: ${duracaoMinutos} min por R$ ${valorTotal.toFixed(2)}`);
      }
      setDialogAluguel(false);
      setInputMinutos('');
      setInputValor('');
      setDescontoMinutos('');
      setDescontoValor('');
      setCarrinhoSelecionado(null);
    } catch (error) {
      toast.error('Erro ao iniciar aluguel');
    } finally {
      setProcessando(false);
    }
  };

  const abrirDialogEncerramentoAntecipado = (carrinhoId: string) => {
    const aluguel = alugueisAtivos.get(carrinhoId);
    const carrinho = carrinhos.find(c => c.id === carrinhoId);
    if (!aluguel || !carrinho) return;
    
    setAluguelParaEncerrar({ carrinhoId, aluguel, carrinho });
    setDialogEncerramentoAntecipado(true);
  };

  const calcularValoresEncerramento = () => {
    if (!aluguelParaEncerrar) return { valorUsado: 0, valorDevolver: 0, minutosUsados: 0 };
    
    const { aluguel, carrinho } = aluguelParaEncerrar;
    const agora = new Date();
    const tempoDecorridoSegundos = Math.floor((agora.getTime() - aluguel.inicio.getTime()) / 1000);
    const minutosUsados = Math.max(1, Math.ceil(tempoDecorridoSegundos / 60));
    
    if (aluguel.tipo === 'tempo_livre') {
      // Tempo livre - cobra pelo tempo usado
      const valorUsado = minutosUsados * carrinho.valorMinuto;
      return { valorUsado, valorDevolver: 0, minutosUsados };
    } else {
      // Aluguel normal - calcula devolução
      if (aluguel.duracaoMinutos <= 0) {
        return { valorUsado: aluguel.valorTotal, valorDevolver: 0, minutosUsados };
      }
      const valorPorMinuto = aluguel.valorTotal / aluguel.duracaoMinutos;
      const valorUsado = Math.min(minutosUsados * valorPorMinuto, aluguel.valorTotal);
      const valorDevolver = Math.max(0, aluguel.valorTotal - valorUsado);
      return { valorUsado, valorDevolver, minutosUsados };
    }
  };

  const confirmarEncerramentoAntecipado = async () => {
    if (!aluguelParaEncerrar || processando) return;
    
    setProcessando(true);
    const { valorUsado, valorDevolver, minutosUsados } = calcularValoresEncerramento();
    const { aluguel, carrinho } = aluguelParaEncerrar;
    
    try {
      await updateDoc(doc(db, 'alugueis_carrinhos', aluguel.aluguelId), {
        finalizado: true,
        fim: Timestamp.now(),
        valorTotal: valorUsado,
        valorOriginal: aluguel.tipo === 'tempo_livre' ? undefined : aluguel.valorTotal,
        valorDevolvido: valorDevolver > 0 ? valorDevolver : undefined,
        duracaoMinutos: minutosUsados
      });
      
      if (aluguel.tipo === 'tempo_livre') {
        toast.success(`Tempo livre encerrado! Cobrar R$ ${valorUsado.toFixed(2)} (${minutosUsados} min)`);
      } else if (valorDevolver > 0) {
        toast.success(`Encerrado! Devolver R$ ${valorDevolver.toFixed(2)} ao cliente`);
      } else {
        toast.success('Aluguel encerrado!');
      }
      
      setDialogEncerramentoAntecipado(false);
      setAluguelParaEncerrar(null);
    } catch (error) {
      toast.error('Erro ao encerrar');
    } finally {
      setProcessando(false);
    }
  };

  const encerrarAluguel = async (carrinhoId: string) => {
    if (processando) return;
    
    const aluguel = alugueisAtivos.get(carrinhoId);
    if (!aluguel) return;
    
    setProcessando(true);
    try {
      await updateDoc(doc(db, 'alugueis_carrinhos', aluguel.aluguelId), {
        finalizado: true,
        fim: Timestamp.now()
      });
      toast.success('Aluguel encerrado!');
    } catch (error) {
      toast.error('Erro ao encerrar');
    } finally {
      setProcessando(false);
    }
  };

  const pararAluguel = async (carrinhoId: string) => {
    if (processando) return;
    
    const aluguel = alugueisAtivos.get(carrinhoId);
    if (!aluguel) return;
    
    // Se é tempo livre ou ainda tem tempo sobrando, abre dialog de encerramento
    if (aluguel.tipo === 'tempo_livre' || aluguel.tempoRestante > 0) {
      abrirDialogEncerramentoAntecipado(carrinhoId);
    } else {
      // Tempo acabou, encerra normalmente
      await encerrarAluguel(carrinhoId);
    }
  };

  const excluirAluguelById = async (aluguelId: string) => {
    try {
      await deleteDoc(doc(db, 'alugueis_carrinhos', aluguelId));
      toast.success('Aluguel excluído!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const formatarTempo = (segundos: number) => {
    const absSegundos = Math.abs(segundos);
    const min = Math.floor(absSegundos / 60);
    const seg = absSegundos % 60;
    const prefixo = segundos < 0 ? '' : '';
    return `${prefixo}${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
  };

  const getStatusCarrinho = (carrinhoId: string) => {
    const aluguel = alugueisAtivos.get(carrinhoId);
    if (!aluguel) return 'disponivel';
    if (aluguel.tipo === 'tempo_livre') return 'tempo_livre';
    if (aluguel.tempoRestante === 0) return 'finalizado';
    if (aluguel.tempoRestante <= 60) return 'acabando';
    return 'alugado';
  };

  const faturamentoDia = alugueis.filter(a => a.finalizado).reduce((acc, a) => acc + (a.valorTotal || 0), 0);
  const faturamentoMes = alugueisMensais.filter(a => a.finalizado).reduce((acc, a) => acc + (a.valorTotal || 0), 0);
  
  const faturamentoPorCarrinho = alugueis.filter(a => a.finalizado).reduce((acc, a) => {
    acc[a.carrinhoNome] = (acc[a.carrinhoNome] || 0) + (a.valorTotal || 0);
    return acc;
  }, {} as Record<string, number>);

  const faturamentoMensalPorCarrinho = alugueisMensais.filter(a => a.finalizado).reduce((acc, a) => {
    acc[a.carrinhoNome] = (acc[a.carrinhoNome] || 0) + (a.valorTotal || 0);
    return acc;
  }, {} as Record<string, number>);

  // Agrupa aluguéis mensais por dia
  const alugueisAgrupados = alugueisMensais.filter(a => a.finalizado).reduce((acc, a) => {
    const dia = format(a.inicio.toDate(), 'dd/MM');
    if (!acc[dia]) acc[dia] = { total: 0, count: 0 };
    acc[dia].total += a.valorTotal || 0;
    acc[dia].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={brinkarLogo} alt="Brin Kar" className="h-10 w-10 rounded-lg object-cover" />
            <h1 className="text-lg font-bold">Brin Kar</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="font-semibold text-green-400">
              R$ {faturamentoDia.toFixed(2)}
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="p-4">
        {tabAtiva === 'painel' && (
          <div className="space-y-4">
            {/* Grid de Carrinhos */}
            {carrinhos.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700 p-8 text-center">
                <Car className="h-12 w-12 mx-auto text-slate-500 mb-3" />
                <p className="text-slate-400">Nenhum carrinho cadastrado</p>
                <Button 
                  className="mt-4"
                  onClick={() => {
                    setEditandoCarrinho(null);
                    setNovoCarrinho({ nome: '', valorMinuto: '' });
                    setDialogCadastro(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Carrinho
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {carrinhos.map(carrinho => {
                  const status = getStatusCarrinho(carrinho.id);
                  const aluguel = alugueisAtivos.get(carrinho.id);
                  
                  return (
                    <Card
                      key={carrinho.id}
                      className={`p-3 border-2 transition-all ${
                        status === 'disponivel' ? 'bg-slate-800 border-slate-600' :
                        status === 'finalizado' ? 'bg-red-900/50 border-red-500 animate-pulse' :
                        status === 'acabando' ? 'bg-yellow-900/50 border-yellow-500' :
                        status === 'tempo_livre' ? 'bg-purple-900/50 border-purple-500' :
                        'bg-emerald-900/50 border-emerald-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm truncate">{carrinho.nome}</span>
                        <Badge variant={
                          status === 'disponivel' ? 'secondary' : 
                          status === 'finalizado' ? 'destructive' : 
                          status === 'tempo_livre' ? 'outline' :
                          'default'
                        } className={`text-xs ${status === 'tempo_livre' ? 'border-purple-400 text-purple-400' : ''}`}>
                          {status === 'disponivel' ? 'Livre' : 
                           status === 'finalizado' ? 'FIM!' :
                           status === 'acabando' ? 'Acabando' : 
                           status === 'tempo_livre' ? 'Livre' :
                           'Alugado'}
                        </Badge>
                      </div>
                      
                      {aluguel ? (
                        <div className="text-center my-3">
                          <div className={`text-3xl font-mono font-bold ${
                            status === 'finalizado' ? 'text-red-400' :
                            status === 'acabando' ? 'text-yellow-400' : 
                            status === 'tempo_livre' ? 'text-purple-400' :
                            'text-emerald-400'
                          }`}>
                            {aluguel.tipo === 'tempo_livre' ? (
                              formatarTempo(Math.abs(aluguel.tempoRestante))
                            ) : (
                              formatarTempo(aluguel.tempoRestante)
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {aluguel.tipo === 'tempo_livre' ? (
                              <span className="text-purple-300">
                                ≈ R$ {(Math.ceil(Math.abs(aluguel.tempoRestante) / 60) * carrinho.valorMinuto).toFixed(2)}
                              </span>
                            ) : (
                              `R$ ${(aluguel.valorTotal || 0).toFixed(2)}`
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center my-3">
                          <div className="text-2xl font-mono text-slate-500">--:--</div>
                          <div className="text-xs text-slate-500 mt-1">
                            R$ {(carrinho.valorMinuto || 0).toFixed(2)}/min
                          </div>
                        </div>
                      )}
                      
                      {aluguel ? (
                        status === 'finalizado' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full animate-pulse touch-manipulation"
                            disabled={processando}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              encerrarAluguel(carrinho.id);
                            }}
                          >
                            <Volume2 className="h-3 w-3 mr-1" />
                            {processando ? 'Aguarde...' : 'ENCERRAR'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className={`w-full touch-manipulation ${
                              status === 'tempo_livre' 
                                ? 'border-purple-500 text-purple-400 hover:bg-purple-500/20'
                                : 'border-red-500 text-red-400 hover:bg-red-500/20'
                            }`}
                            disabled={processando}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              pararAluguel(carrinho.id);
                            }}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            {processando ? 'Aguarde...' : (status === 'tempo_livre' ? 'Encerrar' : 'Parar')}
                          </Button>
                        )
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 touch-manipulation"
                          disabled={processando}
                          onClick={(e) => {
                            e.preventDefault();
                            setCarrinhoSelecionado(carrinho);
                            setTipoAluguel('minutos');
                            setDialogAluguel(true);
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Iniciar
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tabAtiva === 'carrinhos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Carrinhos</h2>
              <Button
                size="sm"
                onClick={() => {
                  setEditandoCarrinho(null);
                  setNovoCarrinho({ nome: '', valorMinuto: '' });
                  setDialogCadastro(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </div>
            
            <div className="space-y-2">
              {carrinhos.map(carrinho => (
                <Card key={carrinho.id} className="bg-slate-800 border-slate-700 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{carrinho.nome}</p>
                      <p className="text-sm text-emerald-400">R$ {(carrinho.valorMinuto || 0).toFixed(2)}/min</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditandoCarrinho(carrinho);
                          setNovoCarrinho({ nome: carrinho.nome, valorMinuto: carrinho.valorMinuto.toString() });
                          setDialogCadastro(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400"
                        onClick={() => excluirCarrinho(carrinho.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tabAtiva === 'relatorios' && (
          <div className="space-y-4">
            {/* Toggle Diário/Mensal */}
            <div className="flex justify-center">
              <div className="bg-slate-800 rounded-lg p-1 flex">
                <button
                  onClick={() => setTipoRelatorio('diario')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    tipoRelatorio === 'diario' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Diário
                </button>
                <button
                  onClick={() => setTipoRelatorio('mensal')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    tipoRelatorio === 'mensal' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Mensal
                </button>
              </div>
            </div>

            {tipoRelatorio === 'diario' ? (
              <>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setDataRelatorio(d => subDays(d, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <p className="text-sm text-slate-400">Faturamento</p>
                    <p className="font-semibold">
                      {format(dataRelatorio, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setDataRelatorio(d => addDays(d, 1))}
                    disabled={format(dataRelatorio, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                <Card className="bg-emerald-900/30 border-emerald-700 p-4 text-center">
                  <p className="text-sm text-emerald-300">Total do Dia</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    R$ {faturamentoDia.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {alugueis.filter(a => a.finalizado).length} aluguéis
                  </p>
                </Card>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-400">Por Carrinho</h3>
                  {Object.entries(faturamentoPorCarrinho).length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhum aluguel finalizado neste dia</p>
                  ) : (
                    Object.entries(faturamentoPorCarrinho).map(([nome, valor]) => (
                      <Card key={nome} className="bg-slate-800 border-slate-700 p-3">
                        <div className="flex justify-between items-center">
                          <span>{nome}</span>
                          <span className="text-emerald-400 font-medium">R$ {valor.toFixed(2)}</span>
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-400">Histórico</h3>
                  {alugueis.filter(a => a.finalizado).map(aluguel => (
                    <Card key={aluguel.id} className="bg-slate-800/50 border-slate-700 p-2 text-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span>{aluguel.carrinhoNome}</span>
                            <span className="text-emerald-400">R$ {(aluguel.valorTotal || 0).toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{format(aluguel.inicio.toDate(), 'HH:mm')} - {aluguel.duracaoMinutos} min</span>
                            {aluguel.valorDevolvido && (
                              <span className="text-yellow-400">(dev. R$ {aluguel.valorDevolvido.toFixed(2)})</span>
                            )}
                            {aluguel.tipo === 'tempo_livre' && (
                              <Badge variant="outline" className="text-xs border-purple-400 text-purple-400">Livre</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                          onClick={() => {
                            if (confirm('Excluir este lançamento?')) {
                              excluirAluguelById(aluguel.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setDataRelatorio(d => subMonths(d, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <p className="text-sm text-slate-400">Faturamento</p>
                    <p className="font-semibold">
                      {format(dataRelatorio, "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setDataRelatorio(d => addMonths(d, 1))}
                    disabled={format(dataRelatorio, 'yyyy-MM') === format(new Date(), 'yyyy-MM')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                <Card className="bg-emerald-900/30 border-emerald-700 p-4 text-center">
                  <p className="text-sm text-emerald-300">Total do Mês</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    R$ {faturamentoMes.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {alugueisMensais.filter(a => a.finalizado).length} aluguéis
                  </p>
                </Card>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-400">Por Carrinho</h3>
                  {Object.entries(faturamentoMensalPorCarrinho).length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhum aluguel neste mês</p>
                  ) : (
                    Object.entries(faturamentoMensalPorCarrinho).map(([nome, valor]) => (
                      <Card key={nome} className="bg-slate-800 border-slate-700 p-3">
                        <div className="flex justify-between items-center">
                          <span>{nome}</span>
                          <span className="text-emerald-400 font-medium">R$ {valor.toFixed(2)}</span>
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-400">Por Dia</h3>
                  {Object.entries(alugueisAgrupados).length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhum aluguel neste mês</p>
                  ) : (
                    Object.entries(alugueisAgrupados)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dia, { total, count }]) => (
                        <Card key={dia} className="bg-slate-800/50 border-slate-700 p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{dia}</span>
                              <span className="text-xs text-slate-500 ml-2">({count} aluguéis)</span>
                            </div>
                            <span className="text-emerald-400 font-medium">R$ {total.toFixed(2)}</span>
                          </div>
                        </Card>
                      ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Dialog Cadastro Carrinho */}
      <Dialog open={dialogCadastro} onOpenChange={setDialogCadastro}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>{editandoCarrinho ? 'Editar' : 'Novo'} Carrinho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome do carrinho"
              value={novoCarrinho.nome}
              onChange={(e) => setNovoCarrinho({ ...novoCarrinho, nome: e.target.value })}
              className="bg-slate-700 border-slate-600"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Valor por minuto (R$)"
              value={novoCarrinho.valorMinuto}
              onChange={(e) => setNovoCarrinho({ ...novoCarrinho, valorMinuto: e.target.value })}
              className="bg-slate-700 border-slate-600"
            />
            <Button onClick={salvarCarrinho} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Iniciar Aluguel */}
      <Dialog open={dialogAluguel} onOpenChange={setDialogAluguel}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Aluguel</DialogTitle>
          </DialogHeader>
          {carrinhoSelecionado && (
            <div className="space-y-4">
              <div className="text-center p-3 bg-slate-700 rounded-lg">
                <p className="font-bold text-lg">{carrinhoSelecionado.nome}</p>
                <p className="text-emerald-400">R$ {(carrinhoSelecionado.valorMinuto || 0).toFixed(2)}/min</p>
              </div>

              <Tabs value={tipoAluguel} onValueChange={(v) => setTipoAluguel(v as any)}>
                <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                  <TabsTrigger value="minutos">Min</TabsTrigger>
                  <TabsTrigger value="valor">R$</TabsTrigger>
                  <TabsTrigger value="desconto" className="text-yellow-400">
                    <Percent className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="tempo_livre" className="text-purple-400">
                    <Infinity className="h-3 w-3" />
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="minutos" className="mt-4">
                  <Input
                    type="number"
                    placeholder="Quantos minutos?"
                    value={inputMinutos}
                    onChange={(e) => setInputMinutos(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-center text-2xl h-14"
                  />
                  {inputMinutos && (
                    <p className="text-center mt-2 text-emerald-400">
                      Total: R$ {((parseInt(inputMinutos) || 0) * (carrinhoSelecionado.valorMinuto || 0)).toFixed(2)}
                    </p>
                  )}
                </TabsContent>
                
                <TabsContent value="valor" className="mt-4">
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Quanto em reais?"
                    value={inputValor}
                    onChange={(e) => setInputValor(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-center text-2xl h-14"
                  />
                  {inputValor && (
                    <p className="text-center mt-2 text-emerald-400">
                      Tempo: {Math.floor(parseFloat(inputValor) / carrinhoSelecionado.valorMinuto)} min
                    </p>
                  )}
                </TabsContent>
                
                <TabsContent value="desconto" className="mt-4 space-y-3">
                  <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 text-center">
                    <p className="text-yellow-400 text-sm">Valor personalizado com desconto</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">Minutos</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 10"
                        value={descontoMinutos}
                        onChange={(e) => setDescontoMinutos(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-center text-xl h-12"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 9"
                        value={descontoValor}
                        onChange={(e) => setDescontoValor(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-center text-xl h-12"
                      />
                    </div>
                  </div>
                  {descontoMinutos && descontoValor && (
                    <div className="bg-slate-700 rounded-lg p-3 text-center">
                      <p className="text-sm text-slate-400">
                        Normal: R$ {((parseInt(descontoMinutos) || 0) * (carrinhoSelecionado.valorMinuto || 0)).toFixed(2)}
                      </p>
                      <p className="text-lg font-bold text-yellow-400">
                        Desconto: R$ {((parseInt(descontoMinutos) || 0) * (carrinhoSelecionado.valorMinuto || 0) - (parseFloat(descontoValor) || 0)).toFixed(2)} OFF
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tempo_livre" className="mt-4">
                  <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-4 text-center space-y-2">
                    <Infinity className="h-8 w-8 mx-auto text-purple-400" />
                    <p className="text-purple-400 font-medium">Tempo Livre</p>
                    <p className="text-sm text-slate-400">
                      O cronômetro conta o tempo e cobra R$ {(carrinhoSelecionado.valorMinuto || 0).toFixed(2)}/min ao encerrar
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Button 
                onClick={iniciarAluguel} 
                className={`w-full h-12 text-lg ${
                  tipoAluguel === 'tempo_livre' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Play className="h-5 w-5 mr-2" />
                {tipoAluguel === 'tempo_livre' ? 'Iniciar Tempo Livre' : 'Iniciar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Encerramento Antecipado */}
      <Dialog open={dialogEncerramentoAntecipado} onOpenChange={setDialogEncerramentoAntecipado}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Encerrar Aluguel</DialogTitle>
            <DialogDescription className="text-slate-400">
              {aluguelParaEncerrar?.carrinho.nome}
            </DialogDescription>
          </DialogHeader>
          {aluguelParaEncerrar && (() => {
            const { valorUsado, valorDevolver, minutosUsados } = calcularValoresEncerramento();
            const isTempo_livre = aluguelParaEncerrar.aluguel.tipo === 'tempo_livre';
            
            return (
              <div className="space-y-4">
                <div className="bg-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tempo usado:</span>
                    <span className="font-medium">{minutosUsados} min</span>
                  </div>
                  
                  {isTempo_livre ? (
                    <div className="flex justify-between text-lg">
                      <span className="text-purple-400">Valor a cobrar:</span>
                      <span className="font-bold text-purple-400">R$ {valorUsado.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Valor original:</span>
                        <span>R$ {(aluguelParaEncerrar.aluguel.valorTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Valor utilizado:</span>
                        <span className="text-emerald-400">R$ {valorUsado.toFixed(2)}</span>
                      </div>
                      {valorDevolver > 0 && (
                        <div className="flex justify-between text-lg pt-2 border-t border-slate-600">
                          <span className="text-yellow-400">Devolver:</span>
                          <span className="font-bold text-yellow-400">R$ {valorDevolver.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <DialogFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-slate-600"
                    onClick={() => setDialogEncerramentoAntecipado(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className={`flex-1 ${isTempo_livre ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    onClick={confirmarEncerramentoAntecipado}
                    disabled={processando}
                  >
                    {processando ? 'Processando...' : 'Confirmar'}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-2 z-50">
        <div className="flex justify-around">
          <button
            onClick={() => setTabAtiva('painel')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
              tabAtiva === 'painel' ? 'text-yellow-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs mt-1">Painel</span>
          </button>
          <button
            onClick={() => setTabAtiva('carrinhos')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
              tabAtiva === 'carrinhos' ? 'text-yellow-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-1">Carrinhos</span>
          </button>
          <button
            onClick={() => setTabAtiva('relatorios')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
              tabAtiva === 'relatorios' ? 'text-yellow-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs mt-1">Relatórios</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AluguelCarrinhos;
