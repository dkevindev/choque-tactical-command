import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, User, Clock, Package, BookOpen, Target, Plus, Minus, 
  CheckCircle, AlertCircle, Lock, Shield, Crosshair, MapPin, 
  History, RotateCcw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  doc, getDocs, orderBy, getDoc 
} from 'firebase/firestore';
import { db } from '@/firebase';
import ModalConfirmacaoPolicial from './ModalConfirmacaoPolicial';
import ModalQuantidadeMaterial from './ModalQuantidadeMaterial';
import ModalFechamentoLivro from './ModalFechamentoLivro';
import BaixaMaterialSection from './BaixaMaterialSection';
import HistoricoLivrosSection from './HistoricoLivrosSection';
import MaterialNaRuaSection from './MaterialNaRuaSection';
import LivroCautelaDia from './LivroCautelaDia';

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
  tipoArma?: string;
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
  numeroSerie?: string;
  carregadores?: number;
}

interface LivroAtivo {
  id: string;
  armeiroId: string;
  armeiroNome: string;
  dataAbertura: Date;
  status: 'aberto' | 'fechado';
}

interface MovimentacaoDia {
  id: string;
  tipo: 'cautela' | 'baixa';
  policialNome: string;
  policialMatricula?: string;
  postoGrad?: string;
  materiais: Array<{
    nome: string;
    quantidade: number;
    numeroSerie?: string;
    categoria?: string;
  }>;
  dataCautela?: Date;
  dataBaixa?: Date;
  hora: string;
  sequencial: number;
}

const CATEGORIAS = [
  { id: 'arma_curta', label: 'Arma Curta', icon: Target },
  { id: 'arma_longa', label: 'Arma Longa', icon: Crosshair },
  { id: 'municao', label: 'Munição', icon: Package },
  { id: 'epi', label: 'EPI', icon: Shield },
  { id: 'acessorio', label: 'Acessórios', icon: Plus }
];

