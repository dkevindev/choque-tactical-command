import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, User, Clock, Package, BookOpen, Target, Plus, Minus, 
  CheckCircle, AlertCircle, Lock, Shield, Crosshair, MapPin, 
  History, RotateCcw, Monitor 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  doc, getDocs, orderBy, getDoc, deleteDoc 
} from 'firebase/firestore';
import { db } from '@/firebase';
import ModalConfirmacaoPolicial from './ModalConfirmacaoPolicial';
import ModalQuantidadeMaterial from './ModalQuantidadeMaterial';
import ModalFechamentoLivro from './ModalFechamentoLivro';
import ModalAguardandoConfirmacao from './ModalAguardandoConfirmacao';
import BaixaMaterialSection from './BaixaMaterialSection';
import HistoricoLivrosSection from './HistoricoLivrosSection';
import MaterialNaRuaSection from './MaterialNaRuaSection';
import PendenciasAnterioresSection from './PendenciasAnterioresSection';
import LivroCautelaDia from './LivroCautelaDia';
import ConsultaMaterialPolicial from '@/components/consultas/ConsultaMaterialPolicial';

interface Policial {
  id: string;
  'Matrícula': string | number;
  NOME: string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  NUMERAL?: number;
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
  modelo?: string;
  observacoes?: string;
}

interface MaterialSelecionado {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
  carregadores?: number;
  modelo?: string;
  fabricante?: string;
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
  cautelaId?: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula?: string;
  policialNumeral?: number;
  postoGrad?: string;
  materiais: Array<{
    nome: string;
    quantidade: number;
    numeroSerie?: string;
    categoria?: string;
  }>;
  dataCautela: Date;
  horaCautela: string;
  dataBaixa?: Date;
  horaBaixa?: string;
  recebidoPorNome?: string;
  status: 'pendente' | 'entregue';
  sequencial: number;
}

const CATEGORIAS = [
  { id: 'serie', label: 'Nº Série', icon: Search },
  { id: 'municao', label: 'Munição', icon: Package },
  { id: 'epi', label: 'EPI', icon: Shield },
  { id: 'acessorio', label: 'Acessórios', icon: Plus }
];

