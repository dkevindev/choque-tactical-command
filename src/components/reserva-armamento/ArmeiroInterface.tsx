import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Power, PowerOff, User, Clock, Package, BookOpen, Target, Plus, Minus, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface Policial {
  id: string;
  'Matrícula': string | number;
  NOME: string;
  'Post/Grad': string;
  'SITUAÇÃO': string;
  senha?: string;
}

interface Material {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number;
  disponivel: boolean;
  fabricante?: string;
  observacoes?: string;
}

interface MaterialSelecionado {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
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
  const [armeiro] = useState("ARMEIRO001");
  const [loading, setLoading] = useState(false);
  
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<MaterialSelecionado[]>([]);
  const [searchPolicial, setSearchPolicial] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [reservasAtivas, setReservasAtivas] = useState<ReservaAtiva[]>([]);
  
  const { toast } = useToast();

  // Carregar policiais do Firebase
  const carregarPoliciais = useCallback(async () => {
    try {
      console.log('🔍 Carregando policiais do Firebase...');
      const querySnapshot = await getDocs(
        query(collection(db, 'policiais'), orderBy('NOME'))
      );
      
      const policiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Policial));
      
      console.log('✅ Policiais carregados:', policiaisData.length);
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('❌ Erro ao carregar policiais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar policiais do Firebase.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Carregar materiais disponíveis do Firebase
  const carregarMateriaisDisponiveis = useCallback(async () => {
    try {
      console.log('🔍 Carregando materiais do Firebase...');
      const querySnapshot = await getDocs(
        query(collection(db, 'materiais_belicos'), where('disponivel', '==', true))
      );
      
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));
      
      console.log('✅ Materiais carregados:', materiaisData.length);
      setMateriaisDisponiveis(materiaisData);
    } catch (error) {
      console.error('❌ Erro ao carregar materiais:', error);
      // Mock data para desenvolvimento se não encontrar no Firebase
      const mockMaterials = [
        { id: '1', nome: 'Pistola .40', categoria: 'Armamento', calibre: '.40', numeroSerie: 'BR001', disponivel: true },
        { id: '2', nome: 'Espingarda Calibre 12', categoria: 'Armamento', calibre: '12', numeroSerie: 'BR002', disponivel: true },
        { id: '3', nome: 'Colete Balístico', categoria: 'EPI', disponivel: true },
        { id: '4', nome: 'Munição .40', categoria: 'Munição', calibre: '.40', quantidade: 1000, disponivel: true },
        { id: '5', nome: 'Carregador .40', categoria: 'Acessório', disponivel: true }
      ];
      setMateriaisDisponiveis(mockMaterials);
      
      toast({
        title: "Aviso",
        description: "Usando dados de exemplo. Configure os materiais no Firebase.",
        variant: "default",
      });
    }
  }, [toast]);

  // Verificar reservas ativas
  const verificarReservasAtivas = useCallback(() => {
    console.log('🔍 Configurando listener para reservas ativas...');
    const q = query(collection(db, 'reservas_ativas'), where('status', '==', 'ativo'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reservas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReservaAtiva));
      
      console.log('📊 Reservas ativas:', reservas.length);
      setReservasAtivas(reservas);
    }, (error) => {
      console.error('❌ Erro ao escutar reservas:', error);
    });