const ArmeiroInterface = () => {
  const [livroAtivo, setLivroAtivo] = useState<LivroAtivo | null>(null);
  const [armeiroNome, setArmeiroNome] = useState("ARMEIRO LOGADO");
  const [armeiroId, setArmeiroId] = useState("armeiro_001");
  const [loading, setLoading] = useState(false);
  
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<MaterialSelecionado[]>([]);
  const [searchPolicial, setSearchPolicial] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState("arma_curta");
  
  // Modais
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [modalQuantidade, setModalQuantidade] = useState(false);
  const [modalFechamento, setModalFechamento] = useState(false);
  const [materialParaQuantidade, setMaterialParaQuantidade] = useState<Material | null>(null);
  const [tipoQuantidade, setTipoQuantidade] = useState<'municao' | 'arma'>('municao');
  
  // Estatísticas
  const [totalCautelasHoje, setTotalCautelasHoje] = useState(0);
  const [totalBaixasHoje, setTotalBaixasHoje] = useState(0);
  
  // Movimentações do dia (para tabela visual)
  const [movimentacoesDoDia, setMovimentacoesDoDia] = useState<MovimentacaoDia[]>([]);
  
  // Tab ativa
  const [tabAtiva, setTabAtiva] = useState("cautela");
  
  const { toast } = useToast();

  // Carregar movimentações do dia do Firebase
  const carregarMovimentacoesDoDia = useCallback(async (livroId: string) => {
    try {
      // Carregar cautelas do livro
      const cautelasSnapshot = await getDocs(
        query(collection(db, 'cautelas_provisorias'), where('livroId', '==', livroId))
      );
      
      // Carregar movimentações (cautelas e baixas) do livro
      const movimentacoesSnapshot = await getDocs(
        query(collection(db, 'movimentacoes_belicas'), where('livroId', '==', livroId))
      );
      
      const movimentacoes: MovimentacaoDia[] = [];
      let sequencial = 1;
      
      // Processar cautelas
      cautelasSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const dataCautela = data.dataCautela?.toDate?.() || new Date();
        movimentacoes.push({
          id: docSnap.id,
          tipo: 'cautela',
          policialNome: data.policialNome || '',
          policialMatricula: data.policialMatricula,
          materiais: data.materiais || [],
          dataCautela,
          hora: dataCautela.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          sequencial: 0 // será atribuído depois de ordenar
        });
      });
      
      // Processar baixas das movimentações
      movimentacoesSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.tipo === 'baixa') {
          const dataBaixa = data.dataBaixa?.toDate?.() || new Date();
          movimentacoes.push({
            id: docSnap.id,
            tipo: 'baixa',
            policialNome: data.policialNome || '',
            policialMatricula: data.policialMatricula,
            materiais: data.materiais || [],
            dataBaixa,
            hora: dataBaixa.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            sequencial: 0
          });
        }
      });
      
      // Ordenar por data e atribuir sequencial
      movimentacoes.sort((a, b) => {
        const dateA = a.dataCautela || a.dataBaixa || new Date();
        const dateB = b.dataCautela || b.dataBaixa || new Date();
        return dateA.getTime() - dateB.getTime();
      });
      
      movimentacoes.forEach((mov, idx) => {
        mov.sequencial = idx + 1;
      });
      
      setMovimentacoesDoDia(movimentacoes);
      
      // Atualizar contadores
      const totalCautelas = movimentacoes.filter(m => m.tipo === 'cautela').length;
      const totalBaixas = movimentacoes.filter(m => m.tipo === 'baixa').length;
      setTotalCautelasHoje(totalCautelas);
      setTotalBaixasHoje(totalBaixas);
      
    } catch (error) {
      console.error('Erro ao carregar movimentações do dia:', error);
    }
  }, []);

  // Verificar livro ativo ao carregar
  useEffect(() => {
    const verificarLivroAtivo = async () => {
      try {
        const querySnapshot = await getDocs(
          query(collection(db, 'livros_reserva_armamento'), where('status', '==', 'aberto'))
        );
        
        if (!querySnapshot.empty) {
          const livroData = querySnapshot.docs[0].data();
          const livroId = querySnapshot.docs[0].id;
          
          setLivroAtivo({
            id: livroId,
            ...livroData,
            dataAbertura: livroData.dataAbertura?.toDate?.() || new Date()
          } as LivroAtivo);
          
          // Carregar movimentações do dia
          await carregarMovimentacoesDoDia(livroId);
        }
      } catch (error) {
        console.error('Erro ao verificar livro ativo:', error);
      }
    };
    
    verificarLivroAtivo();
  }, [carregarMovimentacoesDoDia]);

  // Carregar policiais do Firebase
  const carregarPoliciais = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'policiais'), orderBy('NOME'))
      );
      
      const policiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Policial));
      
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
    }
  }, []);

  // Carregar materiais disponíveis do Firebase
  const carregarMateriaisDisponiveis = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'materiais_belicos'), where('disponivel', '==', true))
      );
      
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));
      
      setMateriaisDisponiveis(materiaisData);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      // Mock data para desenvolvimento
      const mockMaterials: Material[] = [
        { id: '1', nome: 'Pistola .40 TAURUS', categoria: 'Arma', tipoArma: 'Arma Curta', calibre: '.40', numeroSerie: 'BR001', disponivel: true },
        { id: '2', nome: 'Espingarda Cal 12', categoria: 'Arma', tipoArma: 'Arma Longa', calibre: '12', numeroSerie: 'BR002', disponivel: true },
        { id: '3', nome: 'Colete Balístico Nível III', categoria: 'EPI', disponivel: true },
        { id: '4', nome: 'Munição .40 CBC', categoria: 'Munição', calibre: '.40', quantidade: 1000, disponivel: true },
        { id: '5', nome: 'Carregador .40', categoria: 'Acessórios', disponivel: true },
        { id: '6', nome: 'Fuzil 5.56', categoria: 'Arma', tipoArma: 'Arma Longa', calibre: '5.56', numeroSerie: 'BR003', disponivel: true },
        { id: '7', nome: 'Munição 5.56', categoria: 'Munição', calibre: '5.56', quantidade: 500, disponivel: true },
      ];
      setMateriaisDisponiveis(mockMaterials);
    }
  }, []);

  useEffect(() => {
    carregarPoliciais();
    carregarMateriaisDisponiveis();
  }, [carregarPoliciais, carregarMateriaisDisponiveis]);

  // Abrir Livro Diário
  const abrirLivroDiario = async () => {
    try {
      setLoading(true);
      
      const livroRef = await addDoc(collection(db, 'livros_reserva_armamento'), {
        armeiroId,
        armeiroNome,
        dataAbertura: new Date(),
        status: 'aberto',
        alteracoes: [],
        totalCautelas: 0,
        totalBaixas: 0
      });
      
      setLivroAtivo({
        id: livroRef.id,
        armeiroId,
        armeiroNome,
        dataAbertura: new Date(),
        status: 'aberto'
      });
      
      toast({
        title: "Livro Diário Aberto",
        description: "O livro diário foi aberto para movimentações.",
      });
    } catch (error) {
      console.error('Erro ao abrir livro:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir livro diário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fechar Livro Diário
  const handleFecharLivro = async (senha: string, alteracoes: any[]) => {
    try {
      // TODO: Verificar senha do armeiro no Firebase
      // Por enquanto, aceitar qualquer senha
      
      await updateDoc(doc(db, 'livros_reserva_armamento', livroAtivo!.id), {
        status: 'fechado',
        dataFechamento: new Date(),
        alteracoes,
        totalCautelas: totalCautelasHoje,
        totalBaixas: totalBaixasHoje
      });
      
      setLivroAtivo(null);
      setPolicialSelecionado(null);
      setMateriaisSelecionados([]);
      
      toast({
        title: "Livro Diário Fechado",
        description: "O livro foi fechado e registrado no histórico.",
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao fechar livro:', error);
      return false;
    }
  };

  // Selecionar Policial
  const selecionarPolicial = (policial: Policial) => {
    setPolicialSelecionado(policial);
    setSearchPolicial('');
    toast({
      title: "Policial Selecionado",
      description: `${policial.NOME} foi selecionado para atendimento.`,
    });
  };

  // Adicionar Material
  const adicionarMaterial = (material: Material, quantidade: number = 1, carregadores?: number) => {
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
        quantidade,
        numeroSerie: material.numeroSerie,
        carregadores
      }]);
    }
    
    toast({
      title: "Material Adicionado",
      description: `${material.nome} foi adicionado à seleção.`,
    });
  };

  // Clique em material - verificar tipo para modal
  const handleClickMaterial = (material: Material) => {
    if (!policialSelecionado) {
      toast({
        title: "Atenção",
        description: "Selecione um policial primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    const categoriaNorm = material.categoria.toLowerCase();
    
    if (categoriaNorm.includes('munição') || categoriaNorm.includes('municao')) {
      setMaterialParaQuantidade(material);
      setTipoQuantidade('municao');
      setModalQuantidade(true);
    } else if (categoriaNorm.includes('arma')) {
      setMaterialParaQuantidade(material);
      setTipoQuantidade('arma');
      setModalQuantidade(true);
    } else {
      adicionarMaterial(material, 1);
    }
  };

  // Remover Material
  const removerMaterial = (materialId: string) => {
    setMateriaisSelecionados(prev => prev.filter(m => m.materialId !== materialId));
  };

  // Enviar para Confirmação
  const enviarParaConfirmacao = () => {
    if (!policialSelecionado || materiaisSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um policial e pelo menos um material.",
        variant: "destructive",
      });
      return;
    }
    
    setModalConfirmacao(true);
  };

  // Confirmar Cautela
  const handleConfirmarCautela = async () => {
    try {
      setLoading(true);
      
      if (!policialSelecionado) {
        toast({
          title: "Erro",
          description: "Nenhum policial selecionado.",
          variant: "destructive",
        });
        return;
      }

      if (materiaisSelecionados.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum material selecionado.",
          variant: "destructive",
        });
        return;
      }

      // Preparar materiais sem campos undefined
      const materiaisLimpos = materiaisSelecionados.map(m => ({
        materialId: m.materialId,
        nome: m.nome,
        categoria: m.categoria,
        quantidade: m.quantidade,
        ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
        ...(m.carregadores && { carregadores: m.carregadores })
      }));
      
      // Criar cautela provisória - sem campos undefined
      const cautelaData: Record<string, any> = {
        policialId: policialSelecionado.id,
        policialNome: policialSelecionado.NOME,
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        armeiroId,
        materiais: materiaisLimpos,
        dataCautela: new Date(),
        status: 'ativo'
      };

      // Só adiciona livroId se existir
      if (livroAtivo?.id) {
        cautelaData.livroId = livroAtivo.id;
      }

      await addDoc(collection(db, 'cautelas_provisorias'), cautelaData);
      
      // Marcar materiais como indisponíveis
      for (const material of materiaisSelecionados) {
        const materialRef = doc(db, 'materiais_belicos', material.materialId);
        const materialDoc = await getDoc(materialRef);
        
        if (materialDoc.exists()) {
          const materialData = materialDoc.data();
          const isMunicao = materialData?.categoria?.toLowerCase().includes('munição') || 
                           materialData?.categoria?.toLowerCase().includes('municao');
          
          if (isMunicao && materialData?.quantidade) {
            // Para munição, diminuir a quantidade
            const novaQuantidade = Math.max(0, (materialData.quantidade || 0) - material.quantidade);
            await updateDoc(materialRef, {
              quantidade: novaQuantidade,
              ...(novaQuantidade <= 0 && { disponivel: false })
            });
          } else {
            // Para armas e outros, marcar como indisponível
            await updateDoc(materialRef, {
              disponivel: false,
              cauteladoPara: policialSelecionado.id,
              dataCautela: new Date()
            });
          }
        }
      }
      
      // Registrar movimentação - sem campos undefined
      const movimentacaoData: Record<string, any> = {
        tipo: 'cautela',
        policialId: policialSelecionado.id,
        policialNome: policialSelecionado.NOME,
        materiais: materiaisLimpos,
        dataCautela: new Date()
      };

      if (livroAtivo?.id) {
        movimentacaoData.livroId = livroAtivo.id;
      }

      await addDoc(collection(db, 'movimentacoes_belicas'), movimentacaoData);
      
      // Atualizar contador e adicionar à lista de movimentações local
      const novaMovimentacao: MovimentacaoDia = {
        id: `temp_${Date.now()}`,
        tipo: 'cautela',
        policialNome: policialSelecionado.NOME,
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        postoGrad: policialSelecionado['Post/Grad'],
        materiais: materiaisLimpos.map(m => ({
          nome: m.nome,
          quantidade: m.quantidade,
          numeroSerie: m.numeroSerie,
          categoria: m.categoria
        })),
        dataCautela: new Date(),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sequencial: movimentacoesDoDia.length + 1
      };
      
      setMovimentacoesDoDia(prev => [...prev, novaMovimentacao]);
      setTotalCautelasHoje(prev => prev + 1);
      
      // Limpar seleção
      setMateriaisSelecionados([]);
      setPolicialSelecionado(null);
      
      toast({
        title: "Cautela Registrada",
        description: `Materiais cautelados para ${policialSelecionado.NOME} com sucesso.`,
      });
      
      // Recarregar materiais disponíveis
      carregarMateriaisDisponiveis();
      
    } catch (error) {
      console.error('Erro ao confirmar cautela:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar cautela. Verifique os dados.",
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

  // Mapear categoria para o filtro usando tipoArma do Firebase
  const mapearCategoria = (material: Material) => {
    const tipoArma = (material.tipoArma || '').toLowerCase();
    const categoria = (material.categoria || '').toLowerCase();
    
    // Priorizar tipoArma do Firebase
    if (tipoArma === 'arma curta' || tipoArma.includes('curta')) return 'arma_curta';
    if (tipoArma === 'arma longa' || tipoArma.includes('longa')) return 'arma_longa';
    
    // Fallback para categoria
    if (categoria.includes('munição') || categoria.includes('municao')) return 'municao';
    if (categoria.includes('epi') || categoria.includes('colete')) return 'epi';
    if (categoria.includes('arma curta') || categoria.includes('pistola') || categoria.includes('revolver')) return 'arma_curta';
    if (categoria.includes('arma longa') || categoria.includes('fuzil') || categoria.includes('espingarda')) return 'arma_longa';
    
    return 'acessorio';
  };

  const materiaisFiltrados = materiaisDisponiveis.filter(m => {
    const matchCategoria = mapearCategoria(m) === categoriaAtiva;
    const searchLower = searchMaterial.toLowerCase();
    const matchSearch = m.nome.toLowerCase().includes(searchLower) ||
                       (m.categoria || '').toLowerCase().includes(searchLower) ||
                       (m.numeroSerie || '').toLowerCase().includes(searchLower);
    return matchCategoria && (searchMaterial === '' || matchSearch);
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Controle do Livro Diário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {livroAtivo ? (
              <BookOpen className="h-5 w-5 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 text-red-500" />
            )}
            Controle do Livro Diário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant={livroAtivo ? "default" : "secondary"} className="text-sm">
              {livroAtivo ? "ABERTO" : "FECHADO"}
            </Badge>
            
            {livroAtivo && (
              <span className="text-sm text-muted-foreground">
                Aberto às {livroAtivo.dataAbertura.toLocaleTimeString('pt-BR')} por {livroAtivo.armeiroNome}
              </span>
            )}
            
            {!livroAtivo ? (
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
                onClick={() => setModalFechamento(true)}
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

      {livroAtivo && (
        <>
          {/* Dashboard de Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Cautelas Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalCautelasHoje}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                  Baixas Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalBaixasHoje}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Policiais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{policiais.length}</div>
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
                <div className="text-2xl font-bold">{materiaisDisponiveis.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Visual do Livro de Cautela */}
          <LivroCautelaDia 
            movimentacoes={movimentacoesDoDia}
            dataAbertura={livroAtivo.dataAbertura}
            armeiroNome={livroAtivo.armeiroNome}
          />

          {/* Tabs de Navegação */}
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cautela" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Cautela</span>
              </TabsTrigger>
              <TabsTrigger value="baixa" className="flex items-center gap-1">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Baixa</span>
              </TabsTrigger>
              <TabsTrigger value="rua" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Na Rua</span>
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Cautela */}
            <TabsContent value="cautela" className="space-y-6">
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
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-foreground">
                                {policialSelecionado.NOME}
                              </div>
                              <div className="text-sm text-muted-foreground">
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

                {/* Painel de Materiais por Categoria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Materiais Disponíveis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Tabs de Categoria */}
                      <Tabs value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
                        <TabsList className="grid grid-cols-5 h-auto">
                          {CATEGORIAS.map((cat) => (
                            <TabsTrigger 
                              key={cat.id} 
                              value={cat.id}
                              className="text-xs px-2 py-1.5"
                            >
                              <cat.icon className="h-3 w-3 mr-1" />
                              <span className="hidden md:inline">{cat.label}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>

                      {/* Busca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome ou nº série..."
                          value={searchMaterial}
                          onChange={(e) => setSearchMaterial(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Lista de Materiais */}
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {materiaisFiltrados.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            Nenhum material disponível nesta categoria
                          </div>
                        ) : (
                          materiaisFiltrados.map((material) => (
                            <div
                              key={material.id}
                              className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                              onClick={() => handleClickMaterial(material)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">{material.nome}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {material.numeroSerie && `Série: ${material.numeroSerie}`}
                                    {material.calibre && ` - Calibre: ${material.calibre}`}
                                    {material.quantidade && ` - Estoque: ${material.quantidade}`}
                                  </div>
                                </div>
                                <Plus className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                          ))
                        )}
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
                      Materiais Selecionados ({materiaisSelecionados.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {materiaisSelecionados.map((material) => (
                        <div 
                          key={material.materialId} 
                          className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-foreground">{material.nome}</span>
                            <div className="text-sm text-muted-foreground">
                              Qtd: {material.quantidade}
                              {material.carregadores && ` | ${material.carregadores} carregadores`}
                              {material.numeroSerie && ` | Série: ${material.numeroSerie}`}
                            </div>
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
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enviar para Confirmação do Policial
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Baixa */}
            <TabsContent value="baixa">
              <BaixaMaterialSection 
                livroId={livroAtivo?.id || ''} 
                onBaixaRealizada={() => {
                  // Recarregar movimentações do dia para incluir a baixa
                  if (livroAtivo?.id) {
                    carregarMovimentacoesDoDia(livroAtivo.id);
                  }
                  carregarMateriaisDisponiveis();
                }}
              />
            </TabsContent>

            {/* Tab Material na Rua */}
            <TabsContent value="rua">
              <MaterialNaRuaSection />
            </TabsContent>

            {/* Tab Histórico */}
            <TabsContent value="historico">
              <HistoricoLivrosSection />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Modais */}
      {policialSelecionado && (
        <ModalConfirmacaoPolicial
          open={modalConfirmacao}
          onClose={() => setModalConfirmacao(false)}
          policial={policialSelecionado}
          materiais={materiaisSelecionados}
          onConfirmar={handleConfirmarCautela}
        />
      )}

      <ModalQuantidadeMaterial
        open={modalQuantidade}
        onClose={() => {
          setModalQuantidade(false);
          setMaterialParaQuantidade(null);
        }}
        material={materialParaQuantidade}
        tipo={tipoQuantidade}
        onConfirmar={(quantidade, carregadores) => {
          if (materialParaQuantidade) {
            adicionarMaterial(materialParaQuantidade, quantidade, carregadores);
          }
        }}
      />

      {livroAtivo && (
        <ModalFechamentoLivro
          open={modalFechamento}
          onClose={() => setModalFechamento(false)}
          armeiroNome={armeiroNome}
          onFechar={handleFecharLivro}
        />
      )}
    </div>
  );
};

export default ArmeiroInterface;