const ArmeiroInterface = () => {
  const [livroAtivo, setLivroAtivo] = useState<LivroAtivo | null>(null);
  const [policialLogado, setPolicialLogado] = useState<Policial | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<MaterialSelecionado[]>([]);
  const [searchPolicial, setSearchPolicial] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState("serie");
  
  // Modais
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [modalQuantidade, setModalQuantidade] = useState(false);
  const [modalFechamento, setModalFechamento] = useState(false);
  const [modalAguardando, setModalAguardando] = useState(false);
  const [cautelaAguardandoId, setCautelaAguardandoId] = useState<string | null>(null);
  const [policialAguardandoId, setPolicialAguardandoId] = useState<string | null>(null);
  const [policialAguardandoNome, setPolicialAguardandoNome] = useState("");
  const [materiaisAguardando, setMateriaisAguardando] = useState<MaterialSelecionado[]>([]);
  const [materialParaQuantidade, setMaterialParaQuantidade] = useState<Material | null>(null);
  const [tipoQuantidade, setTipoQuantidade] = useState<'municao' | 'arma'>('municao');
  
  // Estatísticas
  const [totalCautelasHoje, setTotalCautelasHoje] = useState(0);
  const [totalBaixasHoje, setTotalBaixasHoje] = useState(0);
  
  // Movimentações do dia (para tabela visual)
  const [movimentacoesDoDia, setMovimentacoesDoDia] = useState<MovimentacaoDia[]>([]);
  
  // Tab ativa
  const [tabAtiva, setTabAtiva] = useState("livro");
  
  const { toast } = useToast();

  // Carregar movimentações do dia do Firebase
  const carregarMovimentacoesDoDia = useCallback(async (livroId: string) => {
    try {
      // Carregar cautelas do livro
      const cautelasSnapshot = await getDocs(
        query(collection(db, 'cautelas_provisorias'), where('livroId', '==', livroId))
      );
      
      // Carregar movimentações de baixa do livro
      const baixasSnapshot = await getDocs(
        query(collection(db, 'movimentacoes_belicas'), where('livroId', '==', livroId), where('tipo', '==', 'baixa'))
      );
      
      // Criar mapa de baixas por cautelaId para vincular
      const baixasPorCautela = new Map<string, { dataBaixa: Date; horaBaixa: string }>();
      baixasSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.cautelaId) {
          const dataBaixa = data.dataBaixa?.toDate?.() || new Date();
          baixasPorCautela.set(data.cautelaId, {
            dataBaixa,
            horaBaixa: data.horaBaixa || dataBaixa.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        }
      });
      
      // Mapa para agrupar cautelas do mesmo policial, status e horário
      const gruposMap = new Map<string, MovimentacaoDia>();
      
      // Processar cautelas
      for (const docSnap of cautelasSnapshot.docs) {
        const data = docSnap.data();
        const dataCautela = data.dataCautela?.toDate?.() || new Date();
        const horaCautela = data.horaCautela || dataCautela.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Verificar se existe baixa para esta cautela
        const baixaInfo = baixasPorCautela.get(docSnap.id);
        // Priorizar o status explícito da cautela sobre a inferência do baixaInfo
        let status: 'pendente' | 'entregue';
        if (data.status === 'entregue') {
          status = 'entregue';
        } else if (data.status === 'pendente') {
          status = 'pendente';
        } else if (data.status === 'baixado' || baixaInfo) {
          status = 'entregue';
        } else {
          status = 'pendente';
        }
        
        // Buscar dados completos do policial se necessário
        let nomeGuerra = data.policialNomeGuerra;
        let numeral = data.policialNumeral;
        let postoGrad = data.postoGrad;
        
        if (!nomeGuerra && data.policialId) {
          try {
            const policialDoc = await getDoc(doc(db, 'policiais', data.policialId));
            if (policialDoc.exists()) {
              const policialData = policialDoc.data();
              nomeGuerra = policialData['NOME DE GUERRA1'] || policialData['NOME DE GUERRA'];
              numeral = policialData['NUMERAL'];
              postoGrad = postoGrad || policialData['Post/Grad'];
            }
          } catch (e) {
            console.error('Erro ao buscar policial:', e);
          }
        }
        
        // Chave de agrupamento: policial + status + horário de cautela
        // Isso agrupa itens do mesmo policial, mesmo status (pendente ou entregue) e mesmo horário
        const groupKey = `${data.policialId}_${status}_${horaCautela}`;
        
        const existingGroup = gruposMap.get(groupKey);
        
        if (existingGroup) {
          // Adicionar materiais ao grupo existente
          const materiaisAtuais = data.materiais || [];
          materiaisAtuais.forEach((mat: any) => {
            // Verificar se o material já existe no grupo (por nome e série)
            const existingMat = existingGroup.materiais.find(
              m => m.nome === mat.nome && m.numeroSerie === mat.numeroSerie
            );
            if (existingMat) {
              // Somar quantidade
              existingMat.quantidade += mat.quantidade || 1;
            } else {
              existingGroup.materiais.push({
                nome: mat.nome,
                quantidade: mat.quantidade || 1,
                numeroSerie: mat.numeroSerie,
                categoria: mat.categoria
              });
            }
          });
          
          // Atualizar data de baixa se for mais recente
          if (status === 'entregue') {
            const novaBaixa = baixaInfo?.dataBaixa || data.dataBaixa?.toDate?.();
            if (novaBaixa && existingGroup.dataBaixa && novaBaixa > existingGroup.dataBaixa) {
              existingGroup.dataBaixa = novaBaixa;
              existingGroup.horaBaixa = baixaInfo?.horaBaixa || data.horaBaixa;
            } else if (novaBaixa && !existingGroup.dataBaixa) {
              existingGroup.dataBaixa = novaBaixa;
              existingGroup.horaBaixa = baixaInfo?.horaBaixa || data.horaBaixa;
            }
            if (data.recebidoPorNome) {
              existingGroup.recebidoPorNome = data.recebidoPorNome;
            }
          }
        } else {
          // Criar novo grupo
          gruposMap.set(groupKey, {
            id: docSnap.id,
            cautelaId: docSnap.id,
            policialNome: data.policialNome || '',
            policialNomeGuerra: nomeGuerra,
            policialMatricula: data.policialMatricula,
            policialNumeral: numeral,
            postoGrad: postoGrad,
            materiais: (data.materiais || []).map((mat: any) => ({
              nome: mat.nome,
              quantidade: mat.quantidade || 1,
              numeroSerie: mat.numeroSerie,
              categoria: mat.categoria
            })),
            dataCautela,
            horaCautela,
            dataBaixa: status === 'entregue' ? (baixaInfo?.dataBaixa || data.dataBaixa?.toDate?.()) : undefined,
            horaBaixa: status === 'entregue' ? (baixaInfo?.horaBaixa || data.horaBaixa) : undefined,
            recebidoPorNome: status === 'entregue' ? data.recebidoPorNome : undefined,
            status,
            sequencial: 0
          });
        }
      }
      
      // Converter mapa em array
      const movimentacoes = Array.from(gruposMap.values());
      
      // Ordenar por data e atribuir sequencial
      movimentacoes.sort((a, b) => {
        return a.dataCautela.getTime() - b.dataCautela.getTime();
      });
      
      movimentacoes.forEach((mov, idx) => {
        mov.sequencial = idx + 1;
      });
      
      setMovimentacoesDoDia(movimentacoes);
      
      // Atualizar contadores
      setTotalCautelasHoje(movimentacoes.length);
      setTotalBaixasHoje(movimentacoes.filter(m => m.status === 'entregue').length);
      
    } catch (error) {
      console.error('Erro ao carregar movimentações do dia:', error);
    }
  }, []);

  // Carregar policial logado e verificar livro ativo ao carregar
  useEffect(() => {
    const carregarPolicialLogado = async () => {
      const userStorage = localStorage.getItem('user');
      if (userStorage) {
        try {
          const userData = JSON.parse(userStorage);
          const docRef = doc(db, 'policiais', userData.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setPolicialLogado({
              id: docSnap.id,
              'Matrícula': data['Matrícula'],
              NOME: data.NOME,
              'NOME DE GUERRA': data['NOME DE GUERRA'],
              'NOME DE GUERRA1': data['NOME DE GUERRA1'],
              NUMERAL: data.NUMERAL,
              'Post/Grad': data['Post/Grad'],
              'SITUAÇÃO': data['SITUAÇÃO'],
              senha: data.senha
            });
          }
        } catch (e) {
          console.error('Erro ao carregar policial logado:', e);
        }
      }
    };

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

    // Verificar cautelas aguardando confirmação (para recuperar modal ao reabrir página)
    const verificarCautelasAguardando = async () => {
      try {
        const cautelasAguardandoSnapshot = await getDocs(
          query(
            collection(db, 'cautelas_provisorias'),
            where('status', '==', 'aguardando_confirmacao')
          )
        );

        if (!cautelasAguardandoSnapshot.empty) {
          // Pegar a primeira cautela aguardando
          const cautelaDoc = cautelasAguardandoSnapshot.docs[0];
          const cautelaData = cautelaDoc.data();
          
          console.log('[Armeiro] Recuperando cautela aguardando confirmação:', cautelaDoc.id);
          
          // Recuperar dados para reabrir o modal
          const nomePolicial = `${cautelaData.postoGrad || ''} ${cautelaData.policialNomeGuerra || cautelaData.policialNome}`.trim();
          
          setCautelaAguardandoId(cautelaDoc.id);
          setPolicialAguardandoId(cautelaData.policialId);
          setPolicialAguardandoNome(nomePolicial);
          setMateriaisAguardando(cautelaData.materiais || []);
          
          // Reabrir modal de aguardando
          setModalAguardando(true);
        }
      } catch (error) {
        console.error('Erro ao verificar cautelas aguardando:', error);
      }
    };
    
    carregarPolicialLogado();
    verificarLivroAtivo();
    verificarCautelasAguardando();
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
    if (!policialLogado) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário logado.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const armeiroNome = policialLogado['NOME DE GUERRA1'] || policialLogado['NOME DE GUERRA'] || policialLogado.NOME;
      const armeiroId = policialLogado.id;
      
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
      
      // Limpar movimentações do dia anterior ao abrir novo livro
      setMovimentacoesDoDia([]);
      
      toast({
        title: "Livro Diário Aberto",
        description: `Livro aberto por ${armeiroNome}.`,
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
      // Buscar cautelas pendentes do livro
      const cautelasPendentesSnapshot = await getDocs(
        query(
          collection(db, 'cautelas_provisorias'),
          where('livroId', '==', livroAtivo!.id),
          where('status', '==', 'pendente')
        )
      );

      // Buscar alterações automáticas do livro (ex: faltas de munição)
      const livroDoc = await getDoc(doc(db, 'livros_reserva_armamento', livroAtivo!.id));
      const livroData = livroDoc.data();
      const alteracoesAutomaticas = livroData?.alteracoesAutomaticas || [];

      // Criar alertas para materiais pendentes
      if (cautelasPendentesSnapshot.size > 0) {
        for (const cautelaDoc of cautelasPendentesSnapshot.docs) {
          const cautelaData = cautelaDoc.data();
          const materiaisNomes = cautelaData.materiais?.map((m: any) => m.nome).join(', ') || 'Material não especificado';
          
          await addDoc(collection(db, 'alertas_gestao'), {
            tipo: 'material_pendente',
            dataHora: new Date(),
            policialId: cautelaData.policialId,
            policialNome: cautelaData.policialNome,
            policialNomeGuerra: cautelaData.policialNomeGuerra,
            armeiroNome: livroAtivo!.armeiroNome,
            materialNome: materiaisNomes,
            materiais: cautelaData.materiais,
            livroId: livroAtivo!.id,
            cautelaId: cautelaDoc.id,
            lido: false
          });
        }
      }

      // Combinar alterações manuais + automáticas
      const todasAlteracoes = [...alteracoesAutomaticas, ...alteracoes];

      // Criar alertas para observações/alterações do livro (manuais e automáticas)
      if (todasAlteracoes && todasAlteracoes.length > 0) {
        for (const alteracao of todasAlteracoes) {
          await addDoc(collection(db, 'alertas_gestao'), {
            tipo: alteracao.tipo || 'observacao_livro',
            dataHora: new Date(),
            observacao: alteracao.descricao,
            armeiroNome: livroAtivo!.armeiroNome,
            livroId: livroAtivo!.id,
            lido: false
          });
        }
      }
      
      await updateDoc(doc(db, 'livros_reserva_armamento', livroAtivo!.id), {
        status: 'fechado',
        dataFechamento: new Date(),
        alteracoes,
        totalCautelas: totalCautelasHoje,
        totalBaixas: totalBaixasHoje,
        materiaisPendentes: cautelasPendentesSnapshot.size
      });
      
      setLivroAtivo(null);
      setPolicialSelecionado(null);
      setMateriaisSelecionados([]);
      
      toast({
        title: "Livro Diário Fechado",
        description: cautelasPendentesSnapshot.size > 0 
          ? `Livro fechado. ${cautelasPendentesSnapshot.size} material(is) pendente(s) registrado(s) como alerta.`
          : "O livro foi fechado e registrado no histórico.",
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
        carregadores,
        modelo: material.modelo,
        fabricante: material.fabricante
      }]);
    }
    
    toast({
      title: "Material Adicionado",
      description: `${material.nome} foi adicionado à seleção.`,
    });
    
    // Limpar campo de busca e focar novamente
    setSearchMaterial('');
    setTimeout(() => {
      const searchInput = document.getElementById('search-material-input');
      searchInput?.focus();
    }, 100);
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

  // Enviar para Confirmação - Salvar com status aguardando_confirmacao
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
      
      // Preparar materiais sem campos undefined
      const materiaisLimpos = materiaisSelecionados.map(m => ({
        materialId: m.materialId,
        nome: m.nome,
        categoria: m.categoria,
        quantidade: m.quantidade,
        ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
        ...(m.carregadores && { carregadores: m.carregadores }),
        ...(m.modelo && { modelo: m.modelo }),
        ...(m.fabricante && { fabricante: m.fabricante })
      }));
      
      const agora = new Date();
      const horaCautela = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const nomeGuerra = policialSelecionado['NOME DE GUERRA1'] || policialSelecionado['NOME DE GUERRA'] || '';
      const numeral = policialSelecionado.NUMERAL;
      
      // Criar cautela com status aguardando_confirmacao
      const cautelaData: Record<string, any> = {
        policialId: policialSelecionado.id,
        policialNome: policialSelecionado.NOME,
        policialNomeGuerra: nomeGuerra,
        policialNumeral: numeral,
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        postoGrad: policialSelecionado['Post/Grad'],
        armeiroId: policialLogado?.id || livroAtivo?.armeiroId,
        materiais: materiaisLimpos,
        dataCautela: agora,
        horaCautela,
        status: 'aguardando_confirmacao', // Status para tela externa
        sequencial: movimentacoesDoDia.length + 1
      };

      if (livroAtivo?.id) {
        cautelaData.livroId = livroAtivo.id;
      }

      const cautelaRef = await addDoc(collection(db, 'cautelas_provisorias'), cautelaData);
      
      // Guardar informações para o modal de aguardando
      const nomePolicial = `${policialSelecionado['Post/Grad'] || ''} ${nomeGuerra || policialSelecionado.NOME}`.trim();
      setCautelaAguardandoId(cautelaRef.id);
      setPolicialAguardandoId(policialSelecionado.id);
      setPolicialAguardandoNome(nomePolicial);
      setMateriaisAguardando(materiaisLimpos);
      
      // Limpar seleção
      setMateriaisSelecionados([]);
      setPolicialSelecionado(null);
      
      // Abrir modal de aguardando
      setModalAguardando(true);
      
    } catch (error) {
      console.error('Erro ao enviar para confirmação:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar para confirmação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Callback quando policial confirmar recebimento
  const handleConfirmacaoRecebida = () => {
    toast({
      title: "✅ Material Recebido",
      description: `${policialAguardandoNome} confirmou o recebimento.`,
    });
    
    // Recarregar movimentações do dia
    if (livroAtivo?.id) {
      carregarMovimentacoesDoDia(livroAtivo.id);
    }
    carregarMateriaisDisponiveis();
    
    // Limpar estados do modal
    setCautelaAguardandoId(null);
    setPolicialAguardandoNome("");
  };

  // Cancelar cautela pendente
  const handleCancelarCautela = async () => {
    if (!cautelaAguardandoId) return;
    
    try {
      // Deletar a cautela provisória
      await deleteDoc(doc(db, 'cautelas_provisorias', cautelaAguardandoId));
      
      // Fechar modal e limpar estados
      setModalAguardando(false);
      setCautelaAguardandoId(null);
      setPolicialAguardandoNome("");
      
      toast({
        title: "Cautela Cancelada",
        description: "A cautela foi cancelada.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Erro ao cancelar cautela:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar cautela.",
        variant: "destructive"
      });
    }
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
      
      const agora = new Date();
      const horaCautela = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const nomeGuerra = policialSelecionado['NOME DE GUERRA1'] || policialSelecionado['NOME DE GUERRA'] || '';
      const numeral = policialSelecionado.NUMERAL;
      
      // Calcular sequencial baseado nas cautelas existentes do livro
      const sequencial = movimentacoesDoDia.length + 1;
      
      // Criar cautela provisória - sem campos undefined
      const cautelaData: Record<string, any> = {
        policialId: policialSelecionado.id,
        policialNome: policialSelecionado.NOME,
        policialNomeGuerra: nomeGuerra,
        policialNumeral: numeral,
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        postoGrad: policialSelecionado['Post/Grad'],
        armeiroId: policialLogado?.id || livroAtivo?.armeiroId,
        materiais: materiaisLimpos,
        dataCautela: agora,
        horaCautela,
        status: 'pendente',
        sequencial
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
        cautelaId: `temp_${Date.now()}`,
        policialNome: policialSelecionado.NOME,
        policialNomeGuerra: nomeGuerra,
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        policialNumeral: numeral,
        postoGrad: policialSelecionado['Post/Grad'],
        materiais: materiaisLimpos.map(m => ({
          nome: m.nome,
          quantidade: m.quantidade,
          numeroSerie: m.numeroSerie,
          categoria: m.categoria
        })),
        dataCautela: agora,
        horaCautela,
        status: 'pendente',
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
    const nomeGuerraMatch = (p['NOME DE GUERRA1']?.toLowerCase() || '').includes(filtroLower);
    const matriculaMatch = String(p['Matrícula'] || '').includes(searchPolicial);
    const numeralMatch = String(p.NUMERAL || '').includes(searchPolicial);
    return nomeMatch || nomeGuerraMatch || matriculaMatch || numeralMatch;
  });

  // Mapear categoria para o filtro usando tipoArma do Firebase
  const mapearCategoria = (material: Material) => {
    const categoria = (material.categoria || '').toLowerCase();
    
    // Verificar primeiro pela categoria do material (prioridade)
    if (categoria.includes('munição') || categoria.includes('municao')) return 'municao';
    
    // Coletes balísticos vão para aba de número de série (junto com armas)
    if (categoria.includes('colete')) return 'serie';
    
    // EPI (exceto coletes)
    if (categoria.includes('epi')) return 'epi';
    if (categoria.includes('acessório') || categoria.includes('acessorio')) return 'acessorio';
    
    // Materiais com número de série (armas) vão para a aba "serie"
    if (material.numeroSerie) return 'serie';
    
    return 'acessorio';
  };

  const materiaisFiltrados = materiaisDisponiveis.filter(m => {
    const categoriaDoMaterial = mapearCategoria(m);
    
    // Se categoria ativa é "serie", mostrar todos com número de série
    if (categoriaAtiva === 'serie') {
      const temSerie = !!m.numeroSerie;
      const searchLower = searchMaterial.toLowerCase();
      const matchSearch = m.nome.toLowerCase().includes(searchLower) ||
                         (m.numeroSerie || '').toLowerCase().includes(searchLower);
      return temSerie && (searchMaterial === '' || matchSearch);
    }
    
    // Para outras categorias
    const matchCategoria = categoriaDoMaterial === categoriaAtiva;
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
                Aberto às {livroAtivo.dataAbertura.toLocaleTimeString('pt-BR')} por Armeiro: {livroAtivo.armeiroNome}
              </span>
            )}
            
            {!livroAtivo ? (
              <Button 
                onClick={abrirLivroDiario}
                disabled={loading || !policialLogado}
                className="bg-green-600 hover:bg-green-700"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Abrir Livro Diário
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => setModalFechamento(true)}
                  disabled={loading}
                  variant="destructive"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Fechar Livro Diário
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open('/reserva-armamento/totem', '_blank')}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Abrir Totem
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>


      {livroAtivo && (
        <>
          {/* Pendências de Turnos Anteriores */}
          <PendenciasAnterioresSection 
            livroAtualId={livroAtivo.id}
            onRecebimentoRealizado={() => {
              if (livroAtivo?.id) {
                carregarMovimentacoesDoDia(livroAtivo.id);
              }
              carregarMateriaisDisponiveis();
            }}
          />

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

          {/* Tabs de Navegação */}
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="livro" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Livro do Dia</span>
              </TabsTrigger>
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
              <TabsTrigger value="consultas" className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Consultas</span>
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
                                {policialSelecionado['NOME DE GUERRA1'] || policialSelecionado['NOME DE GUERRA'] || policialSelecionado.NOME}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Numeral: {policialSelecionado.NUMERAL || '-'} - Mat: {policialSelecionado['Matrícula']}
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
                              <div className="font-semibold">{policial['NOME DE GUERRA1'] || policial['NOME DE GUERRA'] || policial.NOME}</div>
                              <div className="text-sm text-muted-foreground">
                                Numeral: {policial.NUMERAL || '-'} - Mat: {policial['Matrícula']}
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
                        <TabsList className="grid grid-cols-4 h-auto">
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
                          id="search-material-input"
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
                                  <div className="font-medium">
                                    {material.nome}
                                    {material.modelo && ` ${material.modelo}`}
                                    {material.fabricante && ` ${material.fabricante}`}
                                  </div>
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
                            <span className="font-medium text-foreground">
                              {material.nome}
                              {material.modelo && ` ${material.modelo}`}
                              {material.fabricante && ` ${material.fabricante}`}
                            </span>
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

            {/* Tab Livro do Dia */}
            <TabsContent value="livro">
              <LivroCautelaDia 
                movimentacoes={movimentacoesDoDia}
                dataAbertura={livroAtivo.dataAbertura}
                armeiroNome={livroAtivo.armeiroNome}
              />
            </TabsContent>

            {/* Tab Histórico */}
            <TabsContent value="historico">
              <HistoricoLivrosSection />
            </TabsContent>

            {/* Tab Consultas */}
            <TabsContent value="consultas">
              <ConsultaMaterialPolicial />
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
          armeiroNome={livroAtivo.armeiroNome}
          onFechar={handleFecharLivro}
        />
      )}

      {/* Modal de Aguardando Confirmação */}
      {cautelaAguardandoId && policialAguardandoId && (
        <ModalAguardandoConfirmacao
          open={modalAguardando}
          onClose={() => setModalAguardando(false)}
          cautelaId={cautelaAguardandoId}
          policialId={policialAguardandoId}
          policialNome={policialAguardandoNome}
          materiais={materiaisAguardando}
          onConfirmado={handleConfirmacaoRecebida}
          onCancelar={handleCancelarCautela}
        />
      )}
    </div>
  );
};

export default ArmeiroInterface;