    return unsubscribe;
  }, []);

  const abrirLivroDiario = () => {
    setLivroDiarioAberto(true);
    toast({
      title: "Livro Diário Aberto",
      description: "O livro diário foi aberto para movimentações.",
    });
  };

  const fecharLivroDiario = () => {
    setLivroDiarioAberto(false);
    setPolicialSelecionado(null);
    setMateriaisSelecionados([]);
    toast({
      title: "Livro Diário Fechado",
      description: "O livro diário foi fechado.",
    });
  };

  const selecionarPolicial = (policial: Policial) => {
    setPolicialSelecionado(policial);
    setSearchPolicial('');
    toast({
      title: "Policial Selecionado",
      description: `${policial.NOME} foi selecionado para atendimento.`,
    });
  };

  const adicionarMaterial = (material: Material, quantidade: number = 1) => {
    const materialExistente = materiaisSelecionados.find(m => m.materialId === material.id);
    
    if (materialExistente) {
      setMateriaisSelecionados(prev =>
        prev.map(m =>
          m.materialId === material.id
            ? { ...m, quantidade: m.quantidade + quantidade }
            : m
        )
      );
    } else {
      setMateriaisSelecionados(prev => [...prev, {
        materialId: material.id,
        nome: material.nome,
        categoria: material.categoria,
        quantidade
      }]);
    }
    
    toast({
      title: "Material Adicionado",
      description: `${material.nome} foi adicionado à seleção.`,
    });
  };

  const removerMaterial = (materialId: string) => {
    setMateriaisSelecionados(prev => prev.filter(m => m.materialId !== materialId));
    toast({
      title: "Material Removido",
      description: "Material removido da seleção.",
    });
  };

  const enviarParaConfirmacao = async () => {
    if (!policialSelecionado || materiaisSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um policial e pelo menos um material.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const reserva = {
        policialId: policialSelecionado.id,
        armeiro: armeiro,
        materiais: materiaisSelecionados.map(m => ({
          ...m,
          confirmado: false
        })),
        status: 'ativo',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'reservas_ativas'), reserva);
      
      toast({
        title: "Materiais Enviados",
        description: `Materiais enviados para ${policialSelecionado.NOME}. Aguardando confirmação.`,
      });
      
      setMateriaisSelecionados([]);
      
    } catch (error) {
      console.error('Erro ao enviar materiais:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar materiais para confirmação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtros
  const policiaisFiltrados = policiais.filter(p => {
    const filtroLower = searchPolicial.toLowerCase();
    const nomeMatch = (p.NOME?.toLowerCase() || '').includes(filtroLower);
    const matriculaMatch = String(p['Matrícula'] || '').includes(searchPolicial);
    return nomeMatch || matriculaMatch;
  });

  const materiaisFiltrados = materiaisDisponiveis.filter(m =>
    m.nome.toLowerCase().includes(searchMaterial.toLowerCase()) ||
    m.categoria.toLowerCase().includes(searchMaterial.toLowerCase())
  );

  const categorias = [...new Set(materiaisFiltrados.map(m => m.categoria))];

  useEffect(() => {
    carregarPoliciais();
    carregarMateriaisDisponiveis();
    const unsubscribeReservas = verificarReservasAtivas();

    return () => {
      if (unsubscribeReservas) {
        unsubscribeReservas();
      }
    };
  }, [carregarPoliciais, carregarMateriaisDisponiveis, verificarReservasAtivas]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Controle do Livro Diário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {livroDiarioAberto ? (
              <BookOpen className="h-5 w-5 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 text-red-500" />
            )}
            Controle do Livro Diário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={livroDiarioAberto ? "default" : "secondary"}>
              {livroDiarioAberto ? "ABERTO" : "FECHADO"}
            </Badge>
            
            {!livroDiarioAberto ? (
              <Button 
                onClick={abrirLivroDiario}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Abrir Livro Diário
              </Button>
            ) : (
              <Button 
                onClick={fecharLivroDiario}
                disabled={loading}
                variant="destructive"
              >
                <Lock className="h-4 w-4 mr-2" />
                Fechar Livro Diário
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {livroDiarioAberto && (
        <>
          {/* Dashboard de Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Reservas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {reservasAtivas.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Policiais Cadastrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {policiais.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Materiais Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {materiaisDisponiveis.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interface Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Painel de Seleção de Policial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Seleção de Policial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou matrícula..."
                      value={searchPolicial}
                      onChange={(e) => setSearchPolicial(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {policialSelecionado ? (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-blue-900">
                            {policialSelecionado.NOME}
                          </div>
                          <div className="text-sm text-blue-700">
                            {policialSelecionado['Post/Grad']} - Mat: {policialSelecionado['Matrícula']}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPolicialSelecionado(null)}
                        >
                          Alterar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      <div className="text-xs text-muted-foreground mb-2">
                        {policiaisFiltrados.length} de {policiais.length} policiais
                      </div>
                      {policiaisFiltrados.map((policial) => (
                        <div
                          key={policial.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => selecionarPolicial(policial)}
                        >
                          <div className="font-semibold">{policial.NOME}</div>
                          <div className="text-sm text-muted-foreground">
                            {policial['Post/Grad']} - Mat: {policial['Matrícula']}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Painel de Materiais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Materiais Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar material..."
                      value={searchMaterial}
                      onChange={(e) => setSearchMaterial(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {categorias.map((categoria) => (
                      <div key={categoria}>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          {categoria}
                        </h4>
                        <div className="space-y-2">
                          {materiaisFiltrados
                            .filter(m => m.categoria === categoria)
                            .map((material) => (
                              <div
                                key={material.id}
                                className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                                onClick={() => policialSelecionado && adicionarMaterial(material)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium">{material.nome}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {material.numeroSerie && `Série: ${material.numeroSerie}`}
                                      {material.calibre && ` - Calibre: ${material.calibre}`}
                                      {material.quantidade && ` - Qtd: ${material.quantidade}`}
                                    </div>
                                  </div>
                                  <Badge variant="secondary">
                                    {material.categoria}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Materiais Selecionados */}
          {materiaisSelecionados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Materiais Selecionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materiaisSelecionados.map((material) => (
                    <div key={material.materialId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{material.nome}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          Qtd: {material.quantidade}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removerMaterial(material.materialId)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    onClick={enviarParaConfirmacao}
                    disabled={!policialSelecionado || loading}
                    className="w-full mt-4"
                  >
                    Enviar para Confirmação do Policial
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reservas Ativas */}
          {reservasAtivas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Reservas Aguardando Confirmação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reservasAtivas.map((reserva) => (
                    <div key={reserva.id} className="p-3 border rounded-lg">
                      <div className="font-semibold text-orange-600">
                        Policial ID: {reserva.policialId}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {reserva.materiais.length} materiais enviados
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {reserva.createdAt.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ArmeiroInterface;