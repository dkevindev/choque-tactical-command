import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Play, Square, Settings, BarChart3, Car, Clock, DollarSign, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  tipo: 'minutos' | 'valor';
}

interface AluguelAtivo {
  carrinhoId: string;
  inicio: Date;
  duracaoMinutos: number;
  tempoRestante: number;
  valorTotal: number;
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
  const [tipoAluguel, setTipoAluguel] = useState<'minutos' | 'valor'>('minutos');
  const [inputMinutos, setInputMinutos] = useState('');
  const [inputValor, setInputValor] = useState('');
  
  // Relatórios
  const [dataRelatorio, setDataRelatorio] = useState(new Date());

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

  // Carregar aluguéis ativos
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'alugueis_carrinhos'), where('finalizado', '==', false)),
      (snapshot) => {
        const novosAtivos = new Map<string, AluguelAtivo>();
        snapshot.docs.forEach(doc => {
          const data = doc.data() as Aluguel;
          const inicio = data.inicio.toDate();
          const agora = new Date();
          const tempoDecorrido = Math.floor((agora.getTime() - inicio.getTime()) / 1000);
          const tempoTotal = data.duracaoMinutos * 60;
          const tempoRestante = Math.max(0, tempoTotal - tempoDecorrido);
          
          novosAtivos.set(data.carrinhoId, {
            carrinhoId: data.carrinhoId,
            inicio,
            duracaoMinutos: data.duracaoMinutos,
            tempoRestante,
            valorTotal: data.valorTotal
          });
        });
        setAlugueisAtivos(novosAtivos);
      }
    );
    return () => unsubscribe();
  }, []);

  // Carregar histórico de aluguéis para relatórios
  useEffect(() => {
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
  }, [dataRelatorio]);

  // Atualizar cronômetros a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setAlugueisAtivos(prev => {
        const novos = new Map(prev);
        novos.forEach((aluguel, carrinhoId) => {
          const agora = new Date();
          const tempoDecorrido = Math.floor((agora.getTime() - aluguel.inicio.getTime()) / 1000);
          const tempoTotal = aluguel.duracaoMinutos * 60;
          const tempoRestante = Math.max(0, tempoTotal - tempoDecorrido);
          
          novos.set(carrinhoId, { ...aluguel, tempoRestante });
          
          // Finalizar automaticamente quando tempo acabar
          if (tempoRestante === 0 && prev.get(carrinhoId)?.tempoRestante !== 0) {
            finalizarAluguel(carrinhoId);
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
    if (!carrinhoSelecionado) return;

    let duracaoMinutos = 0;
    let valorTotal = 0;

    if (tipoAluguel === 'minutos') {
      duracaoMinutos = parseInt(inputMinutos);
      valorTotal = duracaoMinutos * carrinhoSelecionado.valorMinuto;
    } else {
      valorTotal = parseFloat(inputValor);
      duracaoMinutos = Math.floor(valorTotal / carrinhoSelecionado.valorMinuto);
    }

    if (duracaoMinutos <= 0) {
      toast.error('Tempo inválido');
      return;
    }

    try {
      await addDoc(collection(db, 'alugueis_carrinhos'), {
        carrinhoId: carrinhoSelecionado.id,
        carrinhoNome: carrinhoSelecionado.nome,
        inicio: Timestamp.now(),
        duracaoMinutos,
        valorTotal,
        finalizado: false,
        tipo: tipoAluguel
      });
      
      toast.success(`Aluguel iniciado: ${duracaoMinutos} min por R$ ${valorTotal.toFixed(2)}`);
      setDialogAluguel(false);
      setInputMinutos('');
      setInputValor('');
      setCarrinhoSelecionado(null);
    } catch (error) {
      toast.error('Erro ao iniciar aluguel');
    }
  };

  const finalizarAluguel = async (carrinhoId: string) => {
    try {
      const q = query(
        collection(db, 'alugueis_carrinhos'),
        where('carrinhoId', '==', carrinhoId),
        where('finalizado', '==', false)
      );
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          await updateDoc(docRef, {
            finalizado: true,
            fim: Timestamp.now()
          });
        }
        unsubscribe();
      });
      
      toast.info('Tempo finalizado!');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
    }
  };

  const pararAluguel = async (carrinhoId: string) => {
    try {
      const q = query(
        collection(db, 'alugueis_carrinhos'),
        where('carrinhoId', '==', carrinhoId),
        where('finalizado', '==', false)
      );
      
      onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          await updateDoc(docRef, {
            finalizado: true,
            fim: Timestamp.now()
          });
          toast.success('Aluguel encerrado!');
        }
      }, { once: true } as any);
    } catch (error) {
      toast.error('Erro ao encerrar');
    }
  };

  const formatarTempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
  };

  const getStatusCarrinho = (carrinhoId: string) => {
    const aluguel = alugueisAtivos.get(carrinhoId);
    if (!aluguel) return 'disponivel';
    if (aluguel.tempoRestante === 0) return 'finalizado';
    if (aluguel.tempoRestante <= 60) return 'acabando';
    return 'alugado';
  };

  const faturamentoDia = alugueis.reduce((acc, a) => acc + a.valorTotal, 0);
  const faturamentoPorCarrinho = alugueis.reduce((acc, a) => {
    acc[a.carrinhoNome] = (acc[a.carrinhoNome] || 0) + a.valorTotal;
    return acc;
  }, {} as Record<string, number>);

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
            <Car className="h-6 w-6 text-yellow-400" />
            <h1 className="text-lg font-bold">Aluguéis</h1>
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
                        'bg-emerald-900/50 border-emerald-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm truncate">{carrinho.nome}</span>
                        <Badge variant={status === 'disponivel' ? 'secondary' : status === 'finalizado' ? 'destructive' : 'default'} className="text-xs">
                          {status === 'disponivel' ? 'Livre' : 
                           status === 'finalizado' ? 'FIM!' :
                           status === 'acabando' ? 'Acabando' : 'Alugado'}
                        </Badge>
                      </div>
                      
                      {aluguel ? (
                        <div className="text-center my-3">
                          <div className={`text-3xl font-mono font-bold ${
                            status === 'finalizado' ? 'text-red-400' :
                            status === 'acabando' ? 'text-yellow-400' : 'text-emerald-400'
                          }`}>
                            {formatarTempo(aluguel.tempoRestante)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            R$ {aluguel.valorTotal.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center my-3">
                          <div className="text-2xl font-mono text-slate-500">--:--</div>
                          <div className="text-xs text-slate-500 mt-1">
                            R$ {carrinho.valorMinuto.toFixed(2)}/min
                          </div>
                        </div>
                      )}
                      
                      {aluguel ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => pararAluguel(carrinho.id)}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          Parar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setCarrinhoSelecionado(carrinho);
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
                      <p className="text-sm text-emerald-400">R$ {carrinho.valorMinuto.toFixed(2)}/min</p>
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
                {alugueis.length} aluguéis
              </p>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400">Por Carrinho</h3>
              {Object.entries(faturamentoPorCarrinho).length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum aluguel neste dia</p>
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
              {alugueis.map(aluguel => (
                <Card key={aluguel.id} className="bg-slate-800/50 border-slate-700 p-2 text-sm">
                  <div className="flex justify-between">
                    <span>{aluguel.carrinhoNome}</span>
                    <span className="text-emerald-400">R$ {aluguel.valorTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(aluguel.inicio.toDate(), 'HH:mm')} - {aluguel.duracaoMinutos} min
                  </div>
                </Card>
              ))}
            </div>
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
                <p className="text-emerald-400">R$ {carrinhoSelecionado.valorMinuto.toFixed(2)}/min</p>
              </div>

              <Tabs value={tipoAluguel} onValueChange={(v) => setTipoAluguel(v as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="minutos">Por Minutos</TabsTrigger>
                  <TabsTrigger value="valor">Por Valor</TabsTrigger>
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
                      Total: R$ {(parseInt(inputMinutos) * carrinhoSelecionado.valorMinuto).toFixed(2)}
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
              </Tabs>

              <Button 
                onClick={iniciarAluguel} 
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="h-5 w-5 mr-2" />
                Iniciar
              </Button>
            </div>
          )}
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
