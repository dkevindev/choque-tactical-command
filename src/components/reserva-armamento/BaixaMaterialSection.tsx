import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Package, CheckCircle, RotateCcw, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import ModalDevolucaoMunicao from './ModalDevolucaoMunicao';
import ModalTransferenciaMaterial from './ModalTransferenciaMaterial';

interface MaterialCautela {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface CautelaProvisoria {
  id: string;
  livroId: string;
  policialId: string;
  policialNome: string;
  policialMatricula: string;
  policialNomeGuerra?: string;
  policialNumeral?: number;
  postoGrad?: string;
  armeiroId: string;
  materiais: MaterialCautela[];
  dataCautela: Date;
  horaCautela?: string;
  dataBaixa?: Date;
  status: 'pendente' | 'entregue';
}

interface Policial {
  id: string;
  NOME: string;
  'Matrícula': string | number;
  'Post/Grad': string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
}

interface BaixaMaterialSectionProps {
  livroId: string;
  onBaixaRealizada: () => void;
}

const BaixaMaterialSection = ({ livroId, onBaixaRealizada }: BaixaMaterialSectionProps) => {
  const [search, setSearch] = useState('');
  const [policiaisComCautela, setPoliciaisComCautela] = useState<Policial[]>([]);
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [cautelasAtivas, setCautelasAtivas] = useState<CautelaProvisoria[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal de devolução de munição
  const [modalMunicao, setModalMunicao] = useState(false);
  const [materialMunicao, setMaterialMunicao] = useState<MaterialCautela | null>(null);
  const [cautelaMunicao, setCautelaMunicao] = useState<CautelaProvisoria | null>(null);
  
  // Modal de transferência
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [cautelaTransferencia, setCautelaTransferencia] = useState<CautelaProvisoria | null>(null);
  
  const { toast } = useToast();

  // Função para obter próximo sequencial do livro
  const obterProximoSequencial = async (livroIdParam: string): Promise<number> => {
    const cautelasSnapshot = await getDocs(
      query(
        collection(db, 'cautelas_provisorias'),
        where('livroId', '==', livroIdParam)
      )
    );
    
    let maiorSequencial = 0;
    cautelasSnapshot.forEach(docSnapshot => {
      const seq = docSnapshot.data().sequencial || 0;
      if (seq > maiorSequencial) maiorSequencial = seq;
    });
    
    return maiorSequencial + 1;
  };

  // Função reutilizável para carregar policiais com cautela
  const recarregarPoliciaisComCautela = async () => {
    try {
      console.log('[BaixaMaterial] Recarregando lista de policiais...');
      const querySnapshot = await getDocs(
        query(collection(db, 'cautelas_provisorias'), where('status', '==', 'pendente'))
      );
      
      console.log('[BaixaMaterial] Cautelas encontradas:', querySnapshot.size);
      
      const cautelasData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          dataCautela: data.dataCautela?.toDate?.() || new Date()
        } as CautelaProvisoria;
      });

      // Extrair policiais únicos
      const policialIds = [...new Set(cautelasData.map(c => c.policialId))];
      console.log('[BaixaMaterial] IDs de policiais com cautela:', policialIds);
      
      // Carregar dados dos policiais
      const policiaisData: Policial[] = [];
      for (const policialId of policialIds) {
        const policialDoc = await getDoc(doc(db, 'policiais', policialId));
        if (policialDoc.exists()) {
          policiaisData.push({
            id: policialDoc.id,
            ...policialDoc.data()
          } as Policial);
        }
      }
      
      console.log('[BaixaMaterial] Lista atualizada:', policiaisData.length, 'policiais');
      setPoliciaisComCautela(policiaisData);
    } catch (error) {
      console.error('[BaixaMaterial] Erro ao recarregar:', error);
    }
  };

  // Carregar policiais com cautela ativa
  useEffect(() => {
    recarregarPoliciaisComCautela();
  }, []);

  // Carregar cautelas do policial selecionado
  useEffect(() => {
    if (!policialSelecionado) {
      setCautelasAtivas([]);
      return;
    }

    const carregarCautelas = async () => {
      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, 'cautelas_provisorias'),
            where('policialId', '==', policialSelecionado.id),
            where('status', '==', 'pendente')
          )
        );
        
        const cautelasData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataCautela: doc.data().dataCautela?.toDate?.() || new Date()
        } as CautelaProvisoria));

        setCautelasAtivas(cautelasData);
      } catch (error) {
        console.error('Erro ao carregar cautelas:', error);
      }
    };

    carregarCautelas();
  }, [policialSelecionado]);

  const toggleMaterial = (materialId: string) => {
    setMateriaisSelecionados(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  // Verificar se material é munição
  const isMunicao = (material: MaterialCautela) => {
    return material.categoria?.toLowerCase().includes('munição') || 
           material.categoria?.toLowerCase().includes('municao');
  };

  // Verificar se material precisa informar quantidade (munição ou EPI com quantidade > 1)
  const precisaQuantidade = (material: MaterialCautela) => {
    const ehMunicao = isMunicao(material);
    const ehEpiComQuantidade = material.categoria?.toLowerCase() === 'epi' && material.quantidade > 1;
    return ehMunicao || ehEpiComQuantidade;
  };

  // Quando clica no checkbox de material
  const handleClickMaterial = (material: MaterialCautela, cautela: CautelaProvisoria) => {
    if (precisaQuantidade(material)) {
      // Abrir modal de quantidade
      setMaterialMunicao(material);
      setCautelaMunicao(cautela);
      setModalMunicao(true);
    } else {
      toggleMaterial(material.materialId);
    }
  };

  // Confirmar devolução de munição
  const handleConfirmarMunicao = async (
    quantidadeDevolvida: number, 
    quantidadeFaltante: number, 
    motivoFalta?: string
  ) => {
    if (!materialMunicao || !cautelaMunicao || !policialSelecionado) return;

    try {
      setLoading(true);
      const agora = new Date();
      const horaBaixa = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Buscar nome do armeiro atual
      const userStorage = localStorage.getItem('user');
      let armeiroNome = 'Armeiro';
      if (userStorage) {
        const userData = JSON.parse(userStorage);
        if (!userData?.id) { toast({ title: "Erro", description: "ID do armeiro não encontrado." }); return; }
        const armeiroDoc = await getDoc(doc(db, 'policiais', userData.id));
        if (armeiroDoc.exists()) {
          const armeiroData = armeiroDoc.data();
          armeiroNome = armeiroData['NOME DE GUERRA1'] || armeiroData['NOME DE GUERRA'] || armeiroData.NOME;
        }
      }

      // Devolver munição ao estoque
      if (!materialMunicao.materialId) { toast({ title: "Erro", description: "ID do material não encontrado." }); return; }
      const materialRef = doc(db, 'materiais_belicos', materialMunicao.materialId);
      const materialDoc = await getDoc(materialRef);
      
      if (materialDoc.exists()) {
        const materialData = materialDoc.data();
        const quantidadeAtual = materialData.quantidade || 0;
        const novaQuantidade = quantidadeAtual + quantidadeDevolvida;
        await updateDoc(materialRef, {
          quantidade: novaQuantidade,
          disponivel: true
        });
      }

      // Atualizar cautela
      const materiaisRestantes = cautelaMunicao.materiais.filter(m =>
        m.materialId !== materialMunicao.materialId
      );

      const materialDevolvido = cautelaMunicao.materiais.find(m =>
        m.materialId === materialMunicao.materialId
      );

      if (materiaisRestantes.length === 0) {
        // Todos devolvidos - marcar cautela como entregue
        await updateDoc(doc(db, 'cautelas_provisorias', cautelaMunicao.id), {
          status: 'entregue',
          dataBaixa: agora,
          horaBaixa,
          recebidoPorNome: armeiroNome
        });
      } else {
        // BAIXA PARCIAL: Criar nova entrada para material devolvido
        const proximoSequencial = await obterProximoSequencial(livroId);
        
        // Criar nova cautela para o material devolvido
        await addDoc(collection(db, 'cautelas_provisorias'), {
          livroId,
          policialId: cautelaMunicao.policialId,
          policialNome: cautelaMunicao.policialNome,
          policialMatricula: cautelaMunicao.policialMatricula,
          policialNomeGuerra: cautelaMunicao.policialNomeGuerra,
          postoGrad: cautelaMunicao.postoGrad,
          armeiroId: cautelaMunicao.armeiroId,
          materiais: materialDevolvido ? [materialDevolvido] : [],
          dataCautela: cautelaMunicao.dataCautela,
          horaCautela: cautelaMunicao.horaCautela,
          status: 'entregue',
          dataBaixa: agora,
          horaBaixa,
          recebidoPorNome: armeiroNome,
          sequencial: proximoSequencial,
          cautelaOriginalId: cautelaMunicao.id
        });
        
        // Atualizar cautela original mantendo apenas materiais pendentes
        await updateDoc(doc(db, 'cautelas_provisorias', cautelaMunicao.id), {
          materiais: materiaisRestantes
        });
      }

      // Registrar movimentação de baixa
      const movimentacaoData: Record<string, any> = {
        tipo: 'baixa',
        policialId: policialSelecionado.id,
        policialNome: policialSelecionado.NOME,
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        materiais: [{
          materialId: materialMunicao.materialId,
          nome: materialMunicao.nome,
          quantidade: materialMunicao.quantidade,
          quantidadeDevolvida,
          quantidadeFaltante,
          categoria: materialMunicao.categoria
        }],
        dataBaixa: agora,
        horaBaixa,
        cautelaId: cautelaMunicao.id
      };

      if (livroId) {
        movimentacaoData.livroId = livroId;
      }

      await addDoc(collection(db, 'movimentacoes_belicas'), movimentacaoData);

      // Se houver falta de munição, criar alerta e registrar alteração automática no livro
      if (quantidadeFaltante > 0 && motivoFalta) {
        // Buscar nome do armeiro
        const userStorage = localStorage.getItem('user');
        let armeiroNomeLocal = 'Armeiro';
        let armeiroIdLocal = '';
        if (userStorage) {
          const userData = JSON.parse(userStorage);
          if (!userData?.id) { console.warn('userData.id não encontrado'); return; }
          armeiroIdLocal = userData.id;
          const armeiroDoc = await getDoc(doc(db, 'policiais', userData.id));
          if (armeiroDoc.exists()) {
            const armeiroData = armeiroDoc.data();
            armeiroNomeLocal = armeiroData['NOME DE GUERRA1'] || armeiroData['NOME DE GUERRA'] || armeiroData.NOME;
          }
        }

        // Criar alerta de falta de munição
        await addDoc(collection(db, 'alertas_gestao'), {
          tipo: 'falta_municao',
          dataHora: agora,
          policialId: policialSelecionado.id,
          policialNome: policialSelecionado.NOME,
          policialNomeGuerra: policialSelecionado['NOME DE GUERRA1'] || policialSelecionado['NOME DE GUERRA'] || '',
          armeiroId: armeiroIdLocal,
          armeiroNome: armeiroNomeLocal,
          materialNome: materialMunicao.nome,
          quantidadeCautelada: materialMunicao.quantidade,
          quantidadeDevolvida,
          quantidadeFaltante,
          motivoFalta,
          lido: false
        });

        // Registrar alteração automática no livro para aparecer ao fechar
        if (livroId) {
          const livroRef = doc(db, 'livros_reserva_armamento', livroId);
          const livroDoc = await getDoc(livroRef);
          
          if (livroDoc.exists()) {
            const livroData = livroDoc.data();
            const alteracoesAutomaticas = livroData.alteracoesAutomaticas || [];
            
            const policialDisplay = policialSelecionado['NOME DE GUERRA1'] || policialSelecionado['NOME DE GUERRA'] || policialSelecionado.NOME;
            const novaAlteracao = {
              id: Date.now().toString(),
              tipo: 'falta_municao',
              descricao: `FALTA DE MUNIÇÃO: ${policialDisplay} não devolveu ${quantidadeFaltante}x ${materialMunicao.nome}. Motivo: ${motivoFalta}`,
              dataHora: agora.toISOString()
            };
            
            await updateDoc(livroRef, {
              alteracoesAutomaticas: [...alteracoesAutomaticas, novaAlteracao]
            });
          }
        }
      }

      toast({
        title: "Devolução Registrada",
        description: `${quantidadeDevolvida} unidade(s) de ${materialMunicao.nome} devolvida(s).`,
      });

      // Fechar modal e atualizar lista
      setModalMunicao(false);
      setMaterialMunicao(null);
      setCautelaMunicao(null);
      onBaixaRealizada();

      // Recarregar cautelas
      const querySnapshot = await getDocs(
        query(
          collection(db, 'cautelas_provisorias'),
          where('policialId', '==', policialSelecionado.id),
          where('status', '==', 'pendente')
        )
      );
      
      const cautelasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCautela: doc.data().dataCautela?.toDate?.() || new Date()
      } as CautelaProvisoria));

      setCautelasAtivas(cautelasData);

      if (cautelasData.length === 0) {
        setPolicialSelecionado(null);
      }
      
      // Sempre recarregar lista de policiais após baixa de munição
      await recarregarPoliciaisComCautela();

    } catch (error) {
      console.error('Erro ao devolver munição:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar devolução de munição.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const realizarBaixa = async () => {
    if (materiaisSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um material para dar baixa.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se policialSelecionado existe
    if (!policialSelecionado) {
      toast({
        title: "Erro",
        description: "Policial não selecionado.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Buscar nome do armeiro atual
      const userStorage = localStorage.getItem('user');
      let armeiroNomeBaixa = 'Armeiro';
      if (userStorage) {
        const userData = JSON.parse(userStorage);
        if (userData?.id) {
          const armeiroDoc = await getDoc(doc(db, 'policiais', userData.id));
          if (armeiroDoc.exists()) {
            const armeiroData = armeiroDoc.data();
            armeiroNomeBaixa = armeiroData['NOME DE GUERRA1'] || armeiroData['NOME DE GUERRA'] || armeiroData.NOME;
          }
        }
      }

      const materiaisDevolvidos: Array<{
        materialId: string;
        nome: string;
        quantidade: number;
        categoria?: string;
        numeroSerie?: string;
      }> = [];

      const agora = new Date();
      const horaBaixa = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Coletar TODOS os materiais devolvidos de TODAS as cautelas
      const cautelasParaAtualizar: { 
        id: string; 
        materiaisRestantes: MaterialCautela[];
        materiaisDevolvidos: MaterialCautela[];
        cautela: CautelaProvisoria;
      }[] = [];

      // Processar cada cautela e separar materiais
      for (const cautela of cautelasAtivas) {
        const materiaisParaBaixa = cautela.materiais.filter(m => 
          materiaisSelecionados.includes(m.materialId)
        );
        const materiaisRestantes = cautela.materiais.filter(m =>
          !materiaisSelecionados.includes(m.materialId)
        );
        
        if (materiaisParaBaixa.length > 0) {
          cautelasParaAtualizar.push({
            id: cautela.id,
            materiaisRestantes,
            materiaisDevolvidos: materiaisParaBaixa,
            cautela
          });

          // Devolver materiais ao estoque
          for (const material of materiaisParaBaixa) {
            if (!material.materialId) continue;
            const materialRef = doc(db, 'materiais_belicos', material.materialId);
            const materialDoc = await getDoc(materialRef);
            
            if (materialDoc.exists()) {
              const materialData = materialDoc.data();
              const isMunicaoMaterial = materialData?.categoria?.toLowerCase().includes('munição') || 
                               materialData?.categoria?.toLowerCase().includes('municao');
              
              if (isMunicaoMaterial) {
                const quantidadeAtual = materialData.quantidade || 0;
                const novaQuantidade = quantidadeAtual + material.quantidade;
                await updateDoc(materialRef, {
                  quantidade: novaQuantidade,
                  disponivel: true
                });
              } else {
                await updateDoc(materialRef, {
                  disponivel: true,
                  cauteladoPara: null,
                  dataCautela: null
                });
              }
              
              materiaisDevolvidos.push({
                materialId: material.materialId,
                nome: material.nome,
                quantidade: material.quantidade,
                categoria: material.categoria,
                numeroSerie: material.numeroSerie
              });
            }
          }
        }
      }

      // Verificar se TODAS as cautelas foram totalmente baixadas
      const todasCautelasCompletas = cautelasParaAtualizar.every(c => c.materiaisRestantes.length === 0);

      if (todasCautelasCompletas) {
        // BAIXA TOTAL: marcar todas as cautelas como entregue
        for (const { id } of cautelasParaAtualizar) {
          await updateDoc(doc(db, 'cautelas_provisorias', id), {
            status: 'entregue',
            dataBaixa: agora,
            horaBaixa,
            recebidoPorNome: armeiroNomeBaixa
          });
        }
      } else {
        // BAIXA PARCIAL: Criar UMA ÚNICA cautela para TODOS os materiais devolvidos
        const todosMateriaisDevolvidos = cautelasParaAtualizar.flatMap(c => c.materiaisDevolvidos);
        const proximoSequencial = await obterProximoSequencial(livroId);
        const primeiroItem = cautelasParaAtualizar[0];
        
        // Criar nova cautela com todos os materiais devolvidos
        await addDoc(collection(db, 'cautelas_provisorias'), {
          livroId,
          policialId: primeiroItem.cautela.policialId,
          policialNome: primeiroItem.cautela.policialNome,
          policialMatricula: primeiroItem.cautela.policialMatricula,
          policialNomeGuerra: primeiroItem.cautela.policialNomeGuerra,
          postoGrad: primeiroItem.cautela.postoGrad,
          armeiroId: primeiroItem.cautela.armeiroId,
          materiais: todosMateriaisDevolvidos,
          dataCautela: primeiroItem.cautela.dataCautela,
          horaCautela: primeiroItem.cautela.horaCautela,
          status: 'entregue',
          dataBaixa: agora,
          horaBaixa,
          recebidoPorNome: armeiroNomeBaixa,
          sequencial: proximoSequencial,
          baixaParcial: true,
          cautelasOriginais: cautelasParaAtualizar.map(c => c.id)
        });
        
        // Atualizar cautelas originais
        for (const { id, materiaisRestantes } of cautelasParaAtualizar) {
          if (materiaisRestantes.length === 0) {
            // Cautela completamente baixada
            await updateDoc(doc(db, 'cautelas_provisorias', id), {
              status: 'entregue',
              dataBaixa: agora,
              horaBaixa,
              recebidoPorNome: armeiroNomeBaixa
            });
          } else {
            // Ainda tem materiais pendentes
            await updateDoc(doc(db, 'cautelas_provisorias', id), {
              materiais: materiaisRestantes
            });
          }
        }
      }

      // Filtrar materiais removendo campos undefined para evitar erro do Firebase
      const materiaisLimpos = materiaisDevolvidos.map(m => {
        const materialLimpo: Record<string, any> = {
          materialId: m.materialId,
          nome: m.nome,
          quantidade: m.quantidade
        };
        if (m.categoria) materialLimpo.categoria = m.categoria;
        if (m.numeroSerie) materialLimpo.numeroSerie = m.numeroSerie;
        return materialLimpo;
      });

      // Registrar baixa no histórico
      const movimentacaoData: Record<string, any> = {
        tipo: 'baixa',
        policialId: policialSelecionado.id,
        policialNome: policialSelecionado.NOME || '',
        policialMatricula: String(policialSelecionado['Matrícula'] || ''),
        materiais: materiaisLimpos,
        dataBaixa: agora,
        horaBaixa
      };
      
      // Só associar cautelaId quando for baixa TOTAL (todos os materiais devolvidos)
      const foiBaixaTotal = cautelasAtivas.every(cautela => 
        cautela.materiais.every(m => materiaisSelecionados.includes(m.materialId))
      );
      
      if (foiBaixaTotal && cautelasAtivas.length === 1) {
        movimentacaoData.cautelaId = cautelasAtivas[0].id;
      }
      
      if (livroId) {
        movimentacaoData.livroId = livroId;
      }
      
      await addDoc(collection(db, 'movimentacoes_belicas'), movimentacaoData);

      toast({
        title: "Baixa Realizada",
        description: `${materiaisSelecionados.length} materiais devolvidos com sucesso.`,
      });

      setMateriaisSelecionados([]);
      setPolicialSelecionado(null);
      await recarregarPoliciaisComCautela();
      onBaixaRealizada();

    } catch (error) {
      console.error('Erro ao realizar baixa:', error);
      toast({
        title: "Erro",
        description: "Erro ao realizar baixa dos materiais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const policiaisFiltrados = policiaisComCautela.filter(p => {
    if (!search) return true;
    const filtroLower = search.toLowerCase();
    return (
      p.NOME?.toLowerCase().includes(filtroLower) ||
      p['NOME DE GUERRA1']?.toLowerCase().includes(filtroLower) ||
      p['NOME DE GUERRA']?.toLowerCase().includes(filtroLower) ||
      String(p['Matrícula']).includes(search)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Baixa de Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!policialSelecionado ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar policial com material cautelado..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {policiaisComCautela.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum policial com material cautelado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {policiaisFiltrados.map((policial) => (
                    <div
                      key={policial.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setPolicialSelecionado(policial)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">{policial['NOME DE GUERRA1'] || policial['NOME DE GUERRA'] || policial.NOME}</div>
                            <div className="text-sm text-muted-foreground">
                              {policial['Post/Grad']} - Mat: {policial['Matrícula']}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">Com Material</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{policialSelecionado['NOME DE GUERRA1'] || policialSelecionado['NOME DE GUERRA'] || policialSelecionado.NOME}</div>
                    <div className="text-sm text-muted-foreground">
                      {policialSelecionado['Post/Grad']} - Mat: {policialSelecionado['Matrícula']}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setPolicialSelecionado(null);
                    setMateriaisSelecionados([]);
                  }}>
                    Alterar
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      if (cautelasAtivas.length > 0) {
                        setCautelaTransferencia(cautelasAtivas[0]);
                        setModalTransferencia(true);
                      }
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Transferir
                  </Button>
                </div>
              </div>

              {cautelasAtivas.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Carregando materiais...
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Selecione os materiais para dar baixa:
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Para munições e EPIs com quantidade, clique no item para informar a quantidade devolvida.
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {cautelasAtivas.flatMap(cautela =>
                      cautela.materiais.map((material) => (
                        <div
                          key={`${cautela.id}-${material.materialId}`}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            materiaisSelecionados.includes(material.materialId)
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-500'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => handleClickMaterial(material, cautela)}
                        >
                          <div className="flex items-center gap-3">
                            {!precisaQuantidade(material) && (
                              <Checkbox 
                                checked={materiaisSelecionados.includes(material.materialId)}
                                onCheckedChange={() => toggleMaterial(material.materialId)}
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {material.nome}
                                {precisaQuantidade(material) && (
                                  <Badge variant="outline" className="text-xs">
                                    Clique para devolver
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {material.categoria} - Qtd: {material.quantidade}
                                {material.numeroSerie && ` - Série: ${material.numeroSerie}`}
                              </div>
                            </div>
                            {materiaisSelecionados.includes(material.materialId) && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={realizarBaixa}
                disabled={materiaisSelecionados.length === 0 || loading}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {loading ? 'Processando...' : `Dar Baixa (${materiaisSelecionados.length} materiais)`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Devolução de Munição */}
      <ModalDevolucaoMunicao
        open={modalMunicao}
        onClose={() => {
          setModalMunicao(false);
          setMaterialMunicao(null);
          setCautelaMunicao(null);
        }}
        material={materialMunicao}
        onConfirmar={handleConfirmarMunicao}
      />

      {/* Modal de Transferência de Material */}
      {cautelaTransferencia && policialSelecionado && (
        <ModalTransferenciaMaterial
          open={modalTransferencia}
          onClose={() => {
            setModalTransferencia(false);
            setCautelaTransferencia(null);
          }}
          cautela={cautelaTransferencia}
          policialOrigem={policialSelecionado}
          livroId={livroId}
          onTransferido={() => {
            setModalTransferencia(false);
            setCautelaTransferencia(null);
            setPolicialSelecionado(null);
            setMateriaisSelecionados([]);
            recarregarPoliciaisComCautela();
            onBaixaRealizada();
          }}
        />
      )}
    </>
  );
};

export default BaixaMaterialSection;
