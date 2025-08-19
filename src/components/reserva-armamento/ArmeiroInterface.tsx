import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  User, 
  Target, 
  Plus, 
  Minus,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Lock
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Material {
  id: string;
  nome: string;
  categoria: string;
  calibre?: string;
  numeroSerie?: string;
  disponivel: boolean;
  cautelado?: boolean;
  cauteladoPara?: string;
}

interface Policial {
  id: string;
  NOME: string;
  'Matrícula': string;
  NUMERAL: number;
  'Post/Grad': string;
  'SITUAÇÃO': string;
}

interface ReservaAtiva {
  id: string;
  policialId: string;
  armeiro: string;
  materiais: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    quantidade: number;
    confirmado: boolean;
  }>;
  status: 'ativo' | 'finalizado';
  createdAt: Date;
}

const ArmeiroInterface = () => {
  const [livroDiarioAberto, setLivroDiarioAberto] = useState(false);
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<Array<{materialId: string; nome: string; categoria: string; quantidade: number}>>([]);
  const [buscaPolicial, setBuscaPolicial] = useState('');
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [reservaAtiva, setReservaAtiva] = useState<ReservaAtiva | null>(null);
  const [buscaMaterial, setBuscaMaterial] = useState('');

  // Load initial data
  useEffect(() => {
    loadMateriaisDisponiveis();
    loadPoliciais();
    checkReservaAtiva();
  }, []);

  const loadMateriaisDisponiveis = async () => {
    try {
      const q = query(collection(db, 'materiais_belicos'), where('disponivel', '==', true));
      const querySnapshot = await getDocs(q);
      const materiais = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));
      setMateriaisDisponiveis(materiais);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      // Mock data for development
      setMateriaisDisponiveis([
        { id: '1', nome: 'Pistola .40', categoria: 'Armamento', calibre: '.40', numeroSerie: 'BR001', disponivel: true },
        { id: '2', nome: 'Espingarda Calibre 12', categoria: 'Armamento', calibre: '12', numeroSerie: 'BR002', disponivel: true },
        { id: '3', nome: 'Colete Balístico', categoria: 'EPI', disponivel: true },
        { id: '4', nome: 'Munição .40', categoria: 'Munição', calibre: '.40', disponivel: true },
        { id: '5', nome: 'Carregador .40', categoria: 'Acessório', disponivel: true }
      ]);
    }
  };

  const loadPoliciais = async () => {
    console.log('🔍 Tentando carregar policiais...');
    try {
      const querySnapshot = await getDocs(collection(db, 'policiais'));
      console.log('📊 Documentos encontrados:', querySnapshot.size);
      
      const policiais = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('👮 Policial encontrado:', data);
        return {
          id: doc.id,
          ...data
        } as Policial;
      });
      
      console.log('✅ Policiais carregados:', policiais);
      setPoliciais(policiais);
    } catch (error) {
      console.error('❌ Erro ao carregar policiais:', error);
      // Mock data for development
      const mockPoliciais = [
        { id: '1', NOME: 'João Silva Santos', 'Matrícula': '123456', NUMERAL: 1, 'Post/Grad': 'Soldado', 'SITUAÇÃO': 'Ativo' },
        { id: '2', NOME: 'Maria Oliveira Costa', 'Matrícula': '123457', NUMERAL: 2, 'Post/Grad': 'Cabo', 'SITUAÇÃO': 'Ativo' },
        { id: '3', NOME: 'Carlos Souza Lima', 'Matrícula': '123458', NUMERAL: 3, 'Post/Grad': 'Sargento', 'SITUAÇÃO': 'Ativo' }
      ];
      console.log('🎭 Usando dados mock:', mockPoliciais);
      setPoliciais(mockPoliciais);
    }
  };

  const checkReservaAtiva = () => {
    // Listen for active reservations
    const q = query(collection(db, 'reservas_ativas'), where('status', '==', 'ativo'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const reserva = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        } as ReservaAtiva;
        setReservaAtiva(reserva);
      } else {
        setReservaAtiva(null);
      }
    });

    return unsubscribe;
  };

  const abrirLivroDiario = () => {
    setLivroDiarioAberto(true);
    toast.success('Livro diário aberto para movimentações');
  };

  const fecharLivroDiario = () => {
    setLivroDiarioAberto(false);
    setPolicialSelecionado(null);
    setMateriaisSelecionados([]);
    toast.success('Livro diário fechado');
  };

  const selecionarPolicial = (policial: Policial) => {
    setPolicialSelecionado(policial);
    setBuscaPolicial('');
    toast.success(`Policial ${policial.NOME} selecionado`);
  };

  const adicionarMaterial = (material: Material) => {
    const materialExistente = materiaisSelecionados.find(m => m.materialId === material.id);
    
    if (materialExistente) {
      setMateriaisSelecionados(prev => 
        prev.map(m => 
          m.materialId === material.id 
            ? { ...m, quantidade: m.quantidade + 1 }
            : m
        )
      );
    } else {
      setMateriaisSelecionados(prev => [...prev, {
        materialId: material.id,
        nome: material.nome,
        categoria: material.categoria,
        quantidade: 1
      }]);
    }
    toast.success(`${material.nome} adicionado`);
  };

  const removerMaterial = (materialId: string) => {
    const material = materiaisSelecionados.find(m => m.materialId === materialId);
    if (material && material.quantidade > 1) {
      setMateriaisSelecionados(prev => 
        prev.map(m => 
          m.materialId === materialId 
            ? { ...m, quantidade: m.quantidade - 1 }
            : m
        )
      );
    } else {
      setMateriaisSelecionados(prev => prev.filter(m => m.materialId !== materialId));
    }
  };

  const enviarParaPolicial = async () => {
    if (!policialSelecionado || materiaisSelecionados.length === 0) {
      toast.error('Selecione um policial e materiais');
      return;
    }

    try {
      const reserva = {
        policialId: policialSelecionado.id,
        armeiro: 'Atual', // Replace with actual armorer info
        materiais: materiaisSelecionados.map(m => ({
          ...m,
          confirmado: false
        })),
        status: 'ativo',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'reservas_ativas'), reserva);
      toast.success('Materiais enviados para confirmação do policial');
      
      // Clear selection but keep policial selected for additional materials
      setMateriaisSelecionados([]);
    } catch (error) {
      console.error('Erro ao enviar materiais:', error);
      toast.error('Erro ao enviar materiais');
    }
  };

  const policialsFiltrados = policiais.filter(p => {
    const filtroLower = buscaPolicial.toLowerCase();
    const nomeMatch = (p.NOME?.toLowerCase() || '').includes(filtroLower);
    const matriculaMatch = (p['Matrícula'] || '').includes(buscaPolicial);
    const numeralMatch = (p.NUMERAL?.toString() || '').includes(buscaPolicial);
    
    console.log('🔍 Filtrando policial:', {
      nome: p.NOME,
      matricula: p['Matrícula'],
      numeral: p.NUMERAL,
      filtro: buscaPolicial,
      nomeMatch,
      matriculaMatch,
      numeralMatch,
      resultado: nomeMatch || matriculaMatch || numeralMatch
    });
    
    return nomeMatch || matriculaMatch || numeralMatch;
  });

  console.log('👥 Policiais disponíveis:', policiais.length);
  console.log('🔍 Busca atual:', buscaPolicial);
  console.log('✅ Policiais filtrados:', policialsFiltrados.length);

  const materiaisFiltrados = materiaisDisponiveis.filter(m =>
    (m.nome?.toLowerCase() || '').includes(buscaMaterial.toLowerCase()) ||
    (m.categoria?.toLowerCase() || '').includes(buscaMaterial.toLowerCase())
  );

  // Agrupar materiais por categoria
  const materiaisPorCategoria = materiaisFiltrados.reduce((acc, material) => {
    const categoria = material.categoria || 'Sem Categoria';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  const categorias = Object.keys(materiaisPorCategoria).sort();

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Badge variant={livroDiarioAberto ? "default" : "secondary"} className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {livroDiarioAberto ? 'LIVRO ABERTO' : 'LIVRO FECHADO'}
          </Badge>
          {livroDiarioAberto && (
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Sessão iniciada às {new Date().toLocaleTimeString()}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          {!livroDiarioAberto ? (
            <Button onClick={abrirLivroDiario} className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Abrir Livro Diário
            </Button>
          ) : (
            <Button variant="destructive" onClick={fecharLivroDiario} className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Fechar Livro Diário
            </Button>
          )}
        </div>
      </div>

      {livroDiarioAberto && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Policial Selection and Materials */}
          <div className="space-y-6">
            {/* Policial Selection */}
            <Card className="bg-card border-border shadow-tactical">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <User className="h-5 w-5" />
                  SELEÇÃO DE POLICIAL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, matrícula ou numeral..."
                      value={buscaPolicial}
                      onChange={(e) => setBuscaPolicial(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {policialSelecionado ? (
                    <div className="p-4 bg-primary/10 border border-primary rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{policialSelecionado.NOME}</h3>
                          <p className="text-sm text-muted-foreground">
                            {policialSelecionado['Post/Grad']} • Mat: {policialSelecionado['Matrícula']} • Num: {policialSelecionado.NUMERAL}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setPolicialSelecionado(null)}
                        >
                          Alterar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      <div className="text-xs text-muted-foreground mb-2">
                        Mostrando {policialsFiltrados.length} de {policiais.length} policiais
                      </div>
                      {policialsFiltrados.length > 0 ? (
                        policialsFiltrados.map(policial => (
                          <div
                            key={policial.id}
                            className="p-3 bg-muted hover:bg-accent cursor-pointer rounded border"
                            onClick={() => selecionarPolicial(policial)}
                          >
                            <h4 className="font-medium text-foreground">{policial.NOME}</h4>
                            <p className="text-sm text-muted-foreground">
                              {policial['Post/Grad']} • Mat: {policial['Matrícula']} • Num: {policial.NUMERAL}
                            </p>
                          </div>
                        ))
                      ) : buscaPolicial ? (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhum policial encontrado para "{buscaPolicial}"
                        </p>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          Digite para buscar policiais ({policiais.length} disponíveis)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Materials */}
            {materiaisSelecionados.length > 0 && (
              <Card className="bg-card border-border shadow-tactical">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    MATERIAIS SELECIONADOS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {materiaisSelecionados.map(material => (
                      <div key={material.materialId} className="flex items-center justify-between p-3 bg-muted rounded">
                        <div>
                          <h4 className="font-medium text-foreground">{material.nome}</h4>
                          <p className="text-sm text-muted-foreground">{material.categoria}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerMaterial(material.materialId)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold text-foreground min-w-[2rem] text-center">
                            {material.quantidade}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const materialOriginal = materiaisDisponiveis.find(m => m.id === material.materialId);
                              if (materialOriginal) adicionarMaterial(materialOriginal);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      onClick={enviarParaPolicial}
                      disabled={!policialSelecionado}
                      className="w-full mt-4"
                    >
                      Enviar para Policial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Available Materials */}
          <Card className="bg-card border-border shadow-tactical">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Target className="h-5 w-5" />
                MATERIAIS DISPONÍVEIS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar materiais..."
                    value={buscaMaterial}
                    onChange={(e) => setBuscaMaterial(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Tabs defaultValue={categorias[0]} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    {categorias.slice(0, 4).map(categoria => (
                      <TabsTrigger key={categoria} value={categoria} className="text-xs">
                        {categoria}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {categorias.map(categoria => (
                    <TabsContent key={categoria} value={categoria}>
                      <div className="max-h-80 overflow-y-auto space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{categoria}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {materiaisPorCategoria[categoria].length} itens
                          </span>
                        </div>
                        
                        {materiaisPorCategoria[categoria].map(material => (
                          <div
                            key={material.id}
                            className="p-3 bg-muted hover:bg-accent cursor-pointer rounded border flex items-center justify-between"
                            onClick={() => adicionarMaterial(material)}
                          >
                            <div>
                              <h4 className="font-medium text-foreground">{material.nome}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{material.categoria}</Badge>
                                {material.calibre && (
                                  <Badge variant="outline" className="text-xs">
                                    {material.calibre}
                                  </Badge>
                                )}
                              </div>
                              {material.numeroSerie && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Série: {material.numeroSerie}
                                </p>
                              )}
                            </div>
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        ))}
                        
                        {materiaisPorCategoria[categoria].length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            Nenhum material encontrado nesta categoria
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                {categorias.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {buscaMaterial ? 'Nenhum material encontrado' : 'Nenhum material disponível'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Reservation Status */}
      {reservaAtiva && (
        <Card className="bg-primary/10 border-primary shadow-tactical">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              RESERVA ATIVA - AGUARDANDO CONFIRMAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-foreground">
                <strong>Policial:</strong> {policiais.find(p => p.id === reservaAtiva.policialId)?.NOME || 'Carregando...'}
              </p>
              <div>
                <p className="text-foreground font-medium mb-2">Materiais enviados:</p>
                <div className="space-y-1">
                  {reservaAtiva.materiais.map((material, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {material.nome} ({material.categoria}) - Qtd: {material.quantidade}
                      </span>
                      {material.confirmado ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArmeiroInterface;
